-- Migration 010: Seed Reference Data

-- 1. Seed Roles
INSERT INTO public.roles (name, description) VALUES
  ('super_admin', 'Full system access and database administrative privileges'),
  ('admin', 'Content creation, user management, and analytics viewing'),
  ('support', 'Customer support access and user query resolution'),
  ('user', 'Standard student or subscriber user role')
ON CONFLICT (name) DO NOTHING;

-- 2. Seed Languages
INSERT INTO public.languages (code, name, native_name) VALUES
  ('en', 'English', 'English'),
  ('es', 'Spanish', 'Español'),
  ('fr', 'French', 'Français'),
  ('hi', 'Hindi', 'हिन्दी'),
  ('de', 'German', 'Deutsch')
ON CONFLICT (code) DO NOTHING;

-- 3. Seed Currencies
INSERT INTO public.currencies (code, name, symbol) VALUES
  ('USD', 'US Dollar', '$'),
  ('INR', 'Indian Rupee', '₹'),
  ('EUR', 'Euro', '€'),
  ('GBP', 'British Pound', '£'),
  ('AUD', 'Australian Dollar', 'A$'),
  ('CAD', 'Canadian Dollar', 'C$')
ON CONFLICT (code) DO NOTHING;

-- 4. Seed ISO Countries
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

-- 5. Seed Exam Categories
INSERT INTO public.exam_categories (name, slug, description, icon_name) VALUES
  ('Medical & Healthcare', 'medical-healthcare', 'Global medical licensing, nursing boards, and clinical postgraduate exams', 'Stethoscope'),
  ('Engineering & Tech', 'engineering-tech', 'Software engineering, cloud architecture, and technical certifications', 'Cpu'),
  ('Civil Services & Govt', 'civil-services-govt', 'National administration, public service commissions, and defense exams', 'ShieldCheck'),
  ('Business & Finance', 'business-finance', 'Chartered accountancy, financial analysis, and graduate management admissions', 'TrendingUp'),
  ('Law & Legal', 'law-legal', 'Judicial services, bar examinations, and legal entrance tests', 'Scale')
ON CONFLICT (slug) DO NOTHING;

-- 6. Seed Global Exams
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

  -- USMLE Step 1
  INSERT INTO public.exams (category_id, country_id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured)
  VALUES (v_med_id, v_us_id, 'USMLE Step 1', 'usmle-step-1', 'United States Medical Licensing Examination assessing foundational clinical science concepts', 'Expert', 280, 420, true)
  ON CONFLICT (slug) DO NOTHING;

  -- NCLEX-RN
  INSERT INTO public.exams (category_id, country_id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured)
  VALUES (v_med_id, v_us_id, 'NCLEX-RN', 'nclex-rn', 'National Council Licensure Examination for Registered Nurses', 'Advanced', 145, 300, true)
  ON CONFLICT (slug) DO NOTHING;

  -- UPSC Civil Services
  INSERT INTO public.exams (category_id, country_id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured)
  VALUES (v_govt_id, v_in_id, 'UPSC Civil Services (IAS/IPS)', 'upsc-civil-services', 'Premier Indian administrative examination for civil governance', 'Expert', 200, 240, true)
  ON CONFLICT (slug) DO NOTHING;

  -- NEET PG
  INSERT INTO public.exams (category_id, country_id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured)
  VALUES (v_med_id, v_in_id, 'NEET PG Medical', 'neet-pg', 'National Eligibility cum Entrance Test for Postgraduate Medical Studies', 'Expert', 200, 210, true)
  ON CONFLICT (slug) DO NOTHING;

  -- AWS Solutions Architect
  INSERT INTO public.exams (category_id, country_id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured)
  VALUES (v_tech_id, v_us_id, 'AWS Certified Solutions Architect - Associate', 'aws-certified-solutions-architect', 'Industry benchmark cloud architecture validation exam', 'Intermediate', 65, 130, true)
  ON CONFLICT (slug) DO NOTHING;

  -- CPA Exam
  INSERT INTO public.exams (category_id, country_id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured)
  VALUES (v_fin_id, v_us_id, 'US CPA Certification', 'us-cpa-certification', 'Uniform Certified Public Accountant Examination', 'Advanced', 120, 240, true)
  ON CONFLICT (slug) DO NOTHING;
END $$;

-- 7. Seed Subscription Plans
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
