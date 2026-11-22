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
  v_required := GREATEST(COALESCE(v_required, 0.30) * 1.05, 0);
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

  SELECT j.*
    INTO v_job
    FROM public.ai_jobs j
   WHERE j.task = 'canonical_topic_prefetch'
     AND j.status IN ('queued', 'failed')
     AND COALESCE(j.attempts, 0) < COALESCE(j.max_attempts, 3)
     AND j.exam_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.exams e
       WHERE e.id = j.exam_id
         AND e.verification_status = 'verified'
         AND e.metadata->>'exam_metadata_audit_status' = 'verified'
         AND e.metadata->>'curriculum_validation_version' = '4'
         AND e.metadata->>'curriculum_validation_passed' = 'true'
     )
   ORDER BY j.priority DESC, j.created_at ASC
   FOR UPDATE SKIP LOCKED
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, v_available, v_required, 'queue_empty_or_exam_unverified'::text;
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

REVOKE ALL ON FUNCTION public.claim_canonical_topic_prefetch_job() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_canonical_topic_prefetch_job() TO service_role;