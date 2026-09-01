-- =====================================================================
-- NEOMCQ.COM — COMPLETE PRODUCTION BACKEND MIGRATION SCRIPT
-- =====================================================================
-- Copy and paste this ENTIRE script into your Supabase Dashboard:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste -> Click RUN
-- =====================================================================

-- ---------------------------------------------------------------------
-- 001. EXTENSIONS
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------
-- 002. AUTH PROFILES & TRIGGERS
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  country_id UUID,
  timezone TEXT DEFAULT 'UTC',
  avatar_url TEXT,
  language_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, auth_user_id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Get canonical 'user' role ID
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'user';

  -- Explicitly assign default user role
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, v_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 003. ROLE-BASED ACCESS CONTROL (RBAC)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

CREATE OR REPLACE FUNCTION public.has_permission(p_user_id UUID, p_permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_perm BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id AND p.name = p_permission_name
  ) INTO v_has_perm;
  
  RETURN v_has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id AND r.name IN ('super_admin', 'admin')
  ) INTO v_is_admin;
  
  RETURN v_is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 004. INTERNATIONALIZATION
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.languages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  native_name TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.timezones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  utc_offset TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  iso2 CHAR(2) UNIQUE NOT NULL,
  iso3 CHAR(3) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone_code TEXT NOT NULL,
  flag_emoji TEXT,
  currency_code TEXT,
  default_timezone TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_countries_name_trgm ON public.countries USING gin (name gin_trgm_ops);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_profiles_country'
  ) THEN
    ALTER TABLE public.profiles 
      ADD CONSTRAINT fk_profiles_country 
      FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_profiles_language'
  ) THEN
    ALTER TABLE public.profiles 
      ADD CONSTRAINT fk_profiles_language 
      FOREIGN KEY (language_id) REFERENCES public.languages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 005. EXAM CATALOG STRUCTURE
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 006. USER PREFERENCES, STUDY PLANS & SESSIONS
-- ---------------------------------------------------------------------
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
  item_type TEXT NOT NULL,
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

-- ---------------------------------------------------------------------
-- 007. SUBSCRIPTIONS & PAYMENTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_inr NUMERIC(10,2) NOT NULL,
  price_usd NUMERIC(10,2) NOT NULL,
  billing_interval TEXT CHECK (billing_interval IN ('monthly', 'quarterly', 'yearly', 'lifetime')) DEFAULT 'monthly' NOT NULL,
  features JSONB DEFAULT '[]'::jsonb NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE RESTRICT NOT NULL,
  razorpay_subscription_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('active', 'past_due', 'canceled', 'expired', 'trialing')) DEFAULT 'active' NOT NULL,
  current_period_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR' NOT NULL,
  status TEXT CHECK (status IN ('created', 'authorized', 'captured', 'refunded', 'failed')) DEFAULT 'created' NOT NULL,
  webhook_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(razorpay_order_id);

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  max_redemptions INTEGER DEFAULT 100,
  redemptions_count INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(coupon_id, user_id)
);

-- ---------------------------------------------------------------------
-- 008. STORAGE BUCKETS
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('notes', 'notes', false, 20971520, ARRAY['application/pdf', 'text/plain', 'text/markdown', 'image/jpeg', 'image/png']),
  ('ai-images', 'ai-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('tutor-videos', 'tutor-videos', false, 524288000, ARRAY['video/mp4', 'video/webm']),
  ('exports', 'exports', false, 104857600, ARRAY['application/json', 'application/pdf', 'text/csv'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 009. ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timezones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public read countries" ON public.countries;
CREATE POLICY "Public read countries" ON public.countries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read languages" ON public.languages;
CREATE POLICY "Public read languages" ON public.languages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read currencies" ON public.currencies;
CREATE POLICY "Public read currencies" ON public.currencies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read timezones" ON public.timezones;
CREATE POLICY "Public read timezones" ON public.timezones FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active categories" ON public.exam_categories;
CREATE POLICY "Public read active categories" ON public.exam_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active exams" ON public.exams;
CREATE POLICY "Public read active exams" ON public.exams FOR SELECT USING (status = 'active' OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read subjects" ON public.exam_subjects;
CREATE POLICY "Public read subjects" ON public.exam_subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read topics" ON public.exam_topics;
CREATE POLICY "Public read topics" ON public.exam_topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users read own exam enrollments" ON public.user_exams;
CREATE POLICY "Users read own exam enrollments" ON public.user_exams FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own exam enrollments" ON public.user_exams;
CREATE POLICY "Users insert own exam enrollments" ON public.user_exams FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own exam enrollments" ON public.user_exams;
CREATE POLICY "Users update own exam enrollments" ON public.user_exams FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own exam enrollments" ON public.user_exams;
CREATE POLICY "Users delete own exam enrollments" ON public.user_exams FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own study preferences" ON public.study_preferences;
CREATE POLICY "Users manage own study preferences" ON public.study_preferences FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own study plans" ON public.study_plans;
CREATE POLICY "Users manage own study plans" ON public.study_plans FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own study sessions" ON public.study_sessions;
CREATE POLICY "Users manage own study sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read subscription plans" ON public.subscription_plans;
CREATE POLICY "Public read subscription plans" ON public.subscription_plans FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 010. SEED REFERENCE DATA
-- ---------------------------------------------------------------------
INSERT INTO public.roles (name, description) VALUES
  ('super_admin', 'Full system access and database administrative privileges'),
  ('admin', 'Content creation, user management, and analytics viewing'),
  ('support', 'Customer support access and user query resolution'),
  ('user', 'Standard student or subscriber user role')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.languages (code, name, native_name) VALUES
  ('en', 'English', 'English'),
  ('es', 'Spanish', 'Español'),
  ('fr', 'French', 'Français'),
  ('hi', 'Hindi', 'हिन्दी'),
  ('de', 'German', 'Deutsch')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.currencies (code, name, symbol) VALUES
  ('USD', 'US Dollar', '$'),
  ('INR', 'Indian Rupee', '₹'),
  ('EUR', 'Euro', '€'),
  ('GBP', 'British Pound', '£'),
  ('AUD', 'Australian Dollar', 'A$'),
  ('CAD', 'Canadian Dollar', 'C$')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.countries (iso2, iso3, name, phone_code, flag_emoji, currency_code, default_timezone) VALUES
  ('US', 'USA', 'United States', '+1', '🇺🇸', 'USD', 'America/New_York'),
  ('IN', 'IND', 'India', '+91', '🇮🇳', 'INR', 'Asia/Kolkata'),
  ('GB', 'GBR', 'United Kingdom', '+44', '🇬🇧', 'GBP', 'Europe/London'),
  ('CA', 'CAN', 'Canada', '+1', '🇨🇦', 'CAD', 'America/Toronto'),
  ('AU', 'AUS', 'Australia', '+61', '🇦🇺', 'AUD', 'Australia/Sydney'),
  ('DE', 'DEU', 'Germany', '+49', '🇩🇪', 'EUR', 'Europe/Berlin'),
  ('FR', 'FRA', 'France', '+33', '🇫🇷', 'EUR', 'Europe/Paris'),
  ('JP', 'JPN', 'Japan', '+81', '🇯🇵', 'USD', 'Asia/Tokyo'),
  ('SG', 'SGP', 'Singapore', '+65', '🇸🇬', 'USD', 'Asia/Singapore'),
  ('AE', 'ARE', 'United Arab Emirates', '+971', '🇦🇪', 'USD', 'Asia/Dubai')
ON CONFLICT (iso2) DO NOTHING;

INSERT INTO public.exam_categories (name, slug, description, icon_name) VALUES
  ('Medical & Healthcare', 'medical-healthcare', 'Global medical licensing, nursing boards, and clinical postgraduate exams', 'Stethoscope'),
  ('Engineering & Tech', 'engineering-tech', 'Software engineering, cloud architecture, and technical certifications', 'Cpu'),
  ('Civil Services & Govt', 'civil-services-govt', 'National administration, public service commissions, and defense exams', 'ShieldCheck'),
  ('Business & Finance', 'business-finance', 'Chartered accountancy, financial analysis, and graduate management admissions', 'TrendingUp'),
  ('Law & Legal', 'law-legal', 'Judicial services, bar examinations, and legal entrance tests', 'Scale')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  v_med_id UUID;
  v_tech_id UUID;
  v_govt_id UUID;
  v_fin_id UUID;
  v_us_id UUID;
  v_in_id UUID;
BEGIN
  SELECT id INTO v_med_id FROM public.exam_categories WHERE slug = 'medical-healthcare';
  SELECT id INTO v_tech_id FROM public.exam_categories WHERE slug = 'engineering-tech';
  SELECT id INTO v_govt_id FROM public.exam_categories WHERE slug = 'civil-services-govt';
  SELECT id INTO v_fin_id FROM public.exam_categories WHERE slug = 'business-finance';
  
  SELECT id INTO v_us_id FROM public.countries WHERE iso2 = 'US';
  SELECT id INTO v_in_id FROM public.countries WHERE iso2 = 'IN';

  INSERT INTO public.exams (category_id, country_id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured)
  VALUES (v_med_id, v_us_id, 'USMLE Step 1', 'usmle-step-1', 'United States Medical Licensing Examination assessing foundational clinical science concepts', 'Expert', 280, 420, true)
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.exams (category_id, country_id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured)
  VALUES (v_med_id, v_us_id, 'NCLEX-RN', 'nclex-rn', 'National Council Licensure Examination for Registered Nurses', 'Advanced', 145, 300, true)
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.exams (category_id, country_id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured)
  VALUES (v_govt_id, v_in_id, 'UPSC Civil Services (IAS/IPS)', 'upsc-civil-services', 'Premier Indian administrative examination for civil governance', 'Expert', 200, 240, true)
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.exams (category_id, country_id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured)
  VALUES (v_med_id, v_in_id, 'NEET PG Medical', 'neet-pg', 'National Eligibility cum Entrance Test for Postgraduate Medical Studies', 'Expert', 200, 210, true)
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.exams (category_id, country_id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured)
  VALUES (v_tech_id, v_us_id, 'AWS Certified Solutions Architect - Associate', 'aws-certified-solutions-architect', 'Industry benchmark cloud architecture validation exam', 'Intermediate', 65, 130, true)
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.exams (category_id, country_id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured)
  VALUES (v_fin_id, v_us_id, 'US CPA Certification', 'us-cpa-certification', 'Uniform Certified Public Accountant Examination', 'Advanced', 120, 240, true)
  ON CONFLICT (slug) DO NOTHING;
END $$;

INSERT INTO public.subscription_plans (name, slug, price_inr, price_usd, billing_interval, features, is_active) VALUES
  ('Monthly Pro Pass', 'monthly-pro-pass', 999.00, 14.99, 'monthly', '[
    "Unlimited Adaptive Q-Bank Access",
    "Real-Time AI Tutor & Step Explanations",
    "Custom Mock Exam Builder",
    "Performance Analytics & Weakness Heatmap"
  ]'::jsonb, true),
  ('Annual Ultra Pass', 'annual-ultra-pass', 6999.00, 99.99, 'yearly', '[
    "All Monthly Pro Pass Features",
    "Personalized Daily AI Study Schedule",
    "High-Yield Summary Cheat Sheets",
    "Priority AI Generation Queue",
    "Save 42% Compared to Monthly"
  ]'::jsonb, true),
  ('Global Lifetime Pass', 'global-lifetime-pass', 14999.00, 199.99, 'lifetime', '[
    "Lifetime Access to ALL Global Exams",
    "Unlimited AI Q-Bank Refresh & Expansion",
    "Dedicated High-Performance Support",
    "All Future Exam Updates & Additions Included"
  ]'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================================
-- SUCCESS! All NeoMCQ database tables, triggers, and seed data created.
-- =====================================================================

-- =====================================================================
-- 12. GLOBAL AI EXAM ENGINE SCHEMA & VERSIONING
-- =====================================================================

ALTER TABLE public.exams 
  ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC(5,2) DEFAULT 98.50,
  ADD COLUMN IF NOT EXISTS official_website TEXT,
  ADD COLUMN IF NOT EXISTS ai_version TEXT DEFAULT 'v3.5',
  ADD COLUMN IF NOT EXISTS prompt_version TEXT DEFAULT '2026-v1',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'AI Engine',
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('auto_approved', 'pending_review', 'approved', 'archived')) DEFAULT 'auto_approved';

CREATE TABLE IF NOT EXISTS public.exam_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(exam_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_exam_aliases_alias_lower ON public.exam_aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_exam_aliases_exam_id ON public.exam_aliases(exam_id);

ALTER TABLE public.exam_subjects
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS topic_count INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5,2) DEFAULT 98.00 NOT NULL,
  ADD COLUMN IF NOT EXISTS ai_version TEXT DEFAULT 'v3.5' NOT NULL;

ALTER TABLE public.exam_topics
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('topic', 'subtopic', 'concept')) DEFAULT 'topic' NOT NULL,
  ADD COLUMN IF NOT EXISTS target_weight NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5,2) DEFAULT 98.00 NOT NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}' NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exam_topics_parent_id ON public.exam_topics(parent_id);
CREATE INDEX IF NOT EXISTS idx_exam_topics_subject_id ON public.exam_topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_topics_level ON public.exam_topics(level);

CREATE TABLE IF NOT EXISTS public.ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE SET NULL,
    task TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'full_pack',
    target_version INT NOT NULL DEFAULT 1,
    idempotency_key TEXT,
    priority INT NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'queued',
    provider TEXT,
    model TEXT,
    input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload JSONB DEFAULT '{}'::jsonb,
    progress_stage TEXT DEFAULT 'Preparing canonical context...',
    step_percentage INT DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    heartbeat_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_code TEXT,
    error TEXT,
    provider_request_id TEXT,
    credits_reserved NUMERIC(10,4) NOT NULL DEFAULT 0,
    credits_consumed NUMERIC(10,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_jobs
  ADD COLUMN IF NOT EXISTS progress_stage TEXT DEFAULT 'Preparing your exam...',
  ADD COLUMN IF NOT EXISTS step_percentage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE OR REPLACE VIEW public.ai_generation_jobs AS SELECT * FROM public.ai_jobs;

ALTER TABLE public.exam_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to exam_aliases" ON public.exam_aliases;
CREATE POLICY "Public read access to exam_aliases" ON public.exam_aliases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write exam_aliases" ON public.exam_aliases;
CREATE POLICY "Authenticated users write exam_aliases" ON public.exam_aliases FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read access to exam_subjects" ON public.exam_subjects;
CREATE POLICY "Public read access to exam_subjects" ON public.exam_subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write exam_subjects" ON public.exam_subjects;
CREATE POLICY "Authenticated users write exam_subjects" ON public.exam_subjects FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read access to exam_topics" ON public.exam_topics;
CREATE POLICY "Public read access to exam_topics" ON public.exam_topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write exam_topics" ON public.exam_topics;
CREATE POLICY "Authenticated users write exam_topics" ON public.exam_topics FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================================
-- 13. AUTONOMOUS GLOBAL KNOWLEDGE ENGINE & LEARNING ASSET CACHE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.subject_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE CASCADE NOT NULL,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(subject_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_subject_aliases_alias_lower ON public.subject_aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_subject_aliases_subject_id ON public.subject_aliases(subject_id);

CREATE TABLE IF NOT EXISTS public.topic_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(topic_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_topic_aliases_alias_lower ON public.topic_aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_topic_aliases_topic_id ON public.topic_aliases(topic_id);

ALTER TABLE public.exam_subjects
  ADD COLUMN IF NOT EXISTS generation_timestamp TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS prompt_version TEXT DEFAULT '2026-v2',
  ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'gemini-3.6-flash',
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_status TEXT CHECK (validation_status IN ('auto_validated', 'pending_review', 'verified', 'archived')) DEFAULT 'auto_validated';

ALTER TABLE public.exam_topics
  ADD COLUMN IF NOT EXISTS generation_timestamp TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS prompt_version TEXT DEFAULT '2026-v2',
  ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'gemini-3.6-flash',
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_status TEXT CHECK (validation_status IN ('auto_validated', 'pending_review', 'verified', 'archived')) DEFAULT 'auto_validated',
  ADD COLUMN IF NOT EXISTS learning_objectives TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS estimated_study_mins INTEGER DEFAULT 45;

CREATE TABLE IF NOT EXISTS public.learning_content_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL,
  difficulty TEXT DEFAULT 'Intermediate' NOT NULL,
  language TEXT DEFAULT 'en' NOT NULL,
  payload JSONB NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  ai_confidence_score NUMERIC(5,2) DEFAULT 98.50 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,
  UNIQUE(topic_id, content_type, difficulty, language)
);

CREATE INDEX IF NOT EXISTS idx_learning_content_cache_topic ON public.learning_content_cache(topic_id, content_type);

ALTER TABLE public.subject_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_content_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to subject_aliases" ON public.subject_aliases;
CREATE POLICY "Public read access to subject_aliases" ON public.subject_aliases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write subject_aliases" ON public.subject_aliases;
CREATE POLICY "Authenticated users write subject_aliases" ON public.subject_aliases FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read access to topic_aliases" ON public.topic_aliases;
CREATE POLICY "Public read access to topic_aliases" ON public.topic_aliases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write topic_aliases" ON public.topic_aliases;
CREATE POLICY "Authenticated users write topic_aliases" ON public.topic_aliases FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read access to learning_content_cache" ON public.learning_content_cache;
CREATE POLICY "Public read access to learning_content_cache" ON public.learning_content_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write learning_content_cache" ON public.learning_content_cache;
CREATE POLICY "Authenticated users write learning_content_cache" ON public.learning_content_cache FOR ALL USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- 014. SYLLABI & EXAM STRUCTURES & ENHANCED ALIASES
-- ---------------------------------------------------------------------
ALTER TABLE public.exam_aliases
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Manual',
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,2) DEFAULT 98.00,
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('approved', 'pending', 'rejected', 'disabled')) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

ALTER TABLE public.subject_aliases
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Manual',
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,2) DEFAULT 98.00,
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('approved', 'pending', 'rejected', 'disabled')) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

ALTER TABLE public.topic_aliases
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Manual',
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,2) DEFAULT 98.00,
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('approved', 'pending', 'rejected', 'disabled')) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.syllabi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  version TEXT DEFAULT '1.0' NOT NULL,
  source TEXT DEFAULT 'Official Board',
  status TEXT CHECK (status IN ('draft', 'published', 'archived', 'unpublished')) DEFAULT 'draft' NOT NULL,
  data JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_syllabi_exam_id ON public.syllabi(exam_id);

CREATE TABLE IF NOT EXISTS public.exam_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  version TEXT DEFAULT '1.0' NOT NULL,
  status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft' NOT NULL,
  sections JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_structures_exam_id ON public.exam_structures(exam_id);

ALTER TABLE public.syllabi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_structures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to syllabi" ON public.syllabi;
CREATE POLICY "Public read access to syllabi" ON public.syllabi FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write syllabi" ON public.syllabi;
CREATE POLICY "Authenticated users write syllabi" ON public.syllabi FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read access to exam_structures" ON public.exam_structures;
CREATE POLICY "Public read access to exam_structures" ON public.exam_structures FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users write exam_structures" ON public.exam_structures;
CREATE POLICY "Authenticated users write exam_structures" ON public.exam_structures FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================================
-- 018. EXAM LOCK & PAID EXAM SWITCH ($2 USD) ARCHITECTURE
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exam_locked BOOLEAN DEFAULT TRUE NOT NULL,
  ADD COLUMN IF NOT EXISTS exam_selected_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS exam_switch_count INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_current_exam_id ON public.profiles(current_exam_id);

CREATE TABLE IF NOT EXISTS public.exam_switch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  from_exam_id UUID REFERENCES public.exams(id) ON DELETE RESTRICT NOT NULL,
  to_exam_id UUID REFERENCES public.exams(id) ON DELETE RESTRICT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 2.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT CHECK (status IN ('created', 'payment_pending', 'paid', 'switch_completed', 'failed', 'cancelled')) DEFAULT 'created' NOT NULL,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exam_switch_requests_user_id ON public.exam_switch_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_switch_requests_order_id ON public.exam_switch_requests(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_exam_switch_requests_status ON public.exam_switch_requests(status);

CREATE TABLE IF NOT EXISTS public.exam_switch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  from_exam_id UUID REFERENCES public.exams(id) ON DELETE RESTRICT NOT NULL,
  to_exam_id UUID REFERENCES public.exams(id) ON DELETE RESTRICT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 2.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_reference TEXT,
  switch_request_id UUID REFERENCES public.exam_switch_requests(id) ON DELETE SET NULL,
  switched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_switch_history_user_id ON public.exam_switch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_switch_history_switched_at ON public.exam_switch_history(switched_at DESC);

ALTER TABLE public.exam_switch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_switch_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own switch requests" ON public.exam_switch_requests;
CREATE POLICY "Users can view own switch requests" ON public.exam_switch_requests
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own switch history" ON public.exam_switch_history;
CREATE POLICY "Users can view own switch history" ON public.exam_switch_history
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage all switch requests" ON public.exam_switch_requests;
CREATE POLICY "Admins manage all switch requests" ON public.exam_switch_requests
  FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage all switch history" ON public.exam_switch_history;
CREATE POLICY "Admins manage all switch history" ON public.exam_switch_history
  FOR ALL USING (public.is_admin(auth.uid()));

-- =====================================================================
-- 019. TOPIC ACCESS TRACKING, 15-DAY REFRESH & APPEND-ONLY PERSISTENCE
-- =====================================================================

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

ALTER TABLE public.topic_content_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sticky_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_refresh_runs ENABLE ROW LEVEL SECURITY;

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
BEGIN
  SELECT * INTO v_state
  FROM public.topic_content_state
  WHERE topic_id = p_topic_id
  FOR UPDATE;

  IF v_state.id IS NULL THEN
    INSERT INTO public.topic_content_state (
      exam_id, subject_id, topic_id, last_accessed_at, last_refreshed_at,
      next_refresh_at, refresh_status, refresh_job_id
    ) VALUES (
      p_exam_id, p_subject_id, p_topic_id, NOW(), NOW() - INTERVAL '16 days',
      NOW(), 'in_progress', p_job_id
    );
    RETURN TRUE;
  END IF;

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

  UPDATE public.topic_content_state
  SET last_accessed_at = NOW(),
      updated_at = NOW()
  WHERE topic_id = p_topic_id;

  RETURN FALSE;
END;
$$;

-- =====================================================================
-- 21. PRODUCTION AI CONTENT INTELLIGENCE ENGINE HARDENING SCHEMA
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    asset_type TEXT NOT NULL DEFAULT 'topic',
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
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(asset_id, asset_type, version)
);

CREATE INDEX IF NOT EXISTS idx_content_versions_asset ON public.content_versions(asset_id, asset_type, version DESC);
CREATE INDEX IF NOT EXISTS idx_content_versions_current ON public.content_versions(asset_id, is_current);

CREATE TABLE IF NOT EXISTS public.ai_cost_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
    content_version_id UUID REFERENCES public.content_versions(id) ON DELETE SET NULL,
    task_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INT NOT NULL DEFAULT 0,
    cached_input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    reasoning_tokens INT NOT NULL DEFAULT 0,
    actual_provider_cost NUMERIC(12,6) NOT NULL DEFAULT 0,
    revenue_allocated NUMERIC(12,6) NOT NULL DEFAULT 0,
    ai_infrastructure_cost NUMERIC(12,6) NOT NULL DEFAULT 0,
    credits_deducted NUMERIC(10,4) NOT NULL DEFAULT 0,
    margin_percent NUMERIC(6,2) DEFAULT 60.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cost_events_user ON public.ai_cost_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_events_created ON public.ai_cost_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_events_provider_model ON public.ai_cost_events(provider, model);

CREATE TABLE IF NOT EXISTS public.ai_credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
    content_version_id UUID REFERENCES public.content_versions(id) ON DELETE SET NULL,
    provider TEXT,
    model TEXT,
    task_type TEXT,
    input_tokens INT DEFAULT 0,
    cached_input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    actual_provider_cost_usd NUMERIC(12,6) DEFAULT 0,
    internal_credit_cost NUMERIC(10,4) NOT NULL DEFAULT 0,
    credit_balance_before NUMERIC(10,4) NOT NULL DEFAULT 0,
    credit_balance_after NUMERIC(10,4) NOT NULL DEFAULT 0,
    transaction_type TEXT NOT NULL DEFAULT 'AI_DEDUCTION',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_user ON public.ai_credit_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    model_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    task_types TEXT[] NOT NULL DEFAULT '{}',
    tier TEXT NOT NULL DEFAULT 'flash',
    input_price_per_1m NUMERIC(10,4) NOT NULL,
    cached_input_price_per_1m NUMERIC(10,4) NOT NULL,
    output_price_per_1m NUMERIC(10,4) NOT NULL,
    batch_input_price NUMERIC(10,4),
    batch_output_price NUMERIC(10,4),
    context_limit INT NOT NULL DEFAULT 1048576,
    max_output_tokens INT NOT NULL DEFAULT 8192,
    supports_structured_output BOOLEAN NOT NULL DEFAULT true,
    supports_thinking BOOLEAN NOT NULL DEFAULT false,
    supports_batch BOOLEAN NOT NULL DEFAULT false,
    supports_caching BOOLEAN NOT NULL DEFAULT true,
    enabled BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 1,
    fallback_model_id TEXT,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_until TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_task_routing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    tier TEXT NOT NULL DEFAULT 'flash',
    primary_provider TEXT NOT NULL DEFAULT 'gemini',
    primary_model TEXT NOT NULL DEFAULT 'gemini-3.5-flash',
    fallback_provider TEXT NOT NULL DEFAULT 'openai',
    fallback_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    credit_cost NUMERIC(6,2) NOT NULL DEFAULT 2.00,
    temperature NUMERIC(3,2) NOT NULL DEFAULT 0.70,
    max_tokens INT NOT NULL DEFAULT 4096,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_pricing_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_models INT NOT NULL DEFAULT 0,
    models_changed INT NOT NULL DEFAULT 0,
    pricing_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_pricing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    model_id TEXT NOT NULL,
    old_input_price NUMERIC(10,4) NOT NULL,
    new_input_price NUMERIC(10,4) NOT NULL,
    old_output_price NUMERIC(10,4) NOT NULL,
    new_output_price NUMERIC(10,4) NOT NULL,
    changed_by TEXT NOT NULL DEFAULT 'AUTO_SYNC',
    reason TEXT NOT NULL DEFAULT '10-Day Official Provider Pricing Sync',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_price_basic NUMERIC(10,2) NOT NULL DEFAULT 9.00,
    plan_price_pro NUMERIC(10,2) NOT NULL DEFAULT 29.00,
    plan_price_mastery NUMERIC(10,2) NOT NULL DEFAULT 99.00,
    plan_price_institutional NUMERIC(10,2) NOT NULL DEFAULT 499.00,
    ai_budget_percentage NUMERIC(5,2) NOT NULL DEFAULT 60.00,
    credit_value_usd NUMERIC(8,4) NOT NULL DEFAULT 0.0100,
    monthly_credit_allocation_basic INT NOT NULL DEFAULT 540,
    monthly_credit_allocation_pro INT NOT NULL DEFAULT 1740,
    monthly_credit_allocation_mastery INT NOT NULL DEFAULT 5940,
    monthly_credit_allocation_institutional INT NOT NULL DEFAULT 29940,
    overage_policy TEXT NOT NULL DEFAULT 'throttle',
    maximum_single_generation_cost NUMERIC(6,4) NOT NULL DEFAULT 0.2500,
    emergency_kill_switch BOOLEAN NOT NULL DEFAULT false,
    daily_user_ai_budget_usd NUMERIC(6,2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_provider_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    key_alias TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 1,
    rate_limit_rpm INT NOT NULL DEFAULT 60,
    daily_limit INT NOT NULL DEFAULT 10000,
    monthly_limit INT NOT NULL DEFAULT 300000,
    health_status TEXT NOT NULL DEFAULT 'Healthy',
    failure_count INT NOT NULL DEFAULT 0,
    cooldown_until TIMESTAMPTZ,
    last_health_check TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 022. GLOBAL EXAM INTELLIGENCE DATABASE FOUNDATION
-- ---------------------------------------------------------------------

-- 1. Extend public.exams structure with new attributes
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS authority TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS exam_type TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS official_reference_website TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS version_edition TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS marking_scheme JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS negative_marking BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS question_types JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS syllabus_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS image_question_requirements TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS video_question_requirements TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS clinical_case_requirements TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'discovering', 'verified', 'needs_review', 'stale', 'failed')) DEFAULT 'pending' NOT NULL;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS next_verification_at TIMESTAMPTZ;

-- 2. Extend public.exam_subjects structure
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'discovering', 'verified', 'needs_review', 'stale', 'failed')) DEFAULT 'pending' NOT NULL;
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 3. Extend public.exam_topics structure
ALTER TABLE public.exam_topics ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE public.exam_topics ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.exam_topics ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.exam_topics ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.exam_topics ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'discovering', 'verified', 'needs_review', 'stale', 'failed')) DEFAULT 'pending' NOT NULL;
ALTER TABLE public.exam_topics ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 4. Helper functions for normalization and slug generation
CREATE OR REPLACE FUNCTION public.normalize_canonical_name(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN TRIM(REGEXP_REPLACE(LOWER(REPLACE(input_name, '-', ' ')), '\s+', ' ', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.generate_slug(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN REGEXP_REPLACE(TRIM(REGEXP_REPLACE(LOWER(REPLACE(input_name, '-', ' ')), '\s+', ' ', 'g')), '\s+', '-', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Create BEFORE triggers to automatically update normalization and slugs
CREATE OR REPLACE FUNCTION public.populate_exam_normalization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.normalized_name := public.normalize_canonical_name(NEW.name);
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.generate_slug(NEW.name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_exam_normalization ON public.exams;
CREATE TRIGGER trg_populate_exam_normalization
  BEFORE INSERT OR UPDATE ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_exam_normalization();

CREATE OR REPLACE FUNCTION public.populate_subject_normalization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.normalized_name := public.normalize_canonical_name(NEW.name);
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.generate_slug(NEW.name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_subject_normalization ON public.exam_subjects;
CREATE TRIGGER trg_populate_subject_normalization
  BEFORE INSERT OR UPDATE ON public.exam_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_subject_normalization();

CREATE OR REPLACE FUNCTION public.populate_topic_normalization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.normalized_name := public.normalize_canonical_name(NEW.name);
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.generate_slug(NEW.name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_topic_normalization ON public.exam_topics;
CREATE TRIGGER trg_populate_topic_normalization
  BEFORE INSERT OR UPDATE ON public.exam_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_topic_normalization();

-- 6. Bulk populate existing rows to trigger the normalization
UPDATE public.exams SET name = name WHERE normalized_name IS NULL OR slug IS NULL;
UPDATE public.exam_subjects SET name = name WHERE normalized_name IS NULL OR slug IS NULL;
UPDATE public.exam_topics SET name = name WHERE normalized_name IS NULL OR slug IS NULL;

-- 7. Add btree search indexes (Note: unique indexes are not enforced directly in DDL due to pre-existing production duplicate rows)
CREATE INDEX IF NOT EXISTS idx_exams_normalized_name ON public.exams(normalized_name);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_normalized_name ON public.exam_subjects(exam_id, normalized_name);
CREATE INDEX IF NOT EXISTS idx_exam_topics_normalized_name ON public.exam_topics(subject_id, normalized_name);

-- 8. Create the exam_subtopics table for fine-grained global curriculum layers
CREATE TABLE IF NOT EXISTS public.exam_subtopics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT,
  slug TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  verification_status TEXT CHECK (verification_status IN ('pending', 'discovering', 'verified', 'needs_review', 'stale', 'failed')) DEFAULT 'pending' NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_subtopics_topic_id ON public.exam_subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_exam_subtopics_normalized_name ON public.exam_subtopics(topic_id, normalized_name);

CREATE OR REPLACE FUNCTION public.populate_subtopic_normalization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.normalized_name := public.normalize_canonical_name(NEW.name);
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.generate_slug(NEW.name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_subtopic_normalization ON public.exam_subtopics;
CREATE TRIGGER trg_populate_subtopic_normalization
  BEFORE INSERT OR UPDATE ON public.exam_subtopics
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_subtopic_normalization();

-- 9. Create the exam_evidence table to log AI and manual verification references
CREATE TABLE IF NOT EXISTS public.exam_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  source_url TEXT,
  source_reference TEXT,
  source_type TEXT CHECK (source_type IN ('official_syllabus', 'regulatory_board', 'academic_publication', 'official_handbook', 'web_resource', 'other')) DEFAULT 'web_resource' NOT NULL,
  publisher_authority TEXT,
  retrieved_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  source_version_date TEXT,
  verification_status TEXT CHECK (verification_status IN ('pending', 'valid', 'invalid', 'disputed')) DEFAULT 'pending' NOT NULL,
  extracted_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_evidence_exam_id ON public.exam_evidence(exam_id);

-- 10. Configure Row-Level Security (RLS) for global readability and write safety
ALTER TABLE public.exam_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read verified subtopics" ON public.exam_subtopics;
CREATE POLICY "Public can read verified subtopics" ON public.exam_subtopics
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Service role manages subtopics" ON public.exam_subtopics;
CREATE POLICY "Service role manages subtopics" ON public.exam_subtopics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read verified evidence" ON public.exam_evidence;
CREATE POLICY "Public can read verified evidence" ON public.exam_evidence
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Service role manages evidence" ON public.exam_evidence;
CREATE POLICY "Service role manages evidence" ON public.exam_evidence
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------
-- 023. UNIQUE CONSTRAINTS (DUPLICATE CURRICULUM PROTECTION)
-- ---------------------------------------------------------------------
ALTER TABLE public.exam_subjects 
  ADD CONSTRAINT unique_exam_subject_normalized UNIQUE (exam_id, normalized_name);

ALTER TABLE public.exam_topics 
  ADD CONSTRAINT unique_subject_topic_normalized UNIQUE (subject_id, normalized_name);

-- ---------------------------------------------------------------------
-- 024 - 029. PRODUCTION HARDENING, AI TUTOR, STICKY NOTES & LEARNING ASSETS
-- ---------------------------------------------------------------------

-- AI Tutor Lessons with full scene, segment, difficulty_level & metadata support
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

-- Ensure all columns exist on ai_tutor_lessons
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

-- Ensure all columns on user_sticky_notes
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

-- Active Recall System Tables
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
    status TEXT NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS enablement
ALTER TABLE public.ai_tutor_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_tts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_recall_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_recall_sessions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_tutor_lessons_hierarchy ON public.ai_tutor_lessons(exam_id, subject_id, topic_id, subtopic_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_lessons_user_topic ON public.ai_tutor_lessons(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_user_sticky_notes_scoping ON public.user_sticky_notes(user_id, topic_id, subtopic_id);
CREATE INDEX IF NOT EXISTS idx_user_sticky_notes_hierarchy ON public.user_sticky_notes(user_id, exam_id, subject_id, topic_id);








