UPDATE public.subscription_plans
SET is_active = false
WHERE slug IN ('monthly-pro-pass', 'annual-ultra-pass', 'global-lifetime-pass')
  AND is_active = true;
