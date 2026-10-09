CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_created_at
  ON public.ai_jobs (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_or_create_ai_generation_job(
  p_idempotency_key text,
  p_task text,
  p_exam_id uuid DEFAULT NULL::uuid,
  p_exam_version_id uuid DEFAULT NULL::uuid,
  p_subject_id uuid DEFAULT NULL::uuid,
  p_topic_id uuid DEFAULT NULL::uuid,
  p_user_id uuid DEFAULT NULL::uuid,
  p_input_payload jsonb DEFAULT '{}'::jsonb,
  p_priority integer DEFAULT 5,
  p_provider text DEFAULT 'Google Gemini AI'::text,
  p_model text DEFAULT 'gemini-3.5-flash'::text,
  p_max_attempts integer DEFAULT 3
)
RETURNS TABLE(job_id uuid, job_status text, is_new boolean, output_payload jsonb, resolution_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_job RECORD;
  v_new_id uuid;
  v_resolved_exam_version_id uuid := p_exam_version_id;
  v_is_service_role boolean := (current_setting('role', true) = 'service_role');
  v_recent_job_count integer := 0;
  v_requested_batch_size integer := NULL;
BEGIN
  -- Defense in depth: non-service callers may only create jobs for themselves.
  IF NOT v_is_service_role THEN
    IF auth.uid() IS NULL OR p_user_id IS NULL OR auth.uid() <> p_user_id THEN
      RAISE EXCEPTION 'Unauthorized: AI jobs may only be created for the authenticated user';
    END IF;
    IF p_task NOT IN (
      'study_plan_generation', 'question_bank_generation', 'summary_notes_generation',
      'mock_exam_generation', 'adaptive_quiz_generation', 'exam_syllabus_generation',
      'exam_structure_generation', 'exam_topics_generation'
    ) THEN
      RAISE EXCEPTION 'Unauthorized task type';
    END IF;
  END IF;

  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'p_idempotency_key cannot be null or empty';
  END IF;
  IF p_task IS NULL OR length(trim(p_task)) = 0 THEN
    RAISE EXCEPTION 'p_task cannot be null or empty';
  END IF;

  -- Bound user-facing job payloads even when this function is called by a server route.
  IF p_task IN (
    'study_plan_generation', 'question_bank_generation', 'summary_notes_generation',
    'mock_exam_generation', 'adaptive_quiz_generation', 'exam_syllabus_generation',
    'exam_structure_generation', 'exam_topics_generation'
  ) THEN
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'User-facing AI jobs require a user_id';
    END IF;
    IF length(COALESCE(p_input_payload, '{}'::jsonb)::text) > 16000 THEN
      RAISE EXCEPTION 'AI job payload exceeds 16 KB';
    END IF;

    BEGIN
      v_requested_batch_size := COALESCE(
        NULLIF(COALESCE(p_input_payload, '{}'::jsonb)->>'batch_size', '')::integer,
        NULLIF(COALESCE(p_input_payload, '{}'::jsonb)->>'batchSize', '')::integer,
        NULLIF(COALESCE(p_input_payload, '{}'::jsonb)->>'num_questions', '')::integer,
        NULLIF(COALESCE(p_input_payload, '{}'::jsonb)->>'question_count', '')::integer
      );
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'AI job batch size must be an integer';
    END;

    IF v_requested_batch_size IS NOT NULL AND (v_requested_batch_size < 1 OR v_requested_batch_size > 50) THEN
      RAISE EXCEPTION 'AI job batch size must be between 1 and 50';
    END IF;
  END IF;

  IF v_resolved_exam_version_id IS NULL AND p_exam_id IS NOT NULL THEN
    SELECT id INTO v_resolved_exam_version_id
    FROM public.exam_versions
    WHERE exam_id = p_exam_id AND is_current = true
    LIMIT 1;
  END IF;

  -- Reuse completed jobs before applying the new-job rate limit.
  SELECT id, status, ai_jobs.output_payload INTO v_job
  FROM public.ai_jobs
  WHERE idempotency_key = p_idempotency_key
    AND status = 'completed'
  ORDER BY completed_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF FOUND THEN
    job_id := v_job.id;
    job_status := v_job.status;
    is_new := false;
    output_payload := v_job.output_payload;
    resolution_type := 'REUSED_COMPLETED';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT id, status, ai_jobs.output_payload INTO v_job
  FROM public.ai_jobs
  WHERE idempotency_key = p_idempotency_key
    AND status IN ('queued', 'running', 'processing', 'validating', 'pending')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    job_id := v_job.id;
    job_status := v_job.status;
    is_new := false;
    output_payload := v_job.output_payload;
    resolution_type := 'ATTACHED_ACTIVE';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Cap new user-facing generation jobs to 30 per user per hour.
  IF p_task IN (
    'study_plan_generation', 'question_bank_generation', 'summary_notes_generation',
    'mock_exam_generation', 'adaptive_quiz_generation', 'exam_syllabus_generation',
    'exam_structure_generation', 'exam_topics_generation'
  ) THEN
    SELECT count(*) INTO v_recent_job_count
    FROM public.ai_jobs
    WHERE user_id = p_user_id
      AND created_at > now() - interval '1 hour';

    IF v_recent_job_count >= 30 THEN
      RAISE EXCEPTION 'AI_JOB_RATE_LIMIT: Maximum of 30 new AI jobs per hour reached';
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.ai_jobs (
      idempotency_key, task, exam_id, exam_version_id, subject_id, topic_id,
      user_id, input_payload, status, priority, provider, model, attempts,
      max_attempts, credits_reserved, credits_consumed, created_at
    ) VALUES (
      p_idempotency_key, p_task, p_exam_id, v_resolved_exam_version_id,
      p_subject_id, p_topic_id, p_user_id, COALESCE(p_input_payload, '{}'::jsonb),
      'queued', p_priority, p_provider, p_model, 0, p_max_attempts, 0, 0, NOW()
    )
    RETURNING id INTO v_new_id;

    job_id := v_new_id;
    job_status := 'queued';
    is_new := true;
    output_payload := NULL;
    resolution_type := 'CREATED_NEW';
    RETURN NEXT;
    RETURN;

  EXCEPTION WHEN unique_violation THEN
    SELECT id, status, ai_jobs.output_payload INTO v_job
    FROM public.ai_jobs
    WHERE idempotency_key = p_idempotency_key
      AND status IN ('queued', 'running', 'processing', 'validating', 'pending')
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      job_id := v_job.id;
      job_status := v_job.status;
      is_new := false;
      output_payload := v_job.output_payload;
      resolution_type := 'CONCURRENT_COLLISION_ATTACHED';
      RETURN NEXT;
      RETURN;
    ELSE
      SELECT id, status, ai_jobs.output_payload INTO v_job
      FROM public.ai_jobs
      WHERE idempotency_key = p_idempotency_key
      ORDER BY created_at DESC
      LIMIT 1;

      job_id := v_job.id;
      job_status := v_job.status;
      is_new := false;
      output_payload := v_job.output_payload;
      resolution_type := 'CONCURRENT_ATTACHED_FALLBACK';
      RETURN NEXT;
      RETURN;
    END IF;
  END;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_ai_generation_job(text, text, uuid, uuid, uuid, uuid, uuid, jsonb, integer, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_ai_generation_job(text, text, uuid, uuid, uuid, uuid, uuid, jsonb, integer, text, text, integer) TO service_role;
