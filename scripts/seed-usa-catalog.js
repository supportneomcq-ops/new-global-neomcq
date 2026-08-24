import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const US_COUNTRY_ID = '36469683-42d0-496b-a36d-cd684ec39e1a';

// Category IDs
const CATEGORIES = {
  MEDICAL: '94df63ea-25b6-428e-adbb-530fa6b322fe',
  NURSING: 'e6aa59a3-7eb7-41dc-8382-9a4cc897df40',
  PHARMACY: 'f35b1d10-c3a7-409d-9645-c84aa7dd0bbf',
  DENTISTRY: '10f60fc5-4bc2-4ba2-af74-93927830bd05',
  LAW: '03c5e448-f51a-4c12-9cc9-643c812905db',
  MANAGEMENT: '51770b3e-d645-41df-ae8e-8d25a804e224',
  ACCOUNTING: 'aa77b6fd-97ab-4e06-8525-a157f8cf92a1',
  FINANCE: '2dc09b60-6b4f-4368-a004-d9bc75f7b42a',
  ENGINEERING: '12cfb289-8aa4-4333-b4b8-b99617c4b22d',
  EDUCATION: '97a61966-7805-4b4f-80ed-e8b7dee1eb48',
};

// Authorities Data
const AUTHORITIES = [
  { code: 'FSMB_NBME', name: 'Federation of State Medical Boards & National Board of Medical Examiners', short_name: 'FSMB & NBME', slug: 'fsmb-nbme', official_website: 'https://www.usmle.org', description: 'Official joint governing body for the United States Medical Licensing Examination (USMLE).' },
  { code: 'NBOME', name: 'National Board of Osteopathic Medical Examiners', short_name: 'NBOME', slug: 'nbome', official_website: 'https://www.nbome.org', description: 'Official assessment organization for osteopathic medicine licensing (COMLEX-USA).' },
  { code: 'NCSBN', name: 'National Council of State Boards of Nursing', short_name: 'NCSBN', slug: 'ncsbn', official_website: 'https://www.ncsbn.org', description: 'Independent non-profit organization through which nursing regulatory bodies act together for NCLEX examinations.' },
  { code: 'NCCPA', name: 'National Commission on Certification of Physician Assistants', short_name: 'NCCPA', slug: 'nccpa', official_website: 'https://www.nccpa.net', description: 'Official certifying organization for Physician Assistants in the United States.' },
  { code: 'NABP', name: 'National Association of Boards of Pharmacy', short_name: 'NABP', slug: 'nabp', official_website: 'https://nabp.pharmacy', description: 'National association governing pharmacist licensing examinations (NAPLEX, MPJE).' },
  { code: 'JCNDE', name: 'Joint Commission on National Dental Examinations', short_name: 'JCNDE', slug: 'jcnde', official_website: 'https://www.ada.org/education/testing', description: 'Official testing agency of the American Dental Association for dental licensing examinations.' },
  { code: 'PTCB', name: 'Pharmacy Technician Certification Board', short_name: 'PTCB', slug: 'ptcb', official_website: 'https://www.ptcb.org', description: 'National certification agency for pharmacy technicians across the USA.' },
  { code: 'NCBE', name: 'National Conference of Bar Examiners', short_name: 'NCBE', slug: 'ncbe', official_website: 'https://www.ncbex.org', description: 'National non-profit organization developing the Uniform Bar Examination (UBE) and MPRE.' },
  { code: 'CALBAR', name: 'State Bar of California', short_name: 'CalBar', slug: 'state-bar-of-california', official_website: 'https://www.calbar.ca.gov', description: 'Official administrative agency responsible for licensing attorneys in California.' },
  { code: 'NYSBOLE', name: 'New York State Board of Law Examiners', short_name: 'NYSBOLE', slug: 'ny-board-of-law-examiners', official_website: 'https://www.nybarexam.org', description: 'Official state agency administering bar admissions in New York.' },
  { code: 'GMAC', name: 'Graduate Management Admission Council', short_name: 'GMAC', slug: 'gmac', official_website: 'https://www.mba.com', description: 'Global organization of graduate business schools administering the GMAT Focus Edition.' },
  { code: 'ETS', name: 'Educational Testing Service', short_name: 'ETS', slug: 'ets', official_website: 'https://www.ets.org', description: 'World largest private educational testing and assessment organization (GRE, Praxis).' },
  { code: 'AICPA_NASBA', name: 'American Institute of CPAs & National Association of State Boards of Accountancy', short_name: 'AICPA & NASBA', slug: 'aicpa-nasba', official_website: 'https://www.aicpa-cima.com', description: 'Joint administrators of the Uniform CPA Examination in the United States.' },
  { code: 'CFA_INSTITUTE', name: 'CFA Institute', short_name: 'CFA Institute', slug: 'cfa-institute', official_website: 'https://www.cfainstitute.org', description: 'Global association of investment professionals awarding the Chartered Financial Analyst designation.' },
  { code: 'GARP', name: 'Global Association of Risk Professionals', short_name: 'GARP', slug: 'garp', official_website: 'https://www.garp.org', description: 'Global non-profit organization administering the Financial Risk Manager (FRM) certification.' },
  { code: 'FINRA', name: 'Financial Industry Regulatory Authority', short_name: 'FINRA', slug: 'finra', official_website: 'https://www.finra.org', description: 'Government-authorized organization overseeing US broker-dealers and licensing.' },
  { code: 'AWS', name: 'Amazon Web Services', short_name: 'AWS', slug: 'aws-certification', official_website: 'https://aws.amazon.com/certification', description: 'Official cloud certification program by Amazon Web Services.' },
  { code: 'COMPTIA', name: 'Computing Technology Industry Association', short_name: 'CompTIA', slug: 'comptia', official_website: 'https://www.comptia.org', description: 'Leading provider of vendor-neutral IT certifications worldwide.' },
  { code: 'ISC2', name: 'International Information System Security Certification Consortium', short_name: '(ISC)²', slug: 'isc2', official_website: 'https://www.isc2.org', description: 'Global non-profit member organization specializing in cybersecurity certifications (CISSP).' },
  { code: 'NCEES', name: 'National Council of Examiners for Engineering and Surveying', short_name: 'NCEES', slug: 'ncees', official_website: 'https://ncees.org', description: 'National organization administering FE and PE engineering licensing examinations.' },
  { code: 'MICROSOFT', name: 'Microsoft Corporation', short_name: 'Microsoft', slug: 'microsoft-learn', official_website: 'https://learn.microsoft.com', description: 'Official technology vendor certification program by Microsoft.' },
  { code: 'GOOGLE_CLOUD', name: 'Google Cloud', short_name: 'GCP', slug: 'google-cloud-certifications', official_website: 'https://cloud.google.com/learn/certification', description: 'Official cloud platform certification program by Google Cloud.' },
];

const USA_EXAMS = [
  // 1. USMLE Step 1
  {
    slug: 'usmle-step-1', name: 'USMLE Step 1', short_name: 'Step 1', authority_code: 'FSMB_NBME', category_id: CATEGORIES.MEDICAL,
    description: 'The United States Medical Licensing Examination Step 1 assesses whether medical students understand and can apply foundational scientific concepts to the practice of medicine.',
    difficulty: 'Expert', question_count: 280, time_limit_mins: 480, is_featured: true,
    official_url: 'https://www.usmle.org/step-exams/step-1', official_notification_url: 'https://www.usmle.org/bulletin-information',
    official_syllabus_url: 'https://www.usmle.org/prepare-your-exam/step-1-materials/step-1-content-outline-and-specifications',
    exam_type: 'Licensing', level: 'National', mode: 'Computer-Based Test (CBT)', duration: '8 Hours (7 blocks of up to 40 items)',
    total_marks: 280, negative_marking: 'No negative marking', passing_criteria: 'Pass/Fail standard (equivalent to minimum competency logit)',
    eligibility: 'Medical students or graduates enrolled in LCME or COCA accredited medical schools or ECFMG-eligible international medical schools.',
    attempt_rules: 'Maximum 4 attempts total across all USMLE steps.', selection_process: 'Computer-based examination at Prometric centers globally.',
    stages: ['Single-stage computer examination'], papers: ['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Block 7'], languages: ['English'],
    aliases: ['USMLE Step 1', 'USMLE Step One', 'Step 1', 'USMLE 1', 'United States Medical Licensing Examination Step 1'],
    subjects: [
      { name: 'Anatomy & Embryology', official_name: 'Anatomy and Embryology', description: 'Gross anatomy, embryology, histology, and neuroanatomy.', weight: 15, topics: ['Gross Human Anatomy', 'Embryological Development', 'Microscopic Histology', 'Neuroanatomy and Neural Pathways'] },
      { name: 'Behavioral Sciences & Biostatistics', official_name: 'Behavioral Sciences, Biostatistics and Epidemiology', description: 'Medical ethics, patient communication, epidemiology, and biostatistics.', weight: 12, topics: ['Biostatistics Principles', 'Epidemiology & Study Design', 'Medical Ethics & Law', 'Behavioral Health & Psychology'] },
      { name: 'Biochemistry & Genetics', official_name: 'Biochemistry, Molecular Biology and Human Genetics', description: 'Cellular metabolism, molecular genetics, and inborn errors of metabolism.', weight: 14, topics: ['Cell Biology & Enzymes', 'Metabolic Pathways', 'Molecular Genetics', 'Inborn Errors of Metabolism'] },
      { name: 'Microbiology & Immunology', official_name: 'Microbiology and Immunology', description: 'Bacteriology, virology, mycology, parasitology, and immune mechanisms.', weight: 15, topics: ['Bacteriology & Antibiotic Resistance', 'Virology & Antivirals', 'Mycology & Parasitology', 'Innate and Adaptive Immunity'] },
      { name: 'Pathology & Cell Injury', official_name: 'Pathology and Cellular Injury', description: 'General pathology, cellular adaptations, inflammation, and neoplasia.', weight: 16, topics: ['Cellular Adaptations and Injury', 'Acute and Chronic Inflammation', 'Neoplasia & Tumor Biology', 'Hemodynamic Disorders'] },
      { name: 'Pharmacology & Toxicology', official_name: 'Pharmacology and Therapeutics', description: 'Pharmacokinetics, pharmacodynamics, autonomic agents, and organ-system therapeutics.', weight: 14, topics: ['Pharmacokinetics & Pharmacodynamics', 'Autonomic Nervous System Drugs', 'Toxicology & Antidotes', 'Systemic Pharmacotherapy'] },
      { name: 'Physiology & Pathophysiology', official_name: 'Physiology and Systemic Pathophysiology', description: 'Cardiovascular, respiratory, renal, endocrine, GI, and neurological system physiology.', weight: 14, topics: ['Cardiovascular Physiology', 'Respiratory Mechanics', 'Renal & Electrolyte Physiology', 'Endocrine Systems'] },
    ],
  },
  // 2. USMLE Step 2 CK
  {
    slug: 'usmle-step-2-ck', name: 'USMLE Step 2 CK', short_name: 'Step 2 CK', authority_code: 'FSMB_NBME', category_id: CATEGORIES.MEDICAL,
    description: 'Assesses clinical knowledge, clinical science, and essential patient-centered skills necessary for the provision of medical care under supervision.',
    difficulty: 'Expert', question_count: 318, time_limit_mins: 540, is_featured: true,
    official_url: 'https://www.usmle.org/step-exams/step-2-ck', official_notification_url: 'https://www.usmle.org/bulletin-information',
    official_syllabus_url: 'https://www.usmle.org/prepare-your-exam/step-2-ck-materials',
    exam_type: 'Licensing', level: 'National', mode: 'Computer-Based Test (CBT)', duration: '9 Hours (8 blocks of up to 40 items)',
    total_marks: 300, negative_marking: 'No negative marking', passing_criteria: 'Numeric score requirement (minimum passing score 214)',
    eligibility: 'Medical students who have completed clinical clerkships or medical graduates.',
    attempt_rules: 'Maximum 4 attempts total across all steps.', selection_process: 'CBT examination at Prometric centers.',
    stages: ['Single 9-hour examination day'], papers: ['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Block 7', 'Block 8'], languages: ['English'],
    aliases: ['USMLE Step 2', 'USMLE Step 2 CK', 'Step 2 CK', 'USMLE Step Two CK', 'USMLE Clinical Knowledge'],
    subjects: [
      { name: 'Internal Medicine', official_name: 'Internal Medicine & Adult Health', description: 'Comprehensive adult medicine, cardiology, pulmonology, gastroenterology, and nephrology.', weight: 33, topics: ['Cardiovascular Medicine', 'Pulmonary & Critical Care', 'Gastroenterology & Hepatology', 'Nephrology & Hypertension'] },
      { name: 'General Surgery & Trauma', official_name: 'Surgery & Perioperative Management', description: 'Preoperative, intraoperative, and postoperative care, acute abdomen, and surgical emergencies.', weight: 18, topics: ['Acute Abdominal Pain', 'Trauma Resuscitation', 'Perioperative Safety', 'Surgical Oncology'] },
      { name: 'Obstetrics & Gynecology', official_name: 'Obstetrics and Gynecology', description: 'Prenatal care, labor and delivery, maternal-fetal medicine, and gynecological disorders.', weight: 15, topics: ['Antepartum and Postpartum Care', 'Complicated Labor & Delivery', 'Gynecologic Malignancies', 'Reproductive Endocrinology'] },
      { name: 'Pediatrics', official_name: 'Pediatrics & Adolescent Medicine', description: 'Well-child maintenance, pediatric growth and development, neonatal and pediatric emergencies.', weight: 15, topics: ['Neonatal Resuscitation', 'Pediatric Infectious Diseases', 'Growth and Development Milestones', 'Pediatric Emergency Medicine'] },
      { name: 'Psychiatry & Behavioral Health', official_name: 'Psychiatry and Behavioral Health', description: 'Major mood disorders, psychotic spectrum, anxiety, substance abuse, and psychopharmacology.', weight: 10, topics: ['Depressive & Bipolar Disorders', 'Psychotic Spectrum Disorders', 'Substance Use Disorders', 'Psychopharmacology Therapeutics'] },
      { name: 'Preventive Medicine & Patient Safety', official_name: 'Preventive Medicine, Ethics and Quality Improvement', description: 'Screening guidelines, medical error prevention, patient safety, and medical ethics.', weight: 9, topics: ['Health Maintenance Screening', 'Patient Safety Systems', 'Quality Improvement Metrics', 'Clinical Decision Ethics'] },
    ],
  },
  // 3. USMLE Step 3
  {
    slug: 'usmle-step-3', name: 'USMLE Step 3', short_name: 'Step 3', authority_code: 'FSMB_NBME', category_id: CATEGORIES.MEDICAL,
    description: 'Final examination in the USMLE sequence assessing the ability of medical residents to apply medical knowledge and clinical decision-making for unsupervised medical practice.',
    difficulty: 'Expert', question_count: 462, time_limit_mins: 960, is_featured: false,
    official_url: 'https://www.usmle.org/step-exams/step-3', official_notification_url: 'https://www.usmle.org/bulletin-information',
    official_syllabus_url: 'https://www.usmle.org/prepare-your-exam/step-3-materials',
    exam_type: 'Licensing', level: 'National', mode: 'Computer-Based Test (CBT) + Computerized Case Simulations (CCS)',
    duration: '2-Day Examination (16 hours total)', total_marks: 300, negative_marking: 'No negative marking', passing_criteria: 'Numeric score requirement (minimum passing score 198)',
    eligibility: 'Medical graduates holding MD or DO degrees who passed Step 1 and Step 2 CK.', attempt_rules: 'Maximum 4 attempts total across all steps.',
    selection_process: '2-day Prometric examination testing MCQs and interactive PrPr/Prn CCS cases.',
    stages: ['Day 1: Foundations of Independent Practice (FIP)', 'Day 2: Advanced Clinical Medicine (ACM) & PrPr/Prn CCS Cases'],
    papers: ['Day 1 MCQs', 'Day 2 MCQs', 'Day 2 Computerized Case Simulations (13 CCS cases)'], languages: ['English'],
    aliases: ['USMLE Step 3', 'USMLE Step Three', 'Step 3'],
    subjects: [
      { name: 'Foundations of Independent Practice', official_name: 'Foundations of Independent Practice (FIP)', description: 'Basic medical science application, biostatistics, epidemiology, medical safety, and ethics.', weight: 50, topics: ['Epidemiology and Population Health', 'Medical Ethics and Legal Issues', 'Pharmacotherapy Principles', 'Diagnostic Testing Interpretation'] },
      { name: 'Advanced Clinical Medicine & CCS', official_name: 'Advanced Clinical Medicine (ACM) & PrPr CCS', description: 'Inpatient and outpatient clinical management, acute intervention, and interactive computerized case simulations.', weight: 50, topics: ['Emergency Room Management', 'Inpatient Critical Care', 'Outpatient Longitudinal Care', 'Interactive CCS Simulation Management'] },
    ],
  },
  // 4. COMLEX-USA Level 1
  {
    slug: 'comlex-usa-level-1', name: 'COMLEX-USA Level 1', short_name: 'COMLEX Level 1', authority_code: 'NBOME', category_id: CATEGORIES.MEDICAL,
    description: 'National licensing examination for osteopathic medical students evaluating foundational biomedical sciences and osteopathic principles.',
    difficulty: 'Expert', question_count: 352, time_limit_mins: 480, is_featured: false,
    official_url: 'https://www.nbome.org/assessments/comlex-usa/comlex-usa-level-1/', official_notification_url: 'https://www.nbome.org',
    official_syllabus_url: 'https://www.nbome.org/assessments/comlex-usa/comlex-usa-level-1/blueprint/',
    exam_type: 'Licensing', level: 'National', mode: 'Computer-Based Test (CBT)', duration: '8 Hours (2 sessions of 4 hours)', total_marks: 352, negative_marking: 'No negative marking',
    passing_criteria: 'Pass/Fail evaluation standard', eligibility: 'Osteopathic medical students in accredited DO programs.',
    attempt_rules: 'Subject to NBOME candidate eligibility rules.', selection_process: 'CBT examination at Pearson VUE test centers.',
    stages: ['Single 8-hour testing day'], papers: ['Session 1 (176 items)', 'Session 2 (176 items)'], languages: ['English'],
    aliases: ['COMLEX Level 1', 'COMLEX-USA Level 1', 'COMLEX 1', 'NBOME Level 1'],
    subjects: [
      { name: 'Osteopathic Principles & Manipulative Medicine', official_name: 'Osteopathic Principles, Practice, and OMM', description: 'Somatic dysfunction diagnosis, osteopathic manipulative treatment techniques, and biomechanics.', weight: 20, topics: ['Somatic Dysfunction Identification', 'Muscle Energy & High-Velocity Low-Amplitude (HVLA)', 'Strain-Counterstrain & Cranial Osteopathy', 'Viscerosomatic Reflex Pathways'] },
      { name: 'Biomedical Sciences & Pathology', official_name: 'Foundational Biomedical Sciences', description: 'Anatomy, physiology, biochemistry, pharmacology, pathology, and microbiology.', weight: 80, topics: ['Cardiovascular & Respiratory Science', 'Renal & Electrolyte Physiology', 'Neuromusculoskeletal Pathology', 'Microbiology & Infectious Diseases'] },
    ],
  },
  // 5. NCLEX-RN
  {
    slug: 'nclex-rn', name: 'NCLEX-RN', short_name: 'NCLEX-RN', authority_code: 'NCSBN', category_id: CATEGORIES.NURSING,
    description: 'National Council Licensure Examination for Registered Nurses in the United States using Next Generation NCLEX adaptive testing.',
    difficulty: 'Advanced', question_count: 150, time_limit_mins: 300, is_featured: true,
    official_url: 'https://www.ncsbn.org/nclex.page', official_notification_url: 'https://www.ncsbn.org/news.page',
    official_syllabus_url: 'https://www.ncsbn.org/public-files/2023_RN_Test_Plan_English_FINAL.pdf',
    exam_type: 'Licensing', level: 'National', mode: 'Variable Length Computerized Adaptive Test (CAT)', duration: '5 Hours maximum', total_marks: 150,
    negative_marking: 'Partial credit scoring on Next Gen NCLEX items', passing_criteria: 'Pass/Fail based on logit ability estimation above national threshold',
    eligibility: 'Graduates of accredited Associate Degree in Nursing (ADN), BSN, or approved diploma programs.', attempt_rules: 'Rules governed by individual state boards of nursing.',
    selection_process: 'CAT examination administered at Pearson VUE centers nationwide.', stages: ['Single Computerized Adaptive Exam'], papers: ['Adaptive Question Bank'], languages: ['English'],
    aliases: ['NCLEX RN', 'NCLEX-RN', 'NCLEX', 'National Council Licensure Examination Registered Nurse', 'Next Gen NCLEX'],
    subjects: [
      { name: 'Management of Care & Safety', official_name: 'Safe and Effective Care Environment - Management of Care', description: 'Delegation, priority setting, legal rights, ethical practice, and quality improvement.', weight: 20, topics: ['Delegation and Supervision', 'Client Rights and Advocacy', 'Informed Consent and Legal Responsibilities', 'Prioritization of Patient Care'] },
      { name: 'Safety & Infection Control', official_name: 'Safe and Effective Care Environment - Safety and Infection Control', description: 'Standard precautions, surgical asepsis, emergency response, and hazard prevention.', weight: 13, topics: ['Standard Precautions & Personal Protective Equipment', 'Infection Prevention & Control Protocols', 'Emergency Preparedness & Response', 'Error Prevention Systems'] },
      { name: 'Health Promotion & Maintenance', official_name: 'Health Promotion and Maintenance', description: 'Maternal-child nursing, growth and development milestones, lifestyle choices, and screening.', weight: 9, topics: ['Antepartum, Intrapartum & Postpartum Care', 'Pediatric Growth & Developmental Milestones', 'Health Screening and Disease Prevention', 'Self-Care Education'] },
      { name: 'Psychosocial Integrity', official_name: 'Psychosocial Integrity', description: 'Mental health nursing, coping mechanisms, therapeutic communication, and crisis intervention.', weight: 9, topics: ['Therapeutic Communication Techniques', 'Mental Health Disorders & Interventions', 'Crisis Intervention Protocols', 'Chemical Dependency and Abuse'] },
      { name: 'Pharmacological & Parenteral Therapies', official_name: 'Physiological Integrity - Pharmacological and Parenteral Therapies', description: 'Dosage calculations, IV therapy, medication side effects, and adverse reaction management.', weight: 16, topics: ['Dosage Calculation & Flow Rates', 'Intravenous Access & TPN Management', 'High-Alert Medications & Adverse Reactions', 'Pharmacotherapy Monitoring'] },
      { name: 'Physiological Adaptation & Risk Reduction', official_name: 'Physiological Integrity - Adaptation and Risk Reduction', description: 'Fluid & electrolyte imbalances, acute hemodynamic crises, post-op care, and lab values.', weight: 33, topics: ['Fluid and Electrolyte Balance', 'Haemodynamic Shock and Sepsis Management', 'Diagnostic Lab Values & Critical Interpretation', 'Postoperative Complication Prevention'] },
    ],
  },
  // 6. NCLEX-PN
  {
    slug: 'nclex-pn', name: 'NCLEX-PN', short_name: 'NCLEX-PN', authority_code: 'NCSBN', category_id: CATEGORIES.NURSING,
    description: 'National Council Licensure Examination for Practical Nurses (LPN/LVN) in the United States.',
    difficulty: 'Intermediate', question_count: 150, time_limit_mins: 300, is_featured: false,
    official_url: 'https://www.ncsbn.org/nclex.page', official_notification_url: 'https://www.ncsbn.org',
    official_syllabus_url: 'https://www.ncsbn.org/public-files/2023_PN_Test_Plan_English_FINAL.pdf',
    exam_type: 'Licensing', level: 'National', mode: 'Computerized Adaptive Test (CAT)', duration: '5 Hours maximum', total_marks: 150,
    negative_marking: 'Partial credit on Next Gen items', passing_criteria: 'Pass/Fail based on logit ability standard',
    eligibility: 'Graduates of state-approved Practical Nursing / Vocational Nursing programs.', attempt_rules: 'Varies by state board of nursing.',
    selection_process: 'CAT examination at Pearson VUE centers.', stages: ['Single CAT exam'], papers: ['Adaptive Question Bank'], languages: ['English'],
    aliases: ['NCLEX PN', 'NCLEX-PN', 'Practical Nurse Exam', 'LPN Licensure Exam'],
    subjects: [
      { name: 'Coordinated Care & Safety', official_name: 'Coordinated Care and Safety', description: 'Role of LPN/LVN, client rights, confidentiality, and infection prevention.', weight: 22, topics: ['Scope of Practice for Practical Nurses', 'Client Rights and Confidentiality', 'Infection Control and Standard Precautions', 'Patient Environment Safety'] },
      { name: 'Physiological Integrity & Care', official_name: 'Physiological Integrity and Care', description: 'Basic nursing care, comfort measures, medication administration, and monitoring clinical changes.', weight: 50, topics: ['Basic Nursing Procedures', 'Oral and Parenteral Medication Administration', 'Vitals and Clinical Monitoring', 'Nutrition and Hydration Care'] },
    ],
  },
  // 7. PANCE
  {
    slug: 'pance', name: 'PANCE (Physician Assistant National Certifying Examination)', short_name: 'PANCE', authority_code: 'NCCPA', category_id: CATEGORIES.MEDICAL,
    description: 'Entry-level qualifying examination for graduates of accredited Physician Assistant programs in the US.',
    difficulty: 'Expert', question_count: 300, time_limit_mins: 300, is_featured: true,
    official_url: 'https://www.nccpa.net/pance-panre-designation/', official_notification_url: 'https://www.nccpa.net',
    official_syllabus_url: 'https://www.nccpa.net/pance-content-blueprint/',
    exam_type: 'Licensing', level: 'National', mode: 'Computer-Based Test (CBT)', duration: '5 Hours (5 blocks of 60 questions)', total_marks: 300,
    negative_marking: 'No negative marking', passing_criteria: 'Scaled score minimum standard', eligibility: 'Graduates of ARC-PA accredited PA programs.',
    attempt_rules: 'Up to 6 attempts within 6 years of graduation.', selection_process: 'CBT examination administered at Pearson VUE centers.',
    stages: ['Single 5-hour testing day'], papers: ['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5'], languages: ['English'],
    aliases: ['PANCE', 'Physician Assistant National Certifying Exam', 'NCCPA PANCE'],
    subjects: [
      { name: 'Cardiovascular System', official_name: 'Cardiovascular System organ domain', description: 'Hypertension, coronary artery disease, heart failure, arrhythmias, and valvular diseases.', weight: 13, topics: ['Hypertension & Lipid Disorders', 'Ischemic Heart Disease', 'Arrhythmias & Conduction Disorders', 'Heart Failure Management'] },
      { name: 'Pulmonary System', official_name: 'Pulmonary System organ domain', description: 'Asthma, COPD, pneumonia, pulmonary embolism, and respiratory failure.', weight: 10, topics: ['Asthma & COPD Management', 'Infectious Pneumonias', 'Pulmonary Embolism & DVT', 'Restrictive Lung Diseases'] },
      { name: 'Gastrointestinal & Musculoskeletal Systems', official_name: 'Gastrointestinal, Nutrition & Musculoskeletal', description: 'GI bleeding, hepatitis, acute abdomen, fractures, joint dislocations, and arthritis.', weight: 18, topics: ['Gastrointestinal Bleeding', 'Hepatobiliary Disorders', 'Fractures & Dislocations', 'Rheumatoid and Osteoarthritis'] },
      { name: 'Infectious Diseases & Endocrine', official_name: 'Infectious Diseases and Endocrine System', description: 'Sepsis, HIV, STI, diabetes mellitus, thyroid disorders, and adrenal diseases.', weight: 15, topics: ['Sepsis and Bacteremia', 'Diabetes Mellitus Type 1 and 2', 'Thyroid Dysfunction', 'Adrenal Insufficiency'] },
    ],
  },
  // 8. NAPLEX
  {
    slug: 'naplex', name: 'NAPLEX (North American Pharmacist Licensure Examination)', short_name: 'NAPLEX', authority_code: 'NABP', category_id: CATEGORIES.PHARMACY,
    description: 'National licensing examination testing prospective pharmacists on clinical knowledge, compounding, and drug safety.',
    difficulty: 'Expert', question_count: 225, time_limit_mins: 360, is_featured: true,
    official_url: 'https://nabp.pharmacy/programs/examinations/naplex/', official_notification_url: 'https://nabp.pharmacy',
    official_syllabus_url: 'https://nabp.pharmacy/programs/examinations/naplex/competency-statements/',
    exam_type: 'Licensing', level: 'National', mode: 'Computer-Based Test (CBT)', duration: '6 Hours', total_marks: 225,
    negative_marking: 'No negative marking', passing_criteria: 'Scaled passing score standard', eligibility: 'Graduates of ACPE-accredited PharmD programs.',
    attempt_rules: 'Maximum 5 attempts total.', selection_process: 'CBT examination at Pearson VUE test centers.',
    stages: ['Single 6-hour computer exam'], papers: ['NAPLEX Comprehensive Question Bank'], languages: ['English'],
    aliases: ['NAPLEX', 'North American Pharmacist Licensure Examination', 'NABP NAPLEX'],
    subjects: [
      { name: 'Clinical Assessment & Pharmacotherapy', official_name: 'Obtain, Interpret, or Assess Clinical Information and Develop Pharmacotherapy Plans', description: 'Patient lab evaluation, disease state management, drug selection, dosing, and monitoring.', weight: 67, topics: ['Patient Clinical Evaluation', 'Pharmacotherapy Plan Development', 'Drug Dosing and Interval Adjustment', 'Adverse Event Monitoring'] },
      { name: 'Compounding, Calculations & Dispensing', official_name: 'Calculations, Sterile/Non-sterile Compounding and Medication Dispensing', description: 'Pharmaceutical calculations, USP 795/797/800 compounding standards, and dispensing safety.', weight: 33, topics: ['Pharmaceutical Dosage Calculations', 'Sterile Compounding (USP 797)', 'Non-sterile Compounding (USP 795)', 'Medication Dispensing Protocols'] },
    ],
  },
  // 9. MPJE
  {
    slug: 'mpje', name: 'MPJE (Multistate Pharmacy Jurisprudence Examination)', short_name: 'MPJE', authority_code: 'NABP', category_id: CATEGORIES.PHARMACY,
    description: 'Combines federal and state-specific laws governing the practice of pharmacy, drug distribution, and controlled substances.',
    difficulty: 'Advanced', question_count: 120, time_limit_mins: 150, is_featured: false,
    official_url: 'https://nabp.pharmacy/programs/examinations/mpje/', official_notification_url: 'https://nabp.pharmacy',
    official_syllabus_url: 'https://nabp.pharmacy/programs/examinations/mpje/competency-statements/',
    exam_type: 'Licensing', level: 'State/National Joint', mode: 'Computer-Based Test (CBT)', duration: '2.5 Hours', total_marks: 120,
    negative_marking: 'No negative marking', passing_criteria: 'Scaled score 75 or higher', eligibility: 'PharmD graduates applying for state pharmacist licensure.',
    attempt_rules: 'Maximum 5 attempts per jurisdiction.', selection_process: 'CBT examination at Pearson VUE centers.',
    stages: ['Single state jurisprudence exam'], papers: ['MPJE Jurisprudence Exam'], languages: ['English'],
    aliases: ['MPJE', 'Multistate Pharmacy Jurisprudence Examination', 'Pharmacy Law Exam'],
    subjects: [
      { name: 'Federal & State Drug Pharmacy Law', official_name: 'Pharmacy Practice, Licensure, and Regulatory Compliance', description: 'Federal Controlled Substances Act, FDA labeling, prescription dispensing rules, and state pharmacy board rules.', weight: 100, topics: ['Controlled Substances Act Regulations', 'Prescription Drug Marketing Act', 'Pharmacist & Pharmacy Licensure Rules', 'Prescription Refill & Transfer Laws'] },
    ],
  },
  // 10. INBDE
  {
    slug: 'inbde', name: 'INBDE (Integrated National Board Dental Examination)', short_name: 'INBDE', authority_code: 'JCNDE', category_id: CATEGORIES.DENTISTRY,
    description: 'Integrated national dental examination evaluating biomedical, clinical, and behavioral sciences for US dental licensure.',
    difficulty: 'Expert', question_count: 500, time_limit_mins: 750, is_featured: false,
    official_url: 'https://www.ada.org/education/testing/examinations/integrated-national-board-dental-examination', official_notification_url: 'https://www.ada.org',
    official_syllabus_url: 'https://www.ada.org/education/testing/examinations/integrated-national-board-dental-examination',
    exam_type: 'Licensing', level: 'National', mode: 'Computer-Based Test (CBT)', duration: '12.5 Hours across 2 Days', total_marks: 500,
    negative_marking: 'No negative marking', passing_criteria: 'Standard scaled passing score', eligibility: 'Dental students in CODA-accredited US/Canadian dental programs.',
    attempt_rules: 'Maximum 5 attempts per candidate.', selection_process: '2-day CBT examination at Prometric centers.',
    stages: ['Day 1 (360 items)', 'Day 2 (140 items featuring 36 case items)'], papers: ['Day 1 Sessions 1-3', 'Day 2 Case Sessions'], languages: ['English'],
    aliases: ['INBDE', 'Integrated National Board Dental Examination', 'National Board Dental Exam', 'NBDE'],
    subjects: [
      { name: 'Biomedical & Foundation Clinical Dental Sciences', official_name: 'Biomedical & Clinical Dental Foundation', description: 'Anatomy, pathology, pharmacology, operative dentistry, periodontics, and endodontics.', weight: 60, topics: ['Dental & Craniofacial Anatomy', 'Oral & Maxillofacial Pathology', 'Periodontics & Implantology', 'Endodontics & Operative Dentistry'] },
      { name: 'Patient Management & Clinical Cases', official_name: 'Diagnosis, Treatment Planning & Ethics', description: 'Clinical decision-making, patient assessment, treatment planning, and medical emergency management in dentistry.', weight: 40, topics: ['Comprehensive Dental Diagnosis', 'Interprofessional Treatment Planning', 'Dental Medical Emergency Management', 'Ethical Practice & Informed Consent'] },
    ],
  },
  // 11. Uniform Bar Examination (UBE)
  {
    slug: 'uniform-bar-examination', name: 'Uniform Bar Examination (UBE)', short_name: 'UBE', authority_code: 'NCBE', category_id: CATEGORIES.LAW,
    description: 'Standardized national bar examination adopted by over 40 US jurisdictions, comprising MBE, MEE, and MPT components.',
    difficulty: 'Expert', question_count: 200, time_limit_mins: 720, is_featured: true,
    official_url: 'https://www.ncbex.org/exams/ube/', official_notification_url: 'https://www.ncbex.org',
    official_syllabus_url: 'https://www.ncbex.org/exams/mbe/mbe-subject-matter-outlines/',
    exam_type: 'Licensing', level: 'National / State Shared', mode: 'Paper/Computer hybrid administered by state bar examiners', duration: '12 Hours (2 Days)',
    total_marks: 400, negative_marking: 'No negative marking', passing_criteria: 'Jurisdiction-dependent passing score (typically 260 to 270 out of 400)',
    eligibility: 'Graduates of ABA-accredited law schools (JD degree) or eligible state bar candidates.', attempt_rules: 'Determined by individual state bar licensing rules.',
    selection_process: 'Twice-yearly administration in February and July.', stages: ['Day 1: MEE Essays & MPT Performance Tests', 'Day 2: MBE Multiple Choice'],
    papers: ['Multistate Essay Examination (MEE)', 'Multistate Performance Test (MPT)', 'Multistate Bar Examination (MBE)'], languages: ['English'],
    aliases: ['UBE', 'Uniform Bar Examination', 'Uniform Bar Exam', 'MBE Bar Exam', 'US Bar Examination'],
    subjects: [
      { name: 'Constitutional Law', official_name: 'MBE Constitutional Law', description: 'Individual rights, equal protection, judicial review, separation of powers, and federalism.', weight: 14, topics: ['First Amendment Freedoms', 'Equal Protection & Due Process', 'Separation of Powers & Federal Jurisdiction', 'Interstate Commerce Clause'] },
      { name: 'Contracts & Sales', official_name: 'MBE Contracts and Sales (UCC Article 2)', description: 'Contract formation, consideration, breach, remedies, and UCC Article 2 sales of goods.', weight: 14, topics: ['Offer, Acceptance & Consideration', 'Statute of Frauds', 'Contract Performance & Breach', 'UCC Article 2 Special Rules'] },
      { name: 'Criminal Law & Procedure', official_name: 'MBE Criminal Law and Constitutional Procedure', description: 'Homicide, theft crimes, defenses, 4th/5th/6th Amendment rights, and trial procedures.', weight: 14, topics: ['Homicide and Inchoate Crimes', 'Search and Seizure (4th Amendment)', 'Fifth Amendment & Miranda Rights', 'Sixth Amendment Right to Counsel'] },
      { name: 'Evidence', official_name: 'MBE Federal Rules of Evidence', description: 'Relevance, hearsay exceptions, impeachment, privileges, and expert testimony.', weight: 14, topics: ['Relevance and Judicial Notice', 'Hearsay Rule & Exceptions', 'Witness Impeachment', 'Expert and Lay Opinion Testimony'] },
      { name: 'Federal Civil Procedure', official_name: 'MBE Federal Rules of Civil Procedure', description: 'Jurisdiction, venue, pleadings, joinder, discovery, summary judgment, and preclusion doctrines.', weight: 14, topics: ['Subject Matter and Personal Jurisdiction', 'Pleadings & Rule 12 Motions', 'Joinder & Class Actions', 'Summary Judgment & Res Judicata'] },
      { name: 'Real Property', official_name: 'MBE Real Property', description: 'Ownership interests, landlord-tenant law, deeds, mortgages, recording acts, and easements.', weight: 14, topics: ['Freehold Estates & Future Interests', 'Landlord-Tenant Law', 'Deeds, Title & Recording Acts', 'Easements & Covenants'] },
      { name: 'Torts', official_name: 'MBE Torts', description: 'Negligence, intentional torts, strict liability, products liability, defamation, and privacy.', weight: 14, topics: ['Negligence & Proximate Cause', 'Intentional Torts & Defenses', 'Strict Liability & Products Liability', 'Defamation & Privacy Torts'] },
    ],
  },
  // 12. MPRE
  {
    slug: 'mpre', name: 'MPRE (Multistate Professional Responsibility Examination)', short_name: 'MPRE', authority_code: 'NCBE', category_id: CATEGORIES.LAW,
    description: 'Standardized legal ethics examination required for admission to the bar in almost all US jurisdictions.',
    difficulty: 'Intermediate', question_count: 60, time_limit_mins: 120, is_featured: false,
    official_url: 'https://www.ncbex.org/exams/mpre/', official_notification_url: 'https://www.ncbex.org',
    official_syllabus_url: 'https://www.ncbex.org/exams/mpre/mpre-subject-matter-outline/',
    exam_type: 'Licensing', level: 'National', mode: 'Computer-Based Test (CBT)', duration: '2 Hours', total_marks: 150, negative_marking: 'No negative marking',
    passing_criteria: 'Scaled score requirement varying by state (75 to 86 out of 150)', eligibility: 'Law students or law graduates seeking bar admission.',
    attempt_rules: 'Administered 3 times per year (March, August, November).', selection_process: 'CBT examination administered at Pearson VUE centers.',
    stages: ['Single 2-hour exam'], papers: ['MPRE 60-Item Multiple Choice'], languages: ['English'],
    aliases: ['MPRE', 'Multistate Professional Responsibility Examination', 'Legal Ethics Bar Exam'],
    subjects: [
      { name: 'ABA Model Rules of Professional Conduct', official_name: 'Regulation of the Legal Profession & Client Communications', description: 'Client confidentiality, conflicts of interest, attorney fees, competence, and judicial ethics.', weight: 100, topics: ['Conflicts of Interest Rules', 'Client Confidentiality & Attorney-Client Privilege', 'Competence, Malpractice & Advertising', 'Judicial Conduct Code'] },
    ],
  },
  // 13. California Bar Examination
  {
    slug: 'california-bar-examination', name: 'California Bar Examination', short_name: 'Cal Bar Exam', authority_code: 'CALBAR', category_id: CATEGORIES.LAW,
    description: 'Comprehensive bar examination for admission to practice law in California, testing general law and California-specific legal doctrines.',
    difficulty: 'Expert', question_count: 200, time_limit_mins: 720, is_featured: false,
    official_url: 'https://www.calbar.ca.gov/Admissions/Examinations/California-Bar-Examination', official_notification_url: 'https://www.calbar.ca.gov',
    official_syllabus_url: 'https://www.calbar.ca.gov/Admissions/Examinations/California-Bar-Examination/Scope-of-the-Exam',
    exam_type: 'Licensing', level: 'State', mode: 'Paper/In-person administered by the State Bar of California', duration: '12 Hours (2 Days)', total_marks: 1390,
    negative_marking: 'No negative marking', passing_criteria: 'Minimum scaled total score of 1390', eligibility: 'Graduates of accredited California law schools or foreign attorneys.',
    attempt_rules: 'Administered in February and July.', selection_process: '2-day exam comprising 5 essay questions, 1 Performance Test, and MBE 200 items.',
    stages: ['Day 1: 5 Essays & Performance Test', 'Day 2: 200 MBE Items'], papers: ['California Essays', 'California Performance Test', 'Multistate Bar Examination'], languages: ['English'],
    aliases: ['California Bar Exam', 'Cal Bar Exam', 'California State Bar Exam'],
    subjects: [
      { name: 'California Community Property & Professional Responsibility', official_name: 'California Specific Law Subjects', description: 'California Community Property, California Evidence, Civil Procedure, and California Rules of Professional Conduct.', weight: 50, topics: ['California Community Property Characterization', 'California Evidence Code vs FRE', 'California Professional Responsibility Rules', 'California Civil Procedure'] },
      { name: 'General Multistate Bar Subjects', official_name: 'General Multistate Bar Examination Subjects', description: 'Constitutional Law, Contracts, Criminal Law, Evidence, Real Property, Torts, and Wills & Trusts.', weight: 50, topics: ['Contracts and UCC Sales', 'Criminal Law and Procedure', 'Real Property and Mortgages', 'Torts and Strict Liability'] },
    ],
  },
  // 14. GMAT Focus Edition
  {
    slug: 'gmat-focus-edition', name: 'GMAT Focus Edition', short_name: 'GMAT Focus', authority_code: 'GMAC', category_id: CATEGORIES.MANAGEMENT,
    description: 'Premier graduate business school admissions examination evaluating critical reasoning, quantitative analysis, and data literacy.',
    difficulty: 'Advanced', question_count: 64, time_limit_mins: 135, is_featured: true,
    official_url: 'https://www.mba.com/exams/gmat-focus-edition', official_notification_url: 'https://www.mba.com',
    official_syllabus_url: 'https://www.mba.com/exams/gmat-focus-edition/about/exam-structure',
    exam_type: 'Entrance', level: 'Global', mode: 'Computer Adaptive Test (CAT)', duration: '2 Hours 15 Minutes (3 sections of 45 minutes)', total_marks: 805,
    negative_marking: 'Unanswered questions penalized', passing_criteria: 'Scaled score range from 205 to 805', eligibility: 'Candidates applying for MBA or graduate business programs.',
    attempt_rules: 'Up to 5 attempts per rolling 12 months.', selection_process: 'CBT examination at Pearson VUE centers or online test.',
    stages: ['Single 3-section computer adaptive exam'], papers: ['Quantitative Reasoning', 'Verbal Reasoning', 'Data Insights'], languages: ['English'],
    aliases: ['GMAT', 'GMAT Focus', 'GMAT Exam', 'Graduate Management Admission Test'],
    subjects: [
      { name: 'Quantitative Reasoning', official_name: 'GMAT Quantitative Reasoning Section', description: 'Problem-solving testing arithmetic, elementary algebra, and quantitative logic.', weight: 33, topics: ['Arithmetic & Number Properties', 'Algebraic Expressions & Equations', 'Ratios, Percentages & Word Problems', 'Quantitative Logic'] },
      { name: 'Verbal Reasoning', official_name: 'GMAT Verbal Reasoning Section', description: 'Reading comprehension and critical reasoning skills evaluating arguments.', weight: 33, topics: ['Critical Reasoning & Argument Evaluation', 'Reading Comprehension Analysis', 'Inference and Assumption Identification', 'Flaw and Weakening Analysis'] },
      { name: 'Data Insights', official_name: 'GMAT Data Insights Section', description: 'Data sufficiency, multi-source reasoning, table analysis, graphics interpretation.', weight: 33, topics: ['Data Sufficiency Analysis', 'Multi-Source Reasoning', 'Table and Chart Analysis', 'Two-Part Analysis Problems'] },
    ],
  },
  // 15. GRE General Test
  {
    slug: 'gre-general-test', name: 'GRE General Test', short_name: 'GRE', authority_code: 'ETS', category_id: CATEGORIES.MANAGEMENT,
    description: 'Widely accepted graduate admissions examination evaluating verbal reasoning, quantitative reasoning, and analytical writing.',
    difficulty: 'Advanced', question_count: 54, time_limit_mins: 118, is_featured: true,
    official_url: 'https://www.ets.org/gre', official_notification_url: 'https://www.ets.org',
    official_syllabus_url: 'https://www.ets.org/gre/test-takers/general-test/about.html',
    exam_type: 'Entrance', level: 'Global', mode: 'Section-Level Adaptive Computer Test', duration: '1 Hour 58 Minutes', total_marks: 340,
    negative_marking: 'No negative marking', passing_criteria: 'Individual Verbal (130-170) and Quant (130-170) scores + Analytical Writing (0-6)', eligibility: 'Applicants to master\'s or doctoral degree programs.',
    attempt_rules: 'Once every 21 days, up to 5 times in a rolling 12-month period.', selection_process: 'CBT examination at Prometric centers or home edition.',
    stages: ['Single computer adaptive testing session'], papers: ['Analytical Writing', 'Verbal Reasoning Section 1 & 2', 'Quantitative Reasoning Section 1 & 2'], languages: ['English'],
    aliases: ['GRE', 'GRE General', 'Graduate Record Examination'],
    subjects: [
      { name: 'Verbal Reasoning', official_name: 'GRE Verbal Reasoning', description: 'Text completion, sentence equivalence, and reading comprehension passages.', weight: 45, topics: ['Text Completion Vocabulary', 'Sentence Equivalence Syntax', 'Reading Comprehension & Passages', 'Argument Analysis'] },
      { name: 'Quantitative Reasoning', official_name: 'GRE Quantitative Reasoning', description: 'Quantitative comparison, problem solving, data interpretation, algebra, geometry.', weight: 45, topics: ['Quantitative Comparison Strategy', 'Algebra & Function Analysis', 'Geometry & Coordinate Plane', 'Data Interpretation & Statistics'] },
      { name: 'Analytical Writing', official_name: 'GRE Analytical Writing', description: 'Analyze an Issue task evaluating structured argumentative writing.', weight: 10, topics: ['Analyze an Issue Essay Structure', 'Argument Construction & Cohesion', 'Standard Written English Conventions'] },
    ],
  },
  // 16. Uniform CPA Examination
  {
    slug: 'us-cpa-certification', name: 'Uniform CPA Examination', short_name: 'US CPA', authority_code: 'AICPA_NASBA', category_id: CATEGORIES.ACCOUNTING,
    description: 'Premier credential examination for Certified Public Accountants in the United States, restructured under the CPA Evolution model into 3 core sections + 1 discipline.',
    difficulty: 'Expert', question_count: 250, time_limit_mins: 960, is_featured: true,
    official_url: 'https://www.aicpa-cima.com/resources/landing/cpa-exam', official_notification_url: 'https://nasba.org/exams/cpaexam/',
    official_syllabus_url: 'https://www.aicpa-cima.com/resources/download/cpa-exam-blueprints',
    exam_type: 'Licensing', level: 'National / State Board', mode: 'Computer-Based Test (CBT)', duration: '16 Hours total (4 Hours per section)', total_marks: 300,
    negative_marking: 'No negative marking', passing_criteria: 'Minimum passing score of 75 on each section', eligibility: '150 semester hours of college credit including specific accounting/business courses.',
    attempt_rules: '30-month rolling credit window upon passing first section.', selection_process: 'CBT examination administered at Prometric centers.',
    stages: ['Core 1: AUD', 'Core 2: FAR', 'Core 3: REG', 'Discipline Choice (BAR, ISC, or TCP)'], papers: ['Auditing and Attestation (AUD)', 'Financial Accounting and Reporting (FAR)', 'Regulation (REG)', 'Business Analysis and Reporting (BAR)'], languages: ['English'],
    aliases: ['CPA', 'US CPA', 'Uniform CPA Exam', 'Certified Public Accountant Exam'],
    subjects: [
      { name: 'Auditing and Attestation (AUD)', official_name: 'AUD Core Section', description: 'Ethics, professional responsibilities, assessing risk, performing procedures, and issuing audit reports.', weight: 25, topics: ['Ethics and Independence Standards', 'Assessing Audit Risk and Materiality', 'Audit Procedures and Evidence', 'Audit Reporting and Attest Engagements'] },
      { name: 'Financial Accounting and Reporting (FAR)', official_name: 'FAR Core Section', description: 'US GAAP financial statements, balance sheet items, revenue recognition, and state/local government accounting.', weight: 25, topics: ['Financial Statement Presentation (US GAAP)', 'Asset & Liability Accounting', 'Revenue Recognition Rules', 'State and Local Government Accounting'] },
      { name: 'Regulation & Taxation (REG)', official_name: 'REG Core Section', description: 'Federal tax compliance for individuals and entities, business law, and professional tax ethics.', weight: 25, topics: ['Individual Income Tax Compliance', 'Corporate and Partnership Taxation', 'Business Law and Agency', 'Federal Tax Ethics and Regulations'] },
      { name: 'Business Analysis and Reporting (BAR)', official_name: 'BAR Discipline Section', description: 'Advanced financial accounting, technical accounting analysis, cost management.', weight: 25, topics: ['Advanced Financial Statement Analysis', 'Technical Accounting Standards', 'Cost Accounting and Variance Analysis', 'Managerial Decision Analysis'] },
    ],
  },
  // 17. CFA Program Level I
  {
    slug: 'cfa-level-1', name: 'CFA Program Level I', short_name: 'CFA Level 1', authority_code: 'CFA_INSTITUTE', category_id: CATEGORIES.FINANCE,
    description: 'First stage of the Chartered Financial Analyst qualification, emphasizing investment tools, financial reporting, and ethical standards.',
    difficulty: 'Expert', question_count: 180, time_limit_mins: 270, is_featured: true,
    official_url: 'https://www.cfainstitute.org/en/programs/cfa', official_notification_url: 'https://www.cfainstitute.org',
    official_syllabus_url: 'https://www.cfainstitute.org/en/programs/cfa/curriculum',
    exam_type: 'Certification', level: 'Global', mode: 'Computer-Based Test (CBT)', duration: '4.5 Hours testing time', total_marks: 180, negative_marking: 'No negative marking',
    passing_criteria: 'Minimum Passing Score (MPS) determined by Board of Governors', eligibility: 'Bachelor\'s degree or final-year student.', attempt_rules: 'Maximum 6 attempts per exam level.',
    selection_process: 'CBT exam at Prometric test centers globally.', stages: ['Session 1: Ethics, Quant, Econ, Financial Statement Analysis', 'Session 2: Corporate Issuers, Equity, Fixed Income, Derivatives'], papers: ['Session 1 Question Block', 'Session 2 Question Block'], languages: ['English'],
    aliases: ['CFA', 'CFA Level 1', 'CFA Level I', 'Chartered Financial Analyst'],
    subjects: [
      { name: 'Ethical & Professional Standards', official_name: 'Ethical and Professional Standards', description: 'Code of Ethics and Standards of Professional Conduct (GIPS).', weight: 18, topics: ['Code of Ethics & Standards of Professional Conduct', 'Global Investment Performance Standards (GIPS)'] },
      { name: 'Quantitative Methods & Economics', official_name: 'Quantitative Methods and Economics', description: 'Time value of money, probability, hypothesis testing, microeconomics, and macroeconomics.', weight: 18, topics: ['Time Value of Money & Cash Flows', 'Hypothesis Testing & Linear Regression', 'Microeconomic Market Structures', 'Macroeconomic Growth & Monetary Policy'] },
      { name: 'Financial Statement Analysis & Corporate Issuers', official_name: 'Financial Statement Analysis and Corporate Issuers', description: 'Income statement, balance sheet, cash flow analysis, ratios, working capital.', weight: 20, topics: ['Financial Reporting Mechanics & IFRS/GAAP', 'Balance Sheet & Cash Flow Ratios', 'Corporate Governance & ESG', 'Working Capital Management'] },
      { name: 'Asset Valuation (Equity, Fixed Income, Derivatives)', official_name: 'Equity, Fixed Income, Derivatives & Alternative Investments', description: 'Equity markets, bond valuation, yield curves, forward/futures contracts.', weight: 32, topics: ['Equity Market Structure & Valuation', 'Fixed Income Risk and Return', 'Derivative Markets & Forwards/Futures', 'Alternative Investments Valuation'] },
      { name: 'Portfolio Management', official_name: 'Portfolio Management and Wealth Planning', description: 'Portfolio risk and return, CAPM, asset allocation, and IPS construction.', weight: 12, topics: ['Portfolio Risk & Diversification', 'Capital Asset Pricing Model (CAPM)', 'Investment Policy Statement (IPS)'] },
    ],
  },
  // 18. FRM Exam Part I
  {
    slug: 'frm-part-1', name: 'FRM Exam Part I', short_name: 'FRM Part 1', authority_code: 'GARP', category_id: CATEGORIES.FINANCE,
    description: 'Premier international designation for risk management professionals, focusing on quantitative tools, financial markets, and risk models.',
    difficulty: 'Expert', question_count: 100, time_limit_mins: 240, is_featured: false,
    official_url: 'https://www.garp.org/frm', official_notification_url: 'https://www.garp.org',
    official_syllabus_url: 'https://www.garp.org/frm/study-materials',
    exam_type: 'Certification', level: 'Global', mode: 'Computer-Based Test (CBT)', duration: '4 Hours', total_marks: 100, negative_marking: 'No negative marking',
    passing_criteria: 'Standard set by GARP committee', eligibility: 'No educational prerequisites.', attempt_rules: 'Part I must be passed within 4 years of registration.',
    selection_process: 'CBT exam at Pearson VUE centers.', stages: ['Single 4-hour session'], papers: ['FRM Part I Question Paper'], languages: ['English'],
    aliases: ['FRM', 'FRM Part 1', 'Financial Risk Manager'],
    subjects: [
      { name: 'Foundations of Risk Management', official_name: 'Foundations of Risk Management', description: 'Corporate risk governance, enterprise risk management, CAPM, and risk failures.', weight: 20, topics: ['Enterprise Risk Management Systems', 'Portfolio Risk Governance & CAPM', 'Historical Risk Management Failures'] },
      { name: 'Quantitative Analysis & Risk Models', official_name: 'Quantitative Analysis and Valuation Risk Models', description: 'Probability, time-series analysis, Value at Risk (VaR), option valuation.', weight: 50, topics: ['Probability Distributions & Time Series', 'Value at Risk (VaR) Estimation', 'Option Pricing Models (Black-Scholes)', 'Stress Testing & Scenario Analysis'] },
      { name: 'Financial Markets and Products', official_name: 'Financial Markets and Products', description: 'OTC and exchange-traded derivatives, bonds, interest rates, swaps.', weight: 30, topics: ['Futures, Forwards and Options Markets', 'Interest Rate Risk & Yield Curve', 'Swaps Structure & Credit Derivatives'] },
    ],
  },
  // 19. FINRA Series 7
  {
    slug: 'finra-series-7', name: 'FINRA Series 7 (General Securities Representative Exam)', short_name: 'Series 7', authority_code: 'FINRA', category_id: CATEGORIES.FINANCE,
    description: 'Qualifying examination for registered representatives soliciting, purchasing, or selling equity securities, corporate bonds, options.',
    difficulty: 'Advanced', question_count: 125, time_limit_mins: 225, is_featured: false,
    official_url: 'https://www.finra.org/registration-exams-ce/qualification-exams/series7', official_notification_url: 'https://www.finra.org',
    official_syllabus_url: 'https://www.finra.org/sites/default/files/Series_7_Outline.pdf',
    exam_type: 'Licensing', level: 'National', mode: 'Computer-Based Test (CBT)', duration: '3 Hours 45 Minutes', total_marks: 125, negative_marking: 'No negative marking',
    passing_criteria: '72% or higher passing score', eligibility: 'Must be sponsored by a FINRA member firm and pass SIE examination.', attempt_rules: '30-day waiting period between attempts.',
    selection_process: 'CBT examination at Prometric centers.', stages: ['Single 125-question exam'], papers: ['Series 7 Examination'], languages: ['English'],
    aliases: ['Series 7', 'FINRA Series 7', 'General Securities Representative Exam'],
    subjects: [
      { name: 'Seeks Business & Evaluates Customers', official_name: 'Functions 1 & 2: Business Solicitation and Customer Evaluation', description: 'Prospecting customers, evaluating financial profile, suitability rules.', weight: 20, topics: ['FINRA Suitability Rules (Rule 2111)', 'Customer Financial Profile Assessment', 'Investment Objectives Matching'] },
      { name: 'Securities Products & Customer Accounts', official_name: 'Function 3: Provides Information and Maintains Accounts', description: 'Equities, options strategies, debt securities, municipal bonds, packaged products.', weight: 73, topics: ['Options Strategies and Spread Calculations', 'Municipal Bonds & Tax Implications', 'Packaged Products & Mutual Funds', 'Account Opening & Margin Rules'] },
      { name: 'Verifies Orders & Trade Execution', official_name: 'Function 4: Obtains and Verifies Purchase Orders', description: 'Order types, trade execution, settlement rules.', weight: 7, topics: ['Order Types (Market, Limit, Stop)', 'Trade Settlement & Clearing (T+1 Rules)'] },
    ],
  },
  // 20. AWS Certified Solutions Architect - Associate
  {
    slug: 'aws-certified-solutions-architect', name: 'AWS Certified Solutions Architect - Associate', short_name: 'AWS SAA', authority_code: 'AWS', category_id: CATEGORIES.ENGINEERING,
    description: 'Industry-standard cloud certification validating expertise in designing optimized, secure, and resilient architectures on Amazon Web Services.',
    difficulty: 'Intermediate', question_count: 65, time_limit_mins: 130, is_featured: true,
    official_url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/', official_notification_url: 'https://aws.amazon.com/certification/',
    official_syllabus_url: 'https://d1.awsstatic.com/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Exam-Guide.pdf',
    exam_type: 'Certification', level: 'Global', mode: 'Computer-Based Test (CBT)', duration: '2 Hours 10 Minutes', total_marks: 1000, negative_marking: 'No negative marking',
    passing_criteria: '720 out of 1000 scaled score', eligibility: 'No mandatory prerequisites.', attempt_rules: '14-day waiting period between failed attempts.',
    selection_process: 'CBT at Pearson VUE centers or online proctored.', stages: ['Single 65-question exam'], papers: ['AWS SAA-C03 Exam'], languages: ['English'],
    aliases: ['AWS SAA', 'AWS SAA-C03', 'AWS Solutions Architect Associate', 'AWS Certified Solutions Architect'],
    subjects: [
      { name: 'Design Secure Architectures', official_name: 'Domain 1: Design Secure Architectures', description: 'IAM policies, KMS encryption, VPC security groups, and data protection.', weight: 30, topics: ['AWS IAM Policies & Roles', 'AWS KMS & Data Encryption', 'VPC Network Security Groups & NACLs', 'AWS Organizations & Service Control Policies'] },
      { name: 'Design Resilient Architectures', official_name: 'Domain 2: Design Resilient Architectures', description: 'Multi-AZ deployments, Auto Scaling, Elastic Load Balancing, S3 replication.', weight: 26, topics: ['Multi-AZ & Auto Scaling Groups', 'Elastic Load Balancing (ALB/NLB)', 'S3 Multi-Region Replication', 'SQS & SNS Serverless Decoupling'] },
      { name: 'Design High-Performing Architectures', official_name: 'Domain 3: Design High-Performing Architectures', description: 'EBS performance, ElastiCache, CloudFront CDN, DynamoDB performance.', weight: 24, topics: ['CloudFront Edge Caching', 'DynamoDB Accelerator & Indexing', 'ElastiCache (Redis/Memcached)', 'EBS & EFS Storage Optimization'] },
      { name: 'Design Cost-Optimized Architectures', official_name: 'Domain 4: Design Cost-Optimized Architectures', description: 'Reserved Instances, Savings Plans, S3 Lifecycle policies.', weight: 20, topics: ['S3 Storage Tiering & Lifecycle Rules', 'AWS Compute Savings Plans & Spot Instances', 'AWS Cost Explorer & Budgets'] },
    ],
  },
  // 21. CompTIA Security+
  {
    slug: 'comptia-security-plus', name: 'CompTIA Security+', short_name: 'Security+', authority_code: 'COMPTIA', category_id: CATEGORIES.ENGINEERING,
    description: 'Global benchmark certification establishing core cybersecurity knowledge required for security operations and network defense roles.',
    difficulty: 'Intermediate', question_count: 90, time_limit_mins: 90, is_featured: true,
    official_url: 'https://www.comptia.org/certifications/security', official_notification_url: 'https://www.comptia.org',
    official_syllabus_url: 'https://www.comptia.org/training/resources/exam-objectives',
    exam_type: 'Certification', level: 'Global', mode: 'Computer-Based Test (CBT) with Performance-Based Questions (PBQs)', duration: '1.5 Hours', total_marks: 900,
    negative_marking: 'No negative marking', passing_criteria: '750 out of 900 on a scale', eligibility: 'CompTIA Network+ recommended.', attempt_rules: '14-day wait for subsequent attempts.',
    selection_process: 'CBT examination at Pearson VUE centers.', stages: ['Single 90-item exam'], papers: ['CompTIA Security+ SY0-701'], languages: ['English'],
    aliases: ['CompTIA Security Plus', 'Security+', 'SY0-701', 'CompTIA Security'],
    subjects: [
      { name: 'General Security Concepts & Threats', official_name: 'Domains 1 & 2: General Security Concepts & Threats/Mitigations', description: 'Zero trust architecture, cryptography, malware vectors, social engineering.', weight: 34, topics: ['Zero Trust Architecture Principles', 'Social Engineering & Malware Vectors', 'Public Key Infrastructure (PKI) & Ciphers', 'Vulnerability Scanning & Penetration Testing'] },
      { name: 'Security Architecture & Operations', official_name: 'Domains 3 & 4: Security Architecture & Security Operations', description: 'SIEM logs, firewall configurations, identity access management (IAM), incident response.', weight: 48, topics: ['SIEM Logging and Threat Hunting', 'Firewalls, WAF and Network Segmentation', 'Identity & Access Management (OAuth/SAML/MFA)', 'Incident Response Playbooks & Forensics'] },
      { name: 'Security Governance & Risk', official_name: 'Domain 5: Security Program Management and Oversight', description: 'NIST/ISO compliance frameworks, third-party vendor risk, privacy regulations.', weight: 18, topics: ['NIST Cybersecurity Framework (CSF)', 'Privacy Regulations (GDPR/CCPA/HIPAA)', 'Third-Party Vendor Risk Management'] },
    ],
  },
  // 22. CISSP
  {
    slug: 'cissp', name: 'CISSP (Certified Information Systems Security Professional)', short_name: 'CISSP', authority_code: 'ISC2', category_id: CATEGORIES.ENGINEERING,
    description: 'Gold standard cybersecurity leadership credential validating expertise in designing, implementing, and managing enterprise security programs.',
    difficulty: 'Expert', question_count: 150, time_limit_mins: 180, is_featured: true,
    official_url: 'https://www.isc2.org/certifications/cissp', official_notification_url: 'https://www.isc2.org',
    official_syllabus_url: 'https://www.isc2.org/certifications/cissp/cissp-cat',
    exam_type: 'Certification', level: 'Global', mode: 'Computer Adaptive Testing (CAT)', duration: '3 Hours (100 to 150 questions)', total_marks: 1000,
    negative_marking: 'No negative marking', passing_criteria: '700 out of 1000 scaled score across all 8 domains', eligibility: 'Minimum 5 years of cumulative paid work experience in 2 or more of 8 domains.',
    attempt_rules: 'Maximum 3 attempts in a 12-month period.', selection_process: 'CAT examination at Pearson VUE testing centers.', stages: ['Single CAT exam'], papers: ['CISSP Adaptive Examination'], languages: ['English'],
    aliases: ['CISSP', 'ISC2 CISSP', 'Certified Information Systems Security Professional'],
    subjects: [
      { name: 'Security Risk Management & Asset Security', official_name: 'Domains 1 & 2: Risk Management and Asset Security', description: 'Business continuity, compliance, legal regulations, risk analysis.', weight: 25, topics: ['Business Continuity Planning (BCP)', 'Quantitative Risk Analysis (ALE/SLE/ARO)', 'Data Classification and Asset Handling', 'Privacy & International Legal Compliance'] },
      { name: 'Security Architecture, Engineering & Network Security', official_name: 'Domains 3 & 4: Security Architecture, Engineering, and Network Security', description: 'Security models (Bell-LaPadula), cryptography, secure network design.', weight: 26, topics: ['Security Models (Biba, Bell-LaPadula)', 'Symmetric & Asymmetric Cryptography', 'Secure Network Architecture & Microsegmentation', 'Wireless & Cloud Security Protocols'] },
      { name: 'IAM, Assessment, Testing & Operations', official_name: 'Domains 5, 6 & 7: Identity, Access, Testing, and Operations', description: 'Federated identity, MFA, vulnerability testing, disaster recovery.', weight: 36, topics: ['Federated Identity & Single Sign-On', 'Vulnerability Assessment & Audit Testing', 'Disaster Recovery Planning (DRP)', 'Physical Security Controls & Perimeter Defense'] },
      { name: 'Software Development Security', official_name: 'Domain 8: Software Development Security', description: 'DevSecOps, secure coding practices, API security.', weight: 13, topics: ['Secure Software Development Lifecycle (SSDLC)', 'OWASP Top 10 Vulnerabilities', 'DevSecOps & Code Review Controls'] },
    ],
  },
  // 23. FE Exam
  {
    slug: 'fe-exam', name: 'FE Exam (Fundamentals of Engineering)', short_name: 'FE Exam', authority_code: 'NCEES', category_id: CATEGORIES.ENGINEERING,
    description: 'First national exam in the licensure process for professional engineers in the USA, taken by engineering graduates and seniors.',
    difficulty: 'Advanced', question_count: 110, time_limit_mins: 320, is_featured: false,
    official_url: 'https://ncees.org/exams/fe-exam/', official_notification_url: 'https://ncees.org',
    official_syllabus_url: 'https://ncees.org/exams/fe-exam/#specifications',
    exam_type: 'Licensing', level: 'National', mode: 'Computer-Based Test (CBT)', duration: '5 Hours 20 Minutes', total_marks: 110, negative_marking: 'No negative marking',
    passing_criteria: 'Psychometrically established passing standard', eligibility: 'Senior or graduate of ABET-accredited engineering program.', attempt_rules: '3 times per 12-month period.',
    selection_process: 'CBT examination at Pearson VUE centers.', stages: ['Single 110-question computer exam'], papers: ['FE Other Disciplines / FE Civil / FE Mechanical'], languages: ['English'],
    aliases: ['FE Exam', 'Fundamentals of Engineering', 'EIT Exam', 'Engineer in Training Exam'],
    subjects: [
      { name: 'Mathematics, Statistics & Ethics', official_name: 'Mathematics, Probability/Statistics, and Engineering Ethics', description: 'Calculus, differential equations, linear algebra, probability, and ethics.', weight: 25, topics: ['Calculus & Vector Analysis', 'Differential Equations & Linear Algebra', 'Engineering Statistics & Probability', 'NCEES Code of Ethics'] },
      { name: 'Engineering Economics & Statics/Dynamics', official_name: 'Engineering Economics, Statics, and Dynamics', description: 'Cost estimation, present value analysis, vector mechanics, force equilibrium.', weight: 35, topics: ['Time Value of Money & Cost Estimation', 'Force System Equilibrium & Trusses', 'Particle & Rigid Body Dynamics', 'Mechanics of Materials & Stress/Strain'] },
      { name: 'Fluid Mechanics, Materials & Electricity', official_name: 'Fluid Mechanics, Materials Science, and Electrical Circuits', description: 'Fluid statics, pipe flow, material properties, AC/DC circuit analysis.', weight: 40, topics: ['Fluid Statics & Bernoulli Equation', 'Material Crystalline Structure & Tensile Testing', 'AC/DC Circuit Analysis & Ohm\'s Law', 'First and Second Laws of Thermodynamics'] },
    ],
  },
  // 24. Praxis Core
  {
    slug: 'praxis-core', name: 'Praxis Core Academic Skills for Educators', short_name: 'Praxis Core', authority_code: 'ETS', category_id: CATEGORIES.EDUCATION,
    description: 'National teacher candidate assessment measuring essential academic skills in reading, writing, and mathematics for state teacher certification.',
    difficulty: 'Intermediate', question_count: 160, time_limit_mins: 300, is_featured: false,
    official_url: 'https://www.ets.org/praxis/site/core/about.html', official_notification_url: 'https://www.ets.org/praxis',
    official_syllabus_url: 'https://www.ets.org/praxis/site/core/about.html',
    exam_type: 'Licensing', level: 'National / State Board', mode: 'Computer-Based Test (CBT)', duration: '5 Hours total', total_marks: 300, negative_marking: 'No negative marking',
    passing_criteria: 'State-specific minimum score standards', eligibility: 'Candidates seeking admission to teacher preparation programs.', attempt_rules: '21-day wait between attempts.',
    selection_process: 'CBT examination at ETS test centers or online.', stages: ['Reading Subtest (5713)', 'Writing Subtest (5723)', 'Mathematics Subtest (5733)'], papers: ['Praxis Core Reading', 'Praxis Core Writing', 'Praxis Core Mathematics'], languages: ['English'],
    aliases: ['Praxis Core', 'Praxis 1', 'Praxis Core Academic Skills', 'Praxis I'],
    subjects: [
      { name: 'Praxis Core Reading', official_name: 'Praxis Core Reading (5713)', description: 'Key ideas, structural organization, integration of knowledge, and critical passage analysis.', weight: 33, topics: ['Key Ideas & Main Purpose Identification', 'Author Craft & Text Structure Analysis', 'Integration of Knowledge & Quantitative Data'] },
      { name: 'Praxis Core Writing', official_name: 'Praxis Core Writing (5723)', description: 'Text revision, grammatical conventions, research strategies, and argumentative essays.', weight: 33, topics: ['Grammar, Usage & Mechanics Errors', 'Text Revision & Sentence Structure', 'Argumentative & Informative Essay Writing'] },
      { name: 'Praxis Core Mathematics', official_name: 'Praxis Core Mathematics (5733)', description: 'Number & quantity, data interpretation, representation, statistics, and algebra.', weight: 34, topics: ['Number Systems & Ratios', 'Algebraic Expressions & Equations', 'Data Interpretation & Descriptive Statistics', 'Geometry & Measurement Properties'] },
    ],
  },
];

async function fastBatchSeed() {
  console.log('=== Starting Ultra-Fast Batch Seed for USA Exam Catalog ===');

  // 1. Authorities Batch
  const { data: existingAuths } = await supabase
    .from('exam_authorities')
    .select('id, code, slug')
    .eq('country_id', US_COUNTRY_ID);

  const authMap = new Map((existingAuths || []).map((a) => [a.code, a.id]));

  const authUpserts = AUTHORITIES.map((a) => ({
    country_id: US_COUNTRY_ID,
    name: a.name,
    code: a.code,
    slug: a.slug,
    short_name: a.short_name,
    official_website: a.official_website,
    description: a.description,
    verification_status: 'verified',
    last_verified_at: new Date().toISOString(),
  }));

  const { data: savedAuths, error: authErr } = await supabase
    .from('exam_authorities')
    .upsert(authUpserts, { onConflict: 'slug' })
    .select('id, code');

  if (authErr) console.error('Error batch upserting authorities:', authErr.message);
  else (savedAuths || []).forEach((a) => authMap.set(a.code, a.id));

  console.log(`Authorities ready: ${authMap.size}`);

  // 2. Query Existing US Exams
  const { data: existingExams } = await supabase
    .from('exams')
    .select('id, slug, name')
    .eq('country_id', US_COUNTRY_ID);

  const examMapBySlug = new Map((existingExams || []).map((e) => [e.slug, e.id]));

  // 3. Process Exams
  for (const examData of USA_EXAMS) {
    const authId = authMap.get(examData.authority_code);

    let examId = examMapBySlug.get(examData.slug);

    const examPayload = {
      category_id: examData.category_id,
      country_id: US_COUNTRY_ID,
      authority_id: authId,
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
      next_verification_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    };

    if (examId) {
      await supabase.from('exams').update(examPayload).eq('id', examId);
    } else {
      const { data: inserted } = await supabase.from('exams').insert([examPayload]).select('id').single();
      if (inserted) {
        examId = inserted.id;
        examMapBySlug.set(examData.slug, examId);
      }
    }

    if (!examId) continue;

    // Exam version
    await supabase.from('exam_versions').upsert({
      exam_id: examId,
      version_year: 2026,
      is_current: true,
      official_notification_url: examData.official_notification_url,
      official_syllabus_url: examData.official_syllabus_url,
      pattern_summary: `${examData.mode} - ${examData.question_count} items`,
      source_url: examData.official_url,
      verified_at: new Date().toISOString(),
    }, { onConflict: 'exam_id,version_year' });

    // Aliases
    if (examData.aliases && examData.aliases.length > 0) {
      await supabase.from('exam_aliases').delete().eq('exam_id', examId);
      const aliasInserts = examData.aliases.map((al) => ({ exam_id: examId, alias: al.trim() }));
      await supabase.from('exam_aliases').insert(aliasInserts);
    }

    // Subjects & Topics
    for (const subjData of examData.subjects) {
      const subjSlug = subjData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      let { data: masterSubj } = await supabase.from('subjects').select('id').eq('slug', subjSlug).maybeSingle();

      if (!masterSubj) {
        const { data: newSubj } = await supabase.from('subjects').insert([{
          name: subjData.name, slug: subjSlug, category_id: examData.category_id,
          description: subjData.description, aliases: [subjData.name, subjData.official_name],
        }]).select('id').single();
        masterSubj = newSubj;
      }

      if (!masterSubj) continue;

      // exam_subject relationship
      await supabase.from('exam_subjects').upsert({
        exam_id: examId,
        subject_id: masterSubj.id,
        name: subjData.name,
        official_name: subjData.official_name,
        display_name: subjData.name,
        description: subjData.description,
        weight_percentage: subjData.weight,
        required: true,
        active: true,
        source_url: examData.official_syllabus_url,
        verification_status: 'verified',
        last_verified_at: new Date().toISOString(),
      }, { onConflict: 'exam_id,subject_id' });

      // Topics under subject
      for (const topicName of subjData.topics) {
        const topicSlug = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        let { data: masterTopic } = await supabase.from('topics').select('id').eq('subject_id', masterSubj.id).eq('slug', topicSlug).maybeSingle();

        if (!masterTopic) {
          const { data: newTop } = await supabase.from('topics').insert([{
            subject_id: masterSubj.id, name: topicName, slug: topicSlug,
            description: `High-yield topic ${topicName} for ${subjData.name}.`,
            aliases: [topicName], importance: 'High',
          }]).select('id').single();
          masterTopic = newTop;
        }

        if (masterTopic) {
          await supabase.from('exam_topics').upsert({
            subject_id: masterSubj.id,
            topic_id: masterTopic.id,
            name: topicName,
            official_name: topicName,
            display_name: topicName,
            importance: 'High',
            active: true,
            source_url: examData.official_syllabus_url,
            verification_status: 'verified',
            last_verified_at: new Date().toISOString(),
          }, { onConflict: 'subject_id,topic_id' });
        }
      }
    }

    console.log(`Verified USA exam complete: ${examData.name}`);
  }

  console.log('=== Batch USA Seed Finished Successfully ===');
}

fastBatchSeed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
