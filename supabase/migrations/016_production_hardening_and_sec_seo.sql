-- =====================================================================
-- 016. PRODUCTION HARDENING, MCQ ANSWER PROTECTION & PUBLIC SEO ARCHITECTURE
-- =====================================================================

-- 1. Ensure public.mcqs has security & taxonomy classifications
ALTER TABLE public.mcqs
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility TEXT CHECK (visibility IN ('PUBLIC_CANONICAL', 'PUBLIC_DISCOVERABLE', 'AUTHENTICATED', 'PRIVATE_USER', 'ADMIN_ONLY', 'SYSTEM_ONLY')) DEFAULT 'PUBLIC_CANONICAL',
  ADD COLUMN IF NOT EXISTS answer_visibility TEXT CHECK (answer_visibility IN ('PUBLIC', 'AFTER_ATTEMPT', 'AUTHENTICATED', 'PRIVATE')) DEFAULT 'AFTER_ATTEMPT';

CREATE INDEX IF NOT EXISTS idx_mcqs_slug ON public.mcqs(slug);
CREATE INDEX IF NOT EXISTS idx_mcqs_visibility ON public.mcqs(visibility);
CREATE INDEX IF NOT EXISTS idx_mcqs_exam_id ON public.mcqs(exam_id);

-- 2. Create mcq_attempts table for recording answer submissions
CREATE TABLE IF NOT EXISTS public.mcq_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mcq_id UUID REFERENCES public.mcqs(id) ON DELETE CASCADE NOT NULL,
  selected_option TEXT,
  selected_index INTEGER,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mcq_attempts_user_id ON public.mcq_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mcq_attempts_mcq_id ON public.mcq_attempts(mcq_id);

ALTER TABLE public.mcq_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own mcq attempts" ON public.mcq_attempts;
CREATE POLICY "Users view own mcq attempts" ON public.mcq_attempts 
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own mcq attempts" ON public.mcq_attempts;
CREATE POLICY "Users insert own mcq attempts" ON public.mcq_attempts 
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 3. SECURE PUBLIC MCQ RETRIEVAL RPC (Stripped of correct_answer)
-- Used by /mcq/[slug] for public SEO rendering.
CREATE OR REPLACE FUNCTION public.get_public_mcq_by_slug(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  question TEXT,
  options JSONB,
  difficulty TEXT,
  explanation TEXT,
  clinical_pearl TEXT,
  exam_id UUID,
  exam_name TEXT,
  exam_slug TEXT,
  subject_id UUID,
  subject_name TEXT,
  topic_id UUID,
  topic_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.slug,
    m.question,
    m.options,
    m.difficulty,
    m.explanation,
    m.clinical_pearl,
    m.exam_id,
    e.name AS exam_name,
    e.slug AS exam_slug,
    m.subject_id,
    es.name AS subject_name,
    m.topic_id,
    et.name AS topic_name,
    m.created_at
  FROM public.mcqs m
  LEFT JOIN public.exams e ON m.exam_id = e.id
  LEFT JOIN public.exam_subjects es ON m.subject_id = es.id
  LEFT JOIN public.exam_topics et ON m.topic_id = et.id
  WHERE m.slug = p_slug
    AND m.status = 'approved'
    AND m.visibility IN ('PUBLIC_CANONICAL', 'PUBLIC_DISCOVERABLE');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. SERVER-SIDE ANSWER SUBMISSION & VERIFICATION RPC
-- Used by POST /api/mcq/submit to verify answer server-side and return results.
CREATE OR REPLACE FUNCTION public.submit_mcq_answer_atomic(
  p_user_id UUID,
  p_mcq_id UUID,
  p_selected_index INTEGER DEFAULT NULL,
  p_selected_option TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_mcq RECORD;
  v_is_correct BOOLEAN := FALSE;
  v_correct_answer TEXT;
  v_options JSONB;
  v_chosen_option TEXT;
BEGIN
  SELECT * INTO v_mcq FROM public.mcqs WHERE id = p_mcq_id;
  IF v_mcq.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MCQ not found');
  END IF;

  v_correct_answer := v_mcq.correct_answer;
  v_options := v_mcq.options;

  -- Determine chosen option string
  IF p_selected_option IS NOT NULL THEN
    v_chosen_option := p_selected_option;
  ELSIF p_selected_index IS NOT NULL AND jsonb_typeof(v_options) = 'array' THEN
    v_chosen_option := v_options->>p_selected_index;
  END IF;

  -- Verify correctness
  IF v_chosen_option IS NOT NULL AND v_correct_answer IS NOT NULL THEN
    IF TRIM(LOWER(v_chosen_option)) = TRIM(LOWER(v_correct_answer)) THEN
      v_is_correct := TRUE;
    END IF;
  END IF;

  -- Record attempt if user is authenticated or guest
  INSERT INTO public.mcq_attempts (user_id, mcq_id, selected_option, selected_index, is_correct)
  VALUES (p_user_id, p_mcq_id, v_chosen_option, p_selected_index, v_is_correct);

  RETURN jsonb_build_object(
    'success', true,
    'is_correct', v_is_correct,
    'correct_answer', v_correct_answer,
    'explanation', v_mcq.explanation,
    'rationale', v_mcq.rationale,
    'clinical_pearl', v_mcq.clinical_pearl
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. UGC TO CANONICAL PROMOTION RPC
CREATE OR REPLACE FUNCTION public.promote_ugc_to_canonical(
  p_mcq_id UUID,
  p_admin_id UUID
)
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin(p_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin authorization required');
  END IF;

  UPDATE public.mcqs
  SET visibility = 'PUBLIC_CANONICAL',
      status = 'approved',
      reviewed = true,
      reviewed_by = p_admin_id,
      reviewed_at = NOW()
  WHERE id = p_mcq_id;

  RETURN jsonb_build_object('success', true, 'message', 'Content promoted to PUBLIC_CANONICAL');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS Hardening for public.mcqs
ALTER TABLE public.mcqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view active canonical mcqs" ON public.mcqs;
CREATE POLICY "Public view active canonical mcqs" ON public.mcqs 
  FOR SELECT USING (
    (status = 'approved' AND visibility IN ('PUBLIC_CANONICAL', 'PUBLIC_DISCOVERABLE'))
    OR (auth.uid() = user_id)
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users insert own mcqs" ON public.mcqs;
CREATE POLICY "Users insert own mcqs" ON public.mcqs 
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users update own mcqs" ON public.mcqs;
CREATE POLICY "Users update own mcqs" ON public.mcqs 
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 7. Seed Sample Public MCQs with Slugs for SEO Testing
DO $$
DECLARE
  v_exam_id UUID;
  v_subject_id UUID;
  v_topic_id UUID;
BEGIN
  SELECT id INTO v_exam_id FROM public.exams WHERE slug = 'usmle-step-1' LIMIT 1;
  IF v_exam_id IS NULL THEN
    SELECT id INTO v_exam_id FROM public.exams LIMIT 1;
  END IF;

  SELECT id INTO v_subject_id FROM public.exam_subjects WHERE exam_id = v_exam_id LIMIT 1;
  SELECT id INTO v_topic_id FROM public.exam_topics WHERE subject_id = v_subject_id LIMIT 1;

  IF v_exam_id IS NOT NULL THEN
    INSERT INTO public.mcqs (
      slug, question, options, correct_answer, explanation, clinical_pearl, difficulty, exam_id, subject_id, topic_id, visibility, answer_visibility, status
    ) VALUES 
    (
      'usmle-biochem-glycolysis-rate-limiting-step-001',
      'A 45-year-old male presents with fatigue and shortness of breath. Laboratory analysis reveals impaired glycolysis in erythrocytes. Which of the following enzymes catalyzes the key rate-limiting step of glycolysis?',
      '["Hexokinase", "Phosphofructokinase-1 (PFK-1)", "Pyruvate kinase", "Glucokinase", "Phosphoglycerate kinase"]'::jsonb,
      'Phosphofructokinase-1 (PFK-1)',
      'Phosphofructokinase-1 (PFK-1) catalyzes the irreversible conversion of fructose 6-phosphate to fructose 1,6-bisphosphate using ATP. It is the key rate-limiting and committed enzyme of the glycolytic pathway.',
      'AMP and Fructose 2,6-bisphosphate are potent allosteric activators of PFK-1, whereas ATP and citrate inhibit it.',
      'Intermediate',
      v_exam_id, v_subject_id, v_topic_id,
      'PUBLIC_CANONICAL', 'AFTER_ATTEMPT', 'approved'
    ),
    (
      'nclex-rn-cardiology-heart-failure-digoxin-002',
      'A nurse is assessing a client taking digoxin for heart failure. Which of the following clinical signs is most indicative of early digoxin toxicity?',
      '["Hypertension", "Anorexia and nausea", "Photophobia", "Tachycardia", "Hyperkalemia"]'::jsonb,
      'Anorexia and nausea',
      'Gastrointestinal symptoms such as anorexia, nausea, vomiting, and abdominal pain are typically the earliest signs of digoxin toxicity, preceding cardiac arrhythmias and visual disturbances.',
      'Hypokalemia increases digoxin binding and significantly potentiates digoxin toxicity risk.',
      'Intermediate',
      v_exam_id, v_subject_id, v_topic_id,
      'PUBLIC_CANONICAL', 'AFTER_ATTEMPT', 'approved'
    )
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END;
$$;
