ALTER TABLE public.exams
  ALTER COLUMN verification_status SET DEFAULT 'pending_review',
  ALTER COLUMN question_count SET DEFAULT 0,
  ALTER COLUMN time_limit_mins SET DEFAULT 0,
  ALTER COLUMN current_version DROP DEFAULT,
  ALTER COLUMN version_year DROP DEFAULT,
  ALTER COLUMN is_current SET DEFAULT false,
  ALTER COLUMN last_verified_at DROP DEFAULT,
  ALTER COLUMN next_verification_at DROP DEFAULT;

ALTER TABLE public.exam_versions
  ALTER COLUMN verification_status SET DEFAULT 'needs_review',
  ALTER COLUMN verified_at DROP NOT NULL,
  ALTER COLUMN verified_at DROP DEFAULT;

ALTER TABLE public.exam_authorities
  ALTER COLUMN verification_status SET DEFAULT 'pending_review',
  ALTER COLUMN last_verified_at DROP NOT NULL,
  ALTER COLUMN last_verified_at DROP DEFAULT;

CREATE TABLE IF NOT EXISTS public.exam_verification_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  exam_version_id uuid REFERENCES public.exam_versions(id) ON DELETE SET NULL,
  audit_version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'needs_review'
    CHECK (status IN ('needs_review','ready_for_review','verified','rejected')),
  field_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  conflicting_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  source_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exam_verification_audits_exam_checked_idx
  ON public.exam_verification_audits(exam_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS exam_verification_audits_status_idx
  ON public.exam_verification_audits(status, checked_at DESC);

ALTER TABLE public.exam_verification_audits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.exam_verification_audits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.exam_verification_audits TO service_role;
DROP POLICY IF EXISTS "Service role manages exam verification audits" ON public.exam_verification_audits;
CREATE POLICY "Service role manages exam verification audits"
  ON public.exam_verification_audits FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enforce_exam_version_verification_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.verification_status = 'verified' THEN
    IF NEW.verified_at IS NULL OR NEW.source_url IS NULL OR NEW.version_year IS NULL THEN
      RAISE EXCEPTION 'A verified exam version requires a source URL, version year and verification timestamp';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.exam_verification_audits a
      WHERE a.exam_id = NEW.exam_id
        AND a.exam_version_id = NEW.id
        AND a.status = 'verified'
        AND a.audit_version = 1
    ) THEN
      RAISE EXCEPTION 'Exam version cannot be verified without an approved field-level exam verification audit';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_exam_version_verification_audit ON public.exam_versions;
CREATE TRIGGER trg_enforce_exam_version_verification_audit
BEFORE INSERT OR UPDATE OF verification_status, verified_at, source_url, version_year
ON public.exam_versions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_exam_version_verification_audit();

CREATE OR REPLACE FUNCTION public.enforce_exam_verification_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_current_version_id uuid;
BEGIN
  IF NEW.verification_status = 'verified' THEN
    IF NEW.country_id IS NULL
       OR NEW.authority_id IS NULL
       OR NEW.category_id IS NULL
       OR NULLIF(trim(NEW.level), '') IS NULL
       OR NULLIF(trim(NEW.current_version), '') IS NULL
       OR NEW.version_year IS NULL
       OR NEW.last_verified_at IS NULL THEN
      RAISE EXCEPTION 'A verified exam requires country, authority, category, level, current version, version year and verification timestamp';
    END IF;

    SELECT id INTO v_current_version_id
    FROM public.exam_versions
    WHERE exam_id = NEW.id
      AND is_current = true
      AND verification_status = 'verified'
      AND verified_at IS NOT NULL
    ORDER BY version_year DESC, verified_at DESC
    LIMIT 1;

    IF v_current_version_id IS NULL THEN
      RAISE EXCEPTION 'A verified exam requires one current verified exam version';
    END IF;

    IF COALESCE(NEW.metadata->>'exam_metadata_audit_status', '') <> 'verified'
       OR NOT EXISTS (
         SELECT 1
         FROM public.exam_verification_audits a
         WHERE a.exam_id = NEW.id
           AND a.exam_version_id = v_current_version_id
           AND a.status = 'verified'
           AND a.audit_version = 1
       ) THEN
      RAISE EXCEPTION 'Exam cannot be marked verified without an approved field-level metadata audit for its current version';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_exam_verification_audit ON public.exams;
CREATE TRIGGER trg_enforce_exam_verification_audit
BEFORE INSERT OR UPDATE OF verification_status, country_id, authority_id, category_id, level, current_version, version_year, last_verified_at, metadata
ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.enforce_exam_verification_audit();

-- Existing "verified" rows predate the complete field-level gate. Reclassify them
-- until an approved audit exists; preserve their curriculum for review, but do not
-- let new curriculum or shared-content generation proceed.
UPDATE public.exams
SET verification_status = 'needs_review',
    last_verified_at = NULL,
    next_verification_at = NULL,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'exam_metadata_audit_status', 'needs_review',
      'curriculum_status', 'blocked_verification',
      'curriculum_validation_passed', false,
      'curriculum_validation_reason', 'Prior verified state did not satisfy the complete field-level official exam metadata gate.',
      'rules_status', 'needs_review'
    ),
    updated_at = now()
WHERE verification_status = 'verified'
  AND NOT EXISTS (
    SELECT 1 FROM public.exam_verification_audits a
    WHERE a.exam_id = exams.id
      AND a.status = 'verified'
      AND a.audit_version = 1
  );

UPDATE public.exam_versions v
SET verification_status = 'needs_review',
    verified_at = NULL
WHERE v.verification_status = 'verified'
  AND EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = v.exam_id
      AND e.verification_status = 'needs_review'
  );