-- ==============================================================================
-- 028: NeoMCQ Production Subscription Plans & Authoritative Razorpay Integration
-- ==============================================================================

-- 1. Ensure subscriptions table columns are up to date
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'plan_code') THEN
    ALTER TABLE public.subscriptions ADD COLUMN plan_code VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'razorpay_customer_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN razorpay_customer_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'razorpay_payment_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN razorpay_payment_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'razorpay_plan_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN razorpay_plan_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'currency') THEN
    ALTER TABLE public.subscriptions ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'amount') THEN
    ALTER TABLE public.subscriptions ADD COLUMN amount NUMERIC(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'started_at') THEN
    ALTER TABLE public.subscriptions ADD COLUMN started_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'cancel_at_period_end') THEN
    ALTER TABLE public.subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'cancelled_at') THEN
    ALTER TABLE public.subscriptions ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Ensure webhook_events table exists for idempotent webhook auditing
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  payload JSONB NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status);

-- 3. Deactivate all legacy subscription plans
UPDATE public.subscription_plans 
SET is_active = FALSE 
WHERE slug NOT IN ('pro', 'max', 'elite');

-- 4. Seed and enforce the EXACT 3 Canonical Plans
INSERT INTO public.subscription_plans (
  name,
  slug,
  price_inr,
  price_usd,
  billing_interval,
  features,
  is_active,
  updated_at
) VALUES 
(
  'Pro',
  'pro',
  849.00,
  9.99,
  'monthly',
  '[
    "Access to 180+ Country Syllabus & Exam Blueprints",
    "Adaptive MCQ Practice & Mock Exams",
    "High-Yield Printable A4 Notes & Revision Cheat Sheets",
    "Spaced Repetition Knowledge Radar & Weakness Analysis",
    "Active Recall Flashcards & Fill-in-the-Blank Drills",
    "$2.00 USD Exam Curriculum Switching Fee"
  ]'::jsonb,
  TRUE,
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_inr = EXCLUDED.price_inr,
  price_usd = EXCLUDED.price_usd,
  billing_interval = EXCLUDED.billing_interval,
  features = EXCLUDED.features,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.subscription_plans (
  name,
  slug,
  price_inr,
  price_usd,
  billing_interval,
  features,
  is_active,
  updated_at
) VALUES 
(
  'Max',
  'max',
  1699.00,
  19.99,
  'monthly',
  '[
    "Everything in Pro included",
    "Advanced Clinical Vignettes & Complex Diagnostic Reasoning",
    "Interactive AI Tutor Whiteboard & Step Breakdowns",
    "High-Speed Neural Text-to-Speech (TTS) Audio Explanations",
    "Misconception Diagnostics & Error Pattern Analysis",
    "Priority AI Content Generation Queue",
    "$2.00 USD Exam Curriculum Switching Fee"
  ]'::jsonb,
  TRUE,
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_inr = EXCLUDED.price_inr,
  price_usd = EXCLUDED.price_usd,
  billing_interval = EXCLUDED.billing_interval,
  features = EXCLUDED.features,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.subscription_plans (
  name,
  slug,
  price_inr,
  price_usd,
  billing_interval,
  features,
  is_active,
  updated_at
) VALUES 
(
  'Elite',
  'elite',
  41999.00,
  499.00,
  'yearly',
  '[
    "Truly Unlimited Access for 1 Full Year (365 Days)",
    "FREE Unlimited Exam Curriculum Switching (Zero $2 Fees)",
    "Unlimited MCQ, Quiz, Flashcard & Note Generation",
    "Unlimited AI Tutor Interactive Lessons & Live Whiteboards",
    "Unlimited Neural Audio TTS Explanations & Eligible Video Modules",
    "Zero Artificial Credit Counters or Monthly Quotas",
    "Dedicated Tier-1 AI Compute with Ultra-Low Latency",
    "VIP Priority 24/7 Support & Rapid Syllabus Blueprint Updates"
  ]'::jsonb,
  TRUE,
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_inr = EXCLUDED.price_inr,
  price_usd = EXCLUDED.price_usd,
  billing_interval = EXCLUDED.billing_interval,
  features = EXCLUDED.features,
  is_active = TRUE,
  updated_at = NOW();

-- 5. Indexes for fast entitlement lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_code ON public.subscriptions(plan_code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON public.subscriptions(current_period_end);
