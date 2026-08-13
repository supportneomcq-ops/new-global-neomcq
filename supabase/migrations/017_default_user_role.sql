-- Migration 017: Default User Role Assignment and Backfill

-- 1. Create or replace the handle_new_user trigger function to explicitly assign the default 'user' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, auth_user_id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Get canonical 'user' role ID
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'user';

  -- Explicitly assign default user role
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, v_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Backfill existing profiles that currently do not have any role assigned
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
CROSS JOIN public.roles r
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE r.name = 'user' AND ur.user_id IS NULL
ON CONFLICT (user_id, role_id) DO NOTHING;
