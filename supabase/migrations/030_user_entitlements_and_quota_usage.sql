-- ==============================================================================
-- 030: NeoMCQ User Entitlements, Lifetime Free Topic Usage & Daily Quotas
-- ==============================================================================

-- 1. Free Plan Lifetime Topic Usage Table
-- Enforces EXACTLY ONE UNIQUE TOPIC PER FEATURE FOR LIFETIME for Free users
CREATE TABLE IF NOT EXISTS public.user_free_topic_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  feature VARCHAR(50) NOT NULL, -- 'mcq', 'quiz', 'flashcards', 'notes', 'sticky_notes', 'blanks', 'tutor'
  topic_id TEXT NOT NULL,
  exam_id TEXT,
  subject_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unq_user_feature_free_topic UNIQUE (user_id, feature)
);

CREATE INDEX IF NOT EXISTS idx_user_free_topic_usage_user ON public.user_free_topic_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_free_topic_usage_feature ON public.user_free_topic_usage(user_id, feature);

-- 2. Daily Quota and Usage Records Table
CREATE TABLE IF NOT EXISTS public.user_daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  feature VARCHAR(50) NOT NULL, -- 'mcq', 'quiz', 'flashcards', 'notes', 'blanks', 'tutor', 'topic_switch'
  count INT DEFAULT 0,
  accessed_topics JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unq_user_daily_usage_feature UNIQUE (user_id, usage_date, feature)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_usage_lookup ON public.user_daily_usage(user_id, usage_date, feature);

-- 3. Add limits JSONB column to subscription_plans if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'limits') THEN
    ALTER TABLE public.subscription_plans ADD COLUMN limits JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 4. Seed database plans with flexible, editable limits JSONB
UPDATE public.subscription_plans
SET limits = '{
  "daily_mcq_questions": 100,
  "daily_quiz_attempts": 10,
  "daily_flashcard_reviews": 100,
  "daily_notes_generations": 10,
  "daily_blanks_questions": 50,
  "daily_tutor_interactions": 50,
  "daily_topic_switches": 2,
  "daily_tutor_tts": 15,
  "exam_switch_fee_usd": 2.00,
  "unlimited": false
}'::jsonb,
updated_at = NOW()
WHERE slug = 'pro';

UPDATE public.subscription_plans
SET limits = '{
  "daily_mcq_questions": 350,
  "daily_quiz_attempts": 30,
  "daily_flashcard_reviews": 300,
  "daily_notes_generations": 30,
  "daily_blanks_questions": 150,
  "daily_tutor_interactions": 150,
  "daily_topic_switches": 15,
  "daily_tutor_tts": 50,
  "exam_switch_fee_usd": 2.00,
  "unlimited": false
}'::jsonb,
updated_at = NOW()
WHERE slug = 'max';

UPDATE public.subscription_plans
SET limits = '{
  "daily_mcq_questions": null,
  "daily_quiz_attempts": null,
  "daily_flashcard_reviews": null,
  "daily_notes_generations": null,
  "daily_blanks_questions": null,
  "daily_tutor_interactions": null,
  "daily_topic_switches": null,
  "daily_tutor_tts": null,
  "exam_switch_fee_usd": 0.00,
  "unlimited": true
}'::jsonb,
updated_at = NOW()
WHERE slug = 'elite';
