-- Migration 006: User Preferences, Study Plans & Sessions

CREATE TABLE IF NOT EXISTS public.study_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  daily_hours NUMERIC(3,1) DEFAULT 2.0 NOT NULL,
  preferred_time TEXT CHECK (preferred_time IN ('morning', 'afternoon', 'evening', 'night')) DEFAULT 'morning' NOT NULL,
  learning_mode TEXT CHECK (learning_mode IN ('rapid', 'balanced', 'mastery')) DEFAULT 'balanced' NOT NULL,
  reminders_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  language_id UUID REFERENCES public.languages(id) ON DELETE SET NULL,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.study_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  plan_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  duration_mins INTEGER DEFAULT 0 NOT NULL,
  score_percentage NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
  questions_answered INTEGER DEFAULT 0 NOT NULL,
  correct_answers INTEGER DEFAULT 0 NOT NULL,
  mode TEXT DEFAULT 'practice' NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL, -- 'question', 'topic', 'note'
  item_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  email_digest BOOLEAN DEFAULT TRUE NOT NULL,
  streak_reminders BOOLEAN DEFAULT TRUE NOT NULL,
  exam_updates BOOLEAN DEFAULT TRUE NOT NULL,
  marketing_emails BOOLEAN DEFAULT FALSE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
