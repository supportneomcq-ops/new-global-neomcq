-- Reproducible schema and policy for the one-topic, user-authorized AI smoke test.
CREATE TABLE IF NOT EXISTS public.platform_ai_test_budget_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL,
  authorization_reference text NOT NULL UNIQUE,
  authorized_cap_usd numeric(14,6) NOT NULL CHECK (authorized_cap_usd > 0),
  max_reservations integer NOT NULL DEFAULT 1 CHECK (max_reservations > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','revoked')),
  authorized_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_ai_test_budget_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.platform_ai_test_budget_grants FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.platform_ai_test_budget_grants TO service_role;
ALTER TABLE public.ai_budget_reservations
  ADD COLUMN IF NOT EXISTS test_budget_grant_id uuid REFERENCES public.platform_ai_test_budget_grants(id);
CREATE INDEX IF NOT EXISTS idx_ai_budget_reservations_test_grant
  ON public.ai_budget_reservations(test_budget_grant_id, status)
  WHERE test_budget_grant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reserve_platform_ai_budget(p_idempotency_key text, p_task_type text, p_provider text, p_model text, p_amount_usd numeric, p_user_id uuid DEFAULT NULL::uuid, p_request_id text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_existing public.ai_budget_reservations%ROWTYPE;
  v_revenue_funded numeric(14,6):=0; v_revenue_spent numeric(14,6):=0;
  v_revenue_held numeric(14,6):=0; v_revenue_available numeric(14,6):=0;
  v_test_cap numeric(14,6):=0; v_test_available numeric(14,6):=0;
  v_test_grant_id uuid; v_test_grant_available numeric(14,6):=0;
  v_available numeric(14,6):=0; v_reservation public.ai_budget_reservations%ROWTYPE;
  v_budget_source text:='revenue_allocation';
BEGIN
  IF COALESCE(length(trim(p_idempotency_key)),0)=0 OR COALESCE(length(trim(p_task_type)),0)=0 THEN
    RAISE EXCEPTION 'idempotency key and task type are required';
  END IF;
  IF p_amount_usd IS NULL OR p_amount_usd<=0 THEN RAISE EXCEPTION 'reservation amount must be greater than zero'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('neomcq:platform-ai-budget'));
  SELECT * INTO v_existing FROM public.ai_budget_reservations WHERE idempotency_key=p_idempotency_key FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object('allowed',false,'reason','idempotency_key_already_used',
      'reservation_id',v_existing.id,'reservation_status',v_existing.status,
      'available_budget_usd',NULL,'required_budget_usd',p_amount_usd);
  END IF;

  SELECT COALESCE(SUM(ai_budget_amount_usd),0) INTO v_revenue_funded
  FROM public.platform_profit_allocations
  WHERE allocation_status='allocated' AND ai_budget_amount_usd IS NOT NULL;

  SELECT COALESCE(SUM(c.actual_provider_cost+COALESCE(c.ai_infrastructure_cost,0)),0) INTO v_revenue_spent
  FROM public.ai_cost_events c
  LEFT JOIN public.ai_budget_reservations r ON r.idempotency_key=c.idempotency_key
  WHERE r.test_budget_grant_id IS NULL;

  SELECT COALESCE(SUM(reserved_amount_usd),0) INTO v_revenue_held
  FROM public.ai_budget_reservations
  WHERE status IN ('reserved','uncertain') AND test_budget_grant_id IS NULL;
  v_revenue_available:=GREATEST(v_revenue_funded-v_revenue_spent-v_revenue_held,0);

  SELECT COALESCE(SUM(
    CASE WHEN g.status='active' AND (g.expires_at IS NULL OR g.expires_at>now())
      AND (SELECT COUNT(*) FROM public.ai_budget_reservations r
           WHERE r.test_budget_grant_id=g.id AND r.status IN ('reserved','uncertain','settled'))<g.max_reservations
    THEN GREATEST(g.authorized_cap_usd-COALESCE((
      SELECT SUM(CASE WHEN r.status IN ('settled','uncertain') THEN COALESCE(r.actual_cost_usd,0) ELSE 0 END
               + CASE WHEN r.status IN ('reserved','uncertain') THEN r.reserved_amount_usd ELSE 0 END)
      FROM public.ai_budget_reservations r WHERE r.test_budget_grant_id=g.id),0),0)
    ELSE 0 END),0)
  INTO v_test_available FROM public.platform_ai_test_budget_grants g;

  SELECT COALESCE(SUM(authorized_cap_usd),0) INTO v_test_cap
  FROM public.platform_ai_test_budget_grants
  WHERE status='active' AND (expires_at IS NULL OR expires_at>now());
  v_available:=v_revenue_available+v_test_available;

  IF v_revenue_available>=p_amount_usd THEN
    v_budget_source:='revenue_allocation';
  ELSE
    SELECT g.id,
      GREATEST(g.authorized_cap_usd-COALESCE((
        SELECT SUM(CASE WHEN r.status IN ('settled','uncertain') THEN COALESCE(r.actual_cost_usd,0) ELSE 0 END
                 + CASE WHEN r.status IN ('reserved','uncertain') THEN r.reserved_amount_usd ELSE 0 END)
        FROM public.ai_budget_reservations r WHERE r.test_budget_grant_id=g.id),0),0)
    INTO v_test_grant_id,v_test_grant_available
    FROM public.platform_ai_test_budget_grants g
    WHERE g.status='active' AND (g.expires_at IS NULL OR g.expires_at>now())
      AND (SELECT COUNT(*) FROM public.ai_budget_reservations r
           WHERE r.test_budget_grant_id=g.id AND r.status IN ('reserved','uncertain','settled'))<g.max_reservations
    ORDER BY g.authorized_at ASC
    LIMIT 1
    FOR UPDATE OF g;

    IF v_test_grant_id IS NULL OR v_test_grant_available<p_amount_usd THEN
      RETURN jsonb_build_object('allowed',false,'reason','ai_budget_not_funded',
        'reservation_id',NULL,'reservation_status',NULL,'available_budget_usd',v_available,
        'funded_budget_usd',v_revenue_funded,'revenue_available_budget_usd',v_revenue_available,
        'test_budget_cap_usd',v_test_cap,'test_budget_available_usd',v_test_available,
        'required_budget_usd',p_amount_usd);
    END IF;
    v_budget_source:='authorized_test_cap';
  END IF;

  INSERT INTO public.ai_budget_reservations(
    idempotency_key,task_type,provider,model,reserved_amount_usd,status,user_id,request_id,metadata,test_budget_grant_id
  ) VALUES (
    p_idempotency_key,p_task_type,p_provider,p_model,p_amount_usd,'reserved',p_user_id,p_request_id,
    COALESCE(p_metadata,'{}'::jsonb)||jsonb_build_object('budget_source',v_budget_source),
    CASE WHEN v_budget_source='authorized_test_cap' THEN v_test_grant_id ELSE NULL END
  ) RETURNING * INTO v_reservation;

  IF v_budget_source='authorized_test_cap' THEN v_available:=v_revenue_available;
  ELSE v_available:=GREATEST(v_revenue_available-p_amount_usd,0)+v_test_available;
  END IF;

  RETURN jsonb_build_object('allowed',true,'reason','reserved','reservation_id',v_reservation.id,
    'reservation_status',v_reservation.status,'budget_source',v_budget_source,
    'test_budget_grant_id',v_reservation.test_budget_grant_id,'available_budget_usd',v_available,
    'funded_budget_usd',v_revenue_funded,'revenue_available_budget_usd',v_revenue_available,
    'test_budget_cap_usd',v_test_cap,'test_budget_available_usd',v_test_available,
    'required_budget_usd',p_amount_usd);
END;
$function$


CREATE OR REPLACE FUNCTION public.get_platform_ai_budget_status()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
WITH allocation_totals AS (
 SELECT COALESCE(SUM(ai_budget_amount_usd) FILTER(WHERE allocation_status='allocated'),0)::numeric(14,6) funded_ai_budget_usd,
        COALESCE(SUM(net_collected_amount) FILTER(WHERE allocation_status='allocated' AND currency='USD'),0)::numeric(14,2) usd_net_collections,
        COUNT(*) FILTER(WHERE allocation_status='pending_fx_conversion')::integer pending_fx_count,
        COUNT(*) FILTER(WHERE allocation_status='pending_settlement')::integer pending_settlement_count
 FROM public.platform_profit_allocations
),
cost_totals AS (
 SELECT COALESCE(SUM(actual_provider_cost),0)::numeric(14,6) provider_spend_usd,
        COALESCE(SUM(ai_infrastructure_cost),0)::numeric(14,6) infrastructure_spend_usd
 FROM public.ai_cost_events
),
revenue_cost_totals AS (
 SELECT COALESCE(SUM(c.actual_provider_cost+COALESCE(c.ai_infrastructure_cost,0)),0)::numeric(14,6) revenue_spend_usd
 FROM public.ai_cost_events c
 LEFT JOIN public.ai_budget_reservations r ON r.idempotency_key=c.idempotency_key
 WHERE r.test_budget_grant_id IS NULL
),
reservation_totals AS (
 SELECT COALESCE(SUM(reserved_amount_usd) FILTER(WHERE status IN ('reserved','uncertain')),0)::numeric(14,6) held_budget_usd,
        COALESCE(SUM(reserved_amount_usd) FILTER(WHERE status IN ('reserved','uncertain') AND test_budget_grant_id IS NULL),0)::numeric(14,6) revenue_held_usd,
        COUNT(*) FILTER(WHERE status='reserved')::integer active_reservations,
        COUNT(*) FILTER(WHERE status='uncertain')::integer uncertain_reservations
 FROM public.ai_budget_reservations
),
test_grants AS (
 SELECT g.id,g.purpose,g.authorization_reference,g.authorized_cap_usd,g.max_reservations,g.status,g.expires_at,g.authorized_at,
        COUNT(r.id) FILTER(WHERE r.status IN ('reserved','uncertain','settled'))::integer reservation_count,
        COALESCE(SUM(CASE WHEN r.status IN ('settled','uncertain') THEN COALESCE(r.actual_cost_usd,0) ELSE 0 END),0)::numeric(14,6) spent_usd,
        COALESCE(SUM(r.reserved_amount_usd) FILTER(WHERE r.status IN ('reserved','uncertain')),0)::numeric(14,6) held_usd
 FROM public.platform_ai_test_budget_grants g
 LEFT JOIN public.ai_budget_reservations r ON r.test_budget_grant_id=g.id
 GROUP BY g.id
),
test_totals AS (
 SELECT COALESCE(SUM(authorized_cap_usd) FILTER(WHERE status='active' AND (expires_at IS NULL OR expires_at>now())),0)::numeric(14,6) authorized_cap_usd,
        COALESCE(SUM(spent_usd),0)::numeric(14,6) spent_usd,
        COALESCE(SUM(held_usd),0)::numeric(14,6) held_usd,
        COALESCE(SUM(CASE WHEN status='active' AND (expires_at IS NULL OR expires_at>now()) AND reservation_count<max_reservations
          THEN GREATEST(authorized_cap_usd-spent_usd-held_usd,0) ELSE 0 END),0)::numeric(14,6) available_usd,
        COALESCE(jsonb_agg(jsonb_build_object(
          'id',id,'purpose',purpose,'authorization_reference',authorization_reference,
          'authorized_cap_usd',authorized_cap_usd,'max_reservations',max_reservations,
          'reservation_count',reservation_count,'spent_usd',spent_usd,'held_usd',held_usd,
          'available_usd',CASE WHEN status='active' AND (expires_at IS NULL OR expires_at>now()) AND reservation_count<max_reservations
            THEN GREATEST(authorized_cap_usd-spent_usd-held_usd,0) ELSE 0 END,
          'status',status,'expires_at',expires_at
        ) ORDER BY authorized_at),'[]'::jsonb) grants
 FROM test_grants
),
currency_breakdown AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('currency',currency,'allocation_status',allocation_status,'payment_count',payment_count,
   'net_collected_amount',net_collected_amount,'owner_profit_amount',owner_profit_amount,'operations_amount',operations_amount,
   'ai_budget_amount',ai_budget_amount,'ai_budget_amount_usd',ai_budget_amount_usd)
   ORDER BY currency,allocation_status),'[]'::jsonb) rows
 FROM (
  SELECT currency,allocation_status,COUNT(*)::integer payment_count,
   COALESCE(SUM(net_collected_amount),0)::numeric(14,2) net_collected_amount,
   COALESCE(SUM(owner_profit_amount),0)::numeric(14,2) owner_profit_amount,
   COALESCE(SUM(operations_amount),0)::numeric(14,2) operations_amount,
   COALESCE(SUM(ai_budget_amount),0)::numeric(14,2) ai_budget_amount,
   COALESCE(SUM(ai_budget_amount_usd),0)::numeric(14,6) ai_budget_amount_usd
  FROM public.platform_profit_allocations GROUP BY currency,allocation_status
 ) grouped
),
latest_rates AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('base_currency',base_currency,'quote_currency',quote_currency,'rate',rate,
   'source',source,'observed_at',observed_at,'fetched_at',fetched_at) ORDER BY fetched_at DESC),'[]'::jsonb) rows
 FROM (SELECT base_currency,quote_currency,rate,source,observed_at,fetched_at FROM public.platform_fx_rates ORDER BY fetched_at DESC LIMIT 10) latest
)
SELECT jsonb_build_object(
 'funded_ai_budget_usd',a.funded_ai_budget_usd,
 'eligible_net_revenue_usd',ROUND(a.funded_ai_budget_usd/0.60,6),
 'owner_share_usd',ROUND(a.funded_ai_budget_usd/3,6),
 'operations_share_usd',ROUND(a.funded_ai_budget_usd/3,6),
 'provider_spend_usd',c.provider_spend_usd,
 'infrastructure_spend_usd',c.infrastructure_spend_usd,
 'total_spend_usd',c.provider_spend_usd+c.infrastructure_spend_usd,
 'held_budget_usd',r.held_budget_usd,
 'available_budget_usd',GREATEST(a.funded_ai_budget_usd-rc.revenue_spend_usd-r.revenue_held_usd,0)+t.available_usd,
 'revenue_pool_available_usd',GREATEST(a.funded_ai_budget_usd-rc.revenue_spend_usd-r.revenue_held_usd,0),
 'test_budget_authorized_cap_usd',t.authorized_cap_usd,
 'test_budget_spent_usd',t.spent_usd,
 'test_budget_held_usd',t.held_usd,
 'test_budget_available_usd',t.available_usd,
 'test_budget_grants',t.grants,
 'pending_fx_allocations',a.pending_fx_count,
 'pending_settlement_allocations',a.pending_settlement_count,
 'active_reservations',r.active_reservations,
 'uncertain_reservations',r.uncertain_reservations,
 'allocation_breakdown',b.rows,
 'latest_fx_rates',f.rows
)
FROM allocation_totals a CROSS JOIN cost_totals c CROSS JOIN revenue_cost_totals rc
CROSS JOIN reservation_totals r CROSS JOIN test_totals t CROSS JOIN currency_breakdown b CROSS JOIN latest_rates f;
$function$


CREATE OR REPLACE FUNCTION public.claim_canonical_topic_prefetch_job()
 RETURNS TABLE(job_id uuid, job_record jsonb, available_budget_usd numeric, required_budget_usd numeric, claim_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_job public.ai_jobs%ROWTYPE;
 v_available numeric(14,6):=0;
 v_required numeric(14,6):=0.30;
 v_budget_status jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('neomcq:canonical-topic-prefetch-worker'));
 UPDATE public.ai_jobs
 SET status=CASE WHEN COALESCE(attempts,0)<COALESCE(max_attempts,3) THEN 'queued' ELSE 'failed' END,
     error='Recovered after canonical content worker timeout.',progress_stage='Recovered for retry',step_percentage=0,
     started_at=NULL,completed_at=CASE WHEN COALESCE(attempts,0)<COALESCE(max_attempts,3) THEN NULL ELSE now() END
 WHERE task='canonical_topic_prefetch' AND status='processing' AND started_at<now()-interval '20 minutes';

 v_budget_status:=public.get_platform_ai_budget_status();
 v_available:=GREATEST(COALESCE((v_budget_status->>'available_budget_usd')::numeric,0),0);
 SELECT COALESCE(cost_ceiling,0.30) INTO v_required FROM public.ai_task_routing
 WHERE task_type='MCQ_GENERATION' AND enabled=true LIMIT 1;
 v_required:=GREATEST(COALESCE(v_required,0.30)*1.05,0);

 IF EXISTS(SELECT 1 FROM public.ai_jobs WHERE task='canonical_topic_prefetch' AND status='processing') THEN
   RETURN QUERY SELECT NULL::uuid,NULL::jsonb,v_available,v_required,'worker_busy'::text; RETURN;
 END IF;
 IF v_available<v_required THEN
   RETURN QUERY SELECT NULL::uuid,NULL::jsonb,v_available,v_required,'ai_budget_not_funded'::text; RETURN;
 END IF;

 SELECT j.* INTO v_job FROM public.ai_jobs j
 WHERE j.task='canonical_topic_prefetch' AND j.status IN ('queued','failed')
   AND COALESCE(j.attempts,0)<COALESCE(j.max_attempts,3) AND j.exam_id IS NOT NULL
   AND EXISTS(SELECT 1 FROM public.exams e WHERE e.id=j.exam_id
      AND e.verification_status='verified'
      AND e.metadata->>'exam_metadata_audit_status'='verified'
      AND e.metadata->>'curriculum_validation_version'='4'
      AND e.metadata->>'curriculum_validation_passed'='true')
 ORDER BY j.priority DESC,j.created_at ASC
 FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN
   RETURN QUERY SELECT NULL::uuid,NULL::jsonb,v_available,v_required,'queue_empty_or_exam_unverified'::text; RETURN;
 END IF;
 UPDATE public.ai_jobs SET status='processing',attempts=COALESCE(attempts,0)+1,started_at=now(),completed_at=NULL,
   error=NULL,progress_stage='Starting canonical shared-content generation',step_percentage=5
 WHERE id=v_job.id RETURNING * INTO v_job;
 RETURN QUERY SELECT v_job.id,to_jsonb(v_job),v_available,v_required,'claimed'::text;
END;
$function$


INSERT INTO public.platform_ai_test_budget_grants
  (purpose,authorization_reference,authorized_cap_usd,max_reservations,status,expires_at)
VALUES
  ('Single shared FMGE topic-pack smoke test: MCQs, quizzes, notes, flashcards and fill-in-the-blanks',
   'chat-approval-2026-11-23-neomcq-test-cap-5usd',5.000000,1,'active',now()+interval '48 hours')
ON CONFLICT (authorization_reference) DO NOTHING;

INSERT INTO public.ai_task_routing
  (task_type,primary_provider,primary_model,fallback_provider,fallback_model,
   max_input_tokens,max_output_tokens,reasoning_level,temperature,cost_ceiling,quality_tier,credit_cost,enabled,updated_at)
VALUES
  ('ACTIVE_RECALL_GENERATION','gemini','gemini-3.8-flash','openai','gpt-4o-mini',
   8192,2048,'low',0.2,0.0500,'balanced',1.00,true,now())
ON CONFLICT (task_type) DO UPDATE SET
  primary_provider=EXCLUDED.primary_provider,
  primary_model=EXCLUDED.primary_model,
  fallback_provider=EXCLUDED.fallback_provider,
  fallback_model=EXCLUDED.fallback_model,
  max_input_tokens=EXCLUDED.max_input_tokens,
  max_output_tokens=EXCLUDED.max_output_tokens,
  reasoning_level=EXCLUDED.reasoning_level,
  temperature=EXCLUDED.temperature,
  cost_ceiling=EXCLUDED.cost_ceiling,
  quality_tier=EXCLUDED.quality_tier,
  credit_cost=EXCLUDED.credit_cost,
  enabled=EXCLUDED.enabled,
  updated_at=now();
