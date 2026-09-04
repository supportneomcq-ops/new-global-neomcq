-- ============================================================================
-- NEOMCQ MIGRATION 031: PRODUCTION SCHEMA RECONCILIATION & POSTGREST CACHE RELOAD
-- Reconciles missing columns across user_sticky_notes, ai_tutor_lessons, active_recall, and curriculum tables
-- ============================================================================

-- 1. RECONCILE USER_STICKY_NOTES
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


-- 2. RECONCILE AI_TUTOR_LESSONS
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
    difficulty TEXT DEFAULT 'High-Yield Board Level',
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

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'difficulty_level') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN difficulty_level TEXT DEFAULT 'High-Yield Board Level';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_tutor_lessons' AND column_name = 'difficulty') THEN
        ALTER TABLE public.ai_tutor_lessons ADD COLUMN difficulty TEXT DEFAULT 'High-Yield Board Level';
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


-- 3. RECONCILE ACTIVE_RECALL_BATCHES
CREATE TABLE IF NOT EXISTS public.active_recall_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    title TEXT DEFAULT 'Active Recall Practice Set' NOT NULL,
    version INT DEFAULT 1 NOT NULL,
    difficulty TEXT DEFAULT 'High Yield',
    completion_percentage NUMERIC(5,2) DEFAULT 0.0,
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
