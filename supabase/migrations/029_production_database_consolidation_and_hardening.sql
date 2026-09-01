-- ============================================================================
-- NEOMCQ MIGRATION 029: PRODUCTION DATABASE CONSOLIDATION & SCHEMA HARDENING
-- Reconciles all schema drift, missing columns, foreign keys, RLS, and indexes
-- ============================================================================

-- 1. Ensure required Postgres extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. CURRICULUM HIERARCHY TABLES (EXAMS -> SUBJECTS -> TOPICS -> SUBTOPICS)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    country_id UUID,
    country_code TEXT DEFAULT 'GLOBAL',
    category_id UUID,
    is_active BOOLEAN DEFAULT true,
    total_questions INT DEFAULT 0,
    duration_minutes INT DEFAULT 180,
    passing_score NUMERIC(5,2) DEFAULT 50.00,
    icon TEXT,
    description TEXT,
    difficulty_level TEXT DEFAULT 'Intermediate',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exam_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    code TEXT,
    icon TEXT,
    sort_order INT DEFAULT 0,
    total_topics INT DEFAULT 0,
    normalized_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exam_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    code TEXT,
    high_yield BOOLEAN DEFAULT false,
    estimated_minutes INT DEFAULT 30,
    sort_order INT DEFAULT 0,
    normalized_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exam_subtopics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT,
    code TEXT,
    high_yield BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    normalized_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 3. RECONCILE AI TUTOR LESSONS & SUBSIDIARY TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_tutor_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT,
    current_phase TEXT DEFAULT 'Introduction',
    current_sequence INT DEFAULT 1 NOT NULL,
    total_duration_seconds INT DEFAULT 360 NOT NULL,
    scenes_data JSONB DEFAULT '[]'::jsonb NOT NULL,
    segments JSONB DEFAULT '[]'::jsonb NOT NULL,
    video_engine_version TEXT DEFAULT '2.0',
    difficulty_level TEXT DEFAULT 'High-Yield Board Level',
    target_exam TEXT DEFAULT 'Medical Board Exam',
    content JSONB DEFAULT '{}'::jsonb NOT NULL,
    lesson_state TEXT DEFAULT 'NOT_STARTED',
    status TEXT DEFAULT 'approved',
    content_version INT DEFAULT 1 NOT NULL,
    version INT DEFAULT 1 NOT NULL,
    batch_id TEXT,
    content_hash TEXT,
    source_generation_id TEXT,
    generation_status TEXT DEFAULT 'ready',
    is_published BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Self-healing: Ensure every column exists on ai_tutor_lessons if the table already existed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'difficulty_level') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN difficulty_level TEXT DEFAULT 'High-Yield Board Level';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'scenes_data') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN scenes_data JSONB DEFAULT '[]'::jsonb NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'segments') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN segments JSONB DEFAULT '[]'::jsonb NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'video_engine_version') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN video_engine_version TEXT DEFAULT '2.0';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'target_exam') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN target_exam TEXT DEFAULT 'Medical Board Exam';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'current_phase') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN current_phase TEXT DEFAULT 'Introduction';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'current_sequence') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN current_sequence INT DEFAULT 1 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'total_duration_seconds') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN total_duration_seconds INT DEFAULT 360 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'content') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN content JSONB DEFAULT '{}'::jsonb NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'lesson_state') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN lesson_state TEXT DEFAULT 'NOT_STARTED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'status') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN status TEXT DEFAULT 'approved';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'content_version') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN content_version INT DEFAULT 1 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'version') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN version INT DEFAULT 1 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'subtopic_id') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'batch_id') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN batch_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'content_hash') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN content_hash TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'source_generation_id') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN source_generation_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'generation_status') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN generation_status TEXT DEFAULT 'ready';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'is_published') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN is_published BOOLEAN DEFAULT true NOT NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ai_tutor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.ai_tutor_lessons(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'tutor', 'system')),
    message TEXT NOT NULL,
    scene_index INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ai_tutor_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.ai_tutor_lessons(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    timestamp_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ai_tutor_tts_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.ai_tutor_lessons(id) ON DELETE CASCADE,
    scene_id TEXT NOT NULL,
    text_hash TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    provider TEXT DEFAULT 'google',
    voice_id TEXT DEFAULT 'en-US-Journey-F',
    duration_seconds NUMERIC(6,2),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(scene_id, text_hash)
);

-- ----------------------------------------------------------------------------
-- 4. RECONCILE USER STICKY NOTES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_sticky_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    title TEXT,
    text TEXT NOT NULL,
    category TEXT DEFAULT 'high_yield' NOT NULL,
    color TEXT DEFAULT 'yellow' NOT NULL,
    pinned BOOLEAN DEFAULT FALSE NOT NULL,
    size TEXT DEFAULT 'md' NOT NULL,
    rotation_deg REAL DEFAULT 0 NOT NULL,
    is_ai_generated BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Self-healing: Ensure every column exists on user_sticky_notes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sticky_notes' AND column_name = 'exam_id') THEN
        ALTER TABLE public.user_sticky_notes ADD COLUMN exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sticky_notes' AND column_name = 'subject_id') THEN
        ALTER TABLE public.user_sticky_notes ADD COLUMN subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sticky_notes' AND column_name = 'subtopic_id') THEN
        ALTER TABLE public.user_sticky_notes ADD COLUMN subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sticky_notes' AND column_name = 'title') THEN
        ALTER TABLE public.user_sticky_notes ADD COLUMN title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sticky_notes' AND column_name = 'category') THEN
        ALTER TABLE public.user_sticky_notes ADD COLUMN category TEXT DEFAULT 'high_yield' NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sticky_notes' AND column_name = 'rotation_deg') THEN
        ALTER TABLE public.user_sticky_notes ADD COLUMN rotation_deg REAL DEFAULT 0 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sticky_notes' AND column_name = 'is_ai_generated') THEN
        ALTER TABLE public.user_sticky_notes ADD COLUMN is_ai_generated BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. RECONCILE CANONICAL LEARNING CONTENT (MCQS, NOTES, FLASHCARDS, REVISION)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mcqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    slug TEXT UNIQUE,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    step_by_step_explanation JSONB DEFAULT '[]'::jsonb,
    clinical_pearl TEXT,
    difficulty TEXT DEFAULT 'Intermediate',
    question_type TEXT DEFAULT 'single_choice',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    high_yield BOOLEAN DEFAULT false,
    high_yield_tag TEXT,
    fingerprint TEXT,
    content_version INT DEFAULT 1 NOT NULL,
    version INT DEFAULT 1 NOT NULL,
    batch_id TEXT,
    content_hash TEXT,
    source_generation_id TEXT,
    generation_status TEXT DEFAULT 'ready',
    status TEXT DEFAULT 'approved',
    visibility TEXT DEFAULT 'PUBLIC_CANONICAL',
    answer_visibility TEXT DEFAULT 'AFTER_ATTEMPT',
    ai_generated BOOLEAN DEFAULT true,
    ai_provider TEXT,
    ai_model TEXT,
    is_canonical BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'subtopic_id') THEN
        ALTER TABLE public.mcqs ADD COLUMN subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'content_version') THEN
        ALTER TABLE public.mcqs ADD COLUMN content_version INT DEFAULT 1 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'version') THEN
        ALTER TABLE public.mcqs ADD COLUMN version INT DEFAULT 1 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'batch_id') THEN
        ALTER TABLE public.mcqs ADD COLUMN batch_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'content_hash') THEN
        ALTER TABLE public.mcqs ADD COLUMN content_hash TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'source_generation_id') THEN
        ALTER TABLE public.mcqs ADD COLUMN source_generation_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'generation_status') THEN
        ALTER TABLE public.mcqs ADD COLUMN generation_status TEXT DEFAULT 'ready';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'step_by_step_explanation') THEN
        ALTER TABLE public.mcqs ADD COLUMN step_by_step_explanation JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'clinical_pearl') THEN
        ALTER TABLE public.mcqs ADD COLUMN clinical_pearl TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'high_yield_tag') THEN
        ALTER TABLE public.mcqs ADD COLUMN high_yield_tag TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'fingerprint') THEN
        ALTER TABLE public.mcqs ADD COLUMN fingerprint TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'is_canonical') THEN
        ALTER TABLE public.mcqs ADD COLUMN is_canonical BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcqs' AND column_name = 'is_published') THEN
        ALTER TABLE public.mcqs ADD COLUMN is_published BOOLEAN DEFAULT true;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    slug TEXT UNIQUE,
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary TEXT,
    high_yield_points JSONB DEFAULT '[]'::jsonb,
    clinical_correlations JSONB DEFAULT '[]'::jsonb,
    mnemonics JSONB DEFAULT '[]'::jsonb,
    diagnostic_pearls JSONB DEFAULT '[]'::jsonb,
    note_type TEXT DEFAULT 'high_yield',
    status TEXT DEFAULT 'approved',
    content_version INT DEFAULT 1 NOT NULL,
    version INT DEFAULT 1 NOT NULL,
    batch_id TEXT,
    content_hash TEXT,
    source_generation_id TEXT,
    generation_status TEXT DEFAULT 'ready',
    ai_generated BOOLEAN DEFAULT true,
    ai_provider TEXT,
    ai_model TEXT,
    is_canonical BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'subtopic_id') THEN
        ALTER TABLE public.notes ADD COLUMN subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'content_version') THEN
        ALTER TABLE public.notes ADD COLUMN content_version INT DEFAULT 1 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'version') THEN
        ALTER TABLE public.notes ADD COLUMN version INT DEFAULT 1 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'batch_id') THEN
        ALTER TABLE public.notes ADD COLUMN batch_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'content_hash') THEN
        ALTER TABLE public.notes ADD COLUMN content_hash TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'source_generation_id') THEN
        ALTER TABLE public.notes ADD COLUMN source_generation_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'generation_status') THEN
        ALTER TABLE public.notes ADD COLUMN generation_status TEXT DEFAULT 'ready';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'summary') THEN
        ALTER TABLE public.notes ADD COLUMN summary TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'high_yield_points') THEN
        ALTER TABLE public.notes ADD COLUMN high_yield_points JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'clinical_correlations') THEN
        ALTER TABLE public.notes ADD COLUMN clinical_correlations JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'mnemonics') THEN
        ALTER TABLE public.notes ADD COLUMN mnemonics JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'diagnostic_pearls') THEN
        ALTER TABLE public.notes ADD COLUMN diagnostic_pearls JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'is_canonical') THEN
        ALTER TABLE public.notes ADD COLUMN is_canonical BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'is_published') THEN
        ALTER TABLE public.notes ADD COLUMN is_published BOOLEAN DEFAULT true;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    card_count INT DEFAULT 0,
    content_version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE SET NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    clinical_pearl TEXT,
    difficulty TEXT DEFAULT 'Intermediate',
    status TEXT DEFAULT 'approved',
    content_version INT DEFAULT 1 NOT NULL,
    version INT DEFAULT 1 NOT NULL,
    batch_id TEXT,
    content_hash TEXT,
    source_generation_id TEXT,
    generation_status TEXT DEFAULT 'ready',
    ai_generated BOOLEAN DEFAULT true,
    is_canonical BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'subtopic_id') THEN
        ALTER TABLE public.flashcards ADD COLUMN subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'content_version') THEN
        ALTER TABLE public.flashcards ADD COLUMN content_version INT DEFAULT 1 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'version') THEN
        ALTER TABLE public.flashcards ADD COLUMN version INT DEFAULT 1 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'batch_id') THEN
        ALTER TABLE public.flashcards ADD COLUMN batch_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'content_hash') THEN
        ALTER TABLE public.flashcards ADD COLUMN content_hash TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'source_generation_id') THEN
        ALTER TABLE public.flashcards ADD COLUMN source_generation_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'generation_status') THEN
        ALTER TABLE public.flashcards ADD COLUMN generation_status TEXT DEFAULT 'ready';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'is_canonical') THEN
        ALTER TABLE public.flashcards ADD COLUMN is_canonical BOOLEAN DEFAULT true;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.revision_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    slug TEXT UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT,
    sheet_type TEXT DEFAULT 'quick_revision',
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'approved',
    content_version INT DEFAULT 1 NOT NULL,
    version INT DEFAULT 1 NOT NULL,
    batch_id TEXT,
    content_hash TEXT,
    source_generation_id TEXT,
    generation_status TEXT DEFAULT 'ready',
    ai_generated BOOLEAN DEFAULT true,
    is_canonical BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revision_sheets' AND column_name = 'subtopic_id') THEN
        ALTER TABLE public.revision_sheets ADD COLUMN subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revision_sheets' AND column_name = 'content_version') THEN
        ALTER TABLE public.revision_sheets ADD COLUMN content_version INT DEFAULT 1 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revision_sheets' AND column_name = 'version') THEN
        ALTER TABLE public.revision_sheets ADD COLUMN version INT DEFAULT 1 NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revision_sheets' AND column_name = 'batch_id') THEN
        ALTER TABLE public.revision_sheets ADD COLUMN batch_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revision_sheets' AND column_name = 'content_hash') THEN
        ALTER TABLE public.revision_sheets ADD COLUMN content_hash TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revision_sheets' AND column_name = 'source_generation_id') THEN
        ALTER TABLE public.revision_sheets ADD COLUMN source_generation_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revision_sheets' AND column_name = 'generation_status') THEN
        ALTER TABLE public.revision_sheets ADD COLUMN generation_status TEXT DEFAULT 'ready';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revision_sheets' AND column_name = 'is_canonical') THEN
        ALTER TABLE public.revision_sheets ADD COLUMN is_canonical BOOLEAN DEFAULT true;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.topic_media_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    content_version_id UUID,
    media_type TEXT NOT NULL,
    source_platform TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    embed_url TEXT,
    thumbnail_url TEXT,
    preview_url TEXT,
    duration INT,
    attribution TEXT,
    license TEXT,
    section_title TEXT,
    section_index INT,
    relevance_score NUMERIC(5,2) DEFAULT 90.00,
    validation_status TEXT DEFAULT 'validated',
    retrieved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 6. CONTENT VERSIONS & ENGINE LEDGERS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    asset_type TEXT NOT NULL DEFAULT 'topic',
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    version INT NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT true,
    generation_reason TEXT NOT NULL DEFAULT 'FIRST_GENERATION',
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    provider TEXT,
    model TEXT,
    input_tokens INT DEFAULT 0,
    cached_input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    actual_cost_usd NUMERIC(10,6) DEFAULT 0,
    quality_score NUMERIC(5,2) DEFAULT 95.00,
    content_count INT DEFAULT 0,
    change_summary TEXT,
    batch_id TEXT,
    content_hash TEXT,
    source_generation_id TEXT,
    generation_status TEXT DEFAULT 'ready',
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(asset_id, asset_type, version)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_versions' AND column_name = 'exam_id') THEN
        ALTER TABLE public.content_versions ADD COLUMN exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_versions' AND column_name = 'subject_id') THEN
        ALTER TABLE public.content_versions ADD COLUMN subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_versions' AND column_name = 'topic_id') THEN
        ALTER TABLE public.content_versions ADD COLUMN topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_versions' AND column_name = 'subtopic_id') THEN
        ALTER TABLE public.content_versions ADD COLUMN subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_versions' AND column_name = 'batch_id') THEN
        ALTER TABLE public.content_versions ADD COLUMN batch_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_versions' AND column_name = 'content_hash') THEN
        ALTER TABLE public.content_versions ADD COLUMN content_hash TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_versions' AND column_name = 'source_generation_id') THEN
        ALTER TABLE public.content_versions ADD COLUMN source_generation_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_versions' AND column_name = 'generation_status') THEN
        ALTER TABLE public.content_versions ADD COLUMN generation_status TEXT DEFAULT 'ready';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. PROGRESS, ATTEMPTS, SESSIONS, AND PRACTICE TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mcq_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mcq_id UUID REFERENCES public.mcqs(id) ON DELETE CASCADE NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    selected_option TEXT,
    selected_index INT,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    time_spent_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    total_questions INT DEFAULT 0,
    correct_count INT DEFAULT 0,
    score_percentage NUMERIC(5,2) DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 8. COMPOSITE INDEXES FOR FAST SCOPED QUERIES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_mcqs_hierarchy_scoping ON public.mcqs(exam_id, subject_id, topic_id, subtopic_id);
CREATE INDEX IF NOT EXISTS idx_notes_hierarchy_scoping ON public.notes(exam_id, subject_id, topic_id, subtopic_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_hierarchy_scoping ON public.flashcards(exam_id, subject_id, topic_id, subtopic_id);
CREATE INDEX IF NOT EXISTS idx_revision_sheets_hierarchy_scoping ON public.revision_sheets(exam_id, subject_id, topic_id, subtopic_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_lessons_hierarchy_scoping ON public.ai_tutor_lessons(exam_id, subject_id, topic_id, subtopic_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_lessons_user_topic ON public.ai_tutor_lessons(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_user_sticky_notes_scoping ON public.user_sticky_notes(user_id, topic_id, subtopic_id);
CREATE INDEX IF NOT EXISTS idx_user_sticky_notes_hierarchy ON public.user_sticky_notes(user_id, exam_id, subject_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_scoping ON public.content_versions(exam_id, subject_id, topic_id, version DESC);

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_tts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_media_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sticky_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- Canonical Curriculum (Public Read, Admin/Service Write)
DROP POLICY IF EXISTS "Public read exams" ON public.exams;
CREATE POLICY "Public read exams" ON public.exams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read subjects" ON public.exam_subjects;
CREATE POLICY "Public read subjects" ON public.exam_subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read topics" ON public.exam_topics;
CREATE POLICY "Public read topics" ON public.exam_topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read subtopics" ON public.exam_subtopics;
CREATE POLICY "Public read subtopics" ON public.exam_subtopics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read mcqs" ON public.mcqs;
CREATE POLICY "Public read mcqs" ON public.mcqs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read notes" ON public.notes;
CREATE POLICY "Public read notes" ON public.notes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read flashcards" ON public.flashcards;
CREATE POLICY "Public read flashcards" ON public.flashcards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read flashcard decks" ON public.flashcard_decks;
CREATE POLICY "Public read flashcard decks" ON public.flashcard_decks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read revision sheets" ON public.revision_sheets;
CREATE POLICY "Public read revision sheets" ON public.revision_sheets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read topic media references" ON public.topic_media_references;
CREATE POLICY "Public read topic media references" ON public.topic_media_references FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read content versions" ON public.content_versions;
CREATE POLICY "Public read content versions" ON public.content_versions FOR SELECT USING (true);

-- User-Owned Sticky Notes Policies
DROP POLICY IF EXISTS "Users can read own sticky notes" ON public.user_sticky_notes;
CREATE POLICY "Users can read own sticky notes" ON public.user_sticky_notes
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sticky notes" ON public.user_sticky_notes;
CREATE POLICY "Users can insert own sticky notes" ON public.user_sticky_notes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sticky notes" ON public.user_sticky_notes;
CREATE POLICY "Users can update own sticky notes" ON public.user_sticky_notes
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sticky notes" ON public.user_sticky_notes;
CREATE POLICY "Users can delete own sticky notes" ON public.user_sticky_notes
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- User AI Tutor Lessons Policies
DROP POLICY IF EXISTS "Users can read accessible tutor lessons" ON public.ai_tutor_lessons;
CREATE POLICY "Users can read accessible tutor lessons" ON public.ai_tutor_lessons
    FOR SELECT
    USING (user_id IS NULL OR auth.uid() = user_id OR is_published = true);

DROP POLICY IF EXISTS "Users can insert own tutor lessons" ON public.ai_tutor_lessons;
CREATE POLICY "Users can insert own tutor lessons" ON public.ai_tutor_lessons
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tutor lessons" ON public.ai_tutor_lessons;
CREATE POLICY "Users can update own tutor lessons" ON public.ai_tutor_lessons
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service Role Full Access on all tables
DROP POLICY IF EXISTS "Service role manages sticky notes" ON public.user_sticky_notes;
CREATE POLICY "Service role manages sticky notes" ON public.user_sticky_notes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages tutor lessons" ON public.ai_tutor_lessons;
CREATE POLICY "Service role manages tutor lessons" ON public.ai_tutor_lessons
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages mcqs" ON public.mcqs;
CREATE POLICY "Service role manages mcqs" ON public.mcqs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages notes" ON public.notes;
CREATE POLICY "Service role manages notes" ON public.notes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages flashcards" ON public.flashcards;
CREATE POLICY "Service role manages flashcards" ON public.flashcards
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages revision sheets" ON public.revision_sheets;
CREATE POLICY "Service role manages revision sheets" ON public.revision_sheets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 10. SERVER-SIDE ATOMIC ANSWER VERIFICATION RPC
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_mcq_answer_atomic(
  p_user_id UUID,
  p_mcq_id UUID,
  p_selected_index INTEGER DEFAULT NULL,
  p_selected_option TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_mcq RECORD;
  v_is_correct BOOLEAN := FALSE;
  v_correct_answer TEXT;
  v_options JSONB;
  v_chosen_option TEXT;
BEGIN
  SELECT * INTO v_mcq FROM public.mcqs WHERE id = p_mcq_id;
  IF v_mcq.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MCQ not found');
  END IF;

  v_correct_answer := v_mcq.correct_answer;
  v_options := v_mcq.options;

  -- Determine chosen option string
  IF p_selected_option IS NOT NULL THEN
    v_chosen_option := p_selected_option;
  ELSIF p_selected_index IS NOT NULL AND jsonb_typeof(v_options) = 'array' THEN
    v_chosen_option := v_options->>p_selected_index;
  END IF;

  -- Verify correctness
  IF v_chosen_option IS NOT NULL AND v_correct_answer IS NOT NULL THEN
    IF TRIM(LOWER(v_chosen_option)) = TRIM(LOWER(v_correct_answer)) THEN
      v_is_correct := TRUE;
    END IF;
  END IF;

  -- Record attempt if user is authenticated or guest
  INSERT INTO public.mcq_attempts (
    user_id, 
    mcq_id, 
    exam_id, 
    subject_id, 
    topic_id, 
    subtopic_id, 
    selected_option, 
    selected_index, 
    is_correct
  )
  VALUES (
    p_user_id, 
    p_mcq_id, 
    v_mcq.exam_id, 
    v_mcq.subject_id, 
    v_mcq.topic_id, 
    v_mcq.subtopic_id, 
    v_chosen_option, 
    p_selected_index, 
    v_is_correct
  );

  RETURN jsonb_build_object(
    'success', true,
    'is_correct', v_is_correct,
    'correct_answer', v_correct_answer,
    'explanation', v_mcq.explanation,
    'step_by_step_explanation', v_mcq.step_by_step_explanation,
    'clinical_pearl', v_mcq.clinical_pearl
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
