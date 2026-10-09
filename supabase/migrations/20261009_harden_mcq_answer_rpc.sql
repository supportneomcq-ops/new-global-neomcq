-- Harden SECURITY DEFINER helpers against caller-supplied user-ID probing and unpublished MCQ answer disclosure.
-- RLS policies call is_admin(auth.uid()), so keep the function executable but bind the ID to the caller.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF current_setting('role', true) IS DISTINCT FROM 'service_role'
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND r.name IN ('super_admin', 'admin')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF p_user_id IS NULL OR p_permission_name IS NULL THEN
    RETURN FALSE;
  END IF;

  IF current_setting('role', true) IS DISTINCT FROM 'service_role'
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND p.name = p_permission_name
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_mcq_answer_atomic(
  p_user_id uuid,
  p_mcq_id uuid,
  p_selected_index integer DEFAULT NULL,
  p_selected_option text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_mcq RECORD;
  v_is_correct BOOLEAN := FALSE;
  v_correct_answer TEXT;
  v_options JSONB;
  v_chosen_option TEXT;
  v_effective_user_id UUID := NULL;
  v_is_service_role BOOLEAN := (current_setting('role', true) = 'service_role');
  v_is_admin BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF p_user_id IS NOT NULL
       AND p_user_id <> auth.uid()
       AND NOT v_is_service_role
       AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: Cannot submit MCQ answer on behalf of another user';
    END IF;
    v_effective_user_id := auth.uid();
  ELSE
    v_effective_user_id := NULL;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    v_is_admin := public.is_admin(auth.uid());
  END IF;

  SELECT * INTO v_mcq
  FROM public.mcqs
  WHERE id = p_mcq_id;

  IF v_mcq.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MCQ not found');
  END IF;

  -- Anonymous visitors may only receive answers for approved questions.
  -- Signed-in learners may also answer their own generated questions; admins/service-role retain support access.
  IF COALESCE(v_mcq.status, '') <> 'approved'
     AND NOT (auth.uid() IS NOT NULL AND v_mcq.user_id = auth.uid())
     AND NOT v_is_admin
     AND NOT v_is_service_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'This question is not available for practice');
  END IF;

  v_correct_answer := v_mcq.correct_answer;
  v_options := v_mcq.options;

  IF p_selected_option IS NOT NULL THEN
    v_chosen_option := p_selected_option;
  ELSIF p_selected_index IS NOT NULL
        AND p_selected_index >= 0
        AND jsonb_typeof(v_options) = 'array' THEN
    v_chosen_option := v_options->>p_selected_index;
  END IF;

  IF v_chosen_option IS NOT NULL AND v_correct_answer IS NOT NULL THEN
    v_is_correct := TRIM(LOWER(v_chosen_option)) = TRIM(LOWER(v_correct_answer));
  END IF;

  INSERT INTO public.mcq_attempts (user_id, mcq_id, selected_option, selected_index, is_correct)
  VALUES (v_effective_user_id, p_mcq_id, v_chosen_option, p_selected_index, v_is_correct);

  RETURN jsonb_build_object(
    'success', true,
    'is_correct', v_is_correct,
    'correct_answer', v_correct_answer,
    'explanation', v_mcq.explanation,
    'rationale', v_mcq.rationale,
    'clinical_pearl', v_mcq.clinical_pearl
  );
END;
$function$;
