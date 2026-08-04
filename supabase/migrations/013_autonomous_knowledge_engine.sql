-- =====================================================================
-- 013. AUTONOMOUS GLOBAL KNOWLEDGE ENGINE & LEARNING ASSET CACHE
-- =====================================================================

-- 1. Subject Aliases Table
CREATE TABLE IF NOT EXISTS public.subject_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE NOT NULL,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(subject_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_subject_aliases_alias_lower ON public.subject_aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_subject_aliases_subject_id ON public.subject_aliases(subject_id);

-- 2. Topic Aliases Table
CREATE TABLE IF NOT EXISTS public.topic_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(topic_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_topic_aliases_alias_lower ON public.topic_aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_topic_aliases_topic_id ON public.topic_aliases(topic_id);

-- 3. Enhance Quality Control & Source Metadata on Subjects & Topics
ALTER TABLE public.exam_subjects
  ADD COLUMN IF NOT EXISTS generation_timestamp TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS prompt_version TEXT DEFAULT '2026-v2',
  ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'gemini-3.6-flash',
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_status TEXT CHECK (validation_status IN ('auto_validated', 'pending_review', 'verified', 'archived')) DEFAULT 'auto_validated';

ALTER TABLE public.exam_topics
  ADD COLUMN IF NOT EXISTS generation_timestamp TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS prompt_version TEXT DEFAULT '2026-v2',
  ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'gemini-3.6-flash',
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_status TEXT CHECK (validation_status IN ('auto_validated', 'pending_review', 'verified', 'archived')) DEFAULT 'auto_validated',
  ADD COLUMN IF NOT EXISTS learning_objectives TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS estimated_study_mins INTEGER DEFAULT 45;

-- 4. Learning Asset Content Cache Table (For Lazy Topic Content Generation)
CREATE TABLE IF NOT EXISTS public.learning_content_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL, -- 'mcqs' | 'quiz' | 'notes' | 'flashcards' | 'tutor_explanation' | 'revision_sheet' | 'full_pack'
  difficulty TEXT DEFAULT 'Intermediate' NOT NULL,
  language TEXT DEFAULT 'en' NOT NULL,
  payload JSONB NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  ai_confidence_score NUMERIC(5,2) DEFAULT 98.50 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,
  UNIQUE(topic_id, content_type, difficulty, language)
);

CREATE INDEX IF NOT EXISTS idx_learning_content_cache_topic ON public.learning_content_cache(topic_id, content_type);

-- 5. RLS Policies
ALTER TABLE public.subject_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_content_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to subject_aliases" ON public.subject_aliases;
CREATE POLICY "Public read access to subject_aliases" ON public.subject_aliases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write subject_aliases" ON public.subject_aliases;
CREATE POLICY "Authenticated users write subject_aliases" ON public.subject_aliases FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read access to topic_aliases" ON public.topic_aliases;
CREATE POLICY "Public read access to topic_aliases" ON public.topic_aliases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write topic_aliases" ON public.topic_aliases;
CREATE POLICY "Authenticated users write topic_aliases" ON public.topic_aliases FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read access to learning_content_cache" ON public.learning_content_cache;
CREATE POLICY "Public read access to learning_content_cache" ON public.learning_content_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write learning_content_cache" ON public.learning_content_cache;
CREATE POLICY "Authenticated users write learning_content_cache" ON public.learning_content_cache FOR ALL USING (auth.role() = 'authenticated');

-- 6. RPC Function for Smart Subject Matching
CREATE OR REPLACE FUNCTION public.match_subject_smart(p_exam_id UUID, p_query TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  weight_percentage NUMERIC,
  match_confidence NUMERIC
) AS $$
DECLARE
  v_clean TEXT := LOWER(TRIM(p_query));
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.slug,
    s.weight_percentage,
    CASE
      WHEN LOWER(s.slug) = v_clean THEN 100.00
      WHEN LOWER(s.name) = v_clean THEN 98.00
      WHEN LOWER(s.name) LIKE v_clean || '%' THEN 88.00
      WHEN EXISTS (SELECT 1 FROM public.subject_aliases sa WHERE sa.subject_id = s.id AND LOWER(sa.alias) = v_clean) THEN 95.00
      WHEN EXISTS (SELECT 1 FROM public.subject_aliases sa WHERE sa.subject_id = s.id AND LOWER(sa.alias) LIKE '%' || v_clean || '%') THEN 75.00
      ELSE 50.00
    END AS match_confidence
  FROM public.exam_subjects s
  WHERE s.exam_id = p_exam_id
    AND (
      LOWER(s.name) LIKE '%' || v_clean || '%'
      OR LOWER(COALESCE(s.slug, '')) LIKE '%' || v_clean || '%'
      OR EXISTS (SELECT 1 FROM public.subject_aliases sa WHERE sa.subject_id = s.id AND LOWER(sa.alias) LIKE '%' || v_clean || '%')
    )
  ORDER BY match_confidence DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
