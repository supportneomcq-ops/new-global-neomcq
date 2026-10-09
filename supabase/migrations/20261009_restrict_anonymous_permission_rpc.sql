-- Permission checks are meaningful only for authenticated users or trusted service calls.
-- Anonymous clients have no use for this RPC and receive no information from it.
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM anon;
