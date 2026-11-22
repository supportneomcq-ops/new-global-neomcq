ALTER TABLE public.exam_evidence
  DROP CONSTRAINT IF EXISTS exam_evidence_source_type_check,
  DROP CONSTRAINT IF EXISTS exam_evidence_verification_status_check;

ALTER TABLE public.exam_evidence
  ADD CONSTRAINT exam_evidence_source_type_check
  CHECK (source_type = ANY (ARRAY[
    'official_syllabus',
    'official_bulletin',
    'official_notification',
    'official_exam_pattern',
    'official_guideline',
    'regulatory_board',
    'academic_publication',
    'official_handbook',
    'web_resource',
    'other'
  ]::text[]));

ALTER TABLE public.exam_evidence
  ADD CONSTRAINT exam_evidence_verification_status_check
  CHECK (verification_status = ANY (ARRAY[
    'pending',
    'valid',
    'verified',
    'invalid',
    'disputed',
    'rejected'
  ]::text[]));