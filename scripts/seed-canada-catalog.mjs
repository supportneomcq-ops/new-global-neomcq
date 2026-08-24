import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CANADA_COUNTRY_ID = 'bf1c9b96-570f-4435-80be-8e986cd35b43';

// Category IDs from Supabase
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
  BANKING: '2dc09b60-6b4f-4368-a004-d9bc75f7b42a',
};

// Canadian Governing Authorities
const AUTHORITIES = [
  { code: 'MCC', name: 'Medical Council of Canada', short_name: 'MCC', slug: 'medical-council-of-canada', official_website: 'https://mcc.ca', description: 'National body establishing standards for medical education and administering qualifying examinations in Canada.' },
  { code: 'RCPSC', name: 'Royal College of Physicians and Surgeons of Canada', short_name: 'RCPSC', slug: 'royal-college-physicians-surgeons-canada', official_website: 'https://www.royalcollege.ca', description: 'National organization overseeing medical specialist training and certification in Canada.' },
  { code: 'CFPC', name: 'College of Family Physicians of Canada', short_name: 'CFPC', slug: 'college-family-physicians-canada', official_website: 'https://www.cfpc.ca', description: 'Professional organization responsible for training, certifying, and lifelong learning of family physicians.' },
  { code: 'PEBC', name: 'Pharmacy Examining Board of Canada', short_name: 'PEBC', slug: 'pharmacy-examining-board-canada', official_website: 'https://pebc.ca', description: 'National certification body assessing qualifications for pharmacists and pharmacy technicians in Canada.' },
  { code: 'NDEB', name: 'National Dental Examining Board of Canada', short_name: 'NDEB', slug: 'national-dental-examining-board-canada', official_website: 'https://ndeb-bned.ca', description: 'Official organization establishing dental competence standards and equivalency assessments across Canada.' },
  { code: 'NCA_FLSC', name: 'National Committee on Accreditation (FLSC)', short_name: 'NCA / FLSC', slug: 'national-committee-accreditation-canada', official_website: 'https://nca.gov.on.ca', description: 'Committee of the Federation of Law Societies of Canada evaluating legal education credentials of international law graduates.' },
  { code: 'LSO', name: 'Law Society of Ontario', short_name: 'LSO', slug: 'law-society-ontario', official_website: 'https://lso.ca', description: 'Governing regulatory body for lawyers and paralegals in Ontario administering licensing examinations.' },
  { code: 'CPLED', name: 'Canadian Centre for Professional Legal Education', short_name: 'CPLED', slug: 'cpled-canada', official_website: 'https://cpled.ca', description: 'Legal education provider administering the Practice Readiness Education Program (PREP) for Western Canadian jurisdictions.' },
  { code: 'CPA_CANADA', name: 'Chartered Professional Accountants of Canada', short_name: 'CPA Canada', slug: 'cpa-canada', official_website: 'https://www.cpacanada.ca', description: 'National professional organization overseeing the CPA designation and the Common Final Examination (CFE).' },
  { code: 'CSI', name: 'Canadian Securities Institute', short_name: 'CSI', slug: 'canadian-securities-institute', official_website: 'https://www.csi.ca', description: 'Leading Canadian financial services education provider administering the Canadian Securities Course (CSC).' },
  { code: 'ENGINEERS_CANADA', name: 'Engineers Canada & Provincial Regulators', short_name: 'Engineers Canada', slug: 'engineers-canada', official_website: 'https://engineerscanada.ca', description: 'National organization of provincial engineering regulatory bodies administering NPPE licensure.' },
  { code: 'AAMC', name: 'Association of American Medical Colleges', short_name: 'AAMC', slug: 'aamc-canada', official_website: 'https://students-residents.aamc.org', description: 'Administrator of the Medical College Admission Test (MCAT) used by Canadian medical schools.' },
  { code: 'LSAC', name: 'Law School Admission Council', short_name: 'LSAC', slug: 'lsac-canada', official_website: 'https://www.lsac.org', description: 'Administrator of the Law School Admission Test (LSAT) required for Canadian law school entry.' },
  { code: 'ACUITY_INSIGHTS', name: 'Acuity Insights / Altus Assessments', short_name: 'Acuity Insights', slug: 'acuity-insights', official_website: 'https://acuityinsights.app', description: 'Administrator of the Casper situational judgment assessment for Canadian higher education admissions.' },
  { code: 'PARAGON', name: 'Paragon Testing Enterprises / Prometric', short_name: 'Paragon / Prometric', slug: 'paragon-testing-enterprises', official_website: 'https://www.celpip.ca', description: 'Administrator of the CELPIP-General English language assessment for Canadian immigration.' },
  { code: 'PEARSON_VUE', name: 'Pearson VUE / Pearson Education', short_name: 'Pearson VUE', slug: 'pearson-canada', official_website: 'https://www.pearsonpte.com', description: 'Global computer-based testing company administering PTE Core and professional licensing exams.' },
  { code: 'LE_FRANCAIS_DES_AFFAIRES', name: 'Le français des affaires (CCI Paris Île-de-France)', short_name: 'CCI Paris', slug: 'le-francais-des-affaires', official_website: 'https://www.lefrancaisdesaffaires.fr', description: 'Official administrator of TEF Canada French language examination for IRCC.' },
  { code: 'FEI', name: 'France Éducation international', short_name: 'France Éducation', slug: 'france-education-international', official_website: 'https://www.france-education-international.fr', description: 'Official public agency administering TCF Canada French test for Canadian immigration.' },
  { code: 'CNO_BCCNM', name: 'College of Nurses of Ontario & Provincial Boards', short_name: 'CNO / BCCNM', slug: 'cno-bccnm-nursing', official_website: 'https://www.cno.org', description: 'Provincial regulatory bodies administering REx-PN and practical nurse entry-to-practice exams.' },
  { code: 'OCT', name: 'Ontario College of Teachers', short_name: 'OCT', slug: 'ontario-college-teachers', official_website: 'https://www.oct.ca', description: 'Regulatory body for the teaching profession in Ontario overseeing teacher certification standards.' },
  { code: 'CAMRT', name: 'Canadian Association of Medical Radiation Technologists', short_name: 'CAMRT', slug: 'camrt-canada', official_website: 'https://www.camrt.ca', description: 'National professional association certifying medical radiation technologists in Canada.' },
];

// Canadian Exam Definitions
const CANADA_EXAMS = [
  // 1. MCCQE Part I
  {
    slug: 'mccqe-part-1',
    name: 'MCCQE Part I (Medical Council of Canada Qualifying Examination)',
    short_name: 'MCCQE Part I',
    authority_code: 'MCC',
    category_id: CATEGORIES.MEDICAL,
    description: 'The MCCQE Part I is a computer-based examination assessing critical medical knowledge and clinical decision-making capabilities of medical graduates seeking licensure in Canada. Consists of 210 MCQs and 38 Clinical Decision Making (CDM) cases.',
    difficulty: 'Expert',
    question_count: 210,
    time_limit_mins: 420,
    is_featured: true,
    official_url: 'https://mcc.ca/examinations/mccqe-part-i/',
    official_notification_url: 'https://mcc.ca/examinations/mccqe-part-i/dates-prices/',
    official_syllabus_url: 'https://mcc.ca/objectives/',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '7 Hours (Two Sessions)',
    total_marks: 500,
    negative_marking: 'No negative marking for MCQs or CDM short answer questions',
    passing_criteria: 'Standard set passing score (226 on MCC scaled score range 100-400)',
    eligibility: 'Graduate or graduating student from a medical school listed in the World Directory of Medical Schools.',
    attempt_rules: 'Maximum of 4 attempts lifetime allowed by Medical Council of Canada.',
    selection_process: 'Computer-based testing via Prometric centers or remote proctoring.',
    stages: ['Session 1: 210 MCQs (3.5 hours)', 'Session 2: 38 Clinical Decision Making cases (3.5 hours)'],
    papers: ['MCCQE Part I MCQ & CDM Combined Assessment'],
    languages: ['English', 'French'],
    aliases: ['MCCQE1', 'MCCQE Part 1', 'Medical Council of Canada Qualifying Examination Part I', 'MCC Part I'],
    subjects: [
      {
        name: 'Internal Medicine',
        official_name: 'Medicine & Clinical Subspecialties',
        description: 'Cardiology, gastroenterology, endocrinology, nephrology, respiratory medicine, and infectious disease.',
        weight: 25,
        topics: [
          'Cardiovascular Medicine & Acute Ischemic Syndromes',
          'Respiratory Medicine, Asthma & COPD Management',
          'Gastroenterology, Hepatology & Gastrointestinal Bleeding',
          'Endocrinology, Diabetes & Metabolic Crisis',
        ],
      },
      {
        name: 'General Surgery & Specialties',
        official_name: 'Surgical Foundations & Trauma',
        description: 'Acute abdomen, surgical trauma, wound healing, vascular surgery, and perioperative care.',
        weight: 20,
        topics: [
          'Acute Abdomen & Surgical Emergencies',
          'Trauma Assessment, ATLS Protocols & Hemorrhage Control',
          'Perioperative Patient Management & Fluid Resuscitation',
        ],
      },
      {
        name: 'Obstetrics & Gynecology',
        official_name: 'Obstetrics, Gynecology & Women’s Health',
        description: 'Antenatal care, high-risk pregnancy, labor complications, gynecologic oncology, and contraception.',
        weight: 15,
        topics: [
          'Antenatal Care, Screening & Preeclampsia Management',
          'Labor & Delivery Complications & Postpartum Emergencies',
          'Gynecologic Disorders, Contraception & Oncology',
        ],
      },
      {
        name: 'Pediatrics & Child Health',
        official_name: 'Pediatric Care & Adolescent Health',
        description: 'Pediatric emergencies, neonatal care, growth milestones, and pediatric infectious disease.',
        weight: 15,
        topics: [
          'Neonatal Care, Resuscitation & Jaundice',
          'Acute Pediatric Emergencies, Febrile Seizures & Infections',
          'Pediatric Growth, Development & Vaccination Guidelines',
        ],
      },
      {
        name: 'Psychiatry & Behavioral Sciences',
        official_name: 'Mental Health & Clinical Psychiatry',
        description: 'Depression, bipolar disorder, schizophrenia, substance use disorders, and psychiatric emergencies.',
        weight: 12,
        topics: [
          'Mood Disorders, Suicidality & Risk Assessment',
          'Psychotic Disorders, Delirium & Agitation Management',
          'Substance Use Disorders & Addiction Medicine',
        ],
      },
      {
        name: 'Population Health & Ethics',
        official_name: 'Population Health, Ethics & Professionalism',
        description: 'Canadian healthcare system, medical ethics, consent, epidemiology, and public health policies.',
        weight: 13,
        topics: [
          'Canadian Healthcare Structure, CMPA Guidelines & Bioethics',
          'Epidemiology, Disease Prevention & Health Promotion',
          'Indigenous Health & Cultural Safety in Canadian Medicine',
        ],
      },
    ],
  },

  // 2. NAC Examination
  {
    slug: 'nac-examination',
    name: 'NAC Examination (National Assessment Collaboration)',
    short_name: 'NAC OSCE',
    authority_code: 'MCC',
    category_id: CATEGORIES.MEDICAL,
    description: 'The NAC Examination is an Objective Structured Clinical Examination (OSCE) evaluating clinical knowledge, history taking, physical examination, communication skills, and management planning of international medical graduates applying for Canadian residency.',
    difficulty: 'Expert',
    question_count: 10,
    time_limit_mins: 180,
    is_featured: true,
    official_url: 'https://mcc.ca/examinations/nac-overview/',
    official_notification_url: 'https://mcc.ca/examinations/nac-overview/dates-prices/',
    official_syllabus_url: 'https://mcc.ca/examinations/nac-overview/examination-specifications/',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'OSCE Clinical Exam',
    duration: '3 Hours (10 Stations)',
    total_marks: 10,
    negative_marking: 'Station-based holistic scoring rubric',
    passing_criteria: 'Standard set passing score required for CaRMS residency match eligibility',
    eligibility: 'International Medical Graduate or student within 12 months of graduation from a recognized medical school.',
    attempt_rules: 'Candidates may retake the NAC examination subject to MCC retake eligibility policies.',
    selection_process: 'In-person OSCE examination at designated Canadian medical school exam centers.',
    stages: ['10 Clinical OSCE Stations (11 minutes per station)'],
    papers: ['NAC OSCE Practical Clinical Stations'],
    languages: ['English'],
    aliases: ['NAC Exam', 'NAC OSCE', 'National Assessment Collaboration Exam', 'NAC Examination Canada'],
    subjects: [
      {
        name: 'Clinical History & Communication',
        official_name: 'History Taking & Patient Interaction',
        description: 'Focused history gathering, empathy, clear communication, and addressing patient concerns.',
        weight: 35,
        topics: [
          'Focused Medical History Taking in Canadian Context',
          'Communication Skills & Patient-Centered Care',
          'Counseling & Shared Decision Making',
        ],
      },
      {
        name: 'Physical Examination & Clinical Assessment',
        official_name: 'Physical Examination & Diagnosis',
        description: 'Systematic physical examination technique, identification of clinical signs, and patient dignity.',
        weight: 35,
        topics: [
          'Cardiovascular & Respiratory Physical Examination',
          'Abdominal & Musculoskeletal Clinical Assessment',
          'Neurological Examination & Mental Status Assessment',
        ],
      },
      {
        name: 'Management & Case Summary',
        official_name: 'Diagnostic Investigation & Treatment Planning',
        description: 'Formulating differential diagnoses, ordering appropriate investigations, and oral post-station oral questions.',
        weight: 30,
        topics: [
          'Differential Diagnosis Formulation & Prioritization',
          'Diagnostic Investigation Selection & Interpretation',
          'Acute Management Planning & Patient Disposition',
        ],
      },
    ],
  },

  // 3. RCPSC Specialty Examinations
  {
    slug: 'rcpsc-specialty-exam',
    name: 'RCPSC Specialist Examinations (Royal College of Physicians & Surgeons)',
    short_name: 'RCPSC Exam',
    authority_code: 'RCPSC',
    category_id: CATEGORIES.MEDICAL,
    description: 'The Royal College Specialist Examinations are the national certifying examinations in medical, surgical, and laboratory specialties required for specialist medical practice in Canada.',
    difficulty: 'Expert',
    question_count: 200,
    time_limit_mins: 360,
    is_featured: false,
    official_url: 'https://www.royalcollege.ca/',
    official_notification_url: 'https://www.royalcollege.ca/ca/en/examinations/exam-dates.html',
    official_syllabus_url: 'https://www.royalcollege.ca/ca/en/credentials-examinations.html',
    exam_type: 'Specialist Certification',
    level: 'National',
    mode: 'Written & Applied/Oral Exam',
    duration: '2 Days (Written + Oral/Applied)',
    total_marks: 100,
    negative_marking: 'No negative marking',
    passing_criteria: '70% minimum passing score on combined written and applied components',
    eligibility: 'Completion of Royal College accredited residency program or approved Subspecialty Examination Affiliate Program.',
    attempt_rules: 'Maximum 4 attempts permitted within eligibility window.',
    selection_process: 'Computer-based written paper followed by oral/OSCE examination component.',
    stages: ['Component 1: Written Examination (Multiple-Choice & Short Answer)', 'Component 2: Applied / Oral Examination'],
    papers: ['Paper 1 (MCQ/SAQ)', 'Paper 2 (Applied Clinical Scenarios)'],
    languages: ['English', 'French'],
    aliases: ['RCPSC Certification', 'Royal College Specialist Exam', 'FRCPC Examination', 'FRCSC Examination'],
    subjects: [
      {
        name: 'Specialty Medical Knowledge',
        official_name: 'Core Specialist Knowledge & Pathology',
        description: 'Advanced pathophysiology, evidence-based guidelines, and disease mechanisms.',
        weight: 50,
        topics: [
          'Advanced Disease Pathophysiology & Evidence-Based Guidelines',
          'Specialist Pharmacotherapy & Multimodal Therapeutics',
        ],
      },
      {
        name: 'Clinical Management & Decision Making',
        official_name: 'Clinical Judgment & Patient Care',
        description: 'Complex case management, emergency specialist care, and interprofessional consultation.',
        weight: 50,
        topics: [
          'Complex Case Diagnosis & Specialist Investigation Planning',
          'Patient Safety, CanMEDS Roles & Bioethics in Specialist Practice',
        ],
      },
    ],
  },

  // 4. CFPC Certification Examination in Family Medicine
  {
    slug: 'cfpc-family-medicine-exam',
    name: 'CFPC Certification Examination in Family Medicine',
    short_name: 'CFPC Exam',
    authority_code: 'CFPC',
    category_id: CATEGORIES.MEDICAL,
    description: 'The CFPC Certification Examination evaluates the competence of family physicians across the 99 priority topics. Features Short Answer Management Problems (SAMPs) and Simulated Office Orals (SOOs).',
    difficulty: 'Expert',
    question_count: 50,
    time_limit_mins: 300,
    is_featured: false,
    official_url: 'https://www.cfpc.ca/',
    official_notification_url: 'https://www.cfpc.ca/en/education-and-professional-development/examinations-and-certification',
    official_syllabus_url: 'https://www.cfpc.ca/en/education-and-professional-development/examinations-and-certification/99-priority-topics',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Written (SAMPs) + Oral (SOOs)',
    duration: '5 Hours Total',
    total_marks: 100,
    negative_marking: 'No negative marking',
    passing_criteria: 'Must pass both SAMPs and SOOs components independently',
    eligibility: 'Completion of accredited CFPC family medicine residency or practice-eligible pathway.',
    attempt_rules: 'Maximum 4 attempts permitted.',
    selection_process: 'SAMPs written exam via computer + SOOs simulated office oral interviews.',
    stages: ['Short Answer Management Problems (SAMPs)', 'Simulated Office Orals (SOOs)'],
    papers: ['SAMPs Written Component', 'SOOs Oral Component'],
    languages: ['English', 'French'],
    aliases: ['CFPC Certification', 'CCFP Exam', 'Family Medicine Board Exam Canada', 'CFPC SAMPs SOOs'],
    subjects: [
      {
        name: 'Primary Care & Chronic Disease Management',
        official_name: 'Family Practice & Chronic Disease',
        description: 'Hypertension, diabetes, multimorbidity, preventive health, and geriatrics.',
        weight: 40,
        topics: [
          'Diabetes, Cardiovascular Risk & Hypertension in Primary Care',
          'Preventive Health Screening & Periodic Health Reviews',
          'Geriatric Medicine, Dementia & Palliative Care',
        ],
      },
      {
        name: 'Acute Medicine & Emergency Presentation',
        official_name: 'Urgent Care & Acute Illness',
        description: 'Acute chest pain, shortness of breath, sepsis, urgent pediatric care, and minor surgical procedures.',
        weight: 30,
        topics: [
          'Acute Undifferentiated Chest & Abdominal Pain',
          'Urgent Pediatric & Respiratory Emergencies in Primary Care',
        ],
      },
      {
        name: 'Maternal, Infant & Mental Health',
        official_name: 'Women’s Health, Pediatrics & Psychiatry',
        description: 'Low-risk obstetrics, well-child care, depression, anxiety, and addiction in primary care.',
        weight: 30,
        topics: [
          'Low-Risk Prenatal & Postnatal Care',
          'Common Primary Care Psychiatric Disorders & Counseling',
        ],
      },
    ],
  },

  // 5. PEBC Qualifying Examination (Pharmacist)
  {
    slug: 'pebc-qualifying-exam',
    name: 'PEBC Qualifying Examination (Pharmacist Part I MCQ & Part II OSCE)',
    short_name: 'PEBC Qualifying Exam',
    authority_code: 'PEBC',
    category_id: CATEGORIES.PHARMACY,
    description: 'The PEBC Qualifying Examination assesses the entry-to-practice competence of pharmacists in Canada. Consists of Part I (Multiple Choice Questions) and Part II (Objective Structured Clinical Examination).',
    difficulty: 'Expert',
    question_count: 200,
    time_limit_mins: 420,
    is_featured: true,
    official_url: 'https://pebc.ca/',
    official_notification_url: 'https://pebc.ca/pharmacists/qualifying-examination/',
    official_syllabus_url: 'https://pebc.ca/pharmacists/qualifying-examination/part-i-mcq-blueprint/',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'CBT (Part I) + OSCE (Part II)',
    duration: '7 Hours (Combined Part I & Part II)',
    total_marks: 200,
    negative_marking: 'No negative marking',
    passing_criteria: 'Must pass both Part I (MCQ) and Part II (OSCE) independently',
    eligibility: 'Graduate of an accredited Canadian pharmacy program or successful completion of PEBC Evaluating Examination.',
    attempt_rules: 'Maximum 4 attempts per part allowed.',
    selection_process: 'Part I administered via Prometric computer centers; Part II administered at OSCE test centers.',
    stages: ['Part I: Multiple-Choice Examination (MCQ)', 'Part II: Objective Structured Clinical Examination (OSCE)'],
    papers: ['Part I MCQ Paper 1 & Paper 2', 'Part II Clinical OSCE Stations'],
    languages: ['English', 'French'],
    aliases: ['PEBC Qualifying Exam', 'PEBC Part 1', 'PEBC Part 2', 'PEBC Pharmacist Exam', 'PEBC MCQ OSCE'],
    subjects: [
      {
        name: 'Patient Care & Clinical Therapeutics',
        official_name: 'Pharmacotherapy & Clinical Care',
        description: 'Disease management, drug therapy selection, dosing, adverse effects, and drug interactions.',
        weight: 45,
        topics: [
          'Cardiovascular & Metabolic Pharmacotherapy',
          'Infectious Disease & Antimicrobial Stewardship',
          'Central Nervous System & Psychiatric Pharmacotherapy',
        ],
      },
      {
        name: 'Product Distribution & Practice Law',
        official_name: 'Pharmacy Law, Ethics & Dispensing Safety',
        description: 'Canadian pharmacy regulations, controlled substances act, NAPRA standards, and prescription verification.',
        weight: 30,
        topics: [
          'Canadian Pharmacy Legislation & Narcotics Control',
          'Prescription Processing, Dispensing Accuracy & Safety',
        ],
      },
      {
        name: 'Communication & Health Promotion',
        official_name: 'Patient Communication & Public Health',
        description: 'Patient counseling, health literacy, immunization administration, and interprofessional collaboration.',
        weight: 25,
        topics: [
          'Patient Consultation & Self-Care Recommendation',
          'Immunization & Pharmacy Health Promotion',
        ],
      },
    ],
  },

  // 6. PEBC Evaluating Examination
  {
    slug: 'pebc-evaluating-exam',
    name: 'PEBC Evaluating Examination (Pharmacist PEBC EE)',
    short_name: 'PEBC EE',
    authority_code: 'PEBC',
    category_id: CATEGORIES.PHARMACY,
    description: 'The PEBC Evaluating Examination is designed to evaluate the knowledge comparability of International Pharmacy Graduates (IPGs) to Canadian pharmacy education standards before proceeding to the Qualifying Exam.',
    difficulty: 'Hard',
    question_count: 200,
    time_limit_mins: 270,
    is_featured: false,
    official_url: 'https://pebc.ca/',
    official_notification_url: 'https://pebc.ca/pharmacists/evaluating-examination/',
    official_syllabus_url: 'https://pebc.ca/pharmacists/evaluating-examination/exam-blueprint/',
    exam_type: 'Assessment',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '4.5 Hours',
    total_marks: 200,
    negative_marking: 'No negative marking',
    passing_criteria: 'Standard set scaled passing score',
    eligibility: 'Degree in pharmacy from a university outside Canada listed in World Directory of Pharmacy Schools.',
    attempt_rules: 'Maximum 4 attempts allowed.',
    selection_process: 'CBT examination delivered at Prometric centers worldwide.',
    stages: ['Single Computer-Based MCQ Examination'],
    papers: ['200 Multiple-Choice Questions'],
    languages: ['English', 'French'],
    aliases: ['PEBC EE', 'PEBC Evaluating Exam', 'PEBC IPG Exam', 'Pharmacist Evaluating Exam Canada'],
    subjects: [
      {
        name: 'Biomedical Sciences',
        official_name: 'Anatomy, Physiology & Biochemistry',
        description: 'Human anatomy, physiology, biochemistry, molecular biology, and microbiology.',
        weight: 15,
        topics: [
          'Human Physiology & Organ Systems',
          'Medical Biochemistry & Metabolic Pathways',
        ],
      },
      {
        name: 'Pharmaceutical Sciences',
        official_name: 'Pharmaceutics, Kinetics & Medicinal Chemistry',
        description: 'Drug formulation, pharmacokinetics, biopharmaceutics, and medicinal chemistry.',
        weight: 25,
        topics: [
          'Pharmacokinetics, Clearance & Bioavailability',
          'Pharmaceutics, Drug Dosage Forms & Calculations',
        ],
      },
      {
        name: 'Pharmacy Practice & Therapeutics',
        official_name: 'Clinical Pharmacy & Therapeutics',
        description: 'Pharmacotherapy, clinical chemistry, adverse drug reactions, and pharmacy calculations.',
        weight: 50,
        topics: [
          'Clinical Therapeutics & Disease Management',
          'Pharmaceutical Calculations & Dosing Guidelines',
        ],
      },
      {
        name: 'Social & Administrative Sciences',
        official_name: 'Healthcare Systems & Management',
        description: 'Canadian healthcare delivery, biostatistics, literature evaluation, and ethics.',
        weight: 10,
        topics: [
          'Canadian Healthcare System & Pharmacy Ethics',
          'Biostatistics & Clinical Trial Evaluation',
        ],
      },
    ],
  },

  // 7. NDEB AFK
  {
    slug: 'ndeb-afk',
    name: 'NDEB Assessment of Fundamental Knowledge (AFK)',
    short_name: 'NDEB AFK',
    authority_code: 'NDEB',
    category_id: CATEGORIES.DENTISTRY,
    description: 'The NDEB Assessment of Fundamental Knowledge (AFK) is the first examination in the NDEB equivalency process for internationally trained dentists, consisting of 300 single-best-answer MCQs.',
    difficulty: 'Expert',
    question_count: 300,
    time_limit_mins: 360,
    is_featured: true,
    official_url: 'https://ndeb-bned.ca/',
    official_notification_url: 'https://ndeb-bned.ca/equivalency-process/assessment-of-fundamental-knowledge-afk/',
    official_syllabus_url: 'https://ndeb-bned.ca/equivalency-process/afk-blueprint/',
    exam_type: 'Assessment',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '6 Hours (Two 3-Hour Sessions)',
    total_marks: 300,
    negative_marking: 'No negative marking',
    passing_criteria: 'Scaled score of 75 or higher',
    eligibility: 'Graduate of a non-accredited dental program holding a dental degree.',
    attempt_rules: 'Maximum 3 attempts permitted.',
    selection_process: 'CBT examination administered at Prometric test centers.',
    stages: ['Session 1: 150 MCQs (3 hours)', 'Session 2: 150 MCQs (3 hours)'],
    papers: ['AFK Paper 1', 'AFK Paper 2'],
    languages: ['English', 'French'],
    aliases: ['NDEB AFK', 'AFK Exam', 'Assessment of Fundamental Knowledge', 'NDEB Fundamental Knowledge'],
    subjects: [
      {
        name: 'Basic Biomedical & Oral Sciences',
        official_name: 'Biomedical & Diagnostic Sciences',
        description: 'Anatomy, histology, biochemistry, microbiology, oral pathology, and radiology.',
        weight: 35,
        topics: [
          'Head & Neck Anatomy & Histology',
          'Oral Pathology & Mucosal Lesions',
          'Dental Radiology & Diagnostic Imaging',
        ],
      },
      {
        name: 'Clinical Dental Sciences',
        official_name: 'Operative, Endodontic & Periodontal Dentistry',
        description: 'Restorative dentistry, endodontics, periodontics, and prosthodontics.',
        weight: 45,
        topics: [
          'Restorative Dentistry & Dental Materials',
          'Endodontic Diagnosis & Therapy',
          'Periodontal Diseases & Nonsurgical Management',
        ],
      },
      {
        name: 'Oral Surgery & Pharmacology',
        official_name: 'Oral Surgery, Anesthesia & Therapeutics',
        description: 'Exodontia, local anesthesia, medical emergencies, and dental pharmacology.',
        weight: 20,
        topics: [
          'Local Anesthesia & Oral Surgery Protocols',
          'Dental Pharmacology & Medical Emergencies',
        ],
      },
    ],
  },

  // 8. NDEB ACJ
  {
    slug: 'ndeb-acj',
    name: 'NDEB Assessment of Clinical Judgement (ACJ)',
    short_name: 'NDEB ACJ',
    authority_code: 'NDEB',
    category_id: CATEGORIES.DENTISTRY,
    description: 'The NDEB Assessment of Clinical Judgement evaluates clinical decision-making, diagnosis, treatment planning, radiograph interpretation, and emergency dental management.',
    difficulty: 'Expert',
    question_count: 120,
    time_limit_mins: 330,
    is_featured: false,
    official_url: 'https://ndeb-bned.ca/',
    official_notification_url: 'https://ndeb-bned.ca/equivalency-process/assessment-of-clinical-judgement-acj/',
    official_syllabus_url: 'https://ndeb-bned.ca/equivalency-process/acj-protocol/',
    exam_type: 'Assessment',
    level: 'National',
    mode: 'Computer-Based Case Test',
    duration: '5.5 Hours (Two Sessions)',
    total_marks: 100,
    negative_marking: 'Partial credit and penalty for false choices on multi-select questions',
    passing_criteria: 'Scaled score of 75 or higher',
    eligibility: 'Must pass NDEB AFK examination.',
    attempt_rules: 'Maximum 3 attempts permitted.',
    selection_process: 'CBT examination administered at Prometric centers in Canada.',
    stages: ['Session 1: Radiograph & Image Interpretation', 'Session 2: Clinical Cases & Treatment Planning'],
    papers: ['ACJ Radiographic Diagnosis', 'ACJ Clinical Case Management'],
    languages: ['English', 'French'],
    aliases: ['NDEB ACJ', 'ACJ Exam', 'Assessment of Clinical Judgement', 'NDEB Clinical Judgement'],
    subjects: [
      {
        name: 'Radiographic Interpretation & Diagnosis',
        official_name: 'Radiology & Lesion Identification',
        description: 'Identifying dental caries, bone loss, radiolucencies, radiopacities, and anatomical variations.',
        weight: 50,
        topics: [
          'Radiographic Caries & Periodontal Assessment',
          'Maxillofacial Radiolucent & Radiopaque Lesions',
        ],
      },
      {
        name: 'Diagnosis, Prognosis & Treatment Planning',
        official_name: 'Comprehensive Dental Treatment Planning',
        description: 'Evaluating clinical patient cases, formulating sequenced treatment plans, and emergency management.',
        weight: 50,
        topics: [
          'Clinical Case Treatment Planning & Sequencing',
          'Management of Dental Emergencies & Complications',
        ],
      },
    ],
  },

  // 9. NDEB Virtual OSCE
  {
    slug: 'ndeb-virtual-osce',
    name: 'NDEB Virtual OSCE (NVO)',
    short_name: 'NDEB Virtual OSCE',
    authority_code: 'NDEB',
    category_id: CATEGORIES.DENTISTRY,
    description: 'The NDEB Virtual OSCE is a computer-based examination assessing clinical judgment, ethical reasoning, prescription writing, and problem-solving skills required for dental practice in Canada.',
    difficulty: 'Expert',
    question_count: 50,
    time_limit_mins: 210,
    is_featured: false,
    official_url: 'https://ndeb-bned.ca/',
    official_notification_url: 'https://ndeb-bned.ca/equivalency-process/virtual-osce/',
    official_syllabus_url: 'https://ndeb-bned.ca/equivalency-process/virtual-osce-blueprint/',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Computer-Based Virtual OSCE',
    duration: '3.5 Hours',
    total_marks: 100,
    negative_marking: 'No negative marking',
    passing_criteria: 'Scaled score of 75 or higher',
    eligibility: 'Graduates of accredited Canadian/US dental programs or candidates completing NDEB equivalency process.',
    attempt_rules: 'Maximum 3 attempts allowed.',
    selection_process: 'CBT virtual OSCE delivered at Prometric test centers.',
    stages: ['Single Computer-Based Virtual OSCE Session'],
    papers: ['50 Virtual OSCE Case Stations'],
    languages: ['English', 'French'],
    aliases: ['NDEB Virtual OSCE', 'NDEB OSCE', 'NDEB NVO', 'Virtual OSCE Dental Canada'],
    subjects: [
      {
        name: 'Clinical Problem Solving & Therapeutics',
        official_name: 'Clinical Therapeutics & Case Management',
        description: 'Drug prescribing, infection control, medical emergency protocols, and patient management.',
        weight: 60,
        topics: [
          'Prescription Writing & Clinical Therapeutics in Dentistry',
          'Infection Control & Medical Emergency Protocols',
        ],
      },
      {
        name: 'Ethics, Communication & Consent',
        official_name: 'Ethics, Practice Management & Communication',
        description: 'Informed consent, professional ethics, record keeping, and patient communication.',
        weight: 40,
        topics: [
          'Informed Consent, Ethics & Legal Practice in Dentistry',
          'Professional Patient Communication & Record Keeping',
        ],
      },
    ],
  },

  // 10. NCA Law Examinations
  {
    slug: 'nca-law-examinations',
    name: 'NCA Law Examinations (National Committee on Accreditation)',
    short_name: 'NCA Law Exam',
    authority_code: 'NCA_FLSC',
    category_id: CATEGORIES.LAW,
    description: 'The NCA Examinations assess international law graduates and lawyers for equivalency to a Canadian common law degree. The core required subjects include Administrative Law, Constitutional Law, Criminal Law, Professional Responsibility, and Foundations of Canadian Law.',
    difficulty: 'Hard',
    question_count: 5,
    time_limit_mins: 180,
    is_featured: true,
    official_url: 'https://nca.gov.on.ca/',
    official_notification_url: 'https://nca.gov.on.ca/nca-exam-schedules/',
    official_syllabus_url: 'https://nca.gov.on.ca/nca-exam-syllabi/',
    exam_type: 'Assessment',
    level: 'National',
    mode: 'Open-Book Online Exam',
    duration: '3 Hours per Subject Exam',
    total_marks: 100,
    negative_marking: 'No negative marking',
    passing_criteria: '50% passing grade per subject exam',
    eligibility: 'Law degree from an international university evaluated by the National Committee on Accreditation.',
    attempt_rules: 'Maximum 3 attempts per subject without special permission.',
    selection_process: 'Online proctored open-book essay/problem-solving examinations.',
    stages: ['Core Subject Examinations (Canadian Administrative, Constitutional, Criminal, Professional Responsibility, Foundations)'],
    papers: ['Individual 3-Hour Subject Papers'],
    languages: ['English', 'French'],
    aliases: ['NCA Exam', 'NCA Law', 'National Committee on Accreditation Exam', 'Canadian NCA Exam'],
    subjects: [
      {
        name: 'Canadian Constitutional & Administrative Law',
        official_name: 'Constitutional & Administrative Law',
        description: 'Division of powers, Charter of Rights and Freedoms, judicial review, and administrative tribunals.',
        weight: 40,
        topics: [
          'Canadian Charter of Rights and Freedoms & Constitutional Rights',
          'Judicial Review, Procedural Fairness & Administrative Tribunals',
        ],
      },
      {
        name: 'Canadian Criminal Law & Procedure',
        official_name: 'Criminal Law & Charter Safeguards',
        description: 'Criminal liability, mens rea, actus reus, defenses, and Charter search and seizure.',
        weight: 30,
        topics: [
          'Elements of Criminal Offenses, Mens Rea & Actus Reus',
          'Charter Section 8, 9, 10 Rights & Criminal Defenses',
        ],
      },
      {
        name: 'Professional Responsibility & Foundations',
        official_name: 'Ethics, Professional Responsibility & Foundations',
        description: 'Law society code of conduct, fiduciary duties, conflicts of interest, and Canadian legal system.',
        weight: 30,
        topics: [
          'Lawyer Code of Conduct, Fiduciary Duty & Privilege',
          'Foundations of Canadian Law & Indigenous Legal Traditions',
        ],
      },
    ],
  },

  // 11. Law Society of Ontario Licensing Examinations
  {
    slug: 'lso-barrister-solicitor-exams',
    name: 'LSO Licensing Examinations (Ontario Barrister & Solicitor Exams)',
    short_name: 'Ontario Bar Exams (LSO)',
    authority_code: 'LSO',
    category_id: CATEGORIES.LAW,
    description: 'The Law Society of Ontario Barrister and Solicitor Examinations are open-book multiple-choice licensing examinations required for call to the bar in Ontario.',
    difficulty: 'Hard',
    question_count: 160,
    time_limit_mins: 270,
    is_featured: false,
    official_url: 'https://lso.ca/',
    official_notification_url: 'https://lso.ca/becoming-licensed/about-licensing-process/licensing-examinations',
    official_syllabus_url: 'https://lso.ca/becoming-licensed/about-licensing-process/study-materials',
    exam_type: 'Licensing',
    level: 'Provincial (Ontario)',
    mode: 'Open-Book Multiple-Choice Test',
    duration: '4.5 Hours per Exam (Barrister & Solicitor)',
    total_marks: 160,
    negative_marking: 'No negative marking',
    passing_criteria: 'Standard set scaled passing score for each examination',
    eligibility: 'Completion of Canadian JD/LL.B. degree or NCA Certificate of Qualification.',
    attempt_rules: 'Maximum 3 attempts permitted within licensing cycle.',
    selection_process: 'In-person proctored open-book multiple choice examinations.',
    stages: ['Barrister Examination (160 MCQs)', 'Solicitor Examination (160 MCQs)'],
    papers: ['Barrister Exam Paper', 'Solicitor Exam Paper'],
    languages: ['English', 'French'],
    aliases: ['LSO Bar Exam', 'Ontario Bar Examination', 'Barrister and Solicitor Exam Ontario', 'LSO Licensing Exam'],
    subjects: [
      {
        name: 'Barrister Exam Subjects',
        official_name: 'Public Law, Criminal & Civil Litigation',
        description: 'Public law, criminal procedure, family law, civil litigation, and professional responsibility.',
        weight: 50,
        topics: [
          'Civil Litigation, Rules of Civil Procedure & Evidence',
          'Criminal Procedure, Bail, Trial & Sentencing',
          'Family Law, Support & Property Division',
        ],
      },
      {
        name: 'Solicitor Exam Subjects',
        official_name: 'Business Law, Real Estate & Estate Planning',
        description: 'Business law, corporate transactions, real estate law, wills, trusts, and estate administration.',
        weight: 50,
        topics: [
          'Business Organizations, Corporate Law & Commercial Transactions',
          'Real Estate Law, Mortgages & Conveyancing',
          'Wills, Trusts, Estate Administration & Tax',
        ],
      },
    ],
  },

  // 12. CPLED PREP
  {
    slug: 'cpled-prep-bar-admission',
    name: 'CPLED Practice Readiness Education Program (PREP / Bar Admission)',
    short_name: 'CPLED PREP',
    authority_code: 'CPLED',
    category_id: CATEGORIES.LAW,
    description: 'The Practice Readiness Education Program (PREP) is the bar admission program for Western Canadian law societies (Alberta, BC, Manitoba, Saskatchewan) evaluating practical legal skills and competencies.',
    difficulty: 'Hard',
    question_count: 10,
    time_limit_mins: 300,
    is_featured: false,
    official_url: 'https://cpled.ca/',
    official_notification_url: 'https://cpled.ca/prep/schedule/',
    official_syllabus_url: 'https://cpled.ca/prep/program-overview/',
    exam_type: 'Licensing',
    level: 'Regional (Western Canada)',
    mode: 'Competency-Based Portfolio & Capstone',
    duration: '9 Months (Modules + Capstone Evaluation)',
    total_marks: 100,
    negative_marking: 'Rubric rubric-based evaluation',
    passing_criteria: 'Demonstration of entry-level competency across all 5 key practice skills',
    eligibility: 'Canadian LL.B./JD or NCA Certificate of Qualification.',
    attempt_rules: 'Subject to CPLED re-assessment policies.',
    selection_process: 'Online learning modules, simulation exercises, and final Capstone assessment.',
    stages: ['Foundation Modules', 'Practice Week Simulations', 'Capstone Assessment'],
    papers: ['Capstone Performance Evaluation'],
    languages: ['English'],
    aliases: ['CPLED PREP', 'CPLED Bar Admission', 'Alberta Bar Exam', 'BC Bar Exam CPLED'],
    subjects: [
      {
        name: 'Legal Drafting & Analysis',
        official_name: 'Drafting, Legal Research & Analysis',
        description: 'Drafting pleadings, contracts, corporate documents, and comprehensive legal research.',
        weight: 50,
        topics: [
          'Contract & Pleading Drafting Standards',
          'Legal Research & Advisory Opinion Writing',
        ],
      },
      {
        name: 'Advocacy, Interviewing & Negotiation',
        official_name: 'Client Care, Advocacy & Negotiation',
        description: 'Client interviewing, advisory communication, negotiation tactics, and oral advocacy.',
        weight: 50,
        topics: [
          'Client Interviewing & Advisory Consultation',
          'Negotiation Strategy & Courtroom Advocacy',
        ],
      },
    ],
  },

  // 13. CPA Canada CFE
  {
    slug: 'cpa-canada-cfe',
    name: 'CPA Common Final Examination (CPA Canada CFE)',
    short_name: 'CPA Canada CFE',
    authority_code: 'CPA_CANADA',
    category_id: CATEGORIES.ACCOUNTING,
    description: 'The CPA Common Final Examination (CFE) is a rigorous 3-day national evaluation assessing technical competency, professional judgment, ethical leadership, and business strategy required for the Canadian CPA designation.',
    difficulty: 'Expert',
    question_count: 3,
    time_limit_mins: 780,
    is_featured: true,
    official_url: 'https://www.cpacanada.ca/',
    official_notification_url: 'https://www.cpacanada.ca/en/become-a-cpa/cpa-certification-program-evaluation/cpa-common-final-examination',
    official_syllabus_url: 'https://www.cpacanada.ca/en/become-a-cpa/cpa-certification-program-evaluation/cpa-competency-map',
    exam_type: 'Professional Certification',
    level: 'National',
    mode: 'Computer-Based Case Test',
    duration: '3 Days (Day 1: 4h, Day 2: 5h, Day 3: 4h)',
    total_marks: 100,
    negative_marking: 'Qualitative competency rubric assessment',
    passing_criteria: 'Demonstrate depth in financial reporting/management accounting and chosen role, plus breadth across all competencies',
    eligibility: 'Completion of CPA Professional Education Program (PEP) or accredited university master’s pathway.',
    attempt_rules: 'Maximum 3 attempts permitted.',
    selection_process: 'Proctored 3-day case-writing examination using secure knotia software.',
    stages: ['Day 1: Comprehensive Case (Capstone 1 Integration)', 'Day 2: Depth & Elective Role Case (Assurance, Tax, PM, Finance)', 'Day 3: Multi-Competency Short Cases'],
    papers: ['Day 1 Case Paper', 'Day 2 Role Paper', 'Day 3 Multi-Case Paper'],
    languages: ['English', 'French'],
    aliases: ['CPA CFE', 'CPA Canada Exam', 'Common Final Examination CPA', 'Canadian CPA Exam'],
    subjects: [
      {
        name: 'Financial Reporting & Assurance',
        official_name: 'Financial Reporting & Audit Competencies',
        description: 'IFRS, ASPE, audit planning, internal controls, risk assessment, and reporting frameworks.',
        weight: 40,
        topics: [
          'IFRS & ASPE Accounting Standards Application',
          'Audit Risk Assessment, Evidence & Assurance Reports',
        ],
      },
      {
        name: 'Management Accounting & Strategy',
        official_name: 'Management Accounting, Strategy & Governance',
        description: 'Costing, budgeting, performance management, strategic decision-making, and risk management.',
        weight: 35,
        topics: [
          'Cost Allocation, Budgeting & Variance Analysis',
          'Strategic Analysis, Governance & Risk Management',
        ],
      },
      {
        name: 'Taxation & Finance',
        official_name: 'Canadian Corporate & Personal Taxation',
        description: 'Canadian Income Tax Act, corporate tax, personal tax planning, GST/HST, and corporate finance.',
        weight: 25,
        topics: [
          'Canadian Corporate & Personal Tax Compliance',
          'Capital Budgeting, Valuation & Corporate Finance',
        ],
      },
    ],
  },

  // 14. CSC Exam (Canadian Securities Course)
  {
    slug: 'canadian-securities-course-csc',
    name: 'Canadian Securities Course (CSC Exam - CSI)',
    short_name: 'CSC Exam',
    authority_code: 'CSI',
    category_id: CATEGORIES.BANKING,
    description: 'The Canadian Securities Course (CSC) is the baseline licensing examination administered by the Canadian Securities Institute, required for financial advisors, investment reps, and wealth management professionals in Canada.',
    difficulty: 'Medium',
    question_count: 200,
    time_limit_mins: 240,
    is_featured: false,
    official_url: 'https://www.csi.ca/',
    official_notification_url: 'https://www.csi.ca/en/learning/courses/csc/',
    official_syllabus_url: 'https://www.csi.ca/en/learning/courses/csc/#curriculum',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '4 Hours (Two 2-Hour Exams)',
    total_marks: 200,
    negative_marking: 'No negative marking',
    passing_criteria: '60% passing mark on each volume exam (Volume 1 & Volume 2)',
    eligibility: 'No prerequisites; open enrollment for financial industry candidates.',
    attempt_rules: 'Candidates have 1 year from enrollment to complete both volume exams.',
    selection_process: 'Computer-based testing via CSI online proctoring or test centers.',
    stages: ['CSC Exam Volume 1 (100 MCQs)', 'CSC Exam Volume 2 (100 MCQs)'],
    papers: ['Volume 1 Paper', 'Volume 2 Paper'],
    languages: ['English', 'French'],
    aliases: ['CSC Exam', 'Canadian Securities Course', 'CSI CSC', 'Canadian Securities Exam'],
    subjects: [
      {
        name: 'Financial Environment & Capital Markets',
        official_name: 'Canadian Financial Marketplace & Economics',
        description: 'Macroeconomics, central banking, financial instruments, fixed income, and equities.',
        weight: 50,
        topics: [
          'Canadian Economy, Monetary Policy & Interest Rates',
          'Fixed Income Securities, Bonds & Yield Curves',
          'Equity Securities, Common Shares & Stock Exchanges',
        ],
      },
      {
        name: 'Managed Products & Portfolio Analysis',
        official_name: 'Mutual Funds, Managed Products & Tax',
        description: 'Mutual funds, ETFs, segregated funds, portfolio management, tax planning, and fee-based accounts.',
        weight: 50,
        topics: [
          'Mutual Funds, ETFs & Alternative Investments',
          'Portfolio Management & Asset Allocation Principles',
          'Canadian Taxation of Investment Returns',
        ],
      },
    ],
  },

  // 15. NPPE (National Professional Practice Examination)
  {
    slug: 'nppe-engineers-canada',
    name: 'National Professional Practice Examination (NPPE Engineers Canada)',
    short_name: 'NPPE Engineering',
    authority_code: 'ENGINEERS_CANADA',
    category_id: CATEGORIES.ENGINEERING,
    description: 'The National Professional Practice Examination (NPPE) evaluates knowledge of Canadian law, professional ethics, liability, contracts, and environmental regulation required for P.Eng. and P.Geo. licensure across Canada.',
    difficulty: 'Medium',
    question_count: 110,
    time_limit_mins: 150,
    is_featured: true,
    official_url: 'https://engineerscanada.ca/',
    official_notification_url: 'https://www.peo.on.ca/licence-applications/nppe-exam',
    official_syllabus_url: 'https://nppe.proctoru.com/syllabus/',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Computer-Based Proctored Test',
    duration: '2.5 Hours',
    total_marks: 100,
    negative_marking: 'No negative marking',
    passing_criteria: 'Standard set scaled score of 65 or higher',
    eligibility: 'Engineering/geoscience graduate registered with a provincial engineering regulator (PEO, EGBC, APEGA, etc.).',
    attempt_rules: 'Subject to provincial regulator limits (usually up to 3-4 attempts).',
    selection_process: 'Online proctored computer examination.',
    stages: ['110 Multiple Choice Questions (100 scored, 10 unscored pilot questions)'],
    papers: ['NPPE CBT Paper'],
    languages: ['English', 'French'],
    aliases: ['NPPE Exam', 'NPPE', 'National Professional Practice Exam', 'PEO Ethics Exam', 'APEGA Ethics Exam'],
    subjects: [
      {
        name: 'Professionalism & Ethics',
        official_name: 'Engineering Professionalism & Codes of Ethics',
        description: 'Provincial acts, duty to society, whistleblowing, conflicts of interest, and professional misconduct.',
        weight: 35,
        topics: [
          'Provincial Engineering Acts & Regulatory Scope',
          'Code of Ethics & Duty to Public Safety',
          'Conflicts of Interest & Professional Misconduct',
        ],
      },
      {
        name: 'Canadian Legal System & Tort Law',
        official_name: 'Canadian Law, Torts & Liability',
        description: 'Court systems, tort law, duty of care, negligence, limitation periods, and strict liability.',
        weight: 25,
        topics: [
          'Principles of Canadian Tort Law & Negligence',
          'Duty of Care, Professional Liability & Limitation Periods',
        ],
      },
      {
        name: 'Contracts & Intellectual Property',
        official_name: 'Contract Law, IP & Construction Contracts',
        description: 'Contract formation, breach, remedies, tendering, patents, trademarks, and copyright.',
        weight: 25,
        topics: [
          'Contract Formation, Consideration & Discharge',
          'Tendering Law, Bidding Disputes & Construction Contracts',
          'Intellectual Property, Patents & Trademarks in Engineering',
        ],
      },
      {
        name: 'Health, Safety & Environment',
        official_name: 'Occupational Health, Safety & Environmental Law',
        description: 'OHS legislation, environmental assessment, climate responsibility, and Indigenous consultation.',
        weight: 15,
        topics: [
          'Occupational Health & Safety Legislation in Canada',
          'Environmental Regulations & Indigenous Consultation',
        ],
      },
    ],
  },

  // 16. MCAT
  {
    slug: 'mcat-aamc',
    name: 'MCAT (Medical College Admission Test - AAMC)',
    short_name: 'MCAT',
    authority_code: 'AAMC',
    category_id: CATEGORIES.UNIVERSITY_ENTRANCE,
    description: 'The Medical College Admission Test (MCAT) is a standardized, multiple-choice examination assessing problem solving, critical thinking, and knowledge of natural, behavioral, and social science concepts required for admission to Canadian medical schools.',
    difficulty: 'Expert',
    question_count: 230,
    time_limit_mins: 375,
    is_featured: true,
    official_url: 'https://students-residents.aamc.org/preparing-med-school/mcat-exam',
    official_notification_url: 'https://students-residents.aamc.org/register-mcat-exam/mcat-testing-calendar-and-score-release-dates',
    official_syllabus_url: 'https://students-residents.aamc.org/prepare-mcat-exam/whats-mcat-exam',
    exam_type: 'Entrance',
    level: 'International',
    mode: 'Computer-Based Test (CBT)',
    duration: '6.25 Hours',
    total_marks: 528,
    negative_marking: 'No negative marking',
    passing_criteria: 'Scaled score ranging from 472 to 528 (competitive score 510+)',
    eligibility: 'Students preparing to apply to allopathic or osteopathic medical schools.',
    attempt_rules: '3 times per testing year, 4 times over two consecutive years, 7 times lifetime maximum.',
    selection_process: 'CBT examination administered at Pearson VUE test centers across Canada.',
    stages: ['Biological & Biochemical Foundations', 'Chemical & Physical Foundations', 'Psychological, Social & Biological Foundations', 'Critical Analysis & Reasoning Skills (CARS)'],
    papers: ['MCAT 4 Section Computer Exam'],
    languages: ['English'],
    aliases: ['MCAT', 'Medical College Admission Test', 'MCAT Exam', 'MCAT Canada'],
    subjects: [
      {
        name: 'Biological & Biochemical Foundations of Living Systems',
        official_name: 'Bio/Biochem Section',
        description: 'Biochemistry, cell biology, genetics, molecular biology, and organ systems physiology.',
        weight: 25,
        topics: [
          'Biomolecules, Enzyme Kinetics & Metabolic Pathways',
          'Genetics, Molecular Biology & Recombinant DNA',
          'Organ Systems Physiology & Cellular Homeostasis',
        ],
      },
      {
        name: 'Chemical & Physical Foundations of Biological Systems',
        official_name: 'Chem/Phys Section',
        description: 'General chemistry, organic chemistry, physics, electrochemistry, and thermodynamics.',
        weight: 25,
        topics: [
          'General & Organic Chemistry Reactions & Mechanisms',
          'Physics Principles, Fluid Dynamics & Thermodynamics',
        ],
      },
      {
        name: 'Critical Analysis & Reasoning Skills (CARS)',
        official_name: 'CARS Section',
        description: 'Reading comprehension, passage reasoning, logic, humanities, and social science analysis.',
        weight: 25,
        topics: [
          'Humanities & Social Sciences Passage Analysis',
          'Argument Evaluation & Inference Reasoning',
        ],
      },
      {
        name: 'Psychological, Social, and Biological Foundations of Behavior',
        official_name: 'Psych/Soc Section',
        description: 'Psychology, sociology, behavioral neuroscience, and social determinants of health.',
        weight: 25,
        topics: [
          'Psychology, Perception & Behavioral Neuroscience',
          'Sociology, Social Structures & Determinants of Health',
        ],
      },
    ],
  },

  // 17. LSAT
  {
    slug: 'lsat-lsac',
    name: 'LSAT (Law School Admission Test - LSAC)',
    short_name: 'LSAT',
    authority_code: 'LSAC',
    category_id: CATEGORIES.UNIVERSITY_ENTRANCE,
    description: 'The Law School Admission Test (LSAT) is a standardized test assessing reading comprehension, logical reasoning, and analytical skills essential for success at Canadian law schools.',
    difficulty: 'Hard',
    question_count: 75,
    time_limit_mins: 140,
    is_featured: true,
    official_url: 'https://www.lsac.org/lsat',
    official_notification_url: 'https://www.lsac.org/lsat/lsat-dates-deadlines-score-release-dates',
    official_syllabus_url: 'https://www.lsac.org/lsat/prep',
    exam_type: 'Entrance',
    level: 'International',
    mode: 'Computer-Based Online/Test Center',
    duration: '2.5 Hours',
    total_marks: 180,
    negative_marking: 'No negative marking',
    passing_criteria: 'Scaled score ranging from 120 to 180 (competitive score 160+)',
    eligibility: 'Undergraduate students or degree holders applying to law school.',
    attempt_rules: '3 times in a single testing year, 5 times within 5 current testing years, 7 times lifetime.',
    selection_process: 'Computer-administered test at Prometric test centers or online remote proctoring.',
    stages: ['Logical Reasoning (2 Sections)', 'Reading Comprehension (1 Section)', 'LSAT Argumentative Writing'],
    papers: ['LSAT 3 Scored Multiple Choice Sections + Writing'],
    languages: ['English'],
    aliases: ['LSAT', 'Law School Admission Test', 'LSAT Exam', 'LSAT Canada'],
    subjects: [
      {
        name: 'Logical Reasoning',
        official_name: 'Logical Reasoning Sections',
        description: 'Analyzing arguments, identifying assumptions, flawed logic, strengthening/weakening claims.',
        weight: 66,
        topics: [
          'Argument Structure, Premise & Conclusion Identification',
          'Flaws in Reasoning, Assumptions & Formal Logic',
        ],
      },
      {
        name: 'Reading Comprehension',
        official_name: 'Reading Comprehension Section',
        description: 'Complex dense passage analysis in law, humanities, sciences, and comparative passages.',
        weight: 34,
        topics: [
          'Passage Main Idea, Inference & Author Attitude Analysis',
          'Comparative Reading & Dual Passage Evaluation',
        ],
      },
    ],
  },

  // 18. Casper Assessment
  {
    slug: 'casper-acuity-insights',
    name: 'Casper Test (Acuity Insights Situational Judgment Test)',
    short_name: 'Casper Test',
    authority_code: 'ACUITY_INSIGHTS',
    category_id: CATEGORIES.UNIVERSITY_ENTRANCE,
    description: 'The Casper Test is an online situational judgment test evaluating key non-academic competencies (ethics, empathy, equity, resilience, communication) required for admission to Canadian medicine, nursing, dentistry, and professional programs.',
    difficulty: 'Medium',
    question_count: 14,
    time_limit_mins: 110,
    is_featured: false,
    official_url: 'https://acuityinsights.app/casper/',
    official_notification_url: 'https://acuityinsights.app/dates-and-fees/',
    official_syllabus_url: 'https://acuityinsights.app/test-structure/',
    exam_type: 'Entrance',
    level: 'National',
    mode: 'Online Video & Typed Test',
    duration: '1.8 Hours',
    total_marks: 100,
    negative_marking: 'Qualitative quartile score reporting (Q1, Q2, Q3, Q4)',
    passing_criteria: 'Quartile score reported directly to academic institutions',
    eligibility: 'Applicants to Canadian medical, nursing, health sciences, and education programs.',
    attempt_rules: 'Once per admissions cycle per program category.',
    selection_process: 'Online proctored computer test with webcam video responses and typed responses.',
    stages: ['Video Response Section (4 Scenarios)', 'Typed Response Section (10 Scenarios)'],
    papers: ['14 Scenario Situational Judgment Modules'],
    languages: ['English', 'French'],
    aliases: ['Casper Test', 'Casper Exam', 'Altus Casper', 'Acuity Insights Casper', 'Casper Canada'],
    subjects: [
      {
        name: 'Ethics, Empathy & Equity',
        official_name: 'Ethical Reasoning & Interpersonal Skills',
        description: 'Resolving ethical dilemmas, demonstrating empathy, promoting equity, diversity, and inclusion.',
        weight: 50,
        topics: [
          'Ethical Decision Making & Conflict Resolution',
          'Empathy, Perspective Taking & Equity',
        ],
      },
      {
        name: 'Communication & Professional Resilience',
        official_name: 'Communication, Problem Solving & Resilience',
        description: 'Constructive feedback, composure under pressure, and professional boundary management.',
        weight: 50,
        topics: [
          'Effective Interpersonal Communication & Feedback',
          'Stress Resilience, Problem Solving & Self-Awareness',
        ],
      },
    ],
  },

  // 19. CELPIP-General
  {
    slug: 'celpip-general',
    name: 'CELPIP-General (Canadian English Language Proficiency Index Program)',
    short_name: 'CELPIP-General',
    authority_code: 'PARAGON',
    category_id: CATEGORIES.LANGUAGE,
    description: 'CELPIP-General is the designated English language proficiency test approved by IRCC for Canadian permanent residency (Express Entry) and citizenship, featuring 100% Canadian accents and context.',
    difficulty: 'Medium',
    question_count: 40,
    time_limit_mins: 180,
    is_featured: true,
    official_url: 'https://www.celpip.ca/',
    official_notification_url: 'https://www.celpip.ca/test-dates-locations/',
    official_syllabus_url: 'https://www.celpip.ca/prepare-for-celpip/',
    exam_type: 'Language Proficiency',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '3 Hours (Single Sitting)',
    total_marks: 12,
    negative_marking: 'No negative marking',
    passing_criteria: 'CLB (Canadian Language Benchmark) levels 1 through 12',
    eligibility: 'Candidates applying for Canadian immigration, PR, or professional licensing.',
    attempt_rules: 'Candidates may retake after 30 days.',
    selection_process: 'Fully computer-delivered test including headset microphone speaking component.',
    stages: ['Listening (47-55 mins)', 'Reading (55-60 mins)', 'Writing (53-60 mins)', 'Speaking (15-20 mins)'],
    papers: ['CELPIP 4-Skills Single Session CBT'],
    languages: ['English'],
    aliases: ['CELPIP', 'CELPIP General', 'CELPIP Exam', 'CELPIP Canada'],
    subjects: [
      {
        name: 'Listening & Reading Components',
        official_name: 'Receptive Skills (Listening & Reading)',
        description: 'Understanding Canadian English conversations, news, instructions, diagrams, and opinion texts.',
        weight: 50,
        topics: [
          'Canadian Workplace Conversations & Information Retrieval',
          'Reading Diagrams, News Articles & Opinion Analysis',
        ],
      },
      {
        name: 'Writing & Speaking Components',
        official_name: 'Productive Skills (Writing & Speaking)',
        description: 'Writing formal/informal emails, responding to survey questions, describing images, and expressing opinions.',
        weight: 50,
        topics: [
          'Task 1 Email Writing & Task 2 Survey Response Writing',
          'Task 1-8 Spoken English Tasks & Scene Descriptions',
        ],
      },
    ],
  },

  // 20. PTE Core
  {
    slug: 'pte-core',
    name: 'PTE Core (Pearson Test of English Core)',
    short_name: 'PTE Core',
    authority_code: 'PEARSON_VUE',
    category_id: CATEGORIES.LANGUAGE,
    description: 'PTE Core is a computer-based English test approved by Immigration, Refugees and Citizenship Canada (IRCC) for economic immigration streams (Express Entry, Provincial Nominees).',
    difficulty: 'Medium',
    question_count: 50,
    time_limit_mins: 120,
    is_featured: false,
    official_url: 'https://www.pearsonpte.com/pte-core',
    official_notification_url: 'https://www.pearsonpte.com/pte-core/book-pte-core',
    official_syllabus_url: 'https://www.pearsonpte.com/pte-core/preparation',
    exam_type: 'Language Proficiency',
    level: 'International',
    mode: 'Computer-Based Test (AI Scored)',
    duration: '2 Hours',
    total_marks: 90,
    negative_marking: 'No negative marking',
    passing_criteria: 'Overall score 10-90 mapped to Canadian Language Benchmarks (CLB)',
    eligibility: 'Applicants for Canadian economic immigration and work permits.',
    attempt_rules: 'Candidates may rebook as soon as test scores are received.',
    selection_process: 'Fully automated AI-scored computer test at Pearson VUE centers.',
    stages: ['Part 1: Speaking & Writing (50 mins)', 'Part 2: Reading (30 mins)', 'Part 3: Listening (30 mins)'],
    papers: ['PTE Core Integrated CBT Paper'],
    languages: ['English'],
    aliases: ['PTE Core', 'PTE Core Canada', 'Pearson PTE Core', 'PTE Canada Immigration'],
    subjects: [
      {
        name: 'Speaking & Writing',
        official_name: 'PTE Core Speaking & Writing',
        description: 'Read aloud, repeat sentence, describe image, respond to situation, summarize text, write email.',
        weight: 50,
        topics: [
          'Read Aloud, Repeat Sentence & Situation Response',
          'Summarize Written Text & Business Email Writing',
        ],
      },
      {
        name: 'Reading & Listening',
        official_name: 'PTE Core Reading & Listening',
        description: 'Multiple choice, re-order paragraphs, fill in blanks, summarize spoken text, write from dictation.',
        weight: 50,
        topics: [
          'Fill in Blanks & Paragraph Re-ordering',
          'Summarize Spoken Text & Write from Dictation',
        ],
      },
    ],
  },

  // 21. TEF Canada
  {
    slug: 'tef-canada',
    name: 'TEF Canada (Test d’Évaluation de Français pour le Canada)',
    short_name: 'TEF Canada',
    authority_code: 'LE_FRANCAIS_DES_AFFAIRES',
    category_id: CATEGORIES.LANGUAGE,
    description: 'TEF Canada is the official French language evaluation recognized by IRCC and the Government of Canada for Express Entry, Provincial Nominee Programs, and Canadian citizenship.',
    difficulty: 'Hard',
    question_count: 100,
    time_limit_mins: 170,
    is_featured: false,
    official_url: 'https://www.lefrancaisdesaffaires.fr/',
    official_notification_url: 'https://www.lefrancaisdesaffaires.fr/tests-diplomes/test-evaluation-francais-tef/tef-canada/',
    official_syllabus_url: 'https://www.lefrancaisdesaffaires.fr/tests-diplomes/test-evaluation-francais-tef/epreuves/',
    exam_type: 'Language Proficiency',
    level: 'International',
    mode: 'Computer-Based Test (e-TEF)',
    duration: '2.8 Hours',
    total_marks: 699,
    negative_marking: 'No negative marking',
    passing_criteria: 'NCLC (Niveaux de compétence linguistique canadiens) levels 1-12',
    eligibility: 'Candidates seeking Canadian PR, Express Entry French points, or citizenship.',
    attempt_rules: '30-day waiting period between tests.',
    selection_process: 'Computer-based testing at certified e-TEF test centers worldwide.',
    stages: ['Compréhension écrite (60 mins)', 'Compréhension orale (40 mins)', 'Expression écrite (60 mins)', 'Expression orale (15 mins)'],
    papers: ['e-TEF Canada 4 Modules'],
    languages: ['French'],
    aliases: ['TEF Canada', 'TEF Exam', 'TEF Express Entry', 'Test d Evaluation de Francais Canada'],
    subjects: [
      {
        name: 'Compréhension écrite et orale',
        official_name: 'Épreuves réceptives (Écrit et Oral)',
        description: 'Compréhension de documents, lettres, articles, messages sonores et conversations.',
        weight: 50,
        topics: [
          'Compréhension Écrite & Documents Administratifs',
          'Compréhension Orale & Messages Sonores',
        ],
      },
      {
        name: 'Expression écrite et orale',
        official_name: 'Épreuves expressives (Écrit et Oral)',
        description: 'Rédaction d’articles, lettres d’opinion, argumentation orale et obtention d’informations.',
        weight: 50,
        topics: [
          'Section A & B Expression Écrite (Faits divers & Argumentation)',
          'Section A & B Expression Orale (Obtention d’information & Persuasion)',
        ],
      },
    ],
  },

  // 22. TCF Canada
  {
    slug: 'tcf-canada',
    name: 'TCF Canada (Test de Connaissance du Français pour le Canada)',
    short_name: 'TCF Canada',
    authority_code: 'FEI',
    category_id: CATEGORIES.LANGUAGE,
    description: 'TCF Canada is an official French language test standard administered by France Éducation international, recognized by IRCC for Canadian immigration and citizenship.',
    difficulty: 'Hard',
    question_count: 78,
    time_limit_mins: 162,
    is_featured: false,
    official_url: 'https://www.france-education-international.fr/',
    official_notification_url: 'https://www.france-education-international.fr/test/tcf-canada',
    official_syllabus_url: 'https://www.france-education-international.fr/test/tcf-canada?langue=fr#epreuves',
    exam_type: 'Language Proficiency',
    level: 'International',
    mode: 'Computer-Based Test (TCF SO)',
    duration: '2.7 Hours',
    total_marks: 699,
    negative_marking: 'No negative marking',
    passing_criteria: 'NCLC 1-12 mapped score breakdown',
    eligibility: 'Applicants for Canadian permanent residence or citizenship.',
    attempt_rules: '30-day waiting period between sessions.',
    selection_process: 'CBT examination administered at approved France Éducation centers.',
    stages: ['Compréhension orale (35 mins)', 'Compréhension écrite (60 mins)', 'Expression écrite (60 mins)', 'Expression orale (12 mins)'],
    papers: ['TCF Canada 4 Mandatory Tests'],
    languages: ['French'],
    aliases: ['TCF Canada', 'TCF Exam', 'TCF Express Entry', 'Test de Connaissance du Francais Canada'],
    subjects: [
      {
        name: 'Compréhension orale et écrite',
        official_name: 'Compréhension Orale & Écrite',
        description: 'Écoute de documents audio, lecture d’articles de presse et textes informatifs.',
        weight: 50,
        topics: [
          'Listening Comprehension Audio Analysis',
          'Reading Comprehension & Textual Inference',
        ],
      },
      {
        name: 'Expression écrite et orale',
        official_name: 'Expression Écrite & Orale',
        description: 'Rédaction de messages, comptes rendus et entretiens d’expression orale.',
        weight: 50,
        topics: [
          '3 Tâches d’Expression Écrite',
          '3 Tâches d’Expression Orale avec Évaluateur',
        ],
      },
    ],
  },

  // 23. REx-PN / CPNRE
  {
    slug: 'rex-pn-cpnre',
    name: 'REx-PN / CPNRE (Regulatory Exam for Practical Nurses / CPNRE)',
    short_name: 'REx-PN / CPNRE',
    authority_code: 'CNO_BCCNM',
    category_id: CATEGORIES.NURSING,
    description: 'The REx-PN (Regulatory Exam for Practical Nurses) and CPNRE are entry-to-practice computerized adaptive nursing examinations evaluating the competence and safety of Registered Practical Nurses (RPNs/LPNs) in Canada.',
    difficulty: 'Medium',
    question_count: 150,
    time_limit_mins: 240,
    is_featured: false,
    official_url: 'https://www.cno.org/',
    official_notification_url: 'https://www.rexpn.com/',
    official_syllabus_url: 'https://www.rexpn.com/test-plan.page',
    exam_type: 'Licensing',
    level: 'Provincial / National',
    mode: 'Computerized Adaptive Test (CAT)',
    duration: '4 Hours',
    total_marks: 150,
    negative_marking: 'Psychometric CAT scoring',
    passing_criteria: 'Computerized adaptive pass standard determined by NCSBN/CNO',
    eligibility: 'Graduate of an approved Practical Nursing program in Canada or equivalent.',
    attempt_rules: 'Unlimited attempts permitted in Ontario; subject to provincial board rules.',
    selection_process: 'CAT examination administered at Pearson VUE test centers.',
    stages: ['Computerized Adaptive Testing (90 to 150 Questions)'],
    papers: ['REx-PN / CPNRE CAT Examination'],
    languages: ['English', 'French'],
    aliases: ['REx-PN', 'CPNRE', 'Practical Nurse Exam Canada', 'RPN Exam Ontario', 'LPN Exam Canada'],
    subjects: [
      {
        name: 'Safe & Effective Care Environment',
        official_name: 'Management of Care & Safety',
        description: 'Safety, infection control, legal responsibilities, client advocacy, and ethical care.',
        weight: 30,
        topics: [
          'Infection Control, Universal Precautions & Client Safety',
          'Delegation, Legal Nursing Scope & Client Advocacy',
        ],
      },
      {
        name: 'Physiological & Psychosocial Integrity',
        official_name: 'Clinical Nursing Care & Psychosocial Support',
        description: 'Pharmacology, basic care, comfort, reduction of risk potential, and mental health nursing.',
        weight: 70,
        topics: [
          'Pharmacological Therapies & Safe Medication Administration',
          'Physiological Adaptation, Care & Pathophysiology',
          'Psychosocial Integrity & Mental Health Interventions',
        ],
      },
    ],
  },

  // 24. OCT Mathematics Proficiency Test
  {
    slug: 'oct-math-proficiency-test',
    name: 'OCT Mathematics Proficiency Test (Ontario Teacher Certification)',
    short_name: 'OCT Math Test',
    authority_code: 'OCT',
    category_id: CATEGORIES.EDUCATION,
    description: 'The Mathematics Proficiency Test (MPT) administered for Ontario College of Teachers certification assesses fundamental mathematical concepts, curriculum standards, and pedagogical approaches for educators.',
    difficulty: 'Medium',
    question_count: 70,
    time_limit_mins: 180,
    is_featured: false,
    official_url: 'https://www.oct.ca/',
    official_notification_url: 'https://www.mathproficiencytest.ca/',
    official_syllabus_url: 'https://www.mathproficiencytest.ca/blueprint.html',
    exam_type: 'Licensing',
    level: 'Provincial (Ontario)',
    mode: 'Computer-Based Test (CBT)',
    duration: '3 Hours',
    total_marks: 100,
    negative_marking: 'No negative marking',
    passing_criteria: '70% overall minimum passing score',
    eligibility: 'Applicants for Ontario teaching certification.',
    attempt_rules: 'Multiple retakes allowed.',
    selection_process: 'CBT examination delivered at designated test centers or online proctoring.',
    stages: ['Mathematics Content (70%)', 'Pedagogical Content Knowledge (30%)'],
    papers: ['OCT MPT Computer Exam'],
    languages: ['English', 'French'],
    aliases: ['OCT Math Test', 'OCT MPT', 'Ontario Math Proficiency Test', 'Ontario Teacher Math Exam'],
    subjects: [
      {
        name: 'Mathematical Knowledge & Numeracy',
        official_name: 'Core Mathematics Content',
        description: 'Number sense, fractions, ratios, algebra, geometry, measurement, data management, and probability.',
        weight: 70,
        topics: [
          'Number Sense, Operations, Ratios & Percentages',
          'Linear Relations, Algebra & Measurement Geometry',
        ],
      },
      {
        name: 'Pedagogy & Curriculum Application',
        official_name: 'Pedagogical Content Knowledge',
        description: 'Ontario curriculum expectations, assessment for learning, and mathematics teaching strategies.',
        weight: 30,
        topics: [
          'Ontario Mathematics Curriculum Expectations',
          'Diagnostic Assessment & Pedagogical Problem Solving',
        ],
      },
    ],
  },

  // 25. CAMRT Radiography & Radiation Therapy Certification
  {
    slug: 'camrt-certification-exam',
    name: 'CAMRT Certification Examination (Medical Radiation Technology)',
    short_name: 'CAMRT Certification',
    authority_code: 'CAMRT',
    category_id: CATEGORIES.NURSING,
    description: 'The CAMRT Certification Examination is the national competency exam for medical radiation technologists (Radiography, Radiation Therapy, Nuclear Medicine, MRI) required for provincial registration and practice in Canada.',
    difficulty: 'Hard',
    question_count: 180,
    time_limit_mins: 240,
    is_featured: false,
    official_url: 'https://www.camrt.ca/',
    official_notification_url: 'https://www.camrt.ca/certification-2/examinations/',
    official_syllabus_url: 'https://www.camrt.ca/certification-2/examinations/exam-profiles/',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Computer-Based Test (CBT)',
    duration: '4 Hours',
    total_marks: 180,
    negative_marking: 'No negative marking',
    passing_criteria: 'Criterion-referenced passing score established by CAMRT Angoff panel',
    eligibility: 'Graduates of CAMRT-accredited medical radiation technology programs.',
    attempt_rules: 'Maximum 4 attempts allowed.',
    selection_process: 'Computer-based exam delivered via Meazure Learning test centers.',
    stages: ['180 Multiple Choice Questions'],
    papers: ['CAMRT National Certification Paper'],
    languages: ['English', 'French'],
    aliases: ['CAMRT Exam', 'CAMRT Certification', 'Canadian Radiography Exam', 'MRT Exam Canada'],
    subjects: [
      {
        name: 'Patient Management & Safety',
        official_name: 'Patient Care & Radiation Protection',
        description: 'Patient care, contrast safety, radiation protection, ALARA protocols, and quality assurance.',
        weight: 40,
        topics: [
          'Patient Assessment, Care & Contrast Media Safety',
          'Radiation Protection, ALARA Protocols & Dosimetry',
        ],
      },
      {
        name: 'Imaging Physics & Clinical Procedures',
        official_name: 'Radiographic Procedures & Imaging Physics',
        description: 'Anatomical positioning, image acquisition, CT/MRI physics, pathology recognition, and equipment QA.',
        weight: 60,
        topics: [
          'Radiographic Positioning, Anatomy & Image Evaluation',
          'Imaging Equipment Physics, Quality Assurance & Artifacts',
        ],
      },
    ],
  },
];

async function seedCanadaCatalog() {
  console.log('=== STARTING CANADA COMPREHENSIVE CATALOG INGESTION ===\n');

  // 1. Ensure/Load Canada Authorities
  console.log(`Processing ${AUTHORITIES.length} Canadian Authorities...`);
  const authorityIdMap = {};

  for (const auth of AUTHORITIES) {
    let { data: existing } = await supabase
      .from('exam_authorities')
      .select('id')
      .eq('slug', auth.slug)
      .maybeSingle();

    if (!existing) {
      const { data: newAuth, error: authErr } = await supabase
        .from('exam_authorities')
        .insert({
          country_id: CANADA_COUNTRY_ID,
          code: auth.code,
          name: auth.name,
          short_name: auth.short_name,
          slug: auth.slug,
          official_website: auth.official_website,
          description: auth.description,
          verification_status: 'verified',
          source_url: auth.official_website,
          last_verified_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (authErr) {
        console.error(`Error creating authority ${auth.code}:`, authErr);
      } else {
        existing = newAuth;
      }
    }

    if (existing) {
      authorityIdMap[auth.code] = existing.id;
    }
  }

  console.log(`Authorities ready: ${Object.keys(authorityIdMap).length} loaded.\n`);

  // 2. Link Canadian Aliases to Canonical Global Exams
  console.log('Checking Global Exams for Canada reuse...');
  const globalExamAliases = [
    {
      slug: 'nclex-rn',
      aliases: ['NCLEX-RN Canada', 'Canadian Registered Nurse Examination', 'CNO NCLEX-RN', 'BCCNM NCLEX-RN', 'NCLEX Canada'],
    },
    {
      slug: 'gre-general-test',
      aliases: ['GRE Canada', 'GRE Graduate Record Examination Canada'],
    },
    {
      slug: 'gmat-focus-edition',
      aliases: ['GMAT Canada', 'GMAT Examination Canada'],
    },
    {
      slug: 'cfa-level-1',
      aliases: ['CFA Canada', 'Chartered Financial Analyst Canada', 'CFA Level 1 Canada'],
    },
    {
      slug: 'pte-academic',
      aliases: ['PTE Academic Canada'],
    },
    {
      slug: 'ielts-academic',
      aliases: ['IELTS Canada', 'IELTS Academic Canada', 'IELTS General Canada'],
    },
  ];

  for (const item of globalExamAliases) {
    const { data: globalExam } = await supabase
      .from('exams')
      .select('id, name')
      .eq('slug', item.slug)
      .maybeSingle();

    if (globalExam) {
      console.log(`+ Found global exam [${globalExam.name}] (ID: ${globalExam.id}). Adding Canadian aliases...`);

      for (const alias of item.aliases) {
        const { data: existingAlias } = await supabase
          .from('exam_aliases')
          .select('id')
          .eq('exam_id', globalExam.id)
          .ilike('alias', alias)
          .maybeSingle();

        if (!existingAlias) {
          await supabase.from('exam_aliases').insert({
            exam_id: globalExam.id,
            alias: alias,
          });
        }
      }
    }
  }

  // 3. Ingest Canada Specific Exams
  console.log(`\nIngesting ${CANADA_EXAMS.length} Canadian Exams...`);

  for (const examData of CANADA_EXAMS) {
    console.log(`Processing exam: ${examData.slug}...`);
    const authorityId = authorityIdMap[examData.authority_code] || null;

    // Check if exam already exists
    let { data: existingExam } = await supabase
      .from('exams')
      .select('id')
      .eq('slug', examData.slug)
      .maybeSingle();

    let examId;

    const mappedDifficulty = {
      'Hard': 'Advanced',
      'Medium': 'Intermediate',
      'Easy': 'Intermediate',
      'Expert': 'Expert',
      'Advanced': 'Advanced',
      'Intermediate': 'Intermediate'
    }[examData.difficulty] || 'Advanced';

    if (!existingExam) {
      const { data: newExam, error: examErr } = await supabase
        .from('exams')
        .insert({
          country_id: CANADA_COUNTRY_ID,
          authority_id: authorityId,
          category_id: examData.category_id,
          name: examData.name,
          short_name: examData.short_name,
          slug: examData.slug,
          description: examData.description,
          difficulty: mappedDifficulty,
          question_count: examData.question_count,
          time_limit_mins: examData.time_limit_mins,
          is_featured: examData.is_featured,
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
          status: 'active',
          verification_status: 'verified',
          last_verified_at: new Date().toISOString(),
          next_verification_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          source_url: examData.official_url,
          current_version: '2026',
          version_year: 2026,
          is_current: true,
        })
        .select('id')
        .single();

      if (examErr) {
        console.error(`Error creating exam ${examData.slug}:`, examErr);
        continue;
      }
      examId = newExam.id;
      console.log(`+ Ingested new exam: ${examData.slug} (ID: ${examId})`);
    } else {
      examId = existingExam.id;
      // Update authority_id if it was null
      if (authorityId) {
        await supabase
          .from('exams')
          .update({ authority_id: authorityId })
          .eq('id', examId);
      }
    }

    // Exam Version (2026)
    const { data: existingVer } = await supabase
      .from('exam_versions')
      .select('id')
      .eq('exam_id', examId)
      .eq('version_year', 2026)
      .maybeSingle();

    if (!existingVer) {
      const { error: verErr } = await supabase.from('exam_versions').insert({
        exam_id: examId,
        version_year: 2026,
        is_current: true,
        official_notification_url: examData.official_notification_url,
        official_syllabus_url: examData.official_syllabus_url,
        stages: examData.stages,
        papers: examData.papers,
        pattern_summary: `${examData.mode} - ${examData.duration} - ${examData.question_count} questions`,
        source_url: examData.official_url || 'https://mcc.ca',
        verified_at: new Date().toISOString(),
      });
      if (verErr) {
        console.error(`Error inserting exam_version for ${examData.slug}:`, verErr);
      }
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

    // Subjects and Topics
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
                .eq('subject_id', examSubjectId)
                .eq('topic_id', masterTopic.id)
                .maybeSingle();

              if (!existingExamTopic) {
                const { error: topicErr } = await supabase.from('exam_topics').insert({
                  subject_id: examSubjectId,
                  topic_id: masterTopic.id,
                  name: topicName,
                  official_name: topicName,
                  display_name: topicName,
                  description: topicName,
                  importance: 'High',
                  active: true,
                  verification_status: 'verified',
                  source_url: examData.official_url || 'https://mcc.ca',
                  last_verified_at: new Date().toISOString(),
                });
                if (topicErr) {
                  console.error(`Error inserting exam_topic ${topicName}:`, topicErr);
                }
              }
            }
          }
        }
      }
    }
  }

  console.log('\n=== CANADA CATALOG SEEDING COMPLETED SUCCESSFULLY ===');
}

seedCanadaCatalog();
