-- Repair the global subject catalogue after it was found empty in production.
-- Idempotent: creates canonical subjects from existing exam_subjects and links mappings.
with names as (
  select
    lower(regexp_replace(trim(name), '\s+', ' ', 'g')) as normalized_name,
    min(trim(name)) as display_name
  from public.exam_subjects
  where nullif(trim(coalesce(name, '')), '') is not null
  group by lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
),
slugged as (
  select
    normalized_name,
    display_name,
    coalesce(
      nullif(trim(both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g')), ''),
      'subject-' || left(md5(normalized_name), 10)
    ) as base_slug
  from names
),
deduped as (
  select
    normalized_name,
    display_name,
    case
      when count(*) over (partition by base_slug) > 1
        then base_slug || '-' || left(md5(normalized_name), 8)
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
  ) alias_values
), array[]::text[])
where exists (select 1 from public.exam_subjects es where es.subject_id = s.id);
