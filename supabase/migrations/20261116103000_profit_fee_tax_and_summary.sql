-- Separate tax collected from customers from GST/VAT charged on Razorpay processing fees.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gateway_fee_tax_amount numeric(12,2);

ALTER TABLE public.platform_profit_allocations
  ADD COLUMN IF NOT EXISTS gateway_fee_tax_amount numeric(12,2) NOT NULL DEFAULT 0;

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
    -- Exclude customer sales tax plus gateway fee and tax on the gateway fee.
    v_net := GREATEST(
      NEW.amount
      - COALESCE(NEW.tax_amount, 0)
      - NEW.processing_fee_amount
      - COALESCE(NEW.gateway_fee_tax_amount, 0),
      0
    );
    v_owner := ROUND(v_net * 0.20, 2);
    v_operating := v_net - v_owner;
    v_status := 'allocated';
  END IF;

  INSERT INTO public.platform_profit_allocations (
    payment_id, user_id, plan_code, currency, gross_amount, tax_amount,
    processing_fee_amount, gateway_fee_tax_amount, net_collected_amount,
    owner_allocation_rate, owner_profit_amount, operating_pool_amount,
    allocation_status, updated_at
  ) VALUES (
    NEW.id, NEW.user_id, NEW.plan_code, NEW.currency, NEW.amount,
    COALESCE(NEW.tax_amount, 0), NEW.processing_fee_amount,
    COALESCE(NEW.gateway_fee_tax_amount, 0), v_net, 0.20, v_owner,
    v_operating, v_status, now()
  )
  ON CONFLICT (payment_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    plan_code = EXCLUDED.plan_code,
    currency = EXCLUDED.currency,
    gross_amount = EXCLUDED.gross_amount,
    tax_amount = EXCLUDED.tax_amount,
    processing_fee_amount = EXCLUDED.processing_fee_amount,
    gateway_fee_tax_amount = EXCLUDED.gateway_fee_tax_amount,
    net_collected_amount = EXCLUDED.net_collected_amount,
    owner_allocation_rate = 0.20,
    owner_profit_amount = EXCLUDED.owner_profit_amount,
    operating_pool_amount = EXCLUDED.operating_pool_amount,
    allocation_status = EXCLUDED.allocation_status,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE VIEW public.platform_profit_allocation_summary
WITH (security_invoker = true)
AS
SELECT
  currency,
  allocation_status,
  COUNT(*)::bigint AS payment_count,
  COALESCE(SUM(gross_amount), 0)::numeric(14,2) AS gross_amount,
  COALESCE(SUM(tax_amount), 0)::numeric(14,2) AS customer_tax_amount,
  COALESCE(SUM(processing_fee_amount), 0)::numeric(14,2) AS processing_fee_amount,
  COALESCE(SUM(gateway_fee_tax_amount), 0)::numeric(14,2) AS gateway_fee_tax_amount,
  COALESCE(SUM(net_collected_amount), 0)::numeric(14,2) AS net_collected_amount,
  COALESCE(SUM(owner_profit_amount), 0)::numeric(14,2) AS owner_profit_amount,
  COALESCE(SUM(operating_pool_amount), 0)::numeric(14,2) AS operating_pool_amount
FROM public.platform_profit_allocations
GROUP BY currency, allocation_status;

REVOKE ALL ON public.platform_profit_allocation_summary FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.platform_profit_allocation_summary TO service_role;
