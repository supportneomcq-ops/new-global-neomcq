/**
 * NeoMCQ AI Content Intelligence Engine - Production Hardened
 * 
 * Production-grade AI Content Orchestrator:
 * - Strict Canonical Entity Resolution (Exam -> Subject -> Topic)
 * - Canonical Version Reuse (shared content is reused until an authorised version refresh)
 * - Concurrency Lock & Database-Level Idempotency (1 generation for concurrent requests)
 * - Multi-Key Load Balancing & Failover (Gemini primary -> OpenAI fallback)
 * - Strict Scope Control & Zero Duplicate Questions Fingerprinting
 * - Strict Content Validation Pipeline (Verified JSON schema, no synthetic templates)
 * - Full Versioning in content_versions & Financial Auditing in ai_cost_events
 */

import { getSupabaseAdmin } from '@/lib/supabase'
import { AIGateway } from '@/lib/ai/ai-gateway'
import { resolveCanonicalHierarchy, CanonicalHierarchyResolution } from './canonical-resolver'
import { getExamStyleAndPattern } from '@/lib/server/content-engine/exam-style-helper'

export interface GeneratedMCQ {
  id?: string
  question: string
  options: string[]
  correct_index: number
  explanation: string
  clinical_pearl?: string
  high_yield_tag?: string
  difficulty?: string
}

export interface GeneratedFlashcard {
  id?: string
  front: string
  back: string
  category?: string
  difficulty?: string
}

export interface GeneratedStickyNote {
  id?: string
  text: string
  color: 'amber' | 'emerald' | 'indigo' | 'rose'
  category?: string
  pinned?: boolean
}

export interface GeneratedFillInBlank {
  id?: string
  sentence: string
  blank: string
  acceptedAnswers: string[]
  concept: string
  explanation: string
  highYieldPoint?: string
  memoryHook?: string
  examTip?: string
  difficulty?: string
  subtopicName?: string
}

export interface GeneratedWhiteboardPhase {
  phase: number
  title: string
  diagram: string
  description: string
  badge: string
  narration?: string
}

export interface ContentIntelligencePayload {
  mcqs: GeneratedMCQ[]
  quiz_a: GeneratedMCQ[]
  quiz_b: GeneratedMCQ[]
  notes: string
  flashcards: GeneratedFlashcard[]
  sticky_notes: GeneratedStickyNote[]
  fill_in_the_blanks: GeneratedFillInBlank[]
  whiteboard_phases: GeneratedWhiteboardPhase[]
  tutor_explanation?: string
  revision_sheet?: string
  quality_score?: number
  validation_report?: {
    structural: boolean
    scope: boolean
    deduplication: boolean
    answers: boolean
    flashcards?: boolean
    sticky_notes?: boolean
    fill_in_the_blanks?: boolean
    tutor_explanation?: boolean
    revision_sheet?: boolean
    score: number
  }
}

export interface ContentIntelligenceResult {
  success: boolean
  served_from_cache: boolean
  is_stale?: boolean
  refresh_pending?: boolean
  generation_reason: 'CANONICAL_REUSE' | 'FIRST_GENERATION' | 'FORCE_REFRESH' | 'ERROR'
  version_number: number
  hierarchy: CanonicalHierarchyResolution
  content: ContentIntelligencePayload | null
  job_id?: string
  metrics: {
    input_tokens: number
    output_tokens: number
    cached_tokens: number
    actual_cost_usd: number
    credits_deducted: number
    duration_ms: number
    model_used: string
    provider_used: string
  }
  created_at: string
  error?: string
  error_code?: string
  retry_after?: number
}

/**
 * Polls the database for completion of an active AI job
 */
async function waitForActiveJobCompletion(
  supabase: any,
  jobId: string,
  topicId: string,
  targetVersion: number,
  maxWaitMs = 25000
): Promise<any | null> {
  const start = Date.now()
  let delay = 500

  while (Date.now() - start < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, delay))
    delay = Math.min(delay * 1.3, 2000)

    const { data: job } = await supabase
      .from('ai_jobs')
      .select('id, status, error, output_payload')
      .eq('id', jobId)
      .maybeSingle()

    if (job?.status === 'completed') {
      const { data: versionRecord } = await supabase
        .from('content_versions')
        .select('*')
        .eq('asset_id', topicId)
        .eq('asset_type', 'topic')
        .eq('version', targetVersion)
        .maybeSingle()

      return versionRecord || null
    }

    if (job?.status === 'failed') {
      return null
    }
  }

  return null
}

function buildGenerationInProgressResult(
  hierarchy: CanonicalHierarchyResolution,
  versionNumber: number,
  jobId: string,
  startTime: number
): ContentIntelligenceResult {
  return {
    success: false,
    served_from_cache: false,
    refresh_pending: true,
    generation_reason: 'ERROR',
    version_number: versionNumber,
    hierarchy,
    content: null,
    job_id: jobId,
    metrics: {
      input_tokens: 0,
      output_tokens: 0,
      cached_tokens: 0,
      actual_cost_usd: 0,
      credits_deducted: 0,
      duration_ms: Date.now() - startTime,
      model_used: 'pending',
      provider_used: 'database-job',
    },
    created_at: new Date().toISOString(),
    error: 'This topic pack is already being generated. The saved shared result will be available shortly.',
    error_code: 'GENERATION_IN_PROGRESS',
    retry_after: 5,
  }
}

function normalizeQuestionStem(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePersistedFlashcardDifficulty(value?: string | null): 'Easy' | 'Medium' | 'Hard' {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized.includes('easy') || normalized.includes('beginner')) return 'Easy'
  if (normalized.includes('hard') || normalized.includes('advanced') || normalized.includes('expert')) return 'Hard'
  return 'Medium'
}

/**
 * Validation Pipeline for AI-generated medical/academic content
 */
function validateGeneratedContent(
  rawPayload: any,
  topicName: string,
  subjectName: string,
  existingStems: Set<string>,
  allowedSubtopics: string[] = []
): { isValid: boolean; payload: ContentIntelligencePayload; report: any } {
  let isStructural = true
  let isScope = true
  let isDeduplication = true
  let isAnswers = true
  let score = 100.0

  if (!rawPayload || typeof rawPayload !== 'object') {
    return {
      isValid: false,
      payload: { mcqs: [], quiz_a: [], quiz_b: [], notes: '', flashcards: [], sticky_notes: [], fill_in_the_blanks: [], whiteboard_phases: [], tutor_explanation: '', revision_sheet: '', quality_score: 0 },
      report: { structural: false, scope: false, deduplication: false, answers: false, score: 0 },
    }
  }

  const validMcqs: GeneratedMCQ[] = []
  const existingQuestionStems = new Set(existingStems)

  if (Array.isArray(rawPayload.mcqs) && rawPayload.mcqs.length > 0) {
    for (const m of rawPayload.mcqs) {
      if (!m || typeof m.question !== 'string' || !Array.isArray(m.options) || m.options.length < 4) {
        isStructural = false
        score -= 10
        continue
      }

      const question = m.question.trim()
      const stem = normalizeQuestionStem(question)
      const options = m.options.map((option: unknown) => typeof option === 'string' ? option.trim() : '')
      if (stem.length < 15 || options.some((option: string) => !option)) {
        isStructural = false
        score -= 10
        continue
      }

      const uniqueOptions = new Set(options.map((option: string) => option.toLowerCase()))
      if (uniqueOptions.size !== options.length) {
        isStructural = false
        score -= 10
        continue
      }

      if (existingQuestionStems.has(stem)) {
        isDeduplication = false
        score -= 5
        continue
      }
      existingQuestionStems.add(stem)

      // Never invent option zero as the answer when the model supplies an invalid answer index.
      const correctIndex = m.correct_index
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        isAnswers = false
        score -= 15
        continue
      }

      const explanation = typeof m.explanation === 'string' ? m.explanation.trim() : ''
      if (explanation.length < 15) {
        isAnswers = false
        score -= 10
        continue
      }

      validMcqs.push({
        question,
        options,
        correct_index: correctIndex,
        explanation,
        clinical_pearl: typeof m.clinical_pearl === 'string' && m.clinical_pearl.trim() ? m.clinical_pearl.trim() : undefined,
        high_yield_tag: typeof m.high_yield_tag === 'string' && m.high_yield_tag.trim() ? m.high_yield_tag.trim() : undefined,
        difficulty: typeof m.difficulty === 'string' && m.difficulty.trim() ? m.difficulty.trim() : 'Intermediate',
      })
    }
  } else {
    isStructural = false
    score -= 30
  }

  const validNotes = typeof rawPayload?.notes === 'string' && rawPayload.notes.length > 50
    ? rawPayload.notes.trim()
    : ''

  const validFlashcards: GeneratedFlashcard[] = []
  if (Array.isArray(rawPayload?.flashcards)) {
    for (const f of rawPayload.flashcards) {
      if (f && typeof f.front === 'string' && typeof f.back === 'string' && f.front.trim() && f.back.trim()) {
        validFlashcards.push({
          id: f.id || `fc_${Math.random().toString(36).slice(2, 9)}`,
          front: f.front.trim(),
          back: f.back.trim(),
          category: f.category || subjectName,
          difficulty: f.difficulty || 'High Yield',
        })
      }
    }
  }

  // Sticky Notes validation / extraction
  const validStickyNotes: GeneratedStickyNote[] = []
  if (Array.isArray(rawPayload?.sticky_notes)) {
    for (const sn of rawPayload.sticky_notes) {
      if (sn && typeof sn.text === 'string' && sn.text.trim()) {
        const color = ['amber', 'emerald', 'indigo', 'rose'].includes(sn.color) ? sn.color : 'amber'
        validStickyNotes.push({
          id: sn.id || `sn_${Math.random().toString(36).slice(2, 9)}`,
          text: sn.text.trim(),
          color: color as any,
          category: sn.category || subjectName,
          pinned: !!sn.pinned,
        })
      }
    }
  }

  // Fill-in-the-blanks must be usable in the learner's actual recall workflow.
  // Require one explicit [BLANK], a canonical answer, accepted synonyms and a valid topic scope.
  const validFillInBlanks: GeneratedFillInBlank[] = []
  if (Array.isArray(rawPayload?.fill_in_the_blanks)) {
    for (const fib of rawPayload.fill_in_the_blanks) {
      if (!fib || typeof fib.sentence !== 'string' || typeof fib.blank !== 'string') continue
      const sentence = fib.sentence.trim()
      const blank = fib.blank.trim()
      const blankTokens = sentence.match(/\[BLANK\]/g) || []
      if (!sentence || !blank || blankTokens.length !== 1 ||
          sentence.toLocaleLowerCase().includes(blank.toLocaleLowerCase())) continue

      const rawSubtopic = String(fib.subtopicName || fib.subtopic || '').trim()
      const matchedSubtopic = allowedSubtopics.find((name) => name.toLowerCase() === rawSubtopic.toLowerCase())
      if (allowedSubtopics.length > 0 && !matchedSubtopic) continue

      const acceptedAnswers: string[] = Array.isArray(fib.acceptedAnswers)
        ? Array.from(new Set(
            fib.acceptedAnswers
              .filter((answer: unknown): answer is string => typeof answer === 'string')
              .map((answer: string) => answer.trim())
              .filter((answer: string) => answer.length > 0)
          )).slice(0, 5)
        : []
      if (!acceptedAnswers.some((answer) => answer.toLowerCase() === blank.toLowerCase())) acceptedAnswers.unshift(blank)
      if (acceptedAnswers.length < 2) continue

      validFillInBlanks.push({
        id: fib.id || ('fib_' + Math.random().toString(36).slice(2, 9)),
        sentence,
        blank,
        acceptedAnswers,
        concept: fib.concept ? String(fib.concept).trim() : topicName,
        explanation: fib.explanation ? String(fib.explanation).trim() : 'High-yield recall point.',
        highYieldPoint: fib.highYieldPoint ? String(fib.highYieldPoint).trim() : undefined,
        memoryHook: fib.memoryHook ? String(fib.memoryHook).trim() : undefined,
        examTip: fib.examTip ? String(fib.examTip).trim() : undefined,
        difficulty: fib.difficulty ? String(fib.difficulty).trim() : 'High Yield',
        subtopicName: matchedSubtopic || rawSubtopic || undefined,
      })
    }
  }

  // Whiteboard phases validation / extraction
  const validWhiteboardPhases: GeneratedWhiteboardPhase[] = []
  if (Array.isArray(rawPayload?.whiteboard_phases) && rawPayload.whiteboard_phases.length > 0) {
    for (const wp of rawPayload.whiteboard_phases) {
      if (wp && typeof wp.title === 'string' && typeof wp.description === 'string') {
        validWhiteboardPhases.push({
          phase: typeof wp.phase === 'number' ? wp.phase : validWhiteboardPhases.length + 1,
          title: wp.title.trim(),
          diagram: wp.diagram ? String(wp.diagram).trim() : `${topicName} Pathway`,
          description: wp.description.trim(),
          badge: wp.badge ? String(wp.badge).trim() : 'Core Concept',
          narration: wp.narration ? String(wp.narration).trim() : undefined,
        })
      }
    }
  }

  // Split MCQs into Quiz A (20 Qs) and Quiz B (20 Qs)
  const quizA = validMcqs.slice(0, Math.min(20, Math.ceil(validMcqs.length / 2)))
  const quizB = validMcqs.slice(quizA.length, quizA.length + 20)

  const validTutor = typeof rawPayload?.tutor_explanation === 'string' && rawPayload.tutor_explanation.length > 20
    ? rawPayload.tutor_explanation.trim()
    : ''

  const validRev = typeof rawPayload?.revision_sheet === 'string' && rawPayload.revision_sheet.length > 20
    ? rawPayload.revision_sheet.trim()
    : ''

  const finalScore = Math.max(0, Math.min(100, score))

  const hasMinimumFlashcards = validFlashcards.length >= 10
  const hasMinimumStickyNotes = validStickyNotes.length >= 3
  const hasMinimumFillInBlanks = validFillInBlanks.length >= 8
  const hasMinimumWhiteboardPhases = validWhiteboardPhases.length >= 1
  const hasTutorExplanation = validTutor.trim().length >= 100
  const hasRevisionSheet = validRev.trim().length >= 100
  const hasQuizSets = quizA.length >= 5 && quizB.length >= 5

  const payload: ContentIntelligencePayload = {
    mcqs: validMcqs,
    quiz_a: quizA,
    quiz_b: quizB,
    notes: validNotes,
    flashcards: validFlashcards,
    sticky_notes: validStickyNotes,
    fill_in_the_blanks: validFillInBlanks,
    whiteboard_phases: validWhiteboardPhases,
    tutor_explanation: validTutor,
    revision_sheet: validRev,
    quality_score: finalScore,
    validation_report: {
      structural: isStructural,
      scope: isScope,
      deduplication: isDeduplication,
      answers: isAnswers,
      flashcards: hasMinimumFlashcards,
      sticky_notes: hasMinimumStickyNotes,
      fill_in_the_blanks: hasMinimumFillInBlanks,
      tutor_explanation: hasTutorExplanation,
      revision_sheet: hasRevisionSheet,
      score: finalScore,
    },
  }

  const isValid = validMcqs.length >= 10 && Boolean(validNotes) &&
    hasQuizSets && hasMinimumFlashcards && hasMinimumStickyNotes &&
    hasMinimumFillInBlanks && hasMinimumWhiteboardPhases &&
    hasTutorExplanation && hasRevisionSheet

  return { isValid, payload, report: payload.validation_report }
}

/**
 * Execute AI Generation with Multi-Key Gemini -> OpenAI Failover
 */
async function executeMultiProviderGeneration(
  prompt: string,
  taskType: string,
  jobId: string,
  requestId: string,
  metadata: Record<string, unknown>
): Promise<{
  rawPayload: any
  providerUsed: string
  modelUsed: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  fallbackUsed: boolean
}> {
  // All provider execution, failover, usage accounting and platform budget settlement
  // go through the single AIGateway pipeline. Shared canonical content is never charged
  // to an individual learner.
  const result = await AIGateway.generate({
    userId: null,
    taskType,
    prompt,
    systemInstruction: 'You are the Lead Master Academic Professor and Board Author for NeoMCQ. Generate strictly valid, high-yield JSON content.',
    responseMimeType: 'application/json',
    jobId,
    requestId,
    metadata,
    timeoutMs: 180000,
    maxRetries: 1,
  })

  let rawPayload = result.parsedJson
  if (!rawPayload) {
    try {
      rawPayload = JSON.parse(result.text)
    } catch {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (jsonMatch?.[0]) {
        try {
          rawPayload = JSON.parse(jsonMatch[0])
        } catch {
          rawPayload = null
        }
      }
    }
  }

  if (!rawPayload || typeof rawPayload !== 'object') {
    throw new Error('The configured AI provider did not return valid structured JSON.')
  }

  return {
    rawPayload,
    providerUsed: result.provider,
    modelUsed: result.model,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    costUsd: result.cost.totalCogsUsd,
    fallbackUsed: result.isFallback,
  }
}

/**
 * Main Orchestrator: Generate or Retrieve Canonical Content for Topic
 */
export async function getOrGenerateCanonicalTopicContent({
  examInput,
  subjectInput,
  topicInput,
  subtopicInput,
  userId,
  difficulty = 'Intermediate',
  language = 'en',
  forceRefresh = false,
  autoCreateEntities = true,
  parentJobId = null,
}: {
  examInput: string
  subjectInput: string
  topicInput: string
  subtopicInput?: string | null
  userId?: string | null
  difficulty?: string
  language?: string
  forceRefresh?: boolean
  autoCreateEntities?: boolean
  parentJobId?: string | null
}): Promise<ContentIntelligenceResult> {
  const supabase = getSupabaseAdmin()
  const startTime = Date.now()

  // 1. Strict Canonical Entity Resolution
  const hierarchy = await resolveCanonicalHierarchy({
    examInput,
    subjectInput,
    topicInput,
    autoCreate: autoCreateEntities,
  })

  if (!hierarchy.success || !hierarchy.exam || !hierarchy.subject || !hierarchy.topic) {
    return {
      success: false,
      served_from_cache: false,
      generation_reason: 'ERROR',
      version_number: 1,
      hierarchy,
      content: null,
      metrics: {
        input_tokens: 0,
        output_tokens: 0,
        cached_tokens: 0,
        actual_cost_usd: 0,
        credits_deducted: 0,
        duration_ms: Date.now() - startTime,
        model_used: 'none',
        provider_used: 'none',
      },
      created_at: new Date().toISOString(),
      error: hierarchy.error || 'Failed to resolve canonical entities.',
      error_code: 'RESOLUTION_FAILED',
    }
  }

  const exam = hierarchy.exam
  const subject = hierarchy.subject
  const topic = hierarchy.topic

  // Resolve Subtopic if requested
  let subtopicName = ''
  let subtopicId = ''
  if (subtopicInput && typeof subtopicInput === 'string' && subtopicInput.trim()) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subtopicInput.trim())
    if (isUUID) {
      const { data: stRow } = await supabase
        .from('exam_subtopics')
        .select('id, name')
        .eq('id', subtopicInput.trim())
        .maybeSingle()
      if (stRow) {
        subtopicId = stRow.id
        subtopicName = stRow.name
      }
    } else {
      subtopicName = subtopicInput.trim()
      const { data: stRow } = await supabase
        .from('exam_subtopics')
        .select('id, name')
        .eq('topic_id', topic.id)
        .ilike('name', subtopicName)
        .maybeSingle()
      if (stRow) {
        subtopicId = stRow.id
      }
    }
  }

  const { data: topicSubtopicRows } = await supabase
    .from('exam_subtopics')
    .select('id,name,is_active,display_order')
    .eq('topic_id', topic.id)
    .order('display_order', { ascending: true })
  const topicSubtopicNames = (topicSubtopicRows || [])
    .filter((row: any) => row.is_active !== false)
    .map((row: any) => String(row.name || '').trim())
    .filter(Boolean)
  const allowedSubtopicNames = subtopicName ? [subtopicName] : topicSubtopicNames

  // 2. Fetch Existing Content & Content Versions
  let latestVersionRecord: any = null
  let existingDbMcqs: any[] = []
  let existingDbNotes: any[] = []
  let existingDbFlashcards: any[] = []

  try {
    const [versionRes, mcqsRes, notesRes, flashRes] = await Promise.all([
      supabase
        .from('content_versions')
        .select('*')
        .eq('asset_id', topic.id)
        .eq('asset_type', 'topic')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('mcqs')
        .select('id, question, options, correct_answer, explanation, clinical_pearl, tags, metadata, difficulty, created_at')
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('notes')
        .select('id, title, content, created_at')
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('flashcards')
        .select('id, front, back, difficulty, created_at')
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: true }),
    ])

    latestVersionRecord = versionRes.data
    existingDbMcqs = mcqsRes.data || []
    existingDbNotes = notesRes.data || []
    existingDbFlashcards = flashRes.data || []
  } catch (err) {
    console.warn('[AI Content Intelligence] Non-fatal error inspecting existing version records:', err)
  }

  // Production contains legacy slot-based snapshots as well as the newer flat payload format.
  // Treat those slots as real cached content to prevent repeat AI generation and unnecessary provider spend.
  const latestSnapshot = latestVersionRecord?.snapshot || {}
  const legacyMainItems = Array.isArray(latestSnapshot.mainMcqsSlot?.items) ? latestSnapshot.mainMcqsSlot.items : []
  const legacyQuizAItems = Array.isArray(latestSnapshot.quiz1Slot?.items) ? latestSnapshot.quiz1Slot.items : []
  const legacyQuizBItems = Array.isArray(latestSnapshot.quiz2Slot?.items) ? latestSnapshot.quiz2Slot.items : []
  const legacyFlashcardItems = Array.isArray(latestSnapshot.flashcardsSlot?.items) ? latestSnapshot.flashcardsSlot.items : []
  const legacyNotesContent = latestSnapshot.notesSlot?.content
  const hasLegacyNotes = typeof legacyNotesContent === 'string' && legacyNotesContent.trim().length > 20
  const hasExistingContent =
    existingDbMcqs.length > 0 ||
    (Array.isArray(latestSnapshot.mcqs) && latestSnapshot.mcqs.length > 0) ||
    legacyMainItems.length > 0 ||
    legacyQuizAItems.length > 0 ||
    legacyQuizBItems.length > 0 ||
    existingDbNotes.length > 0 ||
    (typeof latestSnapshot.notes === 'string' && latestSnapshot.notes.trim().length > 20) ||
    hasLegacyNotes ||
    existingDbFlashcards.length > 0 ||
    legacyFlashcardItems.length > 0

  // Canonical topic content is shared and reusable until an authorised refresh creates a new version.
  // Age alone must never trigger duplicate AI spend for the same syllabus scope.
  const snapshotMcqCount = Array.isArray(latestSnapshot.mcqs) ? latestSnapshot.mcqs.length
    : legacyMainItems.length + legacyQuizAItems.length + legacyQuizBItems.length
  const snapshotFlashcardCount = Array.isArray(latestSnapshot.flashcards) ? latestSnapshot.flashcards.length : legacyFlashcardItems.length
  const snapshotStickyNoteCount = Array.isArray(latestSnapshot.sticky_notes) ? latestSnapshot.sticky_notes.length : 0
  const snapshotQuizACount = Array.isArray(latestSnapshot.quiz_a) ? latestSnapshot.quiz_a.length : legacyQuizAItems.length
  const snapshotQuizBCount = Array.isArray(latestSnapshot.quiz_b) ? latestSnapshot.quiz_b.length : legacyQuizBItems.length
  const snapshotWhiteboardCount = Array.isArray(latestSnapshot.whiteboard_phases) ? latestSnapshot.whiteboard_phases.length : 0
  const snapshotFillBlankItems = Array.isArray(latestSnapshot.fill_in_the_blanks) ? latestSnapshot.fill_in_the_blanks : []
  const snapshotNotesText = typeof latestSnapshot.notes === 'string' ? latestSnapshot.notes : legacyNotesContent
  const snapshotTutorText = typeof latestSnapshot.tutor_explanation === 'string' ? latestSnapshot.tutor_explanation : ''
  const snapshotRevisionText = typeof latestSnapshot.revision_sheet === 'string' ? latestSnapshot.revision_sheet : ''
  const hasCompleteCanonicalPack =
    Math.max(existingDbMcqs.length, snapshotMcqCount) >= 10 &&
    snapshotQuizACount >= 5 && snapshotQuizBCount >= 5 &&
    Math.max(existingDbFlashcards.length, snapshotFlashcardCount) >= 10 &&
    snapshotStickyNoteCount >= 3 && snapshotWhiteboardCount >= 1 &&
    snapshotTutorText.trim().length >= 100 && snapshotRevisionText.trim().length >= 100 &&
    snapshotFillBlankItems.length >= 8 &&
    snapshotFillBlankItems.every((item: any) =>
      typeof item?.sentence === 'string' && (item.sentence.match(/\[BLANK\]/g) || []).length === 1 &&
      typeof item?.blank === 'string' && item.blank.trim().length > 0 &&
      Array.isArray(item?.acceptedAnswers) && item.acceptedAnswers.length > 0
    ) &&
    (existingDbNotes.length > 0 || (typeof snapshotNotesText === 'string' && snapshotNotesText.trim().length > 20))
  const isFresh = hasExistingContent && hasCompleteCanonicalPack
  const currentVersionNum = latestVersionRecord?.version || (existingDbMcqs.length > 0 ? 1 : 0)

  // Format cached content payload helper
  const getCachedPayload = (): ContentIntelligencePayload => {
    const snapshotPayload = latestSnapshot
    const snapshotMainMcqs = Array.isArray(snapshotPayload.mainMcqsSlot?.items) ? snapshotPayload.mainMcqsSlot.items : []
    const snapshotQuizA = Array.isArray(snapshotPayload.quiz1Slot?.items) ? snapshotPayload.quiz1Slot.items : []
    const snapshotQuizB = Array.isArray(snapshotPayload.quiz2Slot?.items) ? snapshotPayload.quiz2Slot.items : []
    const snapshotMcqs = Array.isArray(snapshotPayload.mcqs)
      ? snapshotPayload.mcqs
      : snapshotMainMcqs.length > 0
        ? snapshotMainMcqs
        : [...snapshotQuizA, ...snapshotQuizB]

    const formattedMcqs = existingDbMcqs.length > 0
      ? existingDbMcqs.map((m: any) => {
          let correctIdx = 0
          if (Array.isArray(m.options)) {
            const idx = m.options.indexOf(m.correct_answer)
            if (idx !== -1) correctIdx = idx
          }
          return {
            id: m.id,
            question: m.question,
            options: Array.isArray(m.options) ? m.options : ['Option A', 'Option B', 'Option C', 'Option D'],
            correct_index: correctIdx,
            explanation: m.explanation || 'High-yield board explanation.',
            clinical_pearl: m.clinical_pearl || `${topic.name} - Pearl`,
            high_yield_tag: m.metadata?.high_yield_tag || (Array.isArray(m.tags) ? m.tags[0] : null) || `${subject.name} - ${topic.name}`,
            difficulty: m.difficulty || difficulty,
          }
        })
      : snapshotMcqs.map((m: any) => {
          const options = Array.isArray(m.options) ? m.options : ['Option A', 'Option B', 'Option C', 'Option D']
          const answer = m.correct_answer ?? m.correctAnswer
          const explicitIndex = m.correct_index ?? m.correctIndex
          const foundIndex = answer != null ? options.indexOf(answer) : -1
          const correctIdx = Number.isInteger(explicitIndex) && explicitIndex >= 0 && explicitIndex < options.length
            ? explicitIndex
            : foundIndex >= 0 ? foundIndex : 0
          return {
            id: m.id,
            question: m.question || '',
            options,
            correct_index: correctIdx,
            explanation: m.explanation || 'High-yield explanation.',
            clinical_pearl: m.clinical_pearl || m.clinicalPearl || `${topic.name} - Pearl`,
            high_yield_tag: m.high_yield_tag || m.highYieldTag || `${subject.name} - ${topic.name}`,
            difficulty: m.difficulty || difficulty,
          }
        })

    const snapshotNotes = typeof snapshotPayload.notes === 'string'
      ? snapshotPayload.notes
      : typeof snapshotPayload.notesSlot?.content === 'string'
        ? snapshotPayload.notesSlot.content
        : ''
    const combinedNotes = existingDbNotes.length > 0
      ? existingDbNotes.map((n: any) => n.content).join('\n\n---\n\n')
      : snapshotNotes

    const snapshotFlashcards = Array.isArray(snapshotPayload.flashcards)
      ? snapshotPayload.flashcards
      : Array.isArray(snapshotPayload.flashcardsSlot?.items)
        ? snapshotPayload.flashcardsSlot.items
        : []
    const formattedFlashcards = existingDbFlashcards.length > 0
      ? existingDbFlashcards.map((f: any) => ({
          id: f.id,
          front: f.front,
          back: f.back,
          category: subject.name,
          difficulty: f.difficulty || 'High Yield',
        }))
      : snapshotFlashcards.map((f: any) => ({
          id: f.id,
          front: f.front || '',
          back: f.back || '',
          category: f.category || subject.name,
          difficulty: f.difficulty || 'High Yield',
        }))

    const quizA = Array.isArray(snapshotPayload.quiz_a) && snapshotPayload.quiz_a.length > 0
      ? snapshotPayload.quiz_a
      : snapshotQuizA.length > 0
        ? snapshotQuizA.map((m: any) => ({
            ...m,
            correct_index: m.correct_index ?? m.correctIndex ?? 0,
            clinical_pearl: m.clinical_pearl || m.clinicalPearl || '',
            high_yield_tag: m.high_yield_tag || m.highYieldTag || '',
          }))
        : formattedMcqs.slice(0, Math.min(20, Math.ceil(formattedMcqs.length / 2)))

    const quizB = Array.isArray(snapshotPayload.quiz_b) && snapshotPayload.quiz_b.length > 0
      ? snapshotPayload.quiz_b
      : snapshotQuizB.length > 0
        ? snapshotQuizB.map((m: any) => ({
            ...m,
            correct_index: m.correct_index ?? m.correctIndex ?? 0,
            clinical_pearl: m.clinical_pearl || m.clinicalPearl || '',
            high_yield_tag: m.high_yield_tag || m.highYieldTag || '',
          }))
        : formattedMcqs.slice(quizA.length, quizA.length + 20)

    const stickyNotes = snapshotPayload.sticky_notes || []
    const fillInBlanks = snapshotPayload.fill_in_the_blanks || []
    const whiteboardPhases = snapshotPayload.whiteboard_phases || []

    return {
      mcqs: formattedMcqs,
      quiz_a: quizA,
      quiz_b: quizB.length > 0 ? quizB : quizA,
      notes: combinedNotes,
      flashcards: formattedFlashcards,
      sticky_notes: stickyNotes,
      fill_in_the_blanks: fillInBlanks,
      whiteboard_phases: whiteboardPhases,
      tutor_explanation: snapshotPayload.tutor_explanation || '',
      revision_sheet: snapshotPayload.revision_sheet || '',
      quality_score: snapshotPayload.quality_score || 95.0,
    }
  }

  // 4. Reuse the existing canonical version unless an authorised refresh was explicitly requested.
  if (hasExistingContent && isFresh && !forceRefresh) {
    console.log(`[AI Content Intelligence] Serving reusable canonical content for topic: ${topic.name}`)
    return {
      success: true,
      served_from_cache: true,
      generation_reason: 'CANONICAL_REUSE',
      version_number: currentVersionNum,
      hierarchy,
      content: getCachedPayload(),
      metrics: {
        input_tokens: 0,
        output_tokens: 0,
        cached_tokens: 0,
        actual_cost_usd: 0,
        credits_deducted: 0,
        duration_ms: Date.now() - startTime,
        model_used: 'cache-reused',
        provider_used: 'supabase-db',
      },
      created_at: latestVersionRecord?.created_at || new Date().toISOString(),
    }
  }

  // 5. Generate a new canonical version only for first generation or an authorised explicit refresh.
  const targetVersionNum = currentVersionNum + 1
  const generationReason = hasExistingContent ? 'FORCE_REFRESH' : 'FIRST_GENERATION'

  // Deterministic Idempotency Key
  const parentScope = parentJobId || 'manual'
  const idempotencyKey = subtopicId
    ? `canonical_topic:${exam.id}:${subject.id}:${topic.id}:${subtopicId}:full_pack:v${targetVersionNum}:parent:${parentScope}`
    : `canonical_topic:${exam.id}:${subject.id}:${topic.id}:full_pack:v${targetVersionNum}:parent:${parentScope}`

  // Concurrency Check: If an active DB job is already executing for this exact idempotency key, attach to it
  if (!forceRefresh) {
    try {
      const { data: existingActiveJob } = await supabase
        .from('ai_jobs')
        .select('id, status, created_at')
        .eq('idempotency_key', idempotencyKey)
        .in('status', ['queued', 'running', 'processing', 'pending'])
        .maybeSingle()

      if (existingActiveJob) {
        console.log(`[AI Content Intelligence] Attaching to in-flight DB job (${existingActiveJob.id}) for idempotency key: ${idempotencyKey}`)
        const completedVersion = await waitForActiveJobCompletion(supabase, existingActiveJob.id, topic.id, targetVersionNum, 5000)
        if (completedVersion?.snapshot) {
          return {
            success: true,
            served_from_cache: true,
            generation_reason: generationReason,
            version_number: targetVersionNum,
            hierarchy,
            content: completedVersion.snapshot,
            metrics: {
              input_tokens: completedVersion.input_tokens || 0,
              output_tokens: completedVersion.output_tokens || 0,
              cached_tokens: 0,
              actual_cost_usd: 0,
              credits_deducted: 0,
              duration_ms: Date.now() - startTime,
              model_used: completedVersion.model || 'canonical-completed-job',
              provider_used: completedVersion.provider || 'supabase-db',
            },
            created_at: completedVersion.created_at || new Date().toISOString(),
          }
        }

        const { data: latestJob } = await supabase
          .from('ai_jobs')
          .select('status')
          .eq('id', existingActiveJob.id)
          .maybeSingle()

        if (latestJob && ['queued', 'running', 'processing', 'pending', 'validating'].includes(latestJob.status)) {
          return buildGenerationInProgressResult(hierarchy, targetVersionNum, existingActiveJob.id, startTime)
        }
      }
    } catch (concurrencyErr) {
      console.warn('[AI Content Intelligence] Notice during DB concurrency check:', concurrencyErr)
    }
  }

  // 6. Execute Synchronous Generation (for FIRST_GENERATION or FORCE_REFRESH)
  return await executeGenerationWorkflow({
    supabase,
    exam,
    subject,
    topic,
    subtopicName,
    subtopicId,
    targetVersionNum,
    generationReason,
    idempotencyKey,
    existingDbMcqs,
    difficulty,
    language,
    userId,
    parentJobId,
    startTime,
    hierarchy,
    allowedSubtopicNames,
  })
}

/**
 * Worker executing generation, idempotency registration, validation, and database commits
 */
async function executeGenerationWorkflow({
  supabase,
  exam,
  subject,
  topic,
  subtopicName,
  subtopicId,
  targetVersionNum,
  generationReason,
  idempotencyKey,
  existingDbMcqs,
  difficulty,
  language,
  userId,
  parentJobId,
  startTime,
  hierarchy,
  allowedSubtopicNames,
}: {
  supabase: any
  exam: any
  subject: any
  topic: any
  subtopicName?: string
  subtopicId?: string
  targetVersionNum: number
  generationReason: 'FIRST_GENERATION' | 'FORCE_REFRESH'
  idempotencyKey: string
  existingDbMcqs: any[]
  difficulty: string
  language: string
  userId?: string | null
  parentJobId?: string | null
  startTime: number
  hierarchy: CanonicalHierarchyResolution
  allowedSubtopicNames: string[]
}): Promise<ContentIntelligenceResult> {
  let jobId: string | null = null

  // 1. Atomically register one canonical generation job for this parent worker job.
  // Failed jobs may retry within their bounded attempt count; active jobs are attached, never duplicated.
  let jobAttempt = 1
  const { data: existingJob, error: existingJobError } = await supabase
    .from('ai_jobs')
    .select('id,status,attempts,max_attempts')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existingJobError) {
    return {
      success: false, served_from_cache: false, generation_reason: 'ERROR',
      version_number: targetVersionNum, hierarchy, content: null,
      metrics: {
        input_tokens: 0, output_tokens: 0, cached_tokens: 0, actual_cost_usd: 0,
        credits_deducted: 0, duration_ms: Date.now() - startTime,
        model_used: 'not-started', provider_used: 'database',
      },
      created_at: new Date().toISOString(),
      error: 'Could not verify the canonical generation job. No AI provider was called.',
      error_code: 'JOB_REGISTRATION_FAILED',
    }
  }

  if (existingJob && ['queued', 'running', 'processing', 'pending', 'validating'].includes(existingJob.status)) {
    return buildGenerationInProgressResult(hierarchy, targetVersionNum, existingJob.id, startTime)
  }

  if (existingJob && ['failed', 'cancelled'].includes(existingJob.status)) {
    const attempts = Number(existingJob.attempts || 0)
    const maxAttempts = Number(existingJob.max_attempts || 3)
    if (attempts >= maxAttempts) {
      return {
        success: false, served_from_cache: false, generation_reason: 'ERROR',
        version_number: targetVersionNum, hierarchy, content: null, job_id: existingJob.id,
        metrics: {
          input_tokens: 0, output_tokens: 0, cached_tokens: 0, actual_cost_usd: 0,
          credits_deducted: 0, duration_ms: Date.now() - startTime,
          model_used: 'not-started', provider_used: 'database',
        },
        created_at: new Date().toISOString(),
        error: 'The canonical generation job exhausted its retry limit. An administrator must reconcile it before another provider request.',
        error_code: 'GENERATION_RETRY_LIMIT',
      }
    }

    jobAttempt = attempts + 1
    const { data: retriedJob, error: retryError } = await supabase
      .from('ai_jobs')
      .update({
        status: 'running',
        attempts: jobAttempt,
        error: null,
        started_at: new Date().toISOString(),
        completed_at: null,
        progress_stage: 'Retrying canonical topic-pack generation...',
        step_percentage: 15,
      })
      .eq('id', existingJob.id)
      .in('status', ['failed', 'cancelled'])
      .select('id,attempts')
      .maybeSingle()

    if (retryError || !retriedJob) {
      const { data: currentJob } = await supabase.from('ai_jobs')
        .select('id,status')
        .eq('id', existingJob.id)
        .maybeSingle()
      if (currentJob && ['queued', 'running', 'processing', 'pending', 'validating'].includes(currentJob.status)) {
        return buildGenerationInProgressResult(hierarchy, targetVersionNum, currentJob.id, startTime)
      }
      return {
        success: false, served_from_cache: false, generation_reason: 'ERROR',
        version_number: targetVersionNum, hierarchy, content: null, job_id: existingJob.id,
        metrics: {
          input_tokens: 0, output_tokens: 0, cached_tokens: 0, actual_cost_usd: 0,
          credits_deducted: 0, duration_ms: Date.now() - startTime,
          model_used: 'not-started', provider_used: 'database',
        },
        created_at: new Date().toISOString(),
        error: 'Could not safely retry the existing canonical generation job.',
        error_code: 'JOB_RETRY_REGISTRATION_FAILED',
      }
    }
    jobId = retriedJob.id
  } else if (existingJob) {
    return {
      success: false, served_from_cache: false, generation_reason: 'ERROR',
      version_number: targetVersionNum, hierarchy, content: null, job_id: existingJob.id,
      metrics: {
        input_tokens: 0, output_tokens: 0, cached_tokens: 0, actual_cost_usd: 0,
        credits_deducted: 0, duration_ms: Date.now() - startTime,
        model_used: 'not-started', provider_used: 'database',
      },
      created_at: new Date().toISOString(),
      error: 'A canonical generation job already exists for this version but has no reusable output. Administrator reconciliation is required.',
      error_code: 'GENERATION_JOB_EXISTS',
    }
  } else {
    const { data: newJob, error: newJobError } = await supabase
      .from('ai_jobs')
      .insert({
        user_id: null,
        exam_id: exam.id,
        subject_id: subject.id,
        topic_id: topic.id,
        task: generationReason === 'FIRST_GENERATION' ? 'FIRST_GENERATION' : 'TOPIC_CONTENT_REFRESH',
        idempotency_key: idempotencyKey,
        priority: 5,
        status: 'running',
        attempts: 1,
        max_attempts: 3,
        progress_stage: 'Generating canonical high-yield content...',
        step_percentage: 15,
        input_payload: {
          exam: exam.name,
          subject: subject.name,
          topic: topic.name,
          subtopic: subtopicName || null,
          subtopic_id: subtopicId || null,
          difficulty,
          language,
          reason: generationReason,
          target_version: targetVersionNum,
          parent_job_id: parentJobId || null,
        },
        started_at: new Date().toISOString(),
      })
      .select('id,attempts')
      .maybeSingle()

    if (newJobError || !newJob) {
      const { data: conflictingJob } = await supabase
        .from('ai_jobs')
        .select('id,status')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (conflictingJob && ['queued', 'running', 'processing', 'pending', 'validating'].includes(conflictingJob.status)) {
        return buildGenerationInProgressResult(hierarchy, targetVersionNum, conflictingJob.id, startTime)
      }
      return {
        success: false, served_from_cache: false, generation_reason: 'ERROR',
        version_number: targetVersionNum, hierarchy, content: null, job_id: conflictingJob?.id,
        metrics: {
          input_tokens: 0, output_tokens: 0, cached_tokens: 0, actual_cost_usd: 0,
          credits_deducted: 0, duration_ms: Date.now() - startTime,
          model_used: 'not-started', provider_used: 'database',
        },
        created_at: new Date().toISOString(),
        error: 'Could not register a unique canonical generation job. No AI provider was called.',
        error_code: 'JOB_REGISTRATION_FAILED',
      }
    }
    jobId = newJob.id
  }

  // 2. Build Generation Prompt with Deduplication Guardrails
  const existingStemsNormalized = new Set(existingDbMcqs.map((m: any) => normalizeQuestionStem(m.question)))
  const existingSummaries = existingDbMcqs
    .slice(0, 15)
    .map((m: any, idx: number) => `${idx + 1}. ${m.question.slice(0, 90)}...`)
    .join('\n')

  const examCountry = exam.countries?.name || exam.metadata?.exam_intelligence?.country || 'Global'
  const examCategory = exam.exam_categories?.name || exam.metadata?.exam_intelligence?.exam_category || 'General Academic/Professional'
  const questionStyle = exam.question_types ? JSON.stringify(exam.question_types) : 'standard_mcq'

  // Fetch verified domain persona, exam style, and question patterns (e.g. Engineering, Law, Finance, Medicine, IT, General)
  const styleAndPattern = await getExamStyleAndPattern(exam.id, supabase)

  const prompt = `You are ${styleAndPattern.role} for NeoMCQ.com.
TASK: ${generationReason === 'FIRST_GENERATION' ? 'GENERATE FIRST-TIME HIGH-YIELD CANONICAL ASSETS' : 'SCHEDULED HIGH-YIELD REFRESH UPDATE'}

CANONICAL TARGET SCOPE:
- Canonical Exam: ${exam.name}
- Jurisdiction / Country: ${examCountry}
- Discipline / Category: ${examCategory}
- Domain / Field: ${styleAndPattern.domain.toUpperCase()} (Worldwide Coverage: Engineering, Law, Finance, Business, Civil Services, Medicine, IT, Architecture, Agriculture, Languages, or Sciences)
- Question Format / Pattern: ${questionStyle}
- Exam Style & Question Rules: ${styleAndPattern.styleDescription}
- Notes Curriculum Focus: ${styleAndPattern.notesInstruction}
- Marking Scheme: ${styleAndPattern.markingSchemeInstruction}
- Canonical Subject: ${subject.name}
- Canonical Topic: ${topic.name}
${subtopicName ? `- Focused Subtopic: ${subtopicName}` : '- Subtopic: Comprehensive Topic Coverage'}
- Available Subtopics: ${allowedSubtopicNames.length ? allowedSubtopicNames.join(', ') : 'No separate subtopic list is configured'}
- Target Difficulty: ${difficulty}
- Language: ${language}

CRITICAL RULES:
1. STRICT MULTI-DISCIPLINE FIDELITY: NeoMCQ is a global platform supporting all academic and professional examination boards worldwide. You MUST adapt question stems, distractors, notes, and pearls strictly to ${exam.name}'s specific domain (${styleAndPattern.domain}). Never generate medical clinical vignettes for an engineering, law, finance, or general exam; never generate engineering formulas for a medical or law exam.
2. STRICT SCOPE CONSTRAINT: Generate content strictly within the bounds of ${subtopicName ? `"${subtopicName}" under topic "${topic.name}"` : `"${topic.name}"`} in "${subject.name}" for "${exam.name}".
3. ZERO DUPLICATE QUESTIONS:
${existingSummaries ? `Existing questions in database (DO NOT REWRITE OR DUPLICATE):\n${existingSummaries}\n` : 'No prior questions in database.'}
4. Fill-in-the-blanks are a required deliverable: generate 8–12 items. Every sentence must contain exactly one literal [BLANK] token, and the canonical answer must not appear elsewhere in that sentence. Include the canonical answer plus valid synonyms in acceptedAnswers. Assign subtopicName to an exact name from Available Subtopics; if this request targets one subtopic, use that exact name.
5. Generate at least 10 MCQs (enough for two quizzes with at least 5 each), 10 flashcards, 3 sticky notes and 1 whiteboard lesson phase. The tutor explanation and 60-second revision sheet must each contain at least 100 useful characters. Do not return empty arrays for required learning assets.
6. REQUIRED JSON STRUCTURE:
{
  "mcqs": [
    {
      "question": "Clear, high-yield exam question stem tailored strictly to ${exam.name} (${styleAndPattern.domain})",
      "options": ["Option A choice", "Option B choice", "Option C choice", "Option D choice"],
      "correct_index": 0,
      "explanation": "Detailed rationale explaining why the correct choice is accurate and why distractors are incorrect according to authoritative standards.",
      "clinical_pearl": "High-yield memory takeaway, key formula, diagnostic rule, statutory distinction, or core rule of thumb",
      "high_yield_tag": "${subtopicName || topic.name} - Core Principle",
      "difficulty": "${difficulty}"
    }
  ],
  "notes": "# 📚 ${(subtopicName || topic.name).toUpperCase()} — COMPREHENSIVE GUIDE\\nDetailed structured markdown notes formatted for A4 printing with clear headings, theoretical principles, comparative tables, and exam pearls...",
  "flashcards": [
    {
      "front": "Active recall question",
      "back": "Concise high-yield answer",
      "category": "${subject.name}",
      "difficulty": "High Yield"
    }
  ],
  "sticky_notes": [
    {
      "text": "High-yield pearl, formula, or exam trap to remember",
      "color": "amber",
      "category": "Exam Pearls"
    }
  ],
  "fill_in_the_blanks": [
    {
      "sentence": "The key exam principle for [BLANK] is tested using this exact statement.",
      "blank": "Canonical answer",
      "acceptedAnswers": ["Canonical answer", "Accepted synonym", "Common abbreviation"],
      "concept": "${subtopicName || topic.name}",
      "subtopicName": "${subtopicName || 'Exact subtopic name from Available Subtopics'}",
      "explanation": "Why the canonical answer is correct.",
      "highYieldPoint": "The exam rule to remember.",
      "memoryHook": "A concise mnemonic or association.",
      "examTip": "A common distractor or confusion to avoid.",
      "difficulty": "High Yield"
    }
  ],
  "whiteboard_phases": [
    {
      "phase": 1,
      "title": "1. Foundational Architecture & Core Mechanisms",
      "diagram": "Step-by-step pathway, flowchart, or concept diagram",
      "description": "Clear conceptual breakdown of the primary principle",
      "badge": "Core Theory"
    }
  ],
  "tutor_explanation": "Friendly, step-by-step master tutor breakdown with domain-appropriate analogies...",
  "revision_sheet": "⚡ 60-SECOND RAPID REVISION SHEET..."
}

Generate high-yield MCQs, comprehensive A4 notes, flashcards, sticky notes, fill in the blanks, and whiteboard lesson phases tailored specifically to ${exam.name}. Respond strictly in valid JSON format.`

  // 3. Execute through the central AI Gateway. The gateway owns the atomic
  // platform-budget reservation, provider failover, cost settlement and audit trail.
  let generationOutput: any = null
  const generationRequestId = `${jobId}:attempt:${jobAttempt}`
  try {
    generationOutput = await executeMultiProviderGeneration(
      prompt,
      'MCQ_GENERATION',
      jobId as string,
      generationRequestId,
      {
        examId: exam.id,
        subjectId: subject.id,
        topicId: topic.id,
        subtopicId: subtopicId || null,
        targetVersion: targetVersionNum,
        canonicalIdempotencyKey: idempotencyKey,
        parentJobId: parentJobId || null,
      }
    )
  } catch (genError: any) {
    const message = String(genError?.message || 'AI generation failed.')
    if (jobId) {
      await supabase.from('ai_jobs').update({
        status: 'failed',
        error: message.slice(0, 1500),
        completed_at: new Date().toISOString(),
      }).eq('id', jobId)
    }

    const budgetBlocked = /budget|reservation denied|not funded/i.test(message)
    return {
      success: false,
      served_from_cache: false,
      generation_reason: 'ERROR',
      version_number: targetVersionNum,
      hierarchy,
      content: null,
      job_id: jobId || undefined,
      metrics: {
        input_tokens: 0,
        output_tokens: 0,
        cached_tokens: 0,
        actual_cost_usd: 0,
        credits_deducted: 0,
        duration_ms: Date.now() - startTime,
        model_used: 'not-started',
        provider_used: 'ai-gateway',
      },
      created_at: new Date().toISOString(),
      error: budgetBlocked
        ? 'Platform AI budget is not available for this shared topic pack.'
        : `AI generation temporarily unavailable: ${message}`,
      error_code: budgetBlocked ? 'AI_BUDGET_BLOCKED' : 'PROVIDER_EXHAUSTED',
      retry_after: budgetBlocked ? 60 : 30,
    }
  }

  const { rawPayload, providerUsed, modelUsed, inputTokens, outputTokens, costUsd } = generationOutput

  // 4. Validate Generated Content
  const validation = validateGeneratedContent(rawPayload, topic.name, subject.name, existingStemsNormalized, allowedSubtopicNames)
  if (!validation.isValid) {
    if (jobId) {
      await supabase
        .from('ai_jobs')
        .update({
          status: 'failed',
          error: 'Generated payload failed structural validation checks.',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }

    return {
      success: false,
      served_from_cache: false,
      generation_reason: 'ERROR',
      version_number: targetVersionNum,
      hierarchy,
      content: null,
      metrics: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cached_tokens: 0,
        actual_cost_usd: costUsd,
        credits_deducted: 0,
        duration_ms: Date.now() - startTime,
        model_used: modelUsed,
        provider_used: providerUsed,
      },
      created_at: new Date().toISOString(),
      error: 'Generated content did not meet minimum validation quality requirements.',
      error_code: 'VALIDATION_FAILED',
    }
  }

  const finalPayload = validation.payload

  // 5. Atomic Database Persistence (Append-Only & Version Record)
  let contentVersionId: string | null = null
  let flashcardDeckId: string | null = null
  let previousCurrentDeckIds: string[] = []

  try {
    // 5a. Insert MCQs into mcqs table
    if (finalPayload.mcqs.length > 0) {
      const mcqRows = finalPayload.mcqs.map((m, idx) => ({
        exam_id: exam.id,
        subject_id: subject.id,
        topic_id: topic.id,
        question: m.question,
        options: m.options,
        correct_answer: m.options[m.correct_index] || m.options[0] || 'Option A',
        explanation: m.explanation,
        clinical_pearl: m.clinical_pearl || null,
        difficulty: m.difficulty || difficulty,
        question_type: 'single_choice',
        status: 'approved',
        visibility: 'PUBLIC_CANONICAL',
        answer_visibility: 'AFTER_ATTEMPT',
        slug: `${topic.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${idx}`,
        version: targetVersionNum,
        ai_generated: true,
        ai_provider: providerUsed,
        ai_model: modelUsed,
        metadata: {
          subtopic: subtopicName || null,
          subtopic_id: subtopicId || null,
          high_yield_tag: m.high_yield_tag || null,
        },
        tags: subtopicName ? [subtopicName, topic.name, subject.name] : [topic.name, subject.name],
      }))

      const { error: mcqInsertError } = await supabase.from('mcqs').insert(mcqRows)
      if (mcqInsertError) throw new Error(`Failed to persist generated MCQs: ${mcqInsertError.message}`)
    }

    // 5b. Insert Notes into notes table
    if (finalPayload.notes) {
      const { error: notesInsertError } = await supabase.from('notes').insert({
        exam_id: exam.id,
        subject_id: subject.id,
        topic_id: topic.id,
        title: `${subtopicName ? `${subtopicName} (${topic.name})` : topic.name} — Comprehensive Guide (v${targetVersionNum})`,
        content: finalPayload.notes,
        note_type: 'high_yield',
        status: 'approved',
        version: targetVersionNum,
        ai_generated: true,
        ai_provider: providerUsed,
        ai_model: modelUsed,
      })
      if (notesInsertError) throw new Error(`Failed to persist generated notes: ${notesInsertError.message}`)
    }

    // 5c. Persist one shared, versioned flashcard deck and attach every canonical card to it.
    if (finalPayload.flashcards.length > 0) {
      let previousDeckQuery = supabase
        .from('flashcard_decks')
        .select('id')
        .eq('topic_id', topic.id)
        .eq('is_current', true)
      if (subtopicId) previousDeckQuery = previousDeckQuery.eq('subtopic_id', subtopicId)
      else previousDeckQuery = previousDeckQuery.is('subtopic_id', null)

      const { data: previousDecks, error: previousDeckError } = await previousDeckQuery
      if (previousDeckError) throw new Error(`Could not resolve the previous flashcard deck: ${previousDeckError.message}`)
      previousCurrentDeckIds = (previousDecks || []).map((deck: any) => deck.id)

      if (previousCurrentDeckIds.length > 0) {
        const { error: deactivateError } = await supabase
          .from('flashcard_decks')
          .update({ is_current: false, updated_at: new Date().toISOString() })
          .in('id', previousCurrentDeckIds)
        if (deactivateError) throw new Error(`Could not archive the previous flashcard deck: ${deactivateError.message}`)
      }

      const { data: deckRow, error: deckInsertError } = await supabase
        .from('flashcard_decks')
        .insert({
          title: `${subtopicName || topic.name} — Flashcards (v${targetVersionNum})`,
          description: `Shared canonical flashcards for ${exam.name} · ${subject.name} · ${topic.name}`,
          exam_id: exam.id,
          subject_id: subject.id,
          topic_id: topic.id,
          subtopic_id: subtopicId || null,
          card_count: finalPayload.flashcards.length,
          status: 'approved',
          version: String(targetVersionNum),
          version_num: targetVersionNum,
          is_current: true,
          generation_metadata: { source: 'ai-content-intelligence', version: targetVersionNum, provider: providerUsed, model: modelUsed },
        })
        .select('id')
        .single()

      if (deckInsertError || !deckRow?.id) {
        throw new Error(`Failed to persist canonical flashcard deck: ${deckInsertError?.message || 'No deck ID returned'}`)
      }
      flashcardDeckId = deckRow.id

      const flashRows = finalPayload.flashcards.map((f, idx) => ({
        deck_id: flashcardDeckId,
        exam_id: exam.id,
        subject_id: subject.id,
        topic_id: topic.id,
        subtopic_id: subtopicId || null,
        front: f.front,
        back: f.back,
        explanation: (f as any).explanation || null,
        high_yield_pearl: (f as any).high_yield_pearl || (f as any).clinical_pearl || null,
        clinical_correlation: (f as any).clinical_correlation || null,
        reference_notes: (f as any).reference_notes || null,
        difficulty: normalizePersistedFlashcardDifficulty(f.difficulty || difficulty),
        card_index: idx + 1,
        status: 'approved',
        version: targetVersionNum,
        ai_generated: true,
      }))

      const { error: flashcardsInsertError } = await supabase.from('flashcards').insert(flashRows)
      if (flashcardsInsertError) throw new Error(`Failed to persist generated flashcards: ${flashcardsInsertError.message}`)
    }

    // 5d. Insert Revision Sheets
    if (finalPayload.revision_sheet) {
      try {
        const { error: revisionSheetError } = await supabase.from('revision_sheets').insert({
          exam_id: exam.id,
          subject_id: subject.id,
          topic_id: topic.id,
          title: `60s Revision — ${subtopicName || topic.name} (v${targetVersionNum})`,
          content: finalPayload.revision_sheet,
          status: 'approved',
        })
        if (revisionSheetError) console.warn('[AI Content Intelligence] Revision sheet was not persisted:', revisionSheetError.message)
      } catch (revisionSheetError) {
        console.warn('[AI Content Intelligence] Revision sheet persistence failed:', revisionSheetError)
      }
    }

    // 5e. Save Content Version in content_versions
    const { data: versionData, error: versionInsertError } = await supabase
      .from('content_versions')
      .insert({
        asset_id: topic.id,
        asset_type: 'topic',
        version: targetVersionNum,
        // Match the live content_versions schema: created_by exists; requested_by,
        // is_current, and generation_reason do not.
        created_by: userId || null,
        snapshot: {
          exam_id: exam.id,
          exam_name: exam.name,
          subject_id: subject.id,
          subject_name: subject.name,
          topic_id: topic.id,
          topic_name: topic.name,
          subtopic_id: subtopicId || null,
          subtopic_name: subtopicName || null,
          generation_reason: generationReason,
          model_id: modelUsed,
          provider: providerUsed,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          actual_cost_usd: costUsd,
          quality_score: finalPayload.quality_score,
          mcqs: finalPayload.mcqs,
          quiz_a: finalPayload.quiz_a,
          quiz_b: finalPayload.quiz_b,
          notes: finalPayload.notes,
          flashcards: finalPayload.flashcards,
          sticky_notes: finalPayload.sticky_notes,
          fill_in_the_blanks: finalPayload.fill_in_the_blanks,
          whiteboard_phases: finalPayload.whiteboard_phases,
          tutor_explanation: finalPayload.tutor_explanation,
          revision_sheet: finalPayload.revision_sheet,
        },
        change_summary: `${generationReason === 'FIRST_GENERATION' ? 'Initial Canonical Asset Generation' : 'Authorised Canonical Refresh'} (Version ${targetVersionNum})`,
      })
      .select('id')
      .maybeSingle()

    if (versionInsertError || !versionData?.id) {
      throw new Error(`Failed to persist content version: ${versionInsertError?.message || 'No version ID returned'}`)
    }
    contentVersionId = versionData.id

    // 5h. Mark Job as Completed in ai_jobs
    if (jobId) {
      const { error: jobUpdateError } = await supabase
        .from('ai_jobs')
        .update({
          status: 'completed',
          progress_stage: 'Completed successfully',
          step_percentage: 100,
          completed_at: new Date().toISOString(),
          output_payload: {
            mcqs_count: finalPayload.mcqs.length,
            notes_length: finalPayload.notes.length,
            flashcards_count: finalPayload.flashcards.length,
            version: targetVersionNum,
            quality_score: finalPayload.quality_score,
            content_version_id: contentVersionId,
          },
          credits_consumed: 0,
        })
        .eq('id', jobId)
      if (jobUpdateError) console.error('[AI Content Intelligence] Content was saved but the job status could not be updated:', jobUpdateError)
    }
  } catch (saveErr) {
    console.error('[AI Content Intelligence] Database persistence failed:', saveErr)

    // Remove partial rows from this generation so a retry cannot mistake incomplete content for a valid cache.
    const cleanupResults = await Promise.all([
      supabase.from('mcqs').delete().eq('topic_id', topic.id).eq('version', targetVersionNum).eq('ai_generated', true),
      supabase.from('notes').delete().eq('topic_id', topic.id).eq('version', targetVersionNum).eq('ai_generated', true),
      supabase.from('flashcards').delete().eq('topic_id', topic.id).eq('version', targetVersionNum).eq('ai_generated', true),
      ...(flashcardDeckId ? [supabase.from('flashcard_decks').delete().eq('id', flashcardDeckId)] : []),
      supabase.from('revision_sheets').delete().eq('topic_id', topic.id).eq('title', `60s Revision — ${topic.name} (v${targetVersionNum})`),
      supabase.from('content_versions').delete().eq('asset_id', topic.id).eq('asset_type', 'topic').eq('version', targetVersionNum),
    ])
    for (const cleanupResult of cleanupResults) {
      if (cleanupResult.error) console.error('[AI Content Intelligence] Partial-write cleanup failed:', cleanupResult.error)
    }
    if (previousCurrentDeckIds.length > 0) {
      const { error: restoreDeckError } = await supabase
        .from('flashcard_decks')
        .update({ is_current: true, updated_at: new Date().toISOString() })
        .in('id', previousCurrentDeckIds)
      if (restoreDeckError) console.error('[AI Content Intelligence] Previous flashcard deck restore failed:', restoreDeckError)
    }

    if (jobId) {
      const { error: failedJobError } = await supabase
        .from('ai_jobs')
        .update({
          status: 'failed',
          progress_stage: 'Content persistence failed',
          step_percentage: 100,
          error: 'Generated content could not be saved reliably. Please retry shortly.',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)
      if (failedJobError) console.error('[AI Content Intelligence] Could not mark failed job:', failedJobError)
    }
    return {
      success: false,
      served_from_cache: false,
      generation_reason: generationReason,
      version_number: targetVersionNum,
      hierarchy,
      content: null,
      job_id: jobId || undefined,
      metrics: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cached_tokens: 0,
        actual_cost_usd: costUsd,
        credits_deducted: 0,
        duration_ms: Date.now() - startTime,
        model_used: modelUsed,
        provider_used: providerUsed,
      },
      created_at: new Date().toISOString(),
      error: 'Generated content could not be saved reliably. Please retry shortly.',
      error_code: 'PERSISTENCE_FAILED',
    }
  }

  const duration = Date.now() - startTime

  return {
    success: true,
    served_from_cache: false,
    generation_reason: generationReason,
    version_number: targetVersionNum,
    hierarchy,
    content: finalPayload,
    job_id: jobId || undefined,
    metrics: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_tokens: 0,
      actual_cost_usd: costUsd,
      credits_deducted: 0,
      duration_ms: duration,
      model_used: modelUsed,
      provider_used: providerUsed,
    },
    created_at: new Date().toISOString(),
  }
}
