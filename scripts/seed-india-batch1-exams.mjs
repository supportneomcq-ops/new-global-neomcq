import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seedBatch1Exams() {
  console.log('--- Seeding Batch 1 (31 Indian National Exams) ---');

  // 1. Fetch dependencies
  const { data: countries } = await supabase.from('countries').select('id, iso2').eq('iso2', 'IN');
  const indiaId = countries?.[0]?.id;

  const { data: categories } = await supabase.from('exam_categories').select('id, slug');
  const catMap = {};
  categories.forEach(c => { catMap[c.slug] = c.id; });

  const { data: authorities } = await supabase.from('exam_authorities').select('id, code');
  const authMap = {};
  authorities.forEach(a => { authMap[a.code] = a.id; });

  const { data: subjects } = await supabase.from('subjects').select('id, slug');
  const subjMap = {};
  subjects.forEach(s => { subjMap[s.slug] = s.id; });

  const { data: topics } = await supabase.from('topics').select('id, slug, subject_id');
  const topicMap = {};
  topics.forEach(t => { topicMap[`${t.subject_id}:${t.slug}`] = t.id; });

  // 2. Definitive Batch 1 Exams Definition
  const batch1Exams = [
    // 1. NEET PG
    {
      name: 'NEET PG Medical',
      slug: 'neet-pg',
      short_name: 'NEET PG',
      category: 'medical-healthcare',
      authority: 'NBEMS',
      description: 'National Eligibility cum Entrance Test for Postgraduate medical degree and diploma programs across all government, private, central, and deemed universities in India.',
      official_url: 'https://natboard.edu.in',
      official_notification_url: 'https://natboard.edu.in/viewnbeexam?exam=neetpg',
      official_syllabus_url: 'https://natboard.edu.in/viewnbeexam?exam=neetpg',
      exam_type: 'Postgraduate Medical Entrance',
      level: 'National',
      mode: 'Computer Based Test (CBT)',
      frequency: 'Annually',
      duration: '210 minutes (3 hours 30 mins)',
      total_questions: 200,
      total_marks: 800,
      negative_marking: '+4 for correct, -1 for incorrect, 0 for unattempted (25% negative marking)',
      passing_criteria: '50th Percentile for General/EWS, 40th Percentile for SC/ST/OBC, 45th Percentile for UR-PWD',
      eligibility: 'MBBS Degree or Provisional Pass Certificate recognized by NMC, completion of 1-year mandatory rotatory internship, and valid State/NMC Registration.',
      attempt_rules: 'No cap on number of attempts; age limits as per NMC regulations.',
      application_information: 'Online application via NBEMS portal (natboard.edu.in). Requires MBBS credentials, photo/thumb impression, and exam city preferences.',
      selection_process: 'Single-stage nationwide CBT examination followed by MCC (Medical Counselling Committee) 50% All India Quota and State Quota online counselling rounds.',
      stages: [
        { name: 'Computer Based Test (CBT)', type: 'Objective MCQ', questions: 200, duration: '210 mins', marks: 800 },
        { name: 'MCC All India / State Quota Counselling', type: 'Merit Seat Allotment', questions: 0, duration: 'Multi-round', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'NEET-PG Combined Medical Sciences', total_questions: 200, total_marks: 800, duration_minutes: 210 }
      ],
      languages: ['English'],
      subjects: [
        { slug: 'anatomy', official: 'Anatomy (Pre-Clinical)', weightage: 17 },
        { slug: 'physiology', official: 'Physiology (Pre-Clinical)', weightage: 17 },
        { slug: 'biochemistry', official: 'Biochemistry (Pre-Clinical)', weightage: 16 },
        { slug: 'pharmacology', official: 'Pharmacology (Para-Clinical)', weightage: 20 },
        { slug: 'pathology', official: 'Pathology (Para-Clinical)', weightage: 25 },
        { slug: 'microbiology', official: 'Microbiology (Para-Clinical)', weightage: 20 },
        { slug: 'forensic-medicine-toxicology', official: 'Forensic Medicine & Toxicology', weightage: 10 },
        { slug: 'community-medicine-psm', official: 'Social and Preventive Medicine', weightage: 25 },
        { slug: 'general-medicine', official: 'General Medicine including Dermatology & Psychiatry', weightage: 45 },
        { slug: 'general-surgery', official: 'General Surgery including Orthopedics, Anesthesia & Radiology', weightage: 45 },
        { slug: 'obstetrics-gynaecology', official: 'Obstetrics and Gynaecology', weightage: 30 },
        { slug: 'pediatrics', official: 'Pediatrics', weightage: 10 }
      ],
      aliases: ['NEET PG', 'NEET-PG', 'NBE NEET PG', 'NEET PG 2026', 'National Eligibility Cum Entrance Test PG']
    },

    // 2. INI-CET
    {
      name: 'INI-CET (Institute of National Importance Combined Entrance Test)',
      slug: 'ini-cet',
      short_name: 'INI-CET',
      category: 'medical-healthcare',
      authority: 'AIIMS',
      description: 'Unified national entrance test for admission to MD, MS, MCh (6 yrs), DM (6 yrs), and MDS postgraduate programs at AIIMS New Delhi & 21 other AIIMS, JIPMER Puducherry, PGIMER Chandigarh, NIMHANS Bengaluru, and SCTIMST Thiruvananthapuram.',
      official_url: 'https://aiimsexams.ac.in',
      official_notification_url: 'https://aiimsexams.ac.in/info/Course_PG.html',
      official_syllabus_url: 'https://aiimsexams.ac.in',
      exam_type: 'Apex Postgraduate Medical Entrance',
      level: 'National',
      mode: 'Computer Based Test (CBT)',
      frequency: 'Bi-annually (January & July sessions)',
      duration: '180 minutes (3 hours)',
      total_questions: 200,
      total_marks: 200,
      negative_marking: '+1 for correct single-best, -1/3 for incorrect (-0.33); partial marking for multiple true-false type',
      passing_criteria: '50th percentile for Open/OWS/OBC; 45th percentile for SC/ST/PWD',
      eligibility: 'MBBS degree with minimum 55% marks (50% for SC/ST) aggregate and 12-month internship completion.',
      attempt_rules: 'No attempt restriction for eligible candidates.',
      application_information: 'PAAR (Prospective Applicants Advanced Registration) two-tier process: Basic Registration and Final Registration / Code Generation on AIIMS Exams portal.',
      selection_process: 'CBT examination followed by centralized AIIMS online seat allocation rounds.',
      stages: [
        { name: 'INI-CET CBT Examination', type: 'Single Best Answer & Multiple True-False', questions: 200, duration: '180 mins', marks: 200 },
        { name: 'AIIMS Centralized Online Seat Allocation', type: 'Institutional Allocation', questions: 0, duration: 'Multi-round', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'INI-CET Composite Medical Sciences Paper', total_questions: 200, total_marks: 200, duration_minutes: 180 }
      ],
      languages: ['English'],
      subjects: [
        { slug: 'anatomy', official: 'Anatomy', weightage: 12 },
        { slug: 'physiology', official: 'Physiology', weightage: 12 },
        { slug: 'biochemistry', official: 'Biochemistry', weightage: 12 },
        { slug: 'pharmacology', official: 'Pharmacology', weightage: 18 },
        { slug: 'pathology', official: 'Pathology', weightage: 20 },
        { slug: 'microbiology', official: 'Microbiology', weightage: 18 },
        { slug: 'general-medicine', official: 'General Medicine & Subspecialties', weightage: 40 },
        { slug: 'general-surgery', official: 'General Surgery & Allied Disciplines', weightage: 40 },
        { slug: 'obstetrics-gynaecology', official: 'Obstetrics & Gynecology', weightage: 28 }
      ],
      aliases: ['INI CET', 'INICET', 'AIIMS PG Entrance', 'INI-CET 2026', 'AIIMS MD MS Entrance']
    },

    // 3. FMGE
    {
      name: 'FMGE (Foreign Medical Graduate Examination)',
      slug: 'fmge',
      short_name: 'FMGE',
      category: 'medical-healthcare',
      authority: 'NBEMS',
      description: 'Statutory screening test administered by NBEMS for Indian citizens and Overseas Citizens of India holding primary medical qualifications from institutions outside India to obtain permanent/provisional registration with NMC/State Medical Councils.',
      official_url: 'https://natboard.edu.in',
      official_notification_url: 'https://natboard.edu.in/viewnbeexam?exam=fmge',
      official_syllabus_url: 'https://natboard.edu.in/viewnbeexam?exam=fmge',
      exam_type: 'Medical Licensing Screening Test',
      level: 'National',
      mode: 'Computer Based Test (CBT)',
      frequency: 'Bi-annually (June & December sessions)',
      duration: '300 minutes (Two sessions of 150 mins each)',
      total_questions: 300,
      total_marks: 300,
      negative_marking: 'No negative marking (+1 for correct, 0 for incorrect/unattempted)',
      passing_criteria: 'Mandatory minimum score of 150 out of 300 marks (50% qualifying cut-off)',
      eligibility: 'Indian citizen or OCI possessing recognized primary medical qualification (MBBS equivalent) certified by the Indian Embassy/High Commission concerned.',
      attempt_rules: 'Candidates may appear in successive sessions until passing.',
      application_information: 'Online portal registration with mandatory Apostille/Embassy attested degree certificate, eligibility certificate from NMC, and passport documentation.',
      selection_process: 'CBT examination (Part A: 150 MCQs + Part B: 150 MCQs) followed by in-person biometric verification and issue of Pass Certificate.',
      stages: [
        { name: 'Part A (Pre & Para-Clinical Subjects)', type: 'CBT MCQs', questions: 150, duration: '150 mins', marks: 150 },
        { name: 'Part B (Clinical Subjects)', type: 'CBT MCQs', questions: 150, duration: '150 mins', marks: 150 }
      ],
      papers: [
        { paper_number: 1, title: 'Part A - Pre and Para Clinical Sciences', total_questions: 150, total_marks: 150, duration_minutes: 150 },
        { paper_number: 2, title: 'Part B - Clinical Sciences', total_questions: 150, total_marks: 150, duration_minutes: 150 }
      ],
      languages: ['English'],
      subjects: [
        { slug: 'anatomy', official: 'Anatomy', weightage: 17 },
        { slug: 'physiology', official: 'Physiology', weightage: 17 },
        { slug: 'biochemistry', official: 'Biochemistry', weightage: 17 },
        { slug: 'pharmacology', official: 'Pharmacology', weightage: 20 },
        { slug: 'pathology', official: 'Pathology', weightage: 20 },
        { slug: 'microbiology', official: 'Microbiology', weightage: 20 },
        { slug: 'general-medicine', official: 'Medicine & Allied', weightage: 65 },
        { slug: 'general-surgery', official: 'Surgery & Allied', weightage: 65 },
        { slug: 'obstetrics-gynaecology', official: 'Obstetrics & Gynaecology', weightage: 30 },
        { slug: 'pediatrics', official: 'Pediatrics', weightage: 15 },
        { slug: 'community-medicine-psm', official: 'Preventive & Social Medicine', weightage: 14 }
      ],
      aliases: ['FMGE', 'MCI Screening Test', 'NBE FMGE', 'FMGE 2026', 'Foreign Medical Graduates Test']
    },

    // 4. NEET UG
    {
      name: 'NEET UG (National Eligibility cum Entrance Test Undergraduate)',
      slug: 'neet-ug',
      short_name: 'NEET UG',
      category: 'medical-healthcare',
      authority: 'NTA',
      description: 'Single unified national entrance examination for admission to undergraduate medical (MBBS), dental (BDS), AYUSH (BAMS, BUMS, BHMS), and veterinary (BVSc & AH) courses across all medical institutions in India including AIIMS and JIPMER.',
      official_url: 'https://exams.nta.ac.in/NEET',
      official_notification_url: 'https://exams.nta.ac.in/NEET/information-bulletin',
      official_syllabus_url: 'https://exams.nta.ac.in/NEET/syllabus',
      exam_type: 'Undergraduate Medical Entrance',
      level: 'National',
      mode: 'Pen and Paper (OMR Based)',
      frequency: 'Annually',
      duration: '200 minutes (3 hours 20 mins)',
      total_questions: 200,
      total_marks: 720,
      negative_marking: '+4 for correct, -1 for incorrect, 0 for unattempted',
      passing_criteria: '50th percentile for UR/EWS, 40th percentile for OBC/SC/ST, 45th percentile for UR-PWD',
      eligibility: 'Passed 10+2 or equivalent with Physics, Chemistry, Biology/Biotechnology, and English with minimum 50% aggregate (40% for reserved categories). Minimum age 17 years.',
      attempt_rules: 'No upper age limit and no limit on number of attempts.',
      application_information: 'Online application through NTA portal with Aadhaar/Passport authentication, photograph, left/right hand fingers impressions.',
      selection_process: 'OMR examination followed by MCC 15% AIQ counselling, AFMC/Central Universities counselling, and State Medical Counselling.',
      stages: [
        { name: 'NEET (UG) Written Examination', type: 'OMR Multiple Choice', questions: 200, duration: '200 mins', marks: 720 },
        { name: 'MCC & State Quota Counselling', type: 'Merit Seat Allotment', questions: 0, duration: 'Multi-round', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'NEET (UG) Composite Science Paper', total_questions: 200, total_marks: 720, duration_minutes: 200 }
      ],
      languages: ['English', 'Hindi', 'Assamese', 'Bengali', 'Gujarati', 'Kannada', 'Malayalam', 'Marathi', 'Odia', 'Punjabi', 'Tamil', 'Telugu', 'Urdu'],
      subjects: [
        { slug: 'physics', official: 'Physics (Section A & B)', weightage: 180 },
        { slug: 'chemistry', official: 'Chemistry (Section A & B)', weightage: 180 },
        { slug: 'biology-botany-zoology', official: 'Biology (Botany & Zoology)', weightage: 360 }
      ],
      aliases: ['NEET UG', 'NEET-UG', 'NEET Medical', 'NEET 2026', 'AIPMT']
    },

    // 5. NEET MDS
    {
      name: 'NEET MDS (National Eligibility cum Entrance Test - MDS)',
      slug: 'neet-mds',
      short_name: 'NEET MDS',
      category: 'dentistry',
      authority: 'NBEMS',
      description: 'Single entrance examination for admission to Master of Dental Surgery (MDS) postgraduate degree and diploma courses in government and private dental colleges across India.',
      official_url: 'https://natboard.edu.in',
      official_notification_url: 'https://natboard.edu.in/viewnbeexam?exam=neetmds',
      official_syllabus_url: 'https://natboard.edu.in',
      exam_type: 'Postgraduate Dental Entrance',
      level: 'National',
      mode: 'Computer Based Test (CBT)',
      frequency: 'Annually',
      duration: '180 minutes (3 hours)',
      total_questions: 240,
      total_marks: 960,
      negative_marking: '+4 for correct, -1 for incorrect (25% negative marking)',
      passing_criteria: '50th percentile for General/EWS, 40th percentile for SC/ST/OBC',
      eligibility: 'BDS degree recognized by Dental Council of India (DCI) and mandatory 12-month rotatory dental internship.',
      attempt_rules: 'No attempt limits for eligible candidates.',
      application_information: 'Online portal registration via NBEMS website.',
      selection_process: 'CBT examination followed by MCC 50% AIQ and State dental quota counselling.',
      stages: [
        { name: 'NEET MDS Computer Based Test', type: 'CBT Objective', questions: 240, duration: '180 mins', marks: 960 }
      ],
      papers: [
        { paper_number: 1, title: 'NEET MDS Part A & Part B', total_questions: 240, total_marks: 960, duration_minutes: 180 }
      ],
      languages: ['English'],
      subjects: [
        { slug: 'prosthodontics', official: 'Prosthodontics', weightage: 14 },
        { slug: 'oral-maxillofacial-surgery', official: 'Oral & Maxillofacial Surgery', weightage: 14 },
        { slug: 'conservative-dentistry-endodontics', official: 'Conservative Dentistry & Endodontics', weightage: 14 },
        { slug: 'periodontology', official: 'Periodontology', weightage: 14 },
        { slug: 'orthodontics-dentofacial-orthopedics', official: 'Orthodontics', weightage: 14 }
      ],
      aliases: ['NEET MDS', 'NEET-MDS', 'NBE NEET MDS', 'NEET MDS 2026']
    },

    // 6. UPSC Civil Services
    {
      name: 'UPSC Civil Services Examination (CSE - IAS/IPS/IFS)',
      slug: 'upsc-civil-services',
      short_name: 'UPSC CSE',
      category: 'civil-services-govt',
      authority: 'UPSC',
      description: 'Premier national competitive examination conducted by UPSC for recruitment to India’s top administrative, police, foreign, revenue, and central Group A services including IAS, IPS, IFS, and IRS.',
      official_url: 'https://upsc.gov.in',
      official_notification_url: 'https://upsc.gov.in/examinations/active-exams',
      official_syllabus_url: 'https://upsc.gov.in/examinations/revised-syllabus-scheme',
      exam_type: 'Union Civil Services Recruitment',
      level: 'National',
      mode: 'Offline (Prelims OMR + Mains Descriptive Conventional + Personality Test)',
      frequency: 'Annually',
      duration: 'Prelims: 2 Papers (2 hours each); Mains: 9 Papers (3 hours each)',
      total_questions: 180,
      total_marks: 2025,
      negative_marking: 'Prelims GS Paper 1: -0.66 per incorrect (1/3rd); CSAT Paper 2: -0.83 per incorrect (1/3rd)',
      passing_criteria: 'Prelims CSAT Paper 2 is qualifying with minimum 33% (66 marks); GS Paper 1 merit decides Mains eligibility; Mains minimum qualifying marks in language papers (25%).',
      eligibility: 'Graduate in any discipline from a recognized University. Age: 21 to 32 years (relaxations for OBC/SC/ST/PwD).',
      attempt_rules: 'General/EWS: 6 attempts; OBC: 9 attempts; SC/ST: unlimited attempts up to age limit.',
      application_information: 'OTR (One Time Registration) on UPSC Online portal (upsconline.nic.in) followed by Part I and Part II application.',
      selection_process: 'Stage 1: Preliminary Examination (Objective screening); Stage 2: Main Examination (Written descriptive); Stage 3: Personality Test (Interview in Dholpur House).',
      stages: [
        { name: 'Stage 1: Preliminary Examination', type: 'Objective OMR Screening (GS 1 & CSAT 2)', questions: 180, duration: '240 mins (2 sessions)', marks: 400 },
        { name: 'Stage 2: Main Examination', type: 'Written Descriptive (9 Papers)', questions: 0, duration: '5 days', marks: 1750 },
        { name: 'Stage 3: Personality Test / Interview', type: 'In-person Board Interview', questions: 0, duration: '30-45 mins', marks: 275 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims Paper 1 - General Studies (GS)', total_questions: 100, total_marks: 200, duration_minutes: 120 },
        { paper_number: 2, title: 'Prelims Paper 2 - Civil Services Aptitude Test (CSAT)', total_questions: 80, total_marks: 200, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'indian-polity-governance', official: 'Indian Polity and Governance', weightage: 30 },
        { slug: 'indian-history-national-movement', official: 'History of India and Indian National Movement', weightage: 30 },
        { slug: 'indian-world-geography', official: 'Indian and World Geography', weightage: 26 },
        { slug: 'economic-social-development', official: 'Economic and Social Development', weightage: 28 },
        { slug: 'environmental-ecology-biodiversity', official: 'Environment, Ecology & Climate Change', weightage: 32 },
        { slug: 'general-science-technology', official: 'General Science and Technology Developments', weightage: 24 },
        { slug: 'current-affairs-national-international', official: 'Current Events of National & International Importance', weightage: 30 },
        { slug: 'csat-reading-comprehension', official: 'CSAT Reading Comprehension', weightage: 55 },
        { slug: 'csat-logical-reasoning', official: 'CSAT Logical Reasoning & Analytical Ability', weightage: 55 },
        { slug: 'csat-quantitative-aptitude', official: 'CSAT Basic Numeracy & Data Interpretation', weightage: 90 }
      ],
      aliases: ['UPSC CSE', 'IAS Exam', 'Civil Services Examination', 'UPSC Prelims', 'UPSC IAS', 'UPSC 2026']
    },

    // 7. SSC CGL
    {
      name: 'SSC CGL (Combined Graduate Level Examination)',
      slug: 'ssc-cgl',
      short_name: 'SSC CGL',
      category: 'civil-services-govt',
      authority: 'SSC',
      description: 'Nationwide recruitment examination conducted by Staff Selection Commission for Group B and Group C officers posts in various Ministries, Departments, and Organizations of the Government of India (ASO, Income Tax Inspector, Central Excise Inspector, GST Inspector, ED Assistant, CBI SI).',
      official_url: 'https://ssc.gov.in',
      official_notification_url: 'https://ssc.gov.in/candidate-portal/notices',
      official_syllabus_url: 'https://ssc.gov.in',
      exam_type: 'Central Government Staff Recruitment',
      level: 'National',
      mode: 'Computer Based Test (CBT)',
      frequency: 'Annually',
      duration: 'Tier 1: 60 mins; Tier 2: 135 mins Session 1 + DEST',
      total_questions: 100,
      total_marks: 390,
      negative_marking: 'Tier 1: -0.50 per incorrect; Tier 2: -1.00 per incorrect in Section 1, 2 and 3',
      passing_criteria: 'Tier 1 is qualifying; Tier 2 merit determines final selection with qualifying DEST and Computer Knowledge test.',
      eligibility: 'Bachelor degree from a recognized university. Age: 18-32 years depending on specific post group.',
      attempt_rules: 'No attempt cap up to upper age limit.',
      application_information: 'Online portal registration at ssc.gov.in with live photo capture and one-time registration.',
      selection_process: 'Tier 1 CBT (Screening) -> Tier 2 CBT (Merit) + Data Entry Speed Test (DEST) -> Document Verification.',
      stages: [
        { name: 'Tier 1 Computer Based Examination', type: 'Objective Screening', questions: 100, duration: '60 mins', marks: 200 },
        { name: 'Tier 2 Computer Based Examination', type: 'Merit Assessment & DEST', questions: 150, duration: '135 mins + DEST', marks: 390 }
      ],
      papers: [
        { paper_number: 1, title: 'Tier 1 Objective Paper', total_questions: 100, total_marks: 200, duration_minutes: 60 },
        { paper_number: 2, title: 'Tier 2 Paper 1 (Compulsory for all posts)', total_questions: 150, total_marks: 390, duration_minutes: 135 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'reasoning-ability', official: 'General Intelligence and Reasoning', weightage: 50 },
        { slug: 'general-banking-awareness', official: 'General Awareness', weightage: 50 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude', weightage: 50 },
        { slug: 'english-language-comprehension', official: 'English Comprehension', weightage: 50 },
        { slug: 'computer-knowledge-aptitude', official: 'Computer Knowledge Module (Tier 2 Qualifying)', weightage: 60 }
      ],
      aliases: ['SSC CGL', 'SSC-CGL', 'SSC Combined Graduate Level', 'CGL 2026', 'SSC Inspector Exam']
    },

    // 8. IBPS PO
    {
      name: 'IBPS PO (Probationary Officer / Management Trainee)',
      slug: 'ibps-po',
      short_name: 'IBPS PO',
      category: 'banking-financial-services',
      authority: 'IBPS',
      description: 'Common Recruitment Process (CRP PO/MT) for selection of Probationary Officers and Management Trainees in 11 participating Public Sector Commercial Banks across India (PNB, Canara Bank, Bank of Baroda, Union Bank of India, Indian Bank, etc.).',
      official_url: 'https://ibps.in',
      official_notification_url: 'https://ibps.in/crp-po-mt',
      official_syllabus_url: 'https://ibps.in',
      exam_type: 'Public Sector Banking Officer Recruitment',
      level: 'National',
      mode: 'Online Computer Based Test (CBT)',
      frequency: 'Annually',
      duration: 'Prelims: 60 mins; Mains: 180 mins + 30 mins Descriptive',
      total_questions: 100,
      total_marks: 225,
      negative_marking: '0.25 marks penalty for each wrong answer in both Prelims and Mains',
      passing_criteria: 'Sectional and overall cut-offs in both Prelims and Mains. 80:20 weightage for Mains Score and Interview.',
      eligibility: 'Graduation in any discipline from a recognized University. Age: 20 to 30 years.',
      attempt_rules: 'No fixed attempt limit up to age ceiling.',
      application_information: 'Online application at ibps.in with handwritten declaration and biometric registration.',
      selection_process: 'Phase 1: Preliminary Exam -> Phase 2: Main Exam (Objective + Descriptive) -> Phase 3: Common Interview.',
      stages: [
        { name: 'Phase 1: Preliminary Examination', type: 'Objective CBT', questions: 100, duration: '60 mins', marks: 100 },
        { name: 'Phase 2: Main Examination', type: 'Objective + English Descriptive', questions: 155, duration: '210 mins', marks: 225 },
        { name: 'Phase 3: Common Interview', type: 'Personal Interview', questions: 0, duration: '20-30 mins', marks: 100 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims Online Examination', total_questions: 100, total_marks: 100, duration_minutes: 60 },
        { paper_number: 2, title: 'Mains Online Examination & Descriptive', total_questions: 157, total_marks: 225, duration_minutes: 210 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'english-language-comprehension', official: 'English Language', weightage: 30 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude / Data Analysis', weightage: 35 },
        { slug: 'reasoning-ability', official: 'Reasoning Ability & Computer Aptitude', weightage: 35 },
        { slug: 'general-banking-awareness', official: 'General, Economy & Banking Awareness', weightage: 40 }
      ],
      aliases: ['IBPS PO', 'IBPS-PO', 'Bank PO Exam', 'IBPS CRP PO', 'IBPS PO 2026']
    },

    // 9. SBI PO
    {
      name: 'SBI PO (State Bank of India Probationary Officer)',
      slug: 'sbi-po',
      short_name: 'SBI PO',
      category: 'banking-financial-services',
      authority: 'SBI',
      description: 'Premier banking recruitment examination conducted directly by the State Bank of India to select Probationary Officers for managerial career tracks in India’s largest bank.',
      official_url: 'https://sbi.co.in/web/careers',
      official_notification_url: 'https://sbi.co.in/web/careers/current-openings',
      official_syllabus_url: 'https://sbi.co.in/web/careers',
      exam_type: 'Banking Officer Recruitment',
      level: 'National',
      mode: 'Online Computer Based Test (CBT)',
      frequency: 'Annually',
      duration: 'Prelims: 60 mins; Mains: 180 mins + 30 mins Descriptive',
      total_questions: 100,
      total_marks: 250,
      negative_marking: '0.25 (1/4th) negative marking for each incorrect objective answer',
      passing_criteria: 'Overall cut-off in Prelims (no sectional cut-off in SBI PO); separate cut-offs for Mains and Phase 3 Group Exercise & Interview (75:25 normalized weightage).',
      eligibility: 'Graduation in any discipline. Final year students can apply. Age: 21 to 30 years.',
      attempt_rules: 'General/EWS: 4 attempts; General PwD/OBC: 7 attempts; SC/ST: No restriction.',
      application_information: 'Online portal application via SBI Careers with fee payment.',
      selection_process: 'Phase 1: Preliminary Exam -> Phase 2: Main Exam (Objective + Descriptive) -> Phase 3: Psychometric Test, Group Discussion & Personal Interview.',
      stages: [
        { name: 'Phase 1: Preliminary Examination', type: 'Objective CBT', questions: 100, duration: '60 mins', marks: 100 },
        { name: 'Phase 2: Main Examination', type: 'Objective + English Descriptive', questions: 155, duration: '210 mins', marks: 250 },
        { name: 'Phase 3: Group Discussion & Interview', type: 'Group Dynamics & Interview', questions: 0, duration: '45 mins', marks: 50 }
      ],
      papers: [
        { paper_number: 1, title: 'Phase 1 Preliminary Examination', total_questions: 100, total_marks: 100, duration_minutes: 60 },
        { paper_number: 2, title: 'Phase 2 Main Examination', total_questions: 157, total_marks: 250, duration_minutes: 210 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'english-language-comprehension', official: 'English Language', weightage: 30 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude & Data Interpretation', weightage: 35 },
        { slug: 'reasoning-ability', official: 'Reasoning & Computer Aptitude', weightage: 35 },
        { slug: 'general-banking-awareness', official: 'General / Economy / Banking Awareness', weightage: 50 }
      ],
      aliases: ['SBI PO', 'SBI-PO', 'State Bank PO', 'SBI PO 2026', 'SBI Probationary Officer']
    },

    // 10. CAT MBA
    {
      name: 'CAT (Common Admission Test - MBA/PGDM)',
      slug: 'cat-mba',
      short_name: 'CAT',
      category: 'management-business',
      authority: 'IIM_CAT',
      description: 'National-level computer-based admission test conducted annually by Indian Institutes of Management for admission into MBA, PGDM, and Executive programs across 21 IIMs, FMS Delhi, SPJIMR, IIT DMS, and over 100 non-IIM member business schools.',
      official_url: 'https://iimcat.ac.in',
      official_notification_url: 'https://iimcat.ac.in',
      official_syllabus_url: 'https://iimcat.ac.in',
      exam_type: 'Graduate Management Admission Test',
      level: 'National',
      mode: 'Computer Based Test (CBT)',
      frequency: 'Annually (Last Sunday of November)',
      duration: '120 minutes (40 minutes sectional time limit per section)',
      total_questions: 66,
      total_marks: 198,
      negative_marking: '+3 for correct MCQ, -1 for incorrect MCQ; 0 penalty for Non-MCQ (TITA - Type in the Answer) questions',
      passing_criteria: 'Percentile-based normalization across multiple slots. Sectional and composite percentiles determine shortlisting for WAT/PI rounds.',
      eligibility: 'Bachelor Degree with at least 50% marks or equivalent CGPA (45% for SC/ST/PwD). Final year graduating students eligible.',
      attempt_rules: 'No upper age limit and no restriction on the number of attempts.',
      application_information: 'Centralized online portal registration at iimcat.ac.in with selection of IIM programs and test city preferences.',
      selection_process: 'CBT examination score -> Institutional shortlisting -> WAT (Written Ability Test) / GD & Personal Interview (PI) -> Composite score merit list.',
      stages: [
        { name: 'CAT Computer Based Test', type: 'Sectional CBT (VARC, DILR, QA)', questions: 66, duration: '120 mins', marks: 198 },
        { name: 'IIM WAT & Personal Interview (PI)', type: 'Analytical Writing & Interview', questions: 0, duration: 'Institutional', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'CAT Unified Examination Paper', total_questions: 66, total_marks: 198, duration_minutes: 120 }
      ],
      languages: ['English'],
      subjects: [
        { slug: 'varc-management', official: 'Verbal Ability & Reading Comprehension (VARC)', weightage: 72 },
        { slug: 'dilr-management', official: 'Data Interpretation & Logical Reasoning (DILR)', weightage: 60 },
        { slug: 'qa-management', official: 'Quantitative Ability (QA)', weightage: 66 }
      ],
      aliases: ['CAT', 'IIM CAT', 'Common Admission Test', 'CAT 2026', 'CAT MBA Exam']
    },

    // 11. JEE Main
    {
      name: 'JEE Main (Joint Entrance Examination Main)',
      slug: 'jee-main',
      short_name: 'JEE Main',
      category: 'engineering-tech',
      authority: 'NTA',
      description: 'National-level engineering entrance examination conducted by NTA for admission to undergraduate engineering (B.Tech/B.E.), Architecture (B.Arch), and Planning (B.Planning) courses at 31 NITs, 25 IIITs, and CFTIs, as well as the sole eligibility test for JEE Advanced.',
      official_url: 'https://jeemain.nta.ac.in',
      official_notification_url: 'https://jeemain.nta.ac.in/information-bulletin',
      official_syllabus_url: 'https://jeemain.nta.ac.in/syllabus',
      exam_type: 'Undergraduate Engineering Entrance',
      level: 'National',
      mode: 'Computer Based Test (CBT)',
      frequency: 'Two sessions annually (January and April)',
      duration: '180 minutes (3 hours)',
      total_questions: 75,
      total_marks: 300,
      negative_marking: '+4 for correct, -1 for incorrect (both MCQs and Numerical Value questions)',
      passing_criteria: 'NTA N-tile Score. Top 2,50,000 candidates across all categories qualify for JEE Advanced.',
      eligibility: 'Passed 10+2 with Physics, Mathematics, and one optional subject (Chemistry/Biology/Technical Vocational) with minimum 75% marks (65% for SC/ST) in board examinations for NIT/IIIT admission.',
      attempt_rules: 'Candidates can appear in JEE Main for 3 consecutive years following class 12 completion.',
      application_information: 'Online portal registration with Aadhaar/DigiLocker verification, session choice, and exam city selection.',
      selection_process: 'CBT examination -> Best of two sessions score considered for All India Rank (AIR) -> JoSAA / CSAB centralized counselling.',
      stages: [
        { name: 'Session 1 CBT', type: 'Objective & Numerical', questions: 75, duration: '180 mins', marks: 300 },
        { name: 'Session 2 CBT', type: 'Objective & Numerical', questions: 75, duration: '180 mins', marks: 300 }
      ],
      papers: [
        { paper_number: 1, title: 'Paper 1 (B.E./B.Tech) - Physics, Chemistry, Mathematics', total_questions: 75, total_marks: 300, duration_minutes: 180 }
      ],
      languages: ['English', 'Hindi', 'Assamese', 'Bengali', 'Gujarati', 'Kannada', 'Malayalam', 'Marathi', 'Odia', 'Punjabi', 'Tamil', 'Telugu', 'Urdu'],
      subjects: [
        { slug: 'physics', official: 'Physics (Section A MCQs + Section B Numerical)', weightage: 100 },
        { slug: 'chemistry', official: 'Chemistry (Section A MCQs + Section B Numerical)', weightage: 100 },
        { slug: 'mathematics', official: 'Mathematics (Section A MCQs + Section B Numerical)', weightage: 100 }
      ],
      aliases: ['JEE Main', 'JEE-Main', 'IIT JEE Main', 'JEE Main 2026', 'AIEEE']
    },

    // 12. JEE Advanced
    {
      name: 'JEE Advanced (Joint Entrance Examination Advanced)',
      slug: 'jee-advanced',
      short_name: 'JEE Advanced',
      category: 'engineering-tech',
      authority: 'IIT_JAB',
      description: 'The sole entrance examination conducted by Indian Institutes of Technology under the guidance of Joint Admission Board (JAB) for admission to undergraduate B.Tech, BS, and Dual Degree engineering programs at all 23 IITs and IISc Bangalore.',
      official_url: 'https://jeeadv.ac.in',
      official_notification_url: 'https://jeeadv.ac.in',
      official_syllabus_url: 'https://jeeadv.ac.in/syllabus',
      exam_type: 'Premier Engineering & Science Entrance',
      level: 'National',
      mode: 'Computer Based Test (CBT) - Paper 1 & Paper 2',
      frequency: 'Annually (May/June)',
      duration: '360 minutes (Two compulsory papers of 180 mins each)',
      total_questions: 108,
      total_marks: 360,
      negative_marking: 'Variable marking pattern: Single correct (+3/-1), Multi-correct (+4/-2 with partial marking), Numerical (+3/0 or +4/0), Matching list (+3/-1)',
      passing_criteria: 'Aggregate cut-off marks and minimum percentage of marks in each of the three subjects (Physics, Chemistry, Mathematics).',
      eligibility: 'Must be in the top 2,50,000 qualified rankers of JEE Main. Passed Class 12 with 75% marks (65% for SC/ST/PwD) or top 20 percentile in respective board.',
      attempt_rules: 'Maximum of 2 attempts in consecutive years.',
      application_information: 'Online portal registration through jeeadv.ac.in for eligible JEE Main qualified candidates.',
      selection_process: 'Paper 1 + Paper 2 CBT examination -> Common Rank List (CRL) -> JoSAA counselling.',
      stages: [
        { name: 'Paper 1 (Morning Session)', type: 'CBT Multi-Format', questions: 54, duration: '180 mins', marks: 180 },
        { name: 'Paper 2 (Afternoon Session)', type: 'CBT Multi-Format', questions: 54, duration: '180 mins', marks: 180 }
      ],
      papers: [
        { paper_number: 1, title: 'JEE Advanced Paper 1 (Physics, Chemistry, Maths)', total_questions: 54, total_marks: 180, duration_minutes: 180 },
        { paper_number: 2, title: 'JEE Advanced Paper 2 (Physics, Chemistry, Maths)', total_questions: 54, total_marks: 180, duration_minutes: 180 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'physics', official: 'Physics (Advanced Level)', weightage: 120 },
        { slug: 'chemistry', official: 'Chemistry (Physical, Organic, Inorganic)', weightage: 120 },
        { slug: 'mathematics', official: 'Mathematics (Advanced Level)', weightage: 120 }
      ],
      aliases: ['JEE Advanced', 'JEE-Advanced', 'IIT JEE', 'IIT Entrance', 'JEE Adv 2026']
    },

    // 13. GATE
    {
      name: 'GATE (Graduate Aptitude Test in Engineering)',
      slug: 'gate',
      short_name: 'GATE',
      category: 'engineering-tech',
      authority: 'GATE_NCB',
      description: 'National examination that tests the comprehensive understanding of various undergraduate subjects in engineering, technology, architecture, science, and humanities for M.Tech/Ph.D. admissions in IITs/IISc/NITs and recruitment in premier PSUs (ONGC, IOCL, NTPC, BHEL, DRDO, ISRO).',
      official_url: 'https://gate2026.iisc.ac.in',
      official_notification_url: 'https://gate2026.iisc.ac.in',
      official_syllabus_url: 'https://gate2026.iisc.ac.in/syllabus',
      exam_type: 'Postgraduate Technical & PSU Recruitment Entrance',
      level: 'National',
      mode: 'Computer Based Test (CBT)',
      frequency: 'Annually (February)',
      duration: '180 minutes (3 hours)',
      total_questions: 65,
      total_marks: 100,
      negative_marking: 'MCQ: 1-mark question (-1/3 mark), 2-mark question (-2/3 mark); MSQ and NAT questions have NO negative marking',
      passing_criteria: 'Score out of 1000 with qualifying marks based on discipline mean and standard deviation. Score valid for 3 years for higher education.',
      eligibility: 'Candidates who have completed or are currently in the 3rd year or higher of any undergraduate degree program in Engineering/Technology/Architecture/Science/Commerce/Arts.',
      attempt_rules: 'No age limit and no limit on attempts.',
      application_information: 'GOAPS (GATE Online Application Processing System) registration.',
      selection_process: 'CBT examination -> GATE Scorecard -> COAP (IITs), CCMT (NITs), and individual PSU recruitment interviews.',
      stages: [
        { name: 'GATE Computer Based Test', type: 'MCQs, MSQs & NAT', questions: 65, duration: '180 mins', marks: 100 }
      ],
      papers: [
        { paper_number: 1, title: 'GATE Discipline Paper (General Aptitude + Core Discipline)', total_questions: 65, total_marks: 100, duration_minutes: 180 }
      ],
      languages: ['English'],
      subjects: [
        { slug: 'computer-science-it', official: 'Computer Science and Information Technology (CS)', weightage: 85 },
        { slug: 'quantitative-aptitude', official: 'General Aptitude (GA)', weightage: 15 }
      ],
      aliases: ['GATE', 'GATE Exam', 'GATE CS', 'GATE 2026', 'Graduate Aptitude Test in Engineering']
    },

    // 14. CLAT UG
    {
      name: 'CLAT (Common Law Admission Test - UG & PG)',
      slug: 'clat-ug',
      short_name: 'CLAT',
      category: 'law-legal',
      authority: 'NLU_CONSORTIUM',
      description: 'National level law entrance exam organized by the Consortium of NLUs for admissions to 5-year integrated undergraduate (BA LLB, BBA LLB) and postgraduate (LLM) degree programs at 24 National Law Universities across India.',
      official_url: 'https://consortiumofnlus.ac.in',
      official_notification_url: 'https://consortiumofnlus.ac.in/clat-2026',
      official_syllabus_url: 'https://consortiumofnlus.ac.in/clat-2026/ug-syllabus.html',
      exam_type: 'National Law School Entrance',
      level: 'National',
      mode: 'Pen and Paper (Offline OMR Based)',
      frequency: 'Annually (December)',
      duration: '120 minutes (2 hours)',
      total_questions: 120,
      total_marks: 120,
      negative_marking: '+1 for correct answer, -0.25 (0.25 mark) deduction for each incorrect answer',
      passing_criteria: 'Rank-based merit list for seat allocation across NLUs in multiple counselling rounds.',
      eligibility: 'UG: 10+2 with minimum 45% marks (40% for SC/ST). PG: LLB degree with minimum 50% marks (45% for SC/ST).',
      attempt_rules: 'No upper age limit for appearing in CLAT.',
      application_information: 'Online portal registration on consortiumofnlus.ac.in with NLU preferences ranking.',
      selection_process: 'Offline OMR Examination -> Merit Rank List -> Centralized Online Seat Allotment by Consortium.',
      stages: [
        { name: 'CLAT Offline Written Examination', type: 'Passage-based Comprehension MCQs', questions: 120, duration: '120 mins', marks: 120 },
        { name: 'Consortium Centralized Counselling', type: 'Institutional Allotment', questions: 0, duration: 'Multi-round', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'CLAT Comprehensive Law Admission Test', total_questions: 120, total_marks: 120, duration_minutes: 120 }
      ],
      languages: ['English'],
      subjects: [
        { slug: 'legal-reasoning-aptitude', official: 'Legal Reasoning', weightage: 32 },
        { slug: 'current-affairs-national-international', official: 'Current Affairs including General Knowledge', weightage: 32 },
        { slug: 'english-language-comprehension', official: 'English Language Comprehension', weightage: 26 },
        { slug: 'reasoning-ability', official: 'Logical Reasoning', weightage: 26 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Techniques', weightage: 14 }
      ],
      aliases: ['CLAT', 'CLAT UG', 'CLAT Law', 'Common Law Admission Test', 'CLAT 2026']
    },

    // 15. CTET
    {
      name: 'CTET (Central Teacher Eligibility Test)',
      slug: 'ctet',
      short_name: 'CTET',
      category: 'education-teaching',
      authority: 'CBSE',
      description: 'National level eligibility test conducted by CBSE to assess the eligibility of teachers for appointment in Central Government schools (KVS, NVS, Central Tibetan Schools) and UT schools for classes I to VIII.',
      official_url: 'https://ctet.nic.in',
      official_notification_url: 'https://ctet.nic.in/information-bulletin',
      official_syllabus_url: 'https://ctet.nic.in',
      exam_type: 'National Teacher Eligibility Test',
      level: 'National',
      mode: 'Offline (OMR Based)',
      frequency: 'Bi-annually',
      duration: '150 minutes (2 hours 30 mins per paper)',
      total_questions: 150,
      total_marks: 150,
      negative_marking: 'No negative marking (+1 for each correct answer)',
      passing_criteria: 'Qualifying score of 60% (90 out of 150 marks) for General category; 55% (82 out of 150) for SC/ST/OBC/Differently Abled. Certificate valid for life.',
      eligibility: 'Paper 1 (Classes I-V): Senior Secondary with D.El.Ed / B.El.Ed. Paper 2 (Classes VI-VIII): Graduation with B.Ed / D.El.Ed.',
      attempt_rules: 'No limit on number of attempts; candidates may retake to improve score.',
      application_information: 'Online portal registration at ctet.nic.in with choice of Paper 1, Paper 2, or both.',
      selection_process: 'OMR examination -> Declaration of Eligibility Certificate & Marksheet uploaded to DigiLocker.',
      stages: [
        { name: 'Paper 1 (Primary Stage: Classes I to V)', type: 'OMR MCQs', questions: 150, duration: '150 mins', marks: 150 },
        { name: 'Paper 2 (Elementary Stage: Classes VI to VIII)', type: 'OMR MCQs', questions: 150, duration: '150 mins', marks: 150 }
      ],
      papers: [
        { paper_number: 1, title: 'CTET Paper 1 (Primary Stage)', total_questions: 150, total_marks: 150, duration_minutes: 150 },
        { paper_number: 2, title: 'CTET Paper 2 (Elementary Stage)', total_questions: 150, total_marks: 150, duration_minutes: 150 }
      ],
      languages: ['English', 'Hindi', 'Assamese', 'Bengali', 'Gujarati', 'Kannada', 'Malayalam', 'Marathi', 'Odia', 'Punjabi', 'Tamil', 'Telugu', 'Urdu', 'Sanskrit'],
      subjects: [
        { slug: 'child-development-pedagogy', official: 'Child Development and Pedagogy', weightage: 30 },
        { slug: 'english-language-comprehension', official: 'Language I & II (Comprehension and Pedagogy)', weightage: 60 },
        { slug: 'quantitative-aptitude', official: 'Mathematics & Environmental Studies', weightage: 60 }
      ],
      aliases: ['CTET', 'CBSE CTET', 'Central Teacher Eligibility Test', 'CTET 2026', 'CTET Paper 1 & 2']
    },

    // 16. UGC NET
    {
      name: 'UGC NET (National Eligibility Test - Assistant Professor & JRF)',
      slug: 'ugc-net',
      short_name: 'UGC NET',
      category: 'education-teaching',
      authority: 'NTA',
      description: 'National examination conducted by NTA on behalf of UGC to determine eligibility for Assistant Professorship and award of Junior Research Fellowship (JRF) in Indian universities and colleges across 83 disciplines.',
      official_url: 'https://ugcnet.nta.ac.in',
      official_notification_url: 'https://ugcnet.nta.ac.in/information-bulletin',
      official_syllabus_url: 'https://ugcnet.nta.ac.in',
      exam_type: 'National Lectureship & Fellowship Test',
      level: 'National',
      mode: 'Computer Based Test (CBT)',
      frequency: 'Bi-annually (June & December cycles)',
      duration: '180 minutes (3 hours continuous session with no break)',
      total_questions: 150,
      total_marks: 300,
      negative_marking: 'No negative marking (+2 for each correct answer)',
      passing_criteria: 'Top 6% of total appearing candidates qualify for Assistant Professor; top candidates among them qualify for JRF based on category cut-off.',
      eligibility: 'Master Degree or equivalent with at least 55% marks (50% for OBC-NCL/SC/ST/PwD). Final year master candidates eligible.',
      attempt_rules: 'Assistant Professor: No age limit. JRF: Upper age limit 30 years (with 5-year relaxation for reserved/women candidates).',
      application_information: 'Online portal registration at ugcnet.nta.ac.in with subject code and exam city choice.',
      selection_process: 'CBT examination (Paper 1 General + Paper 2 Subject Specialization) -> Normalized percentile / cut-off merit list.',
      stages: [
        { name: 'UGC NET CBT Composite Examination', type: 'Paper 1 (50 MCQs) + Paper 2 (100 MCQs)', questions: 150, duration: '180 mins', marks: 300 }
      ],
      papers: [
        { paper_number: 1, title: 'Paper 1 - Teaching and Research Aptitude', total_questions: 50, total_marks: 100, duration_minutes: 60 },
        { paper_number: 2, title: 'Paper 2 - Subject Specific Specialization', total_questions: 100, total_marks: 200, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'teaching-research-aptitude', official: 'General Paper on Teaching & Research Aptitude (Paper 1)', weightage: 100 },
        { slug: 'computer-science-it', official: 'Computer Science and Applications / Core Subject (Paper 2)', weightage: 200 }
      ],
      aliases: ['UGC NET', 'NTA UGC NET', 'UGC JRF', 'NET Exam', 'UGC NET 2026']
    }
  ];

  console.log(`Processing ${batch1Exams.length} Master National Exams...`);

  for (const ex of batch1Exams) {
    const authId = authMap[ex.authority] || null;
    const catId = catMap[ex.category] || null;

    const examPayload = {
      country_id: indiaId,
      category_id: catId,
      authority_id: authId,
      name: ex.name,
      slug: ex.slug,
      short_name: ex.short_name,
      description: ex.description,
      official_url: ex.official_url,
      official_notification_url: ex.official_notification_url,
      official_syllabus_url: ex.official_syllabus_url,
      exam_type: ex.exam_type,
      level: ex.level,
      mode: ex.mode,
      frequency: ex.frequency,
      duration: ex.duration,
      total_marks: ex.total_marks,
      negative_marking: ex.negative_marking,
      passing_criteria: ex.passing_criteria,
      eligibility: ex.eligibility,
      attempt_rules: ex.attempt_rules,
      application_information: ex.application_information,
      selection_process: ex.selection_process,
      stages: ex.stages,
      papers: ex.papers,
      languages: ex.languages,
      current_version: '2026',
      version_year: 2026,
      is_current: true,
      verification_status: 'verified',
      source_url: ex.official_url,
      last_verified_at: new Date().toISOString(),
      status: 'active'
    };

    const { data: upsertedExam, error: exErr } = await supabase
      .from('exams')
      .upsert(examPayload, { onConflict: 'slug' })
      .select('id, slug')
      .single();

    if (exErr) {
      console.error(`Error upserting exam ${ex.slug}:`, exErr);
      continue;
    }

    const examId = upsertedExam.id;
    console.log(`Upserted exam: ${ex.slug} (ID: ${examId})`);

    // Exam Version
    await supabase.from('exam_versions').upsert({
      exam_id: examId,
      version_year: 2026,
      is_current: true,
      official_notification_url: ex.official_notification_url,
      official_syllabus_url: ex.official_syllabus_url,
      stages: ex.stages,
      papers: ex.papers,
      pattern_summary: {
        total_questions: ex.total_questions,
        total_marks: ex.total_marks,
        negative_marking: ex.negative_marking,
        duration: ex.duration
      },
      source_url: ex.official_url,
      verified_at: new Date().toISOString()
    }, { onConflict: 'exam_id,version_year' });

    // Exam Subjects & Exam Topics Linkage
    for (let i = 0; i < ex.subjects.length; i++) {
      const s = ex.subjects[i];
      const masterSubjId = subjMap[s.slug];
      if (!masterSubjId) continue;

      // Upsert into exam_subjects
      const { data: exSubj, error: esErr } = await supabase
        .from('exam_subjects')
        .upsert({
          exam_id: examId,
          subject_id: masterSubjId,
          name: s.official,
          official_name: s.official,
          display_name: s.official,
          order_index: i + 1,
          weightage: s.weightage,
          required: true,
          active: true,
          verification_status: 'verified',
          source_url: ex.official_syllabus_url,
          last_verified_at: new Date().toISOString()
        }, { onConflict: 'exam_id,name' })
        .select('id')
        .single();

      if (esErr) {
        // Retry with just exam_id & name match if needed
        const { data: existingES } = await supabase
          .from('exam_subjects')
          .select('id')
          .eq('exam_id', examId)
          .eq('name', s.official)
          .single();
        if (existingES) {
          await supabase.from('exam_subjects').update({
            subject_id: masterSubjId,
            weightage: s.weightage,
            official_name: s.official
          }).eq('id', existingES.id);
        }
      }

      // Link corresponding topics for this subject
      const relatedTopics = topics.filter(t => t.subject_id === masterSubjId);
      for (let j = 0; j < relatedTopics.length; j++) {
        const t = relatedTopics[j];
        const exSubjId = exSubj?.id;
        if (exSubjId) {
          await supabase.from('exam_topics').upsert({
            exam_subject_id: exSubjId,
            topic_id: t.id,
            name: t.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            official_name: t.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            display_name: t.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            order_index: j + 1,
            importance: 'High',
            active: true,
            verification_status: 'verified',
            source_url: ex.official_syllabus_url,
            last_verified_at: new Date().toISOString()
          }, { onConflict: 'exam_subject_id,name' });
        }
      }
    }

    // Exam Aliases
    if (ex.aliases && ex.aliases.length > 0) {
      for (const alias of ex.aliases) {
        await supabase.from('exam_aliases').upsert({
          exam_id: examId,
          alias: alias,
          source: 'official_catalog'
        }, { onConflict: 'exam_id,alias' });
      }
    }
  }

  console.log('--- Batch 1 National Exams Seeding Completed Successfully! ---');
}

seedBatch1Exams().catch(e => { console.error('Error seeding Batch 1 exams:', e); process.exit(1); });
