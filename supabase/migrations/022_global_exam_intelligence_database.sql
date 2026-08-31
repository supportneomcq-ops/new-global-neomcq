-- ---------------------------------------------------------------------
-- 022. GLOBAL EXAM INTELLIGENCE DATABASE FOUNDATION
-- ---------------------------------------------------------------------

-- 1. Extend public.exams structure with new attributes
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS authority TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS exam_type TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS official_reference_website TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS version_edition TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS marking_scheme JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS negative_marking BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS question_types JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS syllabus_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS image_question_requirements TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS video_question_requirements TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS clinical_case_requirements TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'discovering', 'verified', 'needs_review', 'stale', 'failed')) DEFAULT 'pending' NOT NULL;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS next_verification_at TIMESTAMPTZ;

-- 2. Extend public.exam_subjects structure
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'discovering', 'verified', 'needs_review', 'stale', 'failed')) DEFAULT 'pending' NOT NULL;
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 3. Extend public.exam_topics structure
ALTER TABLE public.exam_topics ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE public.exam_topics ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.exam_topics ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.exam_topics ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.exam_topics ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'discovering', 'verified', 'needs_review', 'stale', 'failed')) DEFAULT 'pending' NOT NULL;
ALTER TABLE public.exam_topics ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 4. Helper functions for normalization and slug generation
CREATE OR REPLACE FUNCTION public.normalize_canonical_name(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN TRIM(REGEXP_REPLACE(LOWER(REPLACE(input_name, '-', ' ')), '\s+', ' ', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.generate_slug(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN REGEXP_REPLACE(TRIM(REGEXP_REPLACE(LOWER(REPLACE(input_name, '-', ' ')), '\s+', ' ', 'g')), '\s+', '-', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Create BEFORE triggers to automatically update normalization and slugs
CREATE OR REPLACE FUNCTION public.populate_exam_normalization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.normalized_name := public.normalize_canonical_name(NEW.name);
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.generate_slug(NEW.name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_exam_normalization ON public.exams;
CREATE TRIGGER trg_populate_exam_normalization
  BEFORE INSERT OR UPDATE ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_exam_normalization();

CREATE OR REPLACE FUNCTION public.populate_subject_normalization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.normalized_name := public.normalize_canonical_name(NEW.name);
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.generate_slug(NEW.name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_subject_normalization ON public.exam_subjects;
CREATE TRIGGER trg_populate_subject_normalization
  BEFORE INSERT OR UPDATE ON public.exam_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_subject_normalization();

CREATE OR REPLACE FUNCTION public.populate_topic_normalization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.normalized_name := public.normalize_canonical_name(NEW.name);
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.generate_slug(NEW.name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_topic_normalization ON public.exam_topics;
CREATE TRIGGER trg_populate_topic_normalization
  BEFORE INSERT OR UPDATE ON public.exam_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_topic_normalization();

-- 6. Bulk populate existing rows to trigger the normalization
UPDATE public.exams SET name = name WHERE normalized_name IS NULL OR slug IS NULL;
UPDATE public.exam_subjects SET name = name WHERE normalized_name IS NULL OR slug IS NULL;
UPDATE public.exam_topics SET name = name WHERE normalized_name IS NULL OR slug IS NULL;

-- 7. Add btree search indexes (Note: unique indexes are not enforced directly in DDL due to pre-existing production duplicate rows)
CREATE INDEX IF NOT EXISTS idx_exams_normalized_name ON public.exams(normalized_name);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_normalized_name ON public.exam_subjects(exam_id, normalized_name);
CREATE INDEX IF NOT EXISTS idx_exam_topics_normalized_name ON public.exam_topics(subject_id, normalized_name);

-- 8. Create the exam_subtopics table for fine-grained global curriculum layers
CREATE TABLE IF NOT EXISTS public.exam_subtopics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT,
  slug TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  verification_status TEXT CHECK (verification_status IN ('pending', 'discovering', 'verified', 'needs_review', 'stale', 'failed')) DEFAULT 'pending' NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_subtopics_topic_id ON public.exam_subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_exam_subtopics_normalized_name ON public.exam_subtopics(topic_id, normalized_name);

CREATE OR REPLACE FUNCTION public.populate_subtopic_normalization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.normalized_name := public.normalize_canonical_name(NEW.name);
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.generate_slug(NEW.name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_subtopic_normalization ON public.exam_subtopics;
CREATE TRIGGER trg_populate_subtopic_normalization
  BEFORE INSERT OR UPDATE ON public.exam_subtopics
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_subtopic_normalization();

-- 9. Create the exam_evidence table to log AI and manual verification references
CREATE TABLE IF NOT EXISTS public.exam_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  source_url TEXT,
  source_reference TEXT,
  source_type TEXT CHECK (source_type IN ('official_syllabus', 'regulatory_board', 'academic_publication', 'official_handbook', 'web_resource', 'other')) DEFAULT 'web_resource' NOT NULL,
  publisher_authority TEXT,
  retrieved_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  source_version_date TEXT,
  verification_status TEXT CHECK (verification_status IN ('pending', 'valid', 'invalid', 'disputed')) DEFAULT 'pending' NOT NULL,
  extracted_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_evidence_exam_id ON public.exam_evidence(exam_id);

-- 10. Configure Row-Level Security (RLS) for global readability and write safety
ALTER TABLE public.exam_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read verified subtopics" ON public.exam_subtopics;
CREATE POLICY "Public can read verified subtopics" ON public.exam_subtopics
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Service role manages subtopics" ON public.exam_subtopics;
CREATE POLICY "Service role manages subtopics" ON public.exam_subtopics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read verified evidence" ON public.exam_evidence;
CREATE POLICY "Public can read verified evidence" ON public.exam_evidence
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Service role manages evidence" ON public.exam_evidence;
CREATE POLICY "Service role manages evidence" ON public.exam_evidence
  FOR ALL TO service_role USING (true) WITH CHECK (true);
