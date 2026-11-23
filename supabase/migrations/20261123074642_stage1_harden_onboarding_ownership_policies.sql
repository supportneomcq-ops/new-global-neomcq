-- Stage 1: keep learner-owned onboarding rows bound to the authenticated owner.
-- Explicit WITH CHECK prevents ownership reassignment during UPDATE operations.

DROP POLICY IF EXISTS "Users update own exam enrollments" ON public.user_exams;
CREATE POLICY "Users update own exam enrollments"
  ON public.user_exams
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own study preferences" ON public.study_preferences;
CREATE POLICY "Users manage own study preferences"
  ON public.study_preferences
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
