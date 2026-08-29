-- =====================================================================
-- 021_production_ai_content_intelligence_hardening.sql
-- NeoMCQ AI Content Intelligence Engine - Production Hardening Migration
-- =====================================================================

-- 1. Canonical AI Jobs Table Enhancements & Idempotency Key
CREATE TABLE IF NOT EXISTS public.ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.exam_subjects(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.exam_topics(id) ON DELETE SET NULL,
    task TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'full_pack',
    target_version INT NOT NULL DEFAULT 1,
    idempotency_key TEXT,
    priority INT NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'queued', -- queued, running, completed, failed, retrying, dead_letter
    provider TEXT,
    model TEXT,
    input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload JSONB DEFAULT '{}'::jsonb,
    progress_stage TEXT DEFAULT 'Preparing canonical context...',
    step_percentage INT DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    heartbeat_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_code TEXT,
    error TEXT,
    provider_request_id TEXT,
    credits_reserved NUMERIC(10,4) NOT NULL DEFAULT 0,
    credits_consumed NUMERIC(10,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist if table was already created
ALTER TABLE public.ai_jobs
    ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'full_pack',
    ADD COLUMN IF NOT EXISTS target_version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS progress_stage TEXT DEFAULT 'Preparing canonical context...',
    ADD COLUMN IF NOT EXISTS step_percentage INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS locked_by TEXT,
    ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS error_code TEXT,
    ADD COLUMN IF NOT EXISTS provider_request_id TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Unique Idempotency Index: Only ONE active (queued or running) job per idempotency key across all distributed workers
DROP INDEX IF EXISTS idx_ai_jobs_active_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_jobs_active_idempotency 
    ON public.ai_jobs(idempotency_key) 
    WHERE status IN ('queued', 'running', 'processing', 'pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON public.ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id ON public.ai_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_topic_id ON public.ai_jobs(topic_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at ON public.ai_jobs(created_at DESC);

-- Backward compatibility view for any legacy references to ai_generation_jobs
CREATE OR REPLACE VIEW public.ai_generation_jobs AS SELECT * FROM public.ai_jobs;

-- 2. Content Versions Table (Append-only historical audit)
CREATE TABLE IF NOT EXISTS public.content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    asset_type TEXT NOT NULL DEFAULT 'topic',
    version INT NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT true,
    generation_reason TEXT NOT NULL DEFAULT 'FIRST_GENERATION', -- FIRST_GENERATION, REFRESH_30_DAYS, FORCE_REFRESH, CACHE_30_DAYS
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    provider TEXT,
    model TEXT,
    input_tokens INT DEFAULT 0,
    cached_input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    actual_cost_usd NUMERIC(10,6) DEFAULT 0,
    quality_score NUMERIC(5,2) DEFAULT 95.00,
    content_count INT DEFAULT 0,
    change_summary TEXT,
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(asset_id, asset_type, version)
);

CREATE INDEX IF NOT EXISTS idx_content_versions_asset ON public.content_versions(asset_id, asset_type, version DESC);
CREATE INDEX IF NOT EXISTS idx_content_versions_current ON public.content_versions(asset_id, is_current);

-- 3. AI Cost Events Table (Immutable COGS and token consumption ledger)
CREATE TABLE IF NOT EXISTS public.ai_cost_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
    content_version_id UUID REFERENCES public.content_versions(id) ON DELETE SET NULL,
    task_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INT NOT NULL DEFAULT 0,
    cached_input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    reasoning_tokens INT NOT NULL DEFAULT 0,
    actual_provider_cost NUMERIC(12,6) NOT NULL DEFAULT 0,
    revenue_allocated NUMERIC(12,6) NOT NULL DEFAULT 0,
    ai_infrastructure_cost NUMERIC(12,6) NOT NULL DEFAULT 0,
    credits_deducted NUMERIC(10,4) NOT NULL DEFAULT 0,
    margin_percent NUMERIC(6,2) DEFAULT 60.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cost_events_user ON public.ai_cost_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_events_created ON public.ai_cost_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_events_provider_model ON public.ai_cost_events(provider, model);

-- 4. Immutable AI Credit Ledger Table
CREATE TABLE IF NOT EXISTS public.ai_credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
    content_version_id UUID REFERENCES public.content_versions(id) ON DELETE SET NULL,
    provider TEXT,
    model TEXT,
    task_type TEXT,
    input_tokens INT DEFAULT 0,
    cached_input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    actual_provider_cost_usd NUMERIC(12,6) DEFAULT 0,
    internal_credit_cost NUMERIC(10,4) NOT NULL DEFAULT 0,
    credit_balance_before NUMERIC(10,4) NOT NULL DEFAULT 0,
    credit_balance_after NUMERIC(10,4) NOT NULL DEFAULT 0,
    transaction_type TEXT NOT NULL DEFAULT 'AI_DEDUCTION',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_user ON public.ai_credit_ledger(user_id, created_at DESC);

-- 5. Database-Backed AI Model Registry Table
CREATE TABLE IF NOT EXISTS public.ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL, -- gemini, openai
    model_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    task_types TEXT[] NOT NULL DEFAULT '{}',
    tier TEXT NOT NULL DEFAULT 'flash', -- reasoning, flash, embedding, economy
    input_price_per_1m NUMERIC(10,4) NOT NULL,
    cached_input_price_per_1m NUMERIC(10,4) NOT NULL,
    output_price_per_1m NUMERIC(10,4) NOT NULL,
    batch_input_price NUMERIC(10,4),
    batch_output_price NUMERIC(10,4),
    context_limit INT NOT NULL DEFAULT 1048576,
    max_output_tokens INT NOT NULL DEFAULT 8192,
    supports_structured_output BOOLEAN NOT NULL DEFAULT true,
    supports_thinking BOOLEAN NOT NULL DEFAULT false,
    supports_batch BOOLEAN NOT NULL DEFAULT false,
    supports_caching BOOLEAN NOT NULL DEFAULT true,
    enabled BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 1,
    fallback_model_id TEXT,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_until TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed production AI Model Registry with verified available Gemini & OpenAI models
INSERT INTO public.ai_models (
    provider, model_id, display_name, task_types, tier,
    input_price_per_1m, cached_input_price_per_1m, output_price_per_1m,
    context_limit, max_output_tokens, supports_structured_output, supports_thinking, supports_caching,
    enabled, priority, fallback_model_id
) VALUES
    ('gemini', 'gemini-3.7-flash', 'Gemini 3.7 Flash (Hybrid Reasoning)', ARRAY['FIRST_GENERATION', 'TOPIC_CONTENT_REFRESH', 'AI_TUTOR_COMPLEX', 'QUESTION_QUALITY_REVIEW'], 'reasoning', 0.1000, 0.0250, 0.4000, 1048576, 8192, true, true, true, true, 1, 'gpt-4o'),
    ('gemini', 'gemini-3.5-flash', 'Gemini 3.5 Flash', ARRAY['MCQ_GENERATION', 'NOTE_GENERATION', 'FLASHCARD_GENERATION', 'REVISION_SHEET'], 'flash', 0.0750, 0.0187, 0.3000, 1048576, 8192, true, false, true, true, 1, 'gpt-4o-mini'),
    ('gemini', 'gemini-2.5-flash', 'Gemini 2.5 Flash', ARRAY['STUDY_PLAN', 'SHORT_EXPLANATION', 'AI_TUTOR_SIMPLE', 'CANONICAL_CLASSIFICATION'], 'economy', 0.0750, 0.0187, 0.3000, 1048576, 8192, true, false, true, true, 2, 'gpt-4o-mini'),
    ('gemini', 'gemini-1.5-pro', 'Gemini 1.5 Pro', ARRAY['CLINICAL_ARBITRATION', 'DISPUTED_QUESTIONS'], 'reasoning', 1.2500, 0.3125, 5.0000, 2097152, 8192, true, false, true, true, 3, 'gpt-4o'),
    ('openai', 'gpt-4o-mini', 'GPT-4o Mini', ARRAY['MCQ_GENERATION', 'FLASHCARD_GENERATION', 'AI_TUTOR_SIMPLE', 'FALLBACK_STANDARD'], 'flash', 0.1500, 0.0750, 0.6000, 128000, 16384, true, false, true, true, 1, 'gemini-3.5-flash'),
    ('openai', 'gpt-4o', 'GPT-4o (Omni)', ARRAY['FIRST_GENERATION', 'TOPIC_CONTENT_REFRESH', 'FALLBACK_REASONING'], 'reasoning', 2.5000, 1.2500, 10.0000, 128000, 16384, true, false, true, true, 2, 'gemini-3.7-flash'),
    ('openai', 'o3-mini', 'o3-mini (High Reasoning)', ARRAY['CLINICAL_REASONING', 'COMPLEX_DEDUCTION'], 'reasoning', 1.1000, 0.5500, 4.4000, 200000, 65536, true, true, true, true, 3, 'gemini-3.7-flash')
ON CONFLICT (model_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    input_price_per_1m = EXCLUDED.input_price_per_1m,
    cached_input_price_per_1m = EXCLUDED.cached_input_price_per_1m,
    output_price_per_1m = EXCLUDED.output_price_per_1m,
    context_limit = EXCLUDED.context_limit,
    updated_at = now();

-- 6. AI Task Routing Matrix Table
CREATE TABLE IF NOT EXISTS public.ai_task_routing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    tier TEXT NOT NULL DEFAULT 'flash',
    primary_provider TEXT NOT NULL DEFAULT 'gemini',
    primary_model TEXT NOT NULL DEFAULT 'gemini-3.5-flash',
    fallback_provider TEXT NOT NULL DEFAULT 'openai',
    fallback_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    credit_cost NUMERIC(6,2) NOT NULL DEFAULT 2.00,
    temperature NUMERIC(3,2) NOT NULL DEFAULT 0.70,
    max_tokens INT NOT NULL DEFAULT 4096,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Task Routing Matrix
INSERT INTO public.ai_task_routing (
    task_type, display_name, description, tier, primary_provider, primary_model, fallback_provider, fallback_model, credit_cost, temperature, max_tokens, enabled
) VALUES
    ('FIRST_GENERATION', 'First-Time Canonical Topic Generation', 'Premium reasoning model for high-yield canonical assets', 'reasoning', 'gemini', 'gemini-3.7-flash', 'openai', 'gpt-4o', 3.00, 0.40, 8192, true),
    ('TOPIC_CONTENT_REFRESH', '30-Day Topic Content Refresh', 'Scheduled version update for canonical topic', 'reasoning', 'gemini', 'gemini-3.7-flash', 'openai', 'gpt-4o', 2.50, 0.40, 8192, true),
    ('MCQ_GENERATION', 'Standard MCQ Generation', 'Fast, accurate single-choice board questions', 'flash', 'gemini', 'gemini-3.5-flash', 'openai', 'gpt-4o-mini', 1.50, 0.60, 4096, true),
    ('FLASHCARD_GENERATION', 'Flashcard Generation', 'Active recall front/back clinical cards', 'flash', 'gemini', 'gemini-3.5-flash', 'openai', 'gpt-4o-mini', 1.00, 0.50, 2048, true),
    ('NOTE_GENERATION', 'Comprehensive Study Notes', 'Structured markdown high-yield guide', 'flash', 'gemini', 'gemini-3.5-flash', 'openai', 'gpt-4o-mini', 2.00, 0.50, 6144, true),
    ('STUDY_PLAN', 'Custom AI Study Plan', 'Curriculum timeline and task scheduler', 'economy', 'gemini', 'gemini-2.5-flash', 'openai', 'gpt-4o-mini', 1.50, 0.70, 3072, true),
    ('SHORT_EXPLANATION', 'Instant Doubt Clarification', 'Concise clinical explanation', 'economy', 'gemini', 'gemini-2.5-flash', 'openai', 'gpt-4o-mini', 0.50, 0.60, 1024, true),
    ('AI_TUTOR_SIMPLE', 'AI Tutor Conversation', 'Interactive student dialogue', 'economy', 'gemini', 'gemini-2.5-flash', 'openai', 'gpt-4o-mini', 0.75, 0.70, 2048, true),
    ('AI_TUTOR_COMPLEX', 'AI Tutor Clinical Reasoning', 'Deep multi-step diagnostic reasoning', 'reasoning', 'gemini', 'gemini-3.7-flash', 'openai', 'gpt-4o', 2.00, 0.30, 4096, true),
    ('QUESTION_QUALITY_REVIEW', 'Automated Question Review & Audit', 'Clinical accuracy and distractor audit', 'reasoning', 'gemini', 'gemini-3.7-flash', 'openai', 'gpt-4o', 1.00, 0.20, 2048, true)
ON CONFLICT (task_type) DO UPDATE SET
    primary_provider = EXCLUDED.primary_provider,
    primary_model = EXCLUDED.primary_model,
    fallback_provider = EXCLUDED.fallback_provider,
    fallback_model = EXCLUDED.fallback_model,
    credit_cost = EXCLUDED.credit_cost,
    updated_at = now();

-- 7. Pricing Snapshots & Pricing History Tables (10-Day Automated Sync Audit)
CREATE TABLE IF NOT EXISTS public.ai_pricing_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_models INT NOT NULL DEFAULT 0,
    models_changed INT NOT NULL DEFAULT 0,
    pricing_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_pricing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    model_id TEXT NOT NULL,
    old_input_price NUMERIC(10,4) NOT NULL,
    new_input_price NUMERIC(10,4) NOT NULL,
    old_output_price NUMERIC(10,4) NOT NULL,
    new_output_price NUMERIC(10,4) NOT NULL,
    changed_by TEXT NOT NULL DEFAULT 'AUTO_SYNC',
    reason TEXT NOT NULL DEFAULT '10-Day Official Provider Pricing Sync',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. AI System Settings (Admin Configurable Economics & 60% Budget Safety Margin)
CREATE TABLE IF NOT EXISTS public.ai_system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_price_basic NUMERIC(10,2) NOT NULL DEFAULT 9.00,
    plan_price_pro NUMERIC(10,2) NOT NULL DEFAULT 29.00,
    plan_price_mastery NUMERIC(10,2) NOT NULL DEFAULT 99.00,
    plan_price_institutional NUMERIC(10,2) NOT NULL DEFAULT 499.00,
    ai_budget_percentage NUMERIC(5,2) NOT NULL DEFAULT 60.00, -- Target 60% of paid subscription value as maximum AI cost budget
    credit_value_usd NUMERIC(8,4) NOT NULL DEFAULT 0.0100, -- $0.01 per credit
    monthly_credit_allocation_basic INT NOT NULL DEFAULT 540,
    monthly_credit_allocation_pro INT NOT NULL DEFAULT 1740,
    monthly_credit_allocation_mastery INT NOT NULL DEFAULT 5940,
    monthly_credit_allocation_institutional INT NOT NULL DEFAULT 29940,
    overage_policy TEXT NOT NULL DEFAULT 'throttle', -- throttle, stop, charge
    maximum_single_generation_cost NUMERIC(6,4) NOT NULL DEFAULT 0.2500,
    emergency_kill_switch BOOLEAN NOT NULL DEFAULT false,
    daily_user_ai_budget_usd NUMERIC(6,2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial AI System Settings
INSERT INTO public.ai_system_settings (
    plan_price_basic, plan_price_pro, plan_price_mastery, plan_price_institutional,
    ai_budget_percentage, credit_value_usd,
    monthly_credit_allocation_basic, monthly_credit_allocation_pro, monthly_credit_allocation_mastery, monthly_credit_allocation_institutional,
    overage_policy, maximum_single_generation_cost, emergency_kill_switch, daily_user_ai_budget_usd
) VALUES (
    9.00, 29.00, 99.00, 499.00,
    60.00, 0.0100,
    540, 1740, 5940, 29940,
    'throttle', 0.2500, false, 5.00
) ON CONFLICT DO NOTHING;

-- 9. Safe Provider Key Vault Metadata Table (Secrets remain server-side)
CREATE TABLE IF NOT EXISTS public.ai_provider_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL, -- gemini, openai
    key_alias TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 1,
    rate_limit_rpm INT NOT NULL DEFAULT 60,
    daily_limit INT NOT NULL DEFAULT 10000,
    monthly_limit INT NOT NULL DEFAULT 300000,
    health_status TEXT NOT NULL DEFAULT 'Healthy', -- Healthy, Degraded, Unavailable, Not Configured
    failure_count INT NOT NULL DEFAULT 0,
    cooldown_until TIMESTAMPTZ,
    last_health_check TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.ai_provider_keys (provider, key_alias, enabled, priority, rate_limit_rpm, health_status)
VALUES
    ('gemini', 'Google Gemini Key 1 (Primary)', true, 1, 120, 'Healthy'),
    ('openai', 'OpenAI Key 1 (Fallback)', true, 1, 60, 'Healthy')
ON CONFLICT DO NOTHING;

-- 10. Enable Row Level Security (RLS) and grant secure policies
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cost_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pricing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;

-- Public read for models, task routing, and system settings
DROP POLICY IF EXISTS "Public read ai_models" ON public.ai_models;
CREATE POLICY "Public read ai_models" ON public.ai_models FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read ai_task_routing" ON public.ai_task_routing;
CREATE POLICY "Public read ai_task_routing" ON public.ai_task_routing FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read ai_system_settings" ON public.ai_system_settings;
CREATE POLICY "Public read ai_system_settings" ON public.ai_system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read content_versions" ON public.content_versions;
CREATE POLICY "Public read content_versions" ON public.content_versions FOR SELECT USING (true);

-- User policies for jobs and ledger
DROP POLICY IF EXISTS "Users can view own ai_jobs" ON public.ai_jobs;
CREATE POLICY "Users can view own ai_jobs" ON public.ai_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own credit ledger" ON public.ai_credit_ledger;
CREATE POLICY "Users can view own credit ledger" ON public.ai_credit_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Full management for Service Role
DROP POLICY IF EXISTS "Service role manages ai_jobs" ON public.ai_jobs;
CREATE POLICY "Service role manages ai_jobs" ON public.ai_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages content_versions" ON public.content_versions;
CREATE POLICY "Service role manages content_versions" ON public.content_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages ai_cost_events" ON public.ai_cost_events;
CREATE POLICY "Service role manages ai_cost_events" ON public.ai_cost_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages ai_credit_ledger" ON public.ai_credit_ledger;
CREATE POLICY "Service role manages ai_credit_ledger" ON public.ai_credit_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages ai_models" ON public.ai_models;
CREATE POLICY "Service role manages ai_models" ON public.ai_models FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages ai_task_routing" ON public.ai_task_routing;
CREATE POLICY "Service role manages ai_task_routing" ON public.ai_task_routing FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages ai_pricing_snapshots" ON public.ai_pricing_snapshots;
CREATE POLICY "Service role manages ai_pricing_snapshots" ON public.ai_pricing_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages ai_pricing_history" ON public.ai_pricing_history;
CREATE POLICY "Service role manages ai_pricing_history" ON public.ai_pricing_history FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages ai_system_settings" ON public.ai_system_settings;
CREATE POLICY "Service role manages ai_system_settings" ON public.ai_system_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages ai_provider_keys" ON public.ai_provider_keys;
CREATE POLICY "Service role manages ai_provider_keys" ON public.ai_provider_keys FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 11. Atomic Distributed Job Claim RPC Function
CREATE OR REPLACE FUNCTION public.claim_next_ai_job(p_worker_id TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    exam_id UUID,
    subject_id UUID,
    topic_id UUID,
    task TEXT,
    content_type TEXT,
    target_version INT,
    provider TEXT,
    model TEXT,
    input_payload JSONB,
    priority INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job_id UUID;
BEGIN
    SELECT j.id INTO v_job_id
    FROM public.ai_jobs j
    WHERE j.status = 'queued'
    ORDER BY j.priority DESC, j.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_job_id IS NOT NULL THEN
        UPDATE public.ai_jobs
        SET 
            status = 'running',
            started_at = now(),
            locked_at = now(),
            locked_by = p_worker_id,
            heartbeat_at = now(),
            attempts = attempts + 1,
            updated_at = now()
        WHERE ai_jobs.id = v_job_id;

        RETURN QUERY
        SELECT 
            j.id, j.user_id, j.exam_id, j.subject_id, j.topic_id,
            j.task, j.content_type, j.target_version,
            j.provider, j.model, j.input_payload, j.priority
        FROM public.ai_jobs j
        WHERE j.id = v_job_id;
    END IF;
END;
$$;
