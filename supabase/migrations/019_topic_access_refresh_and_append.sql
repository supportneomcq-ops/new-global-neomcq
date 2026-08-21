-- =====================================================================
-- 019. TOPIC ACCESS TRACKING, 15-DAY REFRESH & APPEND-ONLY PERSISTENCE
-- =====================================================================

-- 1. Topic Content State Table (Tracks 15-Day Refresh & Content Versions)
CREATE TABLE IF NOT EXISTS public.topic_content_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_refreshed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  next_refresh_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 days') NOT NULL,
  refresh_status TEXT CHECK (refresh_status IN ('idle', 'in_progress', 'completed', 'failed')) DEFAULT 'idle' NOT NULL,
  refresh_job_id TEXT,
  content_version INTEGER DEFAULT 1 NOT NULL,
  total_mcq_count INTEGER DEFAULT 0 NOT NULL,
  total_notes_count INTEGER DEFAULT 0 NOT NULL,
  total_flashcards_count INTEGER DEFAULT 0 NOT NULL,
  recent_added_mcqs INTEGER DEFAULT 0 NOT NULL,
  recent_added_notes INTEGER DEFAULT 0 NOT NULL,
  recent_added_flashcards INTEGER DEFAULT 0 NOT NULL,
  last_refresh_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_topic_content_state UNIQUE (exam_id, subject_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_content_state_topic ON public.topic_content_state(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_content_state_exam ON public.topic_content_state(exam_id);
CREATE INDEX IF NOT EXISTS idx_topic_content_state_refresh ON public.topic_content_state(next_refresh_at, refresh_status);

-- 2. User Topic Access Table (Tracks user study history & frequency)
CREATE TABLE IF NOT EXISTS public.user_topic_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  access_count INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_user_topic_access UNIQUE (user_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_topic_access_user ON public.user_topic_access(user_id, last_accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_topic_access_topic ON public.user_topic_access(topic_id);

-- 3. Topic Requests Table (When a user requests a topic under their active exam)
CREATE TABLE IF NOT EXISTS public.topic_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE NOT NULL,
  requested_topic_name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'created', 'rejected')) DEFAULT 'pending' NOT NULL,
  created_topic_id UUID REFERENCES public.exam_topics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topic_requests_user ON public.topic_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_requests_exam ON public.topic_requests(exam_id);

-- 4. User Sticky Notes Table (Strictly isolated per user; NEVER modified during content refresh)
CREATE TABLE IF NOT EXISTS public.user_sticky_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  color TEXT DEFAULT 'amber' NOT NULL,
  pinned BOOLEAN DEFAULT FALSE NOT NULL,
  size TEXT DEFAULT 'md' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sticky_notes_user_topic ON public.user_sticky_notes(user_id, topic_id);

-- 5. Topic Refresh Audit Runs Table
CREATE TABLE IF NOT EXISTS public.topic_refresh_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
  trigger_type TEXT DEFAULT 'access_15_days' NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'partial')) DEFAULT 'running' NOT NULL,
  old_mcq_count INTEGER DEFAULT 0 NOT NULL,
  new_mcqs_added INTEGER DEFAULT 0 NOT NULL,
  duplicates_filtered INTEGER DEFAULT 0 NOT NULL,
  notes_appended BOOLEAN DEFAULT FALSE NOT NULL,
  error_message TEXT,
  model_used TEXT DEFAULT 'gemini-3.7-flash' NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topic_refresh_runs_topic ON public.topic_refresh_runs(topic_id, started_at DESC);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.topic_content_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sticky_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_refresh_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public can read topic content state" ON public.topic_content_state;
CREATE POLICY "Public can read topic content state" ON public.topic_content_state
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Service role manages topic content state" ON public.topic_content_state;
CREATE POLICY "Service role manages topic content state" ON public.topic_content_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own topic access" ON public.user_topic_access;
CREATE POLICY "Users can read own topic access" ON public.user_topic_access
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own topic access" ON public.user_topic_access;
CREATE POLICY "Users can insert own topic access" ON public.user_topic_access
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own sticky notes" ON public.user_sticky_notes;
CREATE POLICY "Users can manage own sticky notes" ON public.user_sticky_notes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own topic requests" ON public.topic_requests;
CREATE POLICY "Users can manage own topic requests" ON public.topic_requests
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage topic requests" ON public.topic_requests;
CREATE POLICY "Admins manage topic requests" ON public.topic_requests
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public can read topic refresh runs" ON public.topic_refresh_runs;
CREATE POLICY "Public can read topic refresh runs" ON public.topic_refresh_runs
  FOR SELECT TO authenticated, anon USING (true);

-- 7. ATOMIC REFRESH LOCK ACQUISITION RPC
CREATE OR REPLACE FUNCTION public.acquire_topic_refresh_lock(
  p_exam_id UUID,
  p_subject_id UUID,
  p_topic_id UUID,
  p_job_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state RECORD;
  v_is_eligible BOOLEAN := FALSE;
BEGIN
  -- Check existing state or insert initial state
  SELECT * INTO v_state
  FROM public.topic_content_state
  WHERE topic_id = p_topic_id
  FOR UPDATE;

  IF v_state.id IS NULL THEN
    -- First time tracked: insert and grant lock
    INSERT INTO public.topic_content_state (
      exam_id, subject_id, topic_id, last_accessed_at, last_refreshed_at,
      next_refresh_at, refresh_status, refresh_job_id
    ) VALUES (
      p_exam_id, p_subject_id, p_topic_id, NOW(), NOW() - INTERVAL '16 days',
      NOW(), 'in_progress', p_job_id
    );
    RETURN TRUE;
  END IF;

  -- Check if 15 days have elapsed and no active job is running
  IF (v_state.refresh_status != 'in_progress' OR v_state.updated_at < NOW() - INTERVAL '15 minutes')
     AND (v_state.last_refreshed_at IS NULL OR NOW() >= v_state.last_refreshed_at + INTERVAL '15 days' OR NOW() >= v_state.next_refresh_at) THEN
    
    UPDATE public.topic_content_state
    SET refresh_status = 'in_progress',
        refresh_job_id = p_job_id,
        last_accessed_at = NOW(),
        updated_at = NOW()
    WHERE topic_id = p_topic_id;
    
    RETURN TRUE;
  END IF;

  -- Just update last_accessed_at
  UPDATE public.topic_content_state
  SET last_accessed_at = NOW(),
      updated_at = NOW()
  WHERE topic_id = p_topic_id;

  RETURN FALSE;
END;
$$;
