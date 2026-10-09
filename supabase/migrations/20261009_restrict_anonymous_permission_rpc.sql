-- Permission checks are meaningful only for signed-in users or trusted server calls.
-- Revoke the default PUBLIC grant too; removing only the anon role grant is not sufficient.
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;
