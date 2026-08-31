import { getSupabaseAdmin } from '../../supabase/admin.ts'
import { normalizeInput, calculateLevenshteinSimilarity } from '../../knowledge/normalizer.ts'
import { classifyUserInput } from '../../knowledge/classifier.ts'
import { AIGateway } from '../../ai/ai-gateway.ts'
import {
  ExamIntelligenceResultSchema,
} from './types.ts'
import type {
  ExamIntelligenceResult,
  EntityType,
  IntelligenceDecision,
  ResolveExamOptions,
  ResolveSubjectOptions,
  ResolveTopicOptions,
  ResolveSubtopicOptions,
} from './types.ts'

export * from './types.ts'
export * from './engine.ts'

/**
 * Server-only assertion
 */
if (typeof window !== 'undefined') {
  throw new Error('ExamIntelligence Service must only be imported in server-side contexts.')
}

/**
 * Helper to build standard result
 */
function buildResult(
  entityType: EntityType,
  decision: IntelligenceDecision,
  canonicalId: string | null,
  confidence: number,
  reason: string,
  examId: string | null = null,
  subjectId: string | null = null,
  topicId: string | null = null,
  subtopicId: string | null = null
): ExamIntelligenceResult {
  const result: ExamIntelligenceResult = {
    entity_type: entityType,
    decision,
    canonical_id: canonicalId,
    confidence: Math.max(0, Math.min(1, confidence)),
    reason,
    exam_id: examId,
    subject_id: subjectId,
    topic_id: topicId,
    subtopic_id: subtopicId,
  }

  return ExamIntelligenceResultSchema.parse(result)
}

/**
 * SECTION 3: EXAM RESOLUTION
 * Resolves whether an requested exam exists globally (exact/normalized/alias/semantic)
 * or is a valid new exam, or invalid.
 */
export async function resolveExam(options: ResolveExamOptions): Promise<ExamIntelligenceResult> {
  const { examInput } = options
  const supabase = getSupabaseAdmin()

  if (!examInput || typeof examInput !== 'string' || !examInput.trim()) {
    return buildResult('EXAM', 'INVALID', null, 1.0, 'Exam name input is empty or missing.')
  }

  const norm = normalizeInput(examInput)
  if (!norm.canonical || norm.canonical.length < 2) {
    return buildResult('EXAM', 'INVALID', null, 1.0, `Exam input '${examInput}' is invalid or too short.`)
  }

  // Check classification
  const classification = classifyUserInput(examInput)
  if (classification.type === 'COUNTRY' && !classification.isCurricularValid) {
    return buildResult(
      'EXAM',
      'INVALID',
      null,
      0.99,
      `'${examInput}' is a country or geographical name, not an examination.`
    )
  }

  // 1. Deterministic DB Check: Exact Match (Name or Slug or Short Name)
  try {
    const { data: exactExams } = await supabase
      .from('exams')
      .select('id, name, slug, short_name, normalized_name')
      .or(`slug.eq.${norm.slug},name.ilike.${norm.canonical},short_name.ilike.${norm.canonical}`)
      .limit(5)

    if (exactExams && exactExams.length > 0) {
      const match = exactExams.find(
        (e: any) => e.slug === norm.slug || e.name.toLowerCase().trim() === norm.canonical || (e.short_name && e.short_name.toLowerCase().trim() === norm.canonical)
      ) || exactExams[0]

      const isExact = match.name.toLowerCase().trim() === examInput.toLowerCase().trim() || match.slug === norm.slug || (match.short_name && match.short_name.toLowerCase().trim() === examInput.toLowerCase().trim())
      return buildResult(
        'EXAM',
        isExact ? 'EXACT_MATCH' : 'NORMALIZED_MATCH',
        match.id,
        1.0,
        `Matched canonical global exam '${match.name}' (${match.slug}).`,
        match.id
      )
    }
  } catch (err) {
    console.warn('[Exam Intelligence] DB check exact match error:', err)
  }

  // 2. Deterministic DB Check: Exam Aliases
  try {
    const { data: aliasMatch } = await supabase
      .from('exam_aliases')
      .select('exam_id, alias, exams(id, name, slug, short_name)')
      .ilike('alias', norm.canonical)
      .maybeSingle()

    if (aliasMatch && aliasMatch.exams) {
      const exam = aliasMatch.exams as any
      return buildResult(
        'EXAM',
        'ALIAS_MATCH',
        exam.id,
        0.95,
        `Matched known alias '${aliasMatch.alias}' for canonical exam '${exam.name}'.`,
        exam.id
      )
    }
  } catch (err) {
    console.warn('[Exam Intelligence] DB check alias error:', err)
  }

  // 3. AI Semantic Evaluation & Validation
  try {
    // Fetch list of active exams for context
    const { data: activeExams } = await supabase
      .from('exams')
      .select('id, name, slug, short_name')
      .neq('status', 'archived')
      .limit(100)

    const examListStr = (activeExams || [])
      .map((e: any) => `- ID: ${e.id} | Name: "${e.name}" | Short: "${e.short_name || ''}" | Slug: "${e.slug}"`)
      .join('\n')

    const prompt = `You are the Lead Curriculum Intelligence Officer for NeoMCQ.
Your task is to evaluate whether the requested exam string "${examInput}" matches an existing global exam, is a valid new exam, or is invalid.

EXISTING CANONICAL EXAMS IN DATABASE:
${examListStr || 'No exams currently in database.'}

REQUESTED EXAM TO EVALUATE: "${examInput}"

DECISION CRITERIA:
1. SEMANTIC_MATCH: The requested exam refers to one of the EXISTING CANONICAL EXAMS above (e.g. "Foreign Medical Graduate Examination" -> FMGE, "Step 1" -> USMLE Step 1, "USMLE 1" -> USMLE Step 1).
   Provide canonical_id and exam_id as the matching exam's ID.
2. VALID_NEW: The requested exam is a genuine medical, professional, or academic examination that does NOT exist in the database above (e.g. "MRCP Part 1", "AMC CAT Exam", "MCCQE Part I").
   Set canonical_id: null, exam_id: null.
3. INVALID: The input is not a real exam (e.g., country name alone like "India", random text like "Shopping List", "12345", or non-exam subjects like "Income Tax").
   Set canonical_id: null, exam_id: null.

Return ONLY a JSON object adhering to this schema:
{
  "entity_type": "EXAM",
  "decision": "SEMANTIC_MATCH" | "VALID_NEW" | "INVALID",
  "canonical_id": string or null,
  "confidence": number between 0.0 and 1.0,
  "reason": "Detailed explanation for decision",
  "exam_id": string or null,
  "subject_id": null,
  "topic_id": null
}`

    const aiRes = await AIGateway.generate({
      taskType: 'ENTITY_RESOLUTION',
      userId: null, // $0 user credit deduction
      prompt,
      systemInstruction: 'You are a strict curriculum canonicalization AI engine. Respond ONLY in valid JSON matching the requested schema.',
      temperature: 0.1,
      responseMimeType: 'application/json',
    })

    const parsed = aiRes.parsedJson || JSON.parse(aiRes.text || '{}')
    const validated = ExamIntelligenceResultSchema.safeParse(parsed)

    if (validated.success) {
      return validated.data
    }
  } catch (err) {
    console.warn('[Exam Intelligence] AI semantic resolution error:', err)
  }

  // Fallback if AI resolution is inconclusive
  return buildResult(
    'EXAM',
    'NEEDS_REVIEW',
    null,
    0.5,
    `Unable to deterministically classify exam '${examInput}'. Queued for manual curriculum review.`
  )
}

/**
 * SECTION 4: SUBJECT RESOLUTION
 * Resolves subject under exam (exact/normalized/alias/semantic/valid new/invalid)
 */
export async function resolveSubject(options: ResolveSubjectOptions): Promise<ExamIntelligenceResult> {
  const { examInput, subjectInput } = options
  const supabase = getSupabaseAdmin()

  if (!subjectInput || typeof subjectInput !== 'string' || !subjectInput.trim()) {
    return buildResult('SUBJECT', 'INVALID', null, 1.0, 'Subject input is empty or missing.')
  }

  const normSubj = normalizeInput(subjectInput)
  if (!normSubj.canonical || normSubj.canonical.length < 2) {
    return buildResult('SUBJECT', 'INVALID', null, 1.0, `Subject input '${subjectInput}' is invalid or too short.`)
  }

  // Check country metadata
  const classification = classifyUserInput(subjectInput)
  if (classification.type === 'COUNTRY' && !classification.isCurricularValid) {
    return buildResult(
      'SUBJECT',
      'INVALID',
      null,
      0.99,
      `'${subjectInput}' is country/geographical metadata, not an academic subject.`
    )
  }

  // 1. Resolve Exam Context First
  const examRes = await resolveExam({ examInput })
  if (examRes.decision === 'INVALID') {
    return buildResult(
      'SUBJECT',
      'INVALID',
      null,
      1.0,
      `Cannot resolve subject '${subjectInput}': Exam '${examInput}' is invalid (${examRes.reason}).`
    )
  }

  const examId = examRes.exam_id

  // 2. Deterministic DB Check for Subject if examId exists
  if (examId) {
    try {
      const { data: examSubjects } = await supabase
        .from('exam_subjects')
        .select('id, exam_id, name, slug')
        .eq('exam_id', examId)
        .limit(100)

      if (examSubjects && examSubjects.length > 0) {
        const rawInputNorm = subjectInput.toLowerCase().trim()
        const normCanon = normSubj.canonical.toLowerCase().trim()

        const match = examSubjects.find((s: any) => {
          const sName = (s.name || '').toLowerCase().trim()
          const sSlug = (s.slug || '').toLowerCase().trim()
          return (
            sName === rawInputNorm ||
            sName === normCanon ||
            sSlug === normSubj.slug ||
            sSlug === normSubj.slug.replace(/-and-/g, '-&-') ||
            sName.includes(normCanon) ||
            normCanon.includes(sName)
          )
        })

        if (match) {
          const isExact = (match.name || '').toLowerCase().trim() === rawInputNorm
          return buildResult(
            'SUBJECT',
            isExact ? 'EXACT_MATCH' : 'NORMALIZED_MATCH',
            match.id,
            1.0,
            `Matched canonical subject '${match.name}' under exam '${examInput}'.`,
            examId,
            match.id
          )
        }
      }
    } catch (err) {
      console.warn('[Exam Intelligence] DB subject check error:', err)
    }

    // Check subject_aliases
    try {
      const { data: aliasMatch } = await supabase
        .from('subject_aliases')
        .select('subject_id, alias, exam_subjects(id, exam_id, name, slug)')
        .ilike('alias', normSubj.canonical)
        .limit(5)

      if (aliasMatch && aliasMatch.length > 0) {
        const matchForExam = aliasMatch.find((a: any) => a.exam_subjects && a.exam_subjects.exam_id === examId)
        if (matchForExam && matchForExam.exam_subjects) {
          const subj = matchForExam.exam_subjects as any
          return buildResult(
            'SUBJECT',
            'ALIAS_MATCH',
            subj.id,
            0.95,
            `Matched known subject alias '${aliasMatch[0].alias}' for '${subj.name}'.`,
            examId,
            subj.id
          )
        }
      }
    } catch (err) {
      console.warn('[Exam Intelligence] DB subject alias check error:', err)
    }
  }

  // 3. AI Semantic Evaluation & Exam Relevance Validation
  try {
    let existingSubjListStr = 'None'
    if (examId) {
      const { data: existingSubjs } = await supabase
        .from('exam_subjects')
        .select('id, name, slug')
        .eq('exam_id', examId)
        .limit(50)

      if (existingSubjs && existingSubjs.length > 0) {
        existingSubjListStr = existingSubjs.map((s: any) => `- ID: ${s.id} | Name: "${s.name}"`).join('\n')
      }
    }

    const prompt = `You are the Lead Curriculum Intelligence Officer for NeoMCQ.
Evaluate requested subject "${subjectInput}" under Exam "${examInput}".

EXISTING SUBJECTS UNDER THIS EXAM IN DATABASE:
${existingSubjListStr}

REQUESTED SUBJECT TO EVALUATE: "${subjectInput}"

DECISION CRITERIA:
1. SEMANTIC_MATCH: The requested subject refers to one of the EXISTING SUBJECTS listed above (e.g. "Cardio" -> Cardiology, "ObGyn" -> Obstetrics and Gynecology).
   Provide canonical_id and subject_id as the matching subject's ID.
2. VALID_NEW: The requested subject is a valid, legitimate academic/medical subject for the exam "${examInput}", but is not currently listed above (e.g. "Medical Genetics" for a medical exam).
   Set canonical_id: null, subject_id: null.
3. INVALID: The requested subject is NOT relevant to the "${examInput}" curriculum (e.g. FMGE → "Income Tax", FMGE → "Taxation", FMGE → "Real Estate Law"), or is gibberish/country metadata.
   Set canonical_id: null, subject_id: null. Provide clear reason explaining irrelevance.

Return ONLY a JSON object adhering to this schema:
{
  "entity_type": "SUBJECT",
  "decision": "SEMANTIC_MATCH" | "VALID_NEW" | "INVALID",
  "canonical_id": string or null,
  "confidence": number between 0.0 and 1.0,
  "reason": "Detailed explanation for decision",
  "exam_id": "${examId || ''}" or null,
  "subject_id": string or null,
  "topic_id": null
}`

    const aiRes = await AIGateway.generate({
      taskType: 'ENTITY_RESOLUTION',
      userId: null, // $0 user credit deduction
      prompt,
      systemInstruction: 'You are a strict curriculum canonicalization AI engine. Respond ONLY in valid JSON matching the requested schema.',
      temperature: 0.1,
      responseMimeType: 'application/json',
    })

    const parsed = aiRes.parsedJson || JSON.parse(aiRes.text || '{}')
    const validated = ExamIntelligenceResultSchema.safeParse(parsed)

    if (validated.success) {
      return {
        ...validated.data,
        exam_id: examId || validated.data.exam_id,
      }
    }
  } catch (err) {
    console.warn('[Exam Intelligence] AI subject resolution error:', err)
  }

  return buildResult(
    'SUBJECT',
    'NEEDS_REVIEW',
    null,
    0.5,
    `Unable to deterministically validate subject '${subjectInput}' under exam '${examInput}'.`,
    examId
  )
}

/**
 * SECTION 5: TOPIC RESOLUTION
 * Resolves topic under exam + subject (exact/normalized/alias/semantic/valid new/invalid)
 */
export async function resolveTopic(options: ResolveTopicOptions): Promise<ExamIntelligenceResult> {
  const { examInput, subjectInput, topicInput } = options
  const supabase = getSupabaseAdmin()

  if (!topicInput || typeof topicInput !== 'string' || !topicInput.trim()) {
    return buildResult('TOPIC', 'INVALID', null, 1.0, 'Topic input is empty or missing.')
  }

  const normTopic = normalizeInput(topicInput)
  if (!normTopic.canonical || normTopic.canonical.length < 2) {
    return buildResult('TOPIC', 'INVALID', null, 1.0, `Topic input '${topicInput}' is invalid or too short.`)
  }

  // Check country metadata
  const classification = classifyUserInput(topicInput)
  if (classification.type === 'COUNTRY' && !classification.isCurricularValid) {
    return buildResult(
      'TOPIC',
      'INVALID',
      null,
      0.99,
      `'${topicInput}' is country/geographical metadata, not a curriculum topic.`
    )
  }

  // 1. Resolve Subject Context First
  const subjectRes = await resolveSubject({ examInput, subjectInput })
  if (subjectRes.decision === 'INVALID') {
    return buildResult(
      'TOPIC',
      'INVALID',
      null,
      1.0,
      `Cannot resolve topic '${topicInput}': Subject '${subjectInput}' or Exam '${examInput}' is invalid (${subjectRes.reason}).`
    )
  }

  const examId = subjectRes.exam_id
  const subjectId = subjectRes.subject_id

  // 2. Deterministic DB Check for Topic if subjectId exists
  if (subjectId) {
    try {
      const { data: subjectTopics } = await supabase
        .from('exam_topics')
        .select('id, subject_id, name, slug')
        .eq('subject_id', subjectId)
        .limit(100)

      if (subjectTopics && subjectTopics.length > 0) {
        const rawInputNorm = topicInput.toLowerCase().trim()
        const normCanon = normTopic.canonical.toLowerCase().trim()

        const match = subjectTopics.find((t: any) => {
          const tName = (t.name || '').toLowerCase().trim()
          const tSlug = (t.slug || '').toLowerCase().trim()
          return (
            tName === rawInputNorm ||
            tName === normCanon ||
            tSlug === normTopic.slug ||
            tSlug === normTopic.slug.replace(/-and-/g, '-&-') ||
            tName.includes(normCanon) ||
            normCanon.includes(tName)
          )
        })

        if (match) {
          const isExact = (match.name || '').toLowerCase().trim() === rawInputNorm
          return buildResult(
            'TOPIC',
            isExact ? 'EXACT_MATCH' : 'NORMALIZED_MATCH',
            match.id,
            1.0,
            `Matched canonical topic '${match.name}' under subject '${subjectInput}' / exam '${examInput}'.`,
            examId,
            subjectId,
            match.id
          )
        }
      }
    } catch (err) {
      console.warn('[Exam Intelligence] DB topic check error:', err)
    }

    // Check topic_aliases
    try {
      const { data: aliasMatch } = await supabase
        .from('topic_aliases')
        .select('topic_id, alias, exam_topics(id, subject_id, name, slug)')
        .ilike('alias', normTopic.canonical)
        .limit(5)

      if (aliasMatch && aliasMatch.length > 0) {
        const matchForSubj = aliasMatch.find((a: any) => a.exam_topics && a.exam_topics.subject_id === subjectId)
        if (matchForSubj && matchForSubj.exam_topics) {
          const top = matchForSubj.exam_topics as any
          return buildResult(
            'TOPIC',
            'ALIAS_MATCH',
            top.id,
            0.95,
            `Matched known topic alias '${aliasMatch[0].alias}' for topic '${top.name}'.`,
            examId,
            subjectId,
            top.id
          )
        }
      }
    } catch (err) {
      console.warn('[Exam Intelligence] DB topic alias check error:', err)
    }
  }

  // 3. AI Semantic Evaluation & Relevance Validation
  try {
    let existingTopicsListStr = 'None'
    if (subjectId) {
      const { data: existingTopics } = await supabase
        .from('exam_topics')
        .select('id, name, slug')
        .eq('subject_id', subjectId)
        .limit(50)

      if (existingTopics && existingTopics.length > 0) {
        existingTopicsListStr = existingTopics.map((t: any) => `- ID: ${t.id} | Name: "${t.name}"`).join('\n')
      }
    }

    const prompt = `You are the Lead Curriculum Intelligence Officer for NeoMCQ.
Evaluate requested topic "${topicInput}" under Exam "${examInput}" → Subject "${subjectInput}".

EXISTING TOPICS UNDER THIS SUBJECT IN DATABASE:
${existingTopicsListStr}

REQUESTED TOPIC TO EVALUATE: "${topicInput}"

DECISION CRITERIA:
1. SEMANTIC_MATCH: The requested topic matches or belongs directly under one of the EXISTING TOPICS listed above (e.g. "Upper limb nerve supply" matches "Upper Limb").
   Provide canonical_id and topic_id as the matching topic's ID.
2. VALID_NEW: The requested topic is a valid, legitimate medical/academic topic for the subject "${subjectInput}" under "${examInput}", but is not listed above.
   Set canonical_id: null, topic_id: null.
3. INVALID: The requested topic is NOT relevant to "${subjectInput}" or "${examInput}" (e.g. FMGE → Anatomy → "Income Tax", FMGE → Physiology → "Python Syntax", FMGE → Pathology → "Real Estate Law"), or is gibberish/country metadata.
   Set canonical_id: null, topic_id: null. Provide clear reason explaining irrelevance.

Return ONLY a JSON object adhering to this schema:
{
  "entity_type": "TOPIC",
  "decision": "SEMANTIC_MATCH" | "VALID_NEW" | "INVALID",
  "canonical_id": string or null,
  "confidence": number between 0.0 and 1.0,
  "reason": "Detailed explanation for decision",
  "exam_id": "${examId || ''}" or null,
  "subject_id": "${subjectId || ''}" or null,
  "topic_id": string or null
}`

    const aiRes = await AIGateway.generate({
      taskType: 'ENTITY_RESOLUTION',
      userId: null, // $0 user credit deduction
      prompt,
      systemInstruction: 'You are a strict curriculum canonicalization AI engine. Respond ONLY in valid JSON matching the requested schema.',
      temperature: 0.1,
      responseMimeType: 'application/json',
    })

    const parsed = aiRes.parsedJson || JSON.parse(aiRes.text || '{}')
    const validated = ExamIntelligenceResultSchema.safeParse(parsed)

    if (validated.success) {
      return {
        ...validated.data,
        exam_id: examId || validated.data.exam_id,
        subject_id: subjectId || validated.data.subject_id,
      }
    }
  } catch (err) {
    console.warn('[Exam Intelligence] AI topic resolution error:', err)
  }

  return buildResult(
    'TOPIC',
    'NEEDS_REVIEW',
    null,
    0.5,
    `Unable to deterministically validate topic '${topicInput}' under subject '${subjectInput}' / exam '${examInput}'.`,
    examId,
    subjectId
  )
}

/**
 * SECTION 6: SUBTOPIC RESOLUTION
 * Resolves subtopic under exam + subject + topic (exact/normalized/alias/semantic/valid new/invalid)
 */
export async function resolveSubtopic(options: ResolveSubtopicOptions): Promise<ExamIntelligenceResult> {
  const { examInput, subjectInput, topicInput, subtopicInput } = options
  const supabase = getSupabaseAdmin()

  if (!subtopicInput || typeof subtopicInput !== 'string' || !subtopicInput.trim()) {
    return buildResult('SUBTOPIC', 'INVALID', null, 1.0, 'Subtopic input is empty or missing.')
  }

  const normSubtopic = normalizeInput(subtopicInput)
  if (!normSubtopic.canonical || normSubtopic.canonical.length < 2) {
    return buildResult('SUBTOPIC', 'INVALID', null, 1.0, `Subtopic input '${subtopicInput}' is invalid or too short.`)
  }

  // Check country metadata
  const classification = classifyUserInput(subtopicInput)
  if (classification.type === 'COUNTRY' && !classification.isCurricularValid) {
    return buildResult(
      'SUBTOPIC',
      'INVALID',
      null,
      0.99,
      `'${subtopicInput}' is country/geographical metadata, not a curriculum subtopic.`
    )
  }

  // 1. Resolve Topic Context First
  const topicRes = await resolveTopic({ examInput, subjectInput, topicInput })
  if (topicRes.decision === 'INVALID') {
    return buildResult(
      'SUBTOPIC',
      'INVALID',
      null,
      1.0,
      `Cannot resolve subtopic '${subtopicInput}': Topic '${topicInput}' or Subject '${subjectInput}' or Exam '${examInput}' is invalid (${topicRes.reason}).`
    )
  }

  const examId = topicRes.exam_id
  const subjectId = topicRes.subject_id
  const topicId = topicRes.topic_id

  // 2. Deterministic DB Check for Subtopic if topicId exists
  if (topicId) {
    try {
      const { data: topicSubtopics } = await supabase
        .from('exam_subtopics')
        .select('id, topic_id, name, slug')
        .eq('topic_id', topicId)
        .limit(100)

      if (topicSubtopics && topicSubtopics.length > 0) {
        const rawInputNorm = subtopicInput.toLowerCase().trim()
        const normCanon = normSubtopic.canonical.toLowerCase().trim()

        const match = topicSubtopics.find((s: any) => {
          const sName = (s.name || '').toLowerCase().trim()
          const sSlug = (s.slug || '').toLowerCase().trim()
          return (
            sName === rawInputNorm ||
            sName === normCanon ||
            sSlug === normSubtopic.slug ||
            sName.includes(normCanon) ||
            normCanon.includes(sName)
          )
        })

        if (match) {
          const isExact = (match.name || '').toLowerCase().trim() === rawInputNorm
          return buildResult(
            'SUBTOPIC',
            isExact ? 'EXACT_MATCH' : 'NORMALIZED_MATCH',
            match.id,
            1.0,
            `Matched canonical subtopic '${match.name}' under topic '${topicInput}'.`,
            examId,
            subjectId,
            topicId,
            match.id
          )
        }
      }
    } catch (err) {
      console.warn('[Exam Intelligence] DB subtopic check error:', err)
    }
  }

  // 3. AI Semantic Evaluation & Relevance Validation
  try {
    let existingSubtopicsListStr = 'None'
    if (topicId) {
      const { data: existingSubtopics } = await supabase
        .from('exam_subtopics')
        .select('id, name, slug')
        .eq('topic_id', topicId)
        .limit(50)

      if (existingSubtopics && existingSubtopics.length > 0) {
        existingSubtopicsListStr = existingSubtopics.map((s: any) => `- ID: ${s.id} | Name: "${s.name}"`).join('\n')
      }
    }

    const prompt = `You are the Lead Curriculum Intelligence Officer for NeoMCQ.
Evaluate requested subtopic "${subtopicInput}" under Exam "${examInput}" → Subject "${subjectInput}" → Topic "${topicInput}".

EXISTING SUBTOPICS UNDER THIS TOPIC IN DATABASE:
${existingSubtopicsListStr}

REQUESTED SUBTOPIC TO EVALUATE: "${subtopicInput}"

DECISION CRITERIA:
1. SEMANTIC_MATCH: The requested subtopic matches or belongs directly under one of the EXISTING SUBTOPICS listed above.
   Provide canonical_id and subtopic_id as the matching subtopic's ID.
2. VALID_NEW: The requested subtopic is a valid, legitimate subtopic for the topic "${topicInput}" under "${examInput}", but is not listed above.
   Set canonical_id: null, subtopic_id: null.
3. INVALID: The requested subtopic is NOT relevant to "${topicInput}" or "${examInput}" (e.g. FMGE → Obstetrics → Hypertensive Disorders of Pregnancy → "Income Tax Act", or gibberish/country metadata).
   Set canonical_id: null, subtopic_id: null. Provide clear reason explaining irrelevance.

Return ONLY a JSON object adhering to this schema:
{
  "entity_type": "SUBTOPIC",
  "decision": "SEMANTIC_MATCH" | "VALID_NEW" | "INVALID",
  "canonical_id": string or null,
  "confidence": number between 0.0 and 1.0,
  "reason": "Detailed explanation for decision",
  "exam_id": ${examId ? `"${examId}"` : 'null'},
  "subject_id": ${subjectId ? `"${subjectId}"` : 'null'},
  "topic_id": ${topicId ? `"${topicId}"` : 'null'},
  "subtopic_id": string or null
}`

    const aiRes = await AIGateway.generate({
      taskType: 'ENTITY_RESOLUTION',
      userId: null, // $0 user credit deduction
      prompt,
      systemInstruction: 'You are a strict curriculum canonicalization AI engine. Respond ONLY in valid JSON matching the requested schema.',
      temperature: 0.1,
      responseMimeType: 'application/json',
    })

    const parsed = aiRes.parsedJson || JSON.parse(aiRes.text || '{}')
    const validated = ExamIntelligenceResultSchema.safeParse(parsed)

    if (validated.success) {
      return {
        ...validated.data,
        exam_id: examId || validated.data.exam_id,
        subject_id: subjectId || validated.data.subject_id,
        topic_id: topicId || validated.data.topic_id,
        subtopic_id: validated.data.subtopic_id,
      }
    }
  } catch (err) {
    console.warn('[Exam Intelligence] AI subtopic resolution error:', err)
  }

  return buildResult(
    'SUBTOPIC',
    'NEEDS_REVIEW',
    null,
    0.5,
    `Unable to deterministically validate subtopic '${subtopicInput}' under topic '${topicInput}' / exam '${examInput}'.`,
    examId,
    subjectId,
    topicId
  )
}

/**
 * SECTION 1: MASTER CURRICULUM RESOLUTION ENTRYPOINT
 */
export async function resolveCurriculumRequest(req: {
  exam: string
  subject?: string
  topic?: string
  subtopic?: string
}): Promise<ExamIntelligenceResult> {
  if (req.subtopic && req.topic && req.subject) {
    return resolveSubtopic({
      examInput: req.exam,
      subjectInput: req.subject,
      topicInput: req.topic,
      subtopicInput: req.subtopic,
    })
  }

  if (req.topic && req.subject) {
    return resolveTopic({
      examInput: req.exam,
      subjectInput: req.subject,
      topicInput: req.topic,
    })
  }

  if (req.subject) {
    return resolveSubject({
      examInput: req.exam,
      subjectInput: req.subject,
    })
  }

  return resolveExam({
    examInput: req.exam,
  })
}
