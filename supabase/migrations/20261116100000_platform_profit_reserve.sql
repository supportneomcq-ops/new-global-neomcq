-- Separate the owner allocation from the operating pool for every captured subscription payment.
-- Amounts are stored in the payment's original currency. Convert only in reporting, using an auditable FX source.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_code text,
  ADD COLUMN IF NOT EXISTS payment_category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS processing_fee_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS tax_amount numeric(12,2);

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_payment_category_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_category_check
  CHECK (payment_category IN ('subscription', 'credit_topup', 'exam_switch', 'other'));

CREATE TABLE IF NOT EXISTS public.platform_profit_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  plan_code text NOT NULL CHECK (plan_code IN ('PRO', 'MAX', 'ELITE')),
  currency text NOT NULL,
  gross_amount numeric(12,2) NOT NULL CHECK (gross_amount >= 0),
  tax_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  processing_fee_amount numeric(12,2),
  net_collected_amount numeric(12,2),
  owner_allocation_rate numeric(5,4) NOT NULL DEFAULT 0.2000 CHECK (owner_allocation_rate = 0.2000),
  owner_profit_amount numeric(12,2),
  operating_pool_amount numeric(12,2),
  allocation_status text NOT NULL DEFAULT 'pending_settlement'
    CHECK (allocation_status IN ('pending_settlement', 'allocated', 'reversed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_profit_allocations_status_created_idx
  ON public.platform_profit_allocations (allocation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS platform_profit_allocations_user_created_idx
  ON public.platform_profit_allocations (user_id, created_at DESC);

ALTER TABLE public.platform_profit_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_profit_allocations FROM anon, authenticated;
GRANT ALL ON public.platform_profit_allocations TO service_role;

CREATE OR REPLACE FUNCTION public.allocate_subscription_payment_profit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_net numeric(12,2);
  v_owner numeric(12,2);
  v_operating numeric(12,2);
  v_status text;
BEGIN
  IF NEW.payment_category <> 'subscription' OR NEW.plan_code IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'refunded' THEN
    UPDATE public.platform_profit_allocations
       SET allocation_status = 'reversed',
           updated_at = now()
     WHERE payment_id = NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.status <> 'captured' THEN
    RETURN NEW;
  END IF;

  IF NEW.processing_fee_amount IS NULL THEN
    v_status := 'pending_settlement';
    v_net := NULL;
    v_owner := NULL;
    v_operating := NULL;
  ELSE
    -- Tax collected for the government and gateway fees are not platform revenue.
    v_net := GREATEST(NEW.amount - COALESCE(NEW.tax_amount, 0) - NEW.processing_fee_amount, 0);
    v_owner := ROUND(v_net * 0.20, 2);
    v_operating := v_net - v_owner;
    v_status := 'allocated';
  END IF;

  INSERT INTO public.platform_profit_allocations (
    payment_id, user_id, plan_code, currency, gross_amount, tax_amount,
    processing_fee_amount, net_collected_amount, owner_allocation_rate,
    owner_profit_amount, operating_pool_amount, allocation_status, updated_at
  ) VALUES (
    NEW.id, NEW.user_id, NEW.plan_code, NEW.currency, NEW.amount,
    COALESCE(NEW.tax_amount, 0), NEW.processing_fee_amount, v_net, 0.20,
    v_owner, v_operating, v_status, now()
  )
  ON CONFLICT (payment_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    plan_code = EXCLUDED.plan_code,
    currency = EXCLUDED.currency,
    gross_amount = EXCLUDED.gross_amount,
    tax_amount = EXCLUDED.tax_amount,
    processing_fee_amount = EXCLUDED.processing_fee_amount,
    net_collected_amount = EXCLUDED.net_collected_amount,
    owner_allocation_rate = 0.20,
    owner_profit_amount = EXCLUDED.owner_profit_amount,
    operating_pool_amount = EXCLUDED.operating_pool_amount,
    allocation_status = EXCLUDED.allocation_status,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_allocate_subscription_payment_profit ON public.payments;
CREATE TRIGGER trg_allocate_subscription_payment_profit
AFTER INSERT OR UPDATE OF status, amount, currency, plan_code, payment_category,
  processing_fee_amount, tax_amount
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.allocate_subscription_payment_profit();
