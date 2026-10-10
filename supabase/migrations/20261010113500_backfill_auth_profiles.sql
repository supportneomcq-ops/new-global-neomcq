-- Backfill any pre-existing Auth users whose profile/signup role was missed.
-- New users continue to be handled by auth.users.on_auth_user_created.
DO $$
DECLARE
  missing_user record;
  default_role_id uuid;
BEGIN
  SELECT id INTO default_role_id
  FROM public.roles
  WHERE name = 'user'
  LIMIT 1;

  FOR missing_user IN
    SELECT u.id, u.email, u.raw_user_meta_data, u.created_at
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = u.id OR p.auth_user_id = u.id
    )
  LOOP
    INSERT INTO public.profiles (
      id, auth_user_id, email, first_name, last_name, avatar_url,
      created_at, updated_at
    )
    VALUES (
      missing_user.id,
      missing_user.id,
      missing_user.email,
      COALESCE(NULLIF(BTRIM(missing_user.raw_user_meta_data->>'first_name'), ''), split_part(COALESCE(missing_user.email, ''), '@', 1)),
      COALESCE(missing_user.raw_user_meta_data->>'last_name', ''),
      missing_user.raw_user_meta_data->>'avatar_url',
      COALESCE(missing_user.created_at, now()),
      now()
    )
    ON CONFLICT (id) DO NOTHING;

    IF default_role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (missing_user.id, default_role_id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;
