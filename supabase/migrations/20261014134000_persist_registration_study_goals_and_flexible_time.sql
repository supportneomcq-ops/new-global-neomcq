-- Keep the registration form's study preferences durable and faithful to user choices.
ALTER TABLE public.study_preferences
  ADD COLUMN IF NOT EXISTS study_goals text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.study_preferences
  DROP CONSTRAINT IF EXISTS study_preferences_preferred_time_check;

ALTER TABLE public.study_preferences
  ADD CONSTRAINT study_preferences_preferred_time_check
  CHECK (preferred_time = ANY (ARRAY['morning'::text, 'afternoon'::text, 'evening'::text, 'night'::text, 'flexible'::text]));
