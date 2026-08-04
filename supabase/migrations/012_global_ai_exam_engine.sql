-- =====================================================================
-- 012. GLOBAL AI EXAM ENGINE SCHEMA & VERSIONING
-- =====================================================================

-- 1. Enhance public.exams table with AI Exam Engine fields
ALTER TABLE public.exams 
  ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC(5,2) DEFAULT 98.50,
  ADD COLUMN IF NOT EXISTS official_website TEXT,
  ADD COLUMN IF NOT EXISTS ai_version TEXT DEFAULT 'v3.5',
  ADD COLUMN IF NOT EXISTS prompt_version TEXT DEFAULT '2026-v1',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'AI Engine',
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('auto_approved', 'pending_review', 'approved', 'archived')) DEFAULT 'auto_approved';

-- 2. Exam Aliases Table for fast lookup
CREATE TABLE IF NOT EXISTS public.exam_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(exam_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_exam_aliases_alias_lower ON public.exam_aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_exam_aliases_exam_id ON public.exam_aliases(exam_id);

-- 3. Enhance public.exam_subjects table
ALTER TABLE public.exam_subjects
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS topic_count INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5,2) DEFAULT 98.00 NOT NULL,
  ADD COLUMN IF NOT EXISTS ai_version TEXT DEFAULT 'v3.5' NOT NULL;

-- 4. Enhance public.exam_topics for unlimited nesting (Subject -> Topic -> Subtopic -> Concept)
ALTER TABLE public.exam_topics
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('topic', 'subtopic', 'concept')) DEFAULT 'topic' NOT NULL,
  ADD COLUMN IF NOT EXISTS target_weight NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5,2) DEFAULT 98.00 NOT NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}' NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exam_topics_parent_id ON public.exam_topics(parent_id);
CREATE INDEX IF NOT EXISTS idx_exam_topics_subject_id ON public.exam_topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_topics_level ON public.exam_topics(level);

-- 5. Enhance ai_generation_jobs table for fine-grained progress feedback
ALTER TABLE public.ai_generation_jobs
  ADD COLUMN IF NOT EXISTS progress_stage TEXT DEFAULT 'Preparing your exam...',
  ADD COLUMN IF NOT EXISTS step_percentage INTEGER DEFAULT 0;

-- 6. RLS Policies for Exam Engine Tables
ALTER TABLE public.exam_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to exam_aliases" ON public.exam_aliases;
CREATE POLICY "Public read access to exam_aliases" ON public.exam_aliases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write exam_aliases" ON public.exam_aliases;
CREATE POLICY "Authenticated users write exam_aliases" ON public.exam_aliases FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read access to exam_subjects" ON public.exam_subjects;
CREATE POLICY "Public read access to exam_subjects" ON public.exam_subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write exam_subjects" ON public.exam_subjects;
CREATE POLICY "Authenticated users write exam_subjects" ON public.exam_subjects FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read access to exam_topics" ON public.exam_topics;
CREATE POLICY "Public read access to exam_topics" ON public.exam_topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write exam_topics" ON public.exam_topics;
CREATE POLICY "Authenticated users write exam_topics" ON public.exam_topics FOR ALL USING (auth.role() = 'authenticated');

-- 7. Advanced Exam Search Function with Aliases & Metadata matching
CREATE OR REPLACE FUNCTION public.search_exams_fuzzy(p_query TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  category_id UUID,
  country_id UUID,
  description TEXT,
  difficulty TEXT,
  question_count INTEGER,
  time_limit_mins INTEGER,
  is_featured BOOLEAN,
  created_by_ai BOOLEAN,
  status TEXT,
  ai_confidence_score NUMERIC,
  official_website TEXT,
  aliases TEXT[],
  created_at TIMESTAMPTZ,
  match_score INTEGER
) AS $$
DECLARE
  v_clean TEXT := LOWER(TRIM(p_query));
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.slug,
    e.category_id,
    e.country_id,
    e.description,
    e.difficulty,
    e.question_count,
    e.time_limit_mins,
    e.is_featured,
    e.created_by_ai,
    e.status,
    e.ai_confidence_score,
    e.official_website,
    e.aliases,
    e.created_at,
    CASE
      WHEN LOWER(e.slug) = v_clean THEN 100
      WHEN LOWER(e.name) = v_clean THEN 95
      WHEN LOWER(e.name) LIKE v_clean || '%' THEN 85
      WHEN LOWER(e.name) LIKE '%' || v_clean || '%' THEN 75
      WHEN v_clean = ANY(SELECT LOWER(a) FROM UNNEST(e.aliases) a) THEN 90
      WHEN EXISTS (SELECT 1 FROM public.exam_aliases ea WHERE ea.exam_id = e.id AND LOWER(ea.alias) LIKE '%' || v_clean || '%') THEN 70
      ELSE 50
    END AS match_score
  FROM public.exams e
  WHERE e.status != 'archived'
    AND (
      LOWER(e.name) LIKE '%' || v_clean || '%'
      OR LOWER(e.slug) LIKE '%' || v_clean || '%'
      OR LOWER(COALESCE(e.description, '')) LIKE '%' || v_clean || '%'
      OR v_clean = ANY(SELECT LOWER(a) FROM UNNEST(e.aliases) a)
      OR EXISTS (SELECT 1 FROM public.exam_aliases ea WHERE ea.exam_id = e.id AND LOWER(ea.alias) LIKE '%' || v_clean || '%')
    )
  ORDER BY match_score DESC, e.is_featured DESC, e.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
