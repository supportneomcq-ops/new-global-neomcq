-- NeoMCQ global subject catalogue and AI pricing reconciliation.
-- Idempotent: safe to run against databases where these repairs were already applied.

with names as (
  select
    lower(regexp_replace(trim(name), '\s+', ' ', 'g')) as normalized_name,
    min(trim(name)) as display_name
  from public.exam_subjects
  where trim(coalesce(name, '')) <> ''
  group by lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
),
slugged as (
  select
    normalized_name,
    display_name,
    trim(both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g')) as base_slug
  from names
),
deduped as (
  select
    normalized_name,
    display_name,
    case
      when count(*) over (partition by base_slug) > 1
        then base_slug || '-' || left(md5(normalized_name), 6)
      else base_slug
    end as slug
  from slugged
)
insert into public.subjects (name, slug, aliases)
select display_name, slug, array[]::text[]
from deduped
on conflict (slug) do nothing;

update public.exam_subjects es
set subject_id = s.id
from public.subjects s
where es.subject_id is null
  and lower(regexp_replace(trim(es.name), '\s+', ' ', 'g')) =
      lower(regexp_replace(trim(s.name), '\s+', ' ', 'g'));

update public.subjects s
set aliases = coalesce((
  select array_agg(distinct alias_value order by alias_value)
  from (
    select trim(es.official_name) as alias_value
    from public.exam_subjects es
    where es.subject_id = s.id
      and nullif(trim(es.official_name), '') is not null
      and lower(trim(es.official_name)) <> lower(trim(s.name))
    union
    select trim(es.display_name) as alias_value
    from public.exam_subjects es
    where es.subject_id = s.id
      and nullif(trim(es.display_name), '') is not null
      and lower(trim(es.display_name)) <> lower(trim(s.name))
  ) aliases
), array[]::text[]);

-- Preserve the previous pricing rows for auditability, but close stale active
-- prices only when they differ from Google's published current pricing.
update public.ai_model_pricing
set effective_until = now(), active = false
where active = true
  and effective_until is null
  and provider = 'Google Gemini AI'
  and (
    (model = 'gemini-3.5-flash' and (input_cost_per_1m <> 1.50 or cached_input_cost_per_1m <> 0.15 or output_cost_per_1m <> 9.00))
    or
    (model = 'gemini-3.6-flash' and (input_cost_per_1m <> 0.75 or cached_input_cost_per_1m <> 0.075 or output_cost_per_1m <> 3.75))
  );

insert into public.ai_model_pricing
  (provider, model, input_cost_per_1m, cached_input_cost_per_1m, output_cost_per_1m, effective_from, effective_until, currency, source, active)
select v.provider, v.model, v.input_cost_per_1m, v.cached_input_cost_per_1m, v.output_cost_per_1m, now(), null, 'USD',
       'https://ai.google.dev/gemini-api/docs/pricing', true
from (values
  ('Google Gemini AI', 'gemini-3.5-flash', 1.50::numeric, 0.15::numeric, 9.00::numeric),
  ('Google Gemini AI', 'gemini-3.6-flash', 0.75::numeric, 0.075::numeric, 3.75::numeric),
  ('Google Gemini AI', 'gemini-3.5-flash-lite', 0.30::numeric, 0.30::numeric, 2.50::numeric)
) as v(provider, model, input_cost_per_1m, cached_input_cost_per_1m, output_cost_per_1m)
where not exists (
  select 1
  from public.ai_model_pricing p
  where p.provider = v.provider
    and p.model = v.model
    and p.active = true
    and p.effective_until is null
    and p.input_cost_per_1m = v.input_cost_per_1m
    and p.cached_input_cost_per_1m = v.cached_input_cost_per_1m
    and p.output_cost_per_1m = v.output_cost_per_1m
);
