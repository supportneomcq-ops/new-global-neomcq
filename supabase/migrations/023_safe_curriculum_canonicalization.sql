-- Migration: NeoMCQ Phase 2C - Safe Curriculum Canonicalization
-- Location: /supabase/migrations/023_safe_curriculum_canonicalization.sql

BEGIN;

-- ==========================================
-- 1. Subject Duplicates Remapping
-- ==========================================

-- Broad Scope Primary Healthcare: KEEP 03b2cae2-0313-4d03-8bd0-ee70dc7949dd
-- DELETE: 754b6576-2caf-432e-9716-fbc5071dad3c, 1b2698ed-3d39-49c9-88a7-0f8cee28e572, 63d45cde-52ec-4dba-bfc0-cdf75ed2cd97
UPDATE public.exam_topics SET subject_id = '03b2cae2-0313-4d03-8bd0-ee70dc7949dd' WHERE subject_id IN ('754b6576-2caf-432e-9716-fbc5071dad3c', '1b2698ed-3d39-49c9-88a7-0f8cee28e572', '63d45cde-52ec-4dba-bfc0-cdf75ed2cd97');
UPDATE public.flashcard_decks SET subject_id = '03b2cae2-0313-4d03-8bd0-ee70dc7949dd' WHERE subject_id IN ('754b6576-2caf-432e-9716-fbc5071dad3c', '1b2698ed-3d39-49c9-88a7-0f8cee28e572', '63d45cde-52ec-4dba-bfc0-cdf75ed2cd97');
UPDATE public.mcqs SET subject_id = '03b2cae2-0313-4d03-8bd0-ee70dc7949dd' WHERE subject_id IN ('754b6576-2caf-432e-9716-fbc5071dad3c', '1b2698ed-3d39-49c9-88a7-0f8cee28e572', '63d45cde-52ec-4dba-bfc0-cdf75ed2cd97');
UPDATE public.notes SET subject_id = '03b2cae2-0313-4d03-8bd0-ee70dc7949dd' WHERE subject_id IN ('754b6576-2caf-432e-9716-fbc5071dad3c', '1b2698ed-3d39-49c9-88a7-0f8cee28e572', '63d45cde-52ec-4dba-bfc0-cdf75ed2cd97');
UPDATE public.flashcards SET subject_id = '03b2cae2-0313-4d03-8bd0-ee70dc7949dd' WHERE subject_id IN ('754b6576-2caf-432e-9716-fbc5071dad3c', '1b2698ed-3d39-49c9-88a7-0f8cee28e572', '63d45cde-52ec-4dba-bfc0-cdf75ed2cd97');
UPDATE public.revision_sheets SET subject_id = '03b2cae2-0313-4d03-8bd0-ee70dc7949dd' WHERE subject_id IN ('754b6576-2caf-432e-9716-fbc5071dad3c', '1b2698ed-3d39-49c9-88a7-0f8cee28e572', '63d45cde-52ec-4dba-bfc0-cdf75ed2cd97');
UPDATE public.ai_tutor_lessons SET subject_id = '03b2cae2-0313-4d03-8bd0-ee70dc7949dd' WHERE subject_id IN ('754b6576-2caf-432e-9716-fbc5071dad3c', '1b2698ed-3d39-49c9-88a7-0f8cee28e572', '63d45cde-52ec-4dba-bfc0-cdf75ed2cd97');
UPDATE public.ai_jobs SET subject_id = '03b2cae2-0313-4d03-8bd0-ee70dc7949dd' WHERE subject_id IN ('754b6576-2caf-432e-9716-fbc5071dad3c', '1b2698ed-3d39-49c9-88a7-0f8cee28e572', '63d45cde-52ec-4dba-bfc0-cdf75ed2cd97');
UPDATE public.subject_aliases SET subject_id = '03b2cae2-0313-4d03-8bd0-ee70dc7949dd' WHERE subject_id IN ('754b6576-2caf-432e-9716-fbc5071dad3c', '1b2698ed-3d39-49c9-88a7-0f8cee28e572', '63d45cde-52ec-4dba-bfc0-cdf75ed2cd97');

-- Procedural & Criminal Law: KEEP 0d89e2f4-b7b2-46b1-b4ef-1b9a5cd59045
-- DELETE: 3daa4d8c-df23-41ea-bf35-97ce9db4f632, 4a69f3e4-35bc-4b11-945e-6d1e12b580a4, d44751e5-b517-44fb-91f4-50848fe02ada
UPDATE public.exam_topics SET subject_id = '0d89e2f4-b7b2-46b1-b4ef-1b9a5cd59045' WHERE subject_id IN ('3daa4d8c-df23-41ea-bf35-97ce9db4f632', '4a69f3e4-35bc-4b11-945e-6d1e12b580a4', 'd44751e5-b517-44fb-91f4-50848fe02ada');
UPDATE public.flashcard_decks SET subject_id = '0d89e2f4-b7b2-46b1-b4ef-1b9a5cd59045' WHERE subject_id IN ('3daa4d8c-df23-41ea-bf35-97ce9db4f632', '4a69f3e4-35bc-4b11-945e-6d1e12b580a4', 'd44751e5-b517-44fb-91f4-50848fe02ada');
UPDATE public.mcqs SET subject_id = '0d89e2f4-b7b2-46b1-b4ef-1b9a5cd59045' WHERE subject_id IN ('3daa4d8c-df23-41ea-bf35-97ce9db4f632', '4a69f3e4-35bc-4b11-945e-6d1e12b580a4', 'd44751e5-b517-44fb-91f4-50848fe02ada');
UPDATE public.notes SET subject_id = '0d89e2f4-b7b2-46b1-b4ef-1b9a5cd59045' WHERE subject_id IN ('3daa4d8c-df23-41ea-bf35-97ce9db4f632', '4a69f3e4-35bc-4b11-945e-6d1e12b580a4', 'd44751e5-b517-44fb-91f4-50848fe02ada');
UPDATE public.flashcards SET subject_id = '0d89e2f4-b7b2-46b1-b4ef-1b9a5cd59045' WHERE subject_id IN ('3daa4d8c-df23-41ea-bf35-97ce9db4f632', '4a69f3e4-35bc-4b11-945e-6d1e12b580a4', 'd44751e5-b517-44fb-91f4-50848fe02ada');
UPDATE public.revision_sheets SET subject_id = '0d89e2f4-b7b2-46b1-b4ef-1b9a5cd59045' WHERE subject_id IN ('3daa4d8c-df23-41ea-bf35-97ce9db4f632', '4a69f3e4-35bc-4b11-945e-6d1e12b580a4', 'd44751e5-b517-44fb-91f4-50848fe02ada');
UPDATE public.ai_tutor_lessons SET subject_id = '0d89e2f4-b7b2-46b1-b4ef-1b9a5cd59045' WHERE subject_id IN ('3daa4d8c-df23-41ea-bf35-97ce9db4f632', '4a69f3e4-35bc-4b11-945e-6d1e12b580a4', 'd44751e5-b517-44fb-91f4-50848fe02ada');
UPDATE public.ai_jobs SET subject_id = '0d89e2f4-b7b2-46b1-b4ef-1b9a5cd59045' WHERE subject_id IN ('3daa4d8c-df23-41ea-bf35-97ce9db4f632', '4a69f3e4-35bc-4b11-945e-6d1e12b580a4', 'd44751e5-b517-44fb-91f4-50848fe02ada');
UPDATE public.subject_aliases SET subject_id = '0d89e2f4-b7b2-46b1-b4ef-1b9a5cd59045' WHERE subject_id IN ('3daa4d8c-df23-41ea-bf35-97ce9db4f632', '4a69f3e4-35bc-4b11-945e-6d1e12b580a4', 'd44751e5-b517-44fb-91f4-50848fe02ada');


-- ==========================================
-- 2. Topic Duplicates Remapping
-- ==========================================

CREATE TEMP TABLE topic_merges (
  del_id UUID,
  keep_id UUID
);

-- Seed with all duplicate pairs
INSERT INTO topic_merges (del_id, keep_id) VALUES
  ('7c0aad22-332a-4ab0-907e-195eb65c2247', '633dac36-5268-4f08-b8f5-67718e742396'),
  ('ddf36b79-192a-42b4-9743-ae2b561dc193', 'b824967a-b226-4c67-81a3-e7e53f0f2d48'),
  ('945ca127-40f4-41ce-969b-6a32970324aa', '45b15a04-fd5e-48ac-92c1-a132afa392bc'),
  ('2ad087f9-a44e-4538-abfa-819f8c7504a1', '2b9c1447-a435-4b3c-906d-731a3b8a136f'),
  -- Pediatrics & Obstetrics topic duplicates:
  ('68829318-75ce-4511-a407-440e15363e85', '64d4f5ff-2b16-4ae5-a6f9-bf0cabbe05fd'),
  ('01fabef2-802c-4aff-8bca-46658e18fe7c', '883d2cd5-24e0-4d60-bdfa-9f2daffde1bf'),
  ('908986d8-0c08-4b4a-80c8-37de95bbc69b', 'b5367754-ba89-4869-9a57-7284ed65b64f'),
  -- Financial Accounting topic duplicates:
  ('a6c69944-2a2f-4ff0-9fb6-30f9cf2c495c', 'c7bfcbf4-b8b5-4522-af33-3810d4f7e41f'),
  ('47215cac-4125-4329-b76d-c8f466045e52', 'd4477c66-0db2-427b-aed1-d8c643fc189f'),
  ('5a0bfec9-6a5d-482f-9401-4fdccf758b1b', 'f0ca44e9-6586-4835-87d3-c1e7a5a463b3'),
  -- Taxation topic duplicates:
  ('33fda1cb-53ee-4d7b-9369-3fe8d95c1188', 'e8b71dce-b1ec-48f0-9083-8683275bbf80'),
  ('6b105cc5-af8b-4860-9584-b46cc2a1e198', 'ae286d03-6722-4f96-b186-4317940e52a6'),
  ('d6bb8ad7-30dd-4b93-aef4-3a5d643014c4', 'a449acc3-31fe-43be-adc2-37dcd4d47ef8');

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT del_id, keep_id FROM topic_merges LOOP
    -- Remap referencing tables
    UPDATE public.mcqs SET topic_id = r.keep_id WHERE topic_id = r.del_id;
    UPDATE public.notes SET topic_id = r.keep_id WHERE topic_id = r.del_id;
    UPDATE public.flashcard_decks SET topic_id = r.keep_id WHERE topic_id = r.del_id;
    UPDATE public.flashcards SET topic_id = r.keep_id WHERE topic_id = r.del_id;
    UPDATE public.revision_sheets SET topic_id = r.keep_id WHERE topic_id = r.del_id;
    UPDATE public.ai_tutor_lessons SET topic_id = r.keep_id WHERE topic_id = r.del_id;
    UPDATE public.ai_jobs SET topic_id = r.keep_id WHERE topic_id = r.del_id;
    UPDATE public.topic_aliases SET topic_id = r.keep_id WHERE topic_id = r.del_id;
    UPDATE public.user_study_topics SET exam_topic_id = r.keep_id WHERE exam_topic_id = r.del_id;
    UPDATE public.exam_subtopics SET topic_id = r.keep_id WHERE topic_id = r.del_id;

    -- Remap general bookmarks & content_versions
    UPDATE public.bookmarks SET item_id = r.keep_id::TEXT WHERE item_type = 'topic' AND item_id = r.del_id::TEXT;
    UPDATE public.content_versions SET asset_id = r.keep_id WHERE asset_type = 'topic' AND asset_id = r.del_id;

    -- Delete the duplicate topic
    DELETE FROM public.exam_topics WHERE id = r.del_id;
  END LOOP;
END $$;


-- ==========================================
-- 3. Move Non-Duplicate Topics to Keep Subjects
-- ==========================================

-- Pediatrics & Obstetrics: KEEP b37f052e-e296-4e93-a09f-fa39d5aa602f, DELETE d688d693-56f6-42b7-96da-08ca47d6ac3b
-- "Antenatal Care" topic (edc2f811-2156-4d02-baf2-739e71f2c683) stays and moves to KEEP subject:
UPDATE public.exam_topics SET subject_id = 'b37f052e-e296-4e93-a09f-fa39d5aa602f' WHERE id = 'edc2f811-2156-4d02-baf2-739e71f2c683';

-- Financial Accounting & Reporting (IFRS): KEEP 4d2c159d-684f-44ba-a35c-70a0466a904d, DELETE 49ba6199-77f4-4b6e-aad0-abc3f4ce51ef
-- All 3 topics were duplicates and have been deleted. So we can safely delete the empty duplicate subject.

-- Taxation (Income Tax Act): KEEP 01b7d43a-0a86-4931-93dd-b5bbe409f162, DELETE c3e6c9e7-7dd7-43f0-833e-153f9f3b4926
-- "Capital Gains Tax (CGT)" topic (a842e07e-671d-4406-a577-b92b8e089acc) stays and moves to KEEP subject:
UPDATE public.exam_topics SET subject_id = '01b7d43a-0a86-4931-93dd-b5bbe409f162' WHERE id = 'a842e07e-671d-4406-a577-b92b8e089acc';


-- ==========================================
-- 4. Delete Duplicate Subjects
-- ==========================================

-- Redundant subjects can now be safely deleted
DELETE FROM public.exam_subjects WHERE id IN (
  '754b6576-2caf-432e-9716-fbc5071dad3c', '1b2698ed-3d39-49c9-88a7-0f8cee28e572', '63d45cde-52ec-4dba-bfc0-cdf75ed2cd97', -- Broad Scope
  'd688d693-56f6-42b7-96da-08ca47d6ac3b', -- Pediatrics
  '3daa4d8c-df23-41ea-bf35-97ce9db4f632', '4a69f3e4-35bc-4b11-945e-6d1e12b580a4', 'd44751e5-b517-44fb-91f4-50848fe02ada', -- Procedural & Criminal Law
  '49ba6199-77f4-4b6e-aad0-abc3f4ce51ef', -- Financial Accounting
  'c3e6c9e7-7dd7-43f0-833e-153f9f3b4926'  -- Taxation
);


-- ==========================================
-- 5. Add Database-Level Uniqueness Constraints
-- ==========================================

ALTER TABLE public.exam_subjects 
ADD CONSTRAINT unique_exam_subject_normalized UNIQUE (exam_id, normalized_name);

ALTER TABLE public.exam_topics 
ADD CONSTRAINT unique_subject_topic_normalized UNIQUE (subject_id, normalized_name);

COMMIT;
