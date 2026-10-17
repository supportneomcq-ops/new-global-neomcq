import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { getSupabaseAdmin } from '@/lib/supabase'
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
// VERIFIED CANONICAL STANDARD TEMPLATES (Instant deterministic resolution)
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

export const VERIFIED_EXAM_TEMPLATES: Record<string, StandardCurriculumTemplate> = {
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

// A spec is not complete just because it parses as JSON or has a few subjects.
// This guard prevents generic 3-topic skeletons from being cached as canonical syllabi.
function isCurriculumSpecComprehensive(examName: string, spec: AIExamIntelligenceOutput): boolean {
  const subjects = Array.isArray(spec.subjects) ? spec.subjects : []
  const examKey = normalizeInput(examName).slug.toLowerCase()
  const minSubjects = /fmge|neet-pg|ini-cet/.test(examKey) ? 20
    : /neet-ug|neetug/.test(examKey) ? 6
    : /usmle-step-[123]|usmle-[123]/.test(examKey) ? 8
    : /upsc/.test(examKey) ? 6
    : /aws.*(solution|architect)|solutions-architect/.test(examKey) ? 4
    : 1
  const minTopics = /fmge|neet-pg|ini-cet/.test(examKey) ? Math.max(100, subjects.length * 5)
    : /neet-ug|neetug/.test(examKey) ? 30
    : /usmle-step-1|usmle-1/.test(examKey) ? 40
    : /usmle-step-[23]|usmle-[23]/.test(examKey) ? 40
    : /upsc/.test(examKey) ? 30
    : /aws.*(solution|architect)|solutions-architect/.test(examKey) ? 20
    : Math.max(8, subjects.length * 5)
  const topics = subjects.reduce((n, subject: any) => n + (Array.isArray(subject.topics) ? subject.topics.length : 0), 0)
  const subtopics = subjects.reduce((n, subject: any) => n + (Array.isArray(subject.topics) ? subject.topics.reduce((m: number, topic: any) => m + (Array.isArray(topic.subtopics) ? topic.subtopics.length : 0), 0) : 0), 0)
  const normName = (value: string) => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
  const unique = (values: string[]) => {
    const keys = values.map(normName).filter(Boolean)
    return new Set(keys).size === keys.length
  }
  const generic = /^(core foundations?(&|and)? principles|advanced practice(&|and)? applied problem solving|fundamental concepts(&|and)? standards|case scenarios(&|and)? practice applications|core subject \d+|topic \d+)$/i
  return subjects.length >= minSubjects &&
    topics >= minTopics &&
    subtopics >= Math.ceil(topics * 2.5) &&
    unique(subjects.map((s: any) => s.name)) &&
    subjects.every((s: any) => Array.isArray(s.topics) && s.topics.length > 0 &&
      unique(s.topics.map((t: any) => t.name)) &&
      s.topics.every((t: any) => Array.isArray(t.subtopics) && t.subtopics.length >= 2 &&
        unique(t.subtopics.map((st: any) => st.name)))) &&
    !subjects.some((s: any) => generic.test(String(s.name || '').trim()) ||
      (s.topics || []).some((t: any) => generic.test(String(t.name || '').trim())))
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

  const systemInstruction = `You are the Principal Psychometrician and Global Curriculum Architect for NeoMCQ.
Your mission is to construct a rigorous, comprehensive Exam Intelligence Profile and Curriculum Specification for any examination worldwide.
You MUST output strictly valid JSON conforming directly to the required schema. Never wrap in markdown text outside of the JSON.`

  const prompt = `Construct the official Exam Intelligence Profile and complete Curriculum Specification for the examination: "${cleanName}".
${countryHint ? `Country / Region Context: ${countryHint}` : ''}
${categoryHint ? `Discipline / Category Context: ${categoryHint}` : ''}
${levelHint ? `Credential Level / Stage Context: ${levelHint}` : ''}

CRITICAL ARCHITECTURAL DIRECTIVES:
1. EXAM LEVEL:
   - Identify official full name, standard code/acronym, jurisdiction, and credential level.
   - Establish realistic question configuration (option count, negative marking, question types, duration).
   - Classify question types: standard_mcq, clinical_vignette, case_based, calculation, image_based, scenario_architecture.
2. CURRICULUM HIERARCHY:
   - Build the exam-specific syllabus breadth, not a short illustrative sample. Use official exam-body syllabus/blueprint knowledge where available; never merge separate exams or omit independently tested domains.
   - FMGE and NEET PG must cover the full MBBS subject domains, not only 4-5 broad clinical subjects; target at least 15 distinct subjects. NEET UG must contain six distinct class-specific subjects: Physics XI, Chemistry XI, Biology XI, Physics XII, Chemistry XII, and Biology XII. USMLE Step 1 must cover the full basic-science/organ-system blueprint, target at least 8 distinct domains. UPSC CSE must cover its major Prelims/Mains syllabus domains, target at least 6 subjects. AWS Solutions Architect Associate must cover all current exam domains, target at least 4.
   - For FMGE and NEET PG, use exactly these 20 individual subject names: Anatomy, Physiology, Biochemistry, Pathology, Microbiology, Pharmacology, Forensic Medicine, Medicine, Psychiatry, Dermatology & STD, Radiotherapy, General Surgery, Anesthesiology, Orthopedics, Radiodiagnosis, Pediatrics, Ophthalmology, Otorhinolaryngology (ENT), Obstetrics & Gynaecology, Community Medicine. Do not add General Medicine, standalone Dermatology, Surgery, or Radiology as extra duplicate subjects. For INI-CET, include the full MBBS subject coverage. For every subject, create at least 5 meaningful, exam-specific main topics. For every main topic, create at least 3 specific subtopics. Preserve the real exam blueprint and avoid generic placeholders, duplicate subjects, repeated topic lists, and filler labels.
   - If you cannot confidently produce a complete, exam-specific hierarchy, do not claim that the syllabus is complete.
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
    "difficulty_level": "Intermediate"
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
            { "name": "Specific Subtopic 1", "order": 1 },
            { "name": "Specific Subtopic 2", "order": 2 },
            { "name": "Specific Subtopic 3", "order": 3 }
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
          model: process.env.GEMINI_CURRICULUM_MODEL || 'gemini-2.5-flash',
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

      const text = response.text || '{}'
      const parsed = JSON.parse(text)
      const validated = AIExamIntelligenceOutputSchema.safeParse(parsed)

      if (validated.success) {
        const q = normalizeInput(cleanName).slug.toLowerCase()
        const minimumSubjects = /fmge|neet-pg|ini-cet/.test(q) ? 20 : /neet-ug|neetug/.test(q) ? 6 : /usmle-step-1|usmle-1/.test(q) ? 8 : /upsc/.test(q) ? 6 : /aws.*(solution|architect)|solutions-architect/.test(q) ? 4 : 1
        if (validated.data.subjects.length < minimumSubjects) {
          console.warn(`[Exam Intelligence] Incomplete Gemini curriculum rejected for ${cleanName}: ${validated.data.subjects.length}/${minimumSubjects} minimum subjects. Trying fallback provider.`)
          throw new Error('Gemini curriculum did not meet minimum subject coverage.')
        }
        if (!isCurriculumSpecComprehensive(cleanName, validated.data)) {
          console.warn(`[Exam Intelligence] Gemini curriculum failed breadth/depth validation for ${cleanName}; trying fallback provider.`)
          throw new Error('Gemini curriculum did not meet minimum topic/subtopic coverage.')
        }
        return validated.data
      } else {
        console.warn('[Exam Intelligence] Validation schema issues:', validated.error.format())
        // Attempt partial recovery if subjects array exists
        const q = normalizeInput(cleanName).slug.toLowerCase()
        const minimumSubjects = /fmge|neet-pg|ini-cet/.test(q) ? 20 : /neet-ug|neetug/.test(q) ? 6 : /usmle-step-1|usmle-1/.test(q) ? 8 : /upsc/.test(q) ? 6 : /aws.*(solution|architect)|solutions-architect/.test(q) ? 4 : 1
        if (parsed.subjects && Array.isArray(parsed.subjects) && parsed.subjects.length >= minimumSubjects &&
          isCurriculumSpecComprehensive(cleanName, {
            ...(parsed as AIExamIntelligenceOutput),
            exam: parsed.exam || { name: cleanName },
            subjects: parsed.subjects,
          } as AIExamIntelligenceOutput)) {
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
        model: process.env.OPENAI_CURRICULUM_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 16000,
      })
      const responseText = completion.choices[0]?.message?.content
      if (responseText) {
        const parsed = JSON.parse(responseText)
        const validated = AIExamIntelligenceOutputSchema.safeParse(parsed)
        if (validated.success) {
          const q = normalizeInput(cleanName).slug.toLowerCase()
          const minimumSubjects = /fmge|neet-pg|ini-cet/.test(q) ? 20 : /neet-ug|neetug/.test(q) ? 6 : /usmle-step-1|usmle-1/.test(q) ? 8 : /upsc/.test(q) ? 6 : /aws.*(solution|architect)|solutions-architect/.test(q) ? 4 : 1
          if (validated.data.subjects.length >= minimumSubjects && isCurriculumSpecComprehensive(cleanName, validated.data)) {
            return validated.data
          }
          console.warn(`[Exam Intelligence] OpenAI curriculum rejected for ${cleanName}: insufficient subject/topic/subtopic coverage.`)
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

  return null
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
  for (const [key, template] of Object.entries(VERIFIED_EXAM_TEMPLATES)) {
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
  const idempotencyKey = `${cleanQuery}::${(country || '').toLowerCase()}::${(category || '').toLowerCase()}`
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
    if (matchedExam) {
      console.log(`[Exam Intelligence] Reusing existing canonical exam: "${matchedExam.name}" (${matchedExam.id})`)

      // These processes both update exams.metadata. Run sequentially so the
      // second write reads the first process's latest metadata instead of overwriting it.
      // Validate exam rules and existing evidence BEFORE reconciling or writing curriculum rows.
      // Missing or conflicting rules are recorded for review; they must not be silently
      // treated as official facts.
      const rulesResult = await collectExamRulesProcess(matchedExam.id, matchedExam.name, country, category, supabase)
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
          verification_status: curriculumResult.verificationStatus,
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
        message: `Resolved canonical exam '${matchedExam.name}'.`,
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

    // Generate Structured Exam Intelligence & Curriculum
    const aiSpec = await generateAIExamIntelligence(rawInput, country, category, level)
    if (!aiSpec) {
      throw new Error(`AI could not produce a sufficiently complete exam-specific curriculum for "${rawInput}". No generic placeholder curriculum was saved; retry after the AI provider is available.`)
    }

    // A model's confidence score is not official evidence. This path always
    // creates an AI-generated exam; it must remain pending review until an
    // official source is independently verified.
    const isVerifiedTemplate = false

    const intelligenceProfile: ExamIntelligenceProfile = {
      exam_id: '',
      exam_code: aiSpec.exam.code || norm.slug.toUpperCase(),
      exam_name: rawInput,
      official_name: aiSpec.exam.official_name || rawInput,
      country: aiSpec.exam.country || country || 'Global',
      region: aiSpec.exam.region || null,
      exam_category: category || aiSpec.exam.category || 'general-academics',
      exam_type: aiSpec.exam.type || 'Certification',
      specialty_or_domain: aiSpec.exam.specialty_or_domain || null,
      difficulty_level: aiSpec.exam.difficulty_level || 'Intermediate',
      difficulty_distribution: aiSpec.exam.difficulty_distribution || { easy: 20, medium: 60, hard: 20 },
      question_config: aiSpec.exam.question_config,
      content_language: 'en',
      syllabus_source: isVerifiedTemplate ? 'verified_standard' : 'ai_inferred',
      syllabus_confidence: aiSpec.confidence.curriculum,
      ai_generated: !isVerifiedTemplate,
      ai_generation_version: '3.0.0-evidence-hardened',
      curriculum_status: 'ready',
      content_generation_rules: aiSpec.content_generation_rules,
      confidence: aiSpec.confidence,
      provenance: {
        rules_verified: isVerifiedTemplate,
        rules_inferred: !isVerifiedTemplate,
        source: isVerifiedTemplate ? 'Verified Global Standard Template' : 'AI Curriculum Engine v3',
        last_updated_at: new Date().toISOString(),
      },
      metadata: {
        generated_from_query: rawInput,
        timestamp: new Date().toISOString(),
      },
    }

    const examPayload: any = {
      name: rawInput,
      slug: querySlug,
      description: isVerifiedTemplate
        ? `Official preparation syllabus and curriculum for ${rawInput}.`
        : `AI-generated draft curriculum for ${rawInput}; official syllabus verification is pending.`,
      difficulty: intelligenceProfile.difficulty_level,
      question_count: intelligenceProfile.question_config.default_question_count || 100,
      time_limit_mins: intelligenceProfile.question_config.duration_minutes || 120,
      country_id: countryId,
      category_id: categoryId,
      level: level?.trim() || null,
      status: 'active',
      is_featured: false,
      created_by_ai: !isVerifiedTemplate,
      verification_status: isVerifiedTemplate ? 'verified' : 'pending_review',
      marking_scheme: {
        positive_mark: intelligenceProfile.question_config.positive_mark,
        negative_mark: intelligenceProfile.question_config.negative_mark,
        has_negative_marking: intelligenceProfile.question_config.has_negative_marking,
        answer_type: intelligenceProfile.question_config.answer_type,
        option_count: intelligenceProfile.question_config.option_count,
      },
      question_types: intelligenceProfile.question_config.question_types,
      metadata: {
        exam_intelligence: intelligenceProfile,
        content_generation_rules: intelligenceProfile.content_generation_rules,      },
      syllabus_info: {
        source: intelligenceProfile.syllabus_source,
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
      await supabase.from('exam_aliases').insert([
        { exam_id: newExam.id, alias: rawInput.trim() },
        { exam_id: newExam.id, alias: cleanQuery },
        ...(aiSpec.exam.official_name && aiSpec.exam.official_name !== rawInput
          ? [{ exam_id: newExam.id, alias: aiSpec.exam.official_name }]
          : []),
      ])
    } catch (aliasErr) {
      console.warn('[Exam Intelligence] Alias registration note:', aliasErr)
    }

    // Run Process B first so question format, timing, scoring and evidence conflicts
    // are checked and persisted before Process A reconciles the curriculum hierarchy.
    const rulesResult = await collectExamRulesProcess(newExam.id, rawInput, country, category, supabase)
    const curriculumResult = await enrichCurriculumProcess(newExam.id, rawInput, country, category, supabase, aiSpec)

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

  // 2. Query authority, evidence, and versions
  const [{ data: examRow }, { data: evidenceRows }, { data: versionRows }] = await Promise.all([
    supabase.from('exams').select('id, name, authority_id, authority, metadata, syllabus_info').eq('id', examId).maybeSingle(),
    supabase.from('exam_evidence').select('*').eq('exam_id', examId),
    supabase.from('exam_versions').select('*').eq('exam_id', examId),
  ])

  let authorityRow: any = null
  if (examRow?.authority_id) {
    const { data: authData } = await supabase.from('exam_authorities').select('*').eq('id', examRow.authority_id).maybeSingle()
    authorityRow = authData
  }

  // 3. Obtain expected syllabus specification
  // Reuse the exam-scoped syllabus specification saved on the exam record.
  // Subsequent signups can reconcile from this cache without another model call.
  const cachedSpecResult = AIExamIntelligenceOutputSchema.safeParse(
    (examRow?.metadata as any)?.curriculum_spec_cache
  )
  const cachedSpecIsComprehensive = cachedSpecResult.success &&
    isCurriculumSpecComprehensive(examName, cachedSpecResult.data)
  const generatedSpec = specOverride || (
    cachedSpecIsComprehensive
      ? cachedSpecResult.data
      : await generateAIExamIntelligence(examName, countryHint, categoryHint)
  )
  if (!generatedSpec) {
    const subjects = existingSubjects || []
    const topicCount = subjects.reduce((n: number, s: any) => n + (s.exam_topics || []).length, 0)
    const subtopicCount = subjects.reduce((n: number, s: any) => n + (s.exam_topics || []).reduce((m: number, t: any) => m + (t.exam_subtopics || []).length, 0), 0)
    console.error(`[Curriculum Intelligence] AI did not return a complete valid syllabus for ${examName}; refusing to write fallback filler.`)
    return { subjectCount: subjects.length, topicCount, subtopicCount, subjects, curriculumStatus: 'needs_enrichment', verificationStatus: 'needs_review', coveragePercentage: 0, evidenceScope: 'AI syllabus generation incomplete; official curriculum verification required', authorityName: null }
  }
  const aiSpec = generatedSpec

  // Cache before reconciliation so a failed DB write can be retried without
  // paying to synthesize the same syllabus again.
  if (!cachedSpecIsComprehensive || specOverride) {
    const { error: cacheError } = await supabase
      .from('exams')
      .update({
        metadata: {
          ...(examRow?.metadata || {}),
          curriculum_spec_cache: aiSpec,
          curriculum_spec_cached_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', examId)
    if (cacheError) {
      console.warn('[Curriculum Intelligence] Could not cache generated syllabus:', cacheError.message)
    }
  }

  const isVerifiedTemplate = aiSpec.confidence.overall > 0.98

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
  const sourceReference = `${examName} Syllabus Specification`
  const evidencePayload = {
    exam_id: examId,
    source_url: evalResult.sourceUrl || null,
    source_reference: sourceReference,
    source_type: 'other',
    publisher_authority: evalResult.authorityName || null,
    verification_status: 'pending',
    extracted_data: {
      coverage_percentage: evalResult.coveragePercentage,
      matched_subjects: comparisonReport.matchedSubjects,
      total_expected_subjects: comparisonReport.totalExpectedSubjects,
      matched_topics: comparisonReport.matchedTopics,
      total_expected_topics: comparisonReport.totalExpectedTopics,
      evidence_scope: evalResult.evidenceScope,
      reconciled_at: new Date().toISOString(),
      generated_by: 'ai_exam_intelligence',
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

  // 8. Persist the exam's curriculum status using the production DB's allowed values.
  // Internal evaluation statuses (AI_inferred / partially_verified) are not accepted
  // by the exams.verification_status CHECK constraint.
  const persistedVerificationStatus =
    evalResult.verificationStatus === 'verified'
      ? 'verified'
      : evalResult.verificationStatus === 'needs_review'
        ? 'needs_review'
        : 'pending_review'

  const { error: examStatusError } = await supabase
    .from('exams')
    .update({
      verification_status: persistedVerificationStatus,
      syllabus_info: {
        ...(examRow?.syllabus_info || {}),
        source: 'ai_inferred',
        coverage_percentage: evalResult.coveragePercentage,
        evidence_scope: evalResult.evidenceScope,
        authority: evalResult.authorityName,
      },
      metadata: {
        ...(examRow?.metadata || {}),
        curriculum_status: hierarchyTargetsMet ? 'ready' : 'needs_enrichment',
        curriculum_validation_version: 3,
        curriculum_validation_passed: hierarchyTargetsMet,
        curriculum_validation_checked_at: new Date().toISOString(),
        curriculum_spec_cache: aiSpec,
        curriculum_spec_cached_at: (examRow?.metadata as any)?.curriculum_spec_cached_at || new Date().toISOString(),
        rules_status: (examRow?.metadata || {}).rules_status || 'needs_review',
        verification_status: evalResult.verificationStatus,
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
    verificationStatus: evalResult.verificationStatus,
    coveragePercentage: evalResult.coveragePercentage,
    evidenceScope: evalResult.evidenceScope,
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
  marking_scheme: any
  question_types: any[]
  duration_minutes: number | null
  question_count: number | null
}> {
  const supabase = supabaseClient || getSupabaseAdmin()

  const [{ data: examRow }, { data: versionRows }, { data: evidenceRows }] = await Promise.all([
    supabase.from('exams').select('id, name, question_count, time_limit_mins, marking_scheme, question_types, metadata').eq('id', examId).single(),
    supabase.from('exam_versions').select('*').eq('exam_id', examId),
    supabase.from('exam_evidence').select('*').eq('exam_id', examId),
  ])

  const fallbackSpec = buildFallbackCurriculum(examName, countryHint, categoryHint)

  // Detect and validate exam rules without inventing fake numbers
  const rulesValidation = detectAndValidateExamRules(
    examRow,
    versionRows || [],
    evidenceRows || [],
    fallbackSpec
  )

  const currentYear = new Date().getFullYear()
  const existingCurrentVersion = (versionRows || []).find((v: any) => v.is_current)

  // Save rules to `exams` row
  try {
    await supabase
      .from('exams')
      .update({
        marking_scheme: rulesValidation.marking_scheme,
        question_types: rulesValidation.question_types,
        time_limit_mins: rulesValidation.duration_minutes,
        question_count: rulesValidation.question_count,
        metadata: {
          ...(examRow?.metadata || {}),
          rules_conflicts: rulesValidation.conflictDetails,
          rules_status: rulesValidation.rulesStatus,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', examId)
  } catch (upErr) {
    console.warn('[Exam Rules Process B] Update exams note:', upErr)
  }

  // Preserve historical versions. The schema requires a source_url, so do not
  // fabricate a URL or create a version row until a valid official source exists.
  if (!existingCurrentVersion) {
    const officialEvidence = (evidenceRows || []).find((e: any) =>
      ['official_syllabus', 'official_bulletin'].includes(e.source_type) &&
      e.verification_status === 'valid' &&
      typeof e.source_url === 'string' &&
      (e.source_url.startsWith('https://') || e.source_url.startsWith('http://'))
    )
    if (officialEvidence?.source_url) {
      const patternSummary = `${examName} | ${rulesValidation.duration_minutes || 'N/A'} mins | ${rulesValidation.question_count || 'N/A'} questions | Marking: +${rulesValidation.marking_scheme?.positive_mark || 1}, ${rulesValidation.marking_scheme?.has_negative_marking ? '-' + (rulesValidation.marking_scheme?.negative_mark || 0.25) : 'no penalty'}`
      const { error: versionInsertError } = await supabase.from('exam_versions').insert({
        exam_id: examId,
        version_year: currentYear,
        is_current: true,
        source_url: officialEvidence.source_url,
        pattern_summary: patternSummary,
        verified_at: new Date().toISOString(),
        verification_status: 'verified',
      })
      if (versionInsertError) {
        console.warn('[Exam Rules Process B] exam_versions insert note:', versionInsertError)
      }
    } else {
      console.info('[Exam Rules Process B] No valid official source URL; skipping exam_versions row until evidence is available.')
    }
  }

  return {
    rulesStatus: rulesValidation.rulesStatus,
    marking_scheme: rulesValidation.marking_scheme,
    question_types: rulesValidation.question_types,
    duration_minutes: rulesValidation.duration_minutes,
    question_count: rulesValidation.question_count,
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
        }
      }
    }

    if (!subjectId) continue

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
          }
        }
      }

      if (!topicId) continue

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
