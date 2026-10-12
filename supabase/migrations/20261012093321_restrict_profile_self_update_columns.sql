-- Restrict self-service profile edits to non-privileged learner details.
-- Keep exam locking, selected exam, role/security fields, and billing flags server-managed.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.profiles
FROM anon, authenticated;

GRANT UPDATE (
  first_name,
  last_name,
  phone,
  country_id,
  language_id,
  timezone,
  updated_at
)
ON TABLE public.profiles
TO authenticated;

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);
