-- =====================================================================
-- 014. EDGE FUNCTIONS, CREDIT LEDGER, CRON JOBS & ATOMIC RPCS
-- =====================================================================

-- 1. Credit Accounts & Ledger Tables
CREATE TABLE IF NOT EXISTS public.credit_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance INTEGER DEFAULT 100 NOT NULL CHECK (balance >= 0),
  lifetime_earned INTEGER DEFAULT 100 NOT NULL,
  lifetime_spent INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_accounts_user_id ON public.credit_accounts(user_id);

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- positive for grants, negative for deductions
  tx_type TEXT CHECK (tx_type IN ('PURCHASE', 'SUBSCRIPTION_GRANT', 'PROMOTIONAL_GRANT', 'AI_USAGE', 'REFUND', 'REVERSAL', 'EXPIRATION', 'ADMIN_ADJUSTMENT')) NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON public.credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_tx_type ON public.credit_ledger(tx_type);

-- RLS for Credit Tables
ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own credit balance" ON public.credit_accounts;
CREATE POLICY "Users view own credit balance" ON public.credit_accounts
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own credit ledger" ON public.credit_ledger;
CREATE POLICY "Users view own credit ledger" ON public.credit_ledger
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 2. Atomic Credit Deduction RPC (Row locking with FOR UPDATE)
CREATE OR REPLACE FUNCTION public.deduct_user_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT 'AI Service Usage',
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid deduction amount');
  END IF;

  -- Ensure credit account exists
  INSERT INTO public.credit_accounts (user_id, balance, lifetime_earned, lifetime_spent)
  VALUES (p_user_id, 100, 100, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock row for atomic update
  SELECT balance INTO v_current_balance
  FROM public.credit_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credit balance',
      'current_balance', v_current_balance,
      'required', p_amount
    );
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE public.credit_accounts
  SET balance = v_new_balance,
      lifetime_spent = lifetime_spent + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_ledger (user_id, amount, tx_type, description, reference_id)
  VALUES (p_user_id, -p_amount, 'AI_USAGE', p_description, p_reference_id);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'deducted', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic Credit Grant RPC
CREATE OR REPLACE FUNCTION public.add_user_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_tx_type TEXT DEFAULT 'PURCHASE',
  p_description TEXT DEFAULT 'Credit Top-up',
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero');
  END IF;

  INSERT INTO public.credit_accounts (user_id, balance, lifetime_earned, lifetime_spent)
  VALUES (p_user_id, p_amount + 100, p_amount + 100, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.credit_accounts.balance + EXCLUDED.balance - 100,
      lifetime_earned = public.credit_accounts.lifetime_earned + EXCLUDED.balance - 100,
      updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.credit_ledger (user_id, amount, tx_type, description, reference_id)
  VALUES (p_user_id, p_amount, p_tx_type, p_description, p_reference_id);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'added', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Calculate User Exam Progress RPC
CREATE OR REPLACE FUNCTION public.calculate_user_exam_progress(
  p_user_id UUID,
  p_exam_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_total_topics INTEGER := 0;
  v_completed_topics INTEGER := 0;
  v_total_mcqs INTEGER := 0;
  v_attempted_mcqs INTEGER := 0;
  v_correct_mcqs INTEGER := 0;
  v_completion_percentage NUMERIC := 0.0;
  v_accuracy_percentage NUMERIC := 0.0;
BEGIN
  -- Count total topics under subjects for this exam
  SELECT COUNT(DISTINCT et.id) INTO v_total_topics
  FROM public.exam_topics et
  JOIN public.exam_subjects es ON et.subject_id = es.id
  WHERE es.exam_id = p_exam_id;

  -- Count total MCQs for this exam
  SELECT COUNT(DISTINCT m.id) INTO v_total_mcqs
  FROM public.mcqs m
  WHERE m.exam_id = p_exam_id;

  -- Count attempted MCQs and correct attempts for user
  SELECT 
    COUNT(DISTINCT ma.mcq_id),
    COUNT(DISTINCT CASE WHEN ma.is_correct THEN ma.mcq_id END)
  INTO v_attempted_mcqs, v_correct_mcqs
  FROM public.mcq_attempts ma
  JOIN public.mcqs m ON ma.mcq_id = m.id
  WHERE ma.user_id = p_user_id AND m.exam_id = p_exam_id;

  IF v_total_mcqs > 0 THEN
    v_completion_percentage := ROUND((v_attempted_mcqs::NUMERIC / v_total_mcqs::NUMERIC) * 100.0, 1);
  END IF;

  IF v_attempted_mcqs > 0 THEN
    v_accuracy_percentage := ROUND((v_correct_mcqs::NUMERIC / v_attempted_mcqs::NUMERIC) * 100.0, 1);
  END IF;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'exam_id', p_exam_id,
    'total_topics', v_total_topics,
    'total_mcqs', v_total_mcqs,
    'attempted_mcqs', v_attempted_mcqs,
    'correct_mcqs', v_correct_mcqs,
    'completion_percentage', v_completion_percentage,
    'accuracy_percentage', v_accuracy_percentage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Stale Job Cleanup & Background Tasks
CREATE OR REPLACE FUNCTION public.cleanup_stale_ai_jobs()
RETURNS INTEGER AS $$
DECLARE
  v_cleaned_count INTEGER;
BEGIN
  UPDATE public.ai_generation_jobs
  SET status = 'failed',
      error_message = 'Job timed out after standing in processing state > 15 minutes',
      updated_at = NOW()
  WHERE status = 'processing'
    AND updated_at < NOW() - INTERVAL '15 minutes';

  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
  RETURN v_cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Expired Subscriptions Worker Function
CREATE OR REPLACE FUNCTION public.process_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND current_period_end < NOW();

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. pg_cron Setup (Safe conditional execution)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule stale job cleanup every 10 minutes
    PERFORM cron.schedule('cleanup-stale-ai-jobs', '*/10 * * * *', 'SELECT public.cleanup_stale_ai_jobs()');
    -- Schedule expired subscription check daily at midnight
    PERFORM cron.schedule('process-expired-subscriptions', '0 0 * * *', 'SELECT public.process_expired_subscriptions()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Graceful fallthrough if pg_cron is not enabled on local instance
  NULL;
END;
$$;
