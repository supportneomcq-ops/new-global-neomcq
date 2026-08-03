-- Migration 005: Exam Structure

CREATE TABLE IF NOT EXISTS public.exam_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.exam_categories(id) ON DELETE SET NULL,
  country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Expert', 'Adaptive')) DEFAULT 'Adaptive',
  question_count INTEGER DEFAULT 100 NOT NULL,
  time_limit_mins INTEGER DEFAULT 120 NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE NOT NULL,
  created_by_ai BOOLEAN DEFAULT FALSE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'active', 'archived')) DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exams_slug ON public.exams(slug);
CREATE INDEX IF NOT EXISTS idx_exams_category_id ON public.exams(category_id);
CREATE INDEX IF NOT EXISTS idx_exams_country_id ON public.exams(country_id);

CREATE TABLE IF NOT EXISTS public.exam_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  weight_percentage NUMERIC(5,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exam_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  target_date DATE,
  target_score NUMERIC(5,2) DEFAULT 80.00,
  status TEXT CHECK (status IN ('in_progress', 'completed', 'paused')) DEFAULT 'in_progress' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, exam_id)
);

CREATE INDEX IF NOT EXISTS idx_user_exams_user_id ON public.user_exams(user_id);
