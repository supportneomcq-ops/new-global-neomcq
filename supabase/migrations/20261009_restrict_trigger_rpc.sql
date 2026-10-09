-- Trigger-only SECURITY DEFINER functions are not public RPC endpoints.
-- Trigger execution itself does not require the invoking user to have EXECUTE on the trigger function.
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_wallet() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_locked_exam_update() FROM PUBLIC, anon, authenticated;
