UPDATE public.ai_task_routing
SET fallback_model = 'gpt-5.4-mini', updated_at = now()
WHERE fallback_model = 'gpt-5.4-nano';

UPDATE public.ai_model_pricing
SET active = false, effective_until = COALESCE(effective_until, now())
WHERE model = 'gpt-5.4-nano' AND active = true;

UPDATE public.ai_models
SET enabled = false, updated_at = now()
WHERE model_id = 'gpt-5.4-nano';
