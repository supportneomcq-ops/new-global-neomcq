-- Protect profile PII from anonymous/public reads while retaining self-service
-- access for authenticated users and administrator access for moderation.
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;

CREATE POLICY "Users read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));
