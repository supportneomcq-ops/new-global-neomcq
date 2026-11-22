-- Refresh FMGE pattern from the NBEMS June 2026 bulletin.
-- Keep all exam/source records in needs_review/pending until an admin completes source verification.
WITH blueprint(subjects) AS (
  SELECT jsonb_build_array(
    jsonb_build_object('name','Anatomy','marks',17,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Physiology','marks',17,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Biochemistry','marks',17,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Pathology','marks',13,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Microbiology','marks',13,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Pharmacology','marks',13,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Forensic Medicine','marks',10,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Medicine','marks',33,'group','Clinical'),
    jsonb_build_object('name','Psychiatry','marks',5,'group','Clinical'),
    jsonb_build_object('name','Dermatology & STD','marks',5,'group','Clinical'),
    jsonb_build_object('name','Radiotherapy','marks',5,'group','Clinical'),
    jsonb_build_object('name','General Surgery','marks',32,'group','Clinical'),
    jsonb_build_object('name','Anesthesiology','marks',5,'group','Clinical'),
    jsonb_build_object('name','Orthopedics','marks',5,'group','Clinical'),
    jsonb_build_object('name','Radiodiagnosis','marks',5,'group','Clinical'),
    jsonb_build_object('name','Pediatrics','marks',15,'group','Clinical'),
    jsonb_build_object('name','Ophthalmology','marks',15,'group','Clinical'),
    jsonb_build_object('name','Otorhinolaryngology (ENT)','marks',15,'group','Clinical'),
    jsonb_build_object('name','Obstetrics & Gynaecology','marks',30,'group','Clinical'),
    jsonb_build_object('name','Community Medicine','marks',30,'group','Clinical')
  )
),
cache AS (
  SELECT e.id,
    jsonb_set(
      jsonb_set(COALESCE(e.metadata->'curriculum_spec_cache','{}'::jsonb),'{exam}',
        COALESCE(e.metadata->'curriculum_spec_cache'->'exam','{}'::jsonb)
        || jsonb_build_object(
          'country','India','type','Screening Test','official_name','Foreign Medical Graduate Examination',
          'question_config',jsonb_build_object(
            'answer_type','single','option_count',4,'negative_mark',0,'positive_mark',1,
            'question_types',jsonb_build_array('standard_mcq'),'single_correct',true,'duration_minutes',300,
            'multiple_correct',false,'has_audio_questions',false,'has_image_questions',null,'has_video_questions',false,
            'has_negative_marking',false,'default_question_count',300,'has_clinical_vignettes',null,
            'has_matching_questions',false,'has_case_based_questions',null,'has_true_false_questions',false,
            'has_calculation_questions',null,'paper_count',1,'parts',2,'questions_per_part',150,
            'minutes_per_part',150,'scheduled_break_between_parts',true,'language','English','passing_marks',150
          )
        ),true
      ),
      '{subjects}',
      (SELECT jsonb_agg(jsonb_set(j.subject,'{weightage}',to_jsonb(es.weight_percentage::numeric)) ORDER BY j.ordinality)
       FROM jsonb_array_elements(COALESCE(e.metadata->'curriculum_spec_cache'->'subjects','[]'::jsonb))
         WITH ORDINALITY AS j(subject,ordinality)
       JOIN public.exam_subjects es ON es.exam_id=e.id AND lower(es.name)=lower(j.subject->>'name')),
      true
    ) AS updated_cache
  FROM public.exams e
  WHERE e.slug='fmge'
)
UPDATE public.exams e
SET question_count=300,time_limit_mins=300,total_marks=300,
    negative_marking='No negative marking',
    passing_criteria='Minimum 150 marks out of 300 (50%). Result is declared Pass/Fail.',
    eligibility='Indian citizen or Overseas Citizen of India (OCI); primary medical qualification must be confirmed by the concerned Indian Embassy as recognized for medical-practitioner enrolment in the awarding country; final examination result must meet the current session-specific cut-off; candidate must satisfy applicable NMC Eligibility Certificate / NEET-UG requirements and all other conditions in the current session bulletin. Specific exemptions and country-related restrictions apply.',
    attempt_rules='No restriction on number of attempts. Once a candidate qualifies FMGE, the candidate is not eligible to take FMGE again.',
    application_information='Apply online through the official NBEMS portal. Application windows, document cut-offs, fees and admit-card dates are session-specific; use the applicable current-session bulletin.',
    selection_process='Qualifying screening test. Minimum 150/300 is required; eligible results are published as Pass/Fail.',
    official_url='https://natboard.edu.in',
    official_notification_url='https://webdisk.natboard.edu.in/viewnbeexam?exam=fmge',
    official_syllabus_url='https://www.nmc.org.in/wp-content/uploads/2026/02/12bCompetencyBasedMedicalEducationCBMECurriculum12092024.pdf',
    source_url='https://nbe.edu.in/IB/FMGE%20JUNE%202026%20information%20bulletin.pdf',
    official_reference_website='https://webdisk.natboard.edu.in/viewnbeexam?exam=fmge',
    authority='National Board of Examinations in Medical Sciences (NBEMS)',
    exam_type='Screening Test',level='National',mode='Computer Based Test (CBT)',
    frequency='Twice yearly (subject to NBEMS schedule)',
    duration='Two parts of 150 minutes each (300 minutes total test time), with a scheduled break between parts',
    current_version='2026',version_year=2026,is_current=true,
    languages=ARRAY['English']::text[],
    marking_scheme=jsonb_build_object('correct',1,'incorrect',0,'unattempted',0,'negative_marking',false),
    question_types=jsonb_build_array('single_best_answer_mcq'),
    sections=jsonb_build_array(
      jsonb_build_object('name','Part I','question_count',150,'duration_minutes',150),
      jsonb_build_object('name','Part II','question_count',150,'duration_minutes',150)
    ),
    syllabus_info=jsonb_build_object(
      'official_basis','NMC Competency Based Undergraduate Curriculum for MBBS',
      'official_blueprint_source','NBEMS FMGE June 2026 Information Bulletin, Section 12.1–12.2',
      'pre_para_marks',100,'clinical_marks',200,'total_marks',300,'subject_distribution',blueprint.subjects
    ),
    metadata=COALESCE(e.metadata,'{}'::jsonb)||jsonb_build_object(
      'verification_status','needs_review','exam_metadata_audit_status','needs_review',
      'exam_metadata_audit_notes','Exam pattern refreshed from NBEMS June 2026 Information Bulletin. Official syllabus hierarchy still requires topic-by-topic comparison with the NMC CBME 2024 curriculum and admin source review.',
      'official_blueprint_source_url','https://nbe.edu.in/IB/FMGE%20JUNE%202026%20information%20bulletin.pdf',
      'official_syllabus_source_url','https://www.nmc.org.in/wp-content/uploads/2026/02/12bCompetencyBasedMedicalEducationCBMECurriculum12092024.pdf',
      'official_blueprint_version','FMGE June 2026','curriculum_validation_passed',false,
      'curriculum_spec_cache',cache.updated_cache
    ),
    updated_at=now()
FROM cache,blueprint
WHERE e.id=cache.id;

WITH blueprint(subjects) AS (
  SELECT jsonb_build_array(
    jsonb_build_object('name','Anatomy','marks',17),jsonb_build_object('name','Physiology','marks',17),
    jsonb_build_object('name','Biochemistry','marks',17),jsonb_build_object('name','Pathology','marks',13),
    jsonb_build_object('name','Microbiology','marks',13),jsonb_build_object('name','Pharmacology','marks',13),
    jsonb_build_object('name','Forensic Medicine','marks',10),jsonb_build_object('name','Medicine','marks',33),
    jsonb_build_object('name','Psychiatry','marks',5),jsonb_build_object('name','Dermatology & STD','marks',5),
    jsonb_build_object('name','Radiotherapy','marks',5),jsonb_build_object('name','General Surgery','marks',32),
    jsonb_build_object('name','Anesthesiology','marks',5),jsonb_build_object('name','Orthopedics','marks',5),
    jsonb_build_object('name','Radiodiagnosis','marks',5),jsonb_build_object('name','Pediatrics','marks',15),
    jsonb_build_object('name','Ophthalmology','marks',15),jsonb_build_object('name','Otorhinolaryngology (ENT)','marks',15),
    jsonb_build_object('name','Obstetrics & Gynaecology','marks',30),jsonb_build_object('name','Community Medicine','marks',30)
  )
)
UPDATE public.exam_versions v
SET pattern_summary=jsonb_build_object(
  'question_count',300,'duration_minutes',300,'total_marks',300,'paper_count',1,'parts',2,
  'questions_per_part',150,'minutes_per_part',150,'scheduled_break_between_parts',true,
  'question_types',jsonb_build_array('single_best_answer_mcq'),'option_count',4,
  'marking_scheme',jsonb_build_object('correct',1,'incorrect',0,'unattempted',0,'negative_marking',false),
  'passing_criteria','Minimum 150 marks out of 300; Pass/Fail result',
  'languages',jsonb_build_array('English'),'blueprint_subject_marks',blueprint.subjects,
  'source_title','FMGE June 2026 Information Bulletin'
),
stages=jsonb_build_array(jsonb_build_object('name','Screening Test','mode','Computer Based Test (CBT)','paper_count',1)),
papers=jsonb_build_array(jsonb_build_object(
  'name','FMGE Screening Test','question_count',300,'total_marks',300,'language','English',
  'parts',jsonb_build_array(
    jsonb_build_object('name','Part I','question_count',150,'duration_minutes',150),
    jsonb_build_object('name','Part II','question_count',150,'duration_minutes',150)
  ),
  'scheduled_break_between_parts',true
)),
source_url='https://nbe.edu.in/IB/FMGE%20JUNE%202026%20information%20bulletin.pdf',
official_notification_url='https://webdisk.natboard.edu.in/viewnbeexam?exam=fmge',
official_syllabus_url='https://www.nmc.org.in/wp-content/uploads/2026/02/12bCompetencyBasedMedicalEducationCBMECurriculum12092024.pdf',
verification_status='needs_review',verified_at=NULL
FROM blueprint
WHERE v.exam_id=(SELECT id FROM public.exams WHERE slug='fmge') AND v.version_year=2026 AND v.is_current=true;

WITH blueprint(subjects) AS (
  SELECT jsonb_build_array(
    jsonb_build_object('name','Anatomy','marks',17,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Physiology','marks',17,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Biochemistry','marks',17,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Pathology','marks',13,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Microbiology','marks',13,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Pharmacology','marks',13,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Forensic Medicine','marks',10,'group','Pre & Para Clinical'),
    jsonb_build_object('name','Medicine','marks',33,'group','Clinical'),
    jsonb_build_object('name','Psychiatry','marks',5,'group','Clinical'),
    jsonb_build_object('name','Dermatology & STD','marks',5,'group','Clinical'),
    jsonb_build_object('name','Radiotherapy','marks',5,'group','Clinical'),
    jsonb_build_object('name','General Surgery','marks',32,'group','Clinical'),
    jsonb_build_object('name','Anesthesiology','marks',5,'group','Clinical'),
    jsonb_build_object('name','Orthopedics','marks',5,'group','Clinical'),
    jsonb_build_object('name','Radiodiagnosis','marks',5,'group','Clinical'),
    jsonb_build_object('name','Pediatrics','marks',15,'group','Clinical'),
    jsonb_build_object('name','Ophthalmology','marks',15,'group','Clinical'),
    jsonb_build_object('name','Otorhinolaryngology (ENT)','marks',15,'group','Clinical'),
    jsonb_build_object('name','Obstetrics & Gynaecology','marks',30,'group','Clinical'),
    jsonb_build_object('name','Community Medicine','marks',30,'group','Clinical')
  )
),
payload AS (
  SELECT jsonb_build_object(
    'exam_name','Foreign Medical Graduate Examination (FMGE)','exam_type','Screening Test',
    'country','India','authority','National Board of Examinations in Medical Sciences (NBEMS)',
    'version','2026','version_label','FMGE June 2026 Information Bulletin',
    'question_count',300,'duration_minutes',300,'time_limit_mins',300,'total_marks',300,
    'paper_count',1,'parts',2,'questions_per_part',150,'minutes_per_part',150,
    'scheduled_break_between_parts',true,'languages',jsonb_build_array('English'),
    'question_types',jsonb_build_array('single_best_answer_mcq'),'option_count',4,
    'marking_scheme',jsonb_build_object('correct',1,'incorrect',0,'unattempted',0,'negative_marking',false),
    'negative_marking','No negative marking',
    'passing_criteria','Minimum 150 marks out of 300 (50%); result declared Pass/Fail.',
    'attempt_rules','No restriction on number of attempts. Once a candidate qualifies FMGE, the candidate is not eligible to take FMGE again.',
    'eligibility','Indian citizen or Overseas Citizen of India (OCI); primary medical qualification confirmed by the concerned Indian Embassy as recognized for enrolment in the awarding country; session-specific final examination cut-off; applicable NMC Eligibility Certificate / NEET-UG requirements and other current-session conditions.',
    'application_information','Online application through NBEMS. Application windows, document cut-offs, fees and admit-card dates are session-specific.',
    'selection_process','Qualifying screening test. Minimum 150/300 is required; eligible results are published as Pass/Fail.',
    'subjects',blueprint.subjects,
    'exam_pattern',jsonb_build_object(
      'question_count',300,'duration_minutes',300,'time_limit_mins',300,'total_marks',300,
      'paper_count',1,'parts',2,'questions_per_part',150,'minutes_per_part',150,
      'scheduled_break_between_parts',true,'question_types',jsonb_build_array('single_best_answer_mcq'),
      'option_count',4,'marking_scheme',jsonb_build_object('correct',1,'incorrect',0,'unattempted',0,'negative_marking',false),
      'passing_criteria','Minimum 150 marks out of 300; Pass/Fail result'
    ),
    'source_title','FMGE June 2026 Information Bulletin',
    'source_url','https://nbe.edu.in/IB/FMGE%20JUNE%202026%20information%20bulletin.pdf',
    'source_version_date','2026-06-28',
    'source_date_note','The bulletin identifies the June 2026 session and examination date as 28 June 2026; a separate document issue date is not displayed.'
  ) AS data
  FROM blueprint
)
INSERT INTO public.exam_evidence(exam_id,source_url,source_reference,source_type,publisher_authority,source_version_date,verification_status,extracted_data,review_notes)
SELECT e.id,
  'https://nbe.edu.in/IB/FMGE%20JUNE%202026%20information%20bulletin.pdf',
  'FMGE June 2026 Information Bulletin: Section 5.1–5.7 (exam structure, two parts, marking, passing and attempts); Section 12.1–12.2 (NMC syllabus basis and subject-wise blueprint, PDF pp. 36–37 and 98–99).',
  'official_bulletin','National Board of Examinations in Medical Sciences (NBEMS)','2026-06-28',
  'pending',payload.data,
  'Structured extraction prepared from the official NBEMS bulletin. Version date is anchored to the June 2026 session examination date because the PDF does not display a separate issue date. Requires admin source review.'
FROM public.exams e CROSS JOIN payload
WHERE e.slug='fmge'
AND NOT EXISTS (SELECT 1 FROM public.exam_evidence x WHERE x.exam_id=e.id
  AND x.source_url='https://nbe.edu.in/IB/FMGE%20JUNE%202026%20information%20bulletin.pdf'
  AND x.source_type='official_bulletin' AND x.source_version_date='2026-06-28');

WITH topic_tree(subjects) AS (
  SELECT jsonb_agg(jsonb_build_object(
    'name',s.name,
    'topics',COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name',t.name,
        'subtopics',COALESCE((
          SELECT jsonb_agg(jsonb_build_object('name',st.name) ORDER BY st.display_order,st.name)
          FROM public.exam_subtopics st WHERE st.topic_id=t.id AND COALESCE(st.is_active,true)
        ),'[]'::jsonb)
      ) ORDER BY t.display_order,t.name)
      FROM public.exam_topics t WHERE t.subject_id=s.id AND COALESCE(t.is_active,t.active,true)
    ),'[]'::jsonb)
  ) ORDER BY s.display_order,s.name)
  FROM public.exam_subjects s
  WHERE s.exam_id=(SELECT id FROM public.exams WHERE slug='fmge') AND s.is_active
),
payload AS (
  SELECT jsonb_build_object(
    'source_document_title','Competency Based Undergraduate Curriculum for MBBS Course, 2024',
    'source_version_date','2024-09-12','subjects',subjects,
    'extraction_method','Existing NeoMCQ curriculum hierarchy exported as a structured review draft. This is not yet verified as an exact topic-by-topic extraction from the NMC document.',
    'review_required',true,
    'hierarchy_counts',jsonb_build_object(
      'subjects',jsonb_array_length(subjects),
      'topics',(SELECT count(*) FROM public.exam_topics t JOIN public.exam_subjects s ON s.id=t.subject_id WHERE s.exam_id=(SELECT id FROM public.exams WHERE slug='fmge') AND COALESCE(t.is_active,t.active,true)),
      'subtopics',(SELECT count(*) FROM public.exam_subtopics st JOIN public.exam_topics t ON t.id=st.topic_id JOIN public.exam_subjects s ON s.id=t.subject_id WHERE s.exam_id=(SELECT id FROM public.exams WHERE slug='fmge') AND COALESCE(st.is_active,true))
    )
  ) AS data
  FROM topic_tree
)
INSERT INTO public.exam_evidence(exam_id,source_url,source_reference,source_type,publisher_authority,source_version_date,verification_status,extracted_data,review_notes)
SELECT e.id,
  'https://www.nmc.org.in/wp-content/uploads/2026/02/12bCompetencyBasedMedicalEducationCBMECurriculum12092024.pdf',
  'National Medical Commission, Competency Based Undergraduate Curriculum for MBBS Course, 2024. Structured draft export of the existing NeoMCQ hierarchy for admin comparison; not an approved NMC topic extraction.',
  'official_syllabus','National Medical Commission (NMC)','2024-09-12','pending',payload.data,
  'Human admin must compare all subjects, topics and subtopics with the NMC source. Do not verify this record until the topic-by-topic mapping is checked and corrected.'
FROM public.exams e CROSS JOIN payload
WHERE e.slug='fmge'
AND NOT EXISTS (SELECT 1 FROM public.exam_evidence x WHERE x.exam_id=e.id
  AND x.source_url='https://www.nmc.org.in/wp-content/uploads/2026/02/12bCompetencyBasedMedicalEducationCBMECurriculum12092024.pdf'
  AND x.source_type='official_syllabus' AND x.source_version_date='2024-09-12');
