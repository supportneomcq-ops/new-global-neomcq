import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;
const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function applyMigration() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL.');
    
    // 1. Exam Authorities
    console.log('Creating exam_authorities...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.exam_authorities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        short_name TEXT,
        official_website TEXT,
        description TEXT,
        headquarters TEXT,
        established_year INTEGER,
        verification_status TEXT CHECK (verification_status IN ('verified', 'pending_review', 'unverified')) DEFAULT 'verified' NOT NULL,
        source_url TEXT,
        last_verified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_exam_authorities_code ON public.exam_authorities(code);
      CREATE INDEX IF NOT EXISTS idx_exam_authorities_country ON public.exam_authorities(country_id);
      CREATE INDEX IF NOT EXISTS idx_exam_authorities_slug ON public.exam_authorities(slug);
    `);

    // 2. Expand Categories
    console.log('Expanding exam_categories...');
    await client.query(`
      INSERT INTO public.exam_categories (name, slug, description, icon_name)
      VALUES
        ('Management & Business', 'management-business', 'Graduate management admissions, MBA entrance, and business leadership tests', 'Briefcase'),
        ('Education & Teaching', 'education-teaching', 'Teacher eligibility, academic lectureship, and national educational certifications', 'GraduationCap'),
        ('Science & Research', 'science-research', 'Fundamental sciences, doctoral eligibility, and research fellowships', 'Atom'),
        ('University Entrance', 'university-entrance', 'Central and state university undergraduate and postgraduate entrance tests', 'School'),
        ('Professional Certification', 'professional-certification', 'Statutory professional qualifications and industry certifications', 'Award'),
        ('Defence & Armed Forces', 'defence-services', 'Military academies, naval, air force, and armed forces officer selection', 'Shield'),
        ('Banking & Financial Services', 'banking-financial-services', 'Public and private commercial banks, central bank, and regulatory institutions', 'Landmark'),
        ('Accounting & Audit', 'accounting-audit', 'Chartered accountancy, cost management, and company secretaryship qualifications', 'Calculator'),
        ('Nursing & Allied Health', 'nursing-allied-health', 'Nursing licensing, clinical technologists, and paramedical examinations', 'HeartPulse'),
        ('Pharmacy & Pharma Sciences', 'pharmacy-sciences', 'Graduate pharmacy aptitude and registered pharmacist licensing', 'Pill'),
        ('Dentistry', 'dentistry', 'Dental surgery admissions and post-graduate dental specialty licensing', 'Activity'),
        ('Veterinary Sciences', 'veterinary-sciences', 'Veterinary council examinations and animal healthcare admissions', 'Stethoscope'),
        ('Architecture & Planning', 'architecture-planning', 'National aptitude in architecture and urban planning entrances', 'Building2'),
        ('Agriculture & Allied Sciences', 'agriculture-sciences', 'Agricultural research, ICAR entrances, and rural banking specializations', 'Sprout'),
        ('Language & Linguistics', 'language-linguistics', 'Language proficiency and translation competence assessments', 'Languages'),
        ('Other Competitive Exams', 'other-competitive-exams', 'Specialized statutory and state recruitment competitive tests', 'Compass')
      ON CONFLICT (slug) DO UPDATE 
      SET name = EXCLUDED.name, description = EXCLUDED.description;
    `);

    // 3. Subjects table
    console.log('Creating subjects...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.subjects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category_id UUID REFERENCES public.exam_categories(id) ON DELETE SET NULL,
        description TEXT,
        aliases TEXT[] DEFAULT '{}' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_subjects_slug ON public.subjects(slug);
      CREATE INDEX IF NOT EXISTS idx_subjects_name ON public.subjects(name);
    `);

    // 4. Topics table
    console.log('Creating topics...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.topics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        aliases TEXT[] DEFAULT '{}' NOT NULL,
        importance TEXT CHECK (importance IN ('Critical', 'High', 'Medium', 'Low')) DEFAULT 'High' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        UNIQUE(subject_id, slug)
      );
      CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON public.topics(subject_id);
      CREATE INDEX IF NOT EXISTS idx_topics_slug ON public.topics(slug);
    `);

    // 5. Enhance exams
    console.log('Enhancing exams table...');
    await client.query(`
      ALTER TABLE public.exams
        ADD COLUMN IF NOT EXISTS authority_id UUID REFERENCES public.exam_authorities(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS short_name TEXT,
        ADD COLUMN IF NOT EXISTS official_url TEXT,
        ADD COLUMN IF NOT EXISTS official_notification_url TEXT,
        ADD COLUMN IF NOT EXISTS official_syllabus_url TEXT,
        ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'Competitive Entrance',
        ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'National',
        ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'Computer Based Test (CBT)',
        ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'Annually',
        ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '180 minutes',
        ADD COLUMN IF NOT EXISTS total_marks NUMERIC(8,2),
        ADD COLUMN IF NOT EXISTS negative_marking TEXT,
        ADD COLUMN IF NOT EXISTS passing_criteria TEXT,
        ADD COLUMN IF NOT EXISTS eligibility TEXT,
        ADD COLUMN IF NOT EXISTS attempt_rules TEXT,
        ADD COLUMN IF NOT EXISTS application_information TEXT,
        ADD COLUMN IF NOT EXISTS selection_process TEXT,
        ADD COLUMN IF NOT EXISTS stages JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS papers JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY['English'],
        ADD COLUMN IF NOT EXISTS current_version TEXT DEFAULT '2026',
        ADD COLUMN IF NOT EXISTS version_year INTEGER DEFAULT 2026,
        ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('verified', 'pending_review', 'outdated', 'incomplete')) DEFAULT 'verified',
        ADD COLUMN IF NOT EXISTS source_url TEXT,
        ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS next_verification_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '180 days');

      CREATE INDEX IF NOT EXISTS idx_exams_authority_id ON public.exams(authority_id);
      CREATE INDEX IF NOT EXISTS idx_exams_verification_status ON public.exams(verification_status);
    `);

    // 6. Exam Versions
    console.log('Creating exam_versions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.exam_versions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
        version_year INTEGER NOT NULL,
        is_current BOOLEAN DEFAULT FALSE NOT NULL,
        official_notification_url TEXT,
        official_syllabus_url TEXT,
        stages JSONB DEFAULT '[]'::jsonb,
        papers JSONB DEFAULT '[]'::jsonb,
        pattern_summary JSONB DEFAULT '{}'::jsonb,
        source_url TEXT NOT NULL,
        verified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        UNIQUE(exam_id, version_year)
      );
      CREATE INDEX IF NOT EXISTS idx_exam_versions_exam_id ON public.exam_versions(exam_id);
    `);

    // 7. Enhance exam_subjects & exam_topics
    console.log('Enhancing exam_subjects and exam_topics...');
    await client.query(`
      ALTER TABLE public.exam_subjects
        ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS official_name TEXT,
        ADD COLUMN IF NOT EXISTS display_name TEXT,
        ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT TRUE NOT NULL,
        ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE NOT NULL,
        ADD COLUMN IF NOT EXISTS source_url TEXT,
        ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified',
        ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW();

      CREATE INDEX IF NOT EXISTS idx_exam_subjects_subject_id ON public.exam_subjects(subject_id);

      ALTER TABLE public.exam_topics
        ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS official_name TEXT,
        ADD COLUMN IF NOT EXISTS display_name TEXT,
        ADD COLUMN IF NOT EXISTS importance TEXT DEFAULT 'High',
        ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE NOT NULL,
        ADD COLUMN IF NOT EXISTS source_url TEXT,
        ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified',
        ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW();

      CREATE INDEX IF NOT EXISTS idx_exam_topics_topic_id ON public.exam_topics(topic_id);
    `);

    // 8. RLS
    console.log('Configuring RLS...');
    await client.query(`
      ALTER TABLE public.exam_authorities ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.exam_versions ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Public read access to exam_authorities" ON public.exam_authorities;
      CREATE POLICY "Public read access to exam_authorities" ON public.exam_authorities FOR SELECT USING (true);
      DROP POLICY IF EXISTS "Admin write access to exam_authorities" ON public.exam_authorities;
      CREATE POLICY "Admin write access to exam_authorities" ON public.exam_authorities USING (true);

      DROP POLICY IF EXISTS "Public read access to subjects" ON public.subjects;
      CREATE POLICY "Public read access to subjects" ON public.subjects FOR SELECT USING (true);
      DROP POLICY IF EXISTS "Admin write access to subjects" ON public.subjects;
      CREATE POLICY "Admin write access to subjects" ON public.subjects USING (true);

      DROP POLICY IF EXISTS "Public read access to topics" ON public.topics;
      CREATE POLICY "Public read access to topics" ON public.topics FOR SELECT USING (true);
      DROP POLICY IF EXISTS "Admin write access to topics" ON public.topics;
      CREATE POLICY "Admin write access to topics" ON public.topics USING (true);

      DROP POLICY IF EXISTS "Public read access to exam_versions" ON public.exam_versions;
      CREATE POLICY "Public read access to exam_versions" ON public.exam_versions FOR SELECT USING (true);
      DROP POLICY IF EXISTS "Admin write access to exam_versions" ON public.exam_versions;
      CREATE POLICY "Admin write access to exam_versions" ON public.exam_versions USING (true);
    `);

    console.log('Migration 020 successfully applied in full!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

applyMigration();
