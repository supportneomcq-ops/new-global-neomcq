-- Backfill canonical content jobs for already-verified curricula.
-- This is queue-only: the worker will not claim a job until the funded AI allocation
-- can cover the configured generation ceiling.
INSERT INTO public.ai_jobs (
  user_id, exam_id, exam_version_id, subject_id, topic_id, task, idempotency_key,
  priority, status, attempts, max_attempts, input_payload, progress_stage,
  step_percentage, created_at
)
SELECT
  NULL, e.id, ev.id, s.id, t.id,
  'canonical_topic_prefetch',
  'canonical-topic-prefetch:v1:' || e.id::text || ':' || t.id::text,
  4, 'queued', 0, 3,
  jsonb_build_object(
    'examId', e.id,
    'examName', e.name,
    'examVersionId', ev.id,
    'subjectId', s.id,
    'subjectName', s.name,
    'topicId', t.id,
    'topicName', t.name,
    'source', 'verified_curriculum_backfill'
  ),
  'Queued for shared canonical learning-content generation',
  0, now()
FROM public.exams e
JOIN public.exam_versions ev
  ON ev.exam_id = e.id
 AND ev.is_current = true
 AND ev.verification_status = 'verified'
 AND ev.verified_at IS NOT NULL
JOIN public.exam_subjects s
  ON s.exam_id = e.id
 AND COALESCE(s.is_active, s.active, true) = true
JOIN public.exam_topics t
  ON t.subject_id = s.id
 AND COALESCE(t.is_active, t.active, true) = true
WHERE e.verification_status = 'verified'
  AND e.metadata->>'curriculum_validation_version' = '3'
  AND e.metadata->>'curriculum_validation_passed' = 'true'
  AND NOT EXISTS (
    SELECT 1 FROM public.content_versions cv
    WHERE cv.asset_id = t.id AND cv.asset_type = 'topic'
  )
ON CONFLICT (idempotency_key) DO NOTHING;
