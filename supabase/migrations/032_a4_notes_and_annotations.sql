-- Migration 032: Canonical A4 Notes and User Annotations Storage & Security
-- Location: /supabase/migrations/032_a4_notes_and_annotations.sql

BEGIN;

-- 1. Canonical A4 Notes Storage Table
CREATE TABLE IF NOT EXISTS public.canonical_a4_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
  subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE CASCADE,
  content_scope TEXT NOT NULL CHECK (content_scope IN ('TOPIC', 'SUBTOPIC')),
  document_title TEXT NOT NULL,
  total_pages INT NOT NULL DEFAULT 3 CHECK (total_pages >= 3),
  document_content JSONB NOT NULL DEFAULT '[]'::jsonb,
  table_of_contents JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_current BOOLEAN NOT NULL DEFAULT true,
  generation_status TEXT NOT NULL DEFAULT 'ready' CHECK (generation_status IN ('pending', 'processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- Ensure is_current column exists if table was created earlier
ALTER TABLE public.canonical_a4_notes 
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true;

-- Unique version index per scope & version (historical versioning tracking)
CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_a4_topic_version 
  ON public.canonical_a4_notes(exam_id, subject_id, topic_id, version) 
  WHERE subtopic_id IS NULL AND content_scope = 'TOPIC';

CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_a4_subtopic_version 
  ON public.canonical_a4_notes(exam_id, subject_id, topic_id, subtopic_id, version) 
  WHERE subtopic_id IS NOT NULL AND content_scope = 'SUBTOPIC';

-- Database-enforced UNIQUE indexes for CURRENT canonical document per scope (exactly ONE current record allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_a4_topic_current 
  ON public.canonical_a4_notes(exam_id, subject_id, topic_id) 
  WHERE is_current = true AND subtopic_id IS NULL AND content_scope = 'TOPIC';

CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_a4_subtopic_current 
  ON public.canonical_a4_notes(exam_id, subject_id, topic_id, subtopic_id) 
  WHERE is_current = true AND subtopic_id IS NOT NULL AND content_scope = 'SUBTOPIC';

-- Scoping and freshness performance indexes
CREATE INDEX IF NOT EXISTS idx_canonical_a4_scoping 
  ON public.canonical_a4_notes(exam_id, subject_id, topic_id, subtopic_id);

CREATE INDEX IF NOT EXISTS idx_canonical_a4_freshness 
  ON public.canonical_a4_notes(expires_at);

-- 2. User Highlights Persistence Table
CREATE TABLE IF NOT EXISTS public.user_a4_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.canonical_a4_notes(id) ON DELETE CASCADE NOT NULL,
  page_number INT NOT NULL CHECK (page_number >= 1),
  section_id TEXT NOT NULL,
  selected_text TEXT NOT NULL,
  color TEXT DEFAULT 'yellow' NOT NULL CHECK (color IN ('yellow', 'green', 'blue', 'pink')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_a4_highlights_user_doc 
  ON public.user_a4_highlights(user_id, document_id);

-- 3. User Annotations / Margin Notes Table
CREATE TABLE IF NOT EXISTS public.user_a4_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.canonical_a4_notes(id) ON DELETE CASCADE NOT NULL,
  page_number INT NOT NULL CHECK (page_number >= 1),
  section_id TEXT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_a4_annotations_user_doc 
  ON public.user_a4_annotations(user_id, document_id);

-- 4. Enable Row-Level Security (RLS)
ALTER TABLE public.canonical_a4_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_a4_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_a4_annotations ENABLE ROW LEVEL SECURITY;

-- 5. Row-Level Security Policies
-- Canonical A4 Notes read access
DROP POLICY IF EXISTS "Canonical A4 notes readable by authenticated users" ON public.canonical_a4_notes;
CREATE POLICY "Canonical A4 notes readable by authenticated users" 
  ON public.canonical_a4_notes 
  FOR SELECT TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Service role manages canonical A4 notes" ON public.canonical_a4_notes;
CREATE POLICY "Service role manages canonical A4 notes" 
  ON public.canonical_a4_notes 
  FOR ALL TO service_role 
  USING (true) 
  WITH CHECK (true);

-- User-specific highlights isolation
DROP POLICY IF EXISTS "Users manage own A4 highlights" ON public.user_a4_highlights;
CREATE POLICY "Users manage own A4 highlights" 
  ON public.user_a4_highlights 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- User-specific annotations isolation
DROP POLICY IF EXISTS "Users manage own A4 annotations" ON public.user_a4_annotations;
CREATE POLICY "Users manage own A4 annotations" 
  ON public.user_a4_annotations 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

COMMIT;
