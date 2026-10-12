-- Use canonical provider IDs in persisted routing rules and migrate deprecated Flash IDs.
-- The edge router dispatches on "gemini" and "openai"; display labels are normalized in code too.

UPDATE public.ai_task_routing
SET primary_provider = 'gemini'
WHERE lower(trim(primary_provider)) IN ('google gemini ai', 'google gemini', 'google ai', 'google ai studio');

UPDATE public.ai_task_routing
SET fallback_provider = 'openai'
WHERE lower(trim(fallback_provider)) IN ('openai', 'open ai', 'openai api');

UPDATE public.ai_task_routing
SET primary_model = 'gemini-3.6-flash'
WHERE lower(trim(primary_model)) = 'gemini-3.5-flash';
