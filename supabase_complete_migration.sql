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

ALTER TABLE public.ai_generation_jobs
  ADD COLUMN IF NOT EXISTS progress_stage TEXT DEFAULT 'Preparing your exam...',
  ADD COLUMN IF NOT EXISTS step_percentage INTEGER DEFAULT 0;

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




