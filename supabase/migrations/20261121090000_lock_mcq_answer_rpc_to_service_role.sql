-- Restrict the legacy answer-key RPC to trusted server-side service-role callers.
-- Student submissions now use the authenticated API route, which verifies identity,
-- question visibility, scores the answer, and writes the attempt before returning feedback.

REVOKE ALL ON FUNCTION public.submit_mcq_answer_atomic(uuid, uuid, integer, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_mcq_answer_atomic(uuid, uuid, integer, text)
  TO service_role;
