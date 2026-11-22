CREATE OR REPLACE FUNCTION public.settle_platform_ai_budget(
  p_reservation_id uuid,
  p_actual_cost_usd numeric,
  p_provider text,
  p_model text,
  p_input_tokens integer DEFAULT 0,
  p_cached_input_tokens integer DEFAULT 0,
  p_output_tokens integer DEFAULT 0,
  p_reasoning_tokens integer DEFAULT 0,
  p_revenue_allocated numeric DEFAULT 0,
  p_infrastructure_cost numeric DEFAULT 0,
  p_credits_deducted numeric DEFAULT 0,
  p_request_id text DEFAULT NULL,
  p_uncertain boolean DEFAULT false,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_reservation public.ai_budget_reservations%ROWTYPE;
  v_event_id uuid;
  v_total_cost numeric(14,6);
  v_infrastructure_cost numeric(14,6);
  v_remaining numeric(14,6);
BEGIN
  IF p_actual_cost_usd IS NULL OR p_actual_cost_usd < 0 THEN
    RAISE EXCEPTION 'actual provider cost must be zero or greater';
  END IF;

  v_infrastructure_cost := GREATEST(COALESCE(p_infrastructure_cost, 0), 0);
  v_total_cost := p_actual_cost_usd + v_infrastructure_cost;

  PERFORM pg_advisory_xact_lock(hashtext('neomcq:platform-ai-budget'));

  SELECT * INTO v_reservation
  FROM public.ai_budget_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI budget reservation not found';
  END IF;

  IF v_reservation.cost_event_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_settled', true,
      'reservation_id', v_reservation.id,
      'cost_event_id', v_reservation.cost_event_id,
      'status', v_reservation.status,
      'actual_cost_usd', v_reservation.actual_cost_usd
    );
  END IF;

  IF v_reservation.status <> 'reserved' THEN
    RAISE EXCEPTION 'reservation cannot be settled from status %', v_reservation.status;
  END IF;

  INSERT INTO public.ai_cost_events (
    user_id, task_type, provider, model, input_tokens, cached_input_tokens,
    output_tokens, reasoning_tokens, actual_provider_cost, revenue_allocated,
    ai_infrastructure_cost, credits_deducted, request_id, idempotency_key, created_at
  ) VALUES (
    v_reservation.user_id, v_reservation.task_type, p_provider, p_model,
    GREATEST(COALESCE(p_input_tokens, 0), 0),
    GREATEST(COALESCE(p_cached_input_tokens, 0), 0),
    GREATEST(COALESCE(p_output_tokens, 0), 0),
    GREATEST(COALESCE(p_reasoning_tokens, 0), 0),
    p_actual_cost_usd,
    GREATEST(COALESCE(p_revenue_allocated, 0), 0),
    v_infrastructure_cost,
    GREATEST(COALESCE(p_credits_deducted, 0), 0),
    COALESCE(p_request_id, v_reservation.request_id),
    v_reservation.idempotency_key,
    now()
  )
  RETURNING id INTO v_event_id;

  v_remaining := GREATEST(v_reservation.reserved_amount_usd - v_total_cost, 0);

  UPDATE public.ai_budget_reservations
  SET provider = p_provider,
      model = p_model,
      actual_cost_usd = v_total_cost,
      cost_event_id = v_event_id,
      status = CASE WHEN p_uncertain THEN 'uncertain' ELSE 'settled' END,
      reserved_amount_usd = CASE WHEN p_uncertain THEN v_remaining ELSE 0 END,
      metadata = metadata || COALESCE(p_metadata, '{}'::jsonb),
      updated_at = now(),
      settled_at = now()
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_settled', false,
    'reservation_id', p_reservation_id,
    'cost_event_id', v_event_id,
    'status', CASE WHEN p_uncertain THEN 'uncertain' ELSE 'settled' END,
    'actual_cost_usd', v_total_cost,
    'provider_cost_usd', p_actual_cost_usd,
    'infrastructure_cost_usd', v_infrastructure_cost,
    'remaining_held_usd', CASE WHEN p_uncertain THEN v_remaining ELSE 0 END,
    'over_budget', v_total_cost > v_reservation.reserved_amount_usd
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_platform_ai_budget(
  p_idempotency_key text,
  p_task_type text,
  p_provider text,
  p_model text,
  p_amount_usd numeric,
  p_user_id uuid DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing public.ai_budget_reservations%ROWTYPE;
  v_funded numeric(14,6);
  v_spent numeric(14,6);
  v_held numeric(14,6);
  v_available numeric(14,6);
  v_reservation public.ai_budget_reservations%ROWTYPE;
BEGIN
  IF COALESCE(length(trim(p_idempotency_key)), 0) = 0 OR COALESCE(length(trim(p_task_type)), 0) = 0 THEN
    RAISE EXCEPTION 'idempotency key and task type are required';
  END IF;
  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'reservation amount must be greater than zero';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('neomcq:platform-ai-budget'));

  SELECT * INTO v_existing
  FROM public.ai_budget_reservations
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'idempotency_key_already_used',
      'reservation_id', v_existing.id,
      'reservation_status', v_existing.status,
      'available_budget_usd', NULL,
      'required_budget_usd', p_amount_usd
    );
  END IF;

  SELECT COALESCE(SUM(ai_budget_amount_usd), 0)
    INTO v_funded
  FROM public.platform_profit_allocations
  WHERE allocation_status = 'allocated'
    AND ai_budget_amount_usd IS NOT NULL;

  SELECT COALESCE(SUM(actual_provider_cost + COALESCE(ai_infrastructure_cost, 0)), 0)
    INTO v_spent
  FROM public.ai_cost_events;

  SELECT COALESCE(SUM(reserved_amount_usd), 0)
    INTO v_held
  FROM public.ai_budget_reservations
  WHERE status IN ('reserved', 'uncertain');

  v_available := GREATEST(v_funded - v_spent - v_held, 0);

  IF v_available < p_amount_usd THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'ai_budget_not_funded',
      'reservation_id', NULL,
      'reservation_status', NULL,
      'available_budget_usd', v_available,
      'funded_budget_usd', v_funded,
      'spent_budget_usd', v_spent,
      'held_budget_usd', v_held,
      'required_budget_usd', p_amount_usd
    );
  END IF;

  INSERT INTO public.ai_budget_reservations (
    idempotency_key, task_type, provider, model, reserved_amount_usd,
    status, user_id, request_id, metadata
  ) VALUES (
    p_idempotency_key, p_task_type, p_provider, p_model, p_amount_usd,
    'reserved', p_user_id, p_request_id, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_reservation;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'reserved',
    'reservation_id', v_reservation.id,
    'reservation_status', v_reservation.status,
    'available_budget_usd', v_available - p_amount_usd,
    'funded_budget_usd', v_funded,
    'spent_budget_usd', v_spent,
    'held_budget_usd', v_held + p_amount_usd,
    'required_budget_usd', p_amount_usd
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_canonical_topic_prefetch_job()
RETURNS TABLE (
  job_id uuid,
  job_record jsonb,
  available_budget_usd numeric,
  required_budget_usd numeric,
  claim_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job public.ai_jobs%ROWTYPE;
  v_budget numeric(14,6) := 0;
  v_spend numeric(14,6) := 0;
  v_held numeric(14,6) := 0;
  v_required numeric(14,6) := 0.30;
  v_available numeric(14,6) := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('neomcq:canonical-topic-prefetch-worker'));

  UPDATE public.ai_jobs
     SET status = CASE WHEN COALESCE(attempts, 0) < COALESCE(max_attempts, 3) THEN 'queued' ELSE 'failed' END,
         error = 'Recovered after canonical content worker timeout.',
         progress_stage = 'Recovered for retry',
         step_percentage = 0,
         started_at = NULL,
         completed_at = CASE WHEN COALESCE(attempts, 0) < COALESCE(max_attempts, 3) THEN NULL ELSE now() END
   WHERE task = 'canonical_topic_prefetch'
     AND status = 'processing'
     AND started_at < now() - interval '20 minutes';

  SELECT COALESCE(SUM(ai_budget_amount_usd), 0)
    INTO v_budget
    FROM public.platform_profit_allocations
   WHERE allocation_status = 'allocated'
     AND ai_budget_amount_usd IS NOT NULL;

  SELECT COALESCE(SUM(actual_provider_cost + COALESCE(ai_infrastructure_cost, 0)), 0)
    INTO v_spend
    FROM public.ai_cost_events;

  SELECT COALESCE(SUM(reserved_amount_usd), 0)
    INTO v_held
    FROM public.ai_budget_reservations
   WHERE status IN ('reserved', 'uncertain');

  SELECT COALESCE(cost_ceiling, 0.30)
    INTO v_required
    FROM public.ai_task_routing
   WHERE task_type = 'MCQ_GENERATION'
     AND enabled = true
   LIMIT 1;
  v_required := GREATEST(COALESCE(v_required, 0.30), 0);
  v_available := GREATEST(v_budget - v_spend - v_held, 0);

  IF EXISTS (
    SELECT 1 FROM public.ai_jobs
     WHERE task = 'canonical_topic_prefetch'
       AND status = 'processing'
  ) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, v_available, v_required, 'worker_busy'::text;
    RETURN;
  END IF;

  IF v_available < v_required THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, v_available, v_required, 'ai_budget_not_funded'::text;
    RETURN;
  END IF;

  SELECT *
    INTO v_job
    FROM public.ai_jobs
   WHERE task = 'canonical_topic_prefetch'
     AND status IN ('queued', 'failed')
     AND COALESCE(attempts, 0) < COALESCE(max_attempts, 3)
   ORDER BY priority DESC, created_at ASC
   FOR UPDATE SKIP LOCKED
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, v_available, v_required, 'queue_empty'::text;
    RETURN;
  END IF;

  UPDATE public.ai_jobs
     SET status = 'processing',
         attempts = COALESCE(attempts, 0) + 1,
         started_at = now(),
         completed_at = NULL,
         error = NULL,
         progress_stage = 'Starting canonical shared-content generation',
         step_percentage = 5
   WHERE id = v_job.id
   RETURNING * INTO v_job;

  RETURN QUERY SELECT v_job.id, to_jsonb(v_job), v_available, v_required, 'claimed'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_platform_ai_budget(text, text, text, text, numeric, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_platform_ai_budget(uuid, numeric, text, text, integer, integer, integer, integer, numeric, numeric, numeric, text, boolean, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_canonical_topic_prefetch_job() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_platform_ai_budget(text, text, text, text, numeric, uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_platform_ai_budget(uuid, numeric, text, text, integer, integer, integer, integer, numeric, numeric, numeric, text, boolean, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_canonical_topic_prefetch_job() TO service_role;