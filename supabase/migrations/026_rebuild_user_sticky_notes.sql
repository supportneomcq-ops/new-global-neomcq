-- 026_rebuild_user_sticky_notes.sql
-- Production Hardening for NeoMCQ Sticky Notes Workspace

ALTER TABLE public.user_sticky_notes 
  ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'high_yield' NOT NULL,
  ADD COLUMN IF NOT EXISTS rotation_deg REAL DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE NOT NULL;

-- Scoping indexes for quick queries
CREATE INDEX IF NOT EXISTS idx_user_sticky_notes_scoping 
  ON public.user_sticky_notes(user_id, topic_id, subtopic_id);

CREATE INDEX IF NOT EXISTS idx_user_sticky_notes_hierarchy 
  ON public.user_sticky_notes(user_id, exam_id, subject_id, topic_id);

-- Row Level Security
ALTER TABLE public.user_sticky_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own sticky notes" ON public.user_sticky_notes;
CREATE POLICY "Users can manage own sticky notes" ON public.user_sticky_notes
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
