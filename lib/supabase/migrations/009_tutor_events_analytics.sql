-- NEOMCQ BATCH 7.8: TUTOR LEARNING ANALYTICS & ENGAGEMENT TRACKING
-- Provides non-blocking event logging for student engagement, scope progress, and doubt interactions.

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

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tutor_events_user_created 
ON public.tutor_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tutor_events_lesson_timestamp 
ON public.tutor_events (lesson_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_tutor_events_type_created 
ON public.tutor_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tutor_events_scope 
ON public.tutor_events (exam_id, subject_id, topic_id, COALESCE(subtopic_id, ''));

-- Row Level Security (RLS)
ALTER TABLE public.tutor_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own tutor events" 
ON public.tutor_events FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own tutor events" 
ON public.tutor_events FOR SELECT 
USING (auth.uid() = user_id);
