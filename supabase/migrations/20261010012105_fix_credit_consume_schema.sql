-- Align credit consumption with the current credit_accounts and credit_ledger schema.
-- The previous implementation referenced legacy columns and could fail when process-ai-job
-- tried to charge for completed AI work.

CREATE OR REPLACE FUNCTION public.credit_consume(
  p_user_id uuid, p_amount integer, p_task text,
  p_job_id uuid DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_balance numeric(12,2);
  v_reserved numeric(12,2);
  v_reserved_spend numeric(12,2);
  v_direct_spend numeric(12,2);
  v_balance_after numeric(12,2);
  v_ledger_id uuid;
  v_actor_id uuid := auth.uid();
  v_is_service_role boolean := (current_setting('role', true) = 'service_role');
  v_frozen boolean;
BEGIN
  IF NOT v_is_service_role AND
     (auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid()))) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot consume credits for another user';
  END IF;
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Consumption amount must be positive';
  END IF;

  SELECT credit_balance, reserved_credits, frozen
    INTO v_balance, v_reserved, v_frozen
    FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit account not found'; END IF;
  IF v_frozen THEN RAISE EXCEPTION 'Credit account is frozen'; END IF;

  v_reserved_spend := LEAST(v_reserved, p_amount);
  v_direct_spend := p_amount - v_reserved_spend;
  IF v_balance < v_direct_spend THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS for consumption';
  END IF;
  v_balance_after := v_balance - v_direct_spend;

  UPDATE public.credit_accounts
    SET credit_balance = v_balance_after,
        reserved_credits = v_reserved - v_reserved_spend,
        lifetime_credits_used = lifetime_credits_used + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO public.credit_ledger (
    user_id, transaction_type, credits, balance_before, balance_after,
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_user_id, 'AI_USAGE', -p_amount, v_balance, v_balance_after,
    'ai_job', COALESCE(p_job_id::text, p_task),
    COALESCE(p_metadata->>'description', 'Credits consumed for AI task'), v_actor_id
  ) RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$function$;
