const fs = require('fs');
const path = require('path');
const pg = require('pg');

async function run() {
  const rawUrl = process.env.POSTGRES_URL || "postgres://postgres.exzpqrqflfhawgtnzxqx:g5vkvUL3aUJJe8cM@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";
  const connectionString = rawUrl.split('?')[0];

  console.log("Connecting to Supabase PostgreSQL Database for Phase 12...");
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected successfully to database!");

    const migrationSql = `
    -- 1. AI Model Pricing Table (Versioned)
    CREATE TABLE IF NOT EXISTS public.ai_model_pricing (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_cost_per_1m NUMERIC(12, 4) NOT NULL,
      cached_input_cost_per_1m NUMERIC(12, 4),
      output_cost_per_1m NUMERIC(12, 4) NOT NULL,
      batch_input_cost_per_1m NUMERIC(12, 4),
      batch_output_cost_per_1m NUMERIC(12, 4),
      image_cost NUMERIC(12, 4) DEFAULT 0,
      audio_cost NUMERIC(12, 4) DEFAULT 0,
      effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      effective_until TIMESTAMPTZ,
      currency TEXT DEFAULT 'USD' NOT NULL,
      source TEXT,
      active BOOLEAN DEFAULT TRUE NOT NULL,
      UNIQUE(provider, model, effective_from)
    );

    CREATE INDEX IF NOT EXISTS idx_ai_model_pricing_lookup ON public.ai_model_pricing(provider, model, active);

    -- 2. AI Task Routing Table (Configurable Task-to-Model Rules)
    CREATE TABLE IF NOT EXISTS public.ai_task_routing (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      task_type TEXT UNIQUE NOT NULL,
      primary_provider TEXT NOT NULL,
      primary_model TEXT NOT NULL,
      fallback_provider TEXT,
      fallback_model TEXT,
      max_input_tokens INTEGER DEFAULT 10000 NOT NULL,
      max_output_tokens INTEGER DEFAULT 2000 NOT NULL,
      reasoning_level TEXT CHECK (reasoning_level IN ('low', 'medium', 'high')) DEFAULT 'medium' NOT NULL,
      temperature NUMERIC(3, 2) DEFAULT 0.70 NOT NULL,
      cost_ceiling NUMERIC(10, 4) DEFAULT 0.50 NOT NULL,
      quality_tier TEXT CHECK (quality_tier IN ('cheap', 'balanced', 'premium')) DEFAULT 'balanced' NOT NULL,
      credit_cost NUMERIC(10, 2) DEFAULT 1.00 NOT NULL,
      enabled BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    -- 3. AI Cost Events (Logging raw token usage, provider cost, margin on server-side)
    CREATE TABLE IF NOT EXISTS public.ai_cost_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      task_type TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0 NOT NULL,
      cached_input_tokens INTEGER DEFAULT 0 NOT NULL,
      output_tokens INTEGER DEFAULT 0 NOT NULL,
      reasoning_tokens INTEGER DEFAULT 0,
      actual_provider_cost NUMERIC(12, 6) DEFAULT 0.000000 NOT NULL,
      revenue_allocated NUMERIC(10, 4) DEFAULT 0.0000 NOT NULL,
      ai_infrastructure_cost NUMERIC(12, 6) DEFAULT 0.000000 NOT NULL,
      credits_deducted NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_cost_events_user_id ON public.ai_cost_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_cost_events_task ON public.ai_cost_events(task_type);
    CREATE INDEX IF NOT EXISTS idx_ai_cost_events_model ON public.ai_cost_events(model);

    -- 4. Credit Accounts / Wallets Table
    CREATE TABLE IF NOT EXISTS public.credit_accounts (
      user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
      credit_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
      lifetime_credits_purchased NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
      lifetime_credits_granted NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
      lifetime_credits_used NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
      lifetime_credits_expired NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
      reserved_credits NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
      frozen BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    -- 5. Credit Ledger (Append-only immutable record of transactions)
    CREATE TABLE IF NOT EXISTS public.credit_ledger (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
      transaction_type TEXT CHECK (transaction_type IN ('PURCHASE', 'SUBSCRIPTION_GRANT', 'PROMOTIONAL_GRANT', 'AI_USAGE', 'REFUND', 'EXPIRATION', 'ADMIN_ADJUSTMENT', 'REVERSAL', 'RESERVATION', 'RELEASE')) NOT NULL,
      credits NUMERIC(10, 2) NOT NULL,
      balance_before NUMERIC(12, 2) NOT NULL,
      balance_after NUMERIC(12, 2) NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON public.credit_ledger(user_id);

    -- 6. Credit Packs Table
    CREATE TABLE IF NOT EXISTS public.credit_packs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      price_usd NUMERIC(10, 2) NOT NULL,
      credits NUMERIC(10, 2) NOT NULL,
      bonus_credits NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
      active BOOLEAN DEFAULT TRUE NOT NULL,
      expiry_days INTEGER,
      display_order INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    -- 7. Subscription Plan AI Limits & Grants Map
    CREATE TABLE IF NOT EXISTS public.plan_ai_limits (
      plan_id UUID PRIMARY KEY REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
      monthly_credit_grant NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
      fair_use_allowance BOOLEAN DEFAULT FALSE NOT NULL,
      concurrency_limit INTEGER DEFAULT 3 NOT NULL,
      rate_limit_per_minute INTEGER DEFAULT 15 NOT NULL,
      priority INTEGER DEFAULT 1 NOT NULL,
      daily_safety_threshold NUMERIC(10, 2) DEFAULT 50.00 NOT NULL
    );

    -- 8. AI Margin Rules (centralized financial margins configuration)
    CREATE TABLE IF NOT EXISTS public.ai_margin_rules (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      target_margin NUMERIC(5, 2) DEFAULT 40.00 NOT NULL,
      yellow_warning_threshold NUMERIC(5, 2) DEFAULT 30.00 NOT NULL,
      red_danger_threshold NUMERIC(5, 2) DEFAULT 20.00 NOT NULL,
      infrastructure_cost_coefficient NUMERIC(5, 2) DEFAULT 5.00 NOT NULL,
      payment_fee_coefficient NUMERIC(5, 2) DEFAULT 3.00 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    -- 9. AI Cost Alerts Table (circuit breakers, anomalies, cost alarms)
    CREATE TABLE IF NOT EXISTS public.ai_cost_alerts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      alert_type TEXT CHECK (alert_type IN ('daily_cost_spike', 'user_abuse', 'plan_margin_drop', 'provider_error_spike')) NOT NULL,
      severity TEXT CHECK (severity IN ('info', 'warning', 'critical')) NOT NULL,
      threshold_value NUMERIC(12, 4) NOT NULL,
      current_value NUMERIC(12, 4) NOT NULL,
      message TEXT NOT NULL,
      status TEXT CHECK (status IN ('active', 'resolved')) DEFAULT 'active' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      resolved_at TIMESTAMPTZ
    );

    -- RLS ENABLING
    ALTER TABLE public.ai_model_pricing ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_task_routing ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_cost_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.plan_ai_limits ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_margin_rules ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_cost_alerts ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    DROP POLICY IF EXISTS "Public read ai_model_pricing" ON public.ai_model_pricing;
    CREATE POLICY "Public read ai_model_pricing" ON public.ai_model_pricing FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admin write ai_model_pricing" ON public.ai_model_pricing;
    CREATE POLICY "Admin write ai_model_pricing" ON public.ai_model_pricing FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Public read ai_task_routing" ON public.ai_task_routing;
    CREATE POLICY "Public read ai_task_routing" ON public.ai_task_routing FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admin write ai_task_routing" ON public.ai_task_routing;
    CREATE POLICY "Admin write ai_task_routing" ON public.ai_task_routing FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Users read own ai_cost_events" ON public.ai_cost_events;
    CREATE POLICY "Users read own ai_cost_events" ON public.ai_cost_events FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admin write ai_cost_events" ON public.ai_cost_events;
    CREATE POLICY "Admin write ai_cost_events" ON public.ai_cost_events FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Users read own credit_account" ON public.credit_accounts;
    CREATE POLICY "Users read own credit_account" ON public.credit_accounts FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admin write credit_accounts" ON public.credit_accounts;
    CREATE POLICY "Admin write credit_accounts" ON public.credit_accounts FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Users read own ledger" ON public.credit_ledger;
    CREATE POLICY "Users read own ledger" ON public.credit_ledger FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admin write credit_ledger" ON public.credit_ledger;
    CREATE POLICY "Admin write credit_ledger" ON public.credit_ledger FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Public read credit_packs" ON public.credit_packs;
    CREATE POLICY "Public read credit_packs" ON public.credit_packs FOR SELECT USING (active = true OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admin write credit_packs" ON public.credit_packs;
    CREATE POLICY "Admin write credit_packs" ON public.credit_packs FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Public read plan_ai_limits" ON public.plan_ai_limits;
    CREATE POLICY "Public read plan_ai_limits" ON public.plan_ai_limits FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admin write plan_ai_limits" ON public.plan_ai_limits;
    CREATE POLICY "Admin write plan_ai_limits" ON public.plan_ai_limits FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admin view margin_rules" ON public.ai_margin_rules;
    CREATE POLICY "Admin view margin_rules" ON public.ai_margin_rules FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admin view ai_cost_alerts" ON public.ai_cost_alerts;
    CREATE POLICY "Admin view ai_cost_alerts" ON public.ai_cost_alerts FOR ALL USING (public.is_admin(auth.uid()));

    -- Profile create wallet trigger function
    CREATE OR REPLACE FUNCTION public.handle_new_profile_wallet()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.credit_accounts (user_id, credit_balance)
      VALUES (NEW.id, 50.00) -- give 50 free promotional credits initially
      ON CONFLICT (user_id) DO NOTHING;

      INSERT INTO public.credit_ledger (user_id, transaction_type, credits, balance_before, balance_after, reference_type, reference_id, description)
      VALUES (
        NEW.id,
        'PROMOTIONAL_GRANT',
        50.00,
        0.00,
        50.00,
        'registration',
        NEW.id::text,
        'Initial free registration credit bonus'
      );

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    DROP TRIGGER IF EXISTS on_profile_created_wallet ON public.profiles;
    CREATE TRIGGER on_profile_created_wallet
      AFTER INSERT ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_wallet();
    `;

    console.log("Executing Phase 12 Database Migration SQL...");
    await client.query(migrationSql);
    console.log("Database tables created successfully!");

    // SEED INITIAL PROVIDER PRICING
    console.log("Seeding canonical model pricing data...");
    await client.query(`
      INSERT INTO public.ai_model_pricing (provider, model, input_cost_per_1m, cached_input_cost_per_1m, output_cost_per_1m, batch_input_cost_per_1m, batch_output_cost_per_1m, source, active)
      VALUES 
        ('Google Gemini AI', 'gemini-3.5-flash', 0.075, 0.0375, 0.30, 0.0375, 0.15, 'Google Official API pricing', true),
        ('Google Gemini AI', 'gemini-3.6-flash', 0.10, 0.05, 0.40, 0.05, 0.20, 'Google Official API pricing', true),
        ('Google Gemini AI', 'gemini-1.5-pro', 1.25, 0.625, 5.00, 0.625, 2.50, 'Google Official API pricing', true),
        ('OpenAI', 'gpt-4o-mini', 0.15, 0.075, 0.60, 0.075, 0.30, 'OpenAI Official API pricing', true),
        ('OpenAI', 'gpt-4o', 2.50, 1.25, 10.00, 1.25, 5.00, 'OpenAI Official API pricing', true),
        ('Anthropic', 'claude-3-5-sonnet-20241022', 3.00, 1.50, 15.00, 1.50, 7.50, 'Anthropic Official pricing', true)
      ON CONFLICT (provider, model, effective_from) DO NOTHING;
    `);

    // SEED INITIAL MARGIN RULES
    console.log("Seeding target margin parameters...");
    await client.query(`
      INSERT INTO public.ai_margin_rules (target_margin, yellow_warning_threshold, red_danger_threshold, infrastructure_cost_coefficient, payment_fee_coefficient)
      VALUES (40.00, 30.00, 20.00, 5.00, 3.00)
      ON CONFLICT DO NOTHING;
    `);

    // SEED CANONICAL TASK ROUTING CONFIGURATIONS
    console.log("Seeding canonical task routing definitions...");
    const taskRoutings = [
      ['CHAT', 'Google Gemini AI', 'gemini-3.5-flash', 'OpenAI', 'gpt-4o-mini', 8192, 1024, 'low', 0.70, 0.10, 'cheap', 1.00],
      ['AI_TUTOR', 'Google Gemini AI', 'gemini-3.6-flash', 'OpenAI', 'gpt-4o', 16384, 2048, 'medium', 0.60, 0.25, 'balanced', 2.00],
      ['MCQ_GENERATION', 'Google Gemini AI', 'gemini-3.5-flash', 'OpenAI', 'gpt-4o-mini', 12288, 4096, 'medium', 0.80, 0.30, 'balanced', 3.00],
      ['MCQ_EXPLANATION', 'Google Gemini AI', 'gemini-3.5-flash', 'OpenAI', 'gpt-4o-mini', 8192, 1024, 'low', 0.50, 0.15, 'cheap', 1.00],
      ['NOTE_GENERATION', 'Google Gemini AI', 'gemini-3.6-flash', 'OpenAI', 'gpt-4o', 32768, 8192, 'high', 0.60, 0.50, 'premium', 5.00],
      ['FLASHCARD_GENERATION', 'Google Gemini AI', 'gemini-3.5-flash', 'OpenAI', 'gpt-4o-mini', 12288, 2048, 'low', 0.70, 0.20, 'cheap', 2.00],
      ['REVISION_SHEET_GENERATION', 'Google Gemini AI', 'gemini-3.6-flash', 'OpenAI', 'gpt-4o-mini', 16384, 4096, 'medium', 0.70, 0.30, 'balanced', 4.00],
      ['STUDY_PLAN_GENERATION', 'Google Gemini AI', 'gemini-3.5-flash', 'OpenAI', 'gpt-4o-mini', 16384, 2048, 'medium', 0.50, 0.20, 'cheap', 3.00],
      ['KNOWLEDGE_RECOGNITION', 'Google Gemini AI', 'gemini-3.5-flash', 'OpenAI', 'gpt-4o-mini', 4096, 512, 'low', 0.10, 0.05, 'cheap', 1.00]
    ];

    for (const [task, pProv, pMod, fProv, fMod, mIn, mOut, rLvl, temp, costCeil, qTier, cred] of taskRoutings) {
      await client.query(`
        INSERT INTO public.ai_task_routing (task_type, primary_provider, primary_model, fallback_provider, fallback_model, max_input_tokens, max_output_tokens, reasoning_level, temperature, cost_ceiling, quality_tier, credit_cost)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (task_type) DO NOTHING;
      `, [task, pProv, pMod, fProv, fMod, mIn, mOut, rLvl, temp, costCeil, qTier, cred]);
    }

    // SEED CREDIT PACKS ($2, $5, $10, $9.99 AI Pack)
    console.log("Seeding commercial credit pack options...");
    const packs = [
      ['Starter credit boost', 2.00, 20.00, 0.00, 1],
      ['Standard credits booster', 5.00, 60.00, 5.00, 2],
      ['Professional high volume booster', 10.00, 130.00, 15.00, 3],
      ['NeoMCQ AI Pack', 9.99, 120.00, 10.00, 4]
    ];
    for (const [name, price, cred, bonus, ord] of packs) {
      await client.query(`
        INSERT INTO public.credit_packs (name, price_usd, credits, bonus_credits, active, display_order)
        VALUES ($1, $2, $3, $4, true, $5)
        ON CONFLICT DO NOTHING;
      `, [name, price, cred, bonus, ord]);
    }

    // QUERY PLANS AND SEED plan_ai_limits
    console.log("Mapping AI limits to existing subscription plans...");
    const { rows: existingPlans } = await client.query(`SELECT id, slug FROM public.subscription_plans`);
    for (const plan of existingPlans) {
      let grant = 100.00;
      let fairUse = false;
      let threshold = 50.00;
      let prio = 1;

      if (plan.slug === 'monthly-pro-pass') {
        grant = 300.00;
        fairUse = false;
        threshold = 80.00;
        prio = 2;
      } else if (plan.slug === 'annual-ultra-pass') {
        grant = 1000.00;
        fairUse = true;
        threshold = 200.00;
        prio = 3;
      } else if (plan.slug === 'global-lifetime-pass') {
        grant = 5000.00;
        fairUse = true;
        threshold = 500.00;
        prio = 4;
      }

      await client.query(`
        INSERT INTO public.plan_ai_limits (plan_id, monthly_credit_grant, fair_use_allowance, concurrency_limit, rate_limit_per_minute, priority, daily_safety_threshold)
        VALUES ($1, $2, $3, 3, 30, $4, $5)
        ON CONFLICT (plan_id) DO NOTHING;
      `, [plan.id, grant, fairUse, prio, threshold]);
    }

    // retroactively create wallets for existing users
    console.log("Checking and retroactively creating wallets for any existing users...");
    const { rows: profiles } = await client.query(`SELECT id FROM public.profiles`);
    for (const prof of profiles) {
      await client.query(`
        INSERT INTO public.credit_accounts (user_id, credit_balance)
        VALUES ($1, 50.00)
        ON CONFLICT (user_id) DO NOTHING;
      `, [prof.id]);
    }

    console.log("=================================================");
    console.log("PHASE 12 DATABASE MIGRATION SCRIPT COMPLETED!");
    console.log("=================================================");

  } catch (err) {
    console.error("Migration runtime error:", err.message || err);
  } finally {
    await client.end();
  }
}

run();
