-- Repair the profile-created wallet trigger to match the live credit schema.
-- The previous function referenced removed columns (balance, amount, reason, account_id),
-- which could abort profile creation for every new signup.

CREATE OR REPLACE FUNCTION public.handle_new_profile_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.credit_accounts (
    user_id,
    credit_balance,
    lifetime_credits_granted
  )
  VALUES (
    NEW.id,
    50.00,
    50.00
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Only record the signup grant when this trigger actually created the wallet.
  IF FOUND THEN
    INSERT INTO public.credit_ledger (
      user_id,
      transaction_type,
      credits,
      balance_before,
      balance_after,
      reference_type,
      reference_id,
      description,
      created_by
    )
    VALUES (
      NEW.id,
      'PROMOTIONAL_GRANT',
      50.00,
      0.00,
      50.00,
      'signup_bonus',
      NEW.id::text,
      'Initial free registration credit bonus',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;
