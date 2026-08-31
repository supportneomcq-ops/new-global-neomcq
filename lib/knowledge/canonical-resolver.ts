/**
 * NeoMCQ Autonomous Canonical Entity Resolution Engine
 * 
 * Strict Canonical Entity Resolution:
 * 1. Normalize input (lowercase, trim, strip symbols, map standard abbreviations)
 * 2. Prevent Country / Metadata names (e.g. 'India', 'USA') from becoming topic entities
 * 3. Search canonical exams, subjects, and topics (Slugs, Exact Names, Aliases, Fuzzy)
 * 4. Verify structural hierarchy integrity (topic ∈ subject ∈ exam)
 * 5. Guarantee ZERO duplicates across canonical entities
 */

import { getSupabaseAdmin } from '@/lib/supabase'
import { normalizeInput, calculateLevenshteinSimilarity } from './normalizer'
import { classifyUserInput } from './classifier'

export interface ResolvedExam {
  id: string
  name: string
  slug: string
  code?: string
  description?: string
  difficulty?: string
  status?: string
}

export interface ResolvedSubject {
  id: string
  exam_id: string
  name: string
  slug?: string
  description?: string
  weight_percentage?: number
}

export interface ResolvedTopic {
  id: string
  subject_id: string
  name: string
  slug?: string
  description?: string
  parent_id?: string | null
}

export interface CanonicalHierarchyResolution {
  success: boolean
  exam: ResolvedExam | null
  subject: ResolvedSubject | null
  topic: ResolvedTopic | null
  matchType: {
    exam: 'exact' | 'slug' | 'alias' | 'fuzzy' | 'created' | 'none'
    subject: 'exact' | 'slug' | 'alias' | 'fuzzy' | 'created' | 'none'
    topic: 'exact' | 'slug' | 'alias' | 'fuzzy' | 'created' | 'none'
  }
  confidence: number // 0 - 100
  error?: string
}

const CONFIDENCE_THRESHOLD = 85.0

/**
 * Resolves or creates a Canonical Exam with alias support and duplicate prevention
 */
export async function resolveCanonicalExam(
  supabase: any,
  rawExamInput: string,
  autoCreate = false
): Promise<{ exam: ResolvedExam | null; matchType: 'exact' | 'slug' | 'alias' | 'fuzzy' | 'created' | 'none'; confidence: number }> {
  const norm = normalizeInput(rawExamInput)
  if (!norm.canonical) {
    return { exam: null, matchType: 'none', confidence: 0 }
  }

  // 1. Exact Slug or Name Match
  const { data: directMatches } = await supabase
    .from('exams')
    .select('id, name, slug, code, description, difficulty, status')
    .or(`slug.eq.${norm.slug},name.ilike.${norm.canonical}`)
    .limit(5)

  if (directMatches && directMatches.length > 0) {
    const exact = directMatches.find(
      (e: any) => e.slug === norm.slug || e.name.toLowerCase().trim() === norm.canonical
    ) || directMatches[0]

    return {
      exam: exact,
      matchType: exact.slug === norm.slug ? 'slug' : 'exact',
      confidence: 100.0,
    }
  }

  // 2. Exam Aliases Table Match
  try {
    const { data: aliasMatch } = await supabase
      .from('exam_aliases')
      .select('exam_id, alias, exams(id, name, slug, code, description, difficulty, status)')
      .ilike('alias', norm.canonical)
      .maybeSingle()

    if (aliasMatch && aliasMatch.exams) {
      return {
        exam: aliasMatch.exams as ResolvedExam,
        matchType: 'alias',
        confidence: 95.0,
      }
    }
  } catch {
    // Non-blocking if table or policy throws
  }

  // 3. Fuzzy match across active exams
  const { data: allExams } = await supabase
    .from('exams')
    .select('id, name, slug, code, description, difficulty, status')
    .neq('status', 'archived')
    .limit(100)

  let bestMatch: any = null
  let maxConfidence = 0.0

  if (allExams && allExams.length > 0) {
    for (const exam of allExams) {
      const nameSim = calculateLevenshteinSimilarity(norm.canonical, exam.name)
      const slugSim = calculateLevenshteinSimilarity(norm.slug, exam.slug)
      const rawSim = calculateLevenshteinSimilarity(rawExamInput.trim(), exam.name)

      const score = Math.max(nameSim, slugSim, rawSim)
      if (score > maxConfidence) {
        maxConfidence = score
        bestMatch = exam
      }
    }
  }

  if (bestMatch && maxConfidence >= CONFIDENCE_THRESHOLD) {
    return {
      exam: bestMatch,
      matchType: 'fuzzy',
      confidence: maxConfidence,
    }
  }

  // 4. Auto-create if explicitly enabled
  if (autoCreate) {
    const capitalizedName = norm.tokens
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
      .join(' ')

    const { data: newExam, error: createErr } = await supabase
      .from('exams')
      .insert({
        name: capitalizedName,
        slug: norm.slug,
        code: norm.tokens[0]?.toUpperCase().slice(0, 8) || 'EXAM',
        description: `Comprehensive canonical curriculum and question bank for ${capitalizedName}.`,
        difficulty: 'Advanced',
        created_by_ai: true,
        status: 'published',
      })
      .select('id, name, slug, code, description, difficulty, status')
      .single()

    if (!createErr && newExam) {
      // Register alias
      try {
        await supabase.from('exam_aliases').insert([
          { exam_id: newExam.id, alias: rawExamInput.trim() },
          { exam_id: newExam.id, alias: norm.canonical },
        ])
      } catch {
        // Non-blocking
      }

      return {
        exam: newExam,
        matchType: 'created',
        confidence: 100.0,
      }
    }
  }

  return { exam: null, matchType: 'none', confidence: maxConfidence }
}

/**
 * Resolves or creates a Canonical Subject under a specific exam
 */
export async function resolveCanonicalSubject(
  supabase: any,
  examId: string,
  rawSubjectInput: string,
  autoCreate = false
): Promise<{ subject: ResolvedSubject | null; matchType: 'exact' | 'slug' | 'alias' | 'fuzzy' | 'created' | 'none'; confidence: number }> {
  const norm = normalizeInput(rawSubjectInput)
  if (!norm.canonical || !examId) {
    return { subject: null, matchType: 'none', confidence: 0 }
  }

  // 1. Exact match under this exam
  const { data: directMatches } = await supabase
    .from('exam_subjects')
    .select('id, exam_id, name, slug, description, weight_percentage')
    .eq('exam_id', examId)
    .ilike('name', norm.canonical)
    .limit(5)

  if (directMatches && directMatches.length > 0) {
    return {
      subject: directMatches[0],
      matchType: 'exact',
      confidence: 100.0,
    }
  }

  // 2. Subject Aliases table
  try {
    const { data: aliasMatch } = await supabase
      .from('subject_aliases')
      .select('subject_id, alias, exam_subjects(id, exam_id, name, slug, description, weight_percentage)')
      .ilike('alias', norm.canonical)
      .limit(5)

    if (aliasMatch && aliasMatch.length > 0) {
      const matchForExam = aliasMatch.find((a: any) => a.exam_subjects && a.exam_subjects.exam_id === examId)
      if (matchForExam && matchForExam.exam_subjects) {
        return {
          subject: matchForExam.exam_subjects as ResolvedSubject,
          matchType: 'alias',
          confidence: 95.0,
        }
      }
    }
  } catch {
    // Non-blocking
  }

  // 3. Fuzzy search across all subjects for this exam
  const { data: allSubjects } = await supabase
    .from('exam_subjects')
    .select('id, exam_id, name, slug, description, weight_percentage')
    .eq('exam_id', examId)

  let bestMatch: any = null
  let maxConfidence = 0.0

  if (allSubjects && allSubjects.length > 0) {
    for (const subj of allSubjects) {
      const nameSim = calculateLevenshteinSimilarity(norm.canonical, subj.name)
      const rawSim = calculateLevenshteinSimilarity(rawSubjectInput.trim(), subj.name)
      const score = Math.max(nameSim, rawSim)
      if (score > maxConfidence) {
        maxConfidence = score
        bestMatch = subj
      }
    }
  }

  if (bestMatch && maxConfidence >= CONFIDENCE_THRESHOLD) {
    return {
      subject: bestMatch,
      matchType: 'fuzzy',
      confidence: maxConfidence,
    }
  }

  // 4. Auto-create if enabled
  if (autoCreate) {
    const capitalizedName = norm.tokens
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
      .join(' ')

    const { data: newSubj, error: createErr } = await supabase
      .from('exam_subjects')
      .insert({
        exam_id: examId,
        name: capitalizedName,
        slug: norm.slug,
        description: `Core subject domain covering ${capitalizedName}.`,
        weight_percentage: 8.0,
      })
      .select('id, exam_id, name, slug, description, weight_percentage')
      .single()

    if (!createErr && newSubj) {
      try {
        await supabase.from('subject_aliases').insert([
          { subject_id: newSubj.id, alias: rawSubjectInput.trim() },
          { subject_id: newSubj.id, alias: norm.canonical },
        ])
      } catch {
        // Non-blocking
      }

      return {
        subject: newSubj,
        matchType: 'created',
        confidence: 100.0,
      }
    }
  }

  return { subject: null, matchType: 'none', confidence: maxConfidence }
}

/**
 * Resolves or creates a Canonical Topic under a specific subject
 */
export async function resolveCanonicalTopic(
  supabase: any,
  subjectId: string,
  rawTopicInput: string,
  autoCreate = false
): Promise<{ topic: ResolvedTopic | null; matchType: 'exact' | 'slug' | 'alias' | 'fuzzy' | 'created' | 'none'; confidence: number }> {
  const norm = normalizeInput(rawTopicInput)
  if (!norm.canonical || !subjectId) {
    return { topic: null, matchType: 'none', confidence: 0 }
  }

  // Reject country keywords from becoming topics
  const classification = classifyUserInput(rawTopicInput)
  if (classification.type === 'COUNTRY' && !classification.isCurricularValid) {
    return { topic: null, matchType: 'none', confidence: 0 }
  }

  // 1. Exact match by name under this subject
  const { data: directMatches } = await supabase
    .from('exam_topics')
    .select('id, subject_id, name, slug, description, parent_id')
    .eq('subject_id', subjectId)
    .ilike('name', norm.canonical)
    .limit(5)

  if (directMatches && directMatches.length > 0) {
    return {
      topic: directMatches[0],
      matchType: 'exact',
      confidence: 100.0,
    }
  }

  // 2. Topic Aliases table
  try {
    const { data: aliasMatch } = await supabase
      .from('topic_aliases')
      .select('topic_id, alias, exam_topics(id, subject_id, name, slug, description, parent_id)')
      .ilike('alias', norm.canonical)
      .limit(5)

    if (aliasMatch && aliasMatch.length > 0) {
      const matchForSubj = aliasMatch.find((a: any) => a.exam_topics && a.exam_topics.subject_id === subjectId)
      if (matchForSubj && matchForSubj.exam_topics) {
        return {
          topic: matchForSubj.exam_topics as ResolvedTopic,
          matchType: 'alias',
          confidence: 95.0,
        }
      }
    }
  } catch {
    // Non-blocking
  }

  // 3. Fuzzy search across topics in this subject
  const { data: allTopics } = await supabase
    .from('exam_topics')
    .select('id, subject_id, name, slug, description, parent_id')
    .eq('subject_id', subjectId)

  let bestMatch: any = null
  let maxConfidence = 0.0

  if (allTopics && allTopics.length > 0) {
    for (const top of allTopics) {
      const nameSim = calculateLevenshteinSimilarity(norm.canonical, top.name)
      const rawSim = calculateLevenshteinSimilarity(rawTopicInput.trim(), top.name)
      const score = Math.max(nameSim, rawSim)
      if (score > maxConfidence) {
        maxConfidence = score
        bestMatch = top
      }
    }
  }

  if (bestMatch && maxConfidence >= CONFIDENCE_THRESHOLD) {
    return {
      topic: bestMatch,
      matchType: 'fuzzy',
      confidence: maxConfidence,
    }
  }

  // 4. Auto-create if enabled
  if (autoCreate) {
    const capitalizedName = norm.tokens
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
      .join(' ')

    const { data: newTop, error: createErr } = await supabase
      .from('exam_topics')
      .insert({
        subject_id: subjectId,
        name: capitalizedName,
        slug: norm.slug,
        description: `High-yield topic module for ${capitalizedName}.`,
        level: 'topic',
      })
      .select('id, subject_id, name, slug, description, parent_id')
      .single()

    if (!createErr && newTop) {
      try {
        await supabase.from('topic_aliases').insert([
          { topic_id: newTop.id, alias: rawTopicInput.trim() },
          { topic_id: newTop.id, alias: norm.canonical },
        ])
      } catch {
        // Non-blocking
      }

      return {
        topic: newTop,
        matchType: 'created',
        confidence: 100.0,
      }
    }
  }

  return { topic: null, matchType: 'none', confidence: maxConfidence }
}

/**
 * Master Canonical Hierarchy Resolver
 * Resolves Exam -> Subject -> Topic with strict relationship verification
 */
export async function resolveCanonicalHierarchy({
  examInput,
  subjectInput,
  topicInput,
  autoCreate = false,
}: {
  examInput: string
  subjectInput: string
  topicInput: string
  autoCreate?: boolean
}): Promise<CanonicalHierarchyResolution> {
  const supabase = getSupabaseAdmin()

  // 1. Resolve Exam
  const examResult = await resolveCanonicalExam(supabase, examInput, autoCreate)
  if (!examResult.exam) {
    return {
      success: false,
      exam: null,
      subject: null,
      topic: null,
      matchType: { exam: 'none', subject: 'none', topic: 'none' },
      confidence: examResult.confidence,
      error: `Could not resolve canonical exam for '${examInput}'. Please select a valid exam.`,
    }
  }

  // 2. Resolve Subject under Resolved Exam
  const subjectResult = await resolveCanonicalSubject(supabase, examResult.exam.id, subjectInput, autoCreate)
  if (!subjectResult.subject) {
    return {
      success: false,
      exam: examResult.exam,
      subject: null,
      topic: null,
      matchType: { exam: examResult.matchType, subject: 'none', topic: 'none' },
      confidence: subjectResult.confidence,
      error: `Could not resolve canonical subject '${subjectInput}' under exam '${examResult.exam.name}'.`,
    }
  }

  // Verify subject belongs to exam
  if (subjectResult.subject.exam_id !== examResult.exam.id) {
    return {
      success: false,
      exam: examResult.exam,
      subject: subjectResult.subject,
      topic: null,
      matchType: { exam: examResult.matchType, subject: subjectResult.matchType, topic: 'none' },
      confidence: 0,
      error: `Hierarchy violation: Subject '${subjectResult.subject.name}' does not belong to exam '${examResult.exam.name}'.`,
    }
  }

  // 3. Resolve Topic under Resolved Subject
  const topicResult = await resolveCanonicalTopic(supabase, subjectResult.subject.id, topicInput, autoCreate)
  if (!topicResult.topic) {
    return {
      success: false,
      exam: examResult.exam,
      subject: subjectResult.subject,
      topic: null,
      matchType: { exam: examResult.matchType, subject: subjectResult.matchType, topic: 'none' },
      confidence: topicResult.confidence,
      error: `Could not resolve canonical topic '${topicInput}' under subject '${subjectResult.subject.name}'.`,
    }
  }

  // Verify topic belongs to subject
  if (topicResult.topic.subject_id !== subjectResult.subject.id) {
    return {
      success: false,
      exam: examResult.exam,
      subject: subjectResult.subject,
      topic: topicResult.topic,
      matchType: { exam: examResult.matchType, subject: subjectResult.matchType, topic: topicResult.matchType },
      confidence: 0,
      error: `Hierarchy violation: Topic '${topicResult.topic.name}' does not belong to subject '${subjectResult.subject.name}'.`,
    }
  }

  const overallConfidence = Math.min(examResult.confidence, subjectResult.confidence, topicResult.confidence)

  return {
    success: true,
    exam: examResult.exam,
    subject: subjectResult.subject,
    topic: topicResult.topic,
    matchType: {
      exam: examResult.matchType,
      subject: subjectResult.matchType,
      topic: topicResult.matchType,
    },
    confidence: overallConfidence,
  }
}
