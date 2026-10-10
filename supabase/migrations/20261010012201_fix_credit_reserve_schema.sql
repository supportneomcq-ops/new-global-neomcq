-- Align credit reservation with the current wallet and ledger schema.
-- Do not auto-create a wallet or silently grant credits if the account is missing.

CREATE OR REPLACE FUNCTION public.credit_reserve(
  p_user_id uuid, p_amount integer, p_task text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_balance numeric(12,2);
  v_reserved numeric(12,2);
  v_frozen boolean;
  v_ledger_id uuid;
  v_actor_id uuid := auth.uid();
  v_is_service_role boolean := (current_setting('role', true) = 'service_role');
BEGIN
  IF NOT v_is_service_role AND
     (auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid()))) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot reserve credits for another user';
  END IF;
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Reserve amount must be greater than zero';
  END IF;

  SELECT credit_balance, reserved_credits, frozen
    INTO v_balance, v_reserved, v_frozen
    FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit account not found'; END IF;
  IF v_frozen THEN RAISE EXCEPTION 'Credit account is frozen'; END IF;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS: Required %, available %', p_amount, v_balance;
  END IF;

  UPDATE public.credit_accounts
    SET credit_balance = credit_balance - p_amount,
        reserved_credits = reserved_credits + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO public.credit_ledger (
    user_id, transaction_type, credits, balance_before, balance_after,
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_user_id, 'RESERVATION', -p_amount, v_balance, v_balance - p_amount,
    'ai_task', p_task, COALESCE(p_metadata->>'description', 'Credits reserved for AI task'), v_actor_id
  ) RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$function$;
