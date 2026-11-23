-- Stage 3: versioned, auditable curriculum reconciliation.
-- Additive only: existing curriculum rows and learner progress are never deleted or rewritten.
CREATE TABLE IF NOT EXISTS public.exam_curriculum_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE RESTRICT,
  exam_version_id uuid REFERENCES public.exam_versions(id) ON DELETE SET NULL,
  source_evidence_id uuid NOT NULL REFERENCES public.exam_evidence(id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  source_hash text NOT NULL,
  source_url text NOT NULL,
  source_version_date text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','current','superseded','rejected')),
  is_current boolean NOT NULL DEFAULT false,
  snapshot jsonb NOT NULL,
  reconciliation_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  coverage_percentage numeric(5,2) NOT NULL DEFAULT 0
    CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  subject_count integer NOT NULL DEFAULT 0,
  topic_count integer NOT NULL DEFAULT 0,
  subtopic_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, version_number),
  UNIQUE (exam_id, source_hash)
);

CREATE UNIQUE INDEX IF NOT EXISTS exam_curriculum_one_current_per_exam
  ON public.exam_curriculum_versions(exam_id) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS exam_curriculum_versions_exam_created_idx
  ON public.exam_curriculum_versions(exam_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.exam_curriculum_reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE RESTRICT,
  curriculum_version_id uuid REFERENCES public.exam_curriculum_versions(id) ON DELETE SET NULL,
  ai_job_id uuid UNIQUE REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','processing','completed','needs_review','failed','rejected')),
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_jobs
  ADD COLUMN IF NOT EXISTS curriculum_version_id uuid
  REFERENCES public.exam_curriculum_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ai_jobs_curriculum_reconciliation_queue_idx
  ON public.ai_jobs(status, priority DESC, created_at)
  WHERE task = 'curriculum_reconciliation';
CREATE UNIQUE INDEX IF NOT EXISTS ai_jobs_one_active_curriculum_reconciliation_per_exam
  ON public.ai_jobs(exam_id)
  WHERE task = 'curriculum_reconciliation' AND status IN ('queued','processing');

ALTER TABLE public.exam_curriculum_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_curriculum_reconciliation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view exam curriculum versions" ON public.exam_curriculum_versions;
CREATE POLICY "Admins can view exam curriculum versions"
  ON public.exam_curriculum_versions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Service role manages exam curriculum versions" ON public.exam_curriculum_versions;
CREATE POLICY "Service role manages exam curriculum versions"
  ON public.exam_curriculum_versions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view curriculum reconciliation runs" ON public.exam_curriculum_reconciliation_runs;
CREATE POLICY "Admins can view curriculum reconciliation runs"
  ON public.exam_curriculum_reconciliation_runs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Service role manages curriculum reconciliation runs" ON public.exam_curriculum_reconciliation_runs;
CREATE POLICY "Service role manages curriculum reconciliation runs"
  ON public.exam_curriculum_reconciliation_runs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Reuse the existing Supabase Vault token and pg_cron infrastructure.
-- The worker is isolated from the canonical learning-content worker.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'neomcq-curriculum-reconciliation-worker'
  ) THEN
    PERFORM cron.schedule(
      'neomcq-curriculum-reconciliation-worker',
      '* * * * *',
      $worker$
        SELECT net.http_get(
          url := 'https://neomcq.com/api/cron/curriculum-reconciliation-worker',
          headers := jsonb_build_object(
            'Authorization',
            'Bearer ' || (
              SELECT decrypted_secret
              FROM vault.decrypted_secrets
              WHERE name = 'neomcq_curriculum_worker_token'
              LIMIT 1
            )
          ),
          timeout_milliseconds := 300000
        );
      $worker$
    );
  END IF;
END $$;
