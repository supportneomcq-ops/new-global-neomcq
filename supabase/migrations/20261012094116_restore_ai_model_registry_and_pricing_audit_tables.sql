CREATE TABLE IF NOT EXISTS public.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model_id text NOT NULL UNIQUE,
  display_name text NOT NULL,
  tier text NOT NULL DEFAULT 'flash',
  task_types text[] NOT NULL DEFAULT '{}',
  input_price_per_1m numeric(14,8) NOT NULL DEFAULT 0,
  cached_input_price_per_1m numeric(14,8) NOT NULL DEFAULT 0,
  output_price_per_1m numeric(14,8) NOT NULL DEFAULT 0,
  context_limit integer NOT NULL DEFAULT 128000,
  max_output_tokens integer NOT NULL DEFAULT 8192,
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 1,
  supports_thinking boolean NOT NULL DEFAULT false,
  supports_structured_output boolean NOT NULL DEFAULT true,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_pricing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model_id text NOT NULL,
  old_input_price numeric(14,8),
  new_input_price numeric(14,8) NOT NULL,
  old_output_price numeric(14,8),
  new_output_price numeric(14,8) NOT NULL,
  changed_by text NOT NULL DEFAULT 'AUTO_SYNC',
  reason text NOT NULL DEFAULT 'Official provider pricing sync',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_pricing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT current_date,
  total_models integer NOT NULL DEFAULT 0,
  models_changed integer NOT NULL DEFAULT 0,
  pricing_payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_pricing_history_model_created_idx
  ON public.ai_pricing_history (model_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_pricing_snapshots_date_idx
  ON public.ai_pricing_snapshots (snapshot_date DESC);

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pricing_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.ai_models, public.ai_pricing_history, public.ai_pricing_snapshots FROM anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.ai_models, public.ai_pricing_history, public.ai_pricing_snapshots TO service_role;

-- Correct current rates from official provider pricing and retire the deprecated Gemini 3.5 Flash route.
UPDATE public.ai_model_pricing
SET active = false, effective_until = COALESCE(effective_until, now())
WHERE model = 'gemini-3.5-flash' AND active = true;

UPDATE public.ai_model_pricing
SET input_cost_per_1m = 0.30,
    cached_input_cost_per_1m = 0.03,
    output_cost_per_1m = 2.50,
    source = 'https://ai.google.dev/gemini-api/docs/pricing'
WHERE model = 'gemini-3.5-flash-lite' AND active = true;

INSERT INTO public.ai_model_pricing
  (provider, model, input_cost_per_1m, cached_input_cost_per_1m, output_cost_per_1m, effective_from, effective_until, currency, source, active)
SELECT 'Google Gemini AI', 'gemini-3.8-flash', 0.75, 0.075, 3.75, now(), NULL, 'USD', 'https://ai.google.dev/gemini-api/docs/pricing', true
WHERE NOT EXISTS (SELECT 1 FROM public.ai_model_pricing WHERE model = 'gemini-3.8-flash' AND active = true);

INSERT INTO public.ai_model_pricing
  (provider, model, input_cost_per_1m, cached_input_cost_per_1m, output_cost_per_1m, effective_from, effective_until, currency, source, active)
SELECT 'Google Gemini AI', 'gemini-3.1-flash-lite', 0.25, 0.025, 1.50, now(), NULL, 'USD', 'https://ai.google.dev/gemini-api/docs/pricing', true
WHERE NOT EXISTS (SELECT 1 FROM public.ai_model_pricing WHERE model = 'gemini-3.1-flash-lite' AND active = true);

INSERT INTO public.ai_model_pricing
  (provider, model, input_cost_per_1m, cached_input_cost_per_1m, output_cost_per_1m, effective_from, effective_until, currency, source, active)
SELECT 'OpenAI', 'gpt-5.4-mini', 0.75, 0.075, 4.50, now(), NULL, 'USD', 'https://developers.openai.com/api/docs/models/gpt-5.4-mini', true
WHERE NOT EXISTS (SELECT 1 FROM public.ai_model_pricing WHERE model = 'gpt-5.4-mini' AND active = true);

INSERT INTO public.ai_model_pricing
  (provider, model, input_cost_per_1m, cached_input_cost_per_1m, output_cost_per_1m, effective_from, effective_until, currency, source, active)
SELECT 'OpenAI', 'gpt-5.4-nano', 0.20, 0.02, 1.25, now(), NULL, 'USD', 'https://developers.openai.com/api/docs/models/gpt-5.4-nano', true
WHERE NOT EXISTS (SELECT 1 FROM public.ai_model_pricing WHERE model = 'gpt-5.4-nano' AND active = true);

-- Seed the model registry from the authoritative current pricing rows.
INSERT INTO public.ai_models
  (provider, model_id, display_name, tier, input_price_per_1m, cached_input_price_per_1m, output_price_per_1m, context_limit, max_output_tokens, enabled, priority, last_verified_at)
SELECT
  CASE WHEN lower(provider) LIKE '%gemini%' OR lower(provider) LIKE '%google%' THEN 'gemini' ELSE 'openai' END,
  model,
  model,
  'flash',
  input_cost_per_1m,
  cached_input_cost_per_1m,
  output_cost_per_1m,
  1048576,
  65536,
  active,
  1,
  now()
FROM public.ai_model_pricing
WHERE active = true
ON CONFLICT (model_id) DO UPDATE SET
  provider = EXCLUDED.provider,
  input_price_per_1m = EXCLUDED.input_price_per_1m,
  cached_input_price_per_1m = EXCLUDED.cached_input_price_per_1m,
  output_price_per_1m = EXCLUDED.output_price_per_1m,
  enabled = EXCLUDED.enabled,
  updated_at = now();
