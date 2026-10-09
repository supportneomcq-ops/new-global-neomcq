-- Target indexes for hot-path AI job lookups and exam alias joins.
-- These complement existing indexes and cover the high-use foreign keys identified in the live DB audit.
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_status_created_at
  ON public.ai_jobs (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_topic_id
  ON public.ai_jobs (topic_id);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_subject_id
  ON public.ai_jobs (subject_id);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_exam_id
  ON public.ai_jobs (exam_id);

CREATE INDEX IF NOT EXISTS idx_exam_aliases_exam_id
  ON public.exam_aliases (exam_id);
