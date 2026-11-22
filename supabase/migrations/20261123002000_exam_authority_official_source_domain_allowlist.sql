-- Explicit allowlist for official sources published by the exam authority and its statutory syllabus regulator.
ALTER TABLE public.exam_authorities
  ADD COLUMN IF NOT EXISTS official_source_domains text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.exam_authorities
SET official_source_domains = ARRAY[
  'nbe.edu.in',
  'webdisk.natboard.edu.in',
  'examarchive.natboard.edu.in',
  'nmc.org.in'
]::text[],
    updated_at = now()
WHERE lower(name) LIKE '%national board of examinations%'
   OR lower(name) LIKE '%national board of examinations in medical sciences%';
