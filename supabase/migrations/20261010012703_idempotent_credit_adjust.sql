-- Make payment and subscription credit grants idempotent across webhook retries.

CREATE OR REPLACE FUNCTION public.credit_adjust(
  p_user_id uuid, p_amount integer, p_type text, p_reason text,
  p_admin_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
  v_effective_admin_id uuid := NULL;
  v_is_service_role boolean := (current_setting('role', true) = 'service_role');
  v_ledger_id uuid;
BEGIN
  IF NOT v_is_service_role THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: credit_adjust requires service_role or admin privileges';
    END IF;
    v_effective_admin_id := auth.uid();
  ELSE
    v_effective_admin_id := p_admin_id;
  END IF;

  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Invalid credit adjustment parameters';
  END IF;
  IF p_type NOT IN ('PURCHASE', 'SUBSCRIPTION_GRANT', 'PROMOTIONAL_GRANT', 'AI_USAGE', 'REFUND', 'EXPIRATION', 'ADMIN_ADJUSTMENT', 'REVERSAL', 'RESERVATION', 'RELEASE') THEN
    RAISE EXCEPTION 'Invalid credit transaction type';
  END IF;

  SELECT credit_balance INTO v_balance_before
    FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    IF p_amount < 0 THEN RAISE EXCEPTION 'Cannot debit a missing credit account'; END IF;
    INSERT INTO public.credit_accounts (user_id, credit_balance)
      VALUES (p_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
    SELECT credit_balance INTO v_balance_before
      FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  -- Make payment and subscription credit grants idempotent across webhook retries.
  IF p_reason IS NOT NULL THEN
    SELECT id INTO v_ledger_id
      FROM public.credit_ledger
      WHERE user_id = p_user_id
        AND transaction_type = p_type
        AND reference_type = 'credit_adjustment'
        AND reference_id = p_reason
      ORDER BY created_at ASC
      LIMIT 1;
    IF FOUND THEN RETURN v_ledger_id; END IF;
  END IF;

  v_balance_after := GREATEST(0, v_balance_before + p_amount);

  UPDATE public.credit_accounts
    SET credit_balance = v_balance_after,
        lifetime_credits_purchased = lifetime_credits_purchased
          + CASE WHEN p_type = 'PURCHASE' AND p_amount > 0 THEN p_amount ELSE 0 END,
        lifetime_credits_granted = lifetime_credits_granted
          + CASE WHEN p_type IN ('SUBSCRIPTION_GRANT', 'PROMOTIONAL_GRANT', 'ADMIN_ADJUSTMENT')
                      AND p_amount > 0 THEN p_amount ELSE 0 END,
        updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO public.credit_ledger (
    user_id, transaction_type, credits, balance_before, balance_after,
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_user_id, p_type, v_balance_after - v_balance_before,
    v_balance_before, v_balance_after, 'credit_adjustment', p_reason, p_reason,
    v_effective_admin_id
  ) RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$function$;
