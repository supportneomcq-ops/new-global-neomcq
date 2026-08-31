-- ============================================================================
-- NEOMCQ MIGRATION 024: AI TUTOR FOUNDATION
-- Adds user ownership, content versioning, and state tracking to ai_tutor_lessons
-- ============================================================================

-- Add user_id column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_tutor_lessons' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.ai_tutor_lessons 
        ADD COLUMN user_id UUID;
    END IF;
END $$;

ALTER TABLE public.ai_tutor_lessons DROP CONSTRAINT IF EXISTS ai_tutor_lessons_user_id_fkey;

-- Add content_version column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_tutor_lessons' AND column_name = 'content_version'
    ) THEN
        ALTER TABLE public.ai_tutor_lessons 
        ADD COLUMN content_version INTEGER DEFAULT 1 NOT NULL;
    END IF;
END $$;

-- Add current_phase column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_tutor_lessons' AND column_name = 'current_phase'
    ) THEN
        ALTER TABLE public.ai_tutor_lessons 
        ADD COLUMN current_phase TEXT DEFAULT 'Introduction';
    END IF;
END $$;

-- Add current_sequence column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_tutor_lessons' AND column_name = 'current_sequence'
    ) THEN
        ALTER TABLE public.ai_tutor_lessons 
        ADD COLUMN current_sequence INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- Add lesson_state column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_tutor_lessons' AND column_name = 'lesson_state'
    ) THEN
        ALTER TABLE public.ai_tutor_lessons 
        ADD COLUMN lesson_state TEXT DEFAULT 'NOT_STARTED';
    END IF;
END $$;

-- Add segments column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_tutor_lessons' AND column_name = 'segments'
    ) THEN
        ALTER TABLE public.ai_tutor_lessons 
        ADD COLUMN segments JSONB DEFAULT '[]'::jsonb NOT NULL;
    END IF;
END $$;

-- Drop restrictive check constraint on status if it exists so we can support NOT_STARTED, IN_PROGRESS, PAUSED, COMPLETED, FAILED
ALTER TABLE public.ai_tutor_lessons DROP CONSTRAINT IF EXISTS ai_tutor_lessons_status_check;

-- Add updated check constraint for status
ALTER TABLE public.ai_tutor_lessons 
ADD CONSTRAINT ai_tutor_lessons_status_check 
CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'FAILED', 'draft', 'generating', 'pending_review', 'approved', 'rejected', 'archived'));

-- Create index for user-specific lesson lookups
CREATE INDEX IF NOT EXISTS idx_ai_tutor_lessons_user_topic 
ON public.ai_tutor_lessons(user_id, topic_id);

-- Create index for exam/subject/topic/version hierarchy
CREATE INDEX IF NOT EXISTS idx_ai_tutor_lessons_hierarchy 
ON public.ai_tutor_lessons(exam_id, subject_id, topic_id, content_version);

-- Update RLS Policies
ALTER TABLE public.ai_tutor_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own tutor lessons" ON public.ai_tutor_lessons;
CREATE POLICY "Users read own tutor lessons" ON public.ai_tutor_lessons 
FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own tutor lessons" ON public.ai_tutor_lessons;
CREATE POLICY "Users insert own tutor lessons" ON public.ai_tutor_lessons 
FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users update own tutor lessons" ON public.ai_tutor_lessons;
CREATE POLICY "Users update own tutor lessons" ON public.ai_tutor_lessons 
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
