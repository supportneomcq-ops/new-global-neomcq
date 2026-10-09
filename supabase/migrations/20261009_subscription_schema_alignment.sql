-- Align the live subscription schema with the application while preserving all existing rows.
-- This migration is additive; it does not delete or rewrite existing subscription/payment records.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_code text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'active'::text,
    'authenticated'::text,
    'paused'::text,
    'cancelled'::text,
    'canceled'::text,
    'expired'::text,
    'halted'::text,
    'failed'::text,
    'past_due'::text,
    'trialing'::text
  ]));

-- The application intentionally keeps one current subscription row per user.
-- The live table is empty at the time this migration was prepared, so this is safe.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_unique_idx
  ON public.subscriptions (user_id);

-- The app's authoritative paid tiers were not present in the live plan catalog.
-- Keep legacy plans untouched and add the current plans with their configured prices.
INSERT INTO public.subscription_plans (name, slug, price_inr, price_usd, billing_interval, features, is_active)
SELECT 'Pro', 'pro', 499.00, 9.99, 'monthly', '[]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE slug = 'pro');

INSERT INTO public.subscription_plans (name, slug, price_inr, price_usd, billing_interval, features, is_active)
SELECT 'Max', 'max', 1499.00, 19.99, 'monthly', '[]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE slug = 'max');

INSERT INTO public.subscription_plans (name, slug, price_inr, price_usd, billing_interval, features, is_active)
SELECT 'Elite', 'elite', 39000.00, 499.00, 'yearly', '[]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE slug = 'elite');

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_slug_unique_idx
  ON public.subscription_plans (slug);
