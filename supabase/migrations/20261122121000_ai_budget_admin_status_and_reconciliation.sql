CREATE TABLE IF NOT EXISTS public.ai_budget_reservation_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.ai_budget_reservations(id) ON DELETE RESTRICT,
  previous_provider_cost_usd numeric(14,6) NOT NULL DEFAULT 0,
  previous_infrastructure_cost_usd numeric(14,6) NOT NULL DEFAULT 0,
  final_provider_cost_usd numeric(14,6) NOT NULL CHECK (final_provider_cost_usd >= 0),
  final_infrastructure_cost_usd numeric(14,6) NOT NULL DEFAULT 0 CHECK (final_infrastructure_cost_usd >= 0),
  reason text NOT NULL CHECK (length(trim(reason)) >= 5),
  reconciled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_budget_reconciliations_reservation_idx
  ON public.ai_budget_reservation_reconciliations(reservation_id, created_at DESC);

ALTER TABLE public.ai_budget_reservation_reconciliations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_budget_reservation_reconciliations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.ai_budget_reservation_reconciliations TO service_role;
DROP POLICY IF EXISTS "Service role manages AI budget reconciliations" ON public.ai_budget_reservation_reconciliations;
CREATE POLICY "Service role manages AI budget reconciliations"
  ON public.ai_budget_reservation_reconciliations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.resolve_uncertain_platform_ai_budget(
  p_reservation_id uuid,
  p_final_provider_cost_usd numeric,
  p_final_infrastructure_cost_usd numeric DEFAULT 0,
  p_reason text DEFAULT NULL,
  p_reconciled_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_reservation public.ai_budget_reservations%ROWTYPE;
  v_previous_provider_cost numeric(14,6);
  v_previous_infrastructure_cost numeric(14,6);
  v_total_cost numeric(14,6);
BEGIN
  IF p_final_provider_cost_usd IS NULL OR p_final_provider_cost_usd < 0
     OR COALESCE(p_final_infrastructure_cost_usd, 0) < 0
     OR COALESCE(length(trim(p_reason)), 0) < 5 THEN
    RAISE EXCEPTION 'Final costs and a reconciliation reason are required';
  END IF;

  v_total_cost := p_final_provider_cost_usd + GREATEST(COALESCE(p_final_infrastructure_cost_usd, 0), 0);

  PERFORM pg_advisory_xact_lock(hashtext('neomcq:platform-ai-budget'));

  SELECT * INTO v_reservation
  FROM public.ai_budget_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI budget reservation not found';
  END IF;

  IF v_reservation.status <> 'uncertain' OR v_reservation.cost_event_id IS NULL THEN
    RAISE EXCEPTION 'Only uncertain reservations with a cost event can be reconciled';
  END IF;

  SELECT actual_provider_cost, ai_infrastructure_cost
    INTO v_previous_provider_cost, v_previous_infrastructure_cost
  FROM public.ai_cost_events
  WHERE id = v_reservation.cost_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked AI cost event not found';
  END IF;

  INSERT INTO public.ai_budget_reservation_reconciliations (
    reservation_id, previous_provider_cost_usd, previous_infrastructure_cost_usd,
    final_provider_cost_usd, final_infrastructure_cost_usd, reason, reconciled_by
  ) VALUES (
    p_reservation_id, COALESCE(v_previous_provider_cost, 0),
    COALESCE(v_previous_infrastructure_cost, 0), p_final_provider_cost_usd,
    GREATEST(COALESCE(p_final_infrastructure_cost_usd, 0), 0), trim(p_reason), p_reconciled_by
  );

  UPDATE public.ai_cost_events
  SET actual_provider_cost = p_final_provider_cost_usd,
      ai_infrastructure_cost = GREATEST(COALESCE(p_final_infrastructure_cost_usd, 0), 0)
  WHERE id = v_reservation.cost_event_id;

  UPDATE public.ai_budget_reservations
  SET actual_cost_usd = v_total_cost,
      reserved_amount_usd = 0,
      status = 'settled',
      metadata = metadata || jsonb_build_object(
        'reconciled', true,
        'reconciliation_reason', trim(p_reason),
        'reconciled_by', p_reconciled_by,
        'previous_provider_cost_usd', COALESCE(v_previous_provider_cost, 0),
        'previous_infrastructure_cost_usd', COALESCE(v_previous_infrastructure_cost, 0)
      ),
      updated_at = now(),
      settled_at = now()
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', p_reservation_id,
    'status', 'settled',
    'final_provider_cost_usd', p_final_provider_cost_usd,
    'final_infrastructure_cost_usd', GREATEST(COALESCE(p_final_infrastructure_cost_usd, 0), 0),
    'final_total_cost_usd', v_total_cost,
    'released_held_budget_usd', v_reservation.reserved_amount_usd
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_uncertain_platform_ai_budget(uuid, numeric, numeric, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_uncertain_platform_ai_budget(uuid, numeric, numeric, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_platform_ai_budget_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  WITH allocation_totals AS (
    SELECT
      COALESCE(SUM(ai_budget_amount_usd) FILTER (WHERE allocation_status = 'allocated'), 0)::numeric(14,6) AS funded_ai_budget_usd,
      COALESCE(SUM(net_collected_amount) FILTER (WHERE allocation_status = 'allocated' AND currency = 'USD'), 0)::numeric(14,2) AS usd_net_collections,
      COUNT(*) FILTER (WHERE allocation_status = 'pending_fx_conversion')::integer AS pending_fx_count,
      COUNT(*) FILTER (WHERE allocation_status = 'pending_settlement')::integer AS pending_settlement_count
    FROM public.platform_profit_allocations
  ),
  cost_totals AS (
    SELECT
      COALESCE(SUM(actual_provider_cost), 0)::numeric(14,6) AS provider_spend_usd,
      COALESCE(SUM(ai_infrastructure_cost), 0)::numeric(14,6) AS infrastructure_spend_usd
    FROM public.ai_cost_events
  ),
  reservation_totals AS (
    SELECT
      COALESCE(SUM(reserved_amount_usd) FILTER (WHERE status IN ('reserved','uncertain')), 0)::numeric(14,6) AS held_budget_usd,
      COUNT(*) FILTER (WHERE status = 'reserved')::integer AS active_reservations,
      COUNT(*) FILTER (WHERE status = 'uncertain')::integer AS uncertain_reservations
    FROM public.ai_budget_reservations
  ),
  currency_breakdown AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'currency', currency,
      'allocation_status', allocation_status,
      'payment_count', payment_count,
      'net_collected_amount', net_collected_amount,
      'owner_profit_amount', owner_profit_amount,
      'operations_amount', operations_amount,
      'ai_budget_amount', ai_budget_amount,
      'ai_budget_amount_usd', ai_budget_amount_usd
    ) ORDER BY currency, allocation_status), '[]'::jsonb) AS rows
    FROM (
      SELECT currency, allocation_status, COUNT(*)::integer AS payment_count,
        COALESCE(SUM(net_collected_amount),0)::numeric(14,2) AS net_collected_amount,
        COALESCE(SUM(owner_profit_amount),0)::numeric(14,2) AS owner_profit_amount,
        COALESCE(SUM(operations_amount),0)::numeric(14,2) AS operations_amount,
        COALESCE(SUM(ai_budget_amount),0)::numeric(14,2) AS ai_budget_amount,
        COALESCE(SUM(ai_budget_amount_usd),0)::numeric(14,6) AS ai_budget_amount_usd
      FROM public.platform_profit_allocations
      GROUP BY currency, allocation_status
    ) grouped
  ),
  latest_rates AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'base_currency', base_currency,
      'quote_currency', quote_currency,
      'rate', rate,
      'source', source,
      'observed_at', observed_at,
      'fetched_at', fetched_at
    ) ORDER BY fetched_at DESC), '[]'::jsonb) AS rows
    FROM (
      SELECT base_currency, quote_currency, rate, source, observed_at, fetched_at
      FROM public.platform_fx_rates
      ORDER BY fetched_at DESC
      LIMIT 10
    ) latest
  )
  SELECT jsonb_build_object(
    'funded_ai_budget_usd', a.funded_ai_budget_usd,
    'eligible_net_revenue_usd', ROUND(a.funded_ai_budget_usd / 0.60, 6),
    'owner_share_usd', ROUND(a.funded_ai_budget_usd / 3, 6),
    'operations_share_usd', ROUND(a.funded_ai_budget_usd / 3, 6),
    'provider_spend_usd', c.provider_spend_usd,
    'infrastructure_spend_usd', c.infrastructure_spend_usd,
    'total_spend_usd', c.provider_spend_usd + c.infrastructure_spend_usd,
    'held_budget_usd', r.held_budget_usd,
    'available_budget_usd', a.funded_ai_budget_usd - c.provider_spend_usd - c.infrastructure_spend_usd - r.held_budget_usd,
    'pending_fx_allocations', a.pending_fx_count,
    'pending_settlement_allocations', a.pending_settlement_count,
    'active_reservations', r.active_reservations,
    'uncertain_reservations', r.uncertain_reservations,
    'allocation_breakdown', b.rows,
    'latest_fx_rates', f.rows
  )
  FROM allocation_totals a
  CROSS JOIN cost_totals c
  CROSS JOIN reservation_totals r
  CROSS JOIN currency_breakdown b
  CROSS JOIN latest_rates f;
$$;

REVOKE ALL ON FUNCTION public.get_platform_ai_budget_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_ai_budget_status() TO service_role;