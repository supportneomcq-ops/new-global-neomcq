-- One lifetime topic per free-plan feature. Used exclusively by trusted server-side quota checks.
CREATE TABLE IF NOT EXISTS public.user_free_topic_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN ('mcq','quiz','flashcards','notes','sticky_notes','blanks','tutor')),
  topic_id uuid NOT NULL,
  exam_id uuid,
  subject_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_free_topic_usage_user_feature_key UNIQUE (user_id, feature)
);

CREATE INDEX IF NOT EXISTS idx_user_free_topic_usage_topic_id
  ON public.user_free_topic_usage(topic_id);

ALTER TABLE public.user_free_topic_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_free_topic_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_free_topic_usage TO service_role;
