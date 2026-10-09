-- ============================================================================
-- NEOMCQ — BATCH 2: AI GENERATION IDENTITY & IDEMPOTENCY BOUNDARY
-- Migration: 036_batch2_ai_generation_idempotency.sql
-- ============================================================================
-- Ensures database-enforced deterministic generation identity and concurrency
-- boundary for AI generation across all users.
--
-- Preserves all existing records in public.ai_jobs (171 rows).
-- Does not modify Batch 1 / Batch 1.1 objects or policies.
-- ============================================================================

-- 1. Extend public.ai_jobs with exam_version_id and idempotency_key columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ai_jobs' AND column_name = 'exam_version_id'
  ) THEN
    ALTER TABLE public.ai_jobs
    ADD COLUMN exam_version_id uuid REFERENCES public.exam_versions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ai_jobs' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.ai_jobs
    ADD COLUMN idempotency_key text;
  END IF;
END $$;

-- 2. Backfill existing records in ai_jobs
-- Extract idempotency_key from input_payload or generate deterministic legacy key
UPDATE public.ai_jobs
SET idempotency_key = COALESCE(
  input_payload->>'idempotency_key',
  'legacy:' || task || ':' || id::text
)
WHERE idempotency_key IS NULL;

-- Backfill missing exam_id, subject_id, topic_id from input_payload where referenced entities exist
UPDATE public.ai_jobs j
SET exam_id = e.id
FROM public.exams e
WHERE j.exam_id IS NULL
  AND (
    (j.input_payload->>'exam_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND (j.input_payload->>'exam_id')::uuid = e.id)
    OR
    (j.input_payload->>'examId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND (j.input_payload->>'examId')::uuid = e.id)
  );

UPDATE public.ai_jobs j
SET subject_id = s.id
FROM public.exam_subjects s
WHERE j.subject_id IS NULL
  AND (j.input_payload->>'subject_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  AND (j.input_payload->>'subject_id')::uuid = s.id;

UPDATE public.ai_jobs j
SET topic_id = t.id
FROM public.exam_topics t
WHERE j.topic_id IS NULL
  AND (j.input_payload->>'topic_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  AND (j.input_payload->>'topic_id')::uuid = t.id;

-- Link current exam_version_id for jobs with a known exam_id
UPDATE public.ai_jobs j
SET exam_version_id = ev.id
FROM public.exam_versions ev
WHERE j.exam_id = ev.exam_id
  AND ev.is_current = true
  AND j.exam_version_id IS NULL;

-- 3. Create Indexes for High-Performance Concurrency & Idempotency Lookups
CREATE INDEX IF NOT EXISTS idx_ai_jobs_idempotency_key
ON public.ai_jobs (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_exam_version_id
ON public.ai_jobs (exam_version_id);

-- Partial Unique Index: Strictly ensures at most ONE active generation job per idempotency_key at any given time
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_jobs_active_idempotency
ON public.ai_jobs (idempotency_key)
WHERE status IN ('queued', 'running', 'processing', 'validating', 'pending');

-- 4. Atomic Database Function / RPC for Identity & Idempotency Boundary
CREATE OR REPLACE FUNCTION public.get_or_create_ai_generation_job(
  p_idempotency_key text,
  p_task text,
  p_exam_id uuid DEFAULT NULL,
  p_exam_version_id uuid DEFAULT NULL,
  p_subject_id uuid DEFAULT NULL,
  p_topic_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_input_payload jsonb DEFAULT '{}'::jsonb,
  p_priority integer DEFAULT 5,
  p_provider text DEFAULT 'Google Gemini AI',
  p_model text DEFAULT 'gemini-3.5-flash',
  p_max_attempts integer DEFAULT 3
)
RETURNS TABLE (
  job_id uuid,
  job_status text,
  is_new boolean,
  output_payload jsonb,
  resolution_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job RECORD;
  v_new_id uuid;
  v_resolved_exam_version_id uuid := p_exam_version_id;
BEGIN
  -- 1. Validate required inputs
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'p_idempotency_key cannot be null or empty';
  END IF;

  IF p_task IS NULL OR length(trim(p_task)) = 0 THEN
    RAISE EXCEPTION 'p_task cannot be null or empty';
  END IF;

  -- 2. Resolve current version for exam_id if not explicitly provided
  IF v_resolved_exam_version_id IS NULL AND p_exam_id IS NOT NULL THEN
    SELECT id INTO v_resolved_exam_version_id
    FROM public.exam_versions
    WHERE exam_id = p_exam_id AND is_current = true
    LIMIT 1;
  END IF;

  -- 3. Check for existing COMPLETED job for this exact idempotency key (Reusable)
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

  -- 4. Check for existing ACTIVE (in-flight) job for this exact idempotency key (Attach/Wait)
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

  -- 5. No completed or active job exists -> Atomically insert new queued job
  BEGIN
    INSERT INTO public.ai_jobs (
      idempotency_key,
      task,
      exam_id,
      exam_version_id,
      subject_id,
      topic_id,
      user_id,
      input_payload,
      status,
      priority,
      provider,
      model,
      attempts,
      max_attempts,
      credits_reserved,
      credits_consumed,
      created_at
    ) VALUES (
      p_idempotency_key,
      p_task,
      p_exam_id,
      v_resolved_exam_version_id,
      p_subject_id,
      p_topic_id,
      p_user_id,
      p_input_payload,
      'queued',
      p_priority,
      p_provider,
      p_model,
      0,
      p_max_attempts,
      0,
      0,
      NOW()
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
    -- Microsecond concurrency collision caught safely by partial unique index
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
      -- Fallback if completed right during the collision
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
$$;

-- 5. Harden Security Grants for get_or_create_ai_generation_job
REVOKE ALL ON FUNCTION public.get_or_create_ai_generation_job(text, text, uuid, uuid, uuid, uuid, uuid, jsonb, integer, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_ai_generation_job(text, text, uuid, uuid, uuid, uuid, uuid, jsonb, integer, text, text, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_or_create_ai_generation_job IS 'Batch 2: Atomic database-backed generation identity and concurrency boundary.';
