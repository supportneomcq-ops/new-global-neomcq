import { normalizeInput, calculateLevenshteinSimilarity } from '../../knowledge/normalizer'
import type {
  AISubject,
  AITopic,
  AISubtopic,
  AIExamIntelligenceOutput,
  CurriculumStatus,
} from './types'

// ============================================================================
// 1. CONTEXT-AWARE ENTITY IDENTITY & ANTI-FALSE-POSITIVE MATCHING
// ============================================================================

const DIFFERENTIATOR_WORDS = new Set([
  'advanced',
  'foundation',
  'foundations',
  'basic',
  'basics',
  'core',
  'intermediate',
  'elementary',
  'introductory',
  'specialized',
  'applied',
  'general',
  'micro',
  'macro',
  'organic',
  'inorganic',
  'physical',
  'pathology',
  'pathophysiology',
  'physiology',
  'pharmacology',
  'anatomy',
  'microbiology',
  'pediatric',
  'pediatrics',
  'adult',
  'geriatric',
  'direct',
  'indirect',
  'internal',
  'external',
  'preclinical',
  'clinical',
  'paraclinical',
  'paper',
  'tier',
  'grade',
  'part',
  'step',
  'level',
  'stage',
  'phase',
])

const EXAM_SPECIAL_QUALIFIERS = new Set([
  'advanced',
  'foundation',
  'foundations',
  'core',
  'intermediate',
  'prelims',
  'preliminary',
  'mains',
  'main',
  'tier',
  'level',
  'step',
  'part',
  'paper',
  'grade',
  'specialist',
  'associate',
  'professional',
  'fellowship',
  'diploma',
  'certificate',
])

interface EntityTokens {
  norm: string
  numerics: Set<string>
  qualifiers: Set<string>
  examQualifiers: Set<string>
  words: string[]
}

function extractEntityTokens(text: string): EntityTokens {
  const norm = (text || '').toLowerCase().trim().replace(/[\s_-]+/g, ' ')
  const numerics = new Set<string>()
  const matches = norm.matchAll(/\b([0-9]+|[ivxlcdm]+)\b/g)
  for (const m of matches) {
    numerics.add(m[1].toLowerCase())
  }
  const words = norm.split(/[^a-z0-9\p{L}]+/u).filter(Boolean)
  const qualifiers = new Set<string>()
  const examQualifiers = new Set<string>()

  for (const w of words) {
    if (DIFFERENTIATOR_WORDS.has(w)) qualifiers.add(w)
    if (EXAM_SPECIAL_QUALIFIERS.has(w)) examQualifiers.add(w)
  }

  return { norm, numerics, qualifiers, examQualifiers, words }
}

/**
 * Evaluates whether two entity names (exams, subjects, topics, or subtopics)
 * are contextually identical, strictly preventing false-positive merges.
 */
export function areEntitiesContextuallyIdentical(
  a: string,
  b: string,
  options?: {
    entityType?: 'EXAM' | 'SUBJECT' | 'TOPIC' | 'SUBTOPIC'
    parentContext?: string
    isAliasMatch?: boolean
  }
): boolean {
  if (!a || !b) return false
  if (options?.isAliasMatch) return true

  const tA = extractEntityTokens(a)
  const tB = extractEntityTokens(b)

  // 1. Exact normalized match
  if (tA.norm === tB.norm) return true

  // 2. Numeric / Ordinal / Step / Level Discrepancy -> NEVER MERGE!
  if (tA.numerics.size > 0 || tB.numerics.size > 0) {
    if (tA.numerics.size === 0 || tB.numerics.size === 0) return false

    let hasMatchingNumeric = false
    for (const num of tA.numerics) {
      if (tB.numerics.has(num)) hasMatchingNumeric = true
    }

    let hasDisjointNumeric = false
    for (const num of tA.numerics) {
      if (!tB.numerics.has(num)) hasDisjointNumeric = true
    }
    for (const num of tB.numerics) {
      if (!tA.numerics.has(num)) hasDisjointNumeric = true
    }

    if (hasDisjointNumeric && !hasMatchingNumeric) return false
    if (hasDisjointNumeric && tA.numerics.size === tB.numerics.size) return false
  }

  // 3. Exam-level Qualifier differences (e.g. Exam X vs Exam X Advanced, or Associate vs Professional)
  if (options?.entityType === 'EXAM') {
    if (tA.examQualifiers.size !== tB.examQualifiers.size) {
      let overlap = 0
      for (const eq of tA.examQualifiers) {
        if (tB.examQualifiers.has(eq)) overlap++
      }
      if (overlap !== Math.max(tA.examQualifiers.size, tB.examQualifiers.size)) {
        return false
      }
    }
  }

  // 4. Incompatible domain qualifiers (e.g. Physiology vs Pathophysiology, Organic vs Inorganic)
  for (const qA of tA.qualifiers) {
    for (const qB of tB.qualifiers) {
      if (qA !== qB) {
        if (
          (qA === 'physiology' && qB === 'pathophysiology') ||
          (qA === 'pathophysiology' && qB === 'physiology') ||
          (qA === 'advanced' && qB === 'foundation') ||
          (qA === 'foundation' && qB === 'advanced') ||
          (qA === 'micro' && qB === 'macro') ||
          (qA === 'macro' && qB === 'micro') ||
          (qA === 'organic' && qB === 'inorganic') ||
          (qA === 'inorganic' && qB === 'organic') ||
          (qA === 'direct' && qB === 'indirect') ||
          (qA === 'indirect' && qB === 'direct') ||
          (qA === 'general' && qB === 'pediatric') ||
          (qA === 'pediatric' && qB === 'general') ||
          (qA === 'adult' && qB === 'pediatric') ||
          (qA === 'pediatric' && qB === 'adult') ||
          (qA === 'preclinical' && qB === 'clinical') ||
          (qA === 'clinical' && qB === 'preclinical')
        ) {
          return false
        }
      }
    }
  }

  // 5. Pathophysiology vs Physiology asymmetry
  if (
    (tA.norm.includes('pathophysiology') && !tB.norm.includes('patho')) ||
    (tB.norm.includes('pathophysiology') && !tA.norm.includes('patho'))
  ) {
    return false
  }

  // 6. Well-known canonical prefixes/synonyms (e.g. "Human Anatomy" === "Anatomy", "Medical Biochemistry" === "Biochemistry")
  const normA = normalizeInput(a).canonical.toLowerCase()
  const normB = normalizeInput(b).canonical.toLowerCase()
  if (normA === normB) return true

  // 7. Contextual Levenshtein check: similarity >= 90.0% with identical word count
  const sim = calculateLevenshteinSimilarity(tA.norm, tB.norm)
  if (sim >= 90.0) {
    return true
  }

  return false
}

export function findMatchingSubjectInList(name: string, existingSubjects: any[]): any | null {
  if (!existingSubjects || existingSubjects.length === 0) return null

  for (const sub of existingSubjects) {
    if (areEntitiesContextuallyIdentical(name, sub.name, { entityType: 'SUBJECT' })) {
      return sub
    }
  }
  return null
}

export function findMatchingTopicInList(name: string, existingTopics: any[], parentSubjectName?: string): any | null {
  if (!existingTopics || existingTopics.length === 0) return null

  for (const top of existingTopics) {
    if (areEntitiesContextuallyIdentical(name, top.name, { entityType: 'TOPIC', parentContext: parentSubjectName })) {
      return top
    }
  }
  return null
}

export function findMatchingSubtopicInList(name: string, existingSubtopics: any[], parentTopicName?: string): any | null {
  if (!existingSubtopics || existingSubtopics.length === 0) return null

  for (const st of existingSubtopics) {
    if (areEntitiesContextuallyIdentical(name, st.name, { entityType: 'SUBTOPIC', parentContext: parentTopicName })) {
      return st
    }
  }
  return null
}

// ============================================================================
// 2. REUSABLE CURRICULUM COMPARISON LAYER
// ============================================================================

export type EntityMatchStatus = 'matched' | 'missing' | 'duplicate' | 'conflicting' | 'uncertain'

export interface SubtopicComparisonNode {
  name: string
  slug: string
  status: EntityMatchStatus
  matched_id?: string | null
  description?: string | null
}

export interface TopicComparisonNode {
  name: string
  slug: string
  status: EntityMatchStatus
  matched_id?: string | null
  description?: string | null
  subtopics: SubtopicComparisonNode[]
}

export interface SubjectComparisonNode {
  name: string
  slug: string
  status: EntityMatchStatus
  matched_id?: string | null
  weightage?: number | null
  description?: string | null
  topics: TopicComparisonNode[]
}

export interface CurriculumComparisonReport {
  examId: string
  examName: string
  totalExpectedSubjects: number
  matchedSubjects: number
  missingSubjects: number
  totalExpectedTopics: number
  matchedTopics: number
  missingTopics: number
  totalExpectedSubtopics: number
  matchedSubtopics: number
  missingSubtopics: number
  coveragePercentage: number
  hasGaps: boolean
  subjects: SubjectComparisonNode[]
  missingHierarchy: {
    subjects: AISubject[]
    topics: Array<{ subjectId: string; subjectName: string; topic: AITopic }>
    subtopics: Array<{ topicId: string; topicName: string; subtopic: AISubtopic }>
  }
}

/**
 * Compares an expected syllabus specification against a persisted database hierarchy.
 * Identifies exact matches, missing nodes, and calculates coverage percentage.
 */
export function compareCurricula(
  examId: string,
  examName: string,
  expectedSpec: AIExamIntelligenceOutput,
  persistedSubjects: any[]
): CurriculumComparisonReport {
  const expectedSubjects = expectedSpec.subjects || []
  const subjectNodes: SubjectComparisonNode[] = []

  let totalExpectedTopics = 0
  let matchedTopicsCount = 0
  let totalExpectedSubtopics = 0
  let matchedSubtopicsCount = 0

  const missingHierarchy: CurriculumComparisonReport['missingHierarchy'] = {
    subjects: [],
    topics: [],
    subtopics: [],
  }

  for (const expSub of expectedSubjects) {
    const matchedSub = findMatchingSubjectInList(expSub.name, persistedSubjects)
    const subStatus: EntityMatchStatus = matchedSub ? 'matched' : 'missing'

    const topicNodes: TopicComparisonNode[] = []
    const persistedTopics = matchedSub?.exam_topics || []

    if (!matchedSub) {
      missingHierarchy.subjects.push(expSub)
    }

    for (const expTop of expSub.topics || []) {
      totalExpectedTopics++
      const matchedTop = matchedSub ? findMatchingTopicInList(expTop.name, persistedTopics, expSub.name) : null
      const topStatus: EntityMatchStatus = matchedTop ? 'matched' : 'missing'

      if (matchedTop) {
        matchedTopicsCount++
      } else if (matchedSub) {
        missingHierarchy.topics.push({
          subjectId: matchedSub.id,
          subjectName: matchedSub.name,
          topic: expTop,
        })
      }

      const subtopicNodes: SubtopicComparisonNode[] = []
      const persistedSubtopics = matchedTop?.exam_subtopics || []

      for (const expSt of expTop.subtopics || []) {
        totalExpectedSubtopics++
        const matchedSt = matchedTop ? findMatchingSubtopicInList(expSt.name, persistedSubtopics, expTop.name) : null
        const stStatus: EntityMatchStatus = matchedSt ? 'matched' : 'missing'

        if (matchedSt) {
          matchedSubtopicsCount++
        } else if (matchedTop) {
          missingHierarchy.subtopics.push({
            topicId: matchedTop.id,
            topicName: matchedTop.name,
            subtopic: expSt,
          })
        }

        subtopicNodes.push({
          name: expSt.name,
          slug: normalizeInput(expSt.name).slug,
          status: stStatus,
          matched_id: matchedSt?.id || null,
          description: expSt.description || '',
        })
      }

      topicNodes.push({
        name: expTop.name,
        slug: normalizeInput(expTop.name).slug,
        status: topStatus,
        matched_id: matchedTop?.id || null,
        description: expTop.description || '',
        subtopics: subtopicNodes,
      })
    }

    subjectNodes.push({
      name: expSub.name,
      slug: normalizeInput(expSub.name).slug,
      status: subStatus,
      matched_id: matchedSub?.id || null,
      weightage: expSub.weightage || null,
      description: expSub.description || '',
      topics: topicNodes,
    })
  }

  const matchedSubjectsCount = subjectNodes.filter((s) => s.status === 'matched').length
  const missingSubjectsCount = subjectNodes.length - matchedSubjectsCount
  const missingTopicsCount = totalExpectedTopics - matchedTopicsCount
  const missingSubtopicsCount = totalExpectedSubtopics - matchedSubtopicsCount

  // Weighted coverage calculation:
  // Subject weight: 35%, Topic weight: 45%, Subtopic weight: 20%
  const subRate = expectedSubjects.length > 0 ? matchedSubjectsCount / expectedSubjects.length : 1
  const topRate = totalExpectedTopics > 0 ? matchedTopicsCount / totalExpectedTopics : 1
  const stRate = totalExpectedSubtopics > 0 ? matchedSubtopicsCount / totalExpectedSubtopics : 1

  const coverageScore = subRate * 0.35 + topRate * 0.45 + stRate * 0.20
  const coveragePercentage = Math.round(coverageScore * 1000) / 10

  const hasGaps = missingSubjectsCount > 0 || missingTopicsCount > 0 || missingSubtopicsCount > 0

  return {
    examId,
    examName,
    totalExpectedSubjects: expectedSubjects.length,
    matchedSubjects: matchedSubjectsCount,
    missingSubjects: missingSubjectsCount,
    totalExpectedTopics,
    matchedTopics: matchedTopicsCount,
    missingTopics: missingTopicsCount,
    totalExpectedSubtopics,
    matchedSubtopics: matchedSubtopicsCount,
    missingSubtopics: missingSubtopicsCount,
    coveragePercentage,
    hasGaps,
    subjects: subjectNodes,
    missingHierarchy,
  }
}

// ============================================================================
// 3. EVIDENCE-FIRST EVALUATION & STATUS ENGINE
// ============================================================================

export interface EvidenceEvaluationResult {
  curriculumStatus: CurriculumStatus
  verificationStatus: 'verified' | 'partially_verified' | 'AI_inferred' | 'needs_review'
  rulesStatus: 'ready' | 'partial' | 'needs_review'
  hasOfficialEvidence: boolean
  hasSecondaryEvidence: boolean
  hasAiInference: boolean
  evidenceScope: string
  authorityName: string | null
  sourceUrl: string | null
  coveragePercentage: number
}

/**
 * Distinguishes official evidence, secondary verified standards, and AI inference.
 * Never reports verified / 100% without authentic evidence.
 */
export function evaluateEvidenceAndStatus(options: {
  authorityRow?: any
  evidenceRows?: any[]
  versionRows?: any[]
  comparisonReport?: CurriculumComparisonReport
  subjectCount: number
  topicCount: number
  subtopicCount: number
}): EvidenceEvaluationResult {
  const { authorityRow, evidenceRows = [], comparisonReport, subjectCount, topicCount } = options

  const officialEvidence = evidenceRows.find(
    (e) => e.source_type === 'official_syllabus' || e.source_type === 'official_bulletin'
  )
  const secondaryEvidence = evidenceRows.find(
    (e) => e.source_type === 'verified_standard' || e.source_type === 'academic_curriculum'
  )

  const hasOfficialEvidence = Boolean(officialEvidence && officialEvidence.verification_status === 'valid')
  const hasSecondaryEvidence = Boolean(secondaryEvidence && secondaryEvidence.verification_status === 'valid')
  const hasAiInference = !hasOfficialEvidence && !hasSecondaryEvidence

  const authorityName = authorityRow?.name || officialEvidence?.publisher_authority || null
  const sourceUrl = officialEvidence?.source_url || secondaryEvidence?.source_url || null

  const coverage = comparisonReport ? comparisonReport.coveragePercentage : (subjectCount > 0 && topicCount > 0 ? 95 : 50)

  // Determine verification_status honestly
  let verificationStatus: 'verified' | 'partially_verified' | 'AI_inferred' | 'needs_review'

  if (hasOfficialEvidence && coverage >= 90) {
    verificationStatus = 'verified'
  } else if (hasOfficialEvidence || (hasSecondaryEvidence && coverage >= 75)) {
    verificationStatus = 'partially_verified'
  } else if (hasAiInference && coverage >= 50) {
    verificationStatus = 'AI_inferred'
  } else {
    verificationStatus = 'needs_review'
  }

  // Determine curriculum_status
  let curriculumStatus: CurriculumStatus
  if (subjectCount === 0) {
    curriculumStatus = 'needs_enrichment'
  } else if (comparisonReport?.hasGaps && coverage < 70) {
    curriculumStatus = 'partial'
  } else if (coverage >= 70 && subjectCount > 0 && topicCount >= subjectCount) {
    curriculumStatus = 'ready'
  } else {
    curriculumStatus = 'partial'
  }

  // Determine rules_status
  let rulesStatus: 'ready' | 'partial' | 'needs_review' = 'ready'
  const hasConflict = evidenceRows.some((e) => e.extracted_data?.rules_conflict)
  if (hasConflict) {
    rulesStatus = 'needs_review'
  }

  const evidenceScope = hasOfficialEvidence
    ? 'Official Statutory Authority Syllabus'
    : hasSecondaryEvidence
    ? 'Secondary Verified Academic Standard'
    : 'AI Synthesized Curriculum Profile'

  return {
    curriculumStatus,
    verificationStatus,
    rulesStatus,
    hasOfficialEvidence,
    hasSecondaryEvidence,
    hasAiInference,
    evidenceScope,
    authorityName,
    sourceUrl,
    coveragePercentage: coverage,
  }
}

// ============================================================================
// 4. RULES CONFLICT DETECTION
// ============================================================================

export interface RulesValidationResult {
  question_count: number | null
  duration_minutes: number | null
  marking_scheme: Record<string, any>
  question_types: string[]
  hasConflicts: boolean
  conflictDetails: string[]
  rulesStatus: 'ready' | 'partial' | 'needs_review'
}

export function detectAndValidateExamRules(
  examRow: any,
  versionRows: any[] = [],
  evidenceRows: any[] = [],
  fallbackSpec?: AIExamIntelligenceOutput
): RulesValidationResult {
  const conflictDetails: string[] = []

  // Check if multiple versions disagree on time limit or question count
  if (versionRows.length > 1) {
    const durations = new Set<number>()
    const qCounts = new Set<number>()

    for (const v of versionRows) {
      if (v.papers && Array.isArray(v.papers)) {
        for (const p of v.papers) {
          if (p.duration_minutes) durations.add(p.duration_minutes)
          if (p.total_questions) qCounts.add(p.total_questions)
        }
      }
    }

    if (durations.size > 1) {
      conflictDetails.push(`Multiple examination versions report differing paper durations: ${Array.from(durations).join(', ')} mins`)
    }
  }

  let duration_minutes: number | null = examRow?.time_limit_mins || null
  let question_count: number | null = examRow?.question_count || null
  let marking_scheme: Record<string, any> = examRow?.marking_scheme || {}
  let question_types: string[] = examRow?.question_types || []

  // Check evidence rows for extracted rules if not present in examRow
  for (const ev of evidenceRows) {
    const extracted = ev.extracted_data
    if (extracted) {
      if (duration_minutes === null && typeof extracted.duration_minutes === 'number') {
        duration_minutes = extracted.duration_minutes
      }
      if (question_count === null && typeof extracted.question_count === 'number') {
        question_count = extracted.question_count
      }
      if (Object.keys(marking_scheme).length === 0 && extracted.marking_scheme) {
        marking_scheme = extracted.marking_scheme
      }
    }
  }

  // Only a deterministic, high-confidence built-in template may supply rules without
  // exam-specific evidence. AI-generated profiles are hypotheses, not official facts.
  const trustedTemplate = Boolean(fallbackSpec && Number(fallbackSpec.confidence?.overall || 0) >= 0.98)
  if (trustedTemplate && duration_minutes === null && fallbackSpec?.exam.question_config.duration_minutes) {
    duration_minutes = fallbackSpec.exam.question_config.duration_minutes
  }
  if (trustedTemplate && question_count === null && fallbackSpec?.exam.question_config.default_question_count) {
    question_count = fallbackSpec.exam.question_config.default_question_count
  }
  if (trustedTemplate && Object.keys(marking_scheme).length === 0 && fallbackSpec) {
    marking_scheme = {
      positive_mark: fallbackSpec.exam.question_config.positive_mark,
      negative_mark: fallbackSpec.exam.question_config.negative_mark,
      has_negative_marking: fallbackSpec.exam.question_config.has_negative_marking,
      answer_type: fallbackSpec.exam.question_config.answer_type,
      option_count: fallbackSpec.exam.question_config.option_count,
    }
  }
  if (trustedTemplate && question_types.length === 0 && fallbackSpec) {
    question_types = fallbackSpec.exam.question_config.question_types || []
  }

  const hasOfficialEvidence = evidenceRows.some((ev: any) =>
    ['official_syllabus', 'official_bulletin', 'official_notification'].includes(String(ev.source_type || '').toLowerCase()) &&
    ['valid', 'verified'].includes(String(ev.verification_status || '').toLowerCase()) &&
    typeof ev.source_url === 'string' && /^https?:\/\//i.test(ev.source_url)
  )
  const hasConflicts = conflictDetails.length > 0
  const requiredRulesPresent = duration_minutes !== null && question_count !== null &&
    Object.keys(marking_scheme || {}).length > 0 && question_types.length > 0
  const rulesStatus: 'ready' | 'partial' | 'needs_review' = hasConflicts
    ? 'needs_review'
    : requiredRulesPresent && (hasOfficialEvidence || trustedTemplate)
    ? 'ready'
    : 'partial'

  return {
    question_count,
    duration_minutes,
    marking_scheme,
    question_types,
    hasConflicts,
    conflictDetails,
    rulesStatus,
  }
}
