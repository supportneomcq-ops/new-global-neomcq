const fs = require('fs');
const path = require('path');
const pg = require('pg');

async function run() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    console.error('POSTGRES_URL environment variable is missing.');
    process.exit(1);
  }

  const connectionString = postgresUrl.split('?')[0];
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database...');

    const migrationSql = `
    CREATE TABLE IF NOT EXISTS public.mcqs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      question TEXT NOT NULL,
      options JSONB DEFAULT '[]'::jsonb NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      rationale TEXT,
      clinical_pearl TEXT,
      difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Expert', 'Adaptive')) DEFAULT 'Intermediate' NOT NULL,
      question_type TEXT CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false', 'clinical_case')) DEFAULT 'single_choice' NOT NULL,
      exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
      subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
      topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
      tags TEXT[] DEFAULT '{}' NOT NULL,
      source TEXT DEFAULT 'Manual' NOT NULL,
      ai_generated BOOLEAN DEFAULT FALSE NOT NULL,
      ai_provider TEXT,
      ai_model TEXT,
      status TEXT CHECK (status IN ('draft', 'generating', 'pending_review', 'approved', 'rejected', 'archived')) DEFAULT 'pending_review' NOT NULL,
      reviewed BOOLEAN DEFAULT FALSE NOT NULL,
      reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      review_notes TEXT,
      version INTEGER DEFAULT 1 NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mcqs_exam_id ON public.mcqs(exam_id);
    CREATE INDEX IF NOT EXISTS idx_mcqs_subject_id ON public.mcqs(subject_id);
    CREATE INDEX IF NOT EXISTS idx_mcqs_topic_id ON public.mcqs(topic_id);
    CREATE INDEX IF NOT EXISTS idx_mcqs_status ON public.mcqs(status);

    CREATE TABLE IF NOT EXISTS public.notes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      note_type TEXT CHECK (note_type IN ('topper_handwritten', 'high_yield', 'clinical_pearl', 'revision', 'concept')) DEFAULT 'high_yield' NOT NULL,
      exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
      subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
      topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
      status TEXT CHECK (status IN ('draft', 'generating', 'pending_review', 'approved', 'rejected', 'archived')) DEFAULT 'pending_review' NOT NULL,
      author_source TEXT DEFAULT 'Admin' NOT NULL,
      ai_generated BOOLEAN DEFAULT FALSE NOT NULL,
      ai_provider TEXT,
      ai_model TEXT,
      handwritten_style JSONB DEFAULT '{"paperStyle": "notebook", "marginNotes": true, "highlighter": true, "importantBoxes": true}'::jsonb NOT NULL,
      version INTEGER DEFAULT 1 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_exam_id ON public.notes(exam_id);
    CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON public.notes(subject_id);
    CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON public.notes(topic_id);
    CREATE INDEX IF NOT EXISTS idx_notes_status ON public.notes(status);

    CREATE TABLE IF NOT EXISTS public.flashcard_decks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      description TEXT,
      exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
      subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
      topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
      card_count INTEGER DEFAULT 0 NOT NULL,
      status TEXT CHECK (status IN ('draft', 'pending_review', 'approved', 'archived')) DEFAULT 'approved' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_flashcard_decks_exam_id ON public.flashcard_decks(exam_id);

    CREATE TABLE IF NOT EXISTS public.flashcards (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE SET NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
      subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
      topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
      difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium' NOT NULL,
      status TEXT CHECK (status IN ('draft', 'generating', 'pending_review', 'approved', 'rejected', 'archived')) DEFAULT 'approved' NOT NULL,
      ai_generated BOOLEAN DEFAULT FALSE NOT NULL,
      version INTEGER DEFAULT 1 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON public.flashcards(deck_id);
    CREATE INDEX IF NOT EXISTS idx_flashcards_exam_id ON public.flashcards(exam_id);
    CREATE INDEX IF NOT EXISTS idx_flashcards_status ON public.flashcards(status);

    CREATE TABLE IF NOT EXISTS public.revision_sheets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      sheet_type TEXT CHECK (sheet_type IN ('printable', 'quick_revision', 'fill_in_blanks', 'high_yield_table', 'mnemonics')) DEFAULT 'quick_revision' NOT NULL,
      exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
      subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
      topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
      content JSONB DEFAULT '{}'::jsonb NOT NULL,
      status TEXT CHECK (status IN ('draft', 'generating', 'pending_review', 'approved', 'published', 'rejected', 'archived')) DEFAULT 'pending_review' NOT NULL,
      version INTEGER DEFAULT 1 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_revision_sheets_exam_id ON public.revision_sheets(exam_id);
    CREATE INDEX IF NOT EXISTS idx_revision_sheets_status ON public.revision_sheets(status);

    CREATE TABLE IF NOT EXISTS public.ai_tutor_lessons (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
      subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
      topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
      difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')) DEFAULT 'Intermediate' NOT NULL,
      status TEXT CHECK (status IN ('draft', 'generating', 'pending_review', 'approved', 'rejected', 'archived')) DEFAULT 'pending_review' NOT NULL,
      generation_state TEXT DEFAULT 'completed' NOT NULL,
      ai_provider TEXT DEFAULT 'Google Gemini' NOT NULL,
      ai_model TEXT DEFAULT 'gemini-3.6-flash' NOT NULL,
      content JSONB DEFAULT '{}'::jsonb NOT NULL,
      version INTEGER DEFAULT 1 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_tutor_lessons_exam_id ON public.ai_tutor_lessons(exam_id);
    CREATE INDEX IF NOT EXISTS idx_ai_tutor_lessons_status ON public.ai_tutor_lessons(status);

    CREATE TABLE IF NOT EXISTS public.content_versions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      asset_id UUID NOT NULL,
      asset_type TEXT NOT NULL,
      version INTEGER NOT NULL,
      snapshot JSONB NOT NULL,
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      change_summary TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_content_versions_asset ON public.content_versions(asset_id, asset_type);

    ALTER TABLE public.mcqs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.revision_sheets ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_tutor_lessons ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public read approved mcqs" ON public.mcqs;
    CREATE POLICY "Public read approved mcqs" ON public.mcqs FOR SELECT USING (status = 'approved' OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admins write mcqs" ON public.mcqs;
    CREATE POLICY "Admins write mcqs" ON public.mcqs FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Public read approved notes" ON public.notes;
    CREATE POLICY "Public read approved notes" ON public.notes FOR SELECT USING (status = 'approved' OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admins write notes" ON public.notes;
    CREATE POLICY "Admins write notes" ON public.notes FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Public read approved flashcards" ON public.flashcards;
    CREATE POLICY "Public read approved flashcards" ON public.flashcards FOR SELECT USING (status = 'approved' OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admins write flashcards" ON public.flashcards;
    CREATE POLICY "Admins write flashcards" ON public.flashcards FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Public read approved decks" ON public.flashcard_decks;
    CREATE POLICY "Public read approved decks" ON public.flashcard_decks FOR SELECT USING (status = 'approved' OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admins write decks" ON public.flashcard_decks;
    CREATE POLICY "Admins write decks" ON public.flashcard_decks FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Public read approved revision_sheets" ON public.revision_sheets;
    CREATE POLICY "Public read approved revision_sheets" ON public.revision_sheets FOR SELECT USING (status IN ('approved', 'published') OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admins write revision_sheets" ON public.revision_sheets;
    CREATE POLICY "Admins write revision_sheets" ON public.revision_sheets FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Public read approved ai_tutor_lessons" ON public.ai_tutor_lessons;
    CREATE POLICY "Public read approved ai_tutor_lessons" ON public.ai_tutor_lessons FOR SELECT USING (status = 'approved' OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admins write ai_tutor_lessons" ON public.ai_tutor_lessons;
    CREATE POLICY "Admins write ai_tutor_lessons" ON public.ai_tutor_lessons FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admins read content_versions" ON public.content_versions;
    CREATE POLICY "Admins read content_versions" ON public.content_versions FOR ALL USING (public.is_admin(auth.uid()));
    `;

    await client.query(migrationSql);
    console.log('Migration completed successfully! Learning Content tables created.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

run();
