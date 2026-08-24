import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const AU_COUNTRY_ID = 'e3c9933a-9f4b-4f0a-b901-b03b159ff5e5';

// Category IDs
const CATEGORIES = {
  MEDICAL: '94df63ea-25b6-428e-adbb-530fa6b322fe',
  NURSING: 'e6aa59a3-7eb7-41dc-8382-9a4cc897df40',
  PHARMACY: 'f35b1d10-c3a7-409d-9645-c84aa7dd0bbf',
  DENTISTRY: '10f60fc5-4bc2-4ba2-af74-93927830bd05',
  ENGINEERING: '12cfb289-8aa4-4333-b4b8-b99617c4b22d',
  UNIVERSITY_ENTRANCE: '723a40bd-9133-42ab-a673-c3a582667631',
  LAW: '03c5e448-f51a-4c12-9cc9-643c812905db',
  ACCOUNTING: 'aa77b6fd-97ab-4e06-8525-a157f8cf92a1',
  BUSINESS: 'efc1e9bf-78d9-479d-9afc-8244301b46b5',
  EDUCATION: '97a61966-7805-4b4f-80ed-e8b7dee1eb48',
  LANGUAGE: '5b76c375-69d5-4b95-b3ea-d036537b7756',
};

// Authorities
const AUTHORITIES = [
  { code: 'AMC', name: 'Australian Medical Council', short_name: 'AMC', slug: 'australian-medical-council', official_website: 'https://www.amc.org.au', description: 'National standards and assessment body for medical education and registration in Australia.' },
  { code: 'RACP', name: 'Royal Australasian College of Physicians', short_name: 'RACP', slug: 'royal-australasian-college-of-physicians', official_website: 'https://www.racp.edu.au', description: 'Professional medical college responsible for training and certifying physicians and pediatricians in Australia and New Zealand.' },
  { code: 'RACS', name: 'Royal Australasian College of Surgeons', short_name: 'RACS', slug: 'royal-australasian-college-of-surgeons', official_website: 'https://www.surgeons.org', description: 'Leading advocate for surgical standards and education across Australia and New Zealand.' },
  { code: 'ANZCA', name: 'Australian and New Zealand College of Anaesthetists', short_name: 'ANZCA', slug: 'australian-new-zealand-college-of-anaesthetists', official_website: 'https://www.anzca.edu.au', description: 'Professional body responsible for anaesthesia and pain medicine education and examinations.' },
  { code: 'RACGP', name: 'Royal Australian College of General Practitioners', short_name: 'RACGP', slug: 'royal-australian-college-of-general-practitioners', official_website: 'https://www.racgp.org.au', description: 'Australia’s largest professional general practice organization overseeing FRACGP fellowship.' },
  { code: 'ACRRM', name: 'Australian College of Rural and Remote Medicine', short_name: 'ACRRM', slug: 'australian-college-of-rural-remote-medicine', official_website: 'https://www.acrrm.org.au', description: 'Professional medical college dedicated to rural and remote general practice.' },
  { code: 'RANZCP', name: 'Royal Australian and New Zealand College of Psychiatrists', short_name: 'RANZCP', slug: 'royal-australian-new-zealand-college-of-psychiatrists', official_website: 'https://www.ranzcp.org', description: 'Professional organization training and representing psychiatrists in Australia and NZ.' },
  { code: 'NMBA_AHPRA', name: 'Nursing and Midwifery Board of Australia / AHPRA', short_name: 'NMBA / AHPRA', slug: 'nursing-midwifery-board-australia', official_website: 'https://www.nursingmidwiferyboard.gov.au', description: 'National board regulating Australian nurses, midwives, and overseas registration assessment pathways.' },
  { code: 'APC', name: 'Australian Pharmacy Council', short_name: 'APC', slug: 'australian-pharmacy-council', official_website: 'https://www.pharmacycouncil.org.au', description: 'Independent accreditation authority for pharmacy education and overseas pharmacist registration assessments.' },
  { code: 'ADC', name: 'Australian Dental Council', short_name: 'ADC', slug: 'australian-dental-council', official_website: 'https://www.adc.org.au', description: 'Independent authority regulating dental education and assessing overseas dental practitioners.' },
  { code: 'EA', name: 'Engineers Australia', short_name: 'Engineers Australia', slug: 'engineers-australia', official_website: 'https://www.engineersaustralia.org.au', description: 'National professional body for engineering, migration skills assessment, and Stage 1 competency.' },
  { code: 'UCAT_ANZ_CONSORTIUM', name: 'UCAT ANZ Consortium', short_name: 'UCAT ANZ Consortium', slug: 'ucat-anz-consortium', official_website: 'https://www.ucat.edu.au', description: 'Consortium of Australian and New Zealand universities administering medical and dental school entry testing.' },
  { code: 'ACER', name: 'Australian Council for Educational Research', short_name: 'ACER', slug: 'australian-council-for-educational-research', official_website: 'https://www.acer.org', description: 'Leading educational research organization administering GAMSAT, ISAT, STAT, and LANTITE.' },
  { code: 'LPAB', name: 'Legal Profession Admission Board NSW', short_name: 'LPAB', slug: 'legal-profession-admission-board', official_website: 'https://www.lpab.justice.nsw.gov.au', description: 'Statutory body administering Diploma in Law examinations for admission to legal practice.' },
  { code: 'LACC', name: 'Law Admissions Consultative Council', short_name: 'LACC', slug: 'law-admissions-consultative-council', official_website: 'https://www.lawcouncil.asn.au', description: 'National consultative body advising state admissions authorities on Priestley 11 legal requirements.' },
  { code: 'CA_ANZ', name: 'Chartered Accountants Australia and New Zealand', short_name: 'CA ANZ', slug: 'chartered-accountants-anz', official_website: 'https://www.charteredaccountantsanz.com', description: 'Professional accounting body representing over 130,000 financial professionals across Australia and NZ.' },
  { code: 'CPA_AU', name: 'CPA Australia', short_name: 'CPA Australia', slug: 'cpa-australia', official_website: 'https://www.cpaaustralia.com.au', description: 'Global accounting body conducting the CPA Program professional qualification examinations.' },
  { code: 'CBLA', name: 'Cambridge Boxhill Language Assessment', short_name: 'CBLA', slug: 'cambridge-boxhill-language-assessment', official_website: 'https://www.occupationalenglishtest.org', description: 'Administrator of the Occupational English Test (OET) for healthcare professionals.' },
];

// Australian Exam Definitions
const AU_EXAMS = [
  // 1. AMC CAT MCQ
  {
    slug: 'amc-cat-mcq',
    name: 'AMC CAT MCQ Examination (Australian Medical Council)',
    short_name: 'AMC CAT MCQ',
    authority_code: 'AMC',
    category_id: CATEGORIES.MEDICAL,
    description: 'The AMC Computer Adaptive Test (CAT) MCQ examination is a 150-question computer-based assessment evaluating essential medical knowledge and clinical reasoning for international medical graduates seeking registration in Australia.',
    difficulty: 'Expert',
    question_count: 150,
    time_limit_mins: 210,
    is_featured: true,
    official_url: 'https://www.amc.org.au/assessment/mcq-examination/',
    official_notification_url: 'https://www.amc.org.au/assessment/mcq-examination/mcq-dates/',
    official_syllabus_url: 'https://www.amc.org.au/assessment/mcq-examination/mcq-examination-specifications/',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '3.5 Hours',
    total_marks: 150,
    negative_marking: 'Adaptive scoring (Rasch item-response model)',
    passing_criteria: 'Standard set scaled passing score of 250 out of 500',
    eligibility: 'Primary medical qualification (MBBS or equivalent) from a medical school listed in World Directory of Medical Schools.',
    attempt_rules: 'Candidates may attempt the AMC MCQ exam multiple times subject to AMC scheduling policies.',
    selection_process: 'CBT examination administered globally via Pearson VUE test centers.',
    stages: ['AMC MCQ Examination (CBT)', 'AMC Clinical Examination (OSCE / Workplace-Based Assessment)'],
    papers: ['150 Adaptive Computer-Based Questions (120 scored, 30 pilot)'],
    languages: ['English'],
    aliases: ['AMC CAT MCQ', 'AMC CAT', 'AMC MCQ', 'Australian Medical Council MCQ', 'AMC Part 1'],
    subjects: [
      {
        name: 'Internal Medicine & Therapeutics',
        official_name: 'Adult Medicine & Therapeutics',
        description: 'Cardiology, respiratory, gastroenterology, endocrinology, renal, neurology, and clinical therapeutics.',
        weight: 30,
        topics: [
          'Cardiovascular System & Acute Coronary Syndromes',
          'Respiratory Medicine & Chronic Airway Diseases',
          'Endocrinology, Diabetes & Metabolic Disorders',
          'Gastroenterology, Hepatology & Clinical Therapeutics',
        ],
      },
      {
        name: 'Surgery & Perioperative Care',
        official_name: 'General Surgery & Trauma',
        description: 'Acute abdominal emergencies, trauma management, surgical oncology, and perioperative clinical care.',
        weight: 20,
        topics: [
          'Acute Abdominal Emergencies & Differential Diagnosis',
          'Trauma Resuscitation & Emergency Surgical Management',
          'Perioperative Fluid Balance & Wound Care',
          'Vascular & Urological Emergencies',
        ],
      },
      {
        name: 'Obstetrics & Gynaecology',
        official_name: 'Women’s Health & Obstetrics',
        description: 'Antenatal care, intrapartum complications, gynaecological oncology, contraception, and reproductive endocrinology.',
        weight: 15,
        topics: [
          'Antenatal Care & Fetal Surveillance',
          'Intrapartum Management & Obstetric Emergencies',
          'Gynecological Disorders & Cervical Screening',
        ],
      },
      {
        name: 'Paediatrics & Child Health',
        official_name: 'Child & Adolescent Health',
        description: 'Neonatal resuscitation, acute paediatric infections, growth and development milestones, and child protection.',
        weight: 15,
        topics: [
          'Neonatal Care & Resuscitation Protocols',
          'Acute Paediatric Respiratory & Febrile Illnesses',
          'Developmental Milestones & Immunization Schedules',
        ],
      },
      {
        name: 'Psychiatry & Behavioral Health',
        official_name: 'Mental Health & Clinical Psychiatry',
        description: 'Mood disorders, psychosis, substance misuse, psychopharmacology, and Mental Health Act legalities.',
        weight: 10,
        topics: [
          'Mood Disorders, Depression & Risk Assessment',
          'Psychotic Disorders & Emergency Psychopharmacology',
          'Cognitive Disorders & Mental Health Legal Frameworks',
        ],
      },
      {
        name: 'General Practice & Public Health',
        official_name: 'Population Health & Preventive Medicine',
        description: 'Preventive healthcare, epidemiology, ethics, Indigenous health, and Australian healthcare systems.',
        weight: 10,
        topics: [
          'Aboriginal and Torres Strait Islander Health Care',
          'Preventive Health, Screening & Epidemiology',
          'Medical Ethics, Capacity & Informed Consent',
        ],
      },
    ],
  },

  // 2. AMC Clinical Examination
  {
    slug: 'amc-clinical-examination',
    name: 'AMC Clinical Examination (Australian Medical Council)',
    short_name: 'AMC Clinical',
    authority_code: 'AMC',
    category_id: CATEGORIES.MEDICAL,
    description: 'The AMC Clinical Examination is a 16-station Objective Structured Clinical Examination (OSCE) assessing clinical history taking, physical examination, diagnostic reasoning, and management across core clinical disciplines.',
    difficulty: 'Expert',
    question_count: 16,
    time_limit_mins: 240,
    is_featured: true,
    official_url: 'https://www.amc.org.au/assessment/clinical-examination/',
    official_notification_url: 'https://www.amc.org.au/assessment/clinical-examination/clinical-examination-dates/',
    official_syllabus_url: 'https://www.amc.org.au/assessment/clinical-examination/clinical-examination-specifications/',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'OSCE Clinical Exam',
    duration: '4 Hours (16 Stations)',
    total_marks: 16,
    negative_marking: 'Station-by-station holistic marking',
    passing_criteria: 'Pass at least 12 out of 14 assessed stations',
    eligibility: 'Must pass AMC CAT MCQ examination first.',
    attempt_rules: 'Subject to AMC clinical re-sit policies.',
    selection_process: 'OSCE examination at National Test Centres (e.g. Melbourne) or online clinical format.',
    stages: ['AMC Clinical OSCE Examination'],
    papers: ['16 Clinical OSCE Stations (14 assessed, 2 rest/pilot)'],
    languages: ['English'],
    aliases: ['AMC Clinical', 'AMC OSCE', 'AMC Clinical Exam', 'Australian Medical Council Clinical'],
    subjects: [
      {
        name: 'Clinical History & Communication',
        official_name: 'Medical History & Patient Communication',
        description: 'Focused history taking, empathetic communication, breaking bad news, and patient counseling.',
        weight: 35,
        topics: [
          'Focused Adult Clinical History Taking',
          'Paediatric & Proxy History Taking',
          'Communication in Difficult & Sensitive Consultations',
        ],
      },
      {
        name: 'Physical Examination Skills',
        official_name: 'Clinical Physical Assessment',
        description: 'Systematic examination of cardiovascular, respiratory, abdominal, neurological, and musculoskeletal systems.',
        weight: 35,
        topics: [
          'Cardiovascular & Respiratory Physical Examination',
          'Abdominal & Gastrointestinal System Examination',
          'Central & Peripheral Nervous System Examination',
        ],
      },
      {
        name: 'Clinical Management & Counselling',
        official_name: 'Diagnostic Reasoning & Management Planning',
        description: 'Formulating differential diagnoses, ordering investigations, treatment planning, and patient discharge counselling.',
        weight: 30,
        topics: [
          'Emergency Management & Triage Stations',
          'Obstetric & Gynecological Clinical Management',
          'Psychiatric Assessment & Mental State Examination',
        ],
      },
    ],
  },

  // 3. RACP Basic Training Written Examination
  {
    slug: 'fracp-written-exam',
    name: 'FRACP Basic Training Written Examination (RACP)',
    short_name: 'RACP Written Exam',
    authority_code: 'RACP',
    category_id: CATEGORIES.MEDICAL,
    description: 'The Royal Australasian College of Physicians (RACP) Basic Training Written Examination consists of Adult Medicine or Paediatrics & Child Health written papers testing comprehensive internal medicine knowledge.',
    difficulty: 'Expert',
    question_count: 170,
    time_limit_mins: 360,
    is_featured: false,
    official_url: 'https://www.racp.edu.au/trainees/examinations/basic-training-examinations',
    official_notification_url: 'https://www.racp.edu.au/trainees/examinations',
    official_syllabus_url: 'https://www.racp.edu.au/trainees/basic-training',
    exam_type: 'Postgraduate Fellowship',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '6 Hours (Two 3-hour papers)',
    total_marks: 170,
    negative_marking: 'No negative marking',
    passing_criteria: 'Angoff standard setting per specialty division',
    eligibility: 'Registered RACP basic physician or paediatric trainees completing required clinical time.',
    attempt_rules: 'Trainees have 3 attempts within allowable training timeframe.',
    selection_process: 'CBT examination across Australia and New Zealand.',
    stages: ['RACP Written Examination', 'RACP Clinical Examination'],
    papers: ['Paper 1: Medical Sciences (100 MCQs)', 'Paper 2: Clinical Applications (70 MCQs)'],
    languages: ['English'],
    aliases: ['FRACP Written', 'RACP Written', 'RACP Basic Training Exam', 'FRACP Exam', 'Royal Australasian College of Physicians Written'],
    subjects: [
      {
        name: 'Adult Medicine & Medical Subspecialties',
        official_name: 'General & Specialty Internal Medicine',
        description: 'Cardiology, respiratory, gastroenterology, nephrology, neurology, rheumatology, endocrinology, and oncology.',
        weight: 60,
        topics: [
          'Cardiology & Electrocardiography',
          'Renal Medicine & Electrolyte Disorders',
          'Neurology & Neuro-imaging Interpretation',
          'Endocrinology & Metabolic Bone Diseases',
        ],
      },
      {
        name: 'Basic Medical Sciences & Pathophysiology',
        official_name: 'Pathophysiology, Pharmacology & Genetics',
        description: 'Pathophysiology of disease, clinical pharmacology, immunology, and genetic medicine.',
        weight: 40,
        topics: [
          'Clinical Pharmacology & Pharmacokinetics',
          'Immunology & Autoimmune Pathogenesis',
          'Molecular Genetics & Cancer Pathology',
        ],
      },
    ],
  },

  // 4. GSSE - RACS Generic Surgical Science Examination
  {
    slug: 'racs-gsse',
    name: 'Generic Surgical Science Examination (RACS GSSE)',
    short_name: 'RACS GSSE',
    authority_code: 'RACS',
    category_id: CATEGORIES.MEDICAL,
    description: 'The Generic Surgical Science Examination (GSSE) administered by RACS assesses mandatory foundational knowledge in Anatomy, Physiology, and Pathology for doctors entering surgical training in Australia and New Zealand.',
    difficulty: 'Expert',
    question_count: 240,
    time_limit_mins: 300,
    is_featured: false,
    official_url: 'https://www.surgeons.org/examinations/generic-surgical-science-examination-gsse',
    official_notification_url: 'https://www.surgeons.org/examinations',
    official_syllabus_url: 'https://www.surgeons.org/examinations/generic-surgical-science-examination-gsse/gsse-syllabus',
    exam_type: 'Postgraduate Surgical Licensing',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '5 Hours (Two 2.5-hour papers)',
    total_marks: 240,
    negative_marking: 'No negative marking',
    passing_criteria: 'Standard set pass mark across all 3 components (Anatomy, Physiology, Pathology)',
    eligibility: 'Medical graduates and surgical trainees in Australia and New Zealand.',
    attempt_rules: 'Permitted attempts in accordance with RACS examination regulations.',
    selection_process: 'CBT examination delivered at Pearson VUE test centers.',
    stages: ['Generic Surgical Science Exam (GSSE)', 'Specialty Specific Surgical Examinations (SSE)', 'RACS Fellowship Clinical Examination'],
    papers: ['Paper 1: Anatomy & Physiology', 'Paper 2: Pathology & Surgical Sciences'],
    languages: ['English'],
    aliases: ['RACS GSSE', 'GSSE Surgical Exam', 'FRACS GSSE', 'Generic Surgical Science Examination', 'Royal Australasian College of Surgeons GSSE'],
    subjects: [
      {
        name: 'Surgical Anatomy',
        official_name: 'Gross & Surgical Topographic Anatomy',
        description: 'Head and neck, thorax, abdomen, pelvis, upper limb, lower limb, and spine anatomy.',
        weight: 40,
        topics: [
          'Abdominal & Pelvic Surgical Anatomy',
          'Thoracic & Cardiovascular Surgical Anatomy',
          'Musculoskeletal & Neuro-vascular Extremity Anatomy',
        ],
      },
      {
        name: 'Surgical Physiology',
        official_name: 'Applied Systems Physiology',
        description: 'Cardiovascular, respiratory, renal, endocrine, and gastrointestinal physiology.',
        weight: 30,
        topics: [
          'Cardiovascular & Respiratory Physiology in Surgery',
          'Renal Physiology, Fluid & Acid-Base Homeostasis',
          'Endocrine Physiology & Metabolic Stress Response',
        ],
      },
      {
        name: 'Surgical Pathology',
        official_name: 'General & Systemic Pathology',
        description: 'Inflammation, neoplasia, wound healing, shock, surgical sepsis, and tissue repair.',
        weight: 30,
        topics: [
          'Wound Healing, Tissue Repair & Scarring',
          'Surgical Oncology & Neoplastic Mechanisms',
          'Sepsis, SIRS & Systemic Inflammatory Response',
        ],
      },
    ],
  },

  // 5. FANZCA Primary Examination
  {
    slug: 'fanzca-primary-exam',
    name: 'FANZCA Primary Examination (ANZCA)',
    short_name: 'FANZCA Primary',
    authority_code: 'ANZCA',
    category_id: CATEGORIES.MEDICAL,
    description: 'The Primary Examination conducted by ANZCA tests basic medical sciences including Physiology and Pharmacology for trainees undertaking specialist anaesthesia training in Australia and NZ.',
    difficulty: 'Expert',
    question_count: 150,
    time_limit_mins: 300,
    is_featured: false,
    official_url: 'https://www.anzca.edu.au/education-training/examinations/primary-examination',
    official_notification_url: 'https://www.anzca.edu.au/education-training/examinations',
    official_syllabus_url: 'https://www.anzca.edu.au/education-training/examinations/primary-examination/curriculum-and-syllabus',
    exam_type: 'Postgraduate Fellowship',
    level: 'National',
    mode: 'CBT & Viva Voce',
    duration: '5 Hours Written + Oral Viva',
    total_marks: 200,
    negative_marking: 'No negative marking',
    passing_criteria: 'Standard set cut score for written and viva sections',
    eligibility: 'Registered ANZCA anaesthetic trainees.',
    attempt_rules: 'Maximum 4 attempts allowed during training.',
    selection_process: 'Written CBT paper followed by oral viva examination.',
    stages: ['Written Paper (Multiple Choice & Short Answer)', 'Oral Viva Voce Examination'],
    papers: ['150 MCQs & 8 Short Answer Questions'],
    languages: ['English'],
    aliases: ['FANZCA Primary', 'ANZCA Primary Exam', 'ANZCA Primary', 'FANZCA Exam'],
    subjects: [
      {
        name: 'Anaesthetic Physiology',
        official_name: 'Applied Physiology for Anaesthesia & Intensive Care',
        description: 'Neurophysiology, cardiovascular physiology, respiratory mechanics, and autonomic regulation.',
        weight: 50,
        topics: [
          'Respiratory Mechanics & Gas Exchange in Anaesthesia',
          'Cardiovascular Dynamics & Haemodynamic Monitoring',
          'Central & Autonomic Nervous System Physiology',
        ],
      },
      {
        name: 'Anaesthetic Pharmacology',
        official_name: 'Pharmacokinetics & Pharmacodynamics of Anaesthetic Agents',
        description: 'Inhalational agents, intravenous hypnotics, local anaesthetics, neuromuscular blockers, and opioids.',
        weight: 50,
        topics: [
          'Inhalational & Intravenous Anaesthetic Pharmacology',
          'Neuromuscular Blocking Drugs & Reversal Agents',
          'Local Anaesthetic Toxicity & Analgesics Pharmacology',
        ],
      },
    ],
  },

  // 6. FRACGP Applied Knowledge Test (AKT)
  {
    slug: 'fracgp-akt',
    name: 'FRACGP Applied Knowledge Test (RACGP AKT)',
    short_name: 'FRACGP AKT',
    authority_code: 'RACGP',
    category_id: CATEGORIES.MEDICAL,
    description: 'The FRACGP AKT is a computer-based single best answer (SBA) examination evaluating clinical general practice knowledge and decision-making for Australian GP registrars.',
    difficulty: 'Expert',
    question_count: 150,
    time_limit_mins: 240,
    is_featured: true,
    official_url: 'https://www.racgp.org.au/education/examinations/akt',
    official_notification_url: 'https://www.racgp.org.au/education/examinations/dates',
    official_syllabus_url: 'https://www.racgp.org.au/education/curriculum',
    exam_type: 'Postgraduate Fellowship',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '4 Hours',
    total_marks: 150,
    negative_marking: 'No negative marking',
    passing_criteria: 'Rasch model criterion-referenced cut score',
    eligibility: 'RACGP general practice registrars and practice-eligible candidates.',
    attempt_rules: 'Permitted attempts in accordance with RACGP fellowship exam policy.',
    selection_process: 'Computer-based assessment at official RACGP examination centers.',
    stages: ['Applied Knowledge Test (AKT)', 'Key Feature Problem (KFP)', 'Clinical Competency Exam (CCE)'],
    papers: ['150 Single Best Answer (SBA) Questions'],
    languages: ['English'],
    aliases: ['FRACGP AKT', 'RACGP AKT', 'RACGP Applied Knowledge Test', 'FRACGP Exam'],
    subjects: [
      {
        name: 'General Practice Medicine',
        official_name: 'Clinical Primary Care & Chronic Disease Management',
        description: 'Cardiovascular risk management, diabetes, respiratory illness, dermatology, and mental health in primary care.',
        weight: 50,
        topics: [
          'Cardiovascular Disease & Hypertension in Primary Care',
          'Diabetes Mellitus & Metabolic Disease Management',
          'Dermatology & Skin Cancer Detection in Australia',
        ],
      },
      {
        name: 'Paediatrics, Women’s & Aged Care',
        official_name: 'Lifespan Health & Primary Preventive Care',
        description: 'Child health, antenatal care, contraception, menopause, and geriatric medicine.',
        weight: 30,
        topics: [
          'Paediatric Acute Presentations & Childhood Immunization',
          'Women’s Health, Contraception & Menopause Management',
          'Geriatric Medicine, Polypharmacy & Dementia Care',
        ],
      },
      {
        name: 'Practice Management & Evidence-Based Medicine',
        official_name: 'Practice Standards, Quality & Safety',
        description: 'Australian health regulations, prescribing guidelines, PBS/MBS, and clinical audit.',
        weight: 20,
        topics: [
          'MBS, PBS & Safe Quality Prescribing Guidelines',
          'Aboriginal & Torres Strait Islander Primary Healthcare',
        ],
      },
    ],
  },

  // 7. FRACGP Key Feature Problem (KFP)
  {
    slug: 'fracgp-kfp',
    name: 'FRACGP Key Feature Problem Examination (RACGP KFP)',
    short_name: 'FRACGP KFP',
    authority_code: 'RACGP',
    category_id: CATEGORIES.MEDICAL,
    description: 'The Key Feature Problem (KFP) examination assesses clinical decision-making and critical diagnostic/management steps in complex Australian primary care scenarios.',
    difficulty: 'Expert',
    question_count: 26,
    time_limit_mins: 210,
    is_featured: false,
    official_url: 'https://www.racgp.org.au/education/examinations/kfp',
    official_notification_url: 'https://www.racgp.org.au/education/examinations/dates',
    official_syllabus_url: 'https://www.racgp.org.au/education/curriculum',
    exam_type: 'Postgraduate Fellowship',
    level: 'National',
    mode: 'Computer-Based Written Clinical Scenarios',
    duration: '3.5 Hours',
    total_marks: 26,
    negative_marking: 'Over-coding penalties apply for excessive responses',
    passing_criteria: 'Criterion-referenced passing score per examination diet',
    eligibility: 'RACGP registrars eligible for fellowship examinations.',
    attempt_rules: 'Governed by RACGP Fellowship Examination Policy.',
    selection_process: 'Computer-based scenario examination across Australia.',
    stages: ['Key Feature Problem (KFP)'],
    papers: ['26 Key Feature Scenarios (Short answer & Completion)'],
    languages: ['English'],
    aliases: ['FRACGP KFP', 'RACGP KFP', 'Key Feature Problem Exam', 'RACGP Key Feature Problem'],
    subjects: [
      {
        name: 'Clinical Decision Making & Differential Diagnosis',
        official_name: 'Primary Care Problem Solving & Clinical Reasoning',
        description: 'Key feature identification in complex undifferentiated patient presentations.',
        weight: 60,
        topics: [
          'Complex Undifferentiated Symptoms in General Practice',
          'Critical Management Decisions in Primary Care',
        ],
      },
      {
        name: 'Emergency & Acute Care Management',
        official_name: 'Acute Presentations & Referral Pathways',
        description: 'Acute emergency recognition and immediate stabilization in primary care.',
        weight: 40,
        topics: [
          'Acute Emergency Management in General Practice',
          'Rational Investigations & Targeted Referrals',
        ],
      },
    ],
  },

  // 8. FACRRM Examination (ACRRM)
  {
    slug: 'facrrm-fellowship-exam',
    name: 'FACRRM Fellowship Examinations (ACRRM)',
    short_name: 'FACRRM Exam',
    authority_code: 'ACRRM',
    category_id: CATEGORIES.MEDICAL,
    description: 'The Australian College of Rural and Remote Medicine (ACRRM) Fellowship examinations assess advanced skill sets, emergency care, and broad-scope clinical practice in rural and remote Australian communities.',
    difficulty: 'Expert',
    question_count: 120,
    time_limit_mins: 240,
    is_featured: false,
    official_url: 'https://www.acrrm.org.au/fellowship/assessment',
    official_notification_url: 'https://www.acrrm.org.au/fellowship/assessment/exam-dates',
    official_syllabus_url: 'https://www.acrrm.org.au/fellowship/curriculum',
    exam_type: 'Postgraduate Fellowship',
    level: 'National',
    mode: 'CBT & Structured Assessment (StAMPS)',
    duration: '4 Hours Written + StAMPS OSCE',
    total_marks: 120,
    negative_marking: 'No negative marking',
    passing_criteria: 'Standard set cut score determined by ACRRM Assessment Committee',
    eligibility: 'Registered ACRRM rural medicine registrars.',
    attempt_rules: 'Governed by ACRRM Assessment Regulations.',
    selection_process: 'MCQ assessment, StAMPS examination, and portfolio assessment.',
    stages: ['MCQ Assessment', 'Structured Assessment using Multiple Patient Scenarios (StAMPS)'],
    papers: ['120 Multiple Choice Questions & StAMPS Scenarios'],
    languages: ['English'],
    aliases: ['FACRRM', 'ACRRM Exam', 'FACRRM Exam', 'StAMPS ACRRM', 'Rural Medicine Exam'],
    subjects: [
      {
        name: 'Rural & Remote Emergency Medicine',
        official_name: 'Emergency & Critical Care in Isolated Settings',
        description: 'Advanced airway management, trauma resuscitation, and emergency retrieval medicine.',
        weight: 50,
        topics: [
          'Isolated Emergency Management & Aeromedical Retrieval',
          'Trauma & Cardiac Resuscitation in Rural Hospitals',
        ],
      },
      {
        name: 'Broad Scope Primary Healthcare',
        official_name: 'Comprehensive Rural Primary & Public Care',
        description: 'Aboriginal health, rural obstetrics, paediatric emergencies, and mental health in isolated regions.',
        weight: 50,
        topics: [
          'Aboriginal & Torres Strait Islander Rural Healthcare',
          'Rural Obstetrics & Emergency Perinatal Care',
        ],
      },
    ],
  },

  // 9. FRANZCP Written Examinations
  {
    slug: 'franzcp-written-exam',
    name: 'FRANZCP Written Examinations (RANZCP)',
    short_name: 'FRANZCP Written',
    authority_code: 'RANZCP',
    category_id: CATEGORIES.MEDICAL,
    description: 'The RANZCP Written Examinations test comprehensive psychiatric knowledge, psychopharmacology, clinical diagnosis, and essay-based critical synthesis for psychiatry trainees in Australia and NZ.',
    difficulty: 'Expert',
    question_count: 150,
    time_limit_mins: 300,
    is_featured: false,
    official_url: 'https://www.ranzcp.org/pre-fellowship/examinations',
    official_notification_url: 'https://www.ranzcp.org/pre-fellowship/examinations',
    official_syllabus_url: 'https://www.ranzcp.org/pre-fellowship/curriculum',
    exam_type: 'Postgraduate Fellowship',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '5 Hours (MCQ Paper + Essay Paper)',
    total_marks: 150,
    negative_marking: 'No negative marking',
    passing_criteria: 'Standard set passing mark per component',
    eligibility: 'RANZCP accredited psychiatry trainees.',
    attempt_rules: 'Subject to RANZCP examination policies.',
    selection_process: 'CBT examination administered at designated test centres.',
    stages: ['MCQ Written Examination', 'Critical Essay Written Examination', 'OSCE Clinical Examination'],
    papers: ['Paper 1: Multiple Choice Questions', 'Paper 2: Critical Essay Questions'],
    languages: ['English'],
    aliases: ['FRANZCP Written', 'RANZCP Exam', 'FRANZCP Exam', 'RANZCP Written Examination'],
    subjects: [
      {
        name: 'General Psychiatry & Psychopharmacology',
        official_name: 'Clinical Psychiatry & Pharmacotherapy',
        description: 'Mood disorders, schizophrenia, anxiety disorders, neurodevelopmental conditions, and psychopharmacology.',
        weight: 60,
        topics: [
          'Psychotic Disorders & Psychopharmacology Protocols',
          'Mood & Anxiety Disorders Management',
          'Addiction & Substance Use Psychiatry',
        ],
      },
      {
        name: 'Psychotherapy, Ethics & Forensic Psychiatry',
        official_name: 'Psychotherapeutic Modalities, Law & Ethics',
        description: 'CBT, psychodynamic principles, Mental Health Act legislation, forensic assessments, and ethics.',
        weight: 40,
        topics: [
          'Psychotherapy Modalities & Psychological Interventions',
          'Forensic Psychiatry & Mental Health Legislation',
        ],
      },
    ],
  },

  // 10. NMBA / AHPRA Outcome-Based Assessment (OBA) - OSCE & Pathway
  {
    slug: 'ahpra-nmba-nursing-oba',
    name: 'AHPRA / NMBA Nursing Outcome-Based Assessment (OBA)',
    short_name: 'NMBA Nursing OBA',
    authority_code: 'NMBA_AHPRA',
    category_id: CATEGORIES.NURSING,
    description: 'The Nursing and Midwifery Board of Australia (NMBA) Outcome-Based Assessment (OBA) is the assessment pathway for internationally qualified registered nurses (IQRNs) seeking registration in Australia, incorporating a cognitive MCQ assessment and an OSCE.',
    difficulty: 'Advanced',
    question_count: 10,
    time_limit_mins: 210,
    is_featured: true,
    official_url: 'https://www.nursingmidwiferyboard.gov.au/Registration-and-Endorsement/International/Outcome-based-assessment.aspx',
    official_notification_url: 'https://www.nursingmidwiferyboard.gov.au/News.aspx',
    official_syllabus_url: 'https://www.nursingmidwiferyboard.gov.au/Codes-Guidelines-Statements/Professional-standards.aspx',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'CBT & OSCE Practical',
    duration: 'Stage 1 CBT + Stage 2 OSCE (10 stations)',
    total_marks: 10,
    negative_marking: 'Criteria-based scoring',
    passing_criteria: 'Pass both NCLEX-RN CBT exam and NMBA OSCE practical exam',
    eligibility: 'Internationally qualified registered nurses meeting NMBA criteria.',
    attempt_rules: 'NMBA assessment re-sit rules apply.',
    selection_process: 'Pass NCLEX-RN exam (Stage 1) followed by Adelaide Health Simulation OSCE (Stage 2).',
    stages: ['Stage 1: Cognitive Exam (NCLEX-RN)', 'Stage 2: Behavioral OSCE (10 Clinical Stations)'],
    papers: ['NCLEX-RN CBT Paper', '10 OSCE Clinical Simulation Stations'],
    languages: ['English'],
    aliases: ['NMBA OBA', 'AHPRA OBA', 'Australian Nursing OSCE', 'NMBA OSCE', 'IQRN Assessment'],
    subjects: [
      {
        name: 'Clinical Nursing Competencies',
        official_name: 'Registered Nurse Standards for Practice',
        description: 'Patient assessment, medication administration, infection control, and aseptic clinical technique.',
        weight: 50,
        topics: [
          'Safe Medication Administration & Dosages',
          'Aseptic Non-Touch Technique (ANTT) & Infection Control',
          'Clinical Deterioration & ISBAR Communication',
        ],
      },
      {
        name: 'Professional Nursing Practice & Ethics',
        official_name: 'Australian Healthcare Framework & Ethics',
        description: 'NMBA standards, patient advocacy, cultural safety, and Australian healthcare ethics.',
        weight: 50,
        topics: [
          'Cultural Safety & Aboriginal Patient Advocacy',
          'NMBA Registered Nurse Standards for Practice',
        ],
      },
    ],
  },

  // 11. KAPS - Knowledge Assessment of Pharmaceutical Sciences (APC)
  {
    slug: 'apc-kaps',
    name: 'KAPS Exam (Knowledge Assessment of Pharmaceutical Sciences - APC)',
    short_name: 'KAPS Exam',
    authority_code: 'APC',
    category_id: CATEGORIES.PHARMACY,
    description: 'The KAPS examination administered by the Australian Pharmacy Council (APC) assesses fundamental pharmaceutical sciences for overseas pharmacists seeking registration in Australia.',
    difficulty: 'Advanced',
    question_count: 200,
    time_limit_mins: 240,
    is_featured: true,
    official_url: 'https://www.pharmacycouncil.org.au/pharmacists/kaps-exam/',
    official_notification_url: 'https://www.pharmacycouncil.org.au/pharmacists/exam-dates/',
    official_syllabus_url: 'https://www.pharmacycouncil.org.au/pharmacists/kaps-exam-content/',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '4 Hours (Two 2-hour papers)',
    total_marks: 200,
    negative_marking: 'No negative marking',
    passing_criteria: 'Minimum 50% in each sub-section and 50% overall in both papers',
    eligibility: 'Overseas qualified pharmacists with recognized degree in pharmacy.',
    attempt_rules: 'Candidates can attempt KAPS as needed per APC policies.',
    selection_process: 'CBT examination delivered via Pearson VUE centers worldwide.',
    stages: ['KAPS Paper 1', 'KAPS Paper 2'],
    papers: ['Paper 1: Pharmaceutical Chemistry & Physiology (100 MCQs)', 'Paper 2: Pharmaceutics & Therapeutics (100 MCQs)'],
    languages: ['English'],
    aliases: ['KAPS', 'KAPS Exam', 'APC KAPS', 'Knowledge Assessment of Pharmaceutical Sciences', 'Australian Pharmacy KAPS'],
    subjects: [
      {
        name: 'Pharmaceutical Chemistry & Physiology',
        official_name: 'Medicinal Chemistry, Organic Chemistry & Physiology',
        description: 'Structure-activity relationships, drug synthesis, biochemistry, and human physiology.',
        weight: 50,
        topics: [
          'Structure-Activity Relationships (SAR) & Drug Chemistry',
          'Human Physiology, Organ Systems & Pathophysiology',
        ],
      },
      {
        name: 'Pharmaceutics & Therapeutics',
        official_name: 'Pharmaceutics, Pharmacokinetics & Clinical Therapeutics',
        description: 'Dosage forms, biopharmaceutics, pharmacokinetics, and clinical pharmacotherapy.',
        weight: 50,
        topics: [
          'Pharmacokinetics, Bioavailability & Biopharmaceutics',
          'Clinical Therapeutics, Drug Interactions & Adverse Effects',
        ],
      },
    ],
  },

  // 12. CAOP - Competency Assessment of Overseas Pharmacists (APC)
  {
    slug: 'apc-caop',
    name: 'CAOP Exam (Competency Assessment of Overseas Pharmacists - APC)',
    short_name: 'CAOP Exam',
    authority_code: 'APC',
    category_id: CATEGORIES.PHARMACY,
    description: 'The CAOP examination tests practical clinical pharmacy knowledge, drug safety, Australian pharmacy practice regulations, and dispensing competencies for eligible overseas pharmacists.',
    difficulty: 'Advanced',
    question_count: 100,
    time_limit_mins: 180,
    is_featured: false,
    official_url: 'https://www.pharmacycouncil.org.au/pharmacists/caop-exam/',
    official_notification_url: 'https://www.pharmacycouncil.org.au/pharmacists/exam-dates/',
    official_syllabus_url: 'https://www.pharmacycouncil.org.au/pharmacists/caop-exam-content/',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '3 Hours',
    total_marks: 100,
    negative_marking: 'No negative marking',
    passing_criteria: 'Standard set passing score determined by APC',
    eligibility: 'Overseas pharmacists from candidate-stream recognized jurisdictions (e.g., UK, NZ, Ireland, Canada, USA).',
    attempt_rules: 'In accordance with APC examination policies.',
    selection_process: 'CBT examination at Pearson VUE centers.',
    stages: ['CAOP Examination'],
    papers: ['100 Single Best Answer Multiple Choice Questions'],
    languages: ['English'],
    aliases: ['CAOP', 'CAOP Exam', 'APC CAOP', 'Competency Assessment of Overseas Pharmacists'],
    subjects: [
      {
        name: 'Clinical Pharmacy & Therapeutics',
        official_name: 'Clinical Decision Making & Drug Management',
        description: 'Disease state management, patient counselling, and drug dosing adjustments.',
        weight: 60,
        topics: [
          'Clinical Drug Therapy & Patient Counselling',
          'Pharmaceutical Calculations & Dosing Adjustments',
        ],
      },
      {
        name: 'Pharmacy Practice & Pharmacy Law',
        official_name: 'Australian Pharmacy Legislation & Dispensing',
        description: 'Poisons Standard, PBS regulations, dispensing guidelines, and professional ethics.',
        weight: 40,
        topics: [
          'Australian Pharmacy Law, PBS & Scheduling Regulations',
          'Dispensing Safety, Error Prevention & Adverse Event Reporting',
        ],
      },
    ],
  },

  // 13. ADC Written Examination (Australian Dental Council)
  {
    slug: 'adc-written-examination',
    name: 'ADC Written Examination (Australian Dental Council)',
    short_name: 'ADC Written Exam',
    authority_code: 'ADC',
    category_id: CATEGORIES.DENTISTRY,
    description: 'The ADC Written Examination evaluates dental knowledge and clinical decision-making for overseas trained dentists seeking registration in Australia.',
    difficulty: 'Expert',
    question_count: 160,
    time_limit_mins: 360,
    is_featured: true,
    official_url: 'https://www.adc.org.au/assessments/dentists/written-examination',
    official_notification_url: 'https://www.adc.org.au/assessments/dates-and-venues',
    official_syllabus_url: 'https://www.adc.org.au/assessments/dentists/written-examination/handbook',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '6 Hours (Two 3-hour papers)',
    total_marks: 160,
    negative_marking: 'No negative marking',
    passing_criteria: 'Standard set passing mark per scenario section',
    eligibility: 'Overseas dentists holding a recognized primary dental qualification.',
    attempt_rules: 'Permitted attempts governed by ADC regulations.',
    selection_process: 'CBT examination at Pearson VUE test centers globally.',
    stages: ['ADC Written Examination', 'ADC Practical Examination'],
    papers: ['Paper 1: Scenario-based MCQs (80 items)', 'Paper 2: Single Best Answer MCQs (80 items)'],
    languages: ['English'],
    aliases: ['ADC Written', 'ADC Written Exam', 'Australian Dental Council Written', 'ADC Exam Dentists'],
    subjects: [
      {
        name: 'Restorative & Endodontic Dentistry',
        official_name: 'Operative Dentistry, Endodontics & Prosthodontics',
        description: 'Carious lesion management, root canal therapy, fixed and removable prosthodontics.',
        weight: 40,
        topics: [
          'Cariology, Operative Dentistry & Dental Materials',
          'Endodontic Diagnosis & Treatment Protocols',
          'Prosthodontics & Implant Dentistry Principles',
        ],
      },
      {
        name: 'Oral Surgery & Periodontics',
        official_name: 'Oral Maxillofacial Surgery, Medicine & Periodontology',
        description: 'Exodontia, oral pathology, periodontal disease management, and emergency dental care.',
        weight: 35,
        topics: [
          'Oral Surgery, Exodontia & Local Anaesthesia',
          'Periodontal Pathology & Non-Surgical Therapy',
          'Oral Medicine, Pathology & Mucosal Lesions',
        ],
      },
      {
        name: 'Paediatric Dentistry & Orthodontics',
        official_name: 'Paediatric Dental Care, Orthodontics & Preventive Dentistry',
        description: 'Child management, malocclusion classification, trauma, and fluoridation.',
        weight: 25,
        topics: [
          'Paediatric Dental Trauma & Behavior Management',
          'Orthodontic Diagnosis & Preventative Care',
        ],
      },
    ],
  },

  // 14. ADC Practical Examination
  {
    slug: 'adc-practical-examination',
    name: 'ADC Practical Examination (Australian Dental Council)',
    short_name: 'ADC Practical',
    authority_code: 'ADC',
    category_id: CATEGORIES.DENTISTRY,
    description: 'The ADC Practical Examination is a clinical skills simulation assessment evaluating clinical judgment, operative procedures, and infection control for dentist registration in Australia.',
    difficulty: 'Expert',
    question_count: 6,
    time_limit_mins: 480,
    is_featured: false,
    official_url: 'https://www.adc.org.au/assessments/dentists/practical-examination',
    official_notification_url: 'https://www.adc.org.au/assessments/dates-and-venues',
    official_syllabus_url: 'https://www.adc.org.au/assessments/dentists/practical-examination/handbook',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Simulation Clinical Practical',
    duration: '2 Days Clinical Simulation',
    total_marks: 100,
    negative_marking: 'Criteria rubric based',
    passing_criteria: 'Satisfactory rating across technical operative and clinical communication tasks',
    eligibility: 'Must pass ADC Written Examination.',
    attempt_rules: 'ADC practical examination re-sit policies apply.',
    selection_process: 'Practical simulation at ADC Examination Centre in Melbourne.',
    stages: ['Technical Skills Assessment', 'Clinical Skills Assessment'],
    papers: ['6 Technical & OSCE Stations'],
    languages: ['English'],
    aliases: ['ADC Practical', 'ADC Clinical Practical', 'ADC Practical Exam', 'Australian Dental Council Practical'],
    subjects: [
      {
        name: 'Operative & Prosthodontic Simulation',
        official_name: 'Simulated Technical Dental Procedures',
        description: 'Cavity preparation, crown preparation, endodontic access, and composite restorations on phantom heads.',
        weight: 60,
        topics: [
          'Precision Crown & Cavity Preparations on Phantom Heads',
          'Endodontic Access & Root Canal Obturation Simulation',
        ],
      },
      {
        name: 'Clinical Assessment & Communication',
        official_name: 'OSCE Patient Consultation & Infection Control',
        description: 'Treatment planning, infection control compliance, and patient communication.',
        weight: 40,
        topics: [
          'Infection Control Protocols & Sterilization Standards',
          'Comprehensive Dental Treatment Planning OSCE',
        ],
      },
    ],
  },

  // 15. Engineers Australia Stage 1 Competency Assessment
  {
    slug: 'engineers-australia-stage-1',
    name: 'Engineers Australia Stage 1 Competency Assessment (CDR Pathway)',
    short_name: 'EA Stage 1 Assessment',
    authority_code: 'EA',
    category_id: CATEGORIES.ENGINEERING,
    description: 'Engineers Australia Stage 1 Competency Assessment evaluates educational qualifications and engineering competencies (Knowledge, Application, Professional Attributes) via Competency Demonstration Report (CDR) or accredited qualification.',
    difficulty: 'Advanced',
    question_count: 16,
    time_limit_mins: 120,
    is_featured: true,
    official_url: 'https://www.engineersaustralia.org.au/credentials/stage-1-competency-assessment',
    official_notification_url: 'https://www.engineersaustralia.org.au/migrants',
    official_syllabus_url: 'https://www.engineersaustralia.org.au/sites/default/files/stage-1-competency-standards.pdf',
    exam_type: 'Migration & Professional Accreditation',
    level: 'National',
    mode: 'Portfolio & Competency Assessment',
    duration: 'Portfolio Evaluation',
    total_marks: 16,
    negative_marking: 'Competency benchmarked',
    passing_criteria: 'Demonstration of all 16 Engineers Australia Stage 1 Competency Elements',
    eligibility: 'Engineering degree graduates seeking professional recognition or migration skills assessment in Australia.',
    attempt_rules: 'Resubmission permitted following EA feedback.',
    selection_process: 'Assessor evaluation of CDR, career episodes, and continuing professional development.',
    stages: ['Competency Demonstration Report (CDR)', 'Interview (if required)'],
    papers: ['3 Career Episodes', 'Summary Statement', 'CPD Record'],
    languages: ['English'],
    aliases: ['Engineers Australia Assessment', 'CDR Engineers Australia', 'EA Stage 1', 'Engineers Australia CDR', 'EA Skills Assessment'],
    subjects: [
      {
        name: 'Engineering Knowledge & Fundamentals',
        official_name: 'Knowledge and Skill Base (Element 1.1 - 1.6)',
        description: 'Mathematics, physical sciences, engineering fundamentals, in-depth specialized knowledge, and design techniques.',
        weight: 40,
        topics: [
          'Applied Engineering Mathematics & Physical Sciences',
          'Specialized Engineering Domain Knowledge & Design',
        ],
      },
      {
        name: 'Engineering Application Ability',
        official_name: 'Engineering Application Ability (Element 2.1 - 2.4)',
        description: 'Application of systematic engineering techniques, problem solving, and project execution.',
        weight: 40,
        topics: [
          'Systematic Engineering Problem Solving & Analysis',
          'Engineering Project Execution & Design Application',
        ],
      },
      {
        name: 'Professional & Ethical Governance',
        official_name: 'Professional and Personal Attributes (Element 3.1 - 3.6)',
        description: 'Ethical conduct, communication, team leadership, risk management, and professional practice.',
        weight: 20,
        topics: [
          'Engineers Australia Code of Ethics & Risk Management',
          'Professional Communication & Team Leadership',
        ],
      },
    ],
  },

  // 16. UCAT ANZ (University Clinical Aptitude Test Australia and New Zealand)
  {
    slug: 'ucat-anz',
    name: 'UCAT ANZ (University Clinical Aptitude Test Australia & NZ)',
    short_name: 'UCAT ANZ',
    authority_code: 'UCAT_ANZ_CONSORTIUM',
    category_id: CATEGORIES.UNIVERSITY_ENTRANCE,
    description: 'The UCAT ANZ is an admissions test used by a consortium of Australian and New Zealand universities for entry into undergraduate medicine, dentistry, and clinical health degree programs.',
    difficulty: 'Advanced',
    question_count: 227,
    time_limit_mins: 120,
    is_featured: true,
    official_url: 'https://www.ucat.edu.au',
    official_notification_url: 'https://www.ucat.edu.au/ucat-anz/dates-and-fees/',
    official_syllabus_url: 'https://www.ucat.edu.au/ucat-anz/test-format/',
    exam_type: 'Admissions',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '2 Hours',
    total_marks: 3600,
    negative_marking: 'No negative marking',
    passing_criteria: 'Percentile score ranking for university selection',
    eligibility: 'Year 12 high school students and university applicants to medical/dental programs.',
    attempt_rules: 'Can be taken once per testing cycle year.',
    selection_process: 'CBT examination administered at Pearson VUE centers in July/August.',
    stages: ['UCAT ANZ Examination'],
    papers: ['Subtest 1: Verbal Reasoning', 'Subtest 2: Decision Making', 'Subtest 3: Quantitative Reasoning', 'Subtest 4: Abstract Reasoning', 'Subtest 5: Situational Judgement'],
    languages: ['English'],
    aliases: ['UCAT ANZ', 'UCAT Australia', 'University Clinical Aptitude Test ANZ', 'UCAT Australia NZ'],
    subjects: [
      {
        name: 'Cognitive Reasoning Subtests',
        official_name: 'Verbal, Quantitative & Abstract Reasoning',
        description: 'Evaluating comprehension, numerical problem solving, and spatial pattern recognition.',
        weight: 80,
        topics: [
          'Verbal Reasoning & Logical Passages Analysis',
          'Quantitative Reasoning & Data Interpretation',
          'Abstract Reasoning & Pattern Recognition',
          'Decision Making & Venn Diagram Logic',
        ],
      },
      {
        name: 'Situational Judgement',
        official_name: 'Non-Cognitive Situational Judgement Subtest',
        description: 'Assessing ethical understanding, empathy, integrity, and medical professionalism.',
        weight: 20,
        topics: [
          'Medical Ethics, Empathy & Professional Conduct Scenarios',
        ],
      },
    ],
  },

  // 17. GAMSAT (Graduate Medical School Admissions Test)
  {
    slug: 'gamsat',
    name: 'GAMSAT (Graduate Medical School Admissions Test - ACER)',
    short_name: 'GAMSAT',
    authority_code: 'ACER',
    category_id: CATEGORIES.UNIVERSITY_ENTRANCE,
    description: 'The GAMSAT is an entrance examination developed by ACER to assess capacity to undertake high-level intellectual studies in graduate-entry medical, dental, and health sciences programs in Australia, UK, and Ireland.',
    difficulty: 'Expert',
    question_count: 137,
    time_limit_mins: 315,
    is_featured: true,
    official_url: 'https://gamsat.acer.org',
    official_notification_url: 'https://gamsat.acer.org/register/dates',
    official_syllabus_url: 'https://gamsat.acer.org/about-gamsat/test-structure',
    exam_type: 'Admissions',
    level: 'National / International',
    mode: 'Digital Computer-Based Test',
    duration: '5.25 Hours',
    total_marks: 100,
    negative_marking: 'No negative marking',
    passing_criteria: 'Overall scaled score calculated weighted across Section 1, 2, and 3',
    eligibility: 'Bachelor degree holders or final-year undergraduate university students.',
    attempt_rules: 'Multiple attempts permitted; scores valid for 2 years.',
    selection_process: 'Digital testing twice annually (March & September).',
    stages: ['Section I: Reasoning in Humanities', 'Section II: Written Communication', 'Section III: Reasoning in Biological & Physical Sciences'],
    papers: ['Section I (62 MCQs)', 'Section II (2 Written Essays)', 'Section III (75 MCQs: Chemistry, Biology, Physics)'],
    languages: ['English'],
    aliases: ['GAMSAT', 'GAMSAT Exam', 'ACER GAMSAT', 'Graduate Medical School Admissions Test'],
    subjects: [
      {
        name: 'Reasoning in Humanities & Written Communication',
        official_name: 'GAMSAT Sections I & II',
        description: 'Critical analysis of humanities texts, socio-cultural arguments, and written essay synthesis.',
        weight: 40,
        topics: [
          'Humanities Passages Critical Analysis & Contextual Reasoning',
          'Argumentative & Personal Essay Composition',
        ],
      },
      {
        name: 'Reasoning in Biological & Physical Sciences',
        official_name: 'GAMSAT Section III (Sciences)',
        description: '40% Chemistry, 40% Biology, 20% Physics reasoning and data interpretation.',
        weight: 60,
        topics: [
          'Organic & General Chemistry Data Reasoning',
          'Cell Biology, Genetics & Physiology Reasoning',
          'Physical Science Principles & Quantitative Calculations',
        ],
      },
    ],
  },

  // 18. ISAT (International Student Admissions Test)
  {
    slug: 'isat-acer',
    name: 'ISAT (International Student Admissions Test - ACER)',
    short_name: 'ISAT',
    authority_code: 'ACER',
    category_id: CATEGORIES.UNIVERSITY_ENTRANCE,
    description: 'ISAT is a 3-hour computer-based test assessing critical reasoning and quantitative reasoning skills for international candidates applying to Australian university medical, dental, and health science courses.',
    difficulty: 'Advanced',
    question_count: 100,
    time_limit_mins: 180,
    is_featured: false,
    official_url: 'https://isat.acer.org',
    official_notification_url: 'https://isat.acer.org/dates',
    official_syllabus_url: 'https://isat.acer.org/about-isat/structure',
    exam_type: 'Admissions',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '3 Hours',
    total_marks: 200,
    negative_marking: 'No negative marking',
    passing_criteria: 'Overall scaled score percentile for university selection',
    eligibility: 'International students applying to Australian undergraduate medicine/dentistry.',
    attempt_rules: 'One attempt per 12-month period.',
    selection_process: 'CBT examination delivered via Prometric test centers.',
    stages: ['ISAT Examination'],
    papers: ['100 Multiple Choice Questions (Critical & Quantitative Reasoning)'],
    languages: ['English'],
    aliases: ['ISAT', 'ISAT Test', 'ACER ISAT', 'International Student Admissions Test'],
    subjects: [
      {
        name: 'Critical Reasoning',
        official_name: 'Humanities & Social Sciences Critical Reasoning',
        description: 'Comprehending arguments, drawing conclusions, and evaluating evidence.',
        weight: 50,
        topics: [
          'Textual Analysis, Inferences & Logical Arguments',
        ],
      },
      {
        name: 'Quantitative Reasoning',
        official_name: 'Mathematics & Scientific Quantitative Reasoning',
        description: 'Data analysis, graphs, numerical relationships, and scientific problem solving.',
        weight: 50,
        topics: [
          'Numerical Data Interpretation, Graphs & Logic Problems',
        ],
      },
    ],
  },

  // 19. STAT (Special Tertiary Admissions Test)
  {
    slug: 'stat-acer',
    name: 'STAT (Special Tertiary Admissions Test - ACER)',
    short_name: 'STAT Exam',
    authority_code: 'ACER',
    category_id: CATEGORIES.UNIVERSITY_ENTRANCE,
    description: 'The STAT is an aptitude test used by Australian tertiary institutions to assess competencies for mature-age and non-school leaver applicants seeking university admission.',
    difficulty: 'Intermediate',
    question_count: 70,
    time_limit_mins: 130,
    is_featured: false,
    official_url: 'https://stat.acer.org',
    official_notification_url: 'https://stat.acer.org/register',
    official_syllabus_url: 'https://stat.acer.org/about-stat',
    exam_type: 'Admissions',
    level: 'National',
    mode: 'Online Proctor / CBT',
    duration: '2 Hours 10 Mins',
    total_marks: 200,
    negative_marking: 'No negative marking',
    passing_criteria: 'Scaled score benchmark set by receiving university',
    eligibility: 'Mature age applicants and non-school leavers.',
    attempt_rules: 'Subject to state tertiary admissions center rules (e.g. VTAC, QTAC, UAC).',
    selection_process: 'Online proctored test or test centre venue.',
    stages: ['STAT Multiple Choice (Verbal & Quantitative)', 'STAT Written English (optional)'],
    papers: ['70 Multiple Choice Questions'],
    languages: ['English'],
    aliases: ['STAT', 'STAT Test', 'ACER STAT', 'Special Tertiary Admissions Test'],
    subjects: [
      {
        name: 'STAT Verbal & Quantitative Reasoning',
        official_name: 'Verbal Comprehension & Quantitative Logic',
        description: 'Reading comprehension, data analysis, and mathematical logic.',
        weight: 100,
        topics: [
          'Verbal Passages Analysis & Synthesis',
          'Quantitative Charts, Tables & Logic Problems',
        ],
      },
    ],
  },

  // 20. LPAB Diploma in Law Examinations
  {
    slug: 'lpab-diploma-law',
    name: 'LPAB Diploma in Law Examinations (NSW Legal Profession Admission Board)',
    short_name: 'LPAB Examinations',
    authority_code: 'LPAB',
    category_id: CATEGORIES.LAW,
    description: 'The LPAB Diploma in Law examinations comprise 20 subjects covering statutory academic requirements for admission as a lawyer in New South Wales and across Australia.',
    difficulty: 'Expert',
    question_count: 20,
    time_limit_mins: 180,
    is_featured: false,
    official_url: 'https://www.lpab.justice.nsw.gov.au/Pages/diploma-in-law/diploma-in-law.aspx',
    official_notification_url: 'https://www.lpab.justice.nsw.gov.au/Pages/examinations/examination-dates.aspx',
    official_syllabus_url: 'https://www.lpab.justice.nsw.gov.au/Pages/diploma-in-law/course-curriculum.aspx',
    exam_type: 'Professional Legal Qualification',
    level: 'State / National',
    mode: 'Supervised Written Examination',
    duration: '3 Hours per subject',
    total_marks: 100,
    negative_marking: 'No negative marking',
    passing_criteria: 'Minimum 50% pass mark per subject paper',
    eligibility: 'Enrolled students in the LPAB Diploma in Law course.',
    attempt_rules: 'Governed by LPAB examination rules.',
    selection_process: 'Biannual supervised examination diets in Sydney and regional centers.',
    stages: ['Core Academic Legal Subjects (20 Examinations)'],
    papers: ['3-Hour Problem & Essay Written Examination per subject'],
    languages: ['English'],
    aliases: ['LPAB Law', 'LPAB Exams', 'Diploma in Law LPAB', 'NSW LPAB Examinations'],
    subjects: [
      {
        name: 'Core Private & Public Law',
        official_name: 'Contracts, Torts, Real Property & Constitutional Law',
        description: 'Principles of contract law, tortious liability, land law, equity, trusts, and administrative law.',
        weight: 50,
        topics: [
          'Australian Contract Law Formation & Remedies',
          'Tort Liability, Negligence & Statutory Duties',
          'Australian Federal Constitutional & Administrative Law',
        ],
      },
      {
        name: 'Procedural & Criminal Law',
        official_name: 'Criminal Law, Civil Procedure & Evidence',
        description: 'Crimes, elements of offenses, civil litigation procedure, and evidence law.',
        weight: 50,
        topics: [
          'Australian Criminal Law & Elements of Offenses',
          'Civil Procedure, Uniform Civil Procedure Rules (UCPR) & Evidence',
        ],
      },
    ],
  },

  // 21. Priestley 11 Legal Practice Assessment
  {
    slug: 'priestley-11-law',
    name: 'Priestley 11 Core Assessment (Australian Law Admissions)',
    short_name: 'Priestley 11 Assessment',
    authority_code: 'LACC',
    category_id: CATEGORIES.LAW,
    description: 'The Priestley 11 requirements encompass the 11 compulsory academic law subjects mandated by the Law Admissions Consultative Council (LACC) for legal practice entry in all Australian states.',
    difficulty: 'Expert',
    question_count: 11,
    time_limit_mins: 180,
    is_featured: true,
    official_url: 'https://www.lawcouncil.asn.au/about-us/advisory-committees/law-admissions-consultative-council',
    official_notification_url: 'https://www.lawcouncil.asn.au',
    official_syllabus_url: 'https://www.lawcouncil.asn.au/files/web-pdf/LACC-docs/Uniform_Admission_Rules_2015.pdf',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'University Assessment / Exam',
    duration: '3 Hours per domain',
    total_marks: 100,
    negative_marking: 'No negative marking',
    passing_criteria: 'Completion of accredited law degree / PLT requirements',
    eligibility: 'Law students completing LLB, JD, or accredited qualification in Australia.',
    attempt_rules: 'University and state admissions rules apply.',
    selection_process: 'University examinations combined with Practical Legal Training (PLT).',
    stages: ['Priestley 11 Academic Subjects', 'Practical Legal Training (PLT)'],
    papers: ['11 Subject Area Final Examinations'],
    languages: ['English'],
    aliases: ['Priestley 11', 'Priestley 11 Law', 'LACC Priestley 11', 'Australian Bar Academic Requirements'],
    subjects: [
      {
        name: 'Priestley 11 Core Law Domains',
        official_name: 'Mandatory 11 Academic Law Disciplines',
        description: 'Contracts, Torts, Real Property, Equity/Trusts, Criminal Law, Civil Procedure, Evidence, Constitutional Law, Administrative Law, Corporate Law, Ethics.',
        weight: 100,
        topics: [
          'Contracts, Torts & Property Law Principles',
          'Equity, Trusts & Company Law Frameworks',
          'Criminal Law, Civil Procedure & Evidence',
          'Ethics & Professional Responsibility for Australian Lawyers',
        ],
      },
    ],
  },

  // 22. CA ANZ Program Examinations
  {
    slug: 'ca-anz-program',
    name: 'CA Program Examinations (Chartered Accountants Australia & NZ)',
    short_name: 'CA ANZ Program',
    authority_code: 'CA_ANZ',
    category_id: CATEGORIES.ACCOUNTING,
    description: 'The CA Program conducted by Chartered Accountants ANZ is a post-graduate professional accounting qualification assessing financial reporting, audit, risk, tax, and strategy across Australia and New Zealand.',
    difficulty: 'Expert',
    question_count: 50,
    time_limit_mins: 210,
    is_featured: true,
    official_url: 'https://www.charteredaccountantsanz.com/become-a-member/ca-program',
    official_notification_url: 'https://www.charteredaccountantsanz.com/become-a-member/ca-program/key-dates',
    official_syllabus_url: 'https://www.charteredaccountantsanz.com/become-a-member/ca-program/ca-program-modules',
    exam_type: 'Professional Certification',
    level: 'National',
    mode: 'Online Invigilated CBT',
    duration: '3.5 Hours per module exam',
    total_marks: 100,
    negative_marking: 'No negative marking',
    passing_criteria: 'Minimum 50% pass score in each core candidate module',
    eligibility: 'Holders of recognized accounting degree or CA Foundations completion.',
    attempt_rules: 'Maximum 3 attempts per module permitted.',
    selection_process: 'Online invigilated examinations following candidate module coursework.',
    stages: ['Core Modules (Financial Reporting, Audit, Taxation, Risk)', 'Elective Modules', 'Capstone Module'],
    papers: ['Invigilated Final Module Examinations'],
    languages: ['English'],
    aliases: ['CA ANZ', 'CA Program Australia', 'Chartered Accountants ANZ Exam', 'CA Australia'],
    subjects: [
      {
        name: 'Financial Reporting & Assurance',
        official_name: 'Financial Reporting & Audit Assurance (FAR & AAA)',
        description: 'IFRS, AASB standards, financial statement preparation, and independent audit assurance.',
        weight: 50,
        topics: [
          'AASB / IFRS Financial Reporting Standards & Disclosures',
          'Audit Assurance Protocols, Risk Assessment & Sampling',
        ],
      },
      {
        name: 'Taxation, Management Accounting & Strategy',
        official_name: 'Taxation, Performance & Strategic Management (TAX & capstone)',
        description: 'Australian income tax law, GST, corporate tax, management accounting, and strategic leadership.',
        weight: 50,
        topics: [
          'Australian Income Tax Law, CGT, FBT & GST Regulations',
          'Strategic Financial Performance Management & Ethics',
        ],
      },
    ],
  },

  // 23. CPA Australia Program Examinations
  {
    slug: 'cpa-australia-program',
    name: 'CPA Program Examinations (CPA Australia)',
    short_name: 'CPA Australia Exam',
    authority_code: 'CPA_AU',
    category_id: CATEGORIES.ACCOUNTING,
    description: 'The CPA Program examination series assesses advanced financial reporting, strategic management accounting, global strategy, and ethics for candidate members seeking CPA designation in Australia.',
    difficulty: 'Expert',
    question_count: 50,
    time_limit_mins: 195,
    is_featured: true,
    official_url: 'https://www.cpaaustralia.com.au/cpa-program/cpa-program-candidates/exams',
    official_notification_url: 'https://www.cpaaustralia.com.au/cpa-program/cpa-program-candidates/important-dates',
    official_syllabus_url: 'https://www.cpaaustralia.com.au/cpa-program/cpa-program-candidates/subjects',
    exam_type: 'Professional Qualification',
    level: 'National / Global',
    mode: 'Computer-Based Test (CBT)',
    duration: '3.25 Hours',
    total_marks: 500,
    negative_marking: 'No negative marking',
    passing_criteria: 'Scaled pass score of 540 or higher out of 900',
    eligibility: 'Enrolled CPA Australia associate members with accredited degree.',
    attempt_rules: 'Re-sit permitted in subsequent semester exam periods.',
    selection_process: 'CBT examination administered at Pearson VUE centers globally.',
    stages: ['Ethics and Governance', 'Financial Reporting', 'Strategic Management Accounting', 'Global Strategy and Leadership', 'Electives'],
    papers: ['Invigilated CBT Exam per Subject'],
    languages: ['English'],
    aliases: ['CPA Australia', 'CPA Australia Exam', 'CPA Program Exam', 'CPA Exam Australia'],
    subjects: [
      {
        name: 'Ethics, Governance & Financial Reporting',
        official_name: 'Ethics, Governance & Advanced Financial Reporting',
        description: 'Professional ethics, corporate governance frameworks, AASB standards, and financial disclosures.',
        weight: 50,
        topics: [
          'Professional Ethics, Governance & Corporate Responsibility',
          'Advanced Financial Reporting & IFRS Compliance',
        ],
      },
      {
        name: 'Strategic Accounting & Leadership',
        official_name: 'Strategic Management Accounting & Global Leadership',
        description: 'Cost management, strategic analysis, business risk, and executive management.',
        weight: 50,
        topics: [
          'Strategic Management Accounting & Performance Measurement',
          'Global Business Strategy, Risk & Organizational Leadership',
        ],
      },
    ],
  },

  // 24. LANTITE (Literacy and Numeracy Test for Initial Teacher Education)
  {
    slug: 'lantite-acer',
    name: 'LANTITE (Literacy & Numeracy Test for Initial Teacher Education)',
    short_name: 'LANTITE Exam',
    authority_code: 'ACER',
    category_id: CATEGORIES.EDUCATION,
    description: 'LANTITE is the mandatory national literacy and numeracy assessment administered by ACER to ensure initial teacher education students possess personal literacy and numeracy skills in the top 30% of the adult population in Australia.',
    difficulty: 'Intermediate',
    question_count: 130,
    time_limit_mins: 240,
    is_featured: true,
    official_url: 'https://teacheredtest.acer.edu.au',
    official_notification_url: 'https://teacheredtest.acer.edu.au/register/test-dates',
    official_syllabus_url: 'https://teacheredtest.acer.edu.au/about/test-content',
    exam_type: 'Licensing / Certification',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '4 Hours (Two 2-hour components)',
    total_marks: 130,
    negative_marking: 'No negative marking',
    passing_criteria: 'Meet top 30% national adult literacy and numeracy standard',
    eligibility: 'Students enrolled in an accredited Australian initial teacher education course.',
    attempt_rules: 'Candidates are permitted up to 3 attempts per component (up to 5 under special approval).',
    selection_process: 'CBT examination at test centres or online proctoring.',
    stages: ['Literacy Component (65 items)', 'Numeracy Component (65 items)'],
    papers: ['Literacy Test (120 mins)', 'Numeracy Test (120 mins)'],
    languages: ['English'],
    aliases: ['LANTITE', 'LANTITE Test', 'ACER LANTITE', 'Teacher Literacy and Numeracy Test'],
    subjects: [
      {
        name: 'Personal Literacy Component',
        official_name: 'Literacy Reading Comprehension & Technical Writing',
        description: 'Text comprehension, grammar, punctuation, vocabulary, and syntax in professional contexts.',
        weight: 50,
        topics: [
          'Educational Passages Reading Comprehension & Inference',
          'Grammar, Syntax, Punctuation & Spelling Accuracy',
        ],
      },
      {
        name: 'Personal Numeracy Component',
        official_name: 'Numeracy Problem Solving, Data & Statistics',
        description: 'Number operations, proportional reasoning, statistics, probability, and measurement.',
        weight: 50,
        topics: [
          'Calculations, Ratios & Percentages in School Data',
          'Graphs, Tables & Statistical Interpretation for Teachers',
        ],
      },
    ],
  },

  // 25. OET (Occupational English Test - Healthcare)
  {
    slug: 'oet-healthcare',
    name: 'OET (Occupational English Test - Medicine & Nursing)',
    short_name: 'OET Healthcare',
    authority_code: 'CBLA',
    category_id: CATEGORIES.LANGUAGE,
    description: 'The Occupational English Test (OET) is an international healthcare-specific English language assessment recognized by AHPRA, Medical Board of Australia, and Nursing & Midwifery Board of Australia for registration.',
    difficulty: 'Advanced',
    question_count: 80,
    time_limit_mins: 180,
    is_featured: true,
    official_url: 'https://www.occupationalenglishtest.org',
    official_notification_url: 'https://www.occupationalenglishtest.org/book-oet/',
    official_syllabus_url: 'https://www.occupationalenglishtest.org/test-information/',
    exam_type: 'Language Proficiency',
    level: 'International',
    mode: 'CBT / Paper-Based Test',
    duration: '3 Hours',
    total_marks: 500,
    negative_marking: 'No negative marking',
    passing_criteria: 'Grade B or higher (minimum 350 score) across all 4 subtests for AHPRA registration',
    eligibility: 'Healthcare professionals (doctors, nurses, dentists, pharmacists) seeking registration.',
    attempt_rules: 'Multiple attempts permitted; single-sitting or clubbing rules apply per board.',
    selection_process: 'Testing delivered at accredited venues worldwide.',
    stages: ['Listening Subtest', 'Reading Subtest', 'Writing Subtest', 'Speaking Subtest'],
    papers: ['Listening (42 items)', 'Reading (42 items)', 'Writing (1 Referral Letter)', 'Speaking (2 Roleplays)'],
    languages: ['English'],
    aliases: ['OET', 'OET Medicine', 'OET Nursing', 'Occupational English Test', 'OET Exam'],
    subjects: [
      {
        name: 'Healthcare Listening & Reading',
        official_name: 'OET Listening & Reading Subtests',
        description: 'Understanding consultations, medical lectures, clinical research articles, and guidelines.',
        weight: 50,
        topics: [
          'Patient Consultations & Medical Lecture Listening',
          'Clinical Guidelines, Health Policy & Medical Research Reading',
        ],
      },
      {
        name: 'Healthcare Writing & Speaking',
        official_name: 'OET Writing & Speaking Subtests',
        description: 'Drafting medical referral letters and conducting clinical roleplay consultations.',
        weight: 50,
        topics: [
          'Drafting Clinical Referral, Transfer & Discharge Letters',
          'Conducting Patient Consultations & Empathetic Communication',
        ],
      },
    ],
  },

  // 26. IELTS Academic (International English Language Testing System)
  {
    slug: 'ielts-academic',
    name: 'IELTS Academic (International English Language Testing System)',
    short_name: 'IELTS Academic',
    authority_code: 'CBLA',
    category_id: CATEGORIES.LANGUAGE,
    description: 'IELTS Academic assesses English language proficiency for higher education admissions and professional registration in Australia, UK, Canada, and USA.',
    difficulty: 'Advanced',
    question_count: 80,
    time_limit_mins: 165,
    is_featured: true,
    official_url: 'https://www.ielts.org',
    official_notification_url: 'https://www.ielts.org/book-a-test',
    official_syllabus_url: 'https://www.ielts.org/about-ielts/test-format',
    exam_type: 'Language Proficiency',
    level: 'International',
    mode: 'Computer-Delivered / Paper-Based',
    duration: '2.75 Hours',
    total_marks: 9,
    negative_marking: 'No negative marking',
    passing_criteria: 'Overall Band Score 7.0+ (typically required for Australian professional boards)',
    eligibility: 'Open to all candidates seeking academic study or registration.',
    attempt_rules: 'Can be taken as frequently as test slots are available.',
    selection_process: 'Delivered at IDP / British Council testing centers globally.',
    stages: ['Listening', 'Reading', 'Writing', 'Speaking'],
    papers: ['Listening (40 items)', 'Reading (40 items)', 'Writing (2 Tasks)', 'Speaking (Interview)'],
    languages: ['English'],
    aliases: ['IELTS', 'IELTS Academic', 'IELTS Test', 'IELTS Australia'],
    subjects: [
      {
        name: 'IELTS Receptive Skills',
        official_name: 'Listening & Reading Modules',
        description: 'Monologues, conversations, and complex academic journal passages.',
        weight: 50,
        topics: [
          'Academic Audio Listening & Note Completion',
          'Academic Reading Passages & True/False/Not Given Reasoning',
        ],
      },
      {
        name: 'IELTS Productive Skills',
        official_name: 'Writing & Speaking Modules',
        description: 'Graph description, formal essay writing, and face-to-face speaking interview.',
        weight: 50,
        topics: [
          'Visual Data Chart Analysis & Formal Essay Writing',
          'Fluency, Lexical Resource & Pronunciation in Speaking',
        ],
      },
    ],
  },

  // 27. PTE Academic (Pearson Test of English Academic)
  {
    slug: 'pte-academic',
    name: 'PTE Academic (Pearson Test of English Academic)',
    short_name: 'PTE Academic',
    authority_code: 'CBLA',
    category_id: CATEGORIES.LANGUAGE,
    description: 'PTE Academic is an AI-scored computer-based English language test widely accepted for Australian university admissions, professional registration (AHPRA), and Australian visa applications.',
    difficulty: 'Advanced',
    question_count: 52,
    time_limit_mins: 120,
    is_featured: true,
    official_url: 'https://www.pearsonpte.com',
    official_notification_url: 'https://www.pearsonpte.com/book-now',
    official_syllabus_url: 'https://www.pearsonpte.com/pte-academic',
    exam_type: 'Language Proficiency',
    level: 'International',
    mode: 'Computer-Based Test (AI Scored)',
    duration: '2 Hours',
    total_marks: 90,
    negative_marking: 'Partial credit and negative marking apply to select multi-choice items',
    passing_criteria: 'Overall score 65+ for university entry, 65-79+ for Australian skilled visas/registration',
    eligibility: 'Open to all test takers.',
    attempt_rules: 'Unlimited attempts (single test booking active at one time).',
    selection_process: 'CBT examination at Pearson VUE test centers.',
    stages: ['Speaking & Writing', 'Reading', 'Listening'],
    papers: ['Integrated Computer-Based Assessment'],
    languages: ['English'],
    aliases: ['PTE', 'PTE Academic', 'PTE Test', 'PTE Australia', 'Pearson Test of English'],
    subjects: [
      {
        name: 'PTE Integrated Speaking & Writing',
        official_name: 'Speaking & Writing Section',
        description: 'Read aloud, repeat sentence, describe image, re-tell lecture, summarize text, and write essay.',
        weight: 50,
        topics: [
          'Read Aloud, Repeat Sentence & Oral Fluency',
          'Summarize Written Text & Argumentative Essay Composition',
        ],
      },
      {
        name: 'PTE Reading & Listening',
        official_name: 'Reading & Listening Section',
        description: 'Fill in the blanks, re-order paragraphs, summarize spoken text, and highlight incorrect words.',
        weight: 50,
        topics: [
          'Reading Fill in the Blanks & Paragraph Re-Ordering',
          'Summarize Spoken Text & Listening Fill in the Blanks',
        ],
      },
    ],
  },
];

async function seedAustraliaCatalog() {
  console.log('=== STARTING AUSTRALIA COMPREHENSIVE CATALOG INGESTION ===\n');

  // 1. Ingest/Upsert Authorities
  console.log(`Processing ${AUTHORITIES.length} Australian Authorities...`);
  const authorityMap = new Map(); // code -> id

  for (const auth of AUTHORITIES) {
    const { data: existingAuth } = await supabase
      .from('exam_authorities')
      .select('id')
      .eq('slug', auth.slug)
      .maybeSingle();

    if (existingAuth) {
      authorityMap.set(auth.code, existingAuth.id);
    } else {
      const { data: newAuth, error: authErr } = await supabase
        .from('exam_authorities')
        .insert({
          country_id: AU_COUNTRY_ID,
          name: auth.name,
          code: auth.code,
          slug: auth.slug,
          short_name: auth.short_name,
          official_website: auth.official_website,
          description: auth.description,
          verification_status: 'verified',
          source_url: auth.official_website,
          last_verified_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (authErr) {
        console.error(`Error inserting authority ${auth.code}:`, authErr);
      } else {
        authorityMap.set(auth.code, newAuth.id);
      }
    }
  }

  console.log(`Authorities ready: ${authorityMap.size} loaded.\n`);

  // 2. Process Global Exam Re-use (NCLEX-RN, GMAT, GRE, CFA)
  console.log('Checking Global Exams for Australia reuse...');
  const globalReuses = [
    { slug: 'nclex-rn', aliases: ['NCLEX Australia', 'AHPRA NCLEX', 'NCLEX-RN Australia'] },
    { slug: 'gmat-focus-edition', aliases: ['GMAT Australia', 'GMAT Exam Australia'] },
    { slug: 'gre-general-test', aliases: ['GRE Australia', 'GRE General Australia'] },
    { slug: 'cfa-level-1', aliases: ['CFA Australia', 'CFA Level 1 Australia'] },
  ];

  for (const gr of globalReuses) {
    const { data: ex } = await supabase.from('exams').select('id, name').eq('slug', gr.slug).maybeSingle();
    if (ex) {
      console.log(`+ Found global exam [${ex.name}] (ID: ${ex.id}). Adding Australian aliases...`);
      for (const aliasStr of gr.aliases) {
        const { data: existAlias } = await supabase.from('exam_aliases').select('id').eq('exam_id', ex.id).ilike('alias', aliasStr).maybeSingle();
        if (!existAlias) {
          await supabase.from('exam_aliases').insert({
            exam_id: ex.id,
            alias: aliasStr,
          });
        }
      }
    }
  }

  // 3. Process Australian Exams Ingestion
  console.log(`\nIngesting ${AU_EXAMS.length} Australian Exams...`);

  for (const examData of AU_EXAMS) {
    const authorityId = authorityMap.get(examData.authority_code) || null;

    // Check if exam exists by slug
    let examId;
    const { data: existingExam } = await supabase
      .from('exams')
      .select('id')
      .eq('slug', examData.slug)
      .maybeSingle();

    if (existingExam) {
      examId = existingExam.id;
      // Update fields to ensure verified status & metadata
      await supabase
        .from('exams')
        .update({
          country_id: AU_COUNTRY_ID,
          authority_id: authorityId,
          category_id: examData.category_id,
          name: examData.name,
          short_name: examData.short_name,
          description: examData.description,
          difficulty: examData.difficulty,
          question_count: examData.question_count,
          time_limit_mins: examData.time_limit_mins,
          is_featured: examData.is_featured,
          status: 'active',
          official_url: examData.official_url,
          official_notification_url: examData.official_notification_url,
          official_syllabus_url: examData.official_syllabus_url,
          exam_type: examData.exam_type,
          level: examData.level,
          mode: examData.mode,
          duration: examData.duration,
          total_marks: examData.total_marks,
          negative_marking: examData.negative_marking,
          passing_criteria: examData.passing_criteria,
          eligibility: examData.eligibility,
          attempt_rules: examData.attempt_rules,
          selection_process: examData.selection_process,
          stages: examData.stages,
          papers: examData.papers,
          languages: examData.languages,
          current_version: '2026',
          version_year: 2026,
          is_current: true,
          verification_status: 'verified',
          source_url: examData.official_url,
          last_verified_at: new Date().toISOString(),
        })
        .eq('id', examId);
    } else {
      const { data: newExam, error: examErr } = await supabase
        .from('exams')
        .insert({
          country_id: AU_COUNTRY_ID,
          authority_id: authorityId,
          category_id: examData.category_id,
          name: examData.name,
          short_name: examData.short_name,
          slug: examData.slug,
          description: examData.description,
          difficulty: examData.difficulty,
          question_count: examData.question_count,
          time_limit_mins: examData.time_limit_mins,
          is_featured: examData.is_featured,
          status: 'active',
          official_url: examData.official_url,
          official_notification_url: examData.official_notification_url,
          official_syllabus_url: examData.official_syllabus_url,
          exam_type: examData.exam_type,
          level: examData.level,
          mode: examData.mode,
          duration: examData.duration,
          total_marks: examData.total_marks,
          negative_marking: examData.negative_marking,
          passing_criteria: examData.passing_criteria,
          eligibility: examData.eligibility,
          attempt_rules: examData.attempt_rules,
          selection_process: examData.selection_process,
          stages: examData.stages,
          papers: examData.papers,
          languages: examData.languages,
          current_version: '2026',
          version_year: 2026,
          is_current: true,
          verification_status: 'verified',
          source_url: examData.official_url,
          last_verified_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (examErr) {
        console.error(`Error creating exam ${examData.slug}:`, examErr);
        continue;
      }
      examId = newExam.id;
      console.log(`+ Ingested new exam: ${examData.slug} (ID: ${examId})`);
    }

    // Exam Version (2026)
    const { data: existingVer } = await supabase
      .from('exam_versions')
      .select('id')
      .eq('exam_id', examId)
      .eq('version_year', 2026)
      .maybeSingle();

    if (!existingVer) {
      await supabase.from('exam_versions').insert({
        exam_id: examId,
        version_year: 2026,
        is_current: true,
        official_notification_url: examData.official_notification_url,
        official_syllabus_url: examData.official_syllabus_url,
        stages: examData.stages,
        papers: examData.papers,
        pattern_summary: `${examData.mode} - ${examData.duration} - ${examData.question_count} questions`,
        source_url: examData.official_url,
        verified_at: new Date().toISOString(),
      });
    }

    // Aliases
    if (examData.aliases && examData.aliases.length > 0) {
      for (const aliasStr of examData.aliases) {
        const { data: existAlias } = await supabase
          .from('exam_aliases')
          .select('id')
          .eq('exam_id', examId)
          .ilike('alias', aliasStr)
          .maybeSingle();

        if (!existAlias) {
          await supabase.from('exam_aliases').insert({
            exam_id: examId,
            alias: aliasStr,
          });
        }
      }
    }

    // Subjects and Topics Ingestion (Master Reuse Logic)
    if (examData.subjects && examData.subjects.length > 0) {
      for (let sIdx = 0; sIdx < examData.subjects.length; sIdx++) {
        const subjData = examData.subjects[sIdx];
        const subjSlug = `${subjData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        // Check or create Master Subject in 'subjects' table
        let subjectId;
        let { data: existingMasterSubj } = await supabase
          .from('subjects')
          .select('id')
          .eq('slug', subjSlug)
          .maybeSingle();

        if (!existingMasterSubj) {
          const { data: byName } = await supabase
            .from('subjects')
            .select('id')
            .ilike('name', subjData.name)
            .maybeSingle();
          existingMasterSubj = byName;
        }

        if (existingMasterSubj) {
          subjectId = existingMasterSubj.id;
        } else {
          const { data: newMasterSubj, error: masterSubjErr } = await supabase
            .from('subjects')
            .insert({
              name: subjData.name,
              slug: subjSlug,
              category_id: examData.category_id,
              description: subjData.description,
            })
            .select('id')
            .single();

          if (masterSubjErr) {
            console.error(`Error creating master subject ${subjData.name}:`, masterSubjErr);
            continue;
          }
          subjectId = newMasterSubj.id;
        }

        // Link Exam Subject in 'exam_subjects'
        const { data: existingExamSubj } = await supabase
          .from('exam_subjects')
          .select('id')
          .eq('exam_id', examId)
          .eq('subject_id', subjectId)
          .maybeSingle();

        let examSubjectId;
        if (existingExamSubj) {
          examSubjectId = existingExamSubj.id;
        } else {
          const { data: newExamSubj, error: examSubjErr } = await supabase
            .from('exam_subjects')
            .insert({
              exam_id: examId,
              subject_id: subjectId,
              name: subjData.name,
              official_name: subjData.official_name || subjData.name,
              display_name: subjData.name,
              description: subjData.description,
              weight_percentage: subjData.weight || 10,
              required: true,
              active: true,
              verification_status: 'verified',
              source_url: examData.official_url,
              last_verified_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (examSubjErr) {
            console.error(`Error linking exam subject ${subjData.name}:`, examSubjErr);
            continue;
          }
          examSubjectId = newExamSubj.id;
        }

        // Topics
        if (subjData.topics && subjData.topics.length > 0) {
          for (const topicName of subjData.topics) {
            const topicSlug = `${topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

            // Check master topic
            let { data: masterTopic } = await supabase
              .from('topics')
              .select('id')
              .eq('slug', topicSlug)
              .maybeSingle();

            if (!masterTopic) {
              const { data: newMasterTopic } = await supabase
                .from('topics')
                .insert({
                  subject_id: subjectId,
                  name: topicName,
                  slug: topicSlug,
                  description: `Core concept: ${topicName} for ${subjData.name}`,
                  importance: 'High',
                })
                .select('id')
                .single();
              masterTopic = newMasterTopic;
            }

            if (masterTopic) {
              const { data: existingExamTopic } = await supabase
                .from('exam_topics')
                .select('id')
                .eq('subject_id', subjectId)
                .eq('topic_id', masterTopic.id)
                .maybeSingle();

              if (!existingExamTopic) {
                await supabase.from('exam_topics').insert({
                  subject_id: subjectId,
                  topic_id: masterTopic.id,
                  name: topicName,
                  official_name: topicName,
                  display_name: topicName,
                  description: topicName,
                  importance: 'High',
                  active: true,
                  verification_status: 'verified',
                  source_url: examData.official_url,
                  last_verified_at: new Date().toISOString(),
                });
              }
            }
          }
        }
      }
    }
  }

  console.log('\n=== AUSTRALIA CATALOG SEEDING COMPLETED SUCCESSFULLY ===');
}

seedAustraliaCatalog();
