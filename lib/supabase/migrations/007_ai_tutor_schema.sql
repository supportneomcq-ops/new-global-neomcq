-- ====================================================================
-- NEOMCQ FEATURE 7: AI TUTOR SCHEMA & ARCHITECTURE (BATCH 7.1)
-- ====================================================================
-- Provides canonical, reusable AI Tutor lessons, scenes, whiteboard actions,
-- assets, voice metadata, canonical FAQs, and user tutor progress.
-- NO automatic 30-day expiration constraint on canonical tutor lessons.
-- ====================================================================

-- 1. CANONICAL TUTOR LESSONS TABLE
CREATE TABLE IF NOT EXISTS public.tutor_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id VARCHAR(100) NOT NULL,
    subject_id VARCHAR(100) NOT NULL,
    topic_id VARCHAR(100) NOT NULL,
    subtopic_id VARCHAR(100),
    content_version INT NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    subtitle TEXT,
    duration_seconds INT NOT NULL DEFAULT 0,
    total_scenes INT NOT NULL DEFAULT 0,
    difficulty_level VARCHAR(50) DEFAULT 'Intermediate',
    thumbnail_url TEXT,
    lesson_state VARCHAR(50) NOT NULL DEFAULT 'READY',
    canonical_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint ensuring exact 1 canonical lesson per Exam -> Subject -> Topic -> Subtopic scope
CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_lessons_canonical_scope 
ON public.tutor_lessons (exam_id, subject_id, topic_id, COALESCE(subtopic_id, ''), content_version);

CREATE INDEX IF NOT EXISTS idx_tutor_lessons_topic ON public.tutor_lessons (topic_id);
CREATE INDEX IF NOT EXISTS idx_tutor_lessons_exam ON public.tutor_lessons (exam_id);


-- 2. TUTOR SCENES TABLE
CREATE TABLE IF NOT EXISTS public.tutor_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.tutor_lessons(id) ON DELETE CASCADE,
    sequence_number INT NOT NULL,
    title TEXT NOT NULL,
    phase VARCHAR(100) NOT NULL DEFAULT 'CORE_CONCEPT',
    start_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    duration_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    narration_script TEXT NOT NULL,
    timed_cues JSONB NOT NULL DEFAULT '[]'::jsonb,
    board_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    accent_color VARCHAR(50) DEFAULT 'indigo',
    key_bullets JSONB NOT NULL DEFAULT '[]'::jsonb,
    exam_relevance TEXT DEFAULT 'High Yield',
    clinical_pearls JSONB DEFAULT '[]'::jsonb,
    media_asset_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_scenes_lesson_seq 
ON public.tutor_scenes (lesson_id, sequence_number);


-- 3. TUTOR ASSETS TABLE (Images, Diagrams, Formulas, Tables)
CREATE TABLE IF NOT EXISTS public.tutor_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.tutor_lessons(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES public.tutor_scenes(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL DEFAULT 'IMAGE',
    source_url TEXT NOT NULL,
    alt_text TEXT NOT NULL,
    caption TEXT,
    position_metadata JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "margin": 16}'::jsonb,
    is_safe_rendering BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_assets_lesson ON public.tutor_assets (lesson_id);


-- 4. TUTOR VOICE METADATA TABLE
CREATE TABLE IF NOT EXISTS public.tutor_voice_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.tutor_lessons(id) ON DELETE CASCADE,
    scene_id UUID NOT NULL REFERENCES public.tutor_scenes(id) ON DELETE CASCADE,
    voice_id VARCHAR(100) NOT NULL DEFAULT 'en-US-Neural2-F',
    language_code VARCHAR(20) NOT NULL DEFAULT 'en-US',
    speaking_rate NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
    audio_url TEXT,
    duration_ms INT NOT NULL DEFAULT 0,
    word_level_timestamps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_voice_scene 
ON public.tutor_voice_metadata (lesson_id, scene_id);


-- 5. CANONICAL FAQS TABLE
CREATE TABLE IF NOT EXISTS public.tutor_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id VARCHAR(100) NOT NULL,
    subject_id VARCHAR(100) NOT NULL,
    topic_id VARCHAR(100) NOT NULL,
    subtopic_id VARCHAR(100),
    question TEXT NOT NULL,
    question_hash VARCHAR(64) NOT NULL,
    answer TEXT NOT NULL,
    confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 0.95,
    helpful_count INT NOT NULL DEFAULT 0,
    lesson_id UUID REFERENCES public.tutor_lessons(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_faqs_hash 
ON public.tutor_faqs (exam_id, subject_id, topic_id, COALESCE(subtopic_id, ''), question_hash);

CREATE INDEX IF NOT EXISTS idx_tutor_faqs_topic ON public.tutor_faqs (topic_id);


-- 6. FAQ REFERENCES / RELATIONSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.tutor_faq_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faq_id UUID NOT NULL REFERENCES public.tutor_faqs(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.tutor_lessons(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES public.tutor_scenes(id) ON DELETE CASCADE,
    relevance_score NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_faq_ref_lesson ON public.tutor_faq_references (lesson_id);


-- 7. USER TUTOR PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.user_tutor_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.tutor_lessons(id) ON DELETE CASCADE,
    last_scene_sequence INT NOT NULL DEFAULT 1,
    playback_position_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
    checkpoints_passed JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_studied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tutor_progress_user_lesson 
ON public.user_tutor_progress (user_id, lesson_id);


-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.tutor_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_voice_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_faq_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tutor_progress ENABLE ROW LEVEL SECURITY;

-- Read policies for canonical learning assets (Public & Authenticated users)
CREATE POLICY "Public read canonical tutor_lessons" 
ON public.tutor_lessons FOR SELECT USING (true);

CREATE POLICY "Public read canonical tutor_scenes" 
ON public.tutor_scenes FOR SELECT USING (true);

CREATE POLICY "Public read canonical tutor_assets" 
ON public.tutor_assets FOR SELECT USING (true);

CREATE POLICY "Public read canonical tutor_voice_metadata" 
ON public.tutor_voice_metadata FOR SELECT USING (true);

CREATE POLICY "Public read canonical tutor_faqs" 
ON public.tutor_faqs FOR SELECT USING (true);

CREATE POLICY "Public read canonical tutor_faq_references" 
ON public.tutor_faq_references FOR SELECT USING (true);

-- User Progress RLS Policies (User isolated)
CREATE POLICY "Users read own tutor progress" 
ON public.user_tutor_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own tutor progress" 
ON public.user_tutor_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own tutor progress" 
ON public.user_tutor_progress FOR UPDATE 
USING (auth.uid() = user_id);
