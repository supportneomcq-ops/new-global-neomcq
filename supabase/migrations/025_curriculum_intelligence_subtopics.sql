-- Migration: NeoMCQ Phase 5D - Curriculum Intelligence Subtopics
-- Location: /supabase/migrations/025_curriculum_intelligence_subtopics.sql

BEGIN;

-- ============================================================================
-- 1. Dynamic Duplicate Merging for exam_subtopics
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  keep_id UUID;
  duplicate_ids UUID[];
BEGIN
  FOR r IN (
    SELECT topic_id, normalized_name, array_agg(id ORDER BY created_at ASC) as ids
    FROM public.exam_subtopics
    GROUP BY topic_id, normalized_name
    HAVING count(*) > 1
  ) LOOP
    keep_id := r.ids[1];
    duplicate_ids := r.ids[2:array_length(r.ids, 1)];
    
    -- If there were any foreign keys referencing subtopics, we would remap them here.
    -- Since no tables currently reference subtopic_id, we can safely delete the duplicates.
    DELETE FROM public.exam_subtopics WHERE id = ANY(duplicate_ids);
  END LOOP;
END $$;

-- ============================================================================
-- 2. Add Unique Constraint on exam_subtopics
-- ============================================================================

ALTER TABLE public.exam_subtopics
ADD CONSTRAINT unique_topic_subtopic_normalized UNIQUE (topic_id, normalized_name);

COMMIT;
