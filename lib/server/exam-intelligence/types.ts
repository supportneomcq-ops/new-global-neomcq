import { z } from 'zod'

export const EntityTypeSchema = z.enum(['EXAM', 'SUBJECT', 'TOPIC', 'SUBTOPIC'])
export type EntityType = z.infer<typeof EntityTypeSchema>

export const IntelligenceDecisionSchema = z.enum([
  'EXACT_MATCH',
  'NORMALIZED_MATCH',
  'ALIAS_MATCH',
  'SEMANTIC_MATCH',
  'VALID_NEW',
  'INVALID',
  'NEEDS_REVIEW',
])
export type IntelligenceDecision = z.infer<typeof IntelligenceDecisionSchema>

export const ExamIntelligenceResultSchema = z.object({
  entity_type: EntityTypeSchema,
  decision: IntelligenceDecisionSchema,
  canonical_id: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  exam_id: z.string().nullable(),
  subject_id: z.string().nullable(),
  topic_id: z.string().nullable(),
  subtopic_id: z.string().nullable().optional(),
})
export type ExamIntelligenceResult = z.infer<typeof ExamIntelligenceResultSchema>

export interface ResolveExamOptions {
  examInput: string
}

export interface ResolveSubjectOptions {
  examInput: string
  subjectInput: string
}

export interface ResolveTopicOptions {
  examInput: string
  subjectInput: string
  topicInput: string
}

export interface ResolveSubtopicOptions {
  examInput: string
  subjectInput: string
  topicInput: string
  subtopicInput: string
}

// ============================================================================
// STRUCTURED EXAM INTELLIGENCE & CURRICULUM PROFILE SPECIFICATION
// ============================================================================

export const DifficultyDistributionSchema = z.object({
  easy: z.number().default(20),
  medium: z.number().default(60),
  hard: z.number().default(20),
})
export type DifficultyDistribution = z.infer<typeof DifficultyDistributionSchema>

export const ExamQuestionConfigSchema = z.object({
  default_question_count: z.number().default(100),
  option_count: z.number().default(4),
  answer_type: z.enum(['single', 'multiple']).default('single'),
  single_correct: z.boolean().default(true),
  multiple_correct: z.boolean().default(false),
  has_negative_marking: z.boolean().default(false),
  positive_mark: z.number().default(1),
  negative_mark: z.number().default(0),
  total_marks: z.number().nullable().optional(),
  duration_minutes: z.number().nullable().optional(),
  time_per_question_seconds: z.number().nullable().optional(),
  has_image_questions: z.boolean().default(false),
  has_video_questions: z.boolean().default(false),
  has_audio_questions: z.boolean().default(false),
  has_case_based_questions: z.boolean().default(false),
  has_clinical_vignettes: z.boolean().default(false),
  has_calculation_questions: z.boolean().default(false),
  has_matching_questions: z.boolean().default(false),
  has_true_false_questions: z.boolean().default(false),
  question_types: z.array(z.string()).default(['standard_mcq']),
})
export type ExamQuestionConfig = z.infer<typeof ExamQuestionConfigSchema>

export const AISubtopicSchema = z.object({
  name: z.string(),
  description: z.string().optional().default(''),
  order: z.number().optional().default(1),
})
export type AISubtopic = z.infer<typeof AISubtopicSchema>

export const AITopicSchema = z.object({
  name: z.string(),
  description: z.string().optional().default(''),
  order: z.number().optional().default(1),
  subtopics: z.array(AISubtopicSchema).optional().default([]),
})
export type AITopic = z.infer<typeof AITopicSchema>

export const AISubjectSchema = z.object({
  name: z.string(),
  code: z.string().nullable().optional(),
  description: z.string().optional().default(''),
  weightage: z.number().nullable().optional(),
  order: z.number().optional().default(1),
  topics: z.array(AITopicSchema).min(1),
})
export type AISubject = z.infer<typeof AISubjectSchema>

export const ContentGenerationRulesSchema = z.object({
  mcq: z.record(z.any()).default({}),
  quiz: z.record(z.any()).default({}),
  flashcard: z.record(z.any()).default({}),
  ai_tutor: z.record(z.any()).default({}),
  fill_in_blank: z.record(z.any()).default({}),
  notes: z.record(z.any()).default({}),
  flowchart: z.record(z.any()).default({}),
})
export type ContentGenerationRules = z.infer<typeof ContentGenerationRulesSchema>

export const ConfidenceBreakdownSchema = z.object({
  overall: z.number().min(0).max(1).default(0.9),
  curriculum: z.number().min(0).max(1).default(0.9),
  exam_rules: z.number().min(0).max(1).default(0.9),
})
export type ConfidenceBreakdown = z.infer<typeof ConfidenceBreakdownSchema>

export const AIExamIntelligenceOutputSchema = z.object({
  exam: z.object({
    name: z.string(),
    official_name: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
    country: z.string().default('Global'),
    region: z.string().nullable().optional(),
    category: z.string().default('general-academics'),
    type: z.string().default('Licensing / Certification'),
    specialty_or_domain: z.string().nullable().optional(),
    difficulty_level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Adaptive']).default('Intermediate'),
    difficulty_distribution: DifficultyDistributionSchema.default({ easy: 20, medium: 60, hard: 20 }),
    question_config: ExamQuestionConfigSchema.default({
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
    }),
  }),
  subjects: z.array(AISubjectSchema).min(1),
  content_generation_rules: ContentGenerationRulesSchema.default({}),
  confidence: ConfidenceBreakdownSchema.default({ overall: 0.9, curriculum: 0.9, exam_rules: 0.9 }),
})
export type AIExamIntelligenceOutput = z.infer<typeof AIExamIntelligenceOutputSchema>

export type CurriculumStatus = 'pending' | 'generating' | 'ready' | 'partial' | 'needs_enrichment' | 'failed'

export type VerificationStatus = 'verified' | 'partially_verified' | 'AI_inferred' | 'needs_review'
export type RulesStatus = 'ready' | 'partial' | 'needs_review'

export interface ExamIntelligenceProfile {
  exam_id: string
  exam_code: string | null
  exam_name: string
  official_name: string | null
  country: string
  region: string | null
  exam_category: string
  exam_type: string
  specialty_or_domain: string | null
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Adaptive'
  difficulty_distribution: DifficultyDistribution
  question_config: ExamQuestionConfig
  content_language: string
  syllabus_source: 'official_syllabus' | 'verified_standard' | 'ai_inferred' | 'user_custom'
  syllabus_confidence: number
  ai_generated: boolean
  ai_generation_version: string
  curriculum_status: CurriculumStatus
  content_generation_rules: ContentGenerationRules
  confidence: ConfidenceBreakdown
  provenance: {
    rules_verified: boolean
    rules_inferred: boolean
    source: string
    last_updated_at: string
  }
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface ExamResolutionResponse {
  success: boolean
  reused: boolean
  exam: {
    id: string
    name: string
    slug: string
    short_name?: string
    level?: string | null
    description: string
    difficulty: string
    question_count: number | null
    time_limit_mins: number | null
    country: string
    flag: string
    curriculum_status: CurriculumStatus
    rules_status?: RulesStatus
    verification_status?: VerificationStatus
    coverage_percentage?: number
    evidence_scope?: string
    authority_name?: string | null
    subjectCount?: number
    topicCount?: number
    subtopicCount?: number
    marking_scheme?: any
    question_types?: any[]
    profile?: ExamIntelligenceProfile
    exam_subjects: Array<{
      id: string
      name: string
      slug: string
      description: string | null
      weight_percentage?: number | null
      display_order?: number | null
      order_index?: number | null
      exam_topics: Array<{
        id: string
        name: string
        slug: string
        description?: string | null
        display_order?: number | null
        order_index?: number | null
        exam_subtopics?: Array<{
          id: string
          name: string
          slug: string
          display_order?: number | null
        }>
      }>
    }>
  }
  message: string
}

