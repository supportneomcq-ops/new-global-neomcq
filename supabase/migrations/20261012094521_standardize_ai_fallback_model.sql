UPDATE public.ai_task_routing
SET fallback_provider = 'openai',
    fallback_model = 'gpt-5.4-mini',
    updated_at = now()
WHERE fallback_model IN ('gpt-4o-mini', 'gpt-4o', 'gpt-5.4-nano')
   OR lower(trim(fallback_provider)) IN ('open ai', 'openai api');
