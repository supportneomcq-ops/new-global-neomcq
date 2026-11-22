CREATE OR REPLACE FUNCTION public.approve_exam_verification_audit(
  p_exam_id uuid,
  p_audit_id uuid,
  p_reviewer_id uuid,
  p_review_notes text DEFAULT NULL
)
RETURNS TABLE (
  approved_exam_id uuid,
  approved_audit_id uuid,
  curriculum_job_id uuid,
  approval_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_exam public.exams%ROWTYPE;
  v_audit public.exam_verification_audits%ROWTYPE;
  v_version public.exam_versions%ROWTYPE;
  v_authority public.exam_authorities%ROWTYPE;
  v_job_id uuid;
  v_requeued integer := 0;
BEGIN
  IF p_reviewer_id IS NULL THEN
    RAISE EXCEPTION 'Reviewer identity is required';
  END IF;

  SELECT * INTO v_exam
  FROM public.exams
  WHERE id = p_exam_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam not found';
  END IF;

  SELECT * INTO v_audit
  FROM public.exam_verification_audits
  WHERE id = p_audit_id
    AND exam_id = p_exam_id
    AND is_current = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Current exam verification audit not found';
  END IF;

  IF v_audit.status <> 'ready_for_review'
     OR COALESCE(array_length(v_audit.missing_fields, 1), 0) > 0
     OR jsonb_array_length(COALESCE(v_audit.conflicting_fields, '[]'::jsonb)) > 0 THEN
    RAISE EXCEPTION 'Exam audit is not complete and conflict-free; approval is blocked';
  END IF;

  IF v_exam.country_id IS NULL
     OR v_exam.authority_id IS NULL
     OR v_exam.category_id IS NULL
     OR NULLIF(trim(v_exam.level), '') IS NULL
     OR NULLIF(trim(v_exam.exam_type), '') IS NULL
     OR NULLIF(trim(v_exam.current_version), '') IS NULL
     OR v_exam.version_year IS NULL THEN
    RAISE EXCEPTION 'Exam identity, jurisdiction, category, level and version fields must be complete';
  END IF;

  SELECT * INTO v_authority
  FROM public.exam_authorities
  WHERE id = v_exam.authority_id;

  IF NOT FOUND
     OR v_authority.verification_status <> 'verified'
     OR v_authority.official_website IS NULL
     OR v_authority.last_verified_at IS NULL THEN
    RAISE EXCEPTION 'Exam authority must be independently verified before exam approval';
  END IF;

  SELECT * INTO v_version
  FROM public.exam_versions
  WHERE id = v_audit.exam_version_id
    AND exam_id = p_exam_id
    AND is_current = true
  FOR UPDATE;

  IF NOT FOUND
     OR v_version.version_year <> v_exam.version_year
     OR v_version.source_url IS NULL THEN
    RAISE EXCEPTION 'Current exam version is missing or does not match the exam record';
  END IF;

  UPDATE public.exam_verification_audits
     SET status = 'verified',
         reviewed_by = p_reviewer_id,
         reviewed_at = now(),
         review_notes = p_review_notes,
         updated_at = now()
   WHERE id = p_audit_id;

  UPDATE public.exam_versions
     SET verification_status = 'verified',
         verified_at = now(),
         updated_at = now()
   WHERE id = v_version.id;

  UPDATE public.exams
     SET verification_status = 'verified',
         last_verified_at = now(),
         next_verification_at = now() + interval '180 days',
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'exam_metadata_audit_status', 'verified',
           'exam_metadata_audit_id', p_audit_id,
           'exam_metadata_audit_approved_at', now(),
           'exam_metadata_audit_approved_by', p_reviewer_id,
           'curriculum_status', 'pending_generation',
           'curriculum_validation_passed', false,
           'curriculum_validation_version', 0
         ),
         updated_at = now()
   WHERE id = p_exam_id;

  UPDATE public.ai_jobs
     SET status = 'queued',
         attempts = 0,
         started_at = NULL,
         completed_at = NULL,
         error = NULL,
         progress_stage = 'Queued after official exam verification',
         step_percentage = 0,
         output_payload = NULL
   WHERE task = 'curriculum_rebuild'
     AND status = 'waiting_verification'
     AND exam_id = p_exam_id;

  GET DIAGNOSTICS v_requeued = ROW_COUNT;

  IF v_requeued > 0 THEN
    SELECT id INTO v_job_id
    FROM public.ai_jobs
    WHERE task = 'curriculum_rebuild'
      AND exam_id = p_exam_id
      AND status = 'queued'
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    INSERT INTO public.ai_jobs (
      user_id, exam_id, task, status, priority, attempts, max_attempts,
      idempotency_key, input_payload, progress_stage, step_percentage
    )
    VALUES (
      NULL,
      p_exam_id,
      'curriculum_rebuild',
      'queued',
      5,
      0,
      3,
      'curriculum-rebuild:v4:' || p_exam_id::text || ':' || v_version.version_year::text,
      jsonb_build_object(
        'examId', p_exam_id,
        'examName', v_exam.name,
        'examVersionId', v_version.id,
        'source', 'exam_verification_approved'
      ),
      'Queued after official exam verification',
      0
    )
    ON CONFLICT (idempotency_key) DO UPDATE
      SET status = 'queued',
          attempts = 0,
          started_at = NULL,
          completed_at = NULL,
          error = NULL,
          progress_stage = 'Queued after official exam verification',
          step_percentage = 0
    RETURNING id INTO v_job_id;
  END IF;

  RETURN QUERY SELECT p_exam_id, p_audit_id, v_job_id, 'verified_and_curriculum_queued'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_exam_verification_audit(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_exam_verification_audit(uuid, uuid, uuid, text) TO service_role;