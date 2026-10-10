-- Align credit release with the current wallet and ledger schema.

CREATE OR REPLACE FUNCTION public.credit_release(
  p_user_id uuid, p_amount integer, p_task text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_balance numeric(12,2);
  v_reserved numeric(12,2);
  v_ledger_id uuid;
  v_actor_id uuid := auth.uid();
  v_is_service_role boolean := (current_setting('role', true) = 'service_role');
BEGIN
  IF NOT v_is_service_role AND
     (auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid()))) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot release credits for another user';
  END IF;
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Release amount must be positive';
  END IF;

  SELECT credit_balance, reserved_credits
    INTO v_balance, v_reserved
    FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_reserved < p_amount THEN
    RETURN NULL;
  END IF;

  UPDATE public.credit_accounts
    SET credit_balance = credit_balance + p_amount,
        reserved_credits = reserved_credits - p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO public.credit_ledger (
    user_id, transaction_type, credits, balance_before, balance_after,
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_user_id, 'RELEASE', p_amount, v_balance, v_balance + p_amount,
    'ai_task', p_task, COALESCE(p_metadata->>'description', 'Reserved credits released'), v_actor_id
  ) RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$function$;
