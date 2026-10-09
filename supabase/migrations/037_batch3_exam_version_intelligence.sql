-- ============================================================================
-- NEOMCQ — BATCH 3: EXAM + EXAM-VERSION INTELLIGENCE FOUNDATION
-- Migration: 037_batch3_exam_version_intelligence.sql
-- ============================================================================
-- 1. Current Exam-Version Invariant: At most 1 exam_version per exam with is_current = true
-- 2. Exam-Version Identity & Metadata Verification: Preserves all 149 versions & 189 exams
-- 3. Version Resolution Helper: Fast, stable lookup for canonical current version
--
-- Preserves all existing records:
-- - exams (189)
-- - exam_versions (149)
-- - exam_subjects (9)
-- - exam_topics (15)
-- - exam_subtopics (36)
-- - exam_evidence (19)
-- - exam_authorities (139)
-- - exam_aliases (811)
-- - ai_jobs (171)
-- ============================================================================

-- 1. Current Exam Version Database-Enforced Invariant
-- Ensures for every exam, 0 or 1 row in exam_versions can have is_current = true
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_versions_current_per_exam
ON public.exam_versions (exam_id)
WHERE is_current = true;

-- 2. Safe Exam-Version Metadata Verification Foundation
-- Add additive verification_status column to public.exam_versions if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_versions' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE public.exam_versions
    ADD COLUMN verification_status text NOT NULL DEFAULT 'verified';
  END IF;
END $$;

-- 3. Canonical Version Lookup Helper Function (STABLE, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_current_exam_version(p_exam_id uuid)
RETURNS TABLE (
  version_id uuid,
  exam_id uuid,
  version_year integer,
  is_current boolean,
  verification_status text,
  verified_at timestamp with time zone,
  source_url text,
  pattern_summary jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    id AS version_id,
    exam_id,
    version_year,
    is_current,
    verification_status,
    verified_at,
    source_url,
    CASE 
      WHEN jsonb_typeof(pattern_summary::jsonb) = 'object' THEN pattern_summary::jsonb
      ELSE jsonb_build_object('summary', pattern_summary::text)
    END AS pattern_summary
  FROM public.exam_versions
  WHERE exam_id = p_exam_id AND is_current = true
  LIMIT 1;
$$;

-- 4. Harden Security Grants for get_current_exam_version
REVOKE ALL ON FUNCTION public.get_current_exam_version(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_exam_version(uuid) TO authenticated, service_role, anon;

COMMENT ON INDEX public.idx_exam_versions_current_per_exam IS 'Batch 3: Invariant ensuring at most one current exam_version per exam.';
COMMENT ON FUNCTION public.get_current_exam_version(uuid) IS 'Batch 3: Fast canonical lookup for the single current active version of an exam.';
