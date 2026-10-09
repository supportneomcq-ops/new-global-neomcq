-- Topic refresh locks are acquired by trusted server-side generation code using service_role.
-- Authenticated clients must not be able to lock arbitrary topics and delay refreshes for other users.
REVOKE EXECUTE ON FUNCTION public.acquire_topic_refresh_lock(uuid, uuid, uuid, text) FROM authenticated;
