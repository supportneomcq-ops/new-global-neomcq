import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { getSupabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'
import { buildExamMetadataAudit, normalizeOfficialSyllabusSubjects } from './metadata-audit'
import { normalizeInput, calculateLevenshteinSimilarity } from '@/lib/knowledge/normalizer'
import { classifyUserInput } from '@/lib/knowledge/classifier'
import {
  areEntitiesContextuallyIdentical,
  findMatchingSubjectInList,
  findMatchingTopicInList,
  findMatchingSubtopicInList,
  compareCurricula,
  evaluateEvidenceAndStatus,
  detectAndValidateExamRules,
  CurriculumComparisonReport,
} from './curriculum-comparator'
import {
  AIExamIntelligenceOutputSchema,
  AIExamIntelligenceOutput,
  ExamIntelligenceProfile,
  ExamResolutionResponse,
  CurriculumStatus,
} from './types'

// In-Flight resolution map for non-blocking concurrent request coalescing
const inFlightResolutions = new Map<string, Promise<ExamResolutionResponse>>()


// ============================================================================
// PROVISIONAL SEED TEMPLATES — never treated as official syllabus or verified exam rules
// ============================================================================

export interface StandardCurriculumTemplate {
  name: string
  official_name: string
  code: string
  country: string
  region?: string
  category: string
  type: string
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Adaptive'
  question_config: {
    default_question_count: number
    option_count: number
    answer_type: 'single' | 'multiple'
    single_correct: boolean
    multiple_correct: boolean
    has_negative_marking: boolean
    positive_mark: number
    negative_mark: number
    duration_minutes: number
    has_clinical_vignettes: boolean
    has_case_based_questions: boolean
    has_image_questions: boolean
    has_calculation_questions: boolean
    question_types: string[]
  }
  subjects: Array<{
    name: string
    code?: string
    description: string
    weightage: number
    topics: Array<{
      name: string
      description: string
      subtopics: Array<{ name: string; description?: string }>
    }>
  }>
}

export const PROVISIONAL_EXAM_STARTER_TEMPLATES: Record<string, StandardCurriculumTemplate> = {
  jlpt: {
    name: 'JLPT N1 / N2 (Japanese-Language Proficiency Test - 日本語能力試験)',
    official_name: 'Japanese-Language Proficiency Test (日本語能力試験)',
    code: 'JLPT',
    country: 'Japan',
    category: 'language-certification',
    type: 'Language Proficiency Test',
    difficulty_level: 'Advanced',
    question_config: {
      default_question_count: 100,
      option_count: 4,
      answer_type: 'single',
      single_correct: true,
      multiple_correct: false,
      has_negative_marking: false,
      positive_mark: 1,
      negative_mark: 0,
      duration_minutes: 170,
      has_clinical_vignettes: false,
      has_case_based_questions: false,
      has_image_questions: false,
      has_calculation_questions: false,
      question_types: ['standard_mcq'],
    },
    subjects: [
      {
        name: 'Grammar (文法 - Bunpou)',
        description: 'Japanese grammar structures, particles, honorifics, and complex sentence patterns for JLPT N1/N2.',
        weightage: 35,
        topics: [
          {
            name: 'Honorific Expressions (敬語)',
            description: 'Sonkeigo (respectful language), Kenjougo (humble language), and Teineigo (polite language).',
            subtopics: [
              { name: 'Humble Language (謙譲語)', description: 'Kenjougo verbs and humble self-expressions.' },
              { name: 'Respectful Language (尊敬語)', description: 'Sonkeigo verbs and respectful listener-focused expressions.' },
              { name: 'Polite Expressions (丁寧語)', description: 'Teineigo structures and formal conversation protocols.' },
            ],
          },
          {
            name: 'Complex Sentence Structures & Functional Expressions',
            description: 'Advanced N1/N2 conjunctions, conditional forms, and sentence-ending particles.',
            subtopics: [
              { name: 'Conjunctive Particles & Modifiers' },
              { name: 'Formal Idiomatic Sentence Endings' },
            ],
          },
        ],
      },
      {
        name: 'Vocabulary & Kanji (文字・語彙 - Moji/Goi)',
        description: 'N1/N2 Kanji readings, vocabulary usage, context-based synonyms, and antonyms.',
        weightage: 35,
        topics: [
          {
            name: 'Kanji Readings & Compound Words',
            description: 'Onyomi and Kunyomi readings of advanced N1/N2 Kanji compounds.',
            subtopics: [
              { name: 'Four-Character Idiomatic Compounds (Yojijukugo)' },
              { name: 'Contextual Word Usage & Nuance' },
            ],
          },
        ],
      },
      {
        name: 'Reading Comprehension (読解 - Dokkai)',
        description: 'Short, medium, and long passage comprehension, thematic analysis, and information retrieval.',
        weightage: 30,
        topics: [
          {
            name: 'Expository & Opinion Passage Comprehension',
            description: 'Analyzing arguments, essay themes, and author viewpoints.',
            subtopics: [
              { name: 'Short & Medium Text Analysis' },
              { name: 'Comparative & Information Matching' },
            ],
          },
        ],
      },
    ],
  },
  upsc: {
    name: 'UPSC Civil Services Examination (CSE)',
    official_name: 'Union Public Service Commission Civil Services Examination',
    code: 'UPSC',
    country: 'India',
    category: 'civil-services-government',
    type: 'Government Administrative Examination',
    difficulty_level: 'Advanced',
    question_config: {
      default_question_count: 100,
      option_count: 4,
      answer_type: 'single',
      single_correct: true,
      multiple_correct: false,
      has_negative_marking: true,
      positive_mark: 2,
      negative_mark: 0.66,
      duration_minutes: 120,
      has_clinical_vignettes: false,
      has_case_based_questions: true,
      has_image_questions: false,
      has_calculation_questions: false,
      question_types: ['standard_mcq', 'statement_evaluation'],
    },
    subjects: [
      {
        name: 'Indian Polity & Governance',
        description: 'Constitution, Political System, Panchayati Raj, Public Policy, Rights Issues.',
        weightage: 25,
        topics: [
          {
            name: 'Constitutional Framework & Fundamental Rights',
            description: 'Preamble, Fundamental Rights, Directive Principles, and Constitutional Amendments.',
            subtopics: [
              { name: 'Fundamental Rights & Judicial Review' },
              { name: 'Directive Principles & Fundamental Duties' },
              { name: 'Constitutional & Non-Constitutional Bodies' },
            ],
          },
          {
            name: 'Parliament & Executive Governance',
            description: 'President, Prime Minister, Union Cabinet, Parliamentary Committees, and Legislative Procedures.',
            subtopics: [
              { name: 'Parliamentary Motions & Bill Passage' },
              { name: 'Federal Structure & Center-State Relations' },
            ],
          },
        ],
      },
      {
        name: 'Indian History & National Movement',
        description: 'Ancient, Medieval, Modern History and the Freedom Struggle.',
        weightage: 20,
        topics: [
          {
            name: 'Modern Indian History & Freedom Struggle',
            description: '1857 Revolt, Indian National Congress, Gandhian Era, and Independence Movement.',
            subtopics: [
              { name: 'Non-Cooperation & Civil Disobedience Movements' },
              { name: 'Constitutional Development & Reform Acts' },
            ],
          },
        ],
      },
      {
        name: 'Geography & Environment',
        description: 'Physical, Social, Economic Geography of India and World; Ecology, Biodiversity, and Climate Change.',
        weightage: 20,
        topics: [
          {
            name: 'Environmental Ecology & Climate Change',
            description: 'Biodiversity conservation, national parks, climate summits, and pollution control.',
            subtopics: [
              { name: 'National Parks & Biosphere Reserves' },
              { name: 'Environmental Protection Acts & International Conventions' },
            ],
          },
        ],
      },
      {
        name: 'Indian Economy & Social Development',
        description: 'Economic Growth, Monetary Policy, Banking, Sustainable Development, and Poverty Alleviation.',
        weightage: 20,
        topics: [
          {
            name: 'Monetary Policy & Financial System',
            description: 'Reserve Bank of India, Inflation Management, Fiscal Deficit, and Banking Reforms.',
            subtopics: [
              { name: 'RBI Monetary Instruments & Inflation Targeting' },
              { name: 'Fiscal Policy & Union Budget Principles' },
            ],
          },
        ],
      },
    ],
  },
  fmge: {
    name: 'FMGE',
    official_name: 'Foreign Medical Graduate Examination (Screening Test)',
    code: 'FMGE',    country: 'India',
    category: 'medical-healthcare',
    type: 'Medical Licensing Examination',
    difficulty_level: 'Advanced',
    question_config: {
      default_question_count: 300,
      option_count: 4,
      answer_type: 'single',
      single_correct: true,
      multiple_correct: false,
      has_negative_marking: false,
      positive_mark: 1,
      negative_mark: 0,
      duration_minutes: 300,
      has_clinical_vignettes: true,
      has_case_based_questions: true,
      has_image_questions: true,
      has_calculation_questions: false,
      question_types: ['clinical_vignette', 'standard_mcq', 'image_based'],
    },
    subjects: [
      {
        name: 'General Medicine',
        description: 'Cardiology, Pulmonology, Neurology, Nephrology, Endocrinology, and Infectious Diseases.',
        weightage: 12,
        topics: [
          {
            name: 'Cardiology & Ischemic Heart Disease',
            description: 'Acute coronary syndromes, heart failure, arrhythmias, and valvular diseases.',
            subtopics: [
              { name: 'STEMI vs NSTEMI Diagnostics' },
              { name: 'ECG Interpretation in Arrhythmias' },
              { name: 'Heart Failure Guideline-Directed Medical Therapy' },
            ],
          },
          {
            name: 'Pulmonology & Respiratory Emergencies',
            description: 'COPD, asthma, tuberculosis, pneumonia, and acute respiratory failure.',
            subtopics: [
              { name: 'Pulmonary Tuberculosis Management (NTEP)' },
              { name: 'Arterial Blood Gas Analysis & Acid-Base Balance' },
              { name: 'Obstructive vs Restrictive Lung Patterns' },
            ],
          },
          {
            name: 'Neurology & Stroke Management',
            description: 'Ischemic and hemorrhagic stroke, epilepsy, meningitis, and cranial neuropathies.',
            subtopics: [
              { name: 'Acute Stroke Thrombolysis Window' },
              { name: 'Status Epilepticus Treatment Protocol' },
              { name: 'CSF Analysis in Meningitis Variants' },
            ],
          },
        ],
      },
      {
        name: 'General Surgery',
        description: 'Trauma, abdominal emergencies, surgical oncology, and wound management.',
        weightage: 10,
        topics: [
          {
            name: 'Trauma & Acute Resuscitation',
            description: 'ATLS protocols, hemorrhagic shock, tension pneumothorax, and FAST exam.',
            subtopics: [
              { name: 'ATLS Primary & Secondary Survey' },
              { name: 'Damage Control Surgery Principles' },
              { name: 'Massive Transfusion Protocol' },
            ],
          },
          {
            name: 'Gastrointestinal & Hepatobiliary Surgery',
            description: 'Acute abdomen, appendicitis, intestinal obstruction, and gallstone disease.',
            subtopics: [
              { name: 'Acute Appendicitis Clinical Scores & Management' },
              { name: 'Small Bowel vs Large Bowel Obstruction' },
              { name: 'Cholecystitis & Biliary Tree Emergencies' },
            ],
          },
        ],
      },
      {
        name: 'Obstetrics & Gynecology',
        description: 'Antenatal care, high-risk pregnancy, labor complications, and gynecological malignancies.',
        weightage: 10,
        topics: [
          {
            name: 'Antenatal Care & Hypertensive Disorders of Pregnancy',
            description: 'Preeclampsia, eclampsia, gestational diabetes, and fetal surveillance.',
            subtopics: [
              { name: 'Preeclampsia Severity Criteria & MgSO4 Regimen' },
              { name: 'Antepartum Hemorrhage: Placenta Previa vs Abruptio' },
              { name: 'Cardiotocography (CTG) Interpretation' },
            ],
          },
          {
            name: 'Labor, Delivery & Postpartum Emergencies',
            description: 'Partograph, stages of labor, dystocia, and postpartum hemorrhage.',
            subtopics: [
              { name: 'Postpartum Hemorrhage (PPH) Management Bundle' },
              { name: 'Obstructed Labor & Uterine Rupture' },
            ],
          },
        ],
      },
      {
        name: 'Pharmacology',
        description: 'Mechanisms, clinical indications, adverse effects, and drug interactions.',
        weightage: 8,
        topics: [
          {
            name: 'Autonomic Nervous System & Cardiovascular Drugs',
            description: 'Adrenergic agonists/antagonists, cholinergic drugs, and antihypertensives.',
            subtopics: [
              { name: 'Antihypertensive First-Line Choices' },
              { name: 'Antiarrhythmic Drug Classification & Toxicity' },
            ],
          },
          {
            name: 'Antimicrobial Chemotherapy',
            description: 'Antibiotics, antivirals, antifungals, and resistance mechanisms.',
            subtopics: [
              { name: 'Beta-Lactam Mechanism & Resistance' },
              { name: 'Antitubercular Drug Toxicities' },
            ],
          },
        ],
      },
      {
        name: 'Pathology & Microbiology',
        description: 'General pathology mechanisms, systemic pathology, bacteriology, and virology.',
        weightage: 10,
        topics: [
          {
            name: 'Cell Injury, Inflammation & Neoplasia',
            description: 'Apoptosis, necrosis, acute inflammation mediators, and oncogenes.',
            subtopics: [
              { name: 'Types of Necrosis & Clinical Correlates' },
              { name: 'Tumor Markers & Grading vs Staging' },
            ],
          },
          {
            name: 'Clinical Bacteriology & Virology',
            description: 'Gram-positive/negative bacteria, viral hepatitis, and HIV pathology.',
            subtopics: [
              { name: 'Hepatitis B Serological Markers' },
              { name: 'Diagnostic Tests for Sepsis & Blood Cultures' },
            ],
          },
        ],
      },
    ],
  },
  usmle: {
    name: 'USMLE Step 1',
    official_name: 'United States Medical Licensing Examination Step 1',
    code: 'USMLE-1',
    country: 'United States',
    category: 'medical-healthcare',
    type: 'Medical Licensing Examination',
    difficulty_level: 'Advanced',
    question_config: {
      default_question_count: 280,
      option_count: 5,
      answer_type: 'single',
      single_correct: true,
      multiple_correct: false,
      has_negative_marking: false,
      positive_mark: 1,
      negative_mark: 0,
      duration_minutes: 480,
      has_clinical_vignettes: true,
      has_case_based_questions: true,
      has_image_questions: true,
      has_calculation_questions: true,
      question_types: ['clinical_vignette', 'mechanism_of_action', 'pathophysiology_multi_step'],
    },
    subjects: [
      {
        name: 'Physiology & Pathophysiology',
        description: 'Cardiovascular, respiratory, renal, GI, and endocrine physiology.',
        weightage: 25,
        topics: [
          {
            name: 'Cardiovascular Hemodynamics & Valve Pathology',
            description: 'Pressure-volume loops, murmurs, and cardiac cycle physiology.',
            subtopics: [
              { name: 'Cardiac Pressure-Volume Loop Analysis' },
              { name: 'Systolic vs Diastolic Heart Failure Hemodynamics' },
            ],
          },
          {
            name: 'Renal Physiology & Acid-Base Disorders',
            description: 'Glomerular filtration, tubular transport, and Stewart approach.',
            subtopics: [
              { name: 'Anion Gap & Non-Anion Gap Metabolic Acidosis' },
              { name: 'Nephritic vs Nephrotic Syndromes Pathology' },
            ],
          },
        ],
      },
      {
        name: 'Biochemistry & Medical Genetics',
        description: 'Metabolic pathways, enzyme deficiencies, inborn errors, and chromosomal inheritance.',
        weightage: 20,
        topics: [
          {
            name: 'Inborn Errors of Metabolism',
            description: 'Glycogen storage diseases, lysosomal storage diseases, and amino acid disorders.',
            subtopics: [
              { name: 'Glycogen Storage Diseases (Type I-V)' },
              { name: 'Lysosomal Storage Diseases (Gaucher, Tay-Sachs, Niemann-Pick)' },
            ],
          },
        ],
      },
      {
        name: 'Microbiology & Immunology',
        description: 'Innate & adaptive immunity, bacterial genetics, viral lifecycles, and pharmacology.',
        weightage: 25,
        topics: [
          {
            name: 'Host Defense & Immunodeficiency Disorders',
            description: 'Primary immunodeficiencies, hypersensitivity types I-IV, and autoantibodies.',
            subtopics: [
              { name: 'Severe Combined Immunodeficiency (SCID) vs XLA' },
              { name: 'Hypersensitivity Reactions Classification' },
            ],
          },
        ],
      },
    ],
  },
  nclex: {
    name: 'NCLEX-RN',
    official_name: 'National Council Licensure Examination for Registered Nurses',
    code: 'NCLEX-RN',
    country: 'United States',
    category: 'medical-healthcare',
    type: 'Nursing Licensure Examination',
    difficulty_level: 'Adaptive',
    question_config: {
      default_question_count: 145,
      option_count: 4,
      answer_type: 'single',
      single_correct: true,
      multiple_correct: true,
      has_negative_marking: false,
      positive_mark: 1,
      negative_mark: 0,
      duration_minutes: 300,      has_clinical_vignettes: true,
      has_case_based_questions: true,
      has_image_questions: false,
      has_calculation_questions: true,
      question_types: ['clinical_judgment', 'select_all_that_apply', 'case_study'],
    },
    subjects: [
      {
        name: 'Management of Care & Safety',
        description: 'Delegation, prioritization, patient rights, and infection control.',
        weightage: 30,
        topics: [
          {
            name: 'Prioritization & Client Triage',
            description: 'ABC framework, Maslow hierarchy, and unstable vs stable client criteria.',
            subtopics: [
              { name: 'Airway, Breathing, Circulation Emergency Prioritization' },
              { name: 'RN Delegation to LPN/UAP Principles' },
            ],
          },
        ],
      },
      {
        name: 'Pharmacological & Parenteral Therapies',
        description: 'Medication administration, calculations, high-alert drugs, and adverse reactions.',
        weightage: 25,
        topics: [
          {
            name: 'High-Alert Medications & Safe Administration',
            description: 'Insulin protocols, anticoagulants, opioids, and IV calculations.',
            subtopics: [
              { name: 'Heparin & Warfarin Monitoring (aPTT vs INR)' },
              { name: 'IV Flow Rate & Drop Rate Calculations' },
            ],
          },
        ],
      },
    ],
  },
  cfa: {
    name: 'CFA Level 1',
    official_name: 'Chartered Financial Analyst Level I Examination',
    code: 'CFA-L1',
    country: 'Global',
    category: 'finance-business',
    type: 'Professional Financial Certification',
    difficulty_level: 'Advanced',
    question_config: {
      default_question_count: 180,
      option_count: 3,
      answer_type: 'single',
      single_correct: true,
      multiple_correct: false,
      has_negative_marking: false,
      positive_mark: 1,
      negative_mark: 0,
      duration_minutes: 270,
      has_clinical_vignettes: false,
      has_case_based_questions: true,
      has_image_questions: false,
      has_calculation_questions: true,
      question_types: ['financial_calculation', 'conceptual_case', 'standard_mcq'],
    },
    subjects: [
      {
        name: 'Ethical and Professional Standards',
        description: 'Code of Ethics, Standards of Professional Conduct, and GIPS.',
        weightage: 18,
        topics: [
          {
            name: 'CFA Institute Standards of Professional Conduct',
            description: 'Professionalism, Integrity of Capital Markets, and Duties to Clients.',
            subtopics: [
              { name: 'Standard II: Material Non-Public Information' },
              { name: 'Standard III: Suitability & Fiduciary Duties' },
            ],
          },
        ],
      },
      {
        name: 'Financial Statement Analysis',
        description: 'Income statements, balance sheets, cash flow analysis, and revenue recognition.',
        weightage: 15,
        topics: [
          {
            name: 'Income Statement & Balance Sheet Analysis',
            description: 'Inventory methods (FIFO vs LIFO), depreciation, and deferred taxes.',
            subtopics: [
              { name: 'LIFO Reserve & Inventory Restatement' },
              { name: 'Deferred Tax Asset & Liability Recognition' },
            ],
          },
        ],
      },
    ],
  },
  aws: {
    name: 'AWS Certified Solutions Architect - Associate',
    official_name: 'AWS Certified Solutions Architect - Associate (SAA-C03)',
    code: 'AWS-SAA',
    country: 'Global',
    category: 'technology-engineering',
    type: 'Cloud Architecture Certification',
    difficulty_level: 'Intermediate',
    question_config: {
      default_question_count: 65,
      option_count: 4,
      answer_type: 'single',
      single_correct: true,
      multiple_correct: true,
      has_negative_marking: false,
      positive_mark: 1,
      negative_mark: 0,
      duration_minutes: 130,
      has_clinical_vignettes: false,
      has_case_based_questions: true,
      has_image_questions: false,
      has_calculation_questions: false,
      question_types: ['scenario_architecture', 'multiple_response', 'standard_mcq'],
    },
    subjects: [
      {
        name: 'Design Resilient Architectures',
        description: 'Multi-tier architectures, decoupled systems, High Availability, and Disaster Recovery.',
        weightage: 26,
        topics: [
          {
            name: 'High Availability & Auto Scaling on AWS',
            description: 'VPC design, ALB/NLB, EC2 Auto Scaling, and Route 53 routing policies.',
            subtopics: [
              { name: 'Multi-AZ vs Multi-Region Resiliency Patterns' },
              { name: 'Application Load Balancer Routing & Target Groups' },
            ],
          },
        ],
      },
      {
        name: 'Design High-Performing Architectures',
        description: 'Storage tiering, relational and NoSQL databases, caching, and CloudFront.',
        weightage: 24,
        topics: [
          {
            name: 'AWS Storage & Database Optimization',
            description: 'S3 storage classes, EBS volume types, Aurora Global Database, and DynamoDB.',
            subtopics: [
              { name: 'S3 Lifecycle Policies & Glacier Instant Retrieval' },
              { name: 'Amazon Aurora Multi-Region Replication' },
            ],
          },
        ],
      },
    ],
  },
}

// Universal curriculum quality gate.
// Adapts subject, topic, and subtopic depth requirements dynamically based on exam difficulty level.
function isCurriculumSpecComprehensive(examName: string, spec: AIExamIntelligenceOutput, levelHint?: string): boolean {
  const subjects = Array.isArray(spec.subjects) ? spec.subjects : []
  if (subjects.length === 0) return false

  const normalizedLevel = (levelHint || spec.exam?.difficulty_level || '').toLowerCase()
  const normalizedCategory = (spec.exam?.category || '').toLowerCase()
  const isHighDifficulty =
    normalizedLevel.includes('advanced') ||
    normalizedLevel.includes('expert') ||
    normalizedLevel.includes('medical') ||
    normalizedLevel.includes('competitive') ||
    normalizedLevel.includes('licensing') ||
    normalizedCategory.includes('medical') ||
    normalizedCategory.includes('engineering') ||
    normalizedCategory.includes('civil-services') ||
    normalizedCategory.includes('finance') ||
    /usmle|fmge|neet|jee|upsc|cfa|cpa|nclex|aws|bar|gate/i.test(examName)

  const isFoundationDifficulty =
    normalizedLevel.includes('beginner') ||
    normalizedLevel.includes('school') ||
    normalizedLevel.includes('foundation') ||
    normalizedLevel.includes('basic')

  const minTopics = isFoundationDifficulty ? 3 : isHighDifficulty ? 5 : 4
  const minSubtopics = isFoundationDifficulty ? 2 : isHighDifficulty ? 3 : 2

  const normalize = (value: unknown) => String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const uniqueMeaningfulNames = (values: unknown[]) => {
    const names = values.map(normalize)
    return names.every(Boolean) && new Set(names).size === names.length
  }
  const genericLabel = /^(subject|topic|subtopic|core subject|core topic|topic number|module)\s*\d*$/i

  if (!uniqueMeaningfulNames(subjects.map((subject: any) => subject.name))) return false

  for (const subject of subjects as any[]) {
    const topics = Array.isArray(subject.topics) ? subject.topics : []
    if (topics.length < minTopics || !uniqueMeaningfulNames(topics.map((topic: any) => topic.name))) return false
    if (genericLabel.test(String(subject.name || '').trim())) return false

    for (const topic of topics) {
      const subtopics = Array.isArray(topic.subtopics) ? topic.subtopics : []
      if (subtopics.length < minSubtopics || !uniqueMeaningfulNames(subtopics.map((item: any) => item.name))) return false
      if (genericLabel.test(String(topic.name || '').trim())) return false
      if (subtopics.some((item: any) => genericLabel.test(String(item.name || '').trim()))) return false
    }
  }

  return true
}

async function recordCurriculumAiCost(
  provider: 'gemini' | 'openai',
  model: string,
  usage: any,
  examName: string
): Promise<void> {
  try {
    const inputTokens = Number(usage?.promptTokenCount ?? usage?.prompt_tokens ?? 0)
    const outputTokens = Number(usage?.candidatesTokenCount ?? usage?.completion_tokens ?? 0)
    const cachedInputTokens = Math.min(
      inputTokens,
      Number(usage?.cachedContentTokenCount ?? usage?.prompt_tokens_details?.cached_tokens ?? 0)
    )
    const reasoningTokens = Number(usage?.thoughtsTokenCount ?? usage?.completion_tokens_details?.reasoning_tokens ?? 0)
    if (inputTokens <= 0 && outputTokens <= 0) return

    const admin = getSupabaseAdmin()
    const pricingProvider = provider === 'gemini' ? 'Google Gemini AI' : 'OpenAI'
    const { data: pricing, error: pricingError } = await admin
      .from('ai_model_pricing')
      .select('input_cost_per_1m, cached_input_cost_per_1m, output_cost_per_1m')
      .eq('provider', pricingProvider)
      .eq('model', model)
      .eq('active', true)
      .is('effective_until', null)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pricingError || !pricing) {
      console.warn('[Exam Intelligence] Curriculum pricing not found; cost event skipped:', pricingError?.message || model)
      return
    }

    const billableInput = Math.max(0, inputTokens - cachedInputTokens)
    const costUsd = (
      billableInput * Number(pricing.input_cost_per_1m || 0) +
      cachedInputTokens * Number(pricing.cached_input_cost_per_1m || 0) +
      outputTokens * Number(pricing.output_cost_per_1m || 0)
    ) / 1_000_000
    const idempotencyKey = `curriculum:${randomUUID()}`
    const { error: insertError } = await admin.from('ai_cost_events').insert({
      user_id: null,
      request_id: idempotencyKey,
      idempotency_key: idempotencyKey,
      task_type: 'CURRICULUM_GENERATION',
      provider: provider === 'gemini' ? 'Gemini' : 'OpenAI',
      model,
      input_tokens: inputTokens,
      cached_input_tokens: cachedInputTokens,
      output_tokens: outputTokens,
      reasoning_tokens: reasoningTokens,
      actual_provider_cost: costUsd,
      revenue_allocated: 0,
      ai_infrastructure_cost: costUsd * 0.05,
      credits_deducted: 0,
    })
    if (insertError) {
      console.error('[Exam Intelligence] Curriculum AI cost event insert failed:', insertError.message)
    } else {
      console.log(`[Exam Intelligence] Recorded ${provider} curriculum cost for ${examName}: ${costUsd.toFixed(6)}`)
    }
  } catch (error: any) {
    console.error('[Exam Intelligence] Curriculum cost tracking failed:', error?.message || error)
  }
}

// ============================================================================
// AI STRUCTURED EXAM INTELLIGENCE GENERATOR
// ============================================================================

export async function generateAIExamIntelligence(
  examQuery: string,
  countryHint?: string,
  categoryHint?: string,
  levelHint?: string
): Promise<AIExamIntelligenceOutput | null> {
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.warn('[Exam Intelligence] No supported AI provider key is configured for curriculum synthesis.')
    return null
  }

  const cleanName = examQuery.trim()
  const normalizedLevel = (levelHint || '').toLowerCase()
  const normalizedCategory = (categoryHint || '').toLowerCase()
  const isHighDifficulty =
    normalizedLevel.includes('advanced') ||
    normalizedLevel.includes('expert') ||
    normalizedLevel.includes('medical') ||
    normalizedLevel.includes('competitive') ||
    normalizedLevel.includes('licensing') ||
    normalizedCategory.includes('medical') ||
    normalizedCategory.includes('engineering') ||
    normalizedCategory.includes('civil-services') ||
    normalizedCategory.includes('finance') ||
    /usmle|fmge|neet|jee|upsc|cfa|cpa|nclex|aws|bar|gate/i.test(cleanName)

  const isFoundationDifficulty =
    normalizedLevel.includes('beginner') ||
    normalizedLevel.includes('school') ||
    normalizedLevel.includes('foundation') ||
    normalizedLevel.includes('basic')

  const targetDifficultyLabel = isFoundationDifficulty
    ? 'Beginner / Foundation Level'
    : isHighDifficulty
      ? 'Advanced / High-Stakes Professional / Medical Level'
      : 'Intermediate / College & Professional Certification Level'

  const minSubjectCount = isFoundationDifficulty ? '3 to 5' : isHighDifficulty ? '8 to 15' : '5 to 8'
  const minTopicCount = isFoundationDifficulty ? '4 to 6' : isHighDifficulty ? '6 to 10' : '5 to 8'
  const minSubtopicCount = isFoundationDifficulty ? '2 to 4' : isHighDifficulty ? '4 to 8' : '3 to 5'

  // Keep the most complete schema-valid response even when it falls short of the
  // completeness gate. The resolver can reconcile this partial tree while the
  // exam remains explicitly marked needs_enrichment; it must never be marked ready.
  let bestPartialCandidate: AIExamIntelligenceOutput | null = null
  const curriculumSize = (spec: AIExamIntelligenceOutput) => spec.subjects.reduce((total, subject) =>
    total + (subject.topics || []).reduce((topicTotal, topic) => topicTotal + 1 + (topic.subtopics || []).length, 0), 0)
  const keepMoreCompleteCandidate = (candidate: AIExamIntelligenceOutput) => {
    if (!bestPartialCandidate || curriculumSize(candidate) > curriculumSize(bestPartialCandidate)) {
      bestPartialCandidate = candidate
    }
  }

  const systemInstruction = `You are the Principal Psychometrician and Global Curriculum Architect for NeoMCQ.
Your mission is to construct a rigorous, comprehensive Exam Intelligence Profile and Curriculum Specification for any examination worldwide.
You MUST output strictly valid JSON conforming directly to the required schema. Never wrap in markdown text outside of the JSON.`

  const prompt = `Construct the official Exam Intelligence Profile and complete Curriculum Specification for the examination: "${cleanName}".
${countryHint ? `Country / Region Context: ${countryHint}` : ''}
${categoryHint ? `Discipline / Category Context: ${categoryHint}` : ''}
${levelHint ? `Credential Level / Stage Context: ${levelHint}` : ''}

CRITICAL ARCHITECTURAL DIRECTIVES & DYNAMIC DIFFICULTY DEPTH:
1. EXAM LEVEL & DIFFICULTY SCALE:
   - Evaluated Difficulty Tier: ${targetDifficultyLabel}
   - Identify official full name, standard code/acronym, jurisdiction, and credential level.
   - Establish realistic question configuration (option count, negative marking, question types, duration).
   - Classify question types: standard_mcq, clinical_vignette, case_based, calculation, image_based, scenario_architecture.
2. CURRICULUM HIERARCHY & CUSTOM DEPTH:
   - Generate ${minSubjectCount} distinct, domain-accurate subjects covering the official blueprint for "${cleanName}".
   - For every subject, generate ${minTopicCount} distinct, exam-specific topics.
   - For every topic, generate ${minSubtopicCount} granular subtopics tailored to the difficulty tier (${targetDifficultyLabel}).
   - For high-difficulty exams (Medical, Competitive, Professional), generate clinical vignettes, diagnostic frameworks, case scenarios, or complex problem-solving subtopics.
   - Preserve official subject boundaries, stages, papers and levels. Never merge separate exams or silently omit independently tested domains.
   - Do not invent official rules, counts, subject names or source URLs.
   - Avoid generic placeholders (like "Overview", "Topic 1", "Misc"), duplicate subjects/topics/subtopics, and filler labels.
   - IMPORTANT: This stage creates ONLY the curriculum structure (names and descriptions). DO NOT generate MCQs, quizzes, flashcards, notes, or AI lessons in this profile.
   - Ensure subjects, topics, and subtopics are genuinely, domain-accurately relevant to "${cleanName}".
3. GENERATION RULES:
   - Configure distinct content rules for MCQs, Quizzes, Flashcards, AI Tutor, and Notes.

Output schema (compact JSON; omit optional descriptions to conserve output tokens):
{
  "exam": {
    "name": "${cleanName}",
    "official_name": "Official Full Name",
    "country": "${countryHint || 'Global'}",
    "category": "${categoryHint || 'general-academics'}",
    "type": "Licensing / Certification / Academic Entrance",
    "difficulty_level": "${isFoundationDifficulty ? 'Beginner' : isHighDifficulty ? 'Advanced' : 'Intermediate'}"
  },
  "subjects": [
    {
      "name": "Subject Name",
      "weightage": 15,
      "order": 1,
      "topics": [
        {
          "name": "Specific Topic Name",
          "order": 1,
          "subtopics": [
            { "name": "Specific Granular Subtopic 1", "order": 1 },
            { "name": "Specific Granular Subtopic 2", "order": 2 },
            { "name": "Specific Granular Subtopic 3", "order": 3 }
          ]
        }
      ]
    }
  ],
  "confidence": { "overall": 0.9, "curriculum": 0.9, "exam_rules": 0.8 }
}`

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    // Bound the Gemini attempt even if the SDK/network ignores AbortController.
    // This leaves time for the OpenAI fallback inside Vercel's function budget.
    let geminiTimeout: ReturnType<typeof setTimeout> | undefined

    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: process.env.GEMINI_CURRICULUM_MODEL || 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            maxOutputTokens: 16000,
            temperature: 0.1,
          },
        }),
        new Promise<never>((_, reject) => {
          geminiTimeout = setTimeout(() => reject(new Error('Gemini request timed out after 75 seconds')), 75000)
        }),
      ])
      if (geminiTimeout) clearTimeout(geminiTimeout)
      await recordCurriculumAiCost('gemini', process.env.GEMINI_CURRICULUM_MODEL || 'gemini-3.6-flash', response.usageMetadata, cleanName)

      const text = response.text || '{}'
      const parsed = JSON.parse(text)
      const validated = AIExamIntelligenceOutputSchema.safeParse(parsed)

      if (validated.success) {
        if (!isCurriculumSpecComprehensive(cleanName, validated.data, levelHint)) {
          keepMoreCompleteCandidate(validated.data)
          console.warn(`[Exam Intelligence] Gemini curriculum failed breadth/depth validation for ${cleanName}; trying fallback provider.`)
          throw new Error('Gemini curriculum did not meet minimum topic/subtopic coverage.')
        }
        return validated.data
      } else {
        console.warn('[Exam Intelligence] Validation schema issues:', validated.error.format())
        // Attempt partial recovery if subjects array exists
        if (parsed.subjects && Array.isArray(parsed.subjects) &&
          isCurriculumSpecComprehensive(cleanName, {
            ...(parsed as AIExamIntelligenceOutput),
            exam: parsed.exam || { name: cleanName },
            subjects: parsed.subjects,
          } as AIExamIntelligenceOutput, levelHint)) {
          return {
            exam: {
              name: cleanName,
              official_name: parsed.exam?.official_name || cleanName,
              code: parsed.exam?.code || null,
              country: countryHint || parsed.exam?.country || 'Global',
              region: parsed.exam?.region || null,
              category: categoryHint || parsed.exam?.category || 'general-academics',
              type: parsed.exam?.type || 'Certification',
              specialty_or_domain: parsed.exam?.specialty_or_domain || null,
              difficulty_level: parsed.exam?.difficulty_level || 'Intermediate',
              difficulty_distribution: parsed.exam?.difficulty_distribution || { easy: 20, medium: 60, hard: 20 },
              question_config: parsed.exam?.question_config || {
                default_question_count: 100,
                option_count: 4,
                answer_type: 'single',
                single_correct: true,
                multiple_correct: false,
                has_negative_marking: false,
                positive_mark: 1,
                negative_mark: 0,
                duration_minutes: 120,
                has_image_questions: false,
                has_video_questions: false,
                has_case_based_questions: false,
                has_clinical_vignettes: false,
                has_calculation_questions: false,
                has_matching_questions: false,
                has_true_false_questions: false,
                question_types: ['standard_mcq'],
              },
            },
            subjects: parsed.subjects.map((s: any, sIdx: number) => ({
              name: s.name || `Core Subject ${sIdx + 1}`,
              code: s.code || null,
              description: s.description || '',
              weightage: s.weightage || 15,
              order: sIdx + 1,
              topics: Array.isArray(s.topics) && s.topics.length > 0
                ? s.topics.map((t: any, tIdx: number) => ({
                    name: typeof t === 'string' ? t : t.name || `Topic ${tIdx + 1}`,
                    description: t.description || '',
                    order: tIdx + 1,
                    subtopics: Array.isArray(t.subtopics) ? t.subtopics : [],
                  }))
                : [{ name: 'Core Foundations & Principles', description: '', order: 1, subtopics: [] }],
            })),
            content_generation_rules: parsed.content_generation_rules || {},
            confidence: parsed.confidence || { overall: 0.85, curriculum: 0.85, exam_rules: 0.8 },
          }
        }
      }
    } catch (apiErr: any) {
      if (geminiTimeout) clearTimeout(geminiTimeout)
      console.warn('[Exam Intelligence] Gemini API call failed or timed out:', apiErr.message)
    }
  } catch (err: any) {
    console.warn('[Exam Intelligence] Gemini synthesis execution error:', err.message)
  }

  // Provider fallback: a temporary Gemini outage, invalid model, or missing Gemini
  // key must not prevent curriculum creation when OpenAI is configured. Keep this
  // bounded so onboarding/background processing cannot wait indefinitely.
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 75000,
        maxRetries: 0,
      })
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CURRICULUM_MODEL || 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 16000,
      })
      await recordCurriculumAiCost('openai', process.env.OPENAI_CURRICULUM_MODEL || 'gpt-5.4-mini', completion.usage, cleanName)
      const responseText = completion.choices[0]?.message?.content
      if (responseText) {
        const parsed = JSON.parse(responseText)
        const validated = AIExamIntelligenceOutputSchema.safeParse(parsed)
        if (validated.success) {
          if (isCurriculumSpecComprehensive(cleanName, validated.data, levelHint)) {
            return validated.data
          }
          keepMoreCompleteCandidate(validated.data)
          const rejectedTopicCount = validated.data.subjects.reduce((n: number, subject: any) => n + (subject.topics || []).length, 0)
          const rejectedSubtopicCount = validated.data.subjects.reduce((n: number, subject: any) => n + (subject.topics || []).reduce((m: number, topic: any) => m + (topic.subtopics || []).length, 0), 0)
          console.warn(`[Exam Intelligence] OpenAI curriculum rejected for ${cleanName}: topics=${rejectedTopicCount}, subtopics=${rejectedSubtopicCount}; universal breadth/depth/duplicate/filler check failed.`)
        } else {
          console.warn('[Exam Intelligence] OpenAI curriculum did not match the required schema.')
        }
      } else {
        console.warn('[Exam Intelligence] OpenAI returned an empty curriculum response.')
      }
    } catch (openaiError: any) {
      console.warn('[Exam Intelligence] OpenAI fallback synthesis failed:', openaiError?.message || 'Unknown provider error')
    }
  }

  // One bounded repair pass gives the model a concrete partial syllabus to extend,
  // instead of repeatedly asking it to regenerate from scratch. Only a response
  // that passes the full completeness gate can be considered ready downstream.
  if (bestPartialCandidate) {
    const repairPrompt = `Repair and COMPLETE this incomplete exam curriculum for "${cleanName}".
${countryHint ? `Jurisdiction: ${countryHint}.\\n` : ''}${categoryHint ? `Exam category: ${categoryHint}.\\n` : ''}${levelHint ? `Credential level: ${levelHint}.\\n` : ''}
Return one JSON object matching the NeoMCQ exam-intelligence schema (exam, subjects, content_generation_rules, confidence). Preserve every correct existing subject name and official subject boundary. Do not omit any domain from the official exam blueprint.
HARD COMPLETENESS REQUIREMENTS: every subject must contain at least 5 distinct, meaningful, exam-specific topics; every topic must contain at least 3 distinct, meaningful subtopics. These are minimums for EACH subject and EACH topic, not totals across the curriculum. The supplied tree is incomplete: expand the specific thin subjects, especially any subject with fewer than 5 topics. Do not merely repeat or rename existing topics.
Preserve official syllabus scope. Do not use generic filler, duplicate names, or invent official exam rules. Unknown exam-rule fields must remain unknown/default and must not be described as verified. Add domain-specific topics/subtopics only when they genuinely belong to this exam.

Current partial curriculum:
${JSON.stringify(bestPartialCandidate)}`
    const isCompleteRepair = (candidate: AIExamIntelligenceOutput | null) =>
      Boolean(candidate && isCurriculumSpecComprehensive(cleanName, candidate, levelHint))
    let repaired: AIExamIntelligenceOutput | null = null

    // Try Gemini first, then OpenAI even when Gemini returns valid but incomplete JSON.
    if (process.env.GEMINI_API_KEY) {
      try {
        const repairAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
        const repairResponse = await repairAi.models.generateContent({
          model: process.env.GEMINI_CURRICULUM_MODEL || 'gemini-3.6-flash',
          contents: repairPrompt,
          config: { systemInstruction, responseMimeType: 'application/json', maxOutputTokens: 16000, temperature: 0.1 },
        })
        await recordCurriculumAiCost('gemini', process.env.GEMINI_CURRICULUM_MODEL || 'gemini-3.6-flash', repairResponse.usageMetadata, cleanName)
        const parsedRepair = JSON.parse(repairResponse.text || '{}')
        const validatedRepair = AIExamIntelligenceOutputSchema.safeParse(parsedRepair)
        if (validatedRepair.success) repaired = validatedRepair.data
        if (isCompleteRepair(repaired)) return repaired!
        if (repaired) keepMoreCompleteCandidate(repaired)
      } catch (repairError: any) {
        console.warn('[Exam Intelligence] Gemini curriculum repair failed:', repairError?.message || 'Unknown provider error')
      }
    }

    if (!isCompleteRepair(repaired) && process.env.OPENAI_API_KEY) {
      try {
        const repairOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 75000, maxRetries: 0 })
        const repairCompletion = await repairOpenAI.chat.completions.create({
          model: process.env.OPENAI_CURRICULUM_MODEL || 'gpt-5.4-mini',
          messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: repairPrompt }],
          response_format: { type: 'json_object' }, max_completion_tokens: 16000,
        })
        await recordCurriculumAiCost('openai', process.env.OPENAI_CURRICULUM_MODEL || 'gpt-5.4-mini', repairCompletion.usage, cleanName)
        const parsedRepair = JSON.parse(repairCompletion.choices[0]?.message?.content || '{}')
        const validatedRepair = AIExamIntelligenceOutputSchema.safeParse(parsedRepair)
        const openAiRepair = validatedRepair.success ? validatedRepair.data : null
        if (isCompleteRepair(openAiRepair)) return openAiRepair!
        if (openAiRepair) keepMoreCompleteCandidate(openAiRepair)
      } catch (repairError: any) {
        console.warn('[Exam Intelligence] OpenAI curriculum repair failed:', repairError?.message || 'Unknown provider error')
      }
    }

    if (!isCompleteRepair(bestPartialCandidate) && process.env.OPENAI_API_KEY) {
      try {
        const candidate: AIExamIntelligenceOutput = bestPartialCandidate as AIExamIntelligenceOutput
        const normalizeLabel = (value: string) => value.toLowerCase().replace(/&/g, ' and ')
          .replace(/[^a-z0-9]+/g, ' ').trim()
        const subjectDeficits = (candidate.subjects || []).map((subject) => {
          const topics = subject.topics || []
          const thinTopics = topics
            .filter((topic) => (topic.subtopics || []).length < 3)
            .map((topic) => `${topic.name} (${(topic.subtopics || []).length}/3 subtopics)`)
          return {
            name: subject.name,
            topicCount: topics.length,
            missingTopics: Math.max(0, 5 - topics.length),
            thinTopics,
          }
        })
        const duplicateSubjects = (candidate?.subjects || []).map((subject) => normalizeLabel(subject.name))
          .filter((name, index, all) => name && all.indexOf(name) !== index)
        const thinSubjectSummary = subjectDeficits
          .filter((item) => item.missingTopics > 0 || item.thinTopics.length > 0)
          .map((item) => `${item.name}: ${item.topicCount}/5 topics; add ${item.missingTopics} topics; thin topics: ${item.thinTopics.join(', ') || 'none'}`)
        const targetedPrompt = `The previous curriculum repair is still incomplete. Fix ONLY the listed validation gaps while preserving all correct exam-specific content and returning the complete NeoMCQ JSON schema.
Per-subject gaps:
${thinSubjectSummary.length ? thinSubjectSummary.join(String.fromCharCode(10)) : 'No topic-count gaps detected; inspect and remove duplicate or generic subject/topic/subtopic labels.'}
Duplicate subject labels detected: ${duplicateSubjects.length ? [...new Set(duplicateSubjects)].join(', ') : 'none detected'}.
Hard rules: at least 5 meaningful topics in every subject and at least 3 meaningful subtopics in every topic; no duplicate labels within a parent; no generic filler. Do not rename or remove valid official subjects. Return JSON only.

Current best curriculum:
${JSON.stringify(candidate)}`
        const targetedOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 75000, maxRetries: 0 })
        const targetedCompletion = await targetedOpenAI.chat.completions.create({
          model: process.env.OPENAI_CURRICULUM_MODEL || 'gpt-5.4-mini',
          messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: targetedPrompt }],
          response_format: { type: 'json_object' }, max_completion_tokens: 16000,
        })
        await recordCurriculumAiCost('openai', process.env.OPENAI_CURRICULUM_MODEL || 'gpt-5.4-mini', targetedCompletion.usage, cleanName)
        const parsedTargeted = JSON.parse(targetedCompletion.choices[0]?.message?.content || '{}')
        const validatedTargeted = AIExamIntelligenceOutputSchema.safeParse(parsedTargeted)
        const targetedRepair = validatedTargeted.success ? validatedTargeted.data : null
        if (isCompleteRepair(targetedRepair)) return targetedRepair!
        if (targetedRepair) keepMoreCompleteCandidate(targetedRepair)
        console.warn('[Exam Intelligence] Targeted OpenAI repair remained incomplete for', cleanName)
      } catch (targetedError: any) {
        console.warn('[Exam Intelligence] Targeted OpenAI curriculum repair failed:', targetedError?.message || 'Unknown provider error')
      }
    }
  }

  // Preserve partial domain-specific output for reconciliation, but downstream
  // validation continues to mark it needs_enrichment until the full gate passes.
  return bestPartialCandidate
}

// ============================================================================
// DETERMINISTIC TEMPLATE & MINIMUM CURRICULUM FALLBACKS
// ============================================================================

export function buildFallbackCurriculum(
  examName: string,
  countryHint?: string,
  categoryHint?: string
): AIExamIntelligenceOutput {
  const norm = normalizeInput(examName)
  const slugKey = norm.slug.toLowerCase()

  // Match known verified standard template if possible
  for (const [key, template] of Object.entries(PROVISIONAL_EXAM_STARTER_TEMPLATES)) {
    if (slugKey.includes(key) || key.includes(slugKey)) {
      return {
        exam: {
          name: template.name,
          official_name: template.official_name,
          code: template.code,
          country: template.country,
          region: template.region || null,
          category: template.category,
          type: template.type,
          specialty_or_domain: template.category,
          difficulty_level: template.difficulty_level,
          difficulty_distribution: { easy: 20, medium: 60, hard: 20 },
          question_config: {
            ...template.question_config,
            total_marks: null,
            time_per_question_seconds: Math.round((template.question_config.duration_minutes * 60) / template.question_config.default_question_count),
            has_video_questions: false,
            has_audio_questions: false,
            has_matching_questions: false,
            has_true_false_questions: false,
          },
        },
        subjects: template.subjects.map((s, idx) => ({
          name: s.name,
          code: s.code || null,
          description: s.description,
          weightage: s.weightage,
          order: idx + 1,
          topics: s.topics.map((t, tIdx) => ({
            name: t.name,
            description: t.description,
            order: tIdx + 1,
            subtopics: t.subtopics.map((st, stIdx) => ({
              name: st.name,
              description: st.description || '',
              order: stIdx + 1,
            })),
          })),
        })),
        content_generation_rules: {
          mcq: { stem_style: 'standard' },
          quiz: { pre_test_slots: 20, post_test_slots: 20 },
          flashcard: { target_count_per_topic: 40 },
          ai_tutor: { socratic_mode: true },
          fill_in_blank: {},
          notes: {},
          flowchart: {},
        },
        confidence: { overall: 0.99, curriculum: 0.99, exam_rules: 0.99 },
      }
    }
  }

  // Minimum resilient curriculum guaranteeing at least 1 subject and 1 topic
  return {
    exam: {
      name: examName,
      official_name: `${examName} Examination`,
      code: norm.slug.toUpperCase(),
      country: countryHint || 'Global',
      region: null,
      category: categoryHint || 'general-academics',
      type: 'Certification / Licensing Exam',
      specialty_or_domain: categoryHint || 'General Domain',
      difficulty_level: 'Intermediate',
      difficulty_distribution: { easy: 25, medium: 55, hard: 20 },
      question_config: {
        default_question_count: 100,
        option_count: 4,
        answer_type: 'single',
        single_correct: true,
        multiple_correct: false,
        has_negative_marking: false,
        positive_mark: 1,
        negative_mark: 0,
        duration_minutes: 120,
        has_image_questions: false,
        has_video_questions: false,
        has_audio_questions: false,
        has_case_based_questions: false,
        has_clinical_vignettes: false,
        has_calculation_questions: false,
        has_matching_questions: false,
        has_true_false_questions: false,
        question_types: ['standard_mcq'],
      },
    },
    subjects: [
      {
        name: 'Core Foundations & Principles',
        code: 'CORE-01',
        description: `Essential theoretical principles, definitions, and core foundations for ${examName}.`,
        weightage: 50,
        order: 1,
        topics: [
          {
            name: 'Fundamental Concepts & Standards',
            description: `Core standards and foundational theory for ${examName}.`,
            order: 1,
            subtopics: [
              { name: 'Core Terminology & Diagnostic Frameworks', description: 'Core terminology definitions.', order: 1 },
              { name: 'High-Yield Principles & Definitions', description: 'High-yield principles.', order: 2 },
            ],
          },
        ],
      },
      {
        name: 'Advanced Practice & Applied Problem Solving',
        code: 'ADV-02',
        description: `Applied scenarios, problem sets, and high-frequency examination challenges for ${examName}.`,
        weightage: 50,
        order: 2,
        topics: [
          {
            name: 'Case Scenarios & Practice Applications',
            description: `Applied practice and decision-making scenarios for ${examName}.`,
            order: 1,
            subtopics: [
              { name: 'Complex Problem Solving & Decision Trees', description: 'Complex problem solving principles.', order: 1 },
              { name: 'High-Frequency Exam Pitfalls', description: 'High-frequency exam pitfalls.', order: 2 },
            ],
          },        ],
      },
    ],
    content_generation_rules: {
      mcq: { stem_style: 'standard' },
      quiz: { pre_test_slots: 20, post_test_slots: 20 },
      flashcard: { target_count_per_topic: 40 },
      ai_tutor: { socratic_mode: true },
      fill_in_blank: {},
      notes: {},
      flowchart: {},
    },
    confidence: { overall: 0.7, curriculum: 0.7, exam_rules: 0.7 },
  }
}

// ============================================================================
// MASTER ATOMIC EXAM INTELLIGENCE & CURRICULUM RESOLVER
// ============================================================================

export async function resolveOrInitializeExamIntelligence(options: {
  examQuery: string
  country?: string
  category?: string
  level?: string
  userId?: string | null
}): Promise<ExamResolutionResponse> {
  const { examQuery, country, category, level, userId } = options
  const supabase = getSupabaseAdmin()

  if (!examQuery || typeof examQuery !== 'string' || !examQuery.trim()) {
    throw new Error('Exam search term or name is required.')
  }

  const rawInput = examQuery.trim()

  // 1. Guard against non-exam inputs (e.g. pure country names)
  const classification = classifyUserInput(rawInput)
  if (classification.type === 'COUNTRY' && !classification.isCurricularValid) {
    throw new Error(
      `"${rawInput}" is a country or geographical region, not an examination. Please enter an exam name (e.g. USMLE, NEET PG, FMGE, CFA, NCLEX, AWS).`
    )
  }

  const norm = normalizeInput(rawInput)
  const cleanQuery = norm.canonical.toLowerCase()
  const querySlug = norm.slug.toLowerCase()

  // Concurrency deduplication: Coalesce concurrent requests for the exact same query
  const idempotencyKey = `${cleanQuery}::${(country || '').toLowerCase()}::${(category || '').toLowerCase()}::${(level || '').toLowerCase()}`
  if (inFlightResolutions.has(idempotencyKey)) {
    console.log(`[Exam Intelligence] Concurrent resolution in flight for "${rawInput}". Joining existing Promise...`)
    return inFlightResolutions.get(idempotencyKey)!
  }

  const executionPromise = (async (): Promise<ExamResolutionResponse> => {
    console.log(`[Exam Intelligence] Resolving exam: "${rawInput}" (slug: "${querySlug}")`)

    // 2. Search Database for existing canonical exam
    const selectQuery = `
      id,
      name,
      short_name,
      slug,
      description,
      difficulty,
      level,
      question_count,
      time_limit_mins,
      status,
      marking_scheme,
      question_types,
      metadata,
      syllabus_info,
      verification_status,
      authority_id,
      country_id,
      category_id,
      exam_type,
      current_version,
      version_year,
      is_current,
      last_verified_at,
      next_verification_at,
      official_url,
      official_notification_url,
      official_syllabus_url,
      source_url,
      countries (
        id,
        name,
        iso2,
        flag_emoji
      ),
      exam_categories (
        id,
        name,
        slug
      ),
      exam_subjects (
        id,
        name,
        slug,
        description,
        weight_percentage,
        display_order,
        exam_topics (
          id,
          name,
          slug,
          description,
          display_order,
          exam_subtopics (
            id,
            name,
            slug,
            display_order
          )
        )
      )
    `

    let matchedExam: any = null

    // Thorough canonical/exact fast matches
    const rawLower = rawInput.toLowerCase()
    const rawNoPunct = rawInput.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
    const cleanNoPunct = cleanQuery.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

    // First check if there is an exact direct slug match or exact name match
    let directSlugMatch: any = null
    const { data: slugMatch } = await supabase
      .from('exams')
      .select(selectQuery)
      .neq('status', 'archived')
      .eq('slug', querySlug)
      .limit(1)
      .maybeSingle()

    if (slugMatch && areEntitiesContextuallyIdentical(slugMatch.name, rawInput, { entityType: 'EXAM' })) {
      directSlugMatch = slugMatch
    } else {
      const { data: nameMatch } = await supabase
        .from('exams')
        .select(selectQuery)
        .neq('status', 'archived')
        .ilike('name', rawInput)
        .limit(1)
        .maybeSingle()
      if (nameMatch && areEntitiesContextuallyIdentical(nameMatch.name, rawInput, { entityType: 'EXAM' })) {
        directSlugMatch = nameMatch
      }
    }

    if (directSlugMatch) {
      matchedExam = directSlugMatch
    }

    if (!matchedExam) {
      // Query all active exams for context-aware in-memory matching
      const { data: allActiveExams } = await supabase
        .from('exams')
        .select(`
          id,
          name,
          short_name,
          slug,
          description,
          difficulty,
          question_count,
          time_limit_mins,
          status,
          countries (
            id,
            name,
            flag_emoji
          ),
          exam_categories (
            id,
            name,
            slug
          )
        `)
        .neq('status', 'archived')

      // Query all aliases
      const { data: allAliases } = await supabase
        .from('exam_aliases')
        .select('exam_id, alias')

      if (allActiveExams) {
        const aliasMap = new Map<string, Set<string>>()
        if (allAliases) {
          for (const al of allAliases) {
            if (!aliasMap.has(al.exam_id)) {
              aliasMap.set(al.exam_id, new Set())
            }
            aliasMap.get(al.exam_id)!.add(al.alias.toLowerCase().trim())
          }
        }

        // Check A: Exact name or short name match
        let bestCandidate = allActiveExams.find((e: any) => {
          const eName = e.name.toLowerCase()
          const eShort = e.short_name?.toLowerCase()
          if (eName === rawLower || eName === cleanQuery || eShort === rawLower || eShort === cleanQuery || e.slug === querySlug) {
            return areEntitiesContextuallyIdentical(e.name, rawInput, { entityType: 'EXAM' })
          }
          return false
        })

        // Check B: Exact match in aliases
        if (!bestCandidate) {
          bestCandidate = allActiveExams.find((e: any) => {
            const aliases = aliasMap.get(e.id)
            if (!aliases) return false
            if (aliases.has(rawLower) || aliases.has(cleanQuery)) {
              return areEntitiesContextuallyIdentical(e.name, rawInput, { entityType: 'EXAM', isAliasMatch: true })
            }
            return false
          })
        }

        // Check C: Punctuation & spacing variations stripped matches
        if (!bestCandidate) {
          bestCandidate = allActiveExams.find((e: any) => {
            const eNameNoPunct = e.name.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
            const eShortNoPunct = e.short_name?.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim() || ''

            const nameMatches = eNameNoPunct === rawNoPunct || eNameNoPunct === cleanNoPunct || eShortNoPunct === rawNoPunct || eShortNoPunct === cleanNoPunct
            if (nameMatches && areEntitiesContextuallyIdentical(e.name, rawInput, { entityType: 'EXAM' })) {
              return true
            }

            const aliases = aliasMap.get(e.id)
            if (aliases) {
              for (const al of aliases) {
                const alNoPunct = al.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
                if ((alNoPunct === rawNoPunct || alNoPunct === cleanNoPunct) && areEntitiesContextuallyIdentical(e.name, rawInput, { entityType: 'EXAM', isAliasMatch: true })) {
                  return true
                }
              }
            }
            return false
          })
        }

        // Check D: Contextual Token & Category overlap (with strict anti-false-positive check)
        if (!bestCandidate) {
          const tokens = rawLower.split(/[^\w]+/).filter((t) => t.length >= 3)
          if (tokens.length >= 2) {
            let highestTokenScore = 0
            let topTokenExam: any = null

            for (const e of allActiveExams) {
              if (!areEntitiesContextuallyIdentical(e.name, rawInput, { entityType: 'EXAM' })) {
                continue
              }

              let score = 0
              const eName = e.name.toLowerCase()
              const eShort = e.short_name?.toLowerCase() || ''
              const countryName = (e.countries as any)?.name?.toLowerCase() || ''
              const categoryName = (e.exam_categories as any)?.name?.toLowerCase() || ''
              const categorySlug = (e.exam_categories as any)?.slug?.toLowerCase() || ''

              for (const token of tokens) {
                if (eName.includes(token)) score += 3
                if (eShort.includes(token)) score += 3
                if (countryName.includes(token)) score += 5
                if (categoryName.includes(token) || categorySlug.includes(token)) score += 4
              }

              if (score > highestTokenScore && score >= 10) {
                highestTokenScore = score
                topTokenExam = e
              }
            }

            if (topTokenExam) {
              bestCandidate = topTokenExam
              console.log(`[Exam Intelligence] Matched via Contextual Tokens: "${topTokenExam.name}"`)
            }
          }
        }

        // Check E: Spelling variations (similarity >= 90% and contextually identical)
        if (!bestCandidate) {
          let bestSimilarity = 0
          let topSimilarityExam: any = null

          for (const e of allActiveExams) {
            if (!areEntitiesContextuallyIdentical(e.name, rawInput, { entityType: 'EXAM' })) {
              continue
            }

            const nameSim = calculateLevenshteinSimilarity(e.name, rawInput)
            const shortSim = e.short_name ? calculateLevenshteinSimilarity(e.short_name, rawInput) : 0
            let maxSim = Math.max(nameSim, shortSim)

            const aliases = aliasMap.get(e.id)
            if (aliases) {
              for (const al of aliases) {
                const alSim = calculateLevenshteinSimilarity(al, rawInput)
                if (alSim > maxSim) maxSim = alSim
              }
            }

            if (maxSim > bestSimilarity) {
              bestSimilarity = maxSim
              topSimilarityExam = e
            }
          }

          if (bestSimilarity >= 90.0 && topSimilarityExam) {
            bestCandidate = topSimilarityExam
            console.log(`[Exam Intelligence] Matched via Spelling similarity: "${topSimilarityExam.name}" (${bestSimilarity}%)`)
          }
        }

        // If we matched any exam, fetch its full details including subjects & topics
        if (bestCandidate) {
          const { data: fullDetails } = await supabase
            .from('exams')
            .select(selectQuery)
            .eq('id', bestCandidate.id)
            .maybeSingle()

          if (fullDetails) {
            matchedExam = fullDetails
          }
        }
      }
    }

    // Save rawInput as a permanent alias for matchedExam if it does not already exist
    if (matchedExam) {
      try {
        const { data: aliasExists } = await supabase
          .from('exam_aliases')
          .select('id')
          .eq('exam_id', matchedExam.id)
          .ilike('alias', rawInput.trim())
          .maybeSingle()

        if (!aliasExists && rawInput.trim().length > 1) {
          await supabase
            .from('exam_aliases')
            .insert({
              exam_id: matchedExam.id,
              alias: rawInput.trim(),
            })
          console.log(`[Exam Intelligence] Registered new permanent alias "${rawInput.trim()}" for exam "${matchedExam.name}"`)
        }
      } catch (aliasErr) {
        console.warn('[Exam Intelligence] Non-blocking alias registration note:', aliasErr)
      }
    }

    // --------------------------------------------------------------------------
    // EXISTING EXAM PATH: Reconcile or reuse existing structure via Process A & B
    // --------------------------------------------------------------------------
    if (matchedExam?.id) {
      // Fuzzy matching may return a compact projection. Reload the canonical record
      // with every field required by the official verification gate.
      const { data: fullMatchedExam } = await supabase
        .from('exams')
        .select(selectQuery)
        .eq('id', matchedExam.id)
        .maybeSingle()
      if (fullMatchedExam) matchedExam = fullMatchedExam
    }

    if (matchedExam) {
      console.log(`[Exam Intelligence] Reusing canonical exam: "${matchedExam.name}" (${matchedExam.id})`)

      const matchedMetadata = matchedExam.metadata || {}
      const auditApproved =
        matchedExam.verification_status === 'verified' &&
        matchedMetadata.exam_metadata_audit_status === 'verified' &&
        Boolean(matchedExam.next_verification_at) &&
        new Date(matchedExam.next_verification_at).getTime() > Date.now()

      let rulesResult: any
      if (auditApproved) {
        // Reuse the last admin-approved official audit until its re-verification date.
        rulesResult = {
          rulesStatus: 'ready',
          verificationStatus: 'verified',
          auditStatus: 'verified',
          question_count: Number(matchedExam.question_count || 0) || null,
          duration_minutes: Number(matchedExam.time_limit_mins || 0) || null,
          marking_scheme: matchedExam.marking_scheme || null,
          question_types: matchedExam.question_types || [],
        }
      } else {
        rulesResult = await collectExamRulesProcess(matchedExam.id, matchedExam.name, country, category, supabase)
      }

      const verificationApproved =
        rulesResult.verificationStatus === 'verified' &&
        rulesResult.auditStatus === 'verified'

      if (!verificationApproved) {
        if (userId) {
          try {
            await supabase.from('user_exams').upsert(
              { user_id: userId, exam_id: matchedExam.id, status: 'in_progress' },
              { onConflict: 'user_id,exam_id' }
            )
          } catch (ueErr) {
            console.warn('[Exam Intelligence] user_exams upsert note:', ueErr)
          }
        }

        return {
          success: true,
          reused: true,
          exam: {
            id: matchedExam.id,
            name: matchedExam.name,
            slug: matchedExam.slug,
            short_name: matchedExam.short_name || matchedExam.name.split(' ')[0],
            level: matchedExam.level || null,
            description: matchedExam.description || `Exam profile for ${matchedExam.name}`,
            difficulty: matchedExam.difficulty || 'Intermediate',
            question_count: null,
            time_limit_mins: null,
            country: matchedExam.countries?.name || 'Unspecified',
            flag: matchedExam.countries?.flag_emoji || '🌐',
            curriculum_status: 'pending_verification',
            verification_status: 'needs_review',
            rules_status: rulesResult.rulesStatus,
            coverage_percentage: 0,
            evidence_scope: 'Official exam metadata review is required before curriculum generation.',
            authority_name: null,
            subjectCount: 0,
            topicCount: 0,
            subtopicCount: 0,
            exam_subjects: [],
            marking_scheme: null,
            question_types: [],
            exam_metadata_audit_status: rulesResult.auditStatus,
            missing_verification_fields: rulesResult.missingFields || [],
            conflicting_verification_fields: rulesResult.conflictingFields || [],
          },
          message: `"${matchedExam.name}" is selected. Official exam verification is pending; curriculum generation is blocked until the pattern and source evidence are approved.`,
        }
      }

      const curriculumResult = await enrichCurriculumProcess(matchedExam.id, matchedExam.name, country, category, supabase)

      if (userId) {
        try {
          await supabase.from('user_exams').upsert(
            {
              user_id: userId,
              exam_id: matchedExam.id,
              status: 'in_progress',
            },
            { onConflict: 'user_id,exam_id' }
          )
        } catch (ueErr) {
          console.warn('[Exam Intelligence] user_exams upsert note:', ueErr)
        }
      }

      return {
        success: true,
        reused: true,
        exam: {
          id: matchedExam.id,
          name: matchedExam.name,
          slug: matchedExam.slug,
          short_name: matchedExam.short_name || matchedExam.name.split(' ')[0],
          level: matchedExam.level || null,
          description: matchedExam.description || `Preparation curriculum for ${matchedExam.name}`,
          difficulty: matchedExam.difficulty || 'Intermediate',
          question_count: rulesResult.question_count,
          time_limit_mins: rulesResult.duration_minutes,
          country: matchedExam.countries?.name || 'Global',
          flag: matchedExam.countries?.flag_emoji || '🌐',
          curriculum_status: curriculumResult.curriculumStatus,
          verification_status: 'verified',
          rules_status: rulesResult.rulesStatus,
          coverage_percentage: curriculumResult.coveragePercentage,
          evidence_scope: curriculumResult.evidenceScope,
          authority_name: curriculumResult.authorityName,
          subjectCount: curriculumResult.subjectCount,
          topicCount: curriculumResult.topicCount,
          subtopicCount: curriculumResult.subtopicCount,
          exam_subjects: curriculumResult.subjects,
          marking_scheme: rulesResult.marking_scheme,
          question_types: rulesResult.question_types,
        },
        message: `Resolved verified canonical exam '${matchedExam.name}'.`,
      }
    }

    // --------------------------------------------------------------------------
    // NEW / CUSTOM EXAM PATH: Synthesize AI Exam Intelligence & Build Curriculum
    // --------------------------------------------------------------------------
    console.log(`[Exam Intelligence] Creating new canonical intelligence profile for: "${rawInput}"`)

    let countryId: string | null = null
    let categoryId: string | null = null

    if (country) {
      const { data: cRow } = await supabase
        .from('countries')
        .select('id')
        .ilike('name', country)
        .maybeSingle()
      if (cRow) countryId = cRow.id
    }

    const targetCatSlug = category ? category.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'general-academics'
    const { data: catRow } = await supabase
      .from('exam_categories')
      .select('id')
      .or(`slug.eq.${targetCatSlug},id.eq.${category || ''}`)
      .maybeSingle()
    if (catRow) categoryId = catRow.id

    // A student-supplied exam name is not enough evidence to infer an official pattern.
    // Create a minimal provisional record without calling an AI provider or inventing rules.
    const emptyQuestionConfig = {
      default_question_count: 0,
      option_count: 0,
      answer_type: 'single' as const,
      single_correct: true,
      multiple_correct: false,
      has_negative_marking: false,
      positive_mark: 0,
      negative_mark: 0,
      total_marks: null,
      duration_minutes: null,
      time_per_question_seconds: null,
      has_image_questions: false,
      has_video_questions: false,
      has_audio_questions: false,
      has_case_based_questions: false,
      has_clinical_vignettes: false,
      has_calculation_questions: false,
      has_matching_questions: false,
      has_true_false_questions: false,
      question_types: [],
    }

    const intelligenceProfile: ExamIntelligenceProfile = {
      exam_id: '',
      exam_code: norm.slug.toUpperCase(),
      exam_name: rawInput,
      official_name: null,
      country: country || 'Unspecified',
      region: null,
      exam_category: category || 'Unspecified',
      exam_type: 'Unverified',
      specialty_or_domain: null,
      difficulty_level: 'Adaptive',
      difficulty_distribution: { easy: 0, medium: 0, hard: 0 },
      question_config: emptyQuestionConfig,
      content_language: 'en',
      syllabus_source: 'user_custom',
      syllabus_confidence: 0,
      ai_generated: false,
      ai_generation_version: 'provisional-input-only',
      curriculum_status: 'pending_verification',
      content_generation_rules: {
        mcq: {}, quiz: {}, flashcard: {}, ai_tutor: {},
        fill_in_blank: {}, notes: {}, flowchart: {},
      },
      confidence: { overall: 0, curriculum: 0, exam_rules: 0 },
      provenance: {
        rules_verified: false,
        rules_inferred: false,
        source: 'User-provided exam name only; no official pattern or syllabus inferred',
        last_updated_at: new Date().toISOString(),
      },
      metadata: {
        generated_from_query: rawInput,
        provisional_only: true,
        timestamp: new Date().toISOString(),
      },
    }

    const examPayload: any = {
      name: rawInput,
      slug: querySlug,
      description: `Draft exam profile for ${rawInput}; official pattern and syllabus verification are pending.`,
      difficulty: intelligenceProfile.difficulty_level,
      exam_type: null,
      authority: null,
      question_count: 0,
      time_limit_mins: 0,
      total_marks: null,
      negative_marking: null,
      passing_criteria: null,
      eligibility: null,
      attempt_rules: null,
      application_information: null,
      selection_process: null,
      marking_scheme: null,
      question_types: [],
      stages: [],
      papers: [],
      languages: [],
      country_id: countryId,
      category_id: categoryId,
      level: level?.trim() || null,
      current_version: null,
      version_year: null,
      is_current: false,
      last_verified_at: null,
      next_verification_at: null,
      status: 'active',
      is_featured: false,
      created_by_ai: false,
      verification_status: 'pending_review',
      metadata: {
        exam_intelligence: intelligenceProfile,
        content_generation_rules: intelligenceProfile.content_generation_rules,
        proposed_authority: null,
        provisional_exam_rules: {
          question_config: intelligenceProfile.question_config,
          source: 'user_input_only',
          status: 'unverified_until_official_evidence_review',
        },
        exam_metadata_audit_status: 'needs_review',
        curriculum_status: 'pending_verification',
      },
      syllabus_info: {
        source: 'user_custom',
        confidence: intelligenceProfile.syllabus_confidence,
        provenance: intelligenceProfile.provenance,
      },
    }

    let { data: newExam, error: insertErr } = await supabase
      .from('exams')
      .insert(examPayload)
      .select('id, name, slug, description, difficulty, question_count, time_limit_mins')
      .single()

    if (insertErr && (insertErr.message?.includes('metadata') || insertErr.code === 'PGRST204')) {
      const { metadata, ...fallbackPayload } = examPayload
      if (fallbackPayload.syllabus_info) {
        fallbackPayload.syllabus_info.metadata = metadata
      }
      const retry = await supabase
        .from('exams')
        .insert(fallbackPayload)
        .select('id, name, slug, description, difficulty, question_count, time_limit_mins')
        .single()

      newExam = retry.data
      insertErr = retry.error
    }

    if (insertErr && insertErr.message?.includes('exams_slug_key')) {
      const { data: slugExisting } = await supabase
        .from('exams')
        .select('id, name, slug, description, difficulty, question_count, time_limit_mins')
        .eq('slug', querySlug)
        .maybeSingle()

      if (slugExisting) {
        newExam = slugExisting
        insertErr = null
      } else {
        examPayload.slug = `${querySlug}-${Math.random().toString(36).substring(2, 7)}`
        const retrySlug = await supabase
          .from('exams')
          .insert(examPayload)
          .select('id, name, slug, description, difficulty, question_count, time_limit_mins')
          .single()
        newExam = retrySlug.data
        insertErr = retrySlug.error
      }
    }

    if (insertErr || !newExam) {
      console.error('[Exam Intelligence] Failed to insert new exam:', insertErr)
      throw new Error(`Database error saving exam intelligence: ${insertErr?.message || 'Unknown'}`)
    }

    intelligenceProfile.exam_id = newExam.id

    // Register Aliases in `exam_aliases`
    try {
      await supabase.from('exam_aliases').upsert([
        { exam_id: newExam.id, alias: rawInput.trim().toLowerCase() },
        { exam_id: newExam.id, alias: cleanQuery.toLowerCase() },
      ], { onConflict: 'exam_id,alias' })
    } catch (aliasErr) {
      console.warn('[Exam Intelligence] Alias registration note:', aliasErr)
    }

    // Collect and persist official exam-rule evidence first. An AI profile is only
    // a provisional suggestion; no curriculum hierarchy is written before approval.
    const rulesResult = await collectExamRulesProcess(newExam.id, rawInput, country, category, supabase)

    if (rulesResult.verificationStatus !== 'verified' || rulesResult.auditStatus !== 'verified') {
      if (userId) {
        try {
          await supabase.from('user_exams').upsert(
            { user_id: userId, exam_id: newExam.id, status: 'in_progress' },
            { onConflict: 'user_id,exam_id' }
          )
        } catch (ueErr) {
          console.warn('[Exam Intelligence] user_exams link note:', ueErr)
        }
      }

      return {
        success: true,
        reused: false,
        exam: {
          id: newExam.id,
          name: newExam.name,
          slug: newExam.slug,
          short_name: (newExam as any).short_name || newExam.name.split(' ')[0],
          level: (newExam as any).level || level || null,
          description: newExam.description,
          difficulty: newExam.difficulty,
          question_count: null,
          time_limit_mins: null,
          country: intelligenceProfile.country,
          flag: country === 'India' ? '🇮🇳' : country === 'United States' ? '🇺🇸' : '🌐',
          curriculum_status: 'pending_verification',
          verification_status: 'needs_review',
          rules_status: rulesResult.rulesStatus,
          coverage_percentage: 0,
          evidence_scope: 'Official exam metadata review is required before curriculum generation.',
          authority_name: null,
          subjectCount: 0,
          topicCount: 0,
          subtopicCount: 0,
          exam_subjects: [],
          marking_scheme: null,
          question_types: [],
          exam_metadata_audit_status: rulesResult.auditStatus,
          missing_verification_fields: rulesResult.missingFields || [],
          conflicting_verification_fields: rulesResult.conflictingFields || [],
        },
        message: `"${newExam.name}" has been saved for official verification. Curriculum generation is blocked until the exam pattern and sources are approved.`,
      }
    }

    const curriculumResult = await enrichCurriculumProcess(newExam.id, rawInput, country, category, supabase)

    if (userId) {
      try {
        await supabase.from('user_exams').upsert(
          {
            user_id: userId,
            exam_id: newExam.id,
            status: 'in_progress',
          },
          { onConflict: 'user_id,exam_id' }
        )
      } catch (ueErr) {
        console.warn('[Exam Intelligence] user_exams link note:', ueErr)
      }
    }

    return {
      success: true,
      reused: false,
      exam: {
        id: newExam.id,
        name: newExam.name,
        slug: newExam.slug,
        short_name: (newExam as any).short_name || newExam.name.split(' ')[0],
        level: (newExam as any).level || level || null,
        description: newExam.description,
        difficulty: newExam.difficulty,
        question_count: rulesResult.question_count,
        time_limit_mins: rulesResult.duration_minutes,
        country: intelligenceProfile.country,
        flag: country === 'India' ? '🇮🇳' : country === 'United States' ? '🇺🇸' : '🌐',
        curriculum_status: curriculumResult.curriculumStatus,
        verification_status: curriculumResult.verificationStatus,
        rules_status: rulesResult.rulesStatus,
        coverage_percentage: curriculumResult.coveragePercentage,
        evidence_scope: curriculumResult.evidenceScope,
        authority_name: curriculumResult.authorityName,
        subjectCount: curriculumResult.subjectCount,
        topicCount: curriculumResult.topicCount,
        subtopicCount: curriculumResult.subtopicCount,
        profile: intelligenceProfile,
        exam_subjects: curriculumResult.subjects,
        marking_scheme: rulesResult.marking_scheme,
        question_types: rulesResult.question_types,
      },
      message: `Initialized canonical exam intelligence and curriculum for '${newExam.name}'.`,
    }
  })()

  inFlightResolutions.set(idempotencyKey, executionPromise)
  try {
    return await executionPromise
  } finally {
    inFlightResolutions.delete(idempotencyKey)
  }
}

// ============================================================================
// EXAM-AGNOSTIC CURRICULUM INTELLIGENCE & RECONCILIATION ENGINE (PROCESS A)
// ============================================================================

function buildOfficialCurriculumSpecFromEvidence(
  examRow: any,
  evidenceRows: any[],
  authorityRow: any,
  countryName: string | null,
  categoryName: string | null
): { spec: AIExamIntelligenceOutput | null; source: any | null; reason: string | null } {
  const versionYear = Number(examRow.version_year || 0);
  const authorityUrl = authorityRow?.official_website || authorityRow?.source_url || null;

  const officialSources = (evidenceRows || [])
    .filter((source: any) => {
      const sourceType = String(source.source_type || '').toLowerCase();
      if (!['official_syllabus', 'official_guideline', 'official_handbook'].includes(sourceType)) return false;
      if (String(source.verification_status || '').toLowerCase() !== 'verified') return false;
      if (!source.source_version_date || !source.source_url || !authorityUrl) return false;
      try {
        const sourceUrl = new URL(source.source_url);
        const authority = new URL(authorityUrl);
        if (sourceUrl.protocol !== 'https:' || authority.protocol !== 'https:') return false;
        const sourceHost = sourceUrl.hostname.toLowerCase().replace(/^www\./, '');
        const authorityHost = authority.hostname.toLowerCase().replace(/^www\./, '');
        if (!(sourceHost === authorityHost || sourceHost.endsWith(`.${authorityHost}`))) return false;
      } catch {
        return false;
      }
      const year = new Date(String(source.source_version_date)).getUTCFullYear();
      return Number.isFinite(year) && versionYear > 0 && year >= versionYear - 5 && year <= versionYear + 1;
    })
    .sort((a: any, b: any) => new Date(String(b.source_version_date)).getTime() - new Date(String(a.source_version_date)).getTime());

  let selectedSource: any = null;
  let subjects: any[] | null = null;
  for (const source of officialSources) {
    const normalized = normalizeOfficialSyllabusSubjects(source.extracted_data);
    if (normalized?.length) {
      selectedSource = source;
      subjects = normalized;
      break;
    }
  }

  if (!selectedSource || !subjects?.length) {
    return {
      spec: null,
      source: null,
      reason: 'OFFICIAL_SYLLABUS_STRUCTURE_MISSING: A verified official syllabus source with structured subjects, topics and subtopics is required. AI-generated guesses and starter templates are not accepted as the official curriculum.',
    };
  }

  const marking = examRow.marking_scheme && typeof examRow.marking_scheme === 'object'
    ? examRow.marking_scheme
    : {};
  const questionTypes = Array.isArray(examRow.question_types) ? examRow.question_types : [];
  const questionTypeText = questionTypes.map((item: any) => String(item)).join(' ').toLowerCase();
  const negativeText = String(examRow.negative_marking || '').toLowerCase();
  const hasNegativeMarking = typeof marking.has_negative_marking === 'boolean'
    ? marking.has_negative_marking
    : typeof examRow.negative_marking === 'boolean'
      ? examRow.negative_marking
      : /yes|true|deduct|minus|negative/.test(negativeText) && !/no negative|none|not applicable|false/.test(negativeText);
  const answerType = String(marking.answer_type || '').toLowerCase() === 'multiple' ? 'multiple' : 'single';
  const difficulty = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Adaptive'].includes(String(examRow.difficulty))
    ? examRow.difficulty
    : 'Adaptive';

  const rawSpec = {
    exam: {
      name: examRow.name,
      official_name: examRow.official_name || examRow.name,
      code: examRow.short_name || examRow.code || normalizeInput(examRow.name).slug.toUpperCase(),
      country: countryName || 'Unspecified',
      category: categoryName || 'Unspecified',
      type: examRow.exam_type || 'Unverified',
      difficulty_level: difficulty,
      question_config: {
        default_question_count: Number(examRow.question_count || 0),
        option_count: Number(marking.option_count || marking.options_count || 0),
        answer_type: answerType,
        single_correct: marking.single_correct ?? answerType === 'single',
        multiple_correct: marking.multiple_correct ?? answerType === 'multiple',
        has_negative_marking: hasNegativeMarking,
        positive_mark: Number(marking.positive_mark ?? marking.marks_per_question ?? marking.correct_mark ?? 0),
        negative_mark: Number(marking.negative_mark ?? marking.negative_mark_value ?? 0),
        total_marks: Number(examRow.total_marks || 0),
        duration_minutes: Number(examRow.time_limit_mins || 0),
        time_per_question_seconds: null,
        has_image_questions: /image|diagram|picture/.test(questionTypeText),
        has_video_questions: /video/.test(questionTypeText),
        has_audio_questions: /audio|listening/.test(questionTypeText),
        has_case_based_questions: /case|scenario/.test(questionTypeText),
        has_clinical_vignettes: /clinical|vignette/.test(questionTypeText),
        has_calculation_questions: /calculation|numerical/.test(questionTypeText),
        has_matching_questions: /matching/.test(questionTypeText),
        has_true_false_questions: /true.?false/.test(questionTypeText),
        question_types: questionTypes,
      },
    },
    subjects,
    content_generation_rules: {
      mcq: {}, quiz: {}, flashcard: {}, ai_tutor: {},
      fill_in_blank: {}, notes: {}, flowchart: {},
    },
    confidence: { overall: 1, curriculum: 1, exam_rules: 1 },
    metadata: {
      curriculum_source: 'verified_official_syllabus',
      source_id: selectedSource.id,
      source_url: selectedSource.source_url,
      source_version_date: selectedSource.source_version_date,
      extracted_by: 'admin_verified_structured_evidence',
    },
  };

  const parsed = AIExamIntelligenceOutputSchema.safeParse(rawSpec);
  if (!parsed.success) {
    return {
      spec: null,
      source: selectedSource,
      reason: `OFFICIAL_SYLLABUS_STRUCTURE_INCOMPLETE: Structured syllabus evidence failed schema validation: ${parsed.error.issues.slice(0, 5).map((issue) => issue.message).join('; ')}`,
    };
  }

  return { spec: parsed.data, source: selectedSource, reason: null };
}

export async function enrichCurriculumProcess(
  examId: string,
  examName: string,
  countryHint?: string,
  categoryHint?: string,
  supabaseClient?: any,
  specOverride?: AIExamIntelligenceOutput
): Promise<{
  subjectCount: number
  topicCount: number
  subtopicCount: number
  subjects: any[]
  curriculumStatus: CurriculumStatus
  verificationStatus: 'verified' | 'partially_verified' | 'AI_inferred' | 'needs_review'
  coveragePercentage: number
  evidenceScope: string
  authorityName: string | null
}> {
  const supabase = supabaseClient || getSupabaseAdmin()
  void specOverride

  // 1. Query existing curriculum hierarchy
  const { data: existingSubjects } = await supabase
    .from('exam_subjects')
    .select(`
      id,
      name,
      slug,
      description,
      weight_percentage,
      display_order,
      exam_topics (
        id,
        name,
        slug,
        description,
        display_order,
        exam_subtopics (
          id,
          name,
          slug,
          display_order
        )
      )
    `)
    .eq('exam_id', examId)
    .order('display_order', { ascending: true })

  // 2. Query exam record, authority, official evidence and current version.
  const { data: examRow } = await supabase.from('exams').select('*').eq('id', examId).maybeSingle()
  if (!examRow) {
    return {
      subjectCount: 0, topicCount: 0, subtopicCount: 0, subjects: [],
      curriculumStatus: 'needs_enrichment', verificationStatus: 'needs_review',
      coveragePercentage: 0, evidenceScope: 'Exam record not found.',
      authorityName: null,
    }
  }

  const [{ data: evidenceRows }, { data: versionRows }, { data: authorityRow }, { data: countryRow }, { data: categoryRow }] = await Promise.all([
    supabase.from('exam_evidence').select('*').eq('exam_id', examId),
    supabase.from('exam_versions').select('*').eq('exam_id', examId),
    examRow.authority_id
      ? supabase.from('exam_authorities').select('*').eq('id', examRow.authority_id).maybeSingle()
      : Promise.resolve({ data: null }),
    examRow.country_id
      ? supabase.from('countries').select('id,name').eq('id', examRow.country_id).maybeSingle()
      : Promise.resolve({ data: null }),
    examRow.category_id
      ? supabase.from('exam_categories').select('id,name').eq('id', examRow.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const currentVersion = (versionRows || []).find((version: any) => version.is_current === true) || null
  const examMetadata = examRow.metadata || {}
  const examMetadataAuditStatus = String(examMetadata.exam_metadata_audit_status || '')
  const authorityVerified = authorityRow?.verification_status === 'verified'
    && Boolean(authorityRow?.official_website)
    && Boolean(authorityRow?.last_verified_at)
    && (Date.now() - new Date(authorityRow.last_verified_at).getTime()) <= 366 * 24 * 60 * 60 * 1000
  const currentVersionVerified = currentVersion?.verification_status === 'verified'
    && Boolean(currentVersion?.verified_at)
    && Number(currentVersion?.version_year || 0) === Number(examRow.version_year || 0)
    && Boolean(currentVersion?.source_url)
  const nextVerificationAt = examRow.next_verification_at ? new Date(examRow.next_verification_at).getTime() : 0
  const auditApproved = examRow.verification_status === 'verified'
    && examMetadataAuditStatus === 'verified'
    && authorityVerified
    && currentVersionVerified
    && nextVerificationAt > Date.now()

  if (!auditApproved) {
    return {
      subjectCount: 0,
      topicCount: 0,
      subtopicCount: 0,
      subjects: [],
      curriculumStatus: 'needs_enrichment',
      verificationStatus: 'needs_review',
      coveragePercentage: 0,
      evidenceScope: 'Blocked: current authority, exam version and field-level official metadata audit are not all verified.',
      authorityName: authorityRow?.name || null,
    }
  }

  // 3. Curriculum hierarchy is sourced only from a verified official syllabus.
  // Cached AI guesses and starter templates are deliberately ignored.
  const officialSpecResult = buildOfficialCurriculumSpecFromEvidence(
    examRow,
    evidenceRows || [],
    authorityRow,
    countryRow?.name || countryHint || null,
    categoryRow?.name || categoryHint || null
  )

  const existing = existingSubjects || []
  const existingTopicCount = existing.reduce((n: number, subject: any) => n + (subject.exam_topics || []).length, 0)
  const existingSubtopicCount = existing.reduce((n: number, subject: any) =>
    n + (subject.exam_topics || []).reduce((m: number, topic: any) => m + (topic.exam_subtopics || []).length, 0), 0)

  if (!officialSpecResult.spec) {
    const nextMetadata = {
      ...examMetadata,
      curriculum_status: 'needs_enrichment',
      curriculum_validation_passed: false,
      curriculum_validation_version: 0,
      curriculum_source_status: 'missing_structured_official_syllabus',
      curriculum_source_requirement: officialSpecResult.reason,
    }
    await supabase.from('exams').update({ metadata: nextMetadata, updated_at: new Date().toISOString() }).eq('id', examId)
    return {
      subjectCount: existing.length,
      topicCount: existingTopicCount,
      subtopicCount: existingSubtopicCount,
      subjects: existing,
      curriculumStatus: 'needs_enrichment',
      verificationStatus: 'needs_review',
      coveragePercentage: 0,
      evidenceScope: officialSpecResult.reason || 'OFFICIAL_SYLLABUS_STRUCTURE_MISSING',
      authorityName: authorityRow?.name || null,
    }
  }

  const aiSpec = officialSpecResult.spec
  if (!isCurriculumSpecComprehensive(examName, aiSpec)) {
    const reason = 'OFFICIAL_SYLLABUS_STRUCTURE_INCOMPLETE: Official source structure does not meet the required subject, topic and subtopic coverage threshold. No AI-inferred hierarchy was persisted.'
    await supabase.from('exams').update({
      metadata: {
        ...examMetadata,
        curriculum_status: 'needs_enrichment',
        curriculum_validation_passed: false,
        curriculum_validation_version: 0,
        curriculum_source_status: 'incomplete_structured_official_syllabus',
        curriculum_source_requirement: reason,
        curriculum_spec_cache: null,
        curriculum_spec_cached_at: null,
        curriculum_source_evidence_id: officialSpecResult.source?.id || null,
        curriculum_source_url: officialSpecResult.source?.source_url || null,
        curriculum_source_version_date: officialSpecResult.source?.source_version_date || null,
      },
      updated_at: new Date().toISOString(),
    }).eq('id', examId)
    return {
      subjectCount: existing.length,
      topicCount: existingTopicCount,
      subtopicCount: existingSubtopicCount,
      subjects: existing,
      curriculumStatus: 'needs_enrichment',
      verificationStatus: 'needs_review',
      coveragePercentage: 0,
      evidenceScope: reason,
      authorityName: authorityRow?.name || null,
    }
  }

  const { error: cacheError } = await supabase.from('exams').update({
    metadata: {
      ...examMetadata,
      curriculum_spec_cache: aiSpec,
      curriculum_spec_cached_at: new Date().toISOString(),
      curriculum_source_status: 'verified_official_syllabus',
      curriculum_source_evidence_id: officialSpecResult.source?.id || null,
      curriculum_source_url: officialSpecResult.source?.source_url || null,
      curriculum_source_version_date: officialSpecResult.source?.source_version_date || null,
    },
    updated_at: new Date().toISOString(),
  }).eq('id', examId)
  if (cacheError) console.warn('[Curriculum Intelligence] Could not cache official syllabus spec:', cacheError.message)

  // 4. Run Reusable Curriculum Comparison Layer
  let comparisonReport = compareCurricula(examId, examName, aiSpec, existingSubjects || [])

  // 5. If missing coverage is detected (gaps in subjects, topics, or subtopics), reconcile missing entities
  if (comparisonReport.hasGaps || (existingSubjects || []).length === 0) {
    console.log(
      `[Curriculum Intelligence Process A] Gaps detected for "${examName}" (Matched subjects: ${comparisonReport.matchedSubjects}/${comparisonReport.totalExpectedSubjects}, topics: ${comparisonReport.matchedTopics}/${comparisonReport.totalExpectedTopics}). Reconciling missing nodes...`
    )

    await persistCurriculumHierarchy(examId, aiSpec, supabase)

    // Re-query refreshed complete hierarchy
    const { data: refreshedSubjects } = await supabase
      .from('exam_subjects')
      .select(`
        id,
        name,
        slug,
        description,
        weight_percentage,
        display_order,
        exam_topics (
          id,
          name,
          slug,
          description,
          display_order,
          exam_subtopics (
            id,
            name,
            slug,
            display_order
          )
        )
      `)
      .eq('exam_id', examId)
      .order('display_order', { ascending: true })

    // Re-run comparison against refreshed database tree
    comparisonReport = compareCurricula(examId, examName, aiSpec, refreshedSubjects || [])
  }

  await deactivateGenericCurriculumNodes(examId, supabase)

  // Acceptance gate: compare against the expected tree AND absolute breadth/depth.
  // Relative coverage alone can falsely bless a tiny AI-generated syllabus.
  const specIsComprehensive = isCurriculumSpecComprehensive(examName, aiSpec)
  const hierarchyTargetsMet =
    specIsComprehensive &&
    comparisonReport.totalExpectedSubjects > 0 &&
    comparisonReport.subjects.length === comparisonReport.totalExpectedSubjects &&
    comparisonReport.subjects.every((subject: any) =>
      subject.status === 'matched' &&
      subject.topics.length > 0 &&
      subject.topics.filter((topic: any) => topic.status === 'matched').length / subject.topics.length >= 0.8 &&
      subject.topics.filter((topic: any) => topic.status === 'matched').every((topic: any) =>
        topic.subtopics.length > 0 &&
        topic.subtopics.some((subtopic: any) => subtopic.status === 'matched') &&
        topic.subtopics.filter((subtopic: any) => subtopic.status === 'matched').length / topic.subtopics.length >= 0.8
      )
    )
  // Calculate actual row counts
  const finalSubjectsRaw = comparisonReport.subjects.length > 0 ? (await supabase
    .from('exam_subjects')
    .select(`
      id,
      name,
      slug,
      description,
      weight_percentage,
      display_order,
      is_active,
      exam_topics (
        id,
        name,
        slug,
        description,
        display_order,
        is_active,
        exam_subtopics (
          id,
          name,
          slug,
          display_order,
          is_active
        )
      )
    `)
    .eq('exam_id', examId)
    .order('display_order', { ascending: true })).data || [] : []

  const finalSubjects = (finalSubjectsRaw as any[])
    .filter((subject: any) => subject.is_active !== false)
    .map((subject: any) => ({
      ...subject,
      exam_topics: (subject.exam_topics || [])
        .filter((topic: any) => topic.is_active !== false)
        .map((topic: any) => ({
          ...topic,
          exam_subtopics: (topic.exam_subtopics || []).filter((subtopic: any) => subtopic.is_active !== false),
        })),
    }))

  let finalTopicCount = 0
  let finalSubtopicCount = 0

  finalSubjects.forEach((s: any) => {
    const topics = s.exam_topics || []
    finalTopicCount += topics.length
    topics.forEach((t: any) => {
      if (t.exam_subtopics) finalSubtopicCount += t.exam_subtopics.length
    })
  })

  // 6. Evidence-First Status Evaluation
  const evalResult = evaluateEvidenceAndStatus({
    authorityRow,
    evidenceRows: evidenceRows || [],
    versionRows: versionRows || [],
    comparisonReport,
    subjectCount: finalSubjects.length,
    topicCount: finalTopicCount,
    subtopicCount: finalSubtopicCount,
  })

  // 7. Persist the AI syllabus audit record without claiming it is an official source.
  // exam_evidence intentionally supports multiple sources per exam, so do not use
  // ON CONFLICT (exam_id): production has no such unique constraint.
  const curriculumVerificationStatus = hierarchyTargetsMet ? 'verified' : 'needs_review'
  const officialSourceUrl = officialSpecResult.source?.source_url || null
  const officialEvidenceScope = `Curriculum reconciled against verified official syllabus source: ${officialSourceUrl || 'source URL unavailable'}; evidence ID: ${officialSpecResult.source?.id || 'unknown'}.`
  const sourceReference = `${examName} Official Syllabus Reconciliation`
  const evidencePayload = {
    exam_id: examId,
    source_url: officialSourceUrl,
    source_reference: sourceReference,
    source_type: 'other',
    publisher_authority: authorityRow?.name || null,
    verification_status: 'pending',
    extracted_data: {
      source_evidence_id: officialSpecResult.source?.id || null,
      source_version_date: officialSpecResult.source?.source_version_date || null,
      coverage_percentage: evalResult.coveragePercentage,
      matched_subjects: comparisonReport.matchedSubjects,
      total_expected_subjects: comparisonReport.totalExpectedSubjects,
      matched_topics: comparisonReport.matchedTopics,
      total_expected_topics: comparisonReport.totalExpectedTopics,
      evidence_scope: officialEvidenceScope,
      reconciled_at: new Date().toISOString(),
      generated_by: 'official_syllabus_reconciliation',
    },
  }

  const { data: existingEvidence, error: evidenceLookupError } = await supabase
    .from('exam_evidence')
    .select('id')
    .eq('exam_id', examId)
    .eq('source_reference', sourceReference)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (evidenceLookupError) {
    console.error('[Exam Intelligence] Could not locate prior syllabus audit record:', evidenceLookupError)
  } else {
    const evidenceWrite = existingEvidence?.id
      ? await supabase.from('exam_evidence').update(evidencePayload).eq('id', existingEvidence.id)
      : await supabase.from('exam_evidence').insert(evidencePayload)
    if (evidenceWrite.error) {
      console.error('[Exam Intelligence] Failed to persist syllabus audit record:', evidenceWrite.error)
    }
  }

  // 8. Persist curriculum validation separately from official exam-pattern approval.
  // The latter is owned by the field-level audit and admin approval workflow.
  const { error: examStatusError } = await supabase
    .from('exams')
    .update({
      syllabus_info: {
        ...(examRow?.syllabus_info || {}),
        source: 'verified_official_syllabus',
        coverage_percentage: evalResult.coveragePercentage,
        evidence_scope: officialEvidenceScope,
        authority: authorityRow?.name || null,
        source_evidence_id: officialSpecResult.source?.id || null,
        source_url: officialSourceUrl,
        source_version_date: officialSpecResult.source?.source_version_date || null,
      },
      metadata: {
        ...(examRow?.metadata || {}),
        curriculum_status: hierarchyTargetsMet && examMetadataAuditStatus === 'verified' ? 'ready' : 'needs_enrichment',
        curriculum_validation_version: 4,
        curriculum_validation_passed: hierarchyTargetsMet && examMetadataAuditStatus === 'verified',
        curriculum_source_status: 'verified_official_syllabus',
        curriculum_source_evidence_id: officialSpecResult.source?.id || null,
        curriculum_source_url: officialSourceUrl,
        curriculum_source_version_date: officialSpecResult.source?.source_version_date || null,
        curriculum_validation_checked_at: new Date().toISOString(),
        curriculum_spec_cache: aiSpec,
        curriculum_spec_cached_at: (examRow?.metadata as any)?.curriculum_spec_cached_at || new Date().toISOString(),
        rules_status: (examRow?.metadata || {}).rules_status || 'needs_review',
        curriculum_verification_status: curriculumVerificationStatus,
        curriculum_verification_audit: {
          official_evidence_present: true,
          authority_verified: authorityVerified,
          current_exam_version_verified: currentVersionVerified,
          coverage_percentage: evalResult.coveragePercentage,
          status: curriculumVerificationStatus,
          source_url: officialSourceUrl,
          source_evidence_id: officialSpecResult.source?.id || null,
          checked_at: new Date().toISOString(),
        },
        coverage_percentage: evalResult.coveragePercentage,
        last_reconciled_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', examId)

  if (examStatusError) {
    console.error('[Exam Intelligence] Failed to persist exam curriculum status:', examStatusError)
  }

  return {
    subjectCount: finalSubjects.length,
    topicCount: finalTopicCount,
    subtopicCount: finalSubtopicCount,
    subjects: finalSubjects,
    curriculumStatus: hierarchyTargetsMet ? 'ready' : 'needs_enrichment',
    verificationStatus: curriculumVerificationStatus,
    coveragePercentage: evalResult.coveragePercentage,
    evidenceScope: officialEvidenceScope,
    authorityName: evalResult.authorityName,
  }
}

// ============================================================================
// EXAM RULES INTELLIGENCE & CONFLICT DETECTION (PROCESS B)
// ============================================================================

export async function collectExamRulesProcess(
  examId: string,
  examName: string,
  countryHint?: string,
  categoryHint?: string,
  supabaseClient?: any
): Promise<{
  rulesStatus: 'ready' | 'partial' | 'needs_review'
  verificationStatus: 'needs_review'
  auditStatus: 'needs_review' | 'ready_for_review'
  auditId: string | null
  missingFields: string[]
  conflictingFields: any[]
  marking_scheme: any
  question_types: any[]
  duration_minutes: number | null
  question_count: number | null
}> {
  const supabase = supabaseClient || getSupabaseAdmin()

  const [{ data: examRow, error: examError }, { data: versionRows }, { data: evidenceRows }] = await Promise.all([
    supabase.from('exams').select('*').eq('id', examId).single(),
    supabase.from('exam_versions').select('*').eq('exam_id', examId),
    supabase.from('exam_evidence').select('*').eq('exam_id', examId),
  ])

  if (examError || !examRow) {
    throw new Error(`Cannot audit exam rules for ${examName}: ${examError?.message || 'exam not found'}`)
  }

  const [{ data: countryRow }, { data: categoryRow }, { data: authorityRow }] = await Promise.all([
    examRow.country_id
      ? supabase.from('countries').select('id, name, iso2').eq('id', examRow.country_id).maybeSingle()
      : Promise.resolve({ data: null }),
    examRow.category_id
      ? supabase.from('exam_categories').select('id, name, slug').eq('id', examRow.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    examRow.authority_id
      ? supabase.from('exam_authorities').select('*').eq('id', examRow.authority_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Rules may be read from the stored record for audit comparison, but no fallback
  // template or AI-generated profile is allowed to supply official exam facts.
  const rulesValidation = detectAndValidateExamRules(
    examRow,
    versionRows || [],
    evidenceRows || [],
    undefined
  )

  const audit = buildExamMetadataAudit({
    exam: examRow,
    country: countryRow,
    category: categoryRow,
    authority: authorityRow,
    versions: versionRows || [],
    evidence: evidenceRows || [],
  })

  const previousAuditUpdate = await supabase
    .from('exam_verification_audits')
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq('exam_id', examId)
    .eq('is_current', true)

  if (previousAuditUpdate.error) {
    console.error('[Exam Rules Process B] Could not close prior metadata audit:', previousAuditUpdate.error)
  }

  const { data: auditRow, error: auditInsertError } = await supabase
    .from('exam_verification_audits')
    .insert({
      exam_id: examId,
      exam_version_id: audit.current_exam_version_id,
      audit_version: audit.audit_version,
      status: audit.status,
      field_results: audit.field_results,
      missing_fields: audit.missing_fields,
      conflicting_fields: audit.conflicting_fields,
      source_ids: audit.source_ids,
      source_urls: audit.source_urls,
      checked_at: audit.checked_at,
      is_current: true,
    })
    .select('id')
    .single()

  if (auditInsertError) {
    console.error('[Exam Rules Process B] Failed to persist field-level audit:', auditInsertError)
  }

  const auditStatus = auditInsertError ? 'needs_review' : audit.status
  const rulesStatus: 'ready' | 'partial' | 'needs_review' =
    auditStatus === 'ready_for_review' ? 'ready' : 'needs_review'
  const auditId = auditRow?.id || null
  const combinedConflicts = [
    ...(rulesValidation.conflictDetails || []).map((reason: string) => ({ reason })),
    ...(audit.conflicting_fields || []),
  ]

  const metadata = {
    ...(examRow.metadata || {}),
    rules_conflicts: combinedConflicts,
    rules_status: rulesStatus,
    exam_metadata_audit_status: auditStatus,
    exam_metadata_audit_id: auditId,
    exam_metadata_audit_checked_at: audit.checked_at,
    exam_metadata_audit_summary: {
      status: auditStatus,
      missing_fields: audit.missing_fields,
      conflicting_fields: audit.conflicting_fields,
      source_urls: audit.source_urls,
      authority_domain: audit.authority_domain,
      current_exam_version_id: audit.current_exam_version_id,
      current_version_year: audit.current_version_year,
      official_evidence_count: audit.official_evidence_count,
      candidate_official_evidence_count: audit.candidate_official_evidence_count,
    },
    provisional_exam_rules: {
      question_count: rulesValidation.question_count,
      duration_minutes: rulesValidation.duration_minutes,
      marking_scheme: rulesValidation.marking_scheme,
      question_types: rulesValidation.question_types,
      status: 'unverified_until_official_audit_approval',
      source: 'stored_exam_fields_or_verified_evidence_only',
    },
  }

  const { error: examUpdateError } = await supabase
    .from('exams')
    .update({
      verification_status: 'needs_review',
      last_verified_at: null,
      next_verification_at: null,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', examId)

  if (examUpdateError) {
    console.error('[Exam Rules Process B] Failed to persist exam metadata audit summary:', examUpdateError)
  }

  return {
    rulesStatus,
    verificationStatus: 'needs_review',
    auditStatus,
    auditId,
    missingFields: audit.missing_fields || [],
    conflictingFields: audit.conflicting_fields || [],
    marking_scheme: null,
    question_types: [],
    duration_minutes: null,
    question_count: null,
  }
}


// ============================================================================
// DEDUPLICATED CURRICULUM HIERARCHY PERSISTENCE
// ============================================================================

const GENERIC_FILLER_SUBTOPIC_REGEX = /^(introduction|basics|overview|general concepts|details|other|miscellaneous)$/i

function isGenericFillerSubtopic(name: string): boolean {
  return GENERIC_FILLER_SUBTOPIC_REGEX.test(name.trim())
}

// Legacy onboarding created generic pseudo-subjects/topics for some exams.
// Hide only known non-curricular filler labels; keep rows for audit/history and
// avoid destructive deletes that could break foreign-key references.
const GENERIC_FILLER_NODE_REGEX = /^(core foundations(?: and| &)? principles|core practice(?: q-bank)?|advanced applied practice(?: and| &)? analysis|applied analysis(?: and| &)? problem solving|complex problem analysis|applied problem solving|general applied practice|advanced practice applications|applied analysis|complex problem solving)$/i

async function deactivateGenericCurriculumNodes(examId: string, supabase: any) {
  const { data: subjects, error: subjectError } = await supabase
    .from('exam_subjects')
    .select('id, name')
    .eq('exam_id', examId)

  if (subjectError || !subjects?.length) {
    if (subjectError) console.warn('[Curriculum Cleanup] Could not inspect subjects:', subjectError.message)
    return
  }

  const subjectIds = subjects.map((subject: any) => subject.id)
  const hasLegacyGenericPair =
    subjects.some((subject: any) => /^core foundations(?: and| &)? principles$/i.test((subject.name || '').trim())) &&
    subjects.some((subject: any) => /^advanced applied practice(?: and| &)? analysis$/i.test((subject.name || '').trim()))
  const genericSubjectIds = hasLegacyGenericPair
    ? subjects
        .filter((subject: any) => GENERIC_FILLER_NODE_REGEX.test((subject.name || '').trim()))
        .map((subject: any) => subject.id)
    : []

  for (const subjectId of genericSubjectIds) {
    const { error } = await supabase.from('exam_subjects').update({ is_active: false }).eq('id', subjectId)
    if (error) console.warn('[Curriculum Cleanup] Could not deactivate generic subject:', error.message)
  }

  const { data: topics, error: topicError } = await supabase
    .from('exam_topics')
    .select('id, name, subject_id')
    .in('subject_id', subjectIds)

  if (topicError || !topics?.length) {
    if (topicError) console.warn('[Curriculum Cleanup] Could not inspect topics:', topicError.message)
    return
  }

  const genericTopicIds = topics
    .filter((topic: any) =>
      genericSubjectIds.includes(topic.subject_id) ||
      GENERIC_FILLER_NODE_REGEX.test((topic.name || '').trim())
    )
    .map((topic: any) => topic.id)

  for (const topicId of genericTopicIds) {
    const { error } = await supabase.from('exam_topics').update({ is_active: false }).eq('id', topicId)
    if (error) console.warn('[Curriculum Cleanup] Could not deactivate generic topic:', error.message)
  }

  const topicIds = topics.map((topic: any) => topic.id)
  if (topicIds.length > 0) {
    const { data: subtopics, error: subtopicError } = await supabase
      .from('exam_subtopics')
      .select('id, name, topic_id')
      .in('topic_id', topicIds)

    if (subtopicError) {
      console.warn('[Curriculum Cleanup] Could not inspect subtopics:', subtopicError.message)
      return
    }

    for (const subtopic of (subtopics || []).filter((item: any) =>
      genericTopicIds.includes(item.topic_id) ||
      GENERIC_FILLER_NODE_REGEX.test((item.name || '').trim())
    )) {
      const { error } = await supabase.from('exam_subtopics').update({ is_active: false }).eq('id', subtopic.id)
      if (error) console.warn('[Curriculum Cleanup] Could not deactivate generic subtopic:', error.message)
    }
  }
}

async function persistCurriculumHierarchy(
  examId: string,
  spec: AIExamIntelligenceOutput,
  supabase: any
) {
  if (!spec.subjects || spec.subjects.length === 0) return

  const { data: existingSubjects } = await supabase
    .from('exam_subjects')
    .select('id, name, slug, is_active, exam_topics(id, name, slug, is_active, exam_subtopics(id, name, slug, is_active))')
    .eq('exam_id', examId)

  const currentSubjectsList = existingSubjects || []

  for (let sIdx = 0; sIdx < spec.subjects.length; sIdx++) {
    const sItem = spec.subjects[sIdx]
    const subSlug = normalizeInput(sItem.name).slug.toLowerCase()

    let subjectId: string | null = null
    const existingSub = findMatchingSubjectInList(sItem.name, currentSubjectsList)

    if (existingSub) {
      subjectId = existingSub.id
      if (existingSub.is_active === false) {
        const { error: reactivateSubjectError } = await supabase.from('exam_subjects').update({ is_active: true }).eq('id', existingSub.id)
        if (reactivateSubjectError) throw new Error(`Failed to reactivate subject "${sItem.name}": ${reactivateSubjectError.message}`)
        existingSub.is_active = true
      }
    } else {
      const { data: insertedSub, error: subErr } = await supabase
        .from('exam_subjects')
        .insert({
          exam_id: examId,
          name: sItem.name,
          slug: subSlug,
          description: sItem.description || `Syllabus focus for ${sItem.name}`,
          weight_percentage: sItem.weightage || 10,
          display_order: sItem.order || sIdx + 1,
        })
        .select('id')
        .maybeSingle()

      if (insertedSub) {
        subjectId = insertedSub.id
        currentSubjectsList.push({ id: subjectId, name: sItem.name, slug: subSlug, exam_topics: [] })
      } else {
        console.warn(`[Exam Intelligence] Subject insert error:`, subErr)
        const { data: dbSub } = await supabase
          .from('exam_subjects')
          .select('id')
          .eq('exam_id', examId)
          .ilike('name', sItem.name)
          .maybeSingle()
        if (dbSub) {
          subjectId = dbSub.id
        } else {
          throw new Error(
            `Failed to persist curriculum subject "${sItem.name}": ${subErr?.message || 'insert returned no row'}`
          )
        }
      }
    }

    if (!subjectId) {
      throw new Error(`Curriculum subject "${sItem.name}" could not be resolved after insertion.`)
    }

    const currentTopicsList = existingSub?.exam_topics || []

    for (let tIdx = 0; tIdx < sItem.topics.length; tIdx++) {
      const tItem = sItem.topics[tIdx]
      const topSlug = normalizeInput(tItem.name).slug.toLowerCase()

      let topicId: string | null = null
      const existingTop = findMatchingTopicInList(tItem.name, currentTopicsList)

      if (existingTop) {
        topicId = existingTop.id
        if (existingTop.is_active === false) {
          const { error: reactivateTopicError } = await supabase.from('exam_topics').update({ is_active: true }).eq('id', existingTop.id)
          if (reactivateTopicError) throw new Error(`Failed to reactivate topic "${tItem.name}": ${reactivateTopicError.message}`)
          existingTop.is_active = true
        }
      } else {
        const { data: insertedTop, error: topErr } = await supabase
          .from('exam_topics')
          .insert({
            subject_id: subjectId,
            name: tItem.name,
            slug: topSlug,
            description: tItem.description || `Topic focus for ${tItem.name}`,
            display_order: tItem.order || tIdx + 1,
          })
          .select('id')
          .maybeSingle()

        if (insertedTop) {
          topicId = insertedTop.id
          currentTopicsList.push({ id: topicId, name: tItem.name, slug: topSlug, exam_subtopics: [] })
        } else {
          console.warn(`[Exam Intelligence] Topic insert error:`, topErr)
          const { data: dbTop } = await supabase
            .from('exam_topics')
            .select('id')
            .eq('subject_id', subjectId)
            .ilike('name', tItem.name)
            .maybeSingle()
          if (dbTop) {
            topicId = dbTop.id
          } else {
            throw new Error(
              `Failed to persist curriculum topic "${tItem.name}" under "${sItem.name}": ${topErr?.message || 'insert returned no row'}`
            )
          }
        }
      }

      if (!topicId) {
        throw new Error(`Curriculum topic "${tItem.name}" under "${sItem.name}" could not be resolved after insertion.`)
      }

      // Process Subtopics under Topic if provided
      if (tItem.subtopics && tItem.subtopics.length > 0) {
        const existingSubtopics = existingTop?.exam_subtopics || []
        const nonFillerCount = tItem.subtopics.filter((st: any) => !isGenericFillerSubtopic(st.name)).length

        const subtopicInserts = []
        for (let stIdx = 0; stIdx < tItem.subtopics.length; stIdx++) {
          const stItem = tItem.subtopics[stIdx]

          if (nonFillerCount > 0 && isGenericFillerSubtopic(stItem.name)) {
            continue
          }

          const existingMatch = findMatchingSubtopicInList(stItem.name, existingSubtopics)
          if (existingMatch?.is_active === false) {
            const { error: reactivateSubtopicError } = await supabase.from('exam_subtopics').update({ is_active: true }).eq('id', existingMatch.id)
            if (reactivateSubtopicError) throw new Error(`Failed to reactivate subtopic "${stItem.name}": ${reactivateSubtopicError.message}`)
            existingMatch.is_active = true
          }
          if (!existingMatch) {
            subtopicInserts.push({
              topic_id: topicId,
              name: stItem.name,
              slug: normalizeInput(stItem.name).slug.toLowerCase(),
              description: stItem.description || `Subtopic focus for ${stItem.name}`,
              display_order: stItem.order || stIdx + 1,
              is_active: true,
            })
          }
        }

        if (subtopicInserts.length > 0) {
          const { error: subtopicsInsertError } = await supabase.from('exam_subtopics').insert(subtopicInserts)
          if (subtopicsInsertError) {
            console.error('[Exam Intelligence] Subtopics batch insert failed:', subtopicsInsertError)
            throw new Error(`Failed to persist curriculum subtopics for topic "${tItem.name}": ${subtopicsInsertError.message}`)
          }
        }
      }
    }
  }
}
