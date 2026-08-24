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

async function runRemaining8() {
  console.log('=== SEEDING REMAINING 8 INDIA BATCH 2 EXAMS ===\n');

  // 1. Fetch Country & Category dependencies
  const { data: countries } = await supabase.from('countries').select('id, iso2').eq('iso2', 'IN');
  const indiaId = countries?.[0]?.id;

  const { data: categories } = await supabase.from('exam_categories').select('id, slug');
  const catMap = {};
  categories.forEach(c => { catMap[c.slug] = c.id; });

  const { data: allAuthorities } = await supabase.from('exam_authorities').select('id, code');
  const authMap = {};
  allAuthorities.forEach(a => { authMap[a.code] = a.id; });

  const { data: allSubjects } = await supabase.from('subjects').select('id, slug, name');
  const subjMap = {};
  allSubjects.forEach(s => { subjMap[s.slug] = s.id; });

  const { data: allTopics } = await supabase.from('topics').select('id, slug, name, subject_id, importance, description');

  const remainingExams = [
    {
      name: 'ICAG Assistant Audit Officer (CAG AAO)',
      slug: 'icag-assistant-audit-officer',
      short_name: 'ICAG AAO',
      category: 'civil-services-govt',
      authority: 'CAG',
      description: 'Specialized gazetted Group B officer competitive exam for appointment as Assistant Audit Officer / Assistant Accounts Officer in the Indian Audit and Accounts Department under CAG.',
      official_url: 'https://cag.gov.in',
      official_notification_url: 'https://cag.gov.in/en/page-recruitment',
      official_syllabus_url: 'https://cag.gov.in',
      exam_type: 'Gazetted Audit Officer Recruitment',
      level: 'National',
      mode: 'Tier 1 CBT + Tier 2 CBT (Paper 1 & Paper 3 Financial Audit)',
      frequency: 'Annually',
      duration: 'Tier 1: 60 mins; Tier 2 Paper 3: 120 mins',
      total_questions: 100,
      total_marks: 200,
      negative_marking: 'Tier 1: -0.50 marks; Tier 2 Paper 3: -0.50 marks deduction',
      passing_criteria: 'High combined cutoff in SSC CGL Tier 1 and Tier 2 Paper 3 (Finance & Economics) for final appointment.',
      eligibility: 'Bachelor’s Degree from recognized university. Desirable: Chartered Accountant / Cost Management Accountant / M.Com. Age: Up to 30 years.',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Online registration via ssc.gov.in (AAO cadres under CAG).',
      selection_process: 'Tier-1 CBT -> Tier-2 CBT Paper-1 (Maths/Reasoning/English/GA) + Paper-3 (General Studies: Finance & Economics) -> DV.',
      stages: [
        { name: 'Tier-1 CBT Examination', type: 'Objective CBT', questions: 100, duration: '60 mins', marks: 200 },
        { name: 'Tier-2 Paper-3: Finance & Economics', type: 'Specialized Domain CBT', questions: 100, duration: '120 mins', marks: 200 }
      ],
      papers: [
        { paper_number: 1, title: 'Tier-1 Composite Exam', total_questions: 100, total_marks: 200, duration_minutes: 60 },
        { paper_number: 2, title: 'Tier-2 Paper-3 Finance & Economics (Financial Accounting 80 Marks, Economics & Governance 120 Marks)', total_questions: 100, total_marks: 200, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'auditing-accounting-standards', official: 'Financial Accounting & Auditing Standards', weightage: 40 },
        { slug: 'economic-social-issues', official: 'Economics, Macroeconomics & Public Finance', weightage: 30 },
        { slug: 'english-language-comprehension', official: 'English Language & Comprehension', weightage: 15 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude & Statistics', weightage: 15 }
      ],
      aliases: ['CAG AAO', 'ICAG AAO', 'Assistant Audit Officer', 'CAG Assistant Accounts Officer', 'SSC CGL AAO 2026']
    },
    {
      name: 'FSSAI Technical Officer & Central Food Safety Officer',
      slug: 'fssai-technical-officer',
      short_name: 'FSSAI TO / CFSO',
      category: 'medical-healthcare',
      authority: 'FSSAI',
      description: 'National statutory competitive examination conducted by FSSAI for recruitment of Technical Officers and Central Food Safety Officers across regional offices and ports.',
      official_url: 'https://fssai.gov.in',
      official_notification_url: 'https://fssai.gov.in/jobs.php',
      official_syllabus_url: 'https://fssai.gov.in',
      exam_type: 'Statutory Food Officer Recruitment',
      level: 'National',
      mode: 'CBT Stage-1 + CBT Stage-2 / Interview',
      frequency: 'Periodic Recruitment Cycle',
      duration: 'Stage-1: 150 minutes; Stage-2: 180 minutes',
      total_questions: 120,
      total_marks: 400,
      negative_marking: '+4 marks for correct answer, -1 mark deduction per incorrect answer',
      passing_criteria: '50% weightage for CBT Stage 1 and 50% for CBT Stage 2 determining final selection.',
      eligibility: 'Master’s degree in Chemistry/Biochemistry/Microbiology/Food Technology/Dairy Technology or Degree in Veterinary Sciences. Age: Up to 30 years.',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Online portal registration at fssai.gov.in.',
      selection_process: 'CBT Stage-1 (120 MCQs) -> CBT Stage-2 (Descriptive & Technical CBT) -> Document Verification.',
      stages: [
        { name: 'CBT Stage-1 Examination', type: 'Objective CBT', questions: 120, duration: '150 mins', marks: 400 },
        { name: 'CBT Stage-2 Technical Examination', type: 'Domain CBT', questions: 80, duration: '180 mins', marks: 400 }
      ],
      papers: [
        { paper_number: 1, title: 'Stage-1 CBT Paper (General Aptitude 40 Qs + Functional Knowledge 80 Qs)', total_questions: 120, total_marks: 400, duration_minutes: 150 }
      ],
      languages: ['English'],
      subjects: [
        { slug: 'food-science-safety-standards', official: 'FSSA Act 2006, Rules, Regulations & Food Safety Standards', weightage: 50 },
        { slug: 'general-science-technology', official: 'Food Chemistry, Microbiology & Hygiene Principles', weightage: 25 },
        { slug: 'computer-knowledge-aptitude', official: 'Computer Literacy & IT Applications', weightage: 12 },
        { slug: 'reasoning-ability', official: 'General Intelligence and General Awareness', weightage: 13 }
      ],
      aliases: ['FSSAI TO', 'FSSAI Technical Officer', 'FSSAI CFSO', 'Central Food Safety Officer', 'FSSAI Exam 2026']
    },
    {
      name: 'UPPSC PCS (Combined State / Upper Subordinate Services)',
      slug: 'uppsc-pcs',
      short_name: 'UPPSC PCS',
      category: 'civil-services-govt',
      authority: 'UPPSC',
      description: 'Premier state civil services competitive examination conducted by UPPSC for selecting Deputy Collectors, DSPs, Block Development Officers, and Treasury Officers in Uttar Pradesh.',
      official_url: 'https://uppsc.up.nic.in',
      official_notification_url: 'https://uppsc.up.nic.in/Notifications.aspx',
      official_syllabus_url: 'https://uppsc.up.nic.in',
      exam_type: 'State Civil Service Examination',
      level: 'State',
      mode: 'Offline OMR (Prelims) + Mains Conventional Written (6 GS Papers + Hindi + Essay) + Interview',
      frequency: 'Annually',
      duration: 'Prelims: 4 hours total; Mains: 8 descriptive papers of 3 hours each',
      total_questions: 150,
      total_marks: 1600,
      negative_marking: '1/3rd (0.33) marks deducted per wrong answer in Prelims GS Paper I',
      passing_criteria: 'Prelims GS-1 cutoff qualifies for Mains (GS-2 CSAT qualifying 33%); Mains (1500 Marks) + Interview (100 Marks) determine state rank.',
      eligibility: 'Bachelor’s degree in any discipline from a recognized university. Age: 21–40 years.',
      attempt_rules: 'No cap on attempts within age limit of 40 years (relaxations for UP reserved categories).',
      application_information: 'Online application via UPPSC OTR (One Time Registration) portal at uppsc.up.nic.in.',
      selection_process: 'Preliminary Exam (2 Papers) -> Main Written Examination (8 Papers) -> Personality Test / Interview (100 Marks).',
      stages: [
        { name: 'Preliminary Examination (GS-1 & CSAT)', type: 'Objective OMR', questions: 250, duration: '240 mins', marks: 400 },
        { name: 'Main Written Examination', type: 'Conventional Descriptive (8 Papers)', questions: 0, duration: '24 hours', marks: 1500 },
        { name: 'Personality Test', type: 'Board Interview', questions: 0, duration: '25 mins', marks: 100 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims General Studies Paper-I', total_questions: 150, total_marks: 200, duration_minutes: 120 },
        { paper_number: 2, title: 'Prelims CSAT Paper-II (Qualifying 33%)', total_questions: 100, total_marks: 200, duration_minutes: 120 },
        { paper_number: 3, title: 'Mains GS Paper V (UP Special GS)', total_questions: 20, total_marks: 200, duration_minutes: 180 },
        { paper_number: 4, title: 'Mains GS Paper VI (UP Economy & Geography)', total_questions: 20, total_marks: 200, duration_minutes: 180 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'indian-polity-governance', official: 'Indian Polity, Governance and Constitution', weightage: 20 },
        { slug: 'indian-history-national-movement', official: 'History of India and Indian National Movement', weightage: 20 },
        { slug: 'indian-world-geography', official: 'Indian & World Geography and UP Geography', weightage: 18 },
        { slug: 'environmental-ecology-biodiversity', official: 'Environment, Ecology and General Science', weightage: 17 },
        { slug: 'general-hindi-language', official: 'General Hindi & UP State Special GS', weightage: 25 }
      ],
      aliases: ['UPPSC PCS', 'UP PCS', 'Uttar Pradesh PCS', 'UP Civil Services', 'UPPSC 2026', 'Combined Upper Subordinate Services']
    },
    {
      name: 'MPPSC State Service Exam (Prelims & Mains)',
      slug: 'mppsc-prelims',
      short_name: 'MPPSC SSE',
      category: 'civil-services-govt',
      authority: 'MPPSC',
      description: 'State level competitive examination conducted by MPPSC for selecting State Administrative Officers, Deputy Superintendent of Police, and Commercial Tax Officers in Madhya Pradesh.',
      official_url: 'https://mppsc.mp.gov.in',
      official_notification_url: 'https://mppsc.mp.gov.in/Advertisement',
      official_syllabus_url: 'https://mppsc.mp.gov.in',
      exam_type: 'State Administrative Service Recruitment',
      level: 'State',
      mode: 'Offline OMR (Prelims) + Mains Written Descriptive + Personality Test',
      frequency: 'Annually',
      duration: 'Prelims: 4 hours (Paper 1: 2 hrs, Paper 2: 2 hrs)',
      total_questions: 200,
      total_marks: 1575,
      negative_marking: 'NO negative marking in MPPSC Prelims examination',
      passing_criteria: 'Prelims Paper 1 marks shortlist candidates for Mains (Paper 2 is qualifying for SSE); Mains (1400 Marks) + Interview (175 Marks) determine rank.',
      eligibility: 'Bachelor’s Degree in any discipline from a recognized University. Age: 21–40 years.',
      attempt_rules: 'No attempt cap within prescribed age bracket.',
      application_information: 'Online application via mppsc.mp.gov.in.',
      selection_process: 'Preliminary Examination (400 Marks) -> Main Written Examination (1400 Marks) -> Interview (175 Marks).',
      stages: [
        { name: 'Preliminary Examination (Paper 1 GS & Paper 2 CSAT)', type: 'Objective OMR', questions: 200, duration: '240 mins', marks: 400 },
        { name: 'Main Written Examination', type: 'Conventional Written', questions: 0, duration: '18 hours', marks: 1400 },
        { name: 'Personality Test', type: 'Interview Board', questions: 0, duration: '25 mins', marks: 175 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims Paper-1: General Studies (MP Special GS, History, Polity, Geography)', total_questions: 100, total_marks: 200, duration_minutes: 120 },
        { paper_number: 2, title: 'Prelims Paper-2: General Aptitude Test (CSAT)', total_questions: 100, total_marks: 200, duration_minutes: 120 }
      ],
      languages: ['Hindi', 'English'],
      subjects: [
        { slug: 'indian-history-national-movement', official: 'History, Culture & Heritage of MP & India', weightage: 30 },
        { slug: 'indian-world-geography', official: 'Geography of MP, India and World', weightage: 20 },
        { slug: 'indian-polity-governance', official: 'Constitutional System & Economy of MP & India', weightage: 20 },
        { slug: 'general-science-technology', official: 'General Science and Environment & ICT', weightage: 15 },
        { slug: 'general-hindi-language', official: 'General Hindi & Hindi Essay (Mains)', weightage: 15 }
      ],
      aliases: ['MPPSC', 'MPPSC SSE', 'MP State Service Exam', 'MPPSC Prelims', 'MPPSC 2026', 'MP Administrative Service']
    },
    {
      name: 'BPSC Combined Competitive Examination (CCE)',
      slug: 'bpsc-ccce',
      short_name: 'BPSC CCE',
      category: 'civil-services-govt',
      authority: 'BPSC',
      description: 'Premier state civil service recruitment examination conducted by Bihar Public Service Commission for selecting Sub-Divisional Officers, DSPs, Bihar Administrative Service officers, and Block Panchayat Raj Officers.',
      official_url: 'https://bpsc.bih.nic.in',
      official_notification_url: 'https://bpsc.bih.nic.in',
      official_syllabus_url: 'https://bpsc.bih.nic.in',
      exam_type: 'State Civil Service Recruitment',
      level: 'State',
      mode: 'Offline OMR (Prelims) + Mains Conventional Written + Interview',
      frequency: 'Annually',
      duration: 'Prelims: 120 minutes (2 hours)',
      total_questions: 150,
      total_marks: 1120,
      negative_marking: '-1/3rd (0.33) marks deducted per wrong answer (+1 for correct)',
      passing_criteria: 'Prelims cutoff qualifies for Mains (900 Marks: GS-1 300, GS-2 300, Essay 300); Mains + Interview (120 Marks) decide final merit.',
      eligibility: 'Bachelor’s degree in any discipline from a recognized university. Age: 20/21/22 to 37 years (Male) / 40 years (Female).',
      attempt_rules: 'Standard category age relaxations apply for Bihar domicile candidates.',
      application_information: 'Online portal application via onlinebpsc.bihar.gov.in using OTR.',
      selection_process: 'Preliminary Examination (150 Marks OMR) -> Main Written Exam (900 Marks) -> Oral Interview (120 Marks).',
      stages: [
        { name: 'Preliminary Examination (GS Composite)', type: 'Objective OMR', questions: 150, duration: '120 mins', marks: 150 },
        { name: 'Main Written Examination', type: 'Descriptive Written', questions: 0, duration: '9 hours', marks: 900 },
        { name: 'Personality Test', type: 'Interview Board', questions: 0, duration: '25 mins', marks: 120 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims Composite General Studies Paper', total_questions: 150, total_marks: 150, duration_minutes: 120 },
        { paper_number: 2, title: 'Mains GS Paper-I (History, Modern India, Current Affairs, Statistics)', total_questions: 8, total_marks: 300, duration_minutes: 180 },
        { paper_number: 3, title: 'Mains GS Paper-II (Polity, Economy, Geography, Science & Tech)', total_questions: 8, total_marks: 300, duration_minutes: 180 },
        { paper_number: 4, title: 'Mains Essay Paper', total_questions: 3, total_marks: 300, duration_minutes: 180 }
      ],
      languages: ['Hindi', 'English'],
      subjects: [
        { slug: 'indian-history-national-movement', official: 'History of India & History of Bihar', weightage: 30 },
        { slug: 'current-affairs-national-international', official: 'Current Affairs of National & International Importance', weightage: 25 },
        { slug: 'general-science-technology', official: 'General Science & Technology Role in Development', weightage: 20 },
        { slug: 'indian-polity-governance', official: 'Indian Polity & Economy with Bihar Special Focus', weightage: 15 },
        { slug: 'quantitative-aptitude', official: 'Mental Ability & Statistical Analysis', weightage: 10 }
      ],
      aliases: ['BPSC CCE', 'BPSC Prelims', '70th BPSC', '71st BPSC', 'Bihar Public Service Commission', 'BPSC Civil Services']
    },
    {
      name: 'WBCS Executive (West Bengal Civil Service Examination)',
      slug: 'wbcs-executive',
      short_name: 'WBCS Executive',
      category: 'civil-services-govt',
      authority: 'WBPSC',
      description: 'Premier state civil service examination conducted by West Bengal Public Service Commission for recruitment to West Bengal Civil Service (Executive), WB Police Service, Commercial Tax Officer, and Joint BDO.',
      official_url: 'https://psc.wb.gov.in',
      official_notification_url: 'https://psc.wb.gov.in/notices.jsp',
      official_syllabus_url: 'https://psc.wb.gov.in',
      exam_type: 'State Civil Service Examination',
      level: 'State',
      mode: 'Offline OMR (Prelims) + Mains Written (6 Compulsory + 2 Optional Papers for Group A/B) + Personality Test',
      frequency: 'Annually',
      duration: 'Prelims: 150 minutes (2.5 hours)',
      total_questions: 200,
      total_marks: 1800,
      negative_marking: '0.33 marks deducted per incorrect answer in Prelims',
      passing_criteria: 'Prelims cutoff qualifies for Mains (1400 Marks written); Mains score + Interview (200 Marks) determine Group A/B allotment.',
      eligibility: 'Degree of a recognized University and ability to read, write and speak in Bengali (not applicable for Nepali mother tongue). Age: 21–36 years.',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Online portal registration at psc.wb.gov.in.',
      selection_process: 'Preliminary Examination (200 Marks) -> Main Written Examination (1400/1600 Marks) -> Personality Test (200 Marks).',
      stages: [
        { name: 'Preliminary Examination (GS Composite)', type: 'Objective OMR', questions: 200, duration: '150 mins', marks: 200 },
        { name: 'Main Written Examination', type: 'Objective MCQ + Descriptive', questions: 0, duration: '18 hours', marks: 1400 },
        { name: 'Personality Test', type: 'Board Interview', questions: 0, duration: '30 mins', marks: 200 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims General Studies Composite Paper (8 Sections of 25 Qs each)', total_questions: 200, total_marks: 200, duration_minutes: 150 },
        { paper_number: 2, title: 'Mains Paper-I: Bengali/Hindi/Nepali/Urdu Descriptive', total_questions: 5, total_marks: 200, duration_minutes: 180 },
        { paper_number: 3, title: 'Mains Paper-II: English Language Descriptive', total_questions: 5, total_marks: 200, duration_minutes: 180 }
      ],
      languages: ['English', 'Bengali'],
      subjects: [
        { slug: 'indian-history-national-movement', official: 'Indian History & Indian National Movement (Focus on Freedom Struggle)', weightage: 25 },
        { slug: 'english-language-comprehension', official: 'English Composition & Grammar', weightage: 15 },
        { slug: 'indian-world-geography', official: 'Geography of India with Special Reference to West Bengal', weightage: 15 },
        { slug: 'indian-polity-governance', official: 'Indian Polity & Economy', weightage: 15 },
        { slug: 'general-science-technology', official: 'General Science & Environment', weightage: 15 },
        { slug: 'reasoning-ability', official: 'General Mental Ability & Logical Reasoning', weightage: 15 }
      ],
      aliases: ['WBCS', 'WBCS Executive', 'West Bengal Civil Service', 'WBCS Prelims', 'WBCS 2026', 'WBPSC Civil Services']
    },
    {
      name: 'TNPSC Group 1 Services (Tamil Nadu Civil Services)',
      slug: 'tnpsc-group-1',
      short_name: 'TNPSC Group 1',
      category: 'civil-services-govt',
      authority: 'TNPSC',
      description: 'Premier state civil service competitive examination conducted by Tamil Nadu Public Service Commission for appointment to Deputy Collector, DSP Grade I, Assistant Commissioner (Commercial Taxes), and District Registrar.',
      official_url: 'https://tnpsc.gov.in',
      official_notification_url: 'https://tnpsc.gov.in/english/notifications.aspx',
      official_syllabus_url: 'https://tnpsc.gov.in',
      exam_type: 'State Civil Service Recruitment',
      level: 'State',
      mode: 'Offline OMR (Prelims) + Mains Written Descriptive (3 Papers) + Oral Test / Interview',
      frequency: 'Annually',
      duration: 'Prelims: 180 minutes (3 hours)',
      total_questions: 200,
      total_marks: 855,
      negative_marking: 'NO negative marking in TNPSC Group 1 Preliminary Examination',
      passing_criteria: 'Prelims score determines qualification for Mains (750 Marks: Paper 1, 2, 3); Mains + Interview (105 Marks) determine final merit.',
      eligibility: 'Degree of any university recognized by UGC. Age: 21–34/39 years (BC/MBC/SC/ST no upper age limit for select categories).',
      attempt_rules: 'No cap on attempts within eligible age limits.',
      application_information: 'Online application via One Time Registration (OTR) on tnpscexams.in.',
      selection_process: 'Preliminary Examination (300 Marks OMR) -> Main Written Examination (750 Marks) -> Oral Test / Interview (105 Marks).',
      stages: [
        { name: 'Preliminary Examination (GS 175 Qs + Aptitude 25 Qs)', type: 'Objective OMR', questions: 200, duration: '180 mins', marks: 300 },
        { name: 'Main Written Examination', type: 'Descriptive Papers (Paper I, II, III)', questions: 0, duration: '9 hours', marks: 750 },
        { name: 'Oral Test & Interview', type: 'Personality Board Interview', questions: 0, duration: '25 mins', marks: 105 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims General Studies & Mental Ability Paper', total_questions: 200, total_marks: 300, duration_minutes: 180 },
        { paper_number: 2, title: 'Mains Paper-I: Modern History of India & Tamil Culture, Social Issues, Aptitude', total_questions: 15, total_marks: 250, duration_minutes: 180 }
      ],
      languages: ['Tamil', 'English'],
      subjects: [
        { slug: 'indian-history-national-movement', official: 'History, Culture, Heritage and Socio-Political Movements in Tamil Nadu', weightage: 30 },
        { slug: 'indian-polity-governance', official: 'Indian Polity, Constitution and Governance', weightage: 20 },
        { slug: 'general-science-technology', official: 'General Science & Scientific Development', weightage: 15 },
        { slug: 'indian-world-geography', official: 'Geography of India and Tamil Nadu', weightage: 15 },
        { slug: 'quantitative-aptitude', official: 'Aptitude and Mental Ability (SSLC Standard)', weightage: 20 }
      ],
      aliases: ['TNPSC Group 1', 'Tamil Nadu Civil Service', 'TNPSC Group I', 'TNPSC Deputy Collector', 'TNPSC 2026', 'TN Civil Services']
    },
    {
      name: 'TSPSC Group 1 Services (Telangana Civil Services)',
      slug: 'tspsc-group-1',
      short_name: 'TSPSC Group 1',
      category: 'civil-services-govt',
      authority: 'TSPSC',
      description: 'Premier state civil service competitive recruitment examination conducted by Telangana Public Service Commission for top administrative positions including Deputy Collector, DSP, Commercial Tax Officer, and District Panchayat Officer.',
      official_url: 'https://tspsc.gov.in',
      official_notification_url: 'https://tspsc.gov.in/notifications',
      official_syllabus_url: 'https://tspsc.gov.in',
      exam_type: 'State Civil Service Examination',
      level: 'State',
      mode: 'Offline OMR (Prelims) + Mains Descriptive Written (6 Papers)',
      frequency: 'Periodic Recruitment Cycle',
      duration: 'Prelims: 150 minutes (2.5 hours)',
      total_questions: 150,
      total_marks: 1050,
      negative_marking: 'NO negative marking in TSPSC Group 1 Preliminary Examination',
      passing_criteria: 'Prelims score shortlists candidates in 1:50 ratio for Mains (900 Marks across 6 Papers); final selection based strictly on Mains total.',
      eligibility: 'Bachelor’s Degree in any discipline from a recognized University. Age: 18–44 years.',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Online portal application via One-Time Registration (OTR) on tspsc.gov.in.',
      selection_process: 'Preliminary Test (150 Marks OMR) -> Main Written Examination (6 Descriptive Papers of 150 Marks each = 900 Marks) -> Certificates Verification.',
      stages: [
        { name: 'Preliminary Test (General Studies & Mental Ability)', type: 'Objective OMR', questions: 150, duration: '150 mins', marks: 150 },
        { name: 'Main Written Examination', type: 'Descriptive Papers 1 to 6', questions: 0, duration: '18 hours', marks: 900 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims Composite General Studies & Mental Ability Paper', total_questions: 150, total_marks: 150, duration_minutes: 150 },
        { paper_number: 2, title: 'Mains Paper-I: General English (Qualifying) & General Essay', total_questions: 3, total_marks: 150, duration_minutes: 180 },
        { paper_number: 3, title: 'Mains Paper-VI: Telangana Movement and State Formation', total_questions: 15, total_marks: 150, duration_minutes: 180 }
      ],
      languages: ['English', 'Telugu', 'Urdu'],
      subjects: [
        { slug: 'indian-history-national-movement', official: 'Telangana History, Cultural Heritage & Telangana Movement', weightage: 35 },
        { slug: 'indian-polity-governance', official: 'Indian Constitution, Governance and Public Policy', weightage: 20 },
        { slug: 'economic-social-issues', official: 'Indian Economy & Telangana State Economy', weightage: 20 },
        { slug: 'general-science-technology', official: 'Science & Technology and Environmental Issues', weightage: 15 },
        { slug: 'reasoning-ability', official: 'General Ability and Data Interpretation', weightage: 10 }
      ],
      aliases: ['TSPSC Group 1', 'TGPSC Group 1', 'Telangana Civil Service', 'TSPSC Group I', 'TSPSC 2026', 'Telangana State Civil Services']
    }
  ];

  for (const ex of remainingExams) {
    const authId = authMap[ex.authority];
    const catId = catMap[ex.category] || catMap['civil-services-govt'];

    const examPayload = {
      country_id: indiaId,
      category_id: catId,
      authority_id: authId,
      name: ex.name,
      slug: ex.slug,
      short_name: ex.short_name,
      description: ex.description,
      exam_type: ex.exam_type,
      level: ex.level,
      mode: ex.mode,
      frequency: ex.frequency,
      duration: ex.duration,
      question_count: ex.total_questions,
      total_marks: ex.total_marks,
      negative_marking: ex.negative_marking,
      passing_criteria: ex.passing_criteria,
      eligibility: ex.eligibility,
      attempt_rules: ex.attempt_rules,
      application_information: ex.application_information,
      selection_process: ex.selection_process,
      languages: ex.languages,
      status: 'active',
      verification_status: 'verified',
      official_url: ex.official_url,
      official_notification_url: ex.official_notification_url,
      official_syllabus_url: ex.official_syllabus_url,
      source_url: ex.official_url,
      current_version: '2026',
      version_year: 2026,
      is_current: true,
      stages: ex.stages,
      papers: ex.papers,
      is_featured: false,
      created_by_ai: false,
      last_verified_at: new Date().toISOString()
    };

    const { data: existingExam } = await supabase.from('exams').select('id').eq('slug', ex.slug).maybeSingle();

    let examId;
    if (existingExam) {
      examId = existingExam.id;
      await supabase.from('exams').update(examPayload).eq('id', examId);
      console.log(`Enriched existing exam: ${ex.slug}`);
    } else {
      const { data: newExam, error: insErr } = await supabase.from('exams').insert(examPayload).select('id').single();
      if (insErr) {
        console.error(`Error inserting exam ${ex.slug}:`, insErr);
        continue;
      }
      examId = newExam.id;
      console.log(`+ Ingested new exam: ${ex.slug} (ID: ${examId})`);
    }

    // Exam Versions (2026 current version)
    const verPayload = {
      exam_id: examId,
      version_year: 2026,
      is_current: true,
      official_notification_url: ex.official_notification_url,
      official_syllabus_url: ex.official_syllabus_url,
      stages: ex.stages,
      papers: ex.papers,
      pattern_summary: `${ex.mode} | ${ex.duration} | Total Marks: ${ex.total_marks} | Negative: ${ex.negative_marking}`,
      source_url: ex.official_url,
      verified_at: new Date().toISOString()
    };

    const { data: existingVer } = await supabase
      .from('exam_versions')
      .select('id')
      .eq('exam_id', examId)
      .eq('version_year', 2026)
      .maybeSingle();

    if (existingVer) {
      await supabase.from('exam_versions').update(verPayload).eq('id', existingVer.id);
    } else {
      await supabase.from('exam_versions').insert(verPayload);
    }

    // Exam-Subject & Exam-Topic mappings
    if (ex.subjects && ex.subjects.length > 0) {
      for (const subj of ex.subjects) {
        const masterSubjId = subjMap[subj.slug];
        if (!masterSubjId) continue;

        const { data: existingES } = await supabase
          .from('exam_subjects')
          .select('id')
          .eq('exam_id', examId)
          .eq('subject_id', masterSubjId)
          .maybeSingle();

        const esPayload = {
          exam_id: examId,
          subject_id: masterSubjId,
          name: subj.official || subj.slug,
          official_name: subj.official || subj.slug,
          display_name: subj.official || subj.slug,
          weight_percentage: subj.weightage || 20,
          source_url: ex.official_url,
          verification_status: 'verified',
          last_verified_at: new Date().toISOString()
        };

        let esId;
        if (existingES) {
          esId = existingES.id;
          await supabase.from('exam_subjects').update(esPayload).eq('id', esId);
        } else {
          const { data: newES, error: esErr } = await supabase
            .from('exam_subjects')
            .insert(esPayload)
            .select('id')
            .single();

          if (esErr) {
            console.error(`Error inserting exam_subject for ${subj.slug}:`, esErr);
            continue;
          }
          esId = newES.id;
        }

        const relMasterTopics = allTopics.filter(t => t.subject_id === masterSubjId);
        for (const mt of relMasterTopics) {
          const { data: existingET } = await supabase
            .from('exam_topics')
            .select('id')
            .eq('subject_id', esId)
            .eq('topic_id', mt.id)
            .maybeSingle();

          const etPayload = {
            subject_id: esId,
            topic_id: mt.id,
            name: mt.name,
            official_name: mt.name,
            display_name: mt.name,
            description: mt.description || mt.name,
            importance: mt.importance || 'High',
            active: true,
            source_url: ex.official_url,
            verification_status: 'verified',
            last_verified_at: new Date().toISOString()
          };

          if (existingET) {
            await supabase.from('exam_topics').update(etPayload).eq('id', existingET.id);
          } else {
            await supabase.from('exam_topics').insert(etPayload);
          }
        }
      }
    }

    // Aliases
    if (ex.aliases && ex.aliases.length > 0) {
      for (const aliasStr of ex.aliases) {
        const { data: existingAlias } = await supabase
          .from('exam_aliases')
          .select('id')
          .eq('exam_id', examId)
          .eq('alias', aliasStr)
          .maybeSingle();

        if (!existingAlias) {
          await supabase.from('exam_aliases').insert({
            exam_id: examId,
            alias: aliasStr
          });
        }
      }
    }
  }

  console.log('\n=== REMAINING 8 EXAMS SEEDED SUCCESSFULLY ===');
}

runRemaining8().catch(console.error);
