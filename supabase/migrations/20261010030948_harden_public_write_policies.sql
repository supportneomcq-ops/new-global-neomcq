-- Close permissive RLS policies that allowed public writes or cross-user access.
-- Admin writes remain available through role-checked policies; server-side service-role
-- operations continue to work through Supabase's service role.

DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own user_roles" ON public.user_roles;
CREATE POLICY "Users can view own user_roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin write access to exam_authorities" ON public.exam_authorities;
CREATE POLICY "Admin write access to exam_authorities"
  ON public.exam_authorities
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin write access to exam_versions" ON public.exam_versions;
CREATE POLICY "Admin write access to exam_versions"
  ON public.exam_versions
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin write access to subjects" ON public.subjects;
CREATE POLICY "Admin write access to subjects"
  ON public.subjects
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin write access to topics" ON public.topics;
CREATE POLICY "Admin write access to topics"
  ON public.topics
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Service role manage canonical_a4_notes" ON public.canonical_a4_notes;

DROP POLICY IF EXISTS "User manage annotations" ON public.user_a4_annotations;
CREATE POLICY "Users manage own annotations"
  ON public.user_a4_annotations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User manage highlights" ON public.user_a4_highlights;
CREATE POLICY "Users manage own highlights"
  ON public.user_a4_highlights
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Jobs must be created by trusted server code after auth/quota checks.
DROP POLICY IF EXISTS "Users can insert own ai_jobs" ON public.ai_jobs;

-- The shared TTS cache is public-readable, but only trusted server code may write it.
DROP POLICY IF EXISTS "ai_tutor_tts_cache_insert_policy" ON public.ai_tutor_tts_cache;
DROP POLICY IF EXISTS "ai_tutor_tts_cache_update_policy" ON public.ai_tutor_tts_cache;
