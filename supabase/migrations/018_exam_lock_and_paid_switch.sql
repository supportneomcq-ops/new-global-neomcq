-- =====================================================================
-- 018. EXAM LOCK & PAID EXAM SWITCH ($2 USD) ARCHITECTURE
-- =====================================================================

-- 1. Enhance public.profiles with locked exam state & switch counter
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exam_locked BOOLEAN DEFAULT TRUE NOT NULL,
  ADD COLUMN IF NOT EXISTS exam_selected_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS exam_switch_count INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_current_exam_id ON public.profiles(current_exam_id);

-- Backfill current_exam_id from user_exams if null
UPDATE public.profiles p
SET current_exam_id = ue.exam_id,
    exam_selected_at = COALESCE(ue.created_at, NOW()),
    exam_locked = TRUE
FROM (
  SELECT DISTINCT ON (user_id) user_id, exam_id, created_at
  FROM public.user_exams
  ORDER BY user_id, created_at ASC
) ue
WHERE p.id = ue.user_id AND p.current_exam_id IS NULL;

-- 2. Create exam_switch_requests Table
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

-- 3. Create exam_switch_history Table (Audit Trail)
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

-- 4. Enable Row Level Security
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

-- 5. ATOMIC EXAM SWITCH RPC FUNCTION (Idempotent, Transactional)
CREATE OR REPLACE FUNCTION public.execute_exam_switch_atomic(
  p_user_id UUID,
  p_switch_request_id UUID,
  p_razorpay_payment_id TEXT,
  p_razorpay_order_id TEXT,
  p_razorpay_signature TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT 2.00,
  p_currency TEXT DEFAULT 'USD'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.exam_switch_requests%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_from_name TEXT;
  v_to_name TEXT;
  v_history_id UUID;
  v_existing_payment_switch UUID;
BEGIN
  -- 1. Lock switch request row for update
  SELECT * INTO v_req
  FROM public.exam_switch_requests
  WHERE id = p_switch_request_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_req.id IS NULL THEN
    -- Try resolving by razorpay_order_id if switch request id not passed
    IF p_razorpay_order_id IS NOT NULL THEN
      SELECT * INTO v_req
      FROM public.exam_switch_requests
      WHERE razorpay_order_id = p_razorpay_order_id AND user_id = p_user_id
      FOR UPDATE;
    END IF;
  END IF;

  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Exam switch request not found for this user.'
    );
  END IF;

  -- 2. Idempotency check: If already completed, return existing success state
  IF v_req.status = 'switch_completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'message', 'Exam switch already finalized.',
      'from_exam_id', v_req.from_exam_id,
      'to_exam_id', v_req.to_exam_id,
      'completed_at', v_req.completed_at
    );
  END IF;

  -- 3. Prevent Replay Attack: Verify payment ID hasn't been used in another completed switch
  IF p_razorpay_payment_id IS NOT NULL THEN
    SELECT id INTO v_existing_payment_switch
    FROM public.exam_switch_history
    WHERE payment_reference = p_razorpay_payment_id;

    IF v_existing_payment_switch IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Payment reference has already been redeemed for an exam switch.'
      );
    END IF;
  END IF;

  -- 4. Lock Profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found.'
    );
  END IF;

  -- 5. Validate exams
  IF v_req.from_exam_id = v_req.to_exam_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Source and target exams cannot be identical.'
    );
  END IF;

  SELECT name INTO v_from_name FROM public.exams WHERE id = v_req.from_exam_id;
  SELECT name INTO v_to_name FROM public.exams WHERE id = v_req.to_exam_id;

  IF v_to_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target exam does not exist in registry.'
    );
  END IF;

  -- 6. Perform the atomic update on public.profiles
  UPDATE public.profiles
  SET current_exam_id = v_req.to_exam_id,
      exam_locked = TRUE,
      exam_selected_at = NOW(),
      exam_switch_count = COALESCE(exam_switch_count, 0) + 1,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- 7. Upsert user_exams for the new target exam (WITHOUT deleting previous exam data!)
  INSERT INTO public.user_exams (user_id, exam_id, status, target_score, created_at)
  VALUES (p_user_id, v_req.to_exam_id, 'in_progress', 85.0, NOW())
  ON CONFLICT (user_id, exam_id) DO UPDATE
  SET status = 'in_progress';

  -- 8. Record in exam_switch_history
  INSERT INTO public.exam_switch_history (
    user_id,
    from_exam_id,
    to_exam_id,
    amount,
    currency,
    payment_reference,
    switch_request_id,
    switched_at
  ) VALUES (
    p_user_id,
    v_req.from_exam_id,
    v_req.to_exam_id,
    COALESCE(p_amount, v_req.amount),
    COALESCE(p_currency, v_req.currency),
    COALESCE(p_razorpay_payment_id, p_razorpay_order_id, 'manual_admin'),
    v_req.id,
    NOW()
  ) RETURNING id INTO v_history_id;

  -- 9. Update the switch request
  UPDATE public.exam_switch_requests
  SET status = 'switch_completed',
      razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_payment_id),
      razorpay_signature = COALESCE(p_razorpay_signature, razorpay_signature),
      completed_at = NOW(),
      metadata = jsonb_build_object(
        'history_id', v_history_id,
        'from_exam_name', v_from_name,
        'to_exam_name', v_to_name
      )
  WHERE id = v_req.id;

  -- 10. Record in general payments table if razorpay_payment_id exists
  IF p_razorpay_payment_id IS NOT NULL THEN
    INSERT INTO public.payments (
      user_id,
      amount,
      currency,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      status,
      webhook_payload,
      created_at
    ) VALUES (
      p_user_id,
      COALESCE(p_amount, 2.00),
      COALESCE(p_currency, 'USD'),
      p_razorpay_payment_id,
      p_razorpay_order_id,
      p_razorpay_signature,
      'captured',
      jsonb_build_object('type', 'exam_switch', 'from', v_from_name, 'to', v_to_name),
      NOW()
    ) ON CONFLICT (razorpay_payment_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Exam switched successfully to ' || v_to_name,
    'from_exam_id', v_req.from_exam_id,
    'from_exam_name', v_from_name,
    'to_exam_id', v_req.to_exam_id,
    'to_exam_name', v_to_name,
    'switch_count', COALESCE(v_profile.exam_switch_count, 0) + 1,
    'history_id', v_history_id
  );
END;
$$;

-- 6. SECURITY TRIGGER TO PREVENT DIRECT CLIENT BYPASS OF LOCKED EXAM
CREATE OR REPLACE FUNCTION public.protect_locked_exam_update()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- Service role always allowed
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Check if caller is admin
  IF auth.uid() IS NOT NULL THEN
    v_is_admin := public.is_admin(auth.uid());
    IF v_is_admin THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Block direct modifications to current_exam_id if exam is locked and not empty
  IF OLD.current_exam_id IS NOT NULL AND NEW.current_exam_id IS DISTINCT FROM OLD.current_exam_id THEN
    -- Check if user has an active pro/unlimited subscription
    IF NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      JOIN public.subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = NEW.id 
        AND s.status = 'active'
        AND (p.slug ILIKE '%unlimited%' OR p.slug ILIKE '%pro%' OR p.slug ILIKE '%all-access%')
    ) THEN
      RAISE EXCEPTION 'Security Policy Violation: Free plan accounts cannot modify current_exam_id directly. Please use the official $2 USD exam switch flow.';
    END IF;
  END IF;

  -- Block unauthorized unlocking of exam_locked flag
  IF OLD.exam_locked = TRUE AND NEW.exam_locked = FALSE THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      JOIN public.subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = NEW.id AND s.status = 'active'
    ) THEN
      RAISE EXCEPTION 'Security Policy Violation: Free plan accounts cannot unlock exam_locked.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_protect_locked_exam ON public.profiles;
CREATE TRIGGER trigger_protect_locked_exam
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_locked_exam_update();
