-- The content generator and job UI report granular progress; align the live schema.
ALTER TABLE public.ai_jobs
  ADD COLUMN IF NOT EXISTS progress_stage text NOT NULL DEFAULT 'Queued',
  ADD COLUMN IF NOT EXISTS step_percentage integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ai_jobs'::regclass
      AND conname = 'ai_jobs_step_percentage_range_check'
  ) THEN
    ALTER TABLE public.ai_jobs
      ADD CONSTRAINT ai_jobs_step_percentage_range_check
      CHECK (step_percentage BETWEEN 0 AND 100) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.ai_jobs VALIDATE CONSTRAINT ai_jobs_step_percentage_range_check;
