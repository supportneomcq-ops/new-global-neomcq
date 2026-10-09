-- ==============================================================================
-- Migration: 034_batch1_security_foundation.sql
-- Description: Batch 1 Security Foundation for NeoMCQ
--             1. Enables RLS and sets strict ownership & access policies on:
--                - ai_discovered_exams
--                - user_exam_selections
--                - user_study_topics
--                - ai_tutor_tts_cache
--                - active_recall_batches
--             2. Hardens all SECURITY DEFINER functions with explicit authorization
--                checks, immutable search paths (search_path = public, pg_temp),
--                and revokes unauthorized public/anon execution privileges.
-- ==============================================================================

-- ==============================================================================
-- PART 1: ENABLE RLS AND CONFIGURE POLICIES ON THE 5 TARGET TABLES
-- ==============================================================================

-- 1. ai_discovered_exams
ALTER TABLE public.ai_discovered_exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_discovered_exams_select_policy" ON public.ai_discovered_exams;
DROP POLICY IF EXISTS "ai_discovered_exams_insert_policy" ON public.ai_discovered_exams;
DROP POLICY IF EXISTS "ai_discovered_exams_update_policy" ON public.ai_discovered_exams;
DROP POLICY IF EXISTS "ai_discovered_exams_delete_policy" ON public.ai_discovered_exams;

CREATE POLICY "ai_discovered_exams_select_policy"
  ON public.ai_discovered_exams
  FOR SELECT
  TO public
  USING (
    verification_status = 'approved'
    OR (auth.uid() IS NOT NULL AND discovered_by_user_id = auth.uid())
    OR (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  );

CREATE POLICY "ai_discovered_exams_insert_policy"
  ON public.ai_discovered_exams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() IS NOT NULL AND discovered_by_user_id = auth.uid())
    OR (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  );

CREATE POLICY "ai_discovered_exams_update_policy"
  ON public.ai_discovered_exams
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
  );

CREATE POLICY "ai_discovered_exams_delete_policy"
  ON public.ai_discovered_exams
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
  );

-- 2. user_exam_selections
ALTER TABLE public.user_exam_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_exam_selections_select_policy" ON public.user_exam_selections;
DROP POLICY IF EXISTS "user_exam_selections_insert_policy" ON public.user_exam_selections;
DROP POLICY IF EXISTS "user_exam_selections_update_policy" ON public.user_exam_selections;
DROP POLICY IF EXISTS "user_exam_selections_delete_policy" ON public.user_exam_selections;

CREATE POLICY "user_exam_selections_select_policy"
  ON public.user_exam_selections
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "user_exam_selections_insert_policy"
  ON public.user_exam_selections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "user_exam_selections_update_policy"
  ON public.user_exam_selections
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "user_exam_selections_delete_policy"
  ON public.user_exam_selections
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

-- 3. user_study_topics
ALTER TABLE public.user_study_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_study_topics_select_policy" ON public.user_study_topics;
DROP POLICY IF EXISTS "user_study_topics_insert_policy" ON public.user_study_topics;
DROP POLICY IF EXISTS "user_study_topics_update_policy" ON public.user_study_topics;
DROP POLICY IF EXISTS "user_study_topics_delete_policy" ON public.user_study_topics;

CREATE POLICY "user_study_topics_select_policy"
  ON public.user_study_topics
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "user_study_topics_insert_policy"
  ON public.user_study_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "user_study_topics_update_policy"
  ON public.user_study_topics
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "user_study_topics_delete_policy"
  ON public.user_study_topics
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

-- 4. ai_tutor_tts_cache (Shared global audio cache)
ALTER TABLE public.ai_tutor_tts_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_tutor_tts_cache_select_policy" ON public.ai_tutor_tts_cache;
DROP POLICY IF EXISTS "ai_tutor_tts_cache_insert_policy" ON public.ai_tutor_tts_cache;
DROP POLICY IF EXISTS "ai_tutor_tts_cache_update_policy" ON public.ai_tutor_tts_cache;
DROP POLICY IF EXISTS "ai_tutor_tts_cache_delete_policy" ON public.ai_tutor_tts_cache;

-- Public can read cached audio clips
CREATE POLICY "ai_tutor_tts_cache_select_policy"
  ON public.ai_tutor_tts_cache
  FOR SELECT
  TO public
  USING (true);

-- Authenticated users or backend services can populate audio cache
CREATE POLICY "ai_tutor_tts_cache_insert_policy"
  ON public.ai_tutor_tts_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can increment hit counts or update cache
CREATE POLICY "ai_tutor_tts_cache_update_policy"
  ON public.ai_tutor_tts_cache
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only admins can delete from TTS cache
CREATE POLICY "ai_tutor_tts_cache_delete_policy"
  ON public.ai_tutor_tts_cache
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
  );

-- 5. active_recall_batches
ALTER TABLE public.active_recall_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active_recall_batches_select_policy" ON public.active_recall_batches;
DROP POLICY IF EXISTS "active_recall_batches_insert_policy" ON public.active_recall_batches;
DROP POLICY IF EXISTS "active_recall_batches_update_policy" ON public.active_recall_batches;
DROP POLICY IF EXISTS "active_recall_batches_delete_policy" ON public.active_recall_batches;

CREATE POLICY "active_recall_batches_select_policy"
  ON public.active_recall_batches
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "active_recall_batches_insert_policy"
  ON public.active_recall_batches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "active_recall_batches_update_policy"
  ON public.active_recall_batches
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "active_recall_batches_delete_policy"
  ON public.active_recall_batches
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );


-- ==============================================================================
-- PART 2: HARDEN SECURITY DEFINER FUNCTIONS & IMMUTABLE SEARCH PATHS
-- ==============================================================================

-- 1. Helper: is_admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id AND r.name IN ('super_admin', 'admin')
  ) INTO v_is_admin;
  
  RETURN v_is_admin;
END;
$$;

-- 2. Helper: has_permission
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_perm BOOLEAN := FALSE;
BEGIN
  IF p_user_id IS NULL OR p_permission_name IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id AND p.name = p_permission_name
  ) INTO v_has_perm;
  
  RETURN v_has_perm;
END;
$$;

-- 3. credit_adjust (Restricted to service_role or verified Admin)
CREATE OR REPLACE FUNCTION public.credit_adjust(
    p_user_id uuid,
    p_amount integer,
    p_type text,
    p_reason text,
    p_admin_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_account_id UUID;
    v_new_balance INT;
    v_ledger_id UUID;
    v_effective_admin_id UUID := NULL;
    v_is_service_role BOOLEAN := (current_setting('role', true) = 'service_role');
BEGIN
    -- Authorization check: caller must be service_role OR verified admin
    IF NOT v_is_service_role THEN
        IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Unauthorized: credit_adjust requires service_role or admin privileges';
        END IF;
        v_effective_admin_id := auth.uid();
    ELSE
        v_effective_admin_id := p_admin_id;
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid parameter: p_user_id cannot be null';
    END IF;

    SELECT id INTO v_account_id
    FROM public.credit_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_account_id IS NULL THEN
        INSERT INTO public.credit_accounts (user_id, balance, reserved_balance, total_earned)
        VALUES (p_user_id, GREATEST(0, p_amount), 0, GREATEST(0, p_amount))
        RETURNING id, balance INTO v_account_id, v_new_balance;
    ELSE
        UPDATE public.credit_accounts
        SET balance = GREATEST(0, balance + p_amount),
            total_earned = CASE WHEN p_amount > 0 THEN total_earned + p_amount ELSE total_earned END,
            updated_at = now()
        WHERE id = v_account_id
        RETURNING balance INTO v_new_balance;
    END IF;

    INSERT INTO public.credit_ledger (
        account_id,
        user_id,
        amount,
        balance_after,
        transaction_type,
        reason,
        admin_id
    ) VALUES (
        v_account_id,
        p_user_id,
        p_amount,
        v_new_balance,
        p_type,
        p_reason,
        v_effective_admin_id
    ) RETURNING id INTO v_ledger_id;

    RETURN v_ledger_id;
END;
$$;

-- Revoke default public execution
REVOKE ALL ON FUNCTION public.credit_adjust(uuid, integer, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_adjust(uuid, integer, text, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.credit_adjust(uuid, integer, text, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.credit_adjust(uuid, integer, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_adjust(uuid, integer, text, text, uuid) TO postgres;


-- 4. credit_consume (Restricted to self-ownership, admin, or service_role)
CREATE OR REPLACE FUNCTION public.credit_consume(
    p_user_id uuid,
    p_amount integer,
    p_task text,
    p_job_id uuid DEFAULT NULL::uuid,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_account_id UUID;
    v_balance INT;
    v_reserved INT;
    v_ledger_id UUID;
    v_is_service_role BOOLEAN := (current_setting('role', true) = 'service_role');
BEGIN
    -- Authorization check: service_role OR self-ownership OR admin
    IF NOT v_is_service_role THEN
        IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.is_admin(auth.uid())) THEN
            RAISE EXCEPTION 'Unauthorized: Cannot consume credits for another user';
        END IF;
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid amount: Consumption amount must be positive';
    END IF;

    SELECT id, balance, reserved_balance INTO v_account_id, v_balance, v_reserved
    FROM public.credit_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'Credit account not found for user %', p_user_id;
    END IF;

    IF v_reserved >= p_amount THEN
        -- Consume from reservation
        UPDATE public.credit_accounts
        SET reserved_balance = reserved_balance - p_amount,
            total_used = total_used + p_amount,
            updated_at = now()
        WHERE id = v_account_id;
    ELSE
        -- Consume directly from balance if not reserved
        IF (v_balance + v_reserved) < p_amount THEN
            RAISE EXCEPTION 'INSUFFICIENT_CREDITS for consumption';
        END IF;
        UPDATE public.credit_accounts
        SET balance = balance - (p_amount - v_reserved),
            reserved_balance = 0,
            total_used = total_used + p_amount,
            updated_at = now()
        WHERE id = v_account_id;
    END IF;

    INSERT INTO public.credit_ledger (
        account_id,
        user_id,
        amount,
        balance_after,
        transaction_type,
        task,
        job_id,
        metadata
    ) VALUES (
        v_account_id,
        p_user_id,
        -p_amount,
        v_balance,
        'AI_USAGE',
        p_task,
        p_job_id,
        p_metadata
    ) RETURNING id INTO v_ledger_id;

    RETURN v_ledger_id;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_consume(uuid, integer, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_consume(uuid, integer, text, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.credit_consume(uuid, integer, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_consume(uuid, integer, text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_consume(uuid, integer, text, uuid, jsonb) TO postgres;


-- 5. credit_reserve (Restricted to self-ownership, admin, or service_role)
CREATE OR REPLACE FUNCTION public.credit_reserve(
    p_user_id uuid,
    p_amount integer,
    p_task text,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_balance INT;
    v_account_id UUID;
    v_ledger_id UUID;
    v_is_service_role BOOLEAN := (current_setting('role', true) = 'service_role');
BEGIN
    -- Authorization check: service_role OR self-ownership OR admin
    IF NOT v_is_service_role THEN
        IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.is_admin(auth.uid())) THEN
            RAISE EXCEPTION 'Unauthorized: Cannot reserve credits for another user';
        END IF;
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Reserve amount must be greater than zero';
    END IF;

    -- Lock credit account for update
    SELECT id, balance INTO v_account_id, v_balance
    FROM public.credit_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_account_id IS NULL THEN
        -- Auto-create account if missing
        INSERT INTO public.credit_accounts (user_id, balance, reserved_balance, total_earned)
        VALUES (p_user_id, 100, 0, 100)
        RETURNING id, balance INTO v_account_id, v_balance;
    END IF;

    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_CREDITS: Required %, Available %', p_amount, v_balance;
    END IF;

    -- Update balances
    UPDATE public.credit_accounts
    SET balance = balance - p_amount,
        reserved_balance = reserved_balance + p_amount,
        updated_at = now()
    WHERE id = v_account_id;

    -- Append to ledger
    INSERT INTO public.credit_ledger (
        account_id,
        user_id,
        amount,
        balance_after,
        transaction_type,
        task,
        metadata
    ) VALUES (
        v_account_id,
        p_user_id,
        -p_amount,
        v_balance - p_amount,
        'RESERVATION',
        p_task,
        p_metadata
    ) RETURNING id INTO v_ledger_id;

    RETURN v_ledger_id;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_reserve(uuid, integer, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_reserve(uuid, integer, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.credit_reserve(uuid, integer, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_reserve(uuid, integer, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_reserve(uuid, integer, text, jsonb) TO postgres;


-- 6. credit_release (Restricted to self-ownership, admin, or service_role)
CREATE OR REPLACE FUNCTION public.credit_release(
    p_user_id uuid,
    p_amount integer,
    p_task text,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_account_id UUID;
    v_balance INT;
    v_reserved INT;
    v_ledger_id UUID;
    v_is_service_role BOOLEAN := (current_setting('role', true) = 'service_role');
BEGIN
    -- Authorization check: service_role OR self-ownership OR admin
    IF NOT v_is_service_role THEN
        IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.is_admin(auth.uid())) THEN
            RAISE EXCEPTION 'Unauthorized: Cannot release credits for another user';
        END IF;
    END IF;

    SELECT id, balance, reserved_balance INTO v_account_id, v_balance, v_reserved
    FROM public.credit_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_account_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF p_amount > 0 AND v_reserved >= p_amount THEN
        UPDATE public.credit_accounts
        SET balance = balance + p_amount,
            reserved_balance = reserved_balance - p_amount,
            updated_at = now()
        WHERE id = v_account_id;

        INSERT INTO public.credit_ledger (
            account_id,
            user_id,
            amount,
            balance_after,
            transaction_type,
            task,
            metadata
        ) VALUES (
            v_account_id,
            p_user_id,
            p_amount,
            v_balance + p_amount,
            'RELEASE',
            p_task,
            p_metadata
        ) RETURNING id INTO v_ledger_id;
    END IF;

    RETURN v_ledger_id;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_release(uuid, integer, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_release(uuid, integer, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.credit_release(uuid, integer, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_release(uuid, integer, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_release(uuid, integer, text, jsonb) TO postgres;


-- 7. execute_exam_switch_atomic (Restricted to self-ownership, admin, or service_role)
CREATE OR REPLACE FUNCTION public.execute_exam_switch_atomic(
    p_user_id uuid,
    p_switch_request_id uuid,
    p_razorpay_payment_id text DEFAULT NULL::text,
    p_razorpay_order_id text DEFAULT NULL::text,
    p_razorpay_signature text DEFAULT NULL::text,
    p_amount numeric DEFAULT 2.00,
    p_currency text DEFAULT 'USD'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req RECORD;
  v_profile RECORD;
  v_from_name TEXT;
  v_to_name TEXT;
  v_history_id UUID;
  v_is_service_role BOOLEAN := (current_setting('role', true) = 'service_role');
BEGIN
  -- Authorization check: caller must own the account or be admin/service_role
  IF NOT v_is_service_role THEN
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.is_admin(auth.uid())) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Unauthorized: Cannot execute exam switch for another user.'
      );
    END IF;
  END IF;

  -- 1. Fetch & lock the switch request
  SELECT * INTO v_req
  FROM public.exam_switch_requests
  WHERE id = p_switch_request_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Exam switch request not found or does not belong to this user.'
    );
  END IF;

  -- 2. Idempotency guard: If already completed, return success safely
  IF v_req.status = 'switch_completed' THEN
    SELECT name INTO v_to_name FROM public.exams WHERE id = v_req.to_exam_id;
    RETURN jsonb_build_object(
      'success', true,
      'already_completed', true,
      'message', 'Exam switch was already successfully processed.',
      'to_exam_id', v_req.to_exam_id,
      'to_exam_name', v_to_name
    );
  END IF;

  -- 3. Verify request is in a switchable state
  IF v_req.status NOT IN ('pending_payment', 'payment_verified', 'processing') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot process switch: current request status is ' || v_req.status
    );
  END IF;

  -- 4. Lock user profile
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

REVOKE ALL ON FUNCTION public.execute_exam_switch_atomic(uuid, uuid, text, text, text, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_exam_switch_atomic(uuid, uuid, text, text, text, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.execute_exam_switch_atomic(uuid, uuid, text, text, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_exam_switch_atomic(uuid, uuid, text, text, text, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_exam_switch_atomic(uuid, uuid, text, text, text, numeric, text) TO postgres;


-- 8. acquire_topic_refresh_lock
CREATE OR REPLACE FUNCTION public.acquire_topic_refresh_lock(
    p_exam_id uuid,
    p_subject_id uuid,
    p_topic_id uuid,
    p_job_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_state RECORD;
  v_is_service_role BOOLEAN := (current_setting('role', true) = 'service_role');
BEGIN
  -- Authorization check: authenticated user or service_role required
  IF NOT v_is_service_role AND auth.role() != 'authenticated' THEN
    RAISE EXCEPTION 'Unauthorized: Topic refresh lock requires authenticated caller';
  END IF;

  -- Lock row or insert initial state
  SELECT * INTO v_state
  FROM public.topic_content_state
  WHERE topic_id = p_topic_id
  FOR UPDATE;

  IF v_state.id IS NULL THEN
    -- First time tracked: insert and grant lock
    INSERT INTO public.topic_content_state (
      exam_id, subject_id, topic_id, last_accessed_at, last_refreshed_at,
      next_refresh_at, refresh_status, refresh_job_id
    ) VALUES (
      p_exam_id, p_subject_id, p_topic_id, NOW(), NOW() - INTERVAL '16 days',
      NOW(), 'in_progress', p_job_id
    );
    RETURN TRUE;
  END IF;

  -- Check if 15 days have elapsed and no active job is running
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

  -- Just update last_accessed_at
  UPDATE public.topic_content_state
  SET last_accessed_at = NOW(),
      updated_at = NOW()
  WHERE topic_id = p_topic_id;

  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_topic_refresh_lock(uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.acquire_topic_refresh_lock(uuid, uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.acquire_topic_refresh_lock(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_topic_refresh_lock(uuid, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.acquire_topic_refresh_lock(uuid, uuid, uuid, text) TO postgres;


-- 9. promote_ugc_to_canonical (Strict Admin Check)
CREATE OR REPLACE FUNCTION public.promote_ugc_to_canonical(
    p_mcq_id uuid,
    p_admin_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_effective_admin_id UUID := NULL;
  v_is_service_role BOOLEAN := (current_setting('role', true) = 'service_role');
BEGIN
  -- Strict verification: Do NOT trust caller-supplied p_admin_id without checking auth.uid()
  IF NOT v_is_service_role THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin authorization required');
    END IF;
    v_effective_admin_id := auth.uid();
  ELSE
    v_effective_admin_id := COALESCE(p_admin_id, auth.uid());
  END IF;

  UPDATE public.mcqs
  SET visibility = 'PUBLIC_CANONICAL',
      status = 'approved',
      reviewed = true,
      reviewed_by = v_effective_admin_id,
      reviewed_at = NOW()
  WHERE id = p_mcq_id;

  RETURN jsonb_build_object('success', true, 'message', 'Content promoted to PUBLIC_CANONICAL');
END;
$$;

REVOKE ALL ON FUNCTION public.promote_ugc_to_canonical(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_ugc_to_canonical(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.promote_ugc_to_canonical(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_ugc_to_canonical(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_ugc_to_canonical(uuid, uuid) TO postgres;


-- 10. get_admin_analytics_summary (Strict Admin Check)
CREATE OR REPLACE FUNCTION public.get_admin_analytics_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_users INT;
    v_active_users INT;
    v_signups_today INT;
    v_mcq_attempts INT;
    v_ai_requests INT;
    v_ai_cost NUMERIC;
    v_total_revenue NUMERIC;
    v_total_subscriptions INT;
    v_active_subscriptions INT;
    v_failed_jobs INT;
    v_is_service_role BOOLEAN := (current_setting('role', true) = 'service_role');
BEGIN
    -- Strict authorization check: must be admin or service_role
    IF NOT v_is_service_role THEN
        IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Unauthorized: Admin privileges required to view analytics summary';
        END IF;
    END IF;

    SELECT count(*) INTO v_total_users FROM public.profiles;
    
    SELECT count(DISTINCT user_id) INTO v_active_users 
    FROM public.study_sessions 
    WHERE completed_at >= (now() - interval '30 days');

    SELECT count(*) INTO v_signups_today 
    FROM public.profiles 
    WHERE created_at >= date_trunc('day', now());

    SELECT count(*) INTO v_mcq_attempts FROM public.study_sessions;

    SELECT count(*) INTO v_ai_requests FROM public.ai_jobs;
    
    SELECT COALESCE(sum(actual_provider_cost), 0) INTO v_ai_cost FROM public.ai_cost_events;

    SELECT COALESCE(sum(amount), 0) INTO v_total_revenue FROM public.payments WHERE status = 'completed';
    
    SELECT count(*) INTO v_total_subscriptions FROM public.subscriptions;

    SELECT count(*) INTO v_active_subscriptions FROM public.subscriptions WHERE status = 'active';

    SELECT count(*) INTO v_failed_jobs FROM public.ai_jobs WHERE status = 'failed';

    RETURN jsonb_build_object(
        'total_users', COALESCE(v_total_users, 0),
        'active_users_30d', COALESCE(v_active_users, 0),
        'signups_today', COALESCE(v_signups_today, 0),
        'mcq_attempts', COALESCE(v_mcq_attempts, 0),
        'ai_requests', COALESCE(v_ai_requests, 0),
        'ai_cost_usd', COALESCE(v_ai_cost, 0),
        'total_revenue', COALESCE(v_total_revenue, 0),
        'total_subscriptions', COALESCE(v_total_subscriptions, 0),
        'active_subscriptions', COALESCE(v_active_subscriptions, 0),
        'failed_ai_jobs', COALESCE(v_failed_jobs, 0)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_analytics_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_analytics_summary() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics_summary() TO postgres;


-- 11. submit_mcq_answer_atomic (Ownership verification)
CREATE OR REPLACE FUNCTION public.submit_mcq_answer_atomic(
    p_user_id uuid,
    p_mcq_id uuid,
    p_selected_index integer DEFAULT NULL::integer,
    p_selected_option text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mcq RECORD;
  v_is_correct BOOLEAN := FALSE;
  v_correct_answer TEXT;
  v_options JSONB;
  v_chosen_option TEXT;
  v_effective_user_id UUID := NULL;
  v_is_service_role BOOLEAN := (current_setting('role', true) = 'service_role');
BEGIN
  -- Verify caller identity: If authenticated, prevent submitting on behalf of another user
  IF auth.uid() IS NOT NULL THEN
    IF p_user_id IS NOT NULL AND p_user_id != auth.uid() AND NOT v_is_service_role AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: Cannot submit MCQ answer on behalf of another user';
    END IF;
    v_effective_user_id := auth.uid();
  ELSE
    -- Unauthenticated / guest mode (user_id remains NULL)
    v_effective_user_id := NULL;
  END IF;

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

  -- Record attempt
  INSERT INTO public.mcq_attempts (user_id, mcq_id, selected_option, selected_index, is_correct)
  VALUES (v_effective_user_id, p_mcq_id, v_chosen_option, p_selected_index, v_is_correct);

  RETURN jsonb_build_object(
    'success', true,
    'is_correct', v_is_correct,
    'correct_answer', v_correct_answer,
    'explanation', v_mcq.explanation,
    'rationale', v_mcq.rationale,
    'clinical_pearl', v_mcq.clinical_pearl
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_mcq_answer_atomic(uuid, uuid, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_mcq_answer_atomic(uuid, uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mcq_answer_atomic(uuid, uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_mcq_answer_atomic(uuid, uuid, integer, text) TO postgres;


-- 12. record_payment_event (Restricted to service_role or admin)
CREATE OR REPLACE FUNCTION public.record_payment_event(
    p_provider text,
    p_event_id text,
    p_event_type text,
    p_payload_hash text,
    p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing public.payment_events%ROWTYPE;
    v_is_service_role BOOLEAN := (current_setting('role', true) = 'service_role');
BEGIN
    -- Authorization check
    IF NOT v_is_service_role THEN
        IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Unauthorized: record_payment_event requires service_role or admin privileges';
        END IF;
    END IF;

    SELECT * INTO v_existing
    FROM public.payment_events
    WHERE provider = p_provider AND provider_event_id = p_event_id;

    IF v_existing.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'is_duplicate', true,
            'event_id', v_existing.id,
            'status', v_existing.status,
            'processed_at', v_existing.processed_at
        );
    END IF;

    INSERT INTO public.payment_events (
        provider,
        provider_event_id,
        event_type,
        payload_hash,
        payload,
        status
    ) VALUES (
        p_provider,
        p_event_id,
        p_event_type,
        p_payload_hash,
        p_payload,
        'processing'
    ) RETURNING id INTO v_existing.id;

    RETURN jsonb_build_object(
        'is_duplicate', false,
        'event_id', v_existing.id,
        'status', 'processing'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_payment_event(text, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_payment_event(text, text, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_payment_event(text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_event(text, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_payment_event(text, text, text, text, jsonb) TO postgres;


-- 13. resolve_exam_alias
CREATE OR REPLACE FUNCTION public.resolve_exam_alias(p_query text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT := lower(trim(p_query));
    v_exam_id UUID;
BEGIN
    IF v_clean IS NULL OR v_clean = '' THEN
        RETURN NULL;
    END IF;

    -- 1. Exact match on code, slug, or name
    SELECT id INTO v_exam_id
    FROM public.exams
    WHERE lower(code) = v_clean OR lower(slug) = v_clean OR lower(name) = v_clean
    LIMIT 1;

    IF v_exam_id IS NOT NULL THEN
        RETURN v_exam_id;
    END IF;

    -- 2. Alias match
    SELECT exam_id INTO v_exam_id
    FROM public.exam_aliases
    WHERE lower(alias) = v_clean
    LIMIT 1;

    IF v_exam_id IS NOT NULL THEN
        RETURN v_exam_id;
    END IF;

    -- 3. Fuzzy ILIKE match
    SELECT id INTO v_exam_id
    FROM public.exams
    WHERE lower(name) ILIKE '%' || v_clean || '%'
    LIMIT 1;

    RETURN v_exam_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_exam_alias(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_exam_alias(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_exam_alias(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_exam_alias(text) TO postgres;


-- 14. get_public_mcq_by_slug
CREATE OR REPLACE FUNCTION public.get_public_mcq_by_slug(p_slug text)
RETURNS TABLE(
    id uuid,
    slug text,
    question text,
    options jsonb,
    difficulty text,
    explanation text,
    clinical_pearl text,
    exam_id uuid,
    exam_name text,
    exam_slug text,
    subject_id uuid,
    subject_name text,
    topic_id uuid,
    topic_name text,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_public_mcq_by_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_mcq_by_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_mcq_by_slug(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_mcq_by_slug(text) TO postgres;


-- 15. Trigger Functions: handle_new_user, handle_new_profile_wallet, handle_updated_at, protect_locked_exam_update
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.handle_new_profile_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.credit_accounts (user_id, balance)
  VALUES (NEW.id, 50)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_ledger (account_id, user_id, amount, balance_after, transaction_type, reason)
  SELECT id, NEW.id, 50, 50, 'PROMOTIONAL_GRANT', 'Initial free registration credit bonus'
  FROM public.credit_accounts
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_locked_exam_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;
