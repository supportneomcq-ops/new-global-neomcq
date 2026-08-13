-- Migration 015: Forensic Backend Completion (NeoMCQ Canonical Production Architecture)
-- Date: 2026-08-12

-- 1. Payment Events & Idempotency Table
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload_hash TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'received',
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT payment_events_provider_event_id_key UNIQUE (provider, provider_event_id)
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment_events" ON public.payment_events
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages payment_events" ON public.payment_events
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- 2. Canonical AI Jobs Queue Table
CREATE TABLE IF NOT EXISTS public.ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE SET NULL,
    task TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'queued', -- queued, running, completed, failed, retrying, cancelled
    provider TEXT,
    model TEXT,
    input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload JSONB DEFAULT '{}'::jsonb,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    error TEXT,
    credits_reserved INT NOT NULL DEFAULT 0,
    credits_consumed INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_jobs" ON public.ai_jobs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_jobs" ON public.ai_jobs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all ai_jobs" ON public.ai_jobs
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages ai_jobs" ON public.ai_jobs
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- 3. System Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit_logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages audit_logs" ON public.audit_logs
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- 4. Entity Alias Recognition Tables
CREATE TABLE IF NOT EXISTS public.exam_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    alias TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subject_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
    alias TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.topic_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.exam_topics(id) ON DELETE CASCADE,
    alias TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read exam_aliases" ON public.exam_aliases FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Public read subject_aliases" ON public.subject_aliases FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Public read topic_aliases" ON public.topic_aliases FOR SELECT TO authenticated, anon USING (true);


-- 5. ATOMIC CREDIT SYSTEM RPCs

-- Reserve Credits
CREATE OR REPLACE FUNCTION public.credit_reserve(
    p_user_id UUID,
    p_amount INT,
    p_task TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance INT;
    v_account_id UUID;
    v_ledger_id UUID;
BEGIN
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


-- Consume Credits
CREATE OR REPLACE FUNCTION public.credit_consume(
    p_user_id UUID,
    p_amount INT,
    p_task TEXT,
    p_job_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_account_id UUID;
    v_balance INT;
    v_reserved INT;
    v_ledger_id UUID;
BEGIN
    SELECT id, balance, reserved_balance INTO v_account_id, v_balance, v_reserved
    FROM public.credit_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'Credit account not found for user %', p_user_id;
    END IF;

    IF p_amount > 0 THEN
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
    END IF;

    RETURN v_ledger_id;
END;
$$;


-- Release Credit Reservation
CREATE OR REPLACE FUNCTION public.credit_release(
    p_user_id UUID,
    p_amount INT,
    p_task TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_account_id UUID;
    v_balance INT;
    v_reserved INT;
    v_ledger_id UUID;
BEGIN
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


-- Admin Credit Adjustment
CREATE OR REPLACE FUNCTION public.credit_adjust(
    p_user_id UUID,
    p_amount INT,
    p_type TEXT, -- PURCHASE, PROMOTIONAL_GRANT, ADMIN_ADJUSTMENT, REFUND
    p_reason TEXT,
    p_admin_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_account_id UUID;
    v_new_balance INT;
    v_ledger_id UUID;
BEGIN
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
        p_admin_id
    ) RETURNING id INTO v_ledger_id;

    RETURN v_ledger_id;
END;
$$;


-- 6. RECORD PAYMENT EVENT (IDEMPOTENCY RPC)
CREATE OR REPLACE FUNCTION public.record_payment_event(
    p_provider TEXT,
    p_event_id TEXT,
    p_event_type TEXT,
    p_payload_hash TEXT,
    p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing public.payment_events%ROWTYPE;
BEGIN
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


-- 7. REAL-TIME ADMIN ANALYTICS SUMMARY RPC
CREATE OR REPLACE FUNCTION public.get_admin_analytics_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
BEGIN
    SELECT count(*) INTO v_total_users FROM public.profiles;
    
    SELECT count(DISTINCT user_id) INTO v_active_users 
    FROM public.study_sessions 
    WHERE created_at >= (now() - interval '30 days');

    SELECT count(*) INTO v_signups_today 
    FROM public.profiles 
    WHERE created_at >= date_trunc('day', now());

    SELECT count(*) INTO v_mcq_attempts FROM public.study_sessions;
    SELECT count(*) INTO v_ai_requests FROM public.ai_jobs;
    
    SELECT COALESCE(sum(estimated_cost_usd), 0) INTO v_ai_cost FROM public.ai_cost_events;
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


-- 8. ENTITY ALIAS RESOLUTION RPCs
CREATE OR REPLACE FUNCTION public.resolve_exam_alias(p_query TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean TEXT := lower(trim(p_query));
    v_exam_id UUID;
BEGIN
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
