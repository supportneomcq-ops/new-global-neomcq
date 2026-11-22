-- Promote FMGE's current session metadata to the October 2026 bulletin.
-- The October bulletin PDF is linked from NBEMS; direct retrieval was unavailable during this review,
-- so this evidence remains pending and its pattern fields must be checked before verification.
UPDATE public.exams
SET current_version='October 2026',
    frequency='Three times yearly (per October 2026 bulletin; subject to NBEMS schedule)',
    source_url='https://nbe.edu.in/IB/FMGE%20october%202026%20information%20bulletin%20v2.2.pdf',
    official_notification_url='https://webdisk.natboard.edu.in/viewnbeexam?exam=fmge',
    metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object(
      'official_blueprint_version','October 2026',
      'official_blueprint_source_url','https://nbe.edu.in/IB/FMGE%20october%202026%20information%20bulletin%20v2.2.pdf',
      'exam_metadata_audit_status','needs_review',
      'exam_metadata_audit_notes','October 2026 is the latest FMGE session. The official October bulletin PDF is linked from the NBEMS FMGE page but could not be fetched in the current review. Pattern fields currently cross-reference the June 2026 bulletin and must be checked against October 2026 bulletin v2.2 before verification.',
      'latest_session',jsonb_build_object(
        'name','October 2026','exam_date','2026-10-31','result_declared_date','2026-11-10',
        'scorecard_available_from','2026-11-20','eligibility_final_exam_cutoff','2026-08-31',
        'application_open_date','2026-09-11','application_close_date','2026-09-25',
        'bulletin_version','v2.2','bulletin_source_url','https://nbe.edu.in/IB/FMGE%20october%202026%20information%20bulletin%20v2.2.pdf'
      ),
      'next_session_tentative',jsonb_build_object(
        'name','December 2026','tentative_exam_date','2027-01-09',
        'source_url','https://natboard.edu.in/viewNotice.php?NBE=dkU5K0VnZjY0ellZSTh2dlF4UnNUdz09'
      ),
      'curriculum_spec_cache',jsonb_set(
        COALESCE(metadata->'curriculum_spec_cache','{}'::jsonb),
        '{exam,version}','"October 2026"'::jsonb,true
      )
    ),
    updated_at=now()
WHERE slug='fmge';

UPDATE public.exam_versions
SET source_url='https://nbe.edu.in/IB/FMGE%20october%202026%20information%20bulletin%20v2.2.pdf',
    official_notification_url='https://webdisk.natboard.edu.in/viewnbeexam?exam=fmge',
    pattern_summary=COALESCE(pattern_summary,'{}'::jsonb)||jsonb_build_object(
      'source_title','FMGE October 2026 Information Bulletin v2.2 (pending direct review)',
      'frequency','Three times per year',
      'latest_session',jsonb_build_object(
        'name','October 2026','exam_date','2026-10-31','result_declared_date','2026-11-10',
        'eligibility_final_exam_cutoff','2026-08-31','application_open_date','2026-09-11',
        'application_close_date','2026-09-25','bulletin_version','v2.2'
      ),
      'pattern_cross_reference','Question count, duration, parts and marking currently cross-referenced from the June 2026 NBEMS bulletin; must be checked against October 2026 v2.2 before verification.'
    ),
    verification_status='needs_review',verified_at=NULL
WHERE exam_id=(SELECT id FROM public.exams WHERE slug='fmge')
  AND version_year=2026 AND is_current=true;

INSERT INTO public.exam_evidence(
  exam_id,source_url,source_reference,source_type,publisher_authority,source_version_date,
  verification_status,extracted_data,review_notes
)
SELECT e.id,
  'https://nbe.edu.in/IB/FMGE%20october%202026%20information%20bulletin%20v2.2.pdf',
  'FMGE October 2026 Information Bulletin v2.2, linked from the official NBEMS FMGE examination page. NBEMS notices confirm the October 2026 exam date (31 October) and result declaration (10 November).',
  'official_bulletin','National Board of Examinations in Medical Sciences (NBEMS)','2026-10-31',
  'pending',
  jsonb_build_object(
    'exam_name','Foreign Medical Graduate Examination (FMGE)','version','October 2026','bulletin_version','v2.2',
    'exam_date','2026-10-31','result_declared_date','2026-11-10','scorecard_available_from','2026-11-20',
    'application_open_date','2026-09-11','application_close_date','2026-09-25','eligibility_final_exam_cutoff','2026-08-31',
    'frequency','Three times per year',
    'question_count',300,'duration_minutes',300,'time_limit_mins',300,'total_marks',300,
    'paper_count',1,'parts',2,'questions_per_part',150,'minutes_per_part',150,
    'question_types',jsonb_build_array('single_best_answer_mcq'),'option_count',4,
    'marking_scheme',jsonb_build_object('correct',1,'incorrect',0,'unattempted',0,'negative_marking',false),
    'negative_marking','No negative marking',
    'passing_criteria','Minimum 150 marks out of 300 (50%); result declared Pass/Fail.',
    'exam_pattern',jsonb_build_object(
      'question_count',300,'duration_minutes',300,'time_limit_mins',300,'total_marks',300,
      'paper_count',1,'parts',2,'questions_per_part',150,'minutes_per_part',150,
      'question_types',jsonb_build_array('single_best_answer_mcq'),'option_count',4,
      'marking_scheme',jsonb_build_object('correct',1,'incorrect',0,'unattempted',0,'negative_marking',false),
      'passing_criteria','Minimum 150 marks out of 300; Pass/Fail result'
    ),
    'source_url','https://nbe.edu.in/IB/FMGE%20october%202026%20information%20bulletin%20v2.2.pdf',
    'source_page_url','https://webdisk.natboard.edu.in/viewnbeexam?exam=fmge',
    'source_date_note','Session version anchored to the official examination date, 31 October 2026.'
  ),
  'Pending direct PDF review. The official NBEMS FMGE page lists October 2026 and the direct bulletin URL is on the NBEMS legacy domain. Session facts are cross-referenced from NBEMS notices and secondary reporting. Pattern fields are provisionally carried forward from the June 2026 bulletin and MUST be checked against October 2026 bulletin v2.2 before approval.'
FROM public.exams e
WHERE e.slug='fmge'
AND NOT EXISTS (
  SELECT 1 FROM public.exam_evidence x
  WHERE x.exam_id=e.id
    AND x.source_url='https://nbe.edu.in/IB/FMGE%20october%202026%20information%20bulletin%20v2.2.pdf'
    AND x.source_type='official_bulletin'
    AND x.source_version_date='2026-10-31'
);
