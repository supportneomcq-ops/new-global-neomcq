-- NEOMCQ BATCH 033: CANONICAL AI TUTOR SCHEMA CONSOLIDATION
-- Consolidates tutor_lessons, tutor_scenes, tutor_assets, tutor_voice_metadata, tutor_faqs, tutor_faq_references, tutor_events, user_tutor_progress

CREATE TABLE IF NOT EXISTS public.tutor_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id VARCHAR(100) NOT NULL,
    subject_id VARCHAR(100) NOT NULL,
    topic_id VARCHAR(100) NOT NULL,
    subtopic_id VARCHAR(100),
    content_version INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    subtitle TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    total_scenes INTEGER NOT NULL DEFAULT 0,
    difficulty_level VARCHAR(50) NOT NULL DEFAULT 'INTERMEDIATE',
    thumbnail_url TEXT,
    lesson_state VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED',
    canonical_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tutor_lesson_scope UNIQUE (exam_id, subject_id, topic_id, subtopic_id, content_version)
);

CREATE INDEX IF NOT EXISTS idx_tutor_lessons_scope ON public.tutor_lessons (exam_id, subject_id, topic_id, subtopic_id);
CREATE INDEX IF NOT EXISTS idx_tutor_lessons_state ON public.tutor_lessons (lesson_state);

CREATE TABLE IF NOT EXISTS public.tutor_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.tutor_lessons(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    phase VARCHAR(50) NOT NULL,
    start_seconds NUMERIC(8,2) NOT NULL DEFAULT 0.0,
    duration_seconds NUMERIC(8,2) NOT NULL DEFAULT 0.0,
    narration_script TEXT NOT NULL,
    timed_cues JSONB NOT NULL DEFAULT '[]'::jsonb,
    board_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    accent_color VARCHAR(50) DEFAULT '#0284c7',
    key_bullets JSONB NOT NULL DEFAULT '[]'::jsonb,
    exam_relevance TEXT,
    clinical_pearls JSONB NOT NULL DEFAULT '[]'::jsonb,
    media_asset_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tutor_scene_sequence UNIQUE (lesson_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_tutor_scenes_lesson ON public.tutor_scenes (lesson_id, sequence_number);

CREATE TABLE IF NOT EXISTS public.tutor_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.tutor_lessons(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES public.tutor_scenes(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL,
    source_url TEXT NOT NULL,
    alt_text TEXT,
    caption TEXT,
    position_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_safe_rendering BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(50) NOT NULL DEFAULT 'READY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_assets_lesson ON public.tutor_assets (lesson_id);
CREATE INDEX IF NOT EXISTS idx_tutor_assets_scene ON public.tutor_assets (scene_id);
CREATE INDEX IF NOT EXISTS idx_tutor_assets_status ON public.tutor_assets (status);

CREATE TABLE IF NOT EXISTS public.tutor_voice_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.tutor_lessons(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES public.tutor_scenes(id) ON DELETE CASCADE,
    voice_id VARCHAR(100) NOT NULL,
    language_code VARCHAR(20) NOT NULL DEFAULT 'en-US',
    speaking_rate NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    audio_url TEXT NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    word_level_timestamps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_voice_scene ON public.tutor_voice_metadata (scene_id);

CREATE TABLE IF NOT EXISTS public.tutor_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id VARCHAR(100) NOT NULL,
    subject_id VARCHAR(100) NOT NULL,
    topic_id VARCHAR(100) NOT NULL,
    subtopic_id VARCHAR(100),
    question TEXT NOT NULL,
    question_hash VARCHAR(64) NOT NULL,
    answer TEXT NOT NULL,
    confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0.95,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    lesson_id UUID REFERENCES public.tutor_lessons(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tutor_faq_hash UNIQUE (exam_id, subject_id, topic_id, question_hash)
);

CREATE INDEX IF NOT EXISTS idx_tutor_faqs_scope ON public.tutor_faqs (exam_id, subject_id, topic_id);

CREATE TABLE IF NOT EXISTS public.tutor_faq_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faq_id UUID NOT NULL REFERENCES public.tutor_faqs(id) ON DELETE CASCADE,
    source_title TEXT NOT NULL,
    source_type VARCHAR(50) NOT NULL DEFAULT 'CURRICULUM_STANDARD',
    page_number INTEGER,
    url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_tutor_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.tutor_lessons(id) ON DELETE CASCADE,
    last_scene_sequence INTEGER NOT NULL DEFAULT 1,
    playback_position_seconds NUMERIC(8,2) NOT NULL DEFAULT 0.0,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
    checkpoints_passed JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_studied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_tutor_lesson UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tutor_progress_user ON public.user_tutor_progress (user_id, last_studied_at DESC);

CREATE TABLE IF NOT EXISTS public.tutor_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.tutor_lessons(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES public.tutor_scenes(id) ON DELETE SET NULL,
    faq_id UUID REFERENCES public.tutor_faqs(id) ON DELETE SET NULL,
    exam_id VARCHAR(100) NOT NULL,
    subject_id VARCHAR(100) NOT NULL,
    topic_id VARCHAR(100) NOT NULL,
    subtopic_id VARCHAR(100),
    event_type VARCHAR(100) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_events_user_created ON public.tutor_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_events_lesson_timestamp ON public.tutor_events (lesson_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_events_type_created ON public.tutor_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_events_scope ON public.tutor_events (exam_id, subject_id, topic_id, COALESCE(subtopic_id, ''));
CREATE INDEX IF NOT EXISTS idx_tutor_events_analytics_created_scope ON public.tutor_events (created_at DESC, exam_id, subject_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_tutor_events_type_scope ON public.tutor_events (event_type, exam_id, subject_id, topic_id);

-- Enable RLS and idempotent policies
ALTER TABLE public.tutor_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_voice_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_faq_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tutor_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tutor_lessons' AND policyname = 'Public read canonical tutor_lessons') THEN
    CREATE POLICY "Public read canonical tutor_lessons" ON public.tutor_lessons FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tutor_scenes' AND policyname = 'Public read canonical tutor_scenes') THEN
    CREATE POLICY "Public read canonical tutor_scenes" ON public.tutor_scenes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tutor_assets' AND policyname = 'Public read canonical tutor_assets') THEN
    CREATE POLICY "Public read canonical tutor_assets" ON public.tutor_assets FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tutor_voice_metadata' AND policyname = 'Public read canonical tutor_voice_metadata') THEN
    CREATE POLICY "Public read canonical tutor_voice_metadata" ON public.tutor_voice_metadata FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tutor_faqs' AND policyname = 'Public read canonical tutor_faqs') THEN
    CREATE POLICY "Public read canonical tutor_faqs" ON public.tutor_faqs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tutor_faq_references' AND policyname = 'Public read canonical tutor_faq_references') THEN
    CREATE POLICY "Public read canonical tutor_faq_references" ON public.tutor_faq_references FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_tutor_progress' AND policyname = 'Users insert own tutor progress') THEN
    CREATE POLICY "Users insert own tutor progress" ON public.user_tutor_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_tutor_progress' AND policyname = 'Users read own tutor progress') THEN
    CREATE POLICY "Users read own tutor progress" ON public.user_tutor_progress FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_tutor_progress' AND policyname = 'Users update own tutor progress') THEN
    CREATE POLICY "Users update own tutor progress" ON public.user_tutor_progress FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tutor_events' AND policyname = 'Users insert own tutor events') THEN
    CREATE POLICY "Users insert own tutor events" ON public.tutor_events FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tutor_events' AND policyname = 'Users read own tutor events') THEN
    CREATE POLICY "Users read own tutor events" ON public.tutor_events FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
