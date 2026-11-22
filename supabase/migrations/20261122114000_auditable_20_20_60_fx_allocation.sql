ALTER TABLE public.platform_profit_allocations
  DROP CONSTRAINT IF EXISTS platform_profit_allocations_plan_code_check,
  DROP CONSTRAINT IF EXISTS platform_profit_allocations_allocation_status_check;

ALTER TABLE public.platform_profit_allocations
  ADD CONSTRAINT platform_profit_allocations_plan_code_check
    CHECK (plan_code = ANY (ARRAY['PRO','MAX','ELITE','CREDIT_TOPUP','EXAM_SWITCH','OTHER']::text[])),
  ADD CONSTRAINT platform_profit_allocations_allocation_status_check
    CHECK (allocation_status = ANY (ARRAY['pending_settlement','pending_fx_conversion','allocated','reversed']::text[]));

ALTER TABLE public.platform_profit_allocations
  ADD COLUMN IF NOT EXISTS payment_category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS operations_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS ai_budget_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS ai_budget_amount_usd numeric(14,6),
  ADD COLUMN IF NOT EXISTS fx_rate_to_usd numeric(20,10),
  ADD COLUMN IF NOT EXISTS fx_rate_source text,
  ADD COLUMN IF NOT EXISTS fx_rate_observed_at date;

ALTER TABLE public.platform_profit_allocations
  ADD CONSTRAINT platform_profit_allocations_payment_category_check
    CHECK (payment_category = ANY (ARRAY['subscription','credit_topup','exam_switch','other']::text[])),
  ADD CONSTRAINT platform_profit_allocations_operations_amount_check
    CHECK (operations_amount IS NULL OR operations_amount >= 0),
  ADD CONSTRAINT platform_profit_allocations_ai_budget_amount_check
    CHECK (ai_budget_amount IS NULL OR ai_budget_amount >= 0),
  ADD CONSTRAINT platform_profit_allocations_ai_budget_amount_usd_check
    CHECK (ai_budget_amount_usd IS NULL OR ai_budget_amount_usd >= 0),
  ADD CONSTRAINT platform_profit_allocations_fx_rate_check
    CHECK (fx_rate_to_usd IS NULL OR fx_rate_to_usd > 0);

CREATE TABLE IF NOT EXISTS public.platform_fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL CHECK (base_currency ~ '^[A-Z]{3}$'),
  quote_currency text NOT NULL CHECK (quote_currency ~ '^[A-Z]{3}$'),
  rate numeric(20,10) NOT NULL CHECK (rate > 0),
  source text NOT NULL,
  observed_at date NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_fx_rates_pair_not_equal CHECK (base_currency <> quote_currency),
  CONSTRAINT platform_fx_rates_unique_quote UNIQUE (base_currency, quote_currency, observed_at, source)
);

CREATE INDEX IF NOT EXISTS platform_fx_rates_latest_idx
  ON public.platform_fx_rates(base_currency, quote_currency, observed_at DESC, fetched_at DESC);

ALTER TABLE public.platform_fx_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_fx_rates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.platform_fx_rates TO service_role;
DROP POLICY IF EXISTS "Service role manages platform FX rates" ON public.platform_fx_rates;
CREATE POLICY "Service role manages platform FX rates"
  ON public.platform_fx_rates FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages platform profit allocations" ON public.platform_profit_allocations;
CREATE POLICY "Service role manages platform profit allocations"
  ON public.platform_profit_allocations FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.reconcile_platform_profit_allocations_fx()
RETURNS integer
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  WITH latest_rates AS (
    SELECT DISTINCT ON (base_currency, quote_currency)
      base_currency, quote_currency, rate, source, observed_at
    FROM public.platform_fx_rates
    WHERE quote_currency = 'USD'
      AND observed_at >= CURRENT_DATE - 3
    ORDER BY base_currency, quote_currency, observed_at DESC, fetched_at DESC
  )
  UPDATE public.platform_profit_allocations a
     SET fx_rate_to_usd = r.rate,
         fx_rate_source = r.source,
         fx_rate_observed_at = r.observed_at,
         ai_budget_amount_usd = ROUND(a.ai_budget_amount * r.rate, 6),
         allocation_status = 'allocated',
         updated_at = now()
    FROM latest_rates r
   WHERE a.currency = r.base_currency
     AND a.allocation_status = 'pending_fx_conversion'
     AND a.ai_budget_amount IS NOT NULL
     AND a.net_collected_amount IS NOT NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_platform_profit_allocations_fx() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_platform_profit_allocations_fx() TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_platform_profit_allocations_fx_after_rate_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM public.reconcile_platform_profit_allocations_fx();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reconcile_platform_profit_allocations_fx ON public.platform_fx_rates;
CREATE TRIGGER trg_reconcile_platform_profit_allocations_fx
AFTER INSERT OR UPDATE ON public.platform_fx_rates
FOR EACH STATEMENT
EXECUTE FUNCTION public.reconcile_platform_profit_allocations_fx_after_rate_change();

CREATE OR REPLACE FUNCTION public.allocate_subscription_payment_profit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_net numeric(12,2);
  v_owner numeric(12,2);
  v_ai numeric(12,2);
  v_operations numeric(12,2);
  v_operating numeric(12,2);
  v_ai_usd numeric(14,6);
  v_fx_rate numeric(20,10);
  v_fx_source text;
  v_fx_observed_at date;
  v_plan_code text;
  v_status text;
BEGIN
  v_plan_code := CASE
    WHEN NEW.plan_code IN ('PRO','MAX','ELITE') THEN NEW.plan_code
    WHEN NEW.payment_category = 'credit_topup' THEN 'CREDIT_TOPUP'
    WHEN NEW.payment_category = 'exam_switch' THEN 'EXAM_SWITCH'
    ELSE 'OTHER'
  END;

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
    v_ai := NULL;
    v_operations := NULL;
    v_operating := NULL;
    v_ai_usd := NULL;
    v_fx_rate := NULL;
    v_fx_source := NULL;
    v_fx_observed_at := NULL;
  ELSE
    v_net := GREATEST(
      NEW.amount
      - COALESCE(NEW.tax_amount, 0)
      - NEW.processing_fee_amount
      - COALESCE(NEW.gateway_fee_tax_amount, 0),
      0
    );

    v_owner := ROUND(v_net * 0.20, 2);
    v_ai := ROUND(v_net * 0.60, 2);
    v_operations := v_net - v_owner - v_ai;
    v_operating := v_ai + v_operations;

    IF UPPER(NEW.currency) = 'USD' THEN
      v_fx_rate := 1;
      v_fx_source := 'identity';
      v_fx_observed_at := CURRENT_DATE;
      v_ai_usd := ROUND(v_ai, 6);
      v_status := 'allocated';
    ELSE
      SELECT rate, source, observed_at
        INTO v_fx_rate, v_fx_source, v_fx_observed_at
        FROM public.platform_fx_rates
       WHERE base_currency = UPPER(NEW.currency)
         AND quote_currency = 'USD'
         AND observed_at >= CURRENT_DATE - 3
       ORDER BY observed_at DESC, fetched_at DESC
       LIMIT 1;

      IF FOUND THEN
        v_ai_usd := ROUND(v_ai * v_fx_rate, 6);
        v_status := 'allocated';
      ELSE
        v_ai_usd := NULL;
        v_status := 'pending_fx_conversion';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.platform_profit_allocations (
    payment_id, user_id, plan_code, currency, gross_amount, tax_amount,
    processing_fee_amount, gateway_fee_tax_amount, net_collected_amount,
    owner_allocation_rate, owner_profit_amount, operating_pool_amount,
    allocation_status, payment_category, operations_amount, ai_budget_amount,
    ai_budget_amount_usd, fx_rate_to_usd, fx_rate_source, fx_rate_observed_at, updated_at
  ) VALUES (
    NEW.id, NEW.user_id, v_plan_code, UPPER(NEW.currency), NEW.amount,
    COALESCE(NEW.tax_amount, 0), NEW.processing_fee_amount,
    COALESCE(NEW.gateway_fee_tax_amount, 0), v_net, 0.20, v_owner, v_operating,
    v_status, NEW.payment_category, v_operations, v_ai, v_ai_usd,
    v_fx_rate, v_fx_source, v_fx_observed_at, now()
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
    payment_category = EXCLUDED.payment_category,
    operations_amount = EXCLUDED.operations_amount,
    ai_budget_amount = EXCLUDED.ai_budget_amount,
    ai_budget_amount_usd = EXCLUDED.ai_budget_amount_usd,
    fx_rate_to_usd = EXCLUDED.fx_rate_to_usd,
    fx_rate_source = EXCLUDED.fx_rate_source,
    fx_rate_observed_at = EXCLUDED.fx_rate_observed_at,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_allocate_subscription_payment_profit ON public.payments;
CREATE TRIGGER trg_allocate_subscription_payment_profit
AFTER INSERT OR UPDATE OF status, amount, currency, plan_code, payment_category,
  processing_fee_amount, tax_amount, gateway_fee_tax_amount
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.allocate_subscription_payment_profit();

UPDATE public.platform_profit_allocations a
   SET payment_category = p.payment_category,
       plan_code = CASE
         WHEN p.plan_code IN ('PRO','MAX','ELITE') THEN p.plan_code
         WHEN p.payment_category = 'credit_topup' THEN 'CREDIT_TOPUP'
         WHEN p.payment_category = 'exam_switch' THEN 'EXAM_SWITCH'
         ELSE 'OTHER'
       END,
       operations_amount = CASE WHEN a.net_collected_amount IS NULL THEN NULL ELSE a.net_collected_amount - ROUND(a.net_collected_amount * 0.20, 2) - ROUND(a.net_collected_amount * 0.60, 2) END,
       ai_budget_amount = CASE WHEN a.net_collected_amount IS NULL THEN NULL ELSE ROUND(a.net_collected_amount * 0.60, 2) END,
       ai_budget_amount_usd = CASE WHEN UPPER(a.currency) = 'USD' AND a.net_collected_amount IS NOT NULL THEN ROUND(a.net_collected_amount * 0.60, 6) ELSE NULL END,
       fx_rate_to_usd = CASE WHEN UPPER(a.currency) = 'USD' THEN 1 ELSE NULL END,
       fx_rate_source = CASE WHEN UPPER(a.currency) = 'USD' THEN 'identity' ELSE NULL END,
       fx_rate_observed_at = CASE WHEN UPPER(a.currency) = 'USD' THEN CURRENT_DATE ELSE NULL END,
       allocation_status = CASE
         WHEN a.allocation_status = 'reversed' THEN 'reversed'
         WHEN a.net_collected_amount IS NULL THEN 'pending_settlement'
         WHEN UPPER(a.currency) = 'USD' THEN 'allocated'
         ELSE 'pending_fx_conversion'
       END,
       updated_at = now()
  FROM public.payments p
 WHERE p.id = a.payment_id;

CREATE OR REPLACE VIEW public.platform_profit_allocation_summary AS
SELECT
  currency,
  allocation_status,
  COUNT(*) AS payment_count,
  COALESCE(SUM(gross_amount), 0)::numeric(14,2) AS gross_amount,
  COALESCE(SUM(tax_amount), 0)::numeric(14,2) AS customer_tax_amount,
  COALESCE(SUM(processing_fee_amount), 0)::numeric(14,2) AS processing_fee_amount,
  COALESCE(SUM(gateway_fee_tax_amount), 0)::numeric(14,2) AS gateway_fee_tax_amount,
  COALESCE(SUM(net_collected_amount), 0)::numeric(14,2) AS net_collected_amount,
  COALESCE(SUM(owner_profit_amount), 0)::numeric(14,2) AS owner_profit_amount,
  COALESCE(SUM(operating_pool_amount), 0)::numeric(14,2) AS operating_pool_amount,
  COALESCE(SUM(operations_amount), 0)::numeric(14,2) AS operations_amount,
  COALESCE(SUM(ai_budget_amount), 0)::numeric(14,2) AS ai_budget_amount,
  COALESCE(SUM(ai_budget_amount_usd), 0)::numeric(14,6) AS ai_budget_amount_usd
FROM public.platform_profit_allocations
GROUP BY currency, allocation_status;

CREATE OR REPLACE FUNCTION public.reserve_platform_ai_budget(
  p_idempotency_key text,
  p_task_type text,
  p_provider text,
  p_model text,
  p_amount_usd numeric,
  p_user_id uuid DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing public.ai_budget_reservations%ROWTYPE;
  v_funded numeric(14,6);
  v_spent numeric(14,6);
  v_held numeric(14,6);
  v_available numeric(14,6);
  v_reservation public.ai_budget_reservations%ROWTYPE;
BEGIN
  IF COALESCE(length(trim(p_idempotency_key)), 0) = 0 OR COALESCE(length(trim(p_task_type)), 0) = 0 THEN
    RAISE EXCEPTION 'idempotency key and task type are required';
  END IF;
  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'reservation amount must be greater than zero';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('neomcq:platform-ai-budget'));

  SELECT * INTO v_existing
  FROM public.ai_budget_reservations
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'idempotency_key_already_used',
      'reservation_id', v_existing.id,
      'reservation_status', v_existing.status,
      'available_budget_usd', NULL,
      'required_budget_usd', p_amount_usd
    );
  END IF;

  SELECT COALESCE(SUM(ai_budget_amount_usd), 0)
    INTO v_funded
  FROM public.platform_profit_allocations
  WHERE allocation_status = 'allocated'
    AND ai_budget_amount_usd IS NOT NULL;

  SELECT COALESCE(SUM(actual_provider_cost), 0)
    INTO v_spent
  FROM public.ai_cost_events;

  SELECT COALESCE(SUM(reserved_amount_usd), 0)
    INTO v_held
  FROM public.ai_budget_reservations
  WHERE status IN ('reserved', 'uncertain');

  v_available := GREATEST(v_funded - v_spent - v_held, 0);

  IF v_available < p_amount_usd THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'ai_budget_not_funded',
      'reservation_id', NULL,
      'reservation_status', NULL,
      'available_budget_usd', v_available,
      'funded_budget_usd', v_funded,
      'spent_budget_usd', v_spent,
      'held_budget_usd', v_held,
      'required_budget_usd', p_amount_usd
    );
  END IF;

  INSERT INTO public.ai_budget_reservations (
    idempotency_key, task_type, provider, model, reserved_amount_usd,
    status, user_id, request_id, metadata
  ) VALUES (
    p_idempotency_key, p_task_type, p_provider, p_model, p_amount_usd,
    'reserved', p_user_id, p_request_id, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_reservation;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'reserved',
    'reservation_id', v_reservation.id,
    'reservation_status', v_reservation.status,
    'available_budget_usd', v_available - p_amount_usd,
    'funded_budget_usd', v_funded,
    'spent_budget_usd', v_spent,
    'held_budget_usd', v_held + p_amount_usd,
    'required_budget_usd', p_amount_usd
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_platform_ai_budget(text, text, text, text, numeric, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_platform_ai_budget(text, text, text, text, numeric, uuid, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_canonical_topic_prefetch_job()
RETURNS TABLE (
  job_id uuid,
  job_record jsonb,
  available_budget_usd numeric,
  required_budget_usd numeric,
  claim_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job public.ai_jobs%ROWTYPE;
  v_budget numeric(14,6) := 0;
  v_spend numeric(14,6) := 0;
  v_held numeric(14,6) := 0;
  v_required numeric(14,6) := 0.30;
  v_available numeric(14,6) := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('neomcq:canonical-topic-prefetch-worker'));

  UPDATE public.ai_jobs
     SET status = CASE WHEN COALESCE(attempts, 0) < COALESCE(max_attempts, 3) THEN 'queued' ELSE 'failed' END,
         error = 'Recovered after canonical content worker timeout.',
         progress_stage = 'Recovered for retry',
         step_percentage = 0,
         started_at = NULL,
         completed_at = CASE WHEN COALESCE(attempts, 0) < COALESCE(max_attempts, 3) THEN NULL ELSE now() END
   WHERE task = 'canonical_topic_prefetch'
     AND status = 'processing'
     AND started_at < now() - interval '20 minutes';

  SELECT COALESCE(SUM(ai_budget_amount_usd), 0)
    INTO v_budget
    FROM public.platform_profit_allocations
   WHERE allocation_status = 'allocated'
     AND ai_budget_amount_usd IS NOT NULL;

  SELECT COALESCE(SUM(actual_provider_cost), 0)
    INTO v_spend
    FROM public.ai_cost_events;

  SELECT COALESCE(SUM(reserved_amount_usd), 0)
    INTO v_held
    FROM public.ai_budget_reservations
   WHERE status IN ('reserved', 'uncertain');

  SELECT COALESCE(cost_ceiling, 0.30)
    INTO v_required
    FROM public.ai_task_routing
   WHERE task_type = 'MCQ_GENERATION'
     AND enabled = true
   LIMIT 1;
  v_required := GREATEST(COALESCE(v_required, 0.30), 0);
  v_available := GREATEST(v_budget - v_spend - v_held, 0);

  IF EXISTS (
    SELECT 1 FROM public.ai_jobs
     WHERE task = 'canonical_topic_prefetch'
       AND status = 'processing'
  ) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, v_available, v_required, 'worker_busy'::text;
    RETURN;
  END IF;

  IF v_available < v_required THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, v_available, v_required, 'ai_budget_not_funded'::text;
    RETURN;
  END IF;

  SELECT *
    INTO v_job
    FROM public.ai_jobs
   WHERE task = 'canonical_topic_prefetch'
     AND status IN ('queued', 'failed')
     AND COALESCE(attempts, 0) < COALESCE(max_attempts, 3)
   ORDER BY priority DESC, created_at ASC
   FOR UPDATE SKIP LOCKED
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, v_available, v_required, 'queue_empty'::text;
    RETURN;
  END IF;

  UPDATE public.ai_jobs
     SET status = 'processing',
         attempts = COALESCE(attempts, 0) + 1,
         started_at = now(),
         completed_at = NULL,
         error = NULL,
         progress_stage = 'Starting canonical shared-content generation',
         step_percentage = 5
   WHERE id = v_job.id
   RETURNING * INTO v_job;

  RETURN QUERY SELECT v_job.id, to_jsonb(v_job), v_available, v_required, 'claimed'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_canonical_topic_prefetch_job() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_canonical_topic_prefetch_job() TO service_role;