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

async function runBatch2Ingestion() {
  console.log('=== STARTING INDIA BATCH 2 COMPREHENSIVE INGESTION ===\n');

  // 1. Fetch Country & Category dependencies
  const { data: countries } = await supabase.from('countries').select('id, iso2').eq('iso2', 'IN');
  const indiaId = countries?.[0]?.id;

  const { data: categories } = await supabase.from('exam_categories').select('id, slug');
  const catMap = {};
  categories.forEach(c => { catMap[c.slug] = c.id; });

  // 2. Ensure Batch 2 Authorities exist
  const newAuthorities = [
    {
      country_id: indiaId,
      code: 'NABARD',
      name: 'National Bank for Agriculture and Rural Development',
      slug: 'nabard-india',
      short_name: 'NABARD',
      official_website: 'https://www.nabard.org',
      description: 'Apex development financial institution in India, conducting nationwide recruitment for Grade A and Grade B officers.',
      headquarters: 'Mumbai, Maharashtra, India',
      established_year: 1982,
      verification_status: 'verified',
      source_url: 'https://www.nabard.org'
    },
    {
      country_id: indiaId,
      code: 'SEBI',
      name: 'Securities and Exchange Board of India',
      slug: 'sebi-india',
      short_name: 'SEBI',
      official_website: 'https://www.sebi.gov.in',
      description: 'Statutory regulatory body established to regulate securities markets in India, conducting Officer Grade A recruitment.',
      headquarters: 'Mumbai, Maharashtra, India',
      established_year: 1992,
      verification_status: 'verified',
      source_url: 'https://www.sebi.gov.in'
    },
    {
      country_id: indiaId,
      code: 'RRB',
      name: 'Railway Recruitment Control Board',
      slug: 'rrb-indian-railways',
      short_name: 'RRB / Indian Railways',
      official_website: 'https://indianrailways.gov.in',
      description: 'Central recruitment authority under the Ministry of Railways, conducting NTPC, Group D, JE, and ALP examinations.',
      headquarters: 'Rail Bhavan, New Delhi, India',
      established_year: 1998,
      verification_status: 'verified',
      source_url: 'https://www.rrbcdg.gov.in'
    },
    {
      country_id: indiaId,
      code: 'IAF',
      name: 'Indian Air Force (Air Headquarters)',
      slug: 'iaf-afcat',
      short_name: 'Indian Air Force',
      official_website: 'https://afcat.cdac.in',
      description: 'Air arm of the Indian Armed Forces, conducting the Air Force Common Admission Test (AFCAT) for officer commissioning.',
      headquarters: 'Vayu Bhavan, New Delhi, India',
      established_year: 1932,
      verification_status: 'verified',
      source_url: 'https://afcat.cdac.in'
    },
    {
      country_id: indiaId,
      code: 'CAG',
      name: 'Comptroller and Auditor General of India',
      slug: 'cag-india',
      short_name: 'CAG / IA&AD',
      official_website: 'https://cag.gov.in',
      description: 'Supreme audit institution of India, overseeing audits and accounts for central and state governments.',
      headquarters: 'New Delhi, India',
      established_year: 1858,
      verification_status: 'verified',
      source_url: 'https://cag.gov.in'
    },
    {
      country_id: indiaId,
      code: 'FSSAI',
      name: 'Food Safety and Standards Authority of India',
      slug: 'fssai-india',
      short_name: 'FSSAI',
      official_website: 'https://fssai.gov.in',
      description: 'Statutory body under Ministry of Health and Family Welfare regulating food safety standards across India.',
      headquarters: 'New Delhi, India',
      established_year: 2008,
      verification_status: 'verified',
      source_url: 'https://fssai.gov.in'
    },
    {
      country_id: indiaId,
      code: 'UPPSC',
      name: 'Uttar Pradesh Public Service Commission',
      slug: 'uppsc-up',
      short_name: 'UPPSC',
      official_website: 'https://uppsc.up.nic.in',
      description: 'State agency authorized to conduct civil service examinations for Uttar Pradesh state services.',
      headquarters: 'Prayagraj, Uttar Pradesh, India',
      established_year: 1937,
      verification_status: 'verified',
      source_url: 'https://uppsc.up.nic.in'
    },
    {
      country_id: indiaId,
      code: 'MPPSC',
      name: 'Madhya Pradesh Public Service Commission',
      slug: 'mppsc-mp',
      short_name: 'MPPSC',
      official_website: 'https://mppsc.mp.gov.in',
      description: 'Constitutional body responsible for conducting recruitment examinations for administrative posts in Madhya Pradesh.',
      headquarters: 'Indore, Madhya Pradesh, India',
      established_year: 1956,
      verification_status: 'verified',
      source_url: 'https://mppsc.mp.gov.in'
    },
    {
      country_id: indiaId,
      code: 'BPSC',
      name: 'Bihar Public Service Commission',
      slug: 'bpsc-bihar',
      short_name: 'BPSC',
      official_website: 'https://bpsc.bih.nic.in',
      description: 'Constitutional body created to select applicants for civil service jobs in Bihar state.',
      headquarters: 'Patna, Bihar, India',
      established_year: 1949,
      verification_status: 'verified',
      source_url: 'https://bpsc.bih.nic.in'
    },
    {
      country_id: indiaId,
      code: 'WBPSC',
      name: 'West Bengal Public Service Commission',
      slug: 'wbpsc-west-bengal',
      short_name: 'WBPSC',
      official_website: 'https://psc.wb.gov.in',
      description: 'State authority conducting competitive civil service examinations in West Bengal.',
      headquarters: 'Kolkata, West Bengal, India',
      established_year: 1937,
      verification_status: 'verified',
      source_url: 'https://psc.wb.gov.in'
    },
    {
      country_id: indiaId,
      code: 'TNPSC',
      name: 'Tamil Nadu Public Service Commission',
      slug: 'tnpsc-tamil-nadu',
      short_name: 'TNPSC',
      official_website: 'https://tnpsc.gov.in',
      description: 'Constitutional authority managing personnel recruitment into Tamil Nadu public services.',
      headquarters: 'Chennai, Tamil Nadu, India',
      established_year: 1929,
      verification_status: 'verified',
      source_url: 'https://tnpsc.gov.in'
    },
    {
      country_id: indiaId,
      code: 'TSPSC',
      name: 'Telangana Public Service Commission',
      slug: 'tspsc-telangana',
      short_name: 'TGPSC / TSPSC',
      official_website: 'https://tspsc.gov.in',
      description: 'Constitutional recruitment body for public service posts in Telangana.',
      headquarters: 'Hyderabad, Telangana, India',
      established_year: 2014,
      verification_status: 'verified',
      source_url: 'https://tspsc.gov.in'
    }
  ];

  for (const auth of newAuthorities) {
    const { data: existing } = await supabase.from('exam_authorities').select('id').eq('code', auth.code).maybeSingle();
    if (!existing) {
      await supabase.from('exam_authorities').insert(auth);
      console.log(`+ Authority created: ${auth.code}`);
    }
  }

  const { data: allAuthorities } = await supabase.from('exam_authorities').select('id, code');
  const authMap = {};
  allAuthorities.forEach(a => { authMap[a.code] = a.id; });

  // 3. Ensure Batch 2 Master Subjects exist
  const newMasterSubjects = [
    { name: 'Civil Engineering', slug: 'civil-engineering', category_id: catMap['engineering-tech'], description: 'Structural Analysis, Building Materials, Geotechnical, Fluid Mechanics & Environmental Engineering.', aliases: ['CE', 'Civil Engg'] },
    { name: 'Electrical Engineering', slug: 'electrical-engineering', category_id: catMap['engineering-tech'], description: 'Circuit Theory, Electric Machines, Power Systems, Control Systems & Power Electronics.', aliases: ['EE', 'Electrical Engg'] },
    { name: 'Mechanical Engineering', slug: 'mechanical-engineering', category_id: catMap['engineering-tech'], description: 'Thermodynamics, Fluid Mechanics, Manufacturing Technology, Machine Design & SOM.', aliases: ['ME', 'Mechanical Engg'] },
    { name: 'General Studies & Engineering Aptitude', slug: 'general-studies-engineering-aptitude', category_id: catMap['engineering-tech'], description: 'Engineering Ethics, Project Management, Environmental Studies & ICT Standards.', aliases: ['GSEA', 'GS & Engg Aptitude'] },
    { name: 'Economic & Social Issues (ESI)', slug: 'economic-social-issues', category_id: catMap['banking-financial-services'], description: 'Indian Economy, Social Structure, Poverty Alleviation & Sustainable Development.', aliases: ['ESI', 'Economic & Social Issues'] },
    { name: 'Finance & Management', slug: 'finance-management', category_id: catMap['banking-financial-services'], description: 'Financial System in India, Financial Markets, Corporate Governance & Leadership.', aliases: ['FM', 'Finance & Management'] },
    { name: 'Agriculture & Rural Development (ARD)', slug: 'agriculture-rural-development', category_id: catMap['agriculture-sciences'] || catMap['banking-financial-services'], description: 'Agriculture Agronomy, Soil Conservation, Water Resource Management & Rural Economy.', aliases: ['ARD', 'Agriculture & Rural Dev'] },
    { name: 'General Hindi Language', slug: 'general-hindi-language', category_id: catMap['language-linguistics'], description: 'Hindi Vyakaran, Vilom Shabd, Samanarthi Shabd, Muhavare, Sandhi, Samas aur Gadyansh.', aliases: ['General Hindi', 'Samanya Hindi'] },
    { name: 'Military Aptitude & Spatial Ability', slug: 'military-aptitude-spatial-ability', category_id: catMap['defence-services'], description: 'Spatial Ability, Embedded Figures, Figure Completion & Military Situational Awareness.', aliases: ['Military Aptitude', 'Spatial Reasoning'] },
    { name: 'Food Science & Safety Standards', slug: 'food-science-safety-standards', category_id: catMap['medical-healthcare'] || catMap['civil-services-govt'], description: 'FSSAI Rules, Food Chemistry, Food Processing Principles, Hygiene Standards and Packaging Rules.', aliases: ['Food Safety', 'Food Science', 'FSSAI Standards'] },
    { name: 'Auditing & Accounting Standards', slug: 'auditing-accounting-standards', category_id: catMap['civil-services-govt'] || catMap['banking-financial-services'], description: 'Financial Accounting Principles, Auditing Standards, CAG Mandate, Costing & General Financial Rules.', aliases: ['Auditing', 'Accounting', 'CAG Audit'] }
  ];

  for (const s of newMasterSubjects) {
    const { data: existing } = await supabase.from('subjects').select('id').eq('slug', s.slug).maybeSingle();
    if (!existing) {
      await supabase.from('subjects').insert(s);
      console.log(`+ Master Subject created: ${s.slug}`);
    }
  }

  const { data: allSubjects } = await supabase.from('subjects').select('id, slug, name');
  const subjMap = {};
  allSubjects.forEach(s => { subjMap[s.slug] = s.id; });

  // 4. Ensure Master Topics exist for each subject
  const masterTopics = [
    // Civil Engineering
    { subject_slug: 'civil-engineering', name: 'Building Materials & Construction', slug: 'building-materials-construction', importance: 'High', description: 'Properties, testing and uses of stones, bricks, cement, timber and concrete.' },
    { subject_slug: 'civil-engineering', name: 'Strength of Materials & Structural Analysis', slug: 'som-structural-analysis', importance: 'High', description: 'Stress-strain behavior, bending moments, shear forces, deflections and trusses.' },
    { subject_slug: 'civil-engineering', name: 'Geotechnical & Foundation Engineering', slug: 'geotechnical-foundation-engg', importance: 'High', description: 'Soil classification, permeability, shear strength, bearing capacity and shallow/deep foundations.' },
    { subject_slug: 'civil-engineering', name: 'Fluid Mechanics & Hydraulic Machines', slug: 'fluid-mechanics-hydraulic-machines', importance: 'High', description: 'Fluid statics, Bernoulli theorem, pipe flow, open channel flow and turbines/pumps.' },
    { subject_slug: 'civil-engineering', name: 'Surveying & Levelling', slug: 'surveying-levelling', importance: 'Medium', description: 'Chain surveying, theodolite, leveling, contouring, curves and GPS/GIS basics.' },
    { subject_slug: 'civil-engineering', name: 'Environmental & Transportation Engineering', slug: 'environmental-transportation-engg', importance: 'High', description: 'Water demand, sewage treatment, air pollution, highway geometric design and traffic engineering.' },

    // Electrical Engineering
    { subject_slug: 'electrical-engineering', name: 'Electric Circuits & Network Analysis', slug: 'electric-circuits-network-analysis', importance: 'High', description: 'Network theorems, AC circuits, transient analysis, two-port networks and graph theory.' },
    { subject_slug: 'electrical-engineering', name: 'Electrical Machines (Transformers & Motors)', slug: 'electrical-machines-dc-ac', importance: 'High', description: 'DC machines, single and three phase transformers, induction motors and synchronous machines.' },
    { subject_slug: 'electrical-engineering', name: 'Power Systems & Protection', slug: 'power-systems-protection', importance: 'High', description: 'Power generation, transmission line parameters, fault analysis, relays and circuit breakers.' },
    { subject_slug: 'electrical-engineering', name: 'Control Systems & Electrical Measurements', slug: 'control-systems-measurements', importance: 'High', description: 'Transfer functions, root locus, Bode plots, error detectors, bridges and digital instruments.' },
    { subject_slug: 'electrical-engineering', name: 'Power Electronics & Drives', slug: 'power-electronics-drives', importance: 'High', description: 'Thyristors, MOSFETs, rectifiers, inverters, choppers and speed control of drives.' },

    // Mechanical Engineering
    { subject_slug: 'mechanical-engineering', name: 'Thermodynamics & Heat Transfer', slug: 'thermodynamics-heat-transfer', importance: 'High', description: 'Laws of thermodynamics, Carnot cycle, steam cycles, conduction, convection and radiation.' },
    { subject_slug: 'mechanical-engineering', name: 'Theory of Machines & Machine Design', slug: 'theory-of-machines-design', importance: 'High', description: 'Mechanisms, gears, flywheels, governors, design of shafts, bearings and bolted/welded joints.' },
    { subject_slug: 'mechanical-engineering', name: 'Fluid Mechanics & Thermal Turbomachinery', slug: 'fluid-mechanics-turbomachinery', importance: 'High', description: 'Navier-Stokes basics, boundary layers, steam/gas turbines and compressors.' },
    { subject_slug: 'mechanical-engineering', name: 'Manufacturing Processes & Materials Science', slug: 'manufacturing-materials-science', importance: 'High', description: 'Casting, forming, welding, machining, CNC, phase diagrams and heat treatment of steel.' },

    // General Studies & Engineering Aptitude
    { subject_slug: 'general-studies-engineering-aptitude', name: 'Engineering Ethics & Professional Values', slug: 'engineering-ethics-values', importance: 'High', description: 'Moral dilemmas, code of conduct, safety, whistleblowing and engineer responsibility.' },
    { subject_slug: 'general-studies-engineering-aptitude', name: 'Project Management & Quality Standards', slug: 'project-mgmt-quality-standards', importance: 'High', description: 'PERT, CPM, project planning, cost estimation, TQM and ISO standards.' },
    { subject_slug: 'general-studies-engineering-aptitude', name: 'Information & Communication Technologies (ICT)', slug: 'ict-e-governance-standards', importance: 'Medium', description: 'Networking fundamentals, digital technologies, cybersecurity and e-governance applications.' },

    // Economic & Social Issues (ESI)
    { subject_slug: 'economic-social-issues', name: 'Indian Economy & Growth Trends', slug: 'indian-economy-growth-trends', importance: 'High', description: 'National income accounting, inflation, macroeconomic indicators, economic planning and reforms.' },
    { subject_slug: 'economic-social-issues', name: 'Poverty Alleviation & Employment Generation', slug: 'poverty-employment-schemes', importance: 'High', description: 'Poverty estimates, measurement committees, unemployment metrics, MGNREGA and skill development.' },
    { subject_slug: 'economic-social-issues', name: 'Sustainable Development & Climate Change Policy', slug: 'sustainable-dev-climate-policy', importance: 'High', description: 'SDG goals, COP summits, renewable energy transition and environmental impact assessments.' },
    { subject_slug: 'economic-social-issues', name: 'Social Structure, Demographics & Urbanization', slug: 'social-structure-demographics', importance: 'Medium', description: 'Census demographics, gender equality, education policy, health indicators and urbanization challenges.' },

    // Finance & Management
    { subject_slug: 'finance-management', name: 'Financial System & Financial Markets in India', slug: 'financial-system-markets-india', importance: 'High', description: 'Money market, capital market instruments, primary/secondary markets, SEBI regulations and banking structure.' },
    { subject_slug: 'finance-management', name: 'Corporate Governance & Risk Management', slug: 'corporate-governance-risk-mgmt', importance: 'High', description: 'Basel III accords, credit/market/operational risk, audit committees and corporate ethics.' },
    { subject_slug: 'finance-management', name: 'Management Concepts, Leadership & Motivation', slug: 'management-leadership-motivation', importance: 'High', description: 'Theories of leadership (Blake Mouton, Situational), motivation theories (Maslow, Herzberg) and organizational behavior.' },
    { subject_slug: 'finance-management', name: 'Financial Statement Analysis & Accounting', slug: 'financial-statement-accounting', importance: 'Medium', description: 'Balance sheet, cash flow statements, ratio analysis, depreciation and working capital management.' },

    // Agriculture & Rural Development (ARD)
    { subject_slug: 'agriculture-rural-development', name: 'Agronomy, Cropping Systems & Soil Science', slug: 'agronomy-crops-soil-science', importance: 'High', description: 'Kharif/Rabi seasons, organic farming, soil nutrients, fertilizers, irrigation methods and seed technologies.' },
    { subject_slug: 'agriculture-rural-development', name: 'Animal Husbandry, Poultry & Fisheries', slug: 'animal-husbandry-fisheries', importance: 'High', description: 'Dairy cattle breeds, milk production, poultry management, inland/marine fisheries and aquaculture schemes.' },
    { subject_slug: 'agriculture-rural-development', name: 'Rural Banking, Credit Structure & Priority Sector Lending', slug: 'rural-banking-priority-sector', importance: 'High', description: 'NABARD refinancing, Kisan Credit Card (KCC), RRBs, SHG-bank linkage, PSL norms and rural infrastructure funds (RIDF).' },

    // General Hindi Language
    { subject_slug: 'general-hindi-language', name: 'Hindi Vyakaran, Sandhi aur Samas', slug: 'hindi-vyakaran-sandhi-samas', importance: 'High', description: 'Varna vichar, Sangya, Sarvanam, Kriya, Visheshan, Sandhi niyam aur Samas bhed.' },
    { subject_slug: 'general-hindi-language', name: 'Vilom Shabd, Paryaywachi aur Anekarthi Shabd', slug: 'vilom-paryaywachi-shabd', importance: 'High', description: 'Viparitarthak shabd, samanarthi shabd, vakya ke liye ek shabd aur shabd yugm.' },
    { subject_slug: 'general-hindi-language', name: 'Muhavare, Lokoktiyan aur Vakya Shuddhi', slug: 'muhavare-lokoktiyan-shuddhi', importance: 'High', description: 'Lokoktiyon ka arth va prayog, ashuddh vakya ko shuddh karna aur vartani vishleshan.' },
    { subject_slug: 'general-hindi-language', name: 'Apathit Gadyansh (Comprehension)', slug: 'hindi-apathit-gadyansh', importance: 'High', description: 'Gadyansh par aadharit prashnottar, bhavarth aur mukhya vichar chayan.' },

    // Military Aptitude & Spatial Ability
    { subject_slug: 'military-aptitude-spatial-ability', name: 'Spatial & Rotational Reasoning', slug: 'spatial-rotational-reasoning', importance: 'High', description: 'Spatial orientation, 3D figure rotation, hidden figure analysis and dot situation tests.' },
    { subject_slug: 'military-aptitude-spatial-ability', name: 'Embedded Figures & Pattern Completion', slug: 'embedded-figures-pattern-completion', importance: 'High', description: 'Figure matrix, incomplete pattern recognition, paper folding/cutting and mirror images.' },

    // Food Science & Safety Standards
    { subject_slug: 'food-science-safety-standards', name: 'Food Safety and Standards Act 2006 & FSSAI Regulations', slug: 'fssai-act-regulations-2006', importance: 'High', description: 'FSSA Act 2006 provisions, FSSAI structure, Food Safety Officer duties, licensing and labeling rules.' },
    { subject_slug: 'food-science-safety-standards', name: 'Food Chemistry, Microbiology & Hygiene Principles', slug: 'food-chemistry-microbiology-hygiene', importance: 'High', description: 'Macronutrients, micronutrients, food spoilage microorganisms, foodborne toxins, HACCP and sanitation standards.' },
    { subject_slug: 'food-science-safety-standards', name: 'Food Processing, Preservation & Packaging Standards', slug: 'food-processing-preservation-packaging', importance: 'High', description: 'Thermal processing, freezing, dehydration, irradiation, packaging materials, labeling requirements and nutritional claims.' },

    // Auditing & Accounting Standards
    { subject_slug: 'auditing-accounting-standards', name: 'Financial Accounting & Principles', slug: 'financial-accounting-principles', importance: 'High', description: 'Double entry bookkeeping, trial balance, ledger accounts, cash flow, company final accounts and depreciation methods.' },
    { subject_slug: 'auditing-accounting-standards', name: 'Auditing Standards & CAG Constitutional Mandate', slug: 'auditing-standards-cag-mandate', importance: 'High', description: 'Article 148-151 of Indian Constitution, DPC Act 1971, propriety audit, performance audit and internal control frameworks.' },
    { subject_slug: 'auditing-accounting-standards', name: 'Cost Accounting & Government Financial Rules (GFR)', slug: 'costing-gfr-procurement-rules', importance: 'High', description: 'Costing techniques (marginal, standard), budgeting, General Financial Rules 2017 and public procurement standards.' }
  ];

  for (const t of masterTopics) {
    const sId = subjMap[t.subject_slug];
    if (sId) {
      const { data: existing } = await supabase.from('topics').select('id').eq('slug', t.slug).maybeSingle();
      if (!existing) {
        await supabase.from('topics').insert({
          subject_id: sId,
          name: t.name,
          slug: t.slug,
          description: t.description,
          importance: t.importance
        });
        console.log(`+ Master Topic created: ${t.slug} (${t.name})`);
      }
    }
  }

  const { data: allTopics } = await supabase.from('topics').select('id, slug, subject_id, name, description, importance');

  // 5. Complete Master Array of 28 India Batch 2 Exams
  const batch2Exams = [
    // --- GOVERNMENT / UPSC ---
    {
      name: 'UPSC Engineering Services Examination (ESE / IES)',
      slug: 'upsc-ese',
      short_name: 'UPSC ESE',
      category: 'engineering-tech',
      authority: 'UPSC',
      description: 'National competitive examination conducted by UPSC for recruitment to Indian Engineering Services across Civil, Mechanical, Electrical, and Electronics & Telecommunications engineering cadres in central government departments.',
      official_url: 'https://upsc.gov.in',
      official_notification_url: 'https://upsc.gov.in/examinations/Engineering%20Services%20%28Preliminary%29%20Examination%2C%202026',
      official_syllabus_url: 'https://upsc.gov.in',
      exam_type: 'Central Engineering Civil Service',
      level: 'National',
      mode: 'Offline OMR (Prelims) + Conventional Descriptive (Mains) + Personality Test',
      frequency: 'Annually',
      duration: 'Prelims: 5 hours total (Paper 1: 2 hrs, Paper 2: 3 hrs)',
      total_questions: 250,
      total_marks: 1300,
      negative_marking: '-1/3rd (0.33) marks per wrong MCQ in Stage-I (Prelims)',
      passing_criteria: 'Stage-I Prelims cut-off to qualify for Stage-II Mains; final merit compiled from 1300 total aggregate.',
      eligibility: 'Degree in Engineering (B.E./B.Tech) from a recognized university or Section A & B of Institution Examinations.',
      attempt_rules: 'General category: Age 21–30 years (with standard age relaxations for OBC/SC/ST/PwBD).',
      application_information: 'Online application via UPSC OTR (One Time Registration) portal at upsc.gov.in.',
      selection_process: 'Three-stage selection: Stage-I (Prelims 500 Marks CBT/OMR), Stage-II (Mains 600 Marks Conventional), Stage-III (Personality Test 200 Marks).',
      stages: [
        { name: 'Stage-I: Preliminary Examination', type: 'Objective OMR', questions: 250, duration: '300 mins', marks: 500 },
        { name: 'Stage-II: Main Examination', type: 'Conventional Descriptive', questions: 0, duration: '360 mins', marks: 600 },
        { name: 'Stage-III: Personality Test', type: 'Interview Board', questions: 0, duration: '30 mins', marks: 200 }
      ],
      papers: [
        { paper_number: 1, title: 'Paper-I: General Studies and Engineering Aptitude', total_questions: 100, total_marks: 200, duration_minutes: 120 },
        { paper_number: 2, title: 'Paper-II: Discipline Specific Engineering (CE / EE / ME)', total_questions: 150, total_marks: 300, duration_minutes: 180 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'general-studies-engineering-aptitude', official: 'General Studies and Engineering Aptitude', weightage: 40 },
        { slug: 'civil-engineering', official: 'Civil Engineering (Discipline Paper)', weightage: 60 },
        { slug: 'electrical-engineering', official: 'Electrical Engineering (Discipline Paper)', weightage: 60 },
        { slug: 'mechanical-engineering', official: 'Mechanical Engineering (Discipline Paper)', weightage: 60 }
      ],
      aliases: ['UPSC ESE', 'IES', 'Indian Engineering Services', 'UPSC Engineering Services', 'ESE 2026', 'IES Exam']
    },
    {
      name: 'UPSC Combined Medical Services Examination (CMS)',
      slug: 'upsc-cms',
      short_name: 'UPSC CMS',
      category: 'medical-healthcare',
      authority: 'UPSC',
      description: 'National competitive examination conducted by UPSC for recruitment of Medical Officers in Central Health Service, Indian Railway Medical Service, New Delhi Municipal Council, and Municipal Corporation of Delhi.',
      official_url: 'https://upsc.gov.in',
      official_notification_url: 'https://upsc.gov.in/examinations/Combined%20Medical%20Services%20Examination%2C%202026',
      official_syllabus_url: 'https://upsc.gov.in',
      exam_type: 'Central Medical Officer Recruitment',
      level: 'National',
      mode: 'Computer Based Test (CBT) + Personality Test',
      frequency: 'Annually',
      duration: '4 hours total (Paper 1: 2 hrs, Paper 2: 2 hrs)',
      total_questions: 240,
      total_marks: 600,
      negative_marking: '-1/3rd (0.33) marks for wrong answer in CBT Papers',
      passing_criteria: 'Aggregate cut-off in Computer Based Examination to qualify for 100 Marks Personality Test.',
      eligibility: 'Passed written and practical parts of final MBBS examination or appearing in final MBBS.',
      attempt_rules: 'Candidate must not have attained the age of 32 years as of 1st August of examination year.',
      application_information: 'Online application via UPSC OTR portal (upsc.gov.in).',
      selection_process: 'Part-I: Computer Based Examination (500 Marks in 2 papers), Part-II: Personality Test / Interview (100 Marks).',
      stages: [
        { name: 'Part-I: Computer Based Examination', type: 'Objective CBT', questions: 240, duration: '240 mins', marks: 500 },
        { name: 'Part-II: Personality Test', type: 'Interview Board', questions: 0, duration: '30 mins', marks: 100 }
      ],
      papers: [
        { paper_number: 1, title: 'Paper-I: General Medicine and Paediatrics', total_questions: 120, total_marks: 250, duration_minutes: 120 },
        { paper_number: 2, title: 'Paper-II: Surgery, Gynaecology & Obstetrics, Preventive & Social Medicine', total_questions: 120, total_marks: 250, duration_minutes: 120 }
      ],
      languages: ['English'],
      subjects: [
        { slug: 'general-medicine', official: 'General Medicine', weightage: 38 },
        { slug: 'pediatrics', official: 'Paediatrics', weightage: 12 },
        { slug: 'general-surgery', official: 'General Surgery', weightage: 20 },
        { slug: 'obstetrics-gynaecology', official: 'Gynaecology & Obstetrics', weightage: 15 },
        { slug: 'community-medicine-psm', official: 'Preventive & Social Medicine', weightage: 15 }
      ],
      aliases: ['UPSC CMS', 'Combined Medical Services', 'UPSC Medical Officer', 'CMS Exam 2026', 'UPSC CMS 2026']
    },
    {
      name: 'UPSC Combined Defence Services (CDS Examination)',
      slug: 'upsc-cds',
      short_name: 'UPSC CDS',
      category: 'defence-services',
      authority: 'UPSC',
      description: 'National level defence entrance examination conducted twice a year by UPSC for commissioning officers into Indian Military Academy (IMA), Indian Naval Academy (INA), Air Force Academy (AFA), and Officers Training Academy (OTA).',
      official_url: 'https://upsc.gov.in',
      official_notification_url: 'https://upsc.gov.in/examinations/Combined%20Defence%20Services%20Examination%20%28I%29%2C%202026',
      official_syllabus_url: 'https://upsc.gov.in',
      exam_type: 'Commissioned Officer Defence Entrance',
      level: 'National',
      mode: 'Offline OMR + SSB Interview',
      frequency: 'Bi-annually (CDS I & CDS II)',
      duration: '6 hours total (IMA/INA/AFA: 3 papers of 2 hrs each; OTA: 2 papers of 2 hrs each)',
      total_questions: 340,
      total_marks: 300,
      negative_marking: '-1/3rd (0.33) marks deduction per incorrect answer',
      passing_criteria: 'Minimum sectional qualifying mark (typically 20%) in each paper and overall aggregate merit cutoff.',
      eligibility: 'Degree of a recognized university (Engineering degree for INA; 10+2 with Physics & Maths for AFA).',
      attempt_rules: 'Age limits: 19–24 years depending on specific academy (IMA, INA, AFA, OTA).',
      application_information: 'Online application via UPSC OTR portal (upsc.gov.in).',
      selection_process: 'Written Examination (300 Marks for IMA/INA/AFA, 200 Marks for OTA) followed by 5-day Services Selection Board (SSB) Interview.',
      stages: [
        { name: 'Written Examination', type: 'Objective OMR', questions: 340, duration: '360 mins', marks: 300 },
        { name: 'SSB Interview & Intelligence Test', type: '5-Day Board Evaluation', questions: 0, duration: '5 Days', marks: 300 }
      ],
      papers: [
        { paper_number: 1, title: 'English', total_questions: 120, total_marks: 100, duration_minutes: 120 },
        { paper_number: 2, title: 'General Knowledge', total_questions: 120, total_marks: 100, duration_minutes: 120 },
        { paper_number: 3, title: 'Elementary Mathematics', total_questions: 100, total_marks: 100, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'english-language-comprehension', official: 'English Language & Comprehension', weightage: 33 },
        { slug: 'general-science-technology', official: 'General Science & Technology', weightage: 20 },
        { slug: 'indian-history-national-movement', official: 'Indian History & Freedom Struggle', weightage: 15 },
        { slug: 'indian-polity-governance', official: 'Indian Polity & Governance', weightage: 12 },
        { slug: 'indian-world-geography', official: 'Indian & World Geography', weightage: 10 },
        { slug: 'quantitative-aptitude', official: 'Elementary Mathematics', weightage: 33 }
      ],
      aliases: ['UPSC CDS', 'CDS Exam', 'Combined Defence Services', 'CDS 1 2026', 'CDS 2 2026', 'CDS OTA']
    },
    {
      name: 'UPSC National Defence Academy & Naval Academy (NDA / NA)',
      slug: 'upsc-nda',
      short_name: 'UPSC NDA',
      category: 'defence-services',
      authority: 'UPSC',
      description: 'Premier national level joint services entrance examination conducted by UPSC for selecting candidates for the Army, Navy, and Air Force wings of the NDA and 10+2 Cadet Entry Scheme of Indian Naval Academy.',
      official_url: 'https://upsc.gov.in',
      official_notification_url: 'https://upsc.gov.in/examinations/National%20Defence%20Academy%20and%20Naval%20Academy%20Examination%20%28I%29%2C%202026',
      official_syllabus_url: 'https://upsc.gov.in',
      exam_type: 'Defence Cadet Entrance',
      level: 'National',
      mode: 'Offline OMR + SSB Interview',
      frequency: 'Bi-annually (NDA I & NDA II)',
      duration: '5 hours total (Maths: 2.5 hrs, GAT: 2.5 hrs)',
      total_questions: 270,
      total_marks: 900,
      negative_marking: '-0.83 for Maths, -1.33 for GAT (1/3rd penalty for each wrong answer)',
      passing_criteria: 'Minimum sectional cut-off (25% in each paper) and composite written aggregate cutoff.',
      eligibility: '12th Class pass of the 10+2 pattern (with Physics, Chemistry & Maths for Air Force/Navy wings).',
      attempt_rules: 'Unmarried male and female candidates aged 16.5 to 19.5 years.',
      application_information: 'Online application on upsc.gov.in through OTR module.',
      selection_process: 'Written Examination (900 Marks: Mathematics 300 + GAT 600) followed by 5-day SSB Interview (900 Marks).',
      stages: [
        { name: 'Written Examination', type: 'Objective OMR', questions: 270, duration: '300 mins', marks: 900 },
        { name: 'SSB Interview', type: 'Psychological & Personality Assessment', questions: 0, duration: '5 Days', marks: 900 }
      ],
      papers: [
        { paper_number: 1, title: 'Mathematics (Code 01)', total_questions: 120, total_marks: 300, duration_minutes: 150 },
        { paper_number: 2, title: 'General Ability Test - GAT (Code 02)', total_questions: 150, total_marks: 600, duration_minutes: 150 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'mathematics', official: 'Mathematics (Algebra, Matrices, Trigonometry, Calculus, Vectors)', weightage: 33 },
        { slug: 'english-language-comprehension', official: 'Part A: English Language', weightage: 22 },
        { slug: 'physics', official: 'Part B: Physics', weightage: 15 },
        { slug: 'chemistry', official: 'Part B: Chemistry', weightage: 10 },
        { slug: 'general-science-technology', official: 'Part B: General Science', weightage: 6 },
        { slug: 'indian-history-national-movement', official: 'Part B: History & Freedom Movement', weightage: 8 },
        { slug: 'indian-world-geography', official: 'Part B: Geography', weightage: 6 }
      ],
      aliases: ['UPSC NDA', 'NDA Exam', 'National Defence Academy', 'NDA NA', 'NDA 1 2026', 'NDA 2 2026']
    },
    {
      name: 'UPSC Central Armed Police Forces (CAPF AC)',
      slug: 'upsc-capf-ac',
      short_name: 'UPSC CAPF AC',
      category: 'defence-services',
      authority: 'UPSC',
      description: 'National level competitive examination conducted by UPSC for direct recruitment of Assistant Commandants (Group A) in BSF, CRPF, CISF, ITBP, and SSB.',
      official_url: 'https://upsc.gov.in',
      official_notification_url: 'https://upsc.gov.in/examinations/Central%20Armed%20Police%20Forces%20%28ACs%29%20Examination%2C%202026',
      official_syllabus_url: 'https://upsc.gov.in',
      exam_type: 'Central Armed Police Officer Recruitment',
      level: 'National',
      mode: 'Offline OMR (Paper 1) + Descriptive (Paper 2) + PET/PST + Interview',
      frequency: 'Annually',
      duration: '5 hours total (Paper 1: 2 hrs, Paper 2: 3 hrs)',
      total_questions: 125,
      total_marks: 450,
      negative_marking: '-1/3rd (0.67 marks) per incorrect answer in Paper-I',
      passing_criteria: 'Paper-I qualifying cut-off required for evaluation of Paper-II; combined written marks determine PET eligibility.',
      eligibility: 'Bachelor’s degree from a recognized university. Age: 20–25 years.',
      attempt_rules: 'Standard age relaxations for reserved categories as per central government norms.',
      application_information: 'Online application via UPSC OTR portal (upsc.gov.in).',
      selection_process: 'Written Exam (450 Marks) -> Physical Efficiency Test (PET/PST) -> Personality Test / Interview (150 Marks).',
      stages: [
        { name: 'Paper-I: General Ability and Intelligence', type: 'Objective OMR', questions: 125, duration: '120 mins', marks: 250 },
        { name: 'Paper-II: General Studies, Essay & Comprehension', type: 'Descriptive Written', questions: 0, duration: '180 mins', marks: 200 },
        { name: 'Personality Test / Interview', type: 'Board Interview', questions: 0, duration: '30 mins', marks: 150 }
      ],
      papers: [
        { paper_number: 1, title: 'Paper-I: General Ability and Intelligence', total_questions: 125, total_marks: 250, duration_minutes: 120 },
        { paper_number: 2, title: 'Paper-II: General Studies, Essay & Comprehension', total_questions: 0, total_marks: 200, duration_minutes: 180 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'reasoning-ability', official: 'General Mental Ability & Reasoning', weightage: 18 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude & Data Interpretation', weightage: 18 },
        { slug: 'general-science-technology', official: 'General Science & Technology', weightage: 15 },
        { slug: 'indian-polity-governance', official: 'Indian Polity and Economy', weightage: 18 },
        { slug: 'indian-history-national-movement', official: 'History of India and National Movement', weightage: 15 },
        { slug: 'indian-world-geography', official: 'Indian and World Geography', weightage: 16 }
      ],
      aliases: ['UPSC CAPF', 'CAPF AC', 'Central Armed Police Forces AC', 'CAPF Assistant Commandant', 'CAPF 2026']
    },
    {
      name: 'UPSC Indian Forest Service (IFoS Examination)',
      slug: 'upsc-ifos',
      short_name: 'UPSC IFoS',
      category: 'civil-services-govt',
      authority: 'UPSC',
      description: 'All India Service competitive examination conducted by UPSC for recruitment to the Indian Forest Service, sharing the Civil Services Preliminary examination as its screening test.',
      official_url: 'https://upsc.gov.in',
      official_notification_url: 'https://upsc.gov.in/examinations/Indian%20Forest%20Service%20%28Preliminary%29%20Examination%2C%202026',
      official_syllabus_url: 'https://upsc.gov.in',
      exam_type: 'All India Service Recruitment',
      level: 'National',
      mode: 'Offline OMR (Prelims) + Conventional Descriptive (Mains) + Interview',
      frequency: 'Annually',
      duration: 'Prelims: 4 hours total; Mains: 6 descriptive papers of 3 hours each',
      total_questions: 180,
      total_marks: 1700,
      negative_marking: '-1/3rd negative marking in Prelims GS and CSAT papers',
      passing_criteria: 'High Prelims cutoff to qualify for IFoS Mains (1400 Marks) followed by Interview (300 Marks).',
      eligibility: 'Bachelor’s degree with at least one subject among Animal Husbandry, Botany, Chemistry, Geology, Mathematics, Physics, Statistics, Zoology or Agriculture/Forestry/Engineering.',
      attempt_rules: 'General: 6 attempts (up to 32 years), OBC: 9 attempts (up to 35 years), SC/ST: unlimited attempts (up to 37 years).',
      application_information: 'Common application with Civil Services (Preliminary) Examination via UPSC OTR.',
      selection_process: 'Civil Services Prelims (Screening) -> IFoS Main Written Examination (1400 Marks) -> Personality Test (300 Marks).',
      stages: [
        { name: 'Civil Services (Preliminary) Screening Test', type: 'Objective OMR', questions: 180, duration: '240 mins', marks: 400 },
        { name: 'IFoS Main Written Examination', type: 'Descriptive Conventional', questions: 0, duration: '18 hours', marks: 1400 },
        { name: 'Personality Test', type: 'Interview Board', questions: 0, duration: '35 mins', marks: 300 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims General Studies Paper-I', total_questions: 100, total_marks: 200, duration_minutes: 120 },
        { paper_number: 2, title: 'Prelims CSAT Paper-II (Qualifying 33%)', total_questions: 80, total_marks: 200, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'environmental-ecology-biodiversity', official: 'Environmental Ecology, Biodiversity & Climate Change', weightage: 30 },
        { slug: 'indian-polity-governance', official: 'Indian Polity & Governance', weightage: 15 },
        { slug: 'indian-history-national-movement', official: 'History of India & Indian National Movement', weightage: 15 },
        { slug: 'indian-world-geography', official: 'Indian & World Geography', weightage: 15 },
        { slug: 'general-science-technology', official: 'General Science & Technology', weightage: 15 },
        { slug: 'csat-quantitative-aptitude', official: 'CSAT Basic Numeracy & Data Interpretation', weightage: 10 }
      ],
      aliases: ['UPSC IFoS', 'Indian Forest Service', 'IFS Exam', 'UPSC Forest Service', 'IFoS 2026']
    },
    {
      name: 'UPSC EPFO (Enforcement Officer / AO & APFC)',
      slug: 'upsc-epfo',
      short_name: 'UPSC EPFO',
      category: 'civil-services-govt',
      authority: 'UPSC',
      description: 'Special nationwide recruitment test conducted by UPSC for selecting Enforcement Officers / Accounts Officers and Assistant Public Provident Fund Commissioners (APFC) in the Employees’ Provident Fund Organisation under Ministry of Labour and Employment.',
      official_url: 'https://upsc.gov.in',
      official_notification_url: 'https://upsc.gov.in/examinations/Special%20Recruitment%20Advertisements',
      official_syllabus_url: 'https://upsc.gov.in',
      exam_type: 'Statutory Body Officer Recruitment',
      level: 'National',
      mode: 'Offline OMR Recruitment Test (RT) + Interview',
      frequency: 'Periodic Recruitment Cycle',
      duration: '120 minutes (2 hours)',
      total_questions: 120,
      total_marks: 300,
      negative_marking: '-1/3rd (0.33) marks deducted per incorrect answer',
      passing_criteria: '75:25 weightage ratio between Recruitment Test score and Interview.',
      eligibility: 'Bachelor’s degree in any discipline from a recognized university (Desirable: Law/Management/Chartered Accountant).',
      attempt_rules: 'Age limit: Up to 30 years for EO/AO, Up to 35 years for APFC (with statutory category relaxations).',
      application_information: 'Online application on upsc.gov.in using OTR registration.',
      selection_process: 'Recruitment Test (Objective MCQs) followed by in-person Interview Board.',
      stages: [
        { name: 'Recruitment Test (RT)', type: 'Objective OMR', questions: 120, duration: '120 mins', marks: 300 },
        { name: 'Interview', type: 'Personality Board', questions: 0, duration: '25 mins', marks: 100 }
      ],
      papers: [
        { paper_number: 1, title: 'EPFO Composite Recruitment Test Paper', total_questions: 120, total_marks: 300, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'english-language-comprehension', official: 'General English', weightage: 18 },
        { slug: 'indian-history-national-movement', official: 'Indian Freedom Struggle', weightage: 15 },
        { slug: 'indian-polity-governance', official: 'Indian Polity and Economy', weightage: 18 },
        { slug: 'economic-social-issues', official: 'Social Security in India & Industrial Relations', weightage: 20 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude and Mental Ability', weightage: 15 },
        { slug: 'computer-knowledge-aptitude', official: 'General Science and Computer Applications', weightage: 14 }
      ],
      aliases: ['UPSC EPFO', 'EPFO EO AO', 'EPFO APFC', 'Employees Provident Fund Organisation Exam', 'EPFO 2026']
    },

    // --- SSC EXAMINATIONS ---
    {
      name: 'SSC CHSL (Combined Higher Secondary Level 10+2)',
      slug: 'ssc-chsl',
      short_name: 'SSC CHSL',
      category: 'civil-services-govt',
      authority: 'SSC',
      description: 'National competitive recruitment examination conducted by the Staff Selection Commission for recruiting Lower Division Clerks (LDC), Junior Secretariat Assistants (JSA), and Data Entry Operators (DEO) in central government ministries and departments.',
      official_url: 'https://ssc.gov.in',
      official_notification_url: 'https://ssc.gov.in/candidate-portal/notices',
      official_syllabus_url: 'https://ssc.gov.in',
      exam_type: 'Staff Selection Clerical Recruitment',
      level: 'National',
      mode: 'Tier 1 CBT + Tier 2 CBT & Typing/Skill Test',
      frequency: 'Annually',
      duration: 'Tier 1: 60 minutes; Tier 2: 135 minutes',
      total_questions: 100,
      total_marks: 200,
      negative_marking: 'Tier 1: -0.50 marks per wrong answer; Tier 2: -1.00 mark per wrong answer',
      passing_criteria: 'Tier 1 normalization cut-off to qualify for Tier 2; merit compiled solely on Tier 2 marks.',
      eligibility: 'Must have passed 12th Standard or equivalent from a recognized board. Age: 18–27 years.',
      attempt_rules: 'No attempt cap within prescribed age limits.',
      application_information: 'Online application through ssc.gov.in with live photo capture and OTR.',
      selection_process: 'Tier-1 CBT (Screening) -> Tier-2 CBT (Session I: Maths, Reasoning, English, GA, Computer + Session II: Skill/Typing Test).',
      stages: [
        { name: 'Tier-1 CBT Examination', type: 'Objective CBT', questions: 100, duration: '60 mins', marks: 200 },
        { name: 'Tier-2 CBT & Skill Test', type: 'Objective CBT + Typing Test', questions: 135, duration: '135 mins', marks: 360 }
      ],
      papers: [
        { paper_number: 1, title: 'Tier-1 Composite Examination', total_questions: 100, total_marks: 200, duration_minutes: 60 }
      ],
      languages: ['English', 'Hindi', 'Regional Languages (13)'],
      subjects: [
        { slug: 'english-language-comprehension', official: 'English Language (Basic Knowledge)', weightage: 25 },
        { slug: 'reasoning-ability', official: 'General Intelligence and Reasoning', weightage: 25 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude (Basic Arithmetic Skill)', weightage: 25 },
        { slug: 'general-science-technology', official: 'General Awareness', weightage: 25 }
      ],
      aliases: ['SSC CHSL', 'Combined Higher Secondary Level', 'SSC 10+2', 'CHSL 2026', 'SSC LDC DEO', 'SSC CHSL Tier 1']
    },
    {
      name: 'SSC JE (Junior Engineer - Civil, Electrical, Mechanical)',
      slug: 'ssc-je',
      short_name: 'SSC JE',
      category: 'engineering-tech',
      authority: 'SSC',
      description: 'National level engineering recruitment examination conducted by Staff Selection Commission for appointment of Junior Engineers in CPWD, MES, CWC, FBP, and BRO.',
      official_url: 'https://ssc.gov.in',
      official_notification_url: 'https://ssc.gov.in/candidate-portal/notices',
      official_syllabus_url: 'https://ssc.gov.in',
      exam_type: 'Central Junior Engineer Recruitment',
      level: 'National',
      mode: 'Paper-1 CBT + Paper-2 CBT',
      frequency: 'Annually',
      duration: 'Paper-1: 120 minutes; Paper-2: 120 minutes',
      total_questions: 200,
      total_marks: 500,
      negative_marking: 'Paper-1: -0.25 marks; Paper-2: -1.00 mark per wrong answer',
      passing_criteria: 'Cumulative merit calculated from Paper-1 (200 Marks) and Paper-2 (300 Marks).',
      eligibility: 'Degree or 3-year Diploma in Civil, Electrical, or Mechanical Engineering with required experience for select departments. Age: up to 30/32 years.',
      attempt_rules: 'No limit on attempts within age criteria.',
      application_information: 'Online registration via ssc.gov.in portal.',
      selection_process: 'Paper-1 CBT (200 Marks) -> Paper-2 CBT Technical (300 Marks) -> Document Verification.',
      stages: [
        { name: 'Paper-1: Computer Based Examination', type: 'Objective CBT', questions: 200, duration: '120 mins', marks: 200 },
        { name: 'Paper-2: Computer Based Technical Examination', type: 'Technical CBT', questions: 100, duration: '120 mins', marks: 300 }
      ],
      papers: [
        { paper_number: 1, title: 'Paper-1 Composite (General Intelligence 50, GA 50, General Engineering 100)', total_questions: 200, total_marks: 200, duration_minutes: 120 },
        { paper_number: 2, title: 'Paper-2 Domain Engineering (Civil/Electrical/Mechanical)', total_questions: 100, total_marks: 300, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'reasoning-ability', official: 'General Intelligence and Reasoning', weightage: 25 },
        { slug: 'general-science-technology', official: 'General Awareness', weightage: 25 },
        { slug: 'civil-engineering', official: 'Part-A: Civil & Structural Engineering', weightage: 50 },
        { slug: 'electrical-engineering', official: 'Part-B: Electrical Engineering', weightage: 50 },
        { slug: 'mechanical-engineering', official: 'Part-C: Mechanical Engineering', weightage: 50 }
      ],
      aliases: ['SSC JE', 'SSC Junior Engineer', 'SSC JE Civil', 'SSC JE Electrical', 'SSC JE Mechanical', 'SSC JE 2026']
    },
    {
      name: 'SSC CPO (Central Police Organisation - SI in Delhi Police & CAPFs)',
      slug: 'ssc-cpo',
      short_name: 'SSC CPO',
      category: 'defence-services',
      authority: 'SSC',
      description: 'National competitive examination conducted by SSC for recruitment of Sub-Inspectors in Delhi Police, Border Security Force, Central Reserve Police Force, CISF, ITBP, and SSB.',
      official_url: 'https://ssc.gov.in',
      official_notification_url: 'https://ssc.gov.in/candidate-portal/notices',
      official_syllabus_url: 'https://ssc.gov.in',
      exam_type: 'Police Sub-Inspector Recruitment',
      level: 'National',
      mode: 'Paper-1 CBT + PET/PST + Paper-2 CBT + Detailed Medical Examination (DME)',
      frequency: 'Annually',
      duration: 'Paper-1: 120 minutes; Paper-2: 120 minutes',
      total_questions: 200,
      total_marks: 400,
      negative_marking: '-0.25 marks deduction per wrong answer in Paper 1 and Paper 2',
      passing_criteria: 'Paper-1 cutoff to qualify for Physical PET/PST; final merit is aggregate of Paper 1 (200) + Paper 2 (200).',
      eligibility: 'Bachelor’s degree from a recognized university. Driving license for LMV required for SI in Delhi Police. Age: 20–25 years.',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Online application on ssc.gov.in portal.',
      selection_process: 'Paper-1 CBT -> Physical Endurance & Measurement Test (PET/PST) -> Paper-2 CBT (English) -> DME.',
      stages: [
        { name: 'Paper-1: CBT Examination', type: 'Objective CBT', questions: 200, duration: '120 mins', marks: 200 },
        { name: 'Physical Endurance & Standard Test', type: 'Qualifying Physical Test', questions: 0, duration: '1 Day', marks: 0 },
        { name: 'Paper-2: English Language & Comprehension', type: 'Objective CBT', questions: 200, duration: '120 mins', marks: 200 }
      ],
      papers: [
        { paper_number: 1, title: 'Paper-1 Composite (Reasoning 50, GK 50, Quant 50, English 50)', total_questions: 200, total_marks: 200, duration_minutes: 120 },
        { paper_number: 2, title: 'Paper-2 English Language and Comprehension', total_questions: 200, total_marks: 200, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'reasoning-ability', official: 'General Intelligence and Reasoning', weightage: 25 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude', weightage: 25 },
        { slug: 'english-language-comprehension', official: 'English Comprehension', weightage: 50 },
        { slug: 'general-science-technology', official: 'General Knowledge and General Awareness', weightage: 25 }
      ],
      aliases: ['SSC CPO', 'SSC SI Delhi Police', 'SSC CAPF SI', 'SSC CPO SI 2026', 'SSC Sub Inspector']
    },
    {
      name: 'SSC GD Constable (General Duty in CAPFs, SSF, Assam Rifles)',
      slug: 'ssc-gd-constable',
      short_name: 'SSC GD',
      category: 'defence-services',
      authority: 'SSC',
      description: 'Massive nationwide recruitment examination conducted by SSC for Constable (General Duty) in Border Security Force (BSF), CISF, CRPF, ITBP, SSB, SSF, and Rifleman (GD) in Assam Rifles.',
      official_url: 'https://ssc.gov.in',
      official_notification_url: 'https://ssc.gov.in/candidate-portal/notices',
      official_syllabus_url: 'https://ssc.gov.in',
      exam_type: 'Constable GD Recruitment',
      level: 'National',
      mode: 'Computer Based Examination (CBT) + PET / PST + Detailed Medical Exam (DME)',
      frequency: 'Annually',
      duration: '60 minutes (1 hour)',
      total_questions: 80,
      total_marks: 160,
      negative_marking: '-0.25 marks deduction for each wrong answer (+2 for correct)',
      passing_criteria: 'Normalized marks in CBT determine qualification for Physical Standard/Endurance Test.',
      eligibility: '10th Class (Matriculation) pass from a recognized Board. Age: 18–23 years.',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Online application on ssc.gov.in.',
      selection_process: 'CBT Examination in 13 regional languages + Hindi/English -> PET/PST -> DME/RME -> Final Allotment.',
      stages: [
        { name: 'Computer Based Examination (CBT)', type: 'Objective CBT', questions: 80, duration: '60 mins', marks: 160 },
        { name: 'Physical Efficiency Test & Physical Standard Test', type: 'Physical Qualifying', questions: 0, duration: '1 Day', marks: 0 },
        { name: 'Medical Examination & Document Verification', type: 'Medical Fitness', questions: 0, duration: '1 Day', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'SSC GD Composite CBT (4 Sections of 20 Qs each)', total_questions: 80, total_marks: 160, duration_minutes: 60 }
      ],
      languages: ['English', 'Hindi', 'Regional Languages (13)'],
      subjects: [
        { slug: 'reasoning-ability', official: 'Part-A: General Intelligence and Reasoning', weightage: 25 },
        { slug: 'general-science-technology', official: 'Part-B: General Knowledge and General Awareness', weightage: 25 },
        { slug: 'quantitative-aptitude', official: 'Part-C: Elementary Mathematics', weightage: 25 },
        { slug: 'english-language-comprehension', official: 'Part-D: English Comprehension', weightage: 25 },
        { slug: 'general-hindi-language', official: 'Part-D: Hindi Bhasha Vyakaran', weightage: 25 }
      ],
      aliases: ['SSC GD', 'SSC GD Constable', 'SSC Constable GD', 'CAPF GD Constable', 'SSC GD 2026', 'Constable GD']
    },
    {
      name: 'SSC MTS (Multi Tasking Non-Technical Staff & Havaldar)',
      slug: 'ssc-mts',
      short_name: 'SSC MTS',
      category: 'civil-services-govt',
      authority: 'SSC',
      description: 'National level examination conducted by Staff Selection Commission for recruitment of Multi-Tasking (Non-Technical) Staff in central ministries and Havaldar in CBIC and CBN.',
      official_url: 'https://ssc.gov.in',
      official_notification_url: 'https://ssc.gov.in/candidate-portal/notices',
      official_syllabus_url: 'https://ssc.gov.in',
      exam_type: 'Non-Technical Staff Recruitment',
      level: 'National',
      mode: 'Computer Based Examination (Session 1 & Session 2) + Physical Test (Havaldar)',
      frequency: 'Annually',
      duration: '90 minutes total (Session 1: 45 mins, Session 2: 45 mins)',
      total_questions: 90,
      total_marks: 270,
      negative_marking: 'Session 1: NO negative marking; Session 2: -1.00 mark deduction per wrong answer',
      passing_criteria: 'Session 1 is qualifying; final merit list is prepared strictly based on performance in Session 2 (General Awareness & English).',
      eligibility: 'Must have passed Matriculation (10th Standard) examination from a recognized Board. Age: 18–25 / 18–27 years.',
      attempt_rules: 'No attempt limits within specified age brackets.',
      application_information: 'Online application via SSC portal (ssc.gov.in).',
      selection_process: 'CBT (Session 1 & 2) -> Physical Efficiency/Standard Test (PET/PST for Havaldar only) -> Document Verification.',
      stages: [
        { name: 'Session-1: Numerical & Reasoning Ability', type: 'Objective CBT (Qualifying)', questions: 40, duration: '45 mins', marks: 120 },
        { name: 'Session-2: General Awareness & English', type: 'Objective CBT (Merit-Based)', questions: 50, duration: '45 mins', marks: 150 }
      ],
      papers: [
        { paper_number: 1, title: 'Session-1 Numerical Ability & Reasoning', total_questions: 40, total_marks: 120, duration_minutes: 45 },
        { paper_number: 2, title: 'Session-2 General Awareness & English Language', total_questions: 50, total_marks: 150, duration_minutes: 45 }
      ],
      languages: ['English', 'Hindi', 'Regional Languages (13)'],
      subjects: [
        { slug: 'quantitative-aptitude', official: 'Numerical and Mathematical Ability', weightage: 22 },
        { slug: 'reasoning-ability', official: 'Reasoning Ability and Problem Solving', weightage: 22 },
        { slug: 'general-science-technology', official: 'General Awareness', weightage: 28 },
        { slug: 'english-language-comprehension', official: 'English Language and Comprehension', weightage: 28 }
      ],
      aliases: ['SSC MTS', 'SSC Havaldar', 'SSC Multi Tasking Staff', 'MTS 2026', 'SSC MTS Havaldar']
    },
    {
      name: 'SSC Stenographer (Grade C & Grade D)',
      slug: 'ssc-stenographer',
      short_name: 'SSC Stenographer',
      category: 'civil-services-govt',
      authority: 'SSC',
      description: 'National competitive recruitment examination conducted by Staff Selection Commission for appointment of Stenographers Grade ‘C’ (Group B Non-Gazetted) and Grade ‘D’ (Group C) in central government offices.',
      official_url: 'https://ssc.gov.in',
      official_notification_url: 'https://ssc.gov.in/candidate-portal/notices',
      official_syllabus_url: 'https://ssc.gov.in',
      exam_type: 'Stenographer Cadre Recruitment',
      level: 'National',
      mode: 'Computer Based Examination (CBT) + Shorthand Skill Test',
      frequency: 'Annually',
      duration: '120 minutes (2 hours)',
      total_questions: 200,
      total_marks: 200,
      negative_marking: '-0.25 marks deduction for each incorrect answer in CBT',
      passing_criteria: 'CBT cutoff to qualify for Shorthand Skill Test (Grade C: 100 wpm, Grade D: 80 wpm).',
      eligibility: '12th Standard pass or equivalent from a recognized board. Age: 18–30 (Grade C), 18–27 (Grade D).',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Online application on ssc.gov.in.',
      selection_process: 'CBT Examination -> Skill Test in Stenography (Hindi/English) -> Document Verification.',
      stages: [
        { name: 'Computer Based Examination', type: 'Objective CBT', questions: 200, duration: '120 mins', marks: 200 },
        { name: 'Skill Test in Stenography', type: 'Transcription & Dictation Test', questions: 0, duration: 'Dictation 10 mins + Transcription', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'SSC Steno Composite CBT (Reasoning 50, GA 50, English 100)', total_questions: 200, total_marks: 200, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'reasoning-ability', official: 'General Intelligence & Reasoning', weightage: 25 },
        { slug: 'general-science-technology', official: 'General Awareness', weightage: 25 },
        { slug: 'english-language-comprehension', official: 'English Language & Comprehension', weightage: 50 }
      ],
      aliases: ['SSC Stenographer', 'SSC Steno Grade C D', 'SSC Steno 2026', 'SSC Stenographer Group C D']
    },
    {
      name: 'SSC Selection Post (Phase Examinations)',
      slug: 'ssc-selection-post',
      short_name: 'SSC Selection Post',
      category: 'civil-services-govt',
      authority: 'SSC',
      description: 'Special multi-level recruitment examination conducted by SSC for hundreds of diverse technical, ministerial, and specialized posts across Matriculation, Higher Secondary (10+2), and Graduation levels.',
      official_url: 'https://ssc.gov.in',
      official_notification_url: 'https://ssc.gov.in/candidate-portal/notices',
      official_syllabus_url: 'https://ssc.gov.in',
      exam_type: 'Multi-Level Specialized Post Recruitment',
      level: 'National',
      mode: 'Computer Based Examination (CBT) + Skill Test / Scrutiny',
      frequency: 'Annually (Phase Cycles)',
      duration: '60 minutes (1 hour)',
      total_questions: 100,
      total_marks: 200,
      negative_marking: '-0.50 marks for each wrong response (+2 marks for correct)',
      passing_criteria: 'Category-wise minimum qualifying mark in CBT to undergo document scrutiny and skill tests.',
      eligibility: 'Matriculation / 10+2 / Graduation based on specific post code applied. Age: 18–30/35 years.',
      attempt_rules: 'Candidates can apply for multiple posts across levels.',
      application_information: 'Online portal application at ssc.gov.in.',
      selection_process: 'CBT Examination -> Scrutiny of hard-copy documents -> Skill Test (where applicable) -> Final Selection.',
      stages: [
        { name: 'Computer Based Examination', type: 'Objective CBT', questions: 100, duration: '60 mins', marks: 200 },
        { name: 'Document Scrutiny & Skill Evaluation', type: 'Verification Process', questions: 0, duration: 'Ongoing', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'Selection Post CBT (Reasoning 25, GA 25, Quant 25, English 25)', total_questions: 100, total_marks: 200, duration_minutes: 60 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'reasoning-ability', official: 'General Intelligence', weightage: 25 },
        { slug: 'general-science-technology', official: 'General Awareness', weightage: 25 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude (Basic/Advanced)', weightage: 25 },
        { slug: 'english-language-comprehension', official: 'English Language (Basic Knowledge)', weightage: 25 }
      ],
      aliases: ['SSC Selection Post', 'SSC Phase Exam', 'SSC Selection Post Phase XII', 'SSC Selection Post Phase XIII', 'SSC Phase 2026']
    },

    // --- BANKING & REGULATORY BODIES ---
    {
      name: 'IBPS Clerk (CRP Clerical Cadre)',
      slug: 'ibps-clerk',
      short_name: 'IBPS Clerk',
      category: 'banking-financial-services',
      authority: 'IBPS',
      description: 'Common Recruitment Process conducted by IBPS for appointment of Clerical cadre personnel in 11 participating public sector banks across India.',
      official_url: 'https://ibps.in',
      official_notification_url: 'https://ibps.in/index.php/crp-clerical-cadre/',
      official_syllabus_url: 'https://ibps.in',
      exam_type: 'Public Sector Bank Clerical Recruitment',
      level: 'National',
      mode: 'Preliminary CBT + Main CBT',
      frequency: 'Annually',
      duration: 'Prelims: 60 minutes; Mains: 160 minutes',
      total_questions: 100,
      total_marks: 200,
      negative_marking: '0.25 (1/4th) of marks assigned to that question deducted for wrong answer',
      passing_criteria: 'Sectional and overall cutoffs in Prelims to qualify for Mains; final merit determined 100% on Mains CBT marks (No Interview).',
      eligibility: 'A Degree (Graduation) in any discipline from a recognized University. Proficiency in local language of State/UT. Age: 20–28 years.',
      attempt_rules: 'No limit on number of attempts within age boundary.',
      application_information: 'Online application on ibps.in.',
      selection_process: 'Phase-I Preliminary Exam -> Phase-II Main Exam -> State/UT Bank Allotment.',
      stages: [
        { name: 'Phase-I: Preliminary Examination', type: 'Objective CBT', questions: 100, duration: '60 mins', marks: 100 },
        { name: 'Phase-II: Main Examination', type: 'Objective CBT', questions: 190, duration: '160 mins', marks: 200 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims (English 30, Numerical Ability 35, Reasoning 35)', total_questions: 100, total_marks: 100, duration_minutes: 60 },
        { paper_number: 2, title: 'Mains (General/Financial Awareness 50, English 40, Reasoning & Computer 50, Quant 50)', total_questions: 190, total_marks: 200, duration_minutes: 160 }
      ],
      languages: ['English', 'Hindi', 'Regional Languages (13)'],
      subjects: [
        { slug: 'quantitative-aptitude', official: 'Numerical Ability / Quantitative Aptitude', weightage: 30 },
        { slug: 'reasoning-ability', official: 'Reasoning Ability & Computer Aptitude', weightage: 30 },
        { slug: 'english-language-comprehension', official: 'English Language', weightage: 20 },
        { slug: 'general-banking-awareness', official: 'General / Financial Awareness', weightage: 20 }
      ],
      aliases: ['IBPS Clerk', 'IBPS CRP Clerical', 'IBPS Clerk 2026', 'Bank Clerk Exam', 'IBPS Clerk Prelims Mains']
    },
    {
      name: 'IBPS SO (Specialist Officer - IT, Agriculture, Marketing, HR, Law)',
      slug: 'ibps-so',
      short_name: 'IBPS SO',
      category: 'banking-financial-services',
      authority: 'IBPS',
      description: 'Common Recruitment Process for selection of Specialist Officers (Scale I) including IT Officer, Agricultural Field Officer (AFO), Rajbhasha Adhikari, Law Officer, HR/Personnel Officer, and Marketing Officer in participating banks.',
      official_url: 'https://ibps.in',
      official_notification_url: 'https://ibps.in/index.php/crp-specialist-officers/',
      official_syllabus_url: 'https://ibps.in',
      exam_type: 'Specialist Banking Cadre Recruitment',
      level: 'National',
      mode: 'Preliminary CBT + Main CBT (Professional Knowledge) + Interview',
      frequency: 'Annually',
      duration: 'Prelims: 120 minutes; Mains: 45 minutes',
      total_questions: 150,
      total_marks: 200,
      negative_marking: '0.25 (1/4th) penalty for incorrect answers in Prelims and Mains',
      passing_criteria: 'Prelims is screening; 80:20 weightage between Main Exam and Interview for final merit.',
      eligibility: 'Specialized 4-year degree (B.Tech in CS/IT for IT Officer, B.Sc Agriculture for AFO, LLB for Law, MBA for Marketing/HR). Age: 20–30 years.',
      attempt_rules: 'No cap on attempts within age eligibility.',
      application_information: 'Online application at ibps.in.',
      selection_process: 'Phase-I Prelims -> Phase-II Mains (Professional Knowledge) -> Phase-III Interview.',
      stages: [
        { name: 'Phase-I: Preliminary Examination', type: 'Objective CBT', questions: 150, duration: '120 mins', marks: 125 },
        { name: 'Phase-II: Main Examination (Professional Knowledge)', type: 'Domain Objective CBT', questions: 60, duration: '45 mins', marks: 60 },
        { name: 'Phase-III: Common Interview', type: 'Panel Interview', questions: 0, duration: '20 mins', marks: 100 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims Composite Examination', total_questions: 150, total_marks: 125, duration_minutes: 120 },
        { paper_number: 2, title: 'Mains Professional Knowledge Paper', total_questions: 60, total_marks: 60, duration_minutes: 45 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'reasoning-ability', official: 'Reasoning Ability', weightage: 25 },
        { slug: 'english-language-comprehension', official: 'English Language', weightage: 20 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude', weightage: 25 },
        { slug: 'computer-science-it', official: 'Professional Knowledge (IT / Computer Science)', weightage: 30 },
        { slug: 'agriculture-rural-development', official: 'Professional Knowledge (Agriculture Field Officer)', weightage: 30 }
      ],
      aliases: ['IBPS SO', 'IBPS Specialist Officer', 'IBPS IT Officer', 'IBPS AFO', 'IBPS Law Officer', 'IBPS SO 2026']
    },
    {
      name: 'IBPS RRB Officer Scale-I (Regional Rural Banks PO)',
      slug: 'ibps-rrb-po',
      short_name: 'IBPS RRB PO',
      category: 'banking-financial-services',
      authority: 'IBPS',
      description: 'Unified national recruitment examination conducted by IBPS for appointment of Group ‘A’ Officers (Scale-I / Probationary Officer) in 43 Regional Rural Banks (Gramin Banks) across Indian states.',
      official_url: 'https://ibps.in',
      official_notification_url: 'https://ibps.in/index.php/crp-rrb/',
      official_syllabus_url: 'https://ibps.in',
      exam_type: 'Rural Banking Officer Recruitment',
      level: 'National',
      mode: 'Preliminary CBT + Main CBT + Interview',
      frequency: 'Annually',
      duration: 'Prelims: 45 minutes; Mains: 120 minutes',
      total_questions: 80,
      total_marks: 200,
      negative_marking: '0.25 (1/4th) deduction per incorrect response',
      passing_criteria: 'Prelims score qualifies for Mains; 80:20 combined weightage of Mains CBT and Interview for final merit.',
      eligibility: 'Bachelor’s degree in any discipline from a recognized University. Proficiency in local language of the State/UT. Age: 18–30 years.',
      attempt_rules: 'No restriction on number of attempts.',
      application_information: 'Online application via ibps.in.',
      selection_process: 'Phase-I Prelims -> Phase-II Mains -> Phase-III Interview -> Bank Allotment.',
      stages: [
        { name: 'Phase-I: Preliminary Examination', type: 'Objective CBT', questions: 80, duration: '45 mins', marks: 80 },
        { name: 'Phase-II: Main Examination', type: 'Objective CBT', questions: 200, duration: '120 mins', marks: 200 },
        { name: 'Phase-III: Interview', type: 'Panel Interview', questions: 0, duration: '20 mins', marks: 100 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims (Reasoning 40, Quantitative Aptitude 40)', total_questions: 80, total_marks: 80, duration_minutes: 45 },
        { paper_number: 2, title: 'Mains (Reasoning 40, Computer 40, GA 40, English/Hindi 40, Quant 40)', total_questions: 200, total_marks: 200, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi', 'Regional Languages (13)'],
      subjects: [
        { slug: 'reasoning-ability', official: 'Reasoning Ability', weightage: 25 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude', weightage: 25 },
        { slug: 'general-banking-awareness', official: 'General Awareness (with Financial/Rural Focus)', weightage: 20 },
        { slug: 'computer-knowledge-aptitude', official: 'Computer Knowledge', weightage: 10 },
        { slug: 'english-language-comprehension', official: 'English Language (Optional with Hindi)', weightage: 20 },
        { slug: 'general-hindi-language', official: 'Hindi Language (Optional with English)', weightage: 20 }
      ],
      aliases: ['IBPS RRB PO', 'IBPS RRB Officer Scale 1', 'Gramin Bank PO', 'IBPS RRB Scale I', 'RRB PO 2026']
    },
    {
      name: 'IBPS RRB Office Assistant (Multipurpose / Clerk)',
      slug: 'ibps-rrb-clerk',
      short_name: 'IBPS RRB Clerk',
      category: 'banking-financial-services',
      authority: 'IBPS',
      description: 'National competitive examination conducted by IBPS for direct recruitment of Office Assistants (Multipurpose) across Regional Rural Banks in India (No Interview stage).',
      official_url: 'https://ibps.in',
      official_notification_url: 'https://ibps.in/index.php/crp-rrb/',
      official_syllabus_url: 'https://ibps.in',
      exam_type: 'Rural Banking Clerical Recruitment',
      level: 'National',
      mode: 'Preliminary CBT + Main CBT',
      frequency: 'Annually',
      duration: 'Prelims: 45 minutes; Mains: 120 minutes',
      total_questions: 80,
      total_marks: 200,
      negative_marking: '0.25 (1/4th) deduction per wrong answer',
      passing_criteria: 'Prelims cutoff for Mains entry; final merit determined 100% on performance in Mains CBT.',
      eligibility: 'Bachelor’s degree in any discipline. Proficiency in local language of State. Age: 18–28 years.',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Online portal registration at ibps.in.',
      selection_process: 'Phase-I Prelims Examination -> Phase-II Mains Examination -> Final State-wise Merit Allotment.',
      stages: [
        { name: 'Phase-I: Preliminary Examination', type: 'Objective CBT', questions: 80, duration: '45 mins', marks: 80 },
        { name: 'Phase-II: Main Examination', type: 'Objective CBT', questions: 200, duration: '120 mins', marks: 200 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims (Reasoning 40, Numerical Ability 40)', total_questions: 80, total_marks: 80, duration_minutes: 45 },
        { paper_number: 2, title: 'Mains (Reasoning 40, Computer 40, GA 40, English/Hindi 40, Numerical 40)', total_questions: 200, total_marks: 200, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi', 'Regional Languages (13)'],
      subjects: [
        { slug: 'reasoning-ability', official: 'Reasoning Ability', weightage: 25 },
        { slug: 'quantitative-aptitude', official: 'Numerical Ability', weightage: 25 },
        { slug: 'general-banking-awareness', official: 'General Awareness', weightage: 20 },
        { slug: 'computer-knowledge-aptitude', official: 'Computer Knowledge', weightage: 10 },
        { slug: 'english-language-comprehension', official: 'English Language (Optional with Hindi)', weightage: 20 },
        { slug: 'general-hindi-language', official: 'Hindi Language (Optional with English)', weightage: 20 }
      ],
      aliases: ['IBPS RRB Clerk', 'IBPS RRB Office Assistant', 'Gramin Bank Clerk', 'RRB Clerk 2026', 'RRB Office Assistant']
    },
    {
      name: 'SBI Clerk (Junior Associates - Customer Support & Sales)',
      slug: 'sbi-clerk',
      short_name: 'SBI Clerk',
      category: 'banking-financial-services',
      authority: 'SBI',
      description: 'Nationwide premier recruitment examination conducted by the State Bank of India for hiring Junior Associates (Customer Support & Sales) in branches across all Indian states and Union Territories.',
      official_url: 'https://sbi.co.in/web/careers',
      official_notification_url: 'https://sbi.co.in/web/careers/current-openings',
      official_syllabus_url: 'https://sbi.co.in/web/careers',
      exam_type: 'Premier Bank Clerical Recruitment',
      level: 'National',
      mode: 'Preliminary CBT + Main CBT + Language Proficiency Test (LPT)',
      frequency: 'Annually',
      duration: 'Prelims: 60 minutes; Mains: 160 minutes',
      total_questions: 100,
      total_marks: 200,
      negative_marking: '1/4th (0.25) marks deducted for every incorrect response in CBT',
      passing_criteria: 'Prelims score is screening; 100% final merit based on Mains CBT score followed by qualifying LPT.',
      eligibility: 'Graduation in any discipline from a recognized University. Age: 20–28 years.',
      attempt_rules: 'No cap on attempts within prescribed age limits.',
      application_information: 'Online registration on sbi.co.in/careers.',
      selection_process: 'Phase-I Prelims -> Phase-II Mains -> Local Language Proficiency Test -> Final Appointment.',
      stages: [
        { name: 'Phase-I: Preliminary Examination', type: 'Objective CBT', questions: 100, duration: '60 mins', marks: 100 },
        { name: 'Phase-II: Main Examination', type: 'Objective CBT', questions: 190, duration: '160 mins', marks: 200 },
        { name: 'Language Proficiency Test (LPT)', type: 'Language Test', questions: 0, duration: 'Qualifying', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims (English 30, Numerical Ability 35, Reasoning 35)', total_questions: 100, total_marks: 100, duration_minutes: 60 },
        { paper_number: 2, title: 'Mains (General/Financial Awareness 50, English 40, Quant 50, Reasoning & Computer 50)', total_questions: 190, total_marks: 200, duration_minutes: 160 }
      ],
      languages: ['English', 'Hindi', 'Regional Languages (13)'],
      subjects: [
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude', weightage: 30 },
        { slug: 'reasoning-ability', official: 'Reasoning Ability & Computer Aptitude', weightage: 30 },
        { slug: 'english-language-comprehension', official: 'General English', weightage: 20 },
        { slug: 'general-banking-awareness', official: 'General / Financial Awareness', weightage: 20 }
      ],
      aliases: ['SBI Clerk', 'SBI Junior Associates', 'State Bank of India Clerk', 'SBI JA 2026', 'SBI Clerk Prelims Mains']
    },
    {
      name: 'RBI Grade B (Officers in Grade ‘B’ - General)',
      slug: 'rbi-grade-b',
      short_name: 'RBI Grade B',
      category: 'banking-financial-services',
      authority: 'RBI',
      description: 'Apex central banking recruitment examination conducted by the Reserve Bank of India Services Board for inducting high-caliber Direct Recruit Officers in Grade ‘B’ (General) cadre.',
      official_url: 'https://www.rbi.org.in',
      official_notification_url: 'https://opportunities.rbi.org.in',
      official_syllabus_url: 'https://opportunities.rbi.org.in',
      exam_type: 'Central Banking Apex Officer Recruitment',
      level: 'National',
      mode: 'Phase-I CBT + Phase-II (CBT & Descriptive) + Interview',
      frequency: 'Annually',
      duration: 'Phase-I: 120 minutes; Phase-II: 300 minutes across 3 papers',
      total_questions: 200,
      total_marks: 375,
      negative_marking: '0.25 (1/4th) marks deducted per incorrect answer in Phase-I and Phase-II objective sections',
      passing_criteria: 'Phase-I sectional & aggregate cutoffs; Phase-II aggregate (300 Marks) + Interview (75 Marks) determine final selection.',
      eligibility: 'Graduation with minimum 60% marks (50% for SC/ST/PwBD) or Post-Graduation with 55% marks. Age: 21–30 years.',
      attempt_rules: 'General category candidates have a maximum of 6 attempts for Phase-I exam; no limit for SC/ST/OBC/PwBD.',
      application_information: 'Online portal application on rbi.org.in (Opportunities section).',
      selection_process: 'Phase-I Online Exam (200 Marks) -> Phase-II Online Exam (300 Marks: ESI, English, FM) -> Phase-III Interview (75 Marks).',
      stages: [
        { name: 'Phase-I: Online Examination', type: 'Objective CBT', questions: 200, duration: '120 mins', marks: 200 },
        { name: 'Phase-II: Online Examination', type: 'Objective + Descriptive', questions: 90, duration: '300 mins', marks: 300 },
        { name: 'Phase-III: Interview', type: 'High-Level Board Interview', questions: 0, duration: '30 mins', marks: 75 }
      ],
      papers: [
        { paper_number: 1, title: 'Phase-I Composite (General Awareness 80, Reasoning 60, English 30, Quant 30)', total_questions: 200, total_marks: 200, duration_minutes: 120 },
        { paper_number: 2, title: 'Phase-II Paper-I: Economic and Social Issues (ESI)', total_questions: 30, total_marks: 100, duration_minutes: 120 },
        { paper_number: 3, title: 'Phase-II Paper-II: English (Writing Skills)', total_questions: 3, total_marks: 100, duration_minutes: 90 },
        { paper_number: 4, title: 'Phase-II Paper-III: Finance and Management (FM)', total_questions: 30, total_marks: 100, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'general-banking-awareness', official: 'General Awareness (Phase 1)', weightage: 25 },
        { slug: 'reasoning-ability', official: 'Reasoning Ability (Phase 1)', weightage: 20 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude (Phase 1)', weightage: 10 },
        { slug: 'english-language-comprehension', official: 'English Language (Phase 1 & Phase 2 Writing Skills)', weightage: 20 },
        { slug: 'economic-social-issues', official: 'Economic and Social Issues (ESI - Phase 2)', weightage: 25 },
        { slug: 'finance-management', official: 'Finance and Management (FM - Phase 2)', weightage: 25 }
      ],
      aliases: ['RBI Grade B', 'RBI Officer Grade B', 'Reserve Bank of India Grade B', 'RBI Grade B General', 'RBI Grade B 2026']
    },
    {
      name: 'RBI Assistant',
      slug: 'rbi-assistant',
      short_name: 'RBI Assistant',
      category: 'banking-financial-services',
      authority: 'RBI',
      description: 'National recruitment examination conducted by the Reserve Bank of India for recruitment to Assistant posts in various regional offices of the Bank.',
      official_url: 'https://www.rbi.org.in',
      official_notification_url: 'https://opportunities.rbi.org.in',
      official_syllabus_url: 'https://opportunities.rbi.org.in',
      exam_type: 'Central Bank Clerical Cadre Recruitment',
      level: 'National',
      mode: 'Preliminary CBT + Main CBT + Language Proficiency Test (LPT)',
      frequency: 'Annually / Periodic',
      duration: 'Prelims: 60 minutes; Mains: 135 minutes',
      total_questions: 100,
      total_marks: 200,
      negative_marking: '0.25 (1/4th) deduction per incorrect response in CBT',
      passing_criteria: 'Prelims cutoff to qualify for Mains; final merit decided solely by Mains score subject to qualifying LPT.',
      eligibility: 'Bachelor’s Degree in any discipline with a minimum of 50% marks (pass class for SC/ST/PwBD). Age: 20–28 years.',
      attempt_rules: 'No attempt restrictions within age bracket.',
      application_information: 'Online application via rbi.org.in.',
      selection_process: 'Phase-I Prelims -> Phase-II Mains -> Language Proficiency Test (LPT) -> Final Allotment.',
      stages: [
        { name: 'Phase-I: Preliminary Examination', type: 'Objective CBT', questions: 100, duration: '60 mins', marks: 100 },
        { name: 'Phase-II: Main Examination', type: 'Objective CBT', questions: 200, duration: '135 mins', marks: 200 },
        { name: 'Language Proficiency Test (LPT)', type: 'Regional Language Test', questions: 0, duration: 'Qualifying', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'Prelims (English 30, Numerical Ability 35, Reasoning 35)', total_questions: 100, total_marks: 100, duration_minutes: 60 },
        { paper_number: 2, title: 'Mains (Reasoning 40, English 40, Numerical 40, GA 40, Computer 40)', total_questions: 200, total_marks: 200, duration_minutes: 135 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'reasoning-ability', official: 'Reasoning Ability', weightage: 25 },
        { slug: 'quantitative-aptitude', official: 'Numerical Ability', weightage: 25 },
        { slug: 'english-language-comprehension', official: 'English Language', weightage: 20 },
        { slug: 'general-banking-awareness', official: 'General Awareness', weightage: 20 },
        { slug: 'computer-knowledge-aptitude', official: 'Computer Knowledge', weightage: 10 }
      ],
      aliases: ['RBI Assistant', 'Reserve Bank of India Assistant', 'RBI Assistant 2026', 'RBI Assistant Prelims Mains']
    },
    {
      name: 'NABARD Grade A (Assistant Manager - RDBS)',
      slug: 'nabard-grade-a',
      short_name: 'NABARD Grade A',
      category: 'banking-financial-services',
      authority: 'NABARD',
      description: 'Apex national recruitment examination conducted by NABARD for hiring Assistant Managers (Grade ‘A’) in the Rural Development Banking Service (RDBS) and Rajbhasha/Protocol services.',
      official_url: 'https://www.nabard.org',
      official_notification_url: 'https://www.nabard.org/careers-notices.aspx',
      official_syllabus_url: 'https://www.nabard.org',
      exam_type: 'Development Banking Officer Recruitment',
      level: 'National',
      mode: 'Phase-I Online Exam + Phase-II (Online & Descriptive) + Interview',
      frequency: 'Annually',
      duration: 'Phase-I: 120 minutes; Phase-II: 180 minutes',
      total_questions: 200,
      total_marks: 250,
      negative_marking: '0.25 (1/4th) deduction for wrong answers in objective sections',
      passing_criteria: 'Phase-I merit sections (GA, ESI, ARD) determine Phase-II shortlisting; Phase-II (200) + Interview (50) decide final merit.',
      eligibility: 'Bachelor’s degree in any subject with minimum 60% marks (55% for SC/ST/PWBD) or Post-Graduate degree with 55%. Age: 21–30 years.',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Online portal registration at nabard.org.',
      selection_process: 'Phase-I Preliminary Exam (200 Marks) -> Phase-II Main Exam (200 Marks) -> Phase-III Interview (50 Marks).',
      stages: [
        { name: 'Phase-I: Preliminary Online Examination', type: 'Objective CBT', questions: 200, duration: '120 mins', marks: 200 },
        { name: 'Phase-II: Main Online & Descriptive Examination', type: 'Objective + Descriptive', questions: 60, duration: '180 mins', marks: 200 },
        { name: 'Phase-III: Interview', type: 'Personality Board', questions: 0, duration: '25 mins', marks: 50 }
      ],
      papers: [
        { paper_number: 1, title: 'Phase-I Composite (Qualifying & Merit Sections: ARD 40, ESI 40, GA 20, Reasoning 20, Quant 20, English 30, Computer 20, Decision Making 10)', total_questions: 200, total_marks: 200, duration_minutes: 120 },
        { paper_number: 2, title: 'Phase-II Paper-I: General English Descriptive', total_questions: 3, total_marks: 100, duration_minutes: 90 },
        { paper_number: 3, title: 'Phase-II Paper-II: Economic and Social Issues & Agriculture and Rural Development', total_questions: 34, total_marks: 100, duration_minutes: 90 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'agriculture-rural-development', official: 'Agriculture & Rural Development (ARD with Rural Focus)', weightage: 35 },
        { slug: 'economic-social-issues', official: 'Economic and Social Issues (ESI)', weightage: 35 },
        { slug: 'general-banking-awareness', official: 'General Awareness', weightage: 10 },
        { slug: 'reasoning-ability', official: 'Reasoning Ability & Decision Making', weightage: 10 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude', weightage: 10 },
        { slug: 'english-language-comprehension', official: 'General English (Descriptive & Objective)', weightage: 20 }
      ],
      aliases: ['NABARD Grade A', 'NABARD Assistant Manager', 'NABARD RDBS', 'NABARD Grade A 2026', 'NABARD Assistant Manager RDBS']
    },
    {
      name: 'SEBI Grade A (Assistant Manager - General Stream)',
      slug: 'sebi-grade-a',
      short_name: 'SEBI Grade A',
      category: 'banking-financial-services',
      authority: 'SEBI',
      description: 'Premier securities regulatory competitive recruitment examination conducted by SEBI for appointing Assistant Managers (Grade ‘A’) across General, Legal, Information Technology, Engineering, and Research streams.',
      official_url: 'https://www.sebi.gov.in',
      official_notification_url: 'https://www.sebi.gov.in/sebiweb/other/career.jsp',
      official_syllabus_url: 'https://www.sebi.gov.in',
      exam_type: 'Securities Regulatory Officer Recruitment',
      level: 'National',
      mode: 'Phase-I Online Exam + Phase-II Online Exam + Interview',
      frequency: 'Annually',
      duration: 'Phase-I: 100 minutes; Phase-II: 100 minutes',
      total_questions: 180,
      total_marks: 200,
      negative_marking: '0.25 (1/4th) deduction per incorrect response in Phase-I and Phase-II Paper-2',
      passing_criteria: 'Phase-I requires 30% in Paper 1, 40% in Paper 2, and aggregate 40%; Phase-II marks (85% weightage) + Interview (15% weightage) decide final rank.',
      eligibility: 'Master’s Degree in any discipline / Bachelor’s Degree in Law / Bachelor’s Degree in Engineering / CA / CFA / CS / Cost Accountant. Age: Up to 30 years.',
      attempt_rules: 'No restriction on number of attempts.',
      application_information: 'Online portal registration at sebi.gov.in.',
      selection_process: 'Phase-I Online Examination (2 Papers) -> Phase-II Online Examination (2 Papers) -> Phase-III Interview.',
      stages: [
        { name: 'Phase-I: Online Examination', type: 'Objective CBT', questions: 180, duration: '100 mins', marks: 200 },
        { name: 'Phase-II: Online Examination', type: 'Descriptive English + Stream Objective', questions: 53, duration: '100 mins', marks: 200 },
        { name: 'Phase-III: Interview', type: 'Regulatory Board Interview', questions: 0, duration: '25 mins', marks: 50 }
      ],
      papers: [
        { paper_number: 1, title: 'Phase-I Paper-1: GA, English, Quant, Reasoning', total_questions: 80, total_marks: 100, duration_minutes: 60 },
        { paper_number: 2, title: 'Phase-I Paper-2: Commerce, Accountancy, Management, Finance, Costing, Companies Act, Economics', total_questions: 50, total_marks: 100, duration_minutes: 40 },
        { paper_number: 3, title: 'Phase-II Paper-1: English Descriptive (Drafting & Essay)', total_questions: 3, total_marks: 100, duration_minutes: 60 },
        { paper_number: 4, title: 'Phase-II Paper-2: General Stream Specialized Domain Knowledge', total_questions: 50, total_marks: 100, duration_minutes: 40 }
      ],
      languages: ['English', 'Hindi'],
      subjects: [
        { slug: 'finance-management', official: 'Commerce, Accountancy, Management & Finance', weightage: 40 },
        { slug: 'economic-social-issues', official: 'Economics & Companies Act Regulations', weightage: 30 },
        { slug: 'general-banking-awareness', official: 'General Awareness (Financial Sector)', weightage: 10 },
        { slug: 'reasoning-ability', official: 'Reasoning Ability', weightage: 10 },
        { slug: 'quantitative-aptitude', official: 'Quantitative Aptitude', weightage: 10 },
        { slug: 'english-language-comprehension', official: 'English Language & Drafting Skills', weightage: 20 }
      ],
      aliases: ['SEBI Grade A', 'SEBI Assistant Manager', 'Securities and Exchange Board of India Grade A', 'SEBI General Stream', 'SEBI Grade A 2026']
    },

    // --- RAILWAY RECRUITMENT BOARDS (RRB) ---
    {
      name: 'RRB NTPC (Non-Technical Popular Categories - Graduate & Undergraduate)',
      slug: 'rrb-ntpc',
      short_name: 'RRB NTPC',
      category: 'other-competitive-exams',
      authority: 'RRB',
      description: 'Major nationwide recruitment examination conducted by Railway Recruitment Control Board for recruitment to Non-Technical Popular Categories including Station Master, Goods Train Manager, Commercial Apprentice, Senior Clerk cum Typist, and Junior Clerk in Indian Railways.',
      official_url: 'https://indianrailways.gov.in',
      official_notification_url: 'https://www.rrbcdg.gov.in',
      official_syllabus_url: 'https://www.rrbcdg.gov.in',
      exam_type: 'Central Railway Non-Technical Recruitment',
      level: 'National',
      mode: '1st Stage CBT + 2nd Stage CBT + CBAT / Typing Skill Test (post-wise) + DV & Medical',
      frequency: 'Periodic Recruitment Cycle',
      duration: 'CBT 1: 90 minutes; CBT 2: 90 minutes',
      total_questions: 100,
      total_marks: 120,
      negative_marking: '1/3rd (0.33) marks deducted for each wrong response in CBT 1 and CBT 2',
      passing_criteria: 'CBT 1 normalized score shortlists 15x candidates for CBT 2; merit compiled solely on CBT 2 (and CBAT for Station Master).',
      eligibility: '12th Pass (for Undergraduate Level posts) or University Degree (for Graduate Level posts). Age: 18–33/36 years.',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Centralized online application through respective Zonal RRB websites.',
      selection_process: '1st Stage CBT (Screening 100 Marks) -> 2nd Stage CBT (Merit 120 Marks) -> CBAT/Typing -> Document Verification & Medical.',
      stages: [
        { name: '1st Stage Computer Based Test (CBT-1)', type: 'Objective CBT', questions: 100, duration: '90 mins', marks: 100 },
        { name: '2nd Stage Computer Based Test (CBT-2)', type: 'Objective CBT', questions: 120, duration: '90 mins', marks: 120 },
        { name: 'Computer Based Aptitude Test (CBAT) / Typing Skill Test', type: 'Skill/Aptitude Test', questions: 0, duration: 'Varies', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'CBT-1 Composite (General Awareness 40, Mathematics 30, General Intelligence & Reasoning 30)', total_questions: 100, total_marks: 100, duration_minutes: 90 },
        { paper_number: 2, title: 'CBT-2 Composite (General Awareness 50, Mathematics 35, General Intelligence & Reasoning 35)', total_questions: 120, total_marks: 120, duration_minutes: 90 }
      ],
      languages: ['English', 'Hindi', 'Regional Languages (13)'],
      subjects: [
        { slug: 'general-science-technology', official: 'General Awareness & Current Affairs', weightage: 40 },
        { slug: 'quantitative-aptitude', official: 'Mathematics (Number System, Decimals, Fractions, LCM, HCF, Mensuration, Algebra)', weightage: 30 },
        { slug: 'reasoning-ability', official: 'General Intelligence and Reasoning', weightage: 30 }
      ],
      aliases: ['RRB NTPC', 'Railway NTPC', 'RRB Non-Technical Popular Categories', 'NTPC 2026', 'Railway Recruitment Board NTPC', 'RRB Station Master']
    },
    {
      name: 'RRB Group D (RRC Level 1 Posts)',
      slug: 'rrb-group-d',
      short_name: 'RRB Group D',
      category: 'other-competitive-exams',
      authority: 'RRB',
      description: 'Nationwide mass recruitment examination conducted by Railway Recruitment Cells (RRC) and Railway Recruitment Control Board for filling Level 1 posts (Track Maintainer Grade IV, Pointsman, Helpers in Electrical/Mechanical/S&T) in Indian Railways.',
      official_url: 'https://indianrailways.gov.in',
      official_notification_url: 'https://www.rrbcdg.gov.in',
      official_syllabus_url: 'https://www.rrbcdg.gov.in',
      exam_type: 'Railway Level 1 Mass Recruitment',
      level: 'National',
      mode: 'Computer Based Test (CBT) + Physical Efficiency Test (PET) + DV & Medical',
      frequency: 'Periodic Recruitment Cycle',
      duration: '90 minutes (1.5 hours)',
      total_questions: 100,
      total_marks: 100,
      negative_marking: '1/3rd (0.33) mark deduction for each incorrect response',
      passing_criteria: 'Normalized marks in CBT determine 3x qualification for Physical Efficiency Test (PET).',
      eligibility: '10th pass (OR) ITI from institutions recognized by NCVT/SCVT (OR) National Apprenticeship Certificate (NAC). Age: 18–33/36 years.',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Online portal registration through official RRB portals.',
      selection_process: 'Single-Stage CBT Examination (100 Marks) -> Physical Efficiency Test (PET) -> Document Verification and Medical Examination.',
      stages: [
        { name: 'Computer Based Test (CBT)', type: 'Objective CBT', questions: 100, duration: '90 mins', marks: 100 },
        { name: 'Physical Efficiency Test (PET)', type: 'Physical Fitness Test', questions: 0, duration: '1 Day', marks: 0 },
        { name: 'Document Verification & Medical Examination', type: 'Verification', questions: 0, duration: '1 Day', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'RRB Group D Composite CBT (General Science 25, Maths 25, Reasoning 30, GA 20)', total_questions: 100, total_marks: 100, duration_minutes: 90 }
      ],
      languages: ['English', 'Hindi', 'Regional Languages (13)'],
      subjects: [
        { slug: 'general-science-technology', official: 'General Science (10th Standard CBSE Physics, Chemistry, Life Sciences)', weightage: 25 },
        { slug: 'quantitative-aptitude', official: 'Mathematics', weightage: 25 },
        { slug: 'reasoning-ability', official: 'General Intelligence and Reasoning', weightage: 30 },
        { slug: 'current-affairs-national-international', official: 'General Awareness on Current Affairs', weightage: 20 }
      ],
      aliases: ['RRB Group D', 'RRC Group D', 'Railway Group D', 'Railway Level 1', 'RRC Level 1 2026', 'RRB Track Maintainer']
    },
    {
      name: 'RRB JE (Junior Engineer - Civil, Mechanical, Electrical, Electronics, IT)',
      slug: 'rrb-je',
      short_name: 'RRB JE',
      category: 'engineering-tech',
      authority: 'RRB',
      description: 'National technical recruitment examination conducted by Railway Recruitment Control Board for recruitment of Junior Engineers, Depot Material Superintendents (DMS), and Chemical & Metallurgical Assistants (CMA) across Indian Railway zones.',
      official_url: 'https://indianrailways.gov.in',
      official_notification_url: 'https://www.rrbcdg.gov.in',
      official_syllabus_url: 'https://www.rrbcdg.gov.in',
      exam_type: 'Railway Technical Engineer Recruitment',
      level: 'National',
      mode: '1st Stage CBT + 2nd Stage CBT + DV & Medical Examination',
      frequency: 'Periodic Recruitment Cycle',
      duration: 'CBT 1: 90 minutes; CBT 2: 120 minutes',
      total_questions: 100,
      total_marks: 150,
      negative_marking: '1/3rd (0.33) marks deducted per wrong answer in CBT 1 and CBT 2',
      passing_criteria: 'CBT 1 is screening (15x candidates qualified for CBT 2); final merit is based entirely on normalized marks in CBT 2 (150 Marks).',
      eligibility: 'Three years Diploma in Civil / Mechanical / Electrical / Electronics / Computer Science Engineering or B.E./B.Tech. Age: 18–33/36 years.',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Online portal registration through official RRB portals.',
      selection_process: '1st Stage CBT (Screening 100 Marks) -> 2nd Stage CBT (Technical Merit 150 Marks) -> Document Verification & Medical.',
      stages: [
        { name: '1st Stage Computer Based Test (CBT-1)', type: 'Objective CBT', questions: 100, duration: '90 mins', marks: 100 },
        { name: '2nd Stage Computer Based Test (CBT-2)', type: 'Technical CBT', questions: 150, duration: '120 mins', marks: 150 }
      ],
      papers: [
        { paper_number: 1, title: 'CBT-1 Screening (Maths 30, Reasoning 25, General Awareness 15, General Science 30)', total_questions: 100, total_marks: 100, duration_minutes: 90 },
        { paper_number: 2, title: 'CBT-2 Technical (General Awareness 15, Physics & Chemistry 15, Computer 10, Environment 10, Technical Abilities 100)', total_questions: 150, total_marks: 150, duration_minutes: 120 }
      ],
      languages: ['English', 'Hindi', 'Regional Languages (13)'],
      subjects: [
        { slug: 'quantitative-aptitude', official: 'Mathematics', weightage: 20 },
        { slug: 'reasoning-ability', official: 'General Intelligence and Reasoning', weightage: 20 },
        { slug: 'general-science-technology', official: 'General Science & General Awareness', weightage: 20 },
        { slug: 'civil-engineering', official: 'Technical Abilities: Civil Engineering Group', weightage: 50 },
        { slug: 'electrical-engineering', official: 'Technical Abilities: Electrical Engineering Group', weightage: 50 },
        { slug: 'mechanical-engineering', official: 'Technical Abilities: Mechanical Engineering Group', weightage: 50 },
        { slug: 'computer-science-it', official: 'Technical Abilities: Computer Science Group', weightage: 50 }
      ],
      aliases: ['RRB JE', 'Railway Junior Engineer', 'RRB JE CBT 1', 'RRB JE CBT 2', 'Railway JE 2026', 'RRB JE Mechanical', 'RRB JE Civil']
    },
    {
      name: 'RRB ALP (Assistant Loco Pilot & Technicians)',
      slug: 'rrb-alp',
      short_name: 'RRB ALP',
      category: 'other-competitive-exams',
      authority: 'RRB',
      description: 'National recruitment examination conducted by Railway Recruitment Control Board for recruitment of Assistant Loco Pilots (ALP) and Technicians (Grade III) for running train services in Indian Railways.',
      official_url: 'https://indianrailways.gov.in',
      official_notification_url: 'https://www.rrbcdg.gov.in',
      official_syllabus_url: 'https://www.rrbcdg.gov.in',
      exam_type: 'Railway Train Operation Cadre Recruitment',
      level: 'National',
      mode: 'CBT 1 + CBT 2 (Part A & Part B) + Computer Based Aptitude Test (CBAT) + DV & Medical',
      frequency: 'Periodic Recruitment Cycle',
      duration: 'CBT 1: 60 minutes; CBT 2: 150 minutes (Part A: 90 mins, Part B: 60 mins)',
      total_questions: 75,
      total_marks: 100,
      negative_marking: '1/3rd (0.33) marks deducted for incorrect answers in CBT 1 and CBT 2 Part A (NO negative in CBAT)',
      passing_criteria: 'CBT 2 Part B is qualifying (35% cutoff); 70:30 weightage of CBT 2 Part A score and CBAT score determines final ALP merit.',
      eligibility: 'Matriculation / 10th plus ITI in specified trades OR Diploma / Degree in Mechanical / Electrical / Electronics / Automobile Engineering. Age: 18–30/33 years.',
      attempt_rules: 'Standard category age relaxations apply.',
      application_information: 'Online portal registration through official RRB portals.',
      selection_process: 'CBT 1 (Screening) -> CBT 2 (Part A Merit + Part B Trade Qualifying) -> CBAT (Aptitude Test for ALP) -> Document Verification & Medical Examination (Aye-One Standard).',
      stages: [
        { name: '1st Stage Computer Based Test (CBT-1)', type: 'Objective CBT', questions: 75, duration: '60 mins', marks: 75 },
        { name: '2nd Stage CBT Part-A', type: 'Objective CBT (Merit)', questions: 100, duration: '90 mins', marks: 100 },
        { name: '2nd Stage CBT Part-B (Trade Syllabus)', type: 'Trade CBT (Qualifying 35%)', questions: 75, duration: '60 mins', marks: 75 },
        { name: 'Computer Based Aptitude Test (CBAT)', type: 'Psycho Aptitude Test', questions: 0, duration: '71 mins', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'CBT-1 Composite (Maths 20, Reasoning 25, General Science 20, General Awareness 10)', total_questions: 75, total_marks: 75, duration_minutes: 60 },
        { paper_number: 2, title: 'CBT-2 Part-A (Maths, Reasoning, Basic Science & Engineering, General Awareness)', total_questions: 100, total_marks: 100, duration_minutes: 90 },
        { paper_number: 3, title: 'CBT-2 Part-B Relevant Trade Practice', total_questions: 75, total_marks: 75, duration_minutes: 60 }
      ],
      languages: ['English', 'Hindi', 'Regional Languages (13)'],
      subjects: [
        { slug: 'quantitative-aptitude', official: 'Mathematics', weightage: 25 },
        { slug: 'reasoning-ability', official: 'General Intelligence and Reasoning', weightage: 25 },
        { slug: 'physics', official: 'Basic Science and Engineering (Physics, Mechanics, Heat)', weightage: 35 },
        { slug: 'general-science-technology', official: 'General Science & General Awareness', weightage: 15 }
      ],
      aliases: ['RRB ALP', 'Railway Assistant Loco Pilot', 'RRB Technician', 'ALP Exam 2026', 'Railway ALP', 'RRB ALP Technician']
    },

    // --- DEFENCE: AIR FORCE ---
    {
      name: 'AFCAT (Air Force Common Admission Test)',
      slug: 'afcat',
      short_name: 'AFCAT',
      category: 'defence-services',
      authority: 'IAF',
      description: 'National level entrance examination conducted twice a year by the Indian Air Force for commissioning officers in Flying, Ground Duty (Technical), and Ground Duty (Non-Technical) branches.',
      official_url: 'https://afcat.cdac.in',
      official_notification_url: 'https://afcat.cdac.in/AFCAT/assets/images/news/AFCAT_01_2026.pdf',
      official_syllabus_url: 'https://afcat.cdac.in',
      exam_type: 'Air Force Officer Commissioning Entrance',
      level: 'National',
      mode: 'Computer Based Test (CBT) + Air Force Selection Board (AFSB) Interview',
      frequency: 'Bi-annually (AFCAT 1 & AFCAT 2)',
      duration: '120 minutes (2 hours)',
      total_questions: 100,
      total_marks: 300,
      negative_marking: '+3 for correct answer, -1 mark deducted for incorrect answer (33.3% penalty)',
      passing_criteria: 'AFCAT CBT cut-off determines call-up for 5-day AFSB Testing (Stage I Officer Intelligence Rating & PPDT + Stage II Psychological, Group Task & Interview).',
      eligibility: 'Graduation with minimum 60% marks and 50% marks each in Maths & Physics at 10+2 level (for Flying Branch). Age: 20–24 years (Flying), 20–26 years (Ground Duty).',
      attempt_rules: 'No cap on attempts within eligible age limits.',
      application_information: 'Online portal registration at afcat.cdac.in.',
      selection_process: 'AFCAT Online CBT (300 Marks) -> AFSB Testing (Stage I & Stage II) -> CPSS (Computerized Pilot Selection System for Flying) -> Medical Examination.',
      stages: [
        { name: 'AFCAT Online CBT Examination', type: 'Objective CBT', questions: 100, duration: '120 mins', marks: 300 },
        { name: 'Air Force Selection Board (AFSB) Interview', type: '5-Day Board Evaluation', questions: 0, duration: '5 Days', marks: 0 }
      ],
      papers: [
        { paper_number: 1, title: 'AFCAT Composite Paper (English 30, GK 20, Numerical Ability 20, Reasoning & Military Aptitude 30)', total_questions: 100, total_marks: 300, duration_minutes: 120 }
      ],
      languages: ['English'],
      subjects: [
        { slug: 'english-language-comprehension', official: 'Verbal Ability in English', weightage: 30 },
        { slug: 'general-science-technology', official: 'General Awareness (History, Geography, Civics, Defence, Science)', weightage: 20 },
        { slug: 'quantitative-aptitude', official: 'Numerical Ability', weightage: 20 },
        { slug: 'reasoning-ability', official: 'Reasoning and Mental Ability', weightage: 15 },
        { slug: 'military-aptitude-spatial-ability', official: 'Military Aptitude Test (Spatial & Rotational Ability)', weightage: 15 }
      ],
      aliases: ['AFCAT', 'Air Force Common Admission Test', 'AFCAT 1 2026', 'AFCAT 2 2026', 'IAF AFCAT', 'Indian Air Force Exam']
    },
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

  console.log(`Processing ${batch2Exams.length} India Batch 2 Exams...`);

  const examIdMap = {};

  for (const ex of batch2Exams) {
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

    examIdMap[ex.slug] = examId;

    // 6. Exam Versions (2026 current version)
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

    // 7. Exam-Subject Relationships
    for (const subj of ex.subjects) {
      const masterSubjId = subjMap[subj.slug];
      if (!masterSubjId) {
        console.warn(`Master subject ${subj.slug} not found for exam ${ex.slug}`);
        continue;
      }

      const esPayload = {
        exam_id: examId,
        subject_id: masterSubjId,
        name: subj.official,
        official_name: subj.official,
        display_name: subj.official,
        description: `Official subject component for ${ex.short_name}`,
        weight_percentage: subj.weightage,
        required: true,
        active: true,
        source_url: ex.official_url,
        verification_status: 'verified',
        last_verified_at: new Date().toISOString()
      };

      const { data: existingES } = await supabase
        .from('exam_subjects')
        .select('id')
        .eq('exam_id', examId)
        .eq('subject_id', masterSubjId)
        .maybeSingle();

      let esId;
      if (existingES) {
        esId = existingES.id;
        await supabase.from('exam_subjects').update(esPayload).eq('id', esId);
      } else {
        const { data: newES, error: esErr } = await supabase.from('exam_subjects').insert(esPayload).select('id').single();
        if (esErr) {
          console.error(`Error inserting exam_subject for ${subj.slug}:`, esErr);
          continue;
        }
        esId = newES.id;
      }

      // 8. Exam-Topic Relationships (linking master topics to this exam_subject)
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

    // 9. Exam Aliases
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

  console.log('\n=== INGESTION OF INDIA BATCH 2 COMPLETED SUCCESSFULLY ===');
}

runBatch2Ingestion().catch(console.error);
