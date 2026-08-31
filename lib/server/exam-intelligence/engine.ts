import { GoogleGenAI } from '@google/genai'
import { getSupabaseAdmin } from '@/lib/supabase'
import { normalizeInput } from '@/lib/knowledge/normalizer'
import { classifyUserInput } from '@/lib/knowledge/classifier'
import {
  AIExamIntelligenceOutputSchema,
  AIExamIntelligenceOutput,
  ExamIntelligenceProfile,
  ExamResolutionResponse,
  CurriculumStatus,
} from './types'

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
  fmge: {
    name: 'FMGE',
    official_name: 'Foreign Medical Graduate Examination (Screening Test)',
    code: 'FMGE',
    country: 'India',
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
      duration_minutes: 300,
      has_clinical_vignettes: true,
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

// ============================================================================
// AI STRUCTURED EXAM INTELLIGENCE GENERATOR
// ============================================================================

export async function generateAIExamIntelligence(
  examQuery: string,
  countryHint?: string,
  categoryHint?: string
): Promise<AIExamIntelligenceOutput | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Exam Intelligence] No GEMINI_API_KEY configured for AI synthesis.')
    return null
  }

  const cleanName = examQuery.trim()

  const systemInstruction = `You are the Principal Psychometrician and Global Curriculum Architect for NeoMCQ.
Your mission is to construct a rigorous, comprehensive Exam Intelligence Profile and Curriculum Specification for any examination worldwide.
You MUST output strictly valid JSON conforming directly to the required schema. Never wrap in markdown text outside of the JSON.`

  const prompt = `Construct the official Exam Intelligence Profile and complete Curriculum Specification for the examination: "${cleanName}".
${countryHint ? `Country / Region Context: ${countryHint}` : ''}
${categoryHint ? `Discipline / Category Context: ${categoryHint}` : ''}

CRITICAL ARCHITECTURAL DIRECTIVES:
1. EXAM LEVEL:
   - Identify official full name, standard code/acronym, jurisdiction, and credential level.
   - Establish realistic question configuration (option count, negative marking, question types, duration).
   - Classify question types: standard_mcq, clinical_vignette, case_based, calculation, image_based, scenario_architecture.
2. CURRICULUM HIERARCHY:
   - Generate between 4 and 10 canonical SUBJECTS based on the official syllabus.
   - Under each subject, generate 2 to 5 core TOPICS.
   - Under each topic, provide 2 to 4 high-yield SUBTOPICS.
   - Ensure subjects, topics, and subtopics are genuinely, domain-accurately relevant to "${cleanName}".
3. GENERATION RULES:
   - Configure distinct content rules for MCQs, Quizzes, Flashcards, AI Tutor, and Notes.

Output schema:
{
  "exam": {
    "name": "${cleanName}",
    "official_name": "Official Full Name of Examination",
    "code": "EXAM-CODE",
    "country": "${countryHint || 'Global'}",
    "region": "Region / Jurisdiction",
    "category": "${categoryHint || 'general-academics'}",
    "type": "Licensing / Professional Certification / Academic Entrance",
    "specialty_or_domain": "Core domain",
    "difficulty_level": "Intermediate" | "Advanced" | "Expert" | "Beginner" | "Adaptive",
    "difficulty_distribution": { "easy": 20, "medium": 60, "hard": 20 },
    "question_config": {
      "default_question_count": 100,
      "option_count": 4,
      "answer_type": "single",
      "single_correct": true,
      "multiple_correct": false,
      "has_negative_marking": false,
      "positive_mark": 1,
      "negative_mark": 0,
      "duration_minutes": 120,
      "has_image_questions": false,
      "has_video_questions": false,
      "has_case_based_questions": false,
      "has_clinical_vignettes": false,
      "has_calculation_questions": false,
      "has_matching_questions": false,
      "has_true_false_questions": false,
      "question_types": ["standard_mcq"]
    }
  },
  "subjects": [
    {
      "name": "Subject Name",
      "code": "SUBJ-01",
      "description": "Comprehensive syllabus description",
      "weightage": 15,
      "order": 1,
      "topics": [
        {
          "name": "Topic Name",
          "description": "High yield topic focus",
          "order": 1,
          "subtopics": [
            { "name": "Subtopic 1", "description": "Core concept", "order": 1 },
            { "name": "Subtopic 2", "description": "Clinical/practical application", "order": 2 }
          ]
        }
      ]
    }
  ],
  "content_generation_rules": {
    "mcq": { "stem_style": "clinical_or_conceptual", "distractor_plausibility": "high" },
    "quiz": { "pre_test_slots": 20, "post_test_slots": 20 },
    "flashcard": { "target_count_per_topic": 40 },
    "ai_tutor": { "socratic_mode": true },
    "notes": { "high_yield_summary": true }
  },
  "confidence": {
    "overall": 0.95,
    "curriculum": 0.95,
    "exam_rules": 0.9
  }
}`

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    // Use standard 15-second abort mechanism to prevent hanging
    const abortCtrl = new AbortController()
    const timer = setTimeout(() => abortCtrl.abort(), 18000)

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      })
      clearTimeout(timer)

      const text = response.text || '{}'
      const parsed = JSON.parse(text)
      const validated = AIExamIntelligenceOutputSchema.safeParse(parsed)

      if (validated.success) {
        return validated.data
      } else {
        console.warn('[Exam Intelligence] Validation schema issues:', validated.error.format())
        // Attempt partial recovery if subjects array exists
        if (parsed.subjects && Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
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
                : [{ name: 'Foundations & Clinical Practice', description: '', order: 1, subtopics: [] }],
            })),
            content_generation_rules: parsed.content_generation_rules || {},
            confidence: parsed.confidence || { overall: 0.85, curriculum: 0.85, exam_rules: 0.8 },
          }
        }
      }
    } catch (apiErr: any) {
      clearTimeout(timer)
      console.warn('[Exam Intelligence] Gemini API call failed or timed out:', apiErr.message)
    }
  } catch (err: any) {
    console.warn('[Exam Intelligence] AI synthesis execution error:', err.message)
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
              { name: 'Core Terminology & Diagnostic Frameworks', order: 1 },
              { name: 'High-Yield Principles & Definitions', order: 2 },
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
              { name: 'Complex Problem Solving & Decision Trees', order: 1 },
              { name: 'High-Frequency Exam Pitfalls', order: 2 },
            ],
          },
        ],
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
  userId?: string | null
}): Promise<ExamResolutionResponse> {
  const { examQuery, country, category, userId } = options
  const supabase = getSupabaseAdmin()

  if (!examQuery || typeof examQuery !== 'string' || !examQuery.trim()) {
    throw new Error('Exam search term or name is required.')
  }

  const rawInput = examQuery.trim()

  // 1. Guard against non-exam inputs (e.g. pure country names)
  const classification = classifyUserInput(rawInput)
  if (classification.type === 'COUNTRY') {
    throw new Error(
      `"${rawInput}" is a country or geographical region, not an examination. Please enter an exam name (e.g. USMLE, NEET PG, FMGE, CFA, NCLEX, AWS).`
    )
  }

  const norm = normalizeInput(rawInput)
  const cleanQuery = norm.canonical.toLowerCase()
  const querySlug = norm.slug.toLowerCase()

  console.log(`[Exam Intelligence] Resolving exam: "${rawInput}" (slug: "${querySlug}")`)

  // 2. Search Database for existing canonical exam
  const { data: existingExams } = await supabase
    .from('exams')
    .select(`
      id,
      name,
      slug,
      description,
      difficulty,
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
        order_index,
        exam_topics (
          id,
          name,
          slug,
          description,
          order_index,
          exam_subtopics (
            id,
            name,
            slug,
            display_order
          )
        )
      )
    `)
    .neq('status', 'archived')
    .or(`slug.eq.${querySlug},name.ilike.%${cleanQuery}%`)
    .limit(10)

  let matchedExam: any = null

  if (existingExams && existingExams.length > 0) {
    matchedExam =
      existingExams.find(
        (e: any) =>
          e.slug === querySlug ||
          e.name.toLowerCase() === cleanQuery ||
          e.name.toLowerCase().includes(cleanQuery)
      ) || existingExams[0]
  }

  // 3. Search aliases if not found
  if (!matchedExam) {
    try {
      const { data: aliasMatch } = await supabase
        .from('exam_aliases')
        .select(`
          exam_id,
          exams (
            id,
            name,
            slug,
            description,
            difficulty,
            question_count,
            time_limit_mins,
            status,
            marking_scheme,
            question_types,
            metadata,
            syllabus_info,
            countries (
              id,
              name,
              iso2,
              flag_emoji
            ),
            exam_subjects (
              id,
              name,
              slug,
              description,
              weight_percentage,
              order_index,
              exam_topics (
                id,
                name,
                slug,
                description,
                order_index,
                exam_subtopics (
                  id,
                  name,
                  slug,
                  display_order
                )
              )
            )
          )
        `)
        .ilike('alias', cleanQuery)
        .limit(1)
        .maybeSingle()

      if (aliasMatch && aliasMatch.exams) {
        matchedExam = aliasMatch.exams
      }
    } catch (aliasErr) {
      console.warn('[Exam Intelligence] Alias lookup non-blocking note:', aliasErr)
    }
  }

  // --------------------------------------------------------------------------
  // EXISTING EXAM PATH: Reconcile or reuse existing structure
  // --------------------------------------------------------------------------
  if (matchedExam) {
    console.log(`[Exam Intelligence] Reusing existing canonical exam: "${matchedExam.name}" (${matchedExam.id})`)

    let subjects = matchedExam.exam_subjects || []
    let totalTopics = subjects.reduce((acc: number, s: any) => acc + (s.exam_topics?.length || 0), 0)

    let curriculumStatus: CurriculumStatus =
      subjects.length > 0 && totalTopics > 0 ? 'ready' : 'generating'

    // If existing exam is missing subjects/topics, synthesize or enrich curriculum
    if (subjects.length === 0 || totalTopics === 0) {
      console.log(`[Exam Intelligence] Existing exam "${matchedExam.name}" has 0 subjects; synthesizing curriculum.`)
      const aiSpec =
        (await generateAIExamIntelligence(matchedExam.name, matchedExam.countries?.name, category)) ||
        buildFallbackCurriculum(matchedExam.name, matchedExam.countries?.name, category)

      await persistCurriculumHierarchy(matchedExam.id, aiSpec, supabase)

      // Refresh subjects
      const { data: refreshedSubjects } = await supabase
        .from('exam_subjects')
        .select(`
          id,
          name,
          slug,
          description,
          weight_percentage,
          order_index,
          exam_topics (
            id,
            name,
            slug,
            description,
            order_index,
            exam_subtopics (
              id,
              name,
              slug,
              display_order
            )
          )
        `)
        .eq('exam_id', matchedExam.id)
        .order('order_index', { ascending: true })

      subjects = refreshedSubjects || []
      curriculumStatus = subjects.length > 0 ? 'ready' : 'partial'
    }

    // Link user_exams if userId provided
    if (userId) {
      try {
        await supabase.from('user_exams').upsert({
          user_id: userId,
          exam_id: matchedExam.id,
          is_primary: true,
          status: 'active',
          last_accessed_at: new Date().toISOString(),
        })
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
        description: matchedExam.description || `Preparation curriculum for ${matchedExam.name}`,
        difficulty: matchedExam.difficulty || 'Intermediate',
        question_count: matchedExam.question_count || 100,
        time_limit_mins: matchedExam.time_limit_mins || 120,
        country: matchedExam.countries?.name || 'Global',
        flag: matchedExam.countries?.flag_emoji || '🌐',
        curriculum_status: curriculumStatus,
        exam_subjects: subjects,
      },
      message: `Resolved canonical exam '${matchedExam.name}'.`,
    }
  }

  // --------------------------------------------------------------------------
  // NEW / CUSTOM EXAM PATH: Synthesize AI Exam Intelligence & Build Curriculum
  // --------------------------------------------------------------------------
  console.log(`[Exam Intelligence] Creating new canonical intelligence profile for: "${rawInput}"`)

  // 1. Resolve country & category IDs
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

  // 2. Generate Structured Exam Intelligence & Curriculum
  const aiSpec =
    (await generateAIExamIntelligence(rawInput, country, category)) ||
    buildFallbackCurriculum(rawInput, country, category)

  const isVerifiedTemplate = aiSpec.confidence.overall > 0.98

  // 3. Construct Exam Intelligence Profile
  const intelligenceProfile: ExamIntelligenceProfile = {
    exam_id: '', // set after insert
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
    ai_generation_version: '2.0.0-canonical',
    curriculum_status: 'ready',
    content_generation_rules: aiSpec.content_generation_rules,
    confidence: aiSpec.confidence,
    provenance: {
      rules_verified: isVerifiedTemplate,
      rules_inferred: !isVerifiedTemplate,
      source: isVerifiedTemplate ? 'Verified Global Standard Template' : 'AI Curriculum Engine v2',
      last_updated_at: new Date().toISOString(),
    },
    metadata: {
      generated_from_query: rawInput,
      timestamp: new Date().toISOString(),
    },
  }

  // 4. Insert new Exam into `exams`
  const { data: newExam, error: insertErr } = await supabase
    .from('exams')
    .insert({
      name: rawInput,
      slug: querySlug,
      description: `Official preparation syllabus and curriculum for ${rawInput}.`,
      difficulty: intelligenceProfile.difficulty_level,
      question_count: intelligenceProfile.question_config.default_question_count || 100,
      time_limit_mins: intelligenceProfile.question_config.duration_minutes || 120,
      country_id: countryId,
      category_id: categoryId,
      status: 'active',
      is_featured: false,
      created_by_ai: !isVerifiedTemplate,
      verification_status: isVerifiedTemplate ? 'verified' : 'needs_review',
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
        content_generation_rules: intelligenceProfile.content_generation_rules,
      },
      syllabus_info: {
        source: intelligenceProfile.syllabus_source,
        confidence: intelligenceProfile.syllabus_confidence,
        provenance: intelligenceProfile.provenance,
      },
    })
    .select('id, name, slug, description, difficulty, question_count, time_limit_mins')
    .single()

  if (insertErr || !newExam) {
    console.error('[Exam Intelligence] Failed to insert new exam:', insertErr)
    throw new Error(`Database error saving exam intelligence: ${insertErr?.message || 'Unknown'}`)
  }

  intelligenceProfile.exam_id = newExam.id

  // 5. Register Aliases in `exam_aliases`
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

  // 6. Persist Subjects, Topics, and Subtopics with Deduplication
  await persistCurriculumHierarchy(newExam.id, aiSpec, supabase)

  // 7. Retrieve Complete Curriculum Hierarchy
  const { data: createdSubjects } = await supabase
    .from('exam_subjects')
    .select(`
      id,
      name,
      slug,
      description,
      weight_percentage,
      order_index,
      exam_topics (
        id,
        name,
        slug,
        description,
        order_index,
        exam_subtopics (
          id,
          name,
          slug,
          display_order
        )
      )
    `)
    .eq('exam_id', newExam.id)
    .order('order_index', { ascending: true })

  // 8. Link to authenticated user if provided
  if (userId) {
    try {
      await supabase.from('user_exams').upsert({
        user_id: userId,
        exam_id: newExam.id,
        is_primary: true,
        status: 'active',
        last_accessed_at: new Date().toISOString(),
      })
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
      description: newExam.description,
      difficulty: newExam.difficulty,
      question_count: newExam.question_count,
      time_limit_mins: newExam.time_limit_mins,
      country: intelligenceProfile.country,
      flag: country === 'India' ? '🇮🇳' : country === 'United States' ? '🇺🇸' : '🌐',
      curriculum_status: 'ready',
      profile: intelligenceProfile,
      exam_subjects: createdSubjects || [],
    },
    message: `Initialized canonical exam intelligence and curriculum for '${newExam.name}'.`,
  }
}

// ============================================================================
// DEDUPLICATED CURRICULUM HIERARCHY PERSISTENCE
// ============================================================================

async function persistCurriculumHierarchy(
  examId: string,
  spec: AIExamIntelligenceOutput,
  supabase: any
) {
  if (!spec.subjects || spec.subjects.length === 0) return

  // Fetch existing subjects for this exam to prevent duplicate rows
  const { data: existingSubjects } = await supabase
    .from('exam_subjects')
    .select('id, name, slug, exam_topics(id, name, slug, exam_subtopics(id, name, slug))')
    .eq('exam_id', examId)

  const subjectMap = new Map<string, any>()
  if (existingSubjects) {
    for (const sub of existingSubjects) {
      const normSub = normalizeInput(sub.name).canonical.toLowerCase()
      subjectMap.set(normSub, sub)
    }
  }

  for (let sIdx = 0; sIdx < spec.subjects.length; sIdx++) {
    const sItem = spec.subjects[sIdx]
    const normSubName = normalizeInput(sItem.name).canonical.toLowerCase()
    const subSlug = normalizeInput(sItem.name).slug.toLowerCase()

    let subjectId: string | null = null
    let existingSub = subjectMap.get(normSubName)

    if (existingSub) {
      subjectId = existingSub.id
    } else {
      const { data: insertedSub, error: subErr } = await supabase
        .from('exam_subjects')
        .insert({
          exam_id: examId,
          name: sItem.name,
          slug: subSlug,
          description: sItem.description || `Syllabus focus for ${sItem.name}`,
          weight_percentage: sItem.weightage || 10,
          order_index: sItem.order || sIdx + 1,
        })
        .select('id')
        .single()

      if (insertedSub) {
        subjectId = insertedSub.id
      } else {
        console.warn(`[Exam Intelligence] Subject insert error:`, subErr)
      }
    }

    if (!subjectId) continue

    // Process Topics under Subject
    const existingTopics = existingSub?.exam_topics || []
    const topicMap = new Map<string, any>()
    for (const t of existingTopics) {
      const normTop = normalizeInput(t.name).canonical.toLowerCase()
      topicMap.set(normTop, t)
    }

    for (let tIdx = 0; tIdx < sItem.topics.length; tIdx++) {
      const tItem = sItem.topics[tIdx]
      const normTopName = normalizeInput(tItem.name).canonical.toLowerCase()
      const topSlug = normalizeInput(tItem.name).slug.toLowerCase()

      let topicId: string | null = null
      let existingTop = topicMap.get(normTopName)

      if (existingTop) {
        topicId = existingTop.id
      } else {
        const { data: insertedTop, error: topErr } = await supabase
          .from('exam_topics')
          .insert({
            subject_id: subjectId,
            name: tItem.name,
            slug: topSlug,
            description: tItem.description || `Topic focus for ${tItem.name}`,
            order_index: tItem.order || tIdx + 1,
          })
          .select('id')
          .single()

        if (insertedTop) {
          topicId = insertedTop.id
        } else {
          console.warn(`[Exam Intelligence] Topic insert error:`, topErr)
        }
      }

      if (!topicId) continue

      // Process Subtopics under Topic if provided
      if (tItem.subtopics && tItem.subtopics.length > 0) {
        const existingSubtopics = existingTop?.exam_subtopics || []
        const subtopicMap = new Set<string>()
        for (const st of existingSubtopics) {
          subtopicMap.add(normalizeInput(st.name).canonical.toLowerCase())
        }

        const subtopicInserts = []
        for (let stIdx = 0; stIdx < tItem.subtopics.length; stIdx++) {
          const stItem = tItem.subtopics[stIdx]
          const normStName = normalizeInput(stItem.name).canonical.toLowerCase()
          if (!subtopicMap.has(normStName)) {
            subtopicMap.add(normStName)
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
          try {
            await supabase.from('exam_subtopics').insert(subtopicInserts)
          } catch (stErr) {
            console.warn('[Exam Intelligence] Subtopics batch insert note:', stErr)
          }
        }
      }
    }
  }
}
