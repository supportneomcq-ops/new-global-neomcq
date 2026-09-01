-- =====================================================================
-- 027_active_recall_system.sql
-- Active Recall Fill-in-the-Blanks Engine - Database Infrastructure & Persistence
-- =====================================================================

-- 1. Active Recall Attempts Table
CREATE TABLE IF NOT EXISTS public.active_recall_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    recall_item_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    is_revealed BOOLEAN NOT NULL DEFAULT false,
    response_time_ms INTEGER DEFAULT 0,
    review_due_at TIMESTAMPTZ,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_recall_user_topic ON public.active_recall_attempts(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_active_recall_session ON public.active_recall_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_active_recall_user_due ON public.active_recall_attempts(user_id, review_due_at);
CREATE INDEX IF NOT EXISTS idx_active_recall_attempted_at ON public.active_recall_attempts(attempted_at DESC);

-- 2. Active Recall Sessions Table
CREATE TABLE IF NOT EXISTS public.active_recall_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
    subtopic_id UUID REFERENCES public.exam_subtopics(id) ON DELETE SET NULL,
    version_id UUID REFERENCES public.content_versions(id) ON DELETE SET NULL,
    total_items INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    revealed_count INTEGER NOT NULL DEFAULT 0,
    reviewed_count INTEGER NOT NULL DEFAULT 0,
    accuracy NUMERIC(5,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed'
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_recall_sessions_user ON public.active_recall_sessions(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_active_recall_sessions_status ON public.active_recall_sessions(status);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.active_recall_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_recall_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own recall attempts" ON public.active_recall_attempts;
CREATE POLICY "Users can read their own recall attempts" 
    ON public.active_recall_attempts FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recall attempts" ON public.active_recall_attempts;
CREATE POLICY "Users can insert their own recall attempts" 
    ON public.active_recall_attempts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read their own recall sessions" ON public.active_recall_sessions;
CREATE POLICY "Users can read their own recall sessions" 
    ON public.active_recall_sessions FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert/update their own recall sessions" ON public.active_recall_sessions;
CREATE POLICY "Users can insert/update their own recall sessions" 
    ON public.active_recall_sessions FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
