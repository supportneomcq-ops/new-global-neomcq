-- Prevent concurrent generators from publishing multiple current A4 documents
-- for the same exam/subject/topic/scope. The sentinel handles NULL topic-level subtopic IDs.
CREATE UNIQUE INDEX IF NOT EXISTS uq_canonical_a4_notes_current_scope
ON public.canonical_a4_notes (
  exam_id,
  subject_id,
  topic_id,
  content_scope,
  COALESCE(subtopic_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
WHERE is_current = true;
