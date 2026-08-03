-- Migration 004: Internationalization (Countries, Languages, Currencies, Timezones)

CREATE TABLE IF NOT EXISTS public.languages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- e.g., 'en', 'es', 'fr', 'hi'
  name TEXT NOT NULL,
  native_name TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- e.g., 'USD', 'INR', 'EUR', 'GBP'
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.timezones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- e.g., 'America/New_York', 'Asia/Kolkata'
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

-- Add foreign key constraints to profiles table safely
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
