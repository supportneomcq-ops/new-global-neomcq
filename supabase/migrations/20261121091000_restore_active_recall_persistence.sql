-- Restore the Active Recall persistence schema expected by the API routes.
-- The API derives user identity from the verified Supabase session and uses service-role writes.

BEGIN;

CREATE TABLE IF NOT EXISTS public.active_recall_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.exam_topics(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
  recall_item_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  is_revealed BOOLEAN NOT NULL DEFAULT false,
  response_time_ms INTEGER NOT NULL DEFAULT 0 CHECK (response_time_ms >= 0),
  review_due_at TIMESTAMPTZ,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_recall_user_topic
  ON public.active_recall_attempts(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_active_recall_session
  ON public.active_recall_attempts(session_id);

-- One canonical response per recall item in a session; prevents duplicate client submissions.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_recall_session_item
  ON public.active_recall_attempts(session_id, recall_item_id);
CREATE INDEX IF NOT EXISTS idx_active_recall_user_due
  ON public.active_recall_attempts(user_id, review_due_at);
CREATE INDEX IF NOT EXISTS idx_active_recall_attempted_at
  ON public.active_recall_attempts(attempted_at DESC);

CREATE TABLE IF NOT EXISTS public.active_recall_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.exam_topics(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
  version_id UUID REFERENCES public.content_versions(id) ON DELETE SET NULL,
  total_items INTEGER NOT NULL DEFAULT 0 CHECK (total_items >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0 AND correct_count <= total_items),
  revealed_count INTEGER NOT NULL DEFAULT 0 CHECK (revealed_count >= 0),
  reviewed_count INTEGER NOT NULL DEFAULT 0 CHECK (reviewed_count >= 0),
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (accuracy >= 0 AND accuracy <= 100),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attempts must always belong to a durable session; prevents orphaned progress rows.
DO $
BEGIN
  ALTER TABLE public.active_recall_attempts
    ADD CONSTRAINT active_recall_attempts_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES public.active_recall_sessions(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $;

CREATE INDEX IF NOT EXISTS idx_active_recall_sessions_user
  ON public.active_recall_sessions(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_active_recall_sessions_status
  ON public.active_recall_sessions(status);

ALTER TABLE public.active_recall_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_recall_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own recall attempts" ON public.active_recall_attempts;
CREATE POLICY "Users can read their own recall attempts"
  ON public.active_recall_attempts FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read their own recall sessions" ON public.active_recall_sessions;
CREATE POLICY "Users can read their own recall sessions"
  ON public.active_recall_sessions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

COMMIT;
