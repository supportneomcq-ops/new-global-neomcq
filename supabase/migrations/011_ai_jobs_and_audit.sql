-- =====================================================================
-- 011. AI GENERATION JOBS, CACHE & AUDIT LOGS
-- =====================================================================

-- 1. AI Generation Jobs Table
CREATE TABLE IF NOT EXISTS public.ai_generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  job_type TEXT NOT NULL, -- e.g. 'study_plan', 'question_bank', 'summary_notes', 'mock_exam'
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending' NOT NULL,
  input_params JSONB DEFAULT '{}'::jsonb NOT NULL,
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id ON public.ai_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON public.ai_generation_jobs(status);

DROP TRIGGER IF EXISTS trigger_ai_jobs_updated_at ON public.ai_generation_jobs;
CREATE TRIGGER trigger_ai_jobs_updated_at
  BEFORE UPDATE ON public.ai_generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2. AI Content Cache Table
CREATE TABLE IF NOT EXISTS public.ai_content_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON public.ai_content_cache(cache_key);

-- 3. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 4. Automatic Study Preferences Trigger on Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_profile_study_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.study_preferences (user_id, daily_hours, preferred_time, learning_mode, reminders_enabled)
  VALUES (NEW.id, 2.0, 'morning', 'balanced', true)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Record audit log event for new profile
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (NEW.id, 'USER_REGISTERED', 'profiles', NEW.id::text, jsonb_build_object('email', NEW.email));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_study_prefs ON public.profiles;
CREATE TRIGGER on_profile_created_study_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_study_prefs();

-- 5. Audit Logger Helper Function
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enable RLS on New Tables
ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_content_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Users manage own AI jobs" ON public.ai_generation_jobs;
CREATE POLICY "Users manage own AI jobs" ON public.ai_generation_jobs 
  FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users read AI cache" ON public.ai_content_cache;
CREATE POLICY "Authenticated users read AI cache" ON public.ai_content_cache 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users read own audit logs" ON public.audit_logs;
CREATE POLICY "Users read own audit logs" ON public.audit_logs 
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
