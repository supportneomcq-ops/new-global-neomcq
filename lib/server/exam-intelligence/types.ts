import { z } from 'zod'

export const EntityTypeSchema = z.enum(['EXAM', 'SUBJECT', 'TOPIC'])
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
