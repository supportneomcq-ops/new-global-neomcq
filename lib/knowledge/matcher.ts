import { normalizeInput, calculateLevenshteinSimilarity } from './normalizer'

export interface MatchResult<T = any> {
  matched: boolean
  confidence: number // 0 - 100
  matchType: 'exact' | 'slug' | 'alias' | 'fuzzy' | 'none'
  entity: T | null
  canonicalName: string
  normalizedSlug: string
}

const CONFIDENCE_THRESHOLD = 85.0

/**
 * Step 2 & 3: Smart Match Decision Engine
 * Resolves exams, subjects, or topics from database before generating new AI entities.
 */
export async function matchExamSmart(supabase: any, rawInput: string): Promise<MatchResult> {
  const norm = normalizeInput(rawInput)

  if (!norm.canonical) {
    return {
      matched: false,
      confidence: 0,
      matchType: 'none',
      entity: null,
      canonicalName: '',
      normalizedSlug: '',
    }
  }

  // 1. Check exact slug or name in exams table
  const { data: directMatches } = await supabase
    .from('exams')
    .select(`
      *,
      exam_subjects (
        id,
        name,
        slug,
        description,
        weight_percentage,
        topic_count,
        order_index,
        exam_topics (
          id,
          parent_id,
          name,
          slug,
          description,
          level,
          target_weight,
          order_index,
          tags
        )
      )
    `)
    .or(`slug.eq.${norm.slug},name.ilike.${norm.canonical}`)
    .limit(5)

  if (directMatches && directMatches.length > 0) {
    const exact = directMatches.find((e: any) => e.slug === norm.slug || e.name.toLowerCase() === norm.canonical)
    if (exact) {
      return {
        matched: true,
        confidence: 100.0,
        matchType: exact.slug === norm.slug ? 'slug' : 'exact',
        entity: exact,
        canonicalName: exact.name,
        normalizedSlug: exact.slug,
      }
    }
  }

  // 2. Check exam_aliases table
  const { data: aliasMatch } = await supabase
    .from('exam_aliases')
    .select('exam_id, alias, exams(*)')
    .ilike('alias', norm.canonical)
    .maybeSingle()

  if (aliasMatch && aliasMatch.exams) {
    return {
      matched: true,
      confidence: 95.0,
      matchType: 'alias',
      entity: aliasMatch.exams,
      canonicalName: aliasMatch.exams.name,
      normalizedSlug: aliasMatch.exams.slug,
    }
  }

  // 3. Fuzzy search or string distance check on all exams
  const { data: allExams } = await supabase
    .from('exams')
    .select('*, exam_subjects(id, name, slug, weight_percentage)')
    .neq('status', 'archived')
    .limit(50)

  let bestMatch: any = null
  let maxConfidence = 0.0

  if (allExams && allExams.length > 0) {
    for (const exam of allExams) {
      const nameSim = calculateLevenshteinSimilarity(norm.canonical, exam.name)
      const slugSim = calculateLevenshteinSimilarity(norm.slug, exam.slug)
      const bestLocalSim = Math.max(nameSim, slugSim)

      // Also check aliases array on exam record
      let aliasSim = 0
      if (exam.aliases && Array.isArray(exam.aliases)) {
        for (const al of exam.aliases) {
          const sim = calculateLevenshteinSimilarity(norm.canonical, al)
          if (sim > aliasSim) aliasSim = sim
        }
      }

      const overallConfidence = Math.max(bestLocalSim, aliasSim)

      if (overallConfidence > maxConfidence) {
        maxConfidence = overallConfidence
        bestMatch = exam
      }
    }
  }

  if (bestMatch && maxConfidence >= CONFIDENCE_THRESHOLD) {
    // Dynamically store new alias for future speed!
    if (rawInput && rawInput.trim().length > 2) {
      await supabase
        .from('exam_aliases')
        .insert({ exam_id: bestMatch.id, alias: rawInput.trim() })
        .catch(() => {}) // Ignore if alias already recorded
    }

    return {
      matched: true,
      confidence: maxConfidence,
      matchType: 'fuzzy',
      entity: bestMatch,
      canonicalName: bestMatch.name,
      normalizedSlug: bestMatch.slug,
    }
  }

  // Under threshold -> Decision: Generate New AI Exam
  return {
    matched: false,
    confidence: maxConfidence,
    matchType: 'none',
    entity: null,
    canonicalName: norm.canonical,
    normalizedSlug: norm.slug,
  }
}

/**
 * Smart Subject Matcher
 * Resolves whether a subject already exists under a given exam before creating a duplicate.
 */
export async function matchSubjectSmart(
  supabase: any,
  examId: string,
  rawInput: string
): Promise<MatchResult> {
  const norm = normalizeInput(rawInput)

  if (!norm.canonical || !examId) {
    return {
      matched: false,
      confidence: 0,
      matchType: 'none',
      entity: null,
      canonicalName: '',
      normalizedSlug: '',
    }
  }

  // 1. Exact match by slug or name under this exam
  const { data: directMatches } = await supabase
    .from('exam_subjects')
    .select('*, exam_topics(*)')
    .eq('exam_id', examId)
    .or(`slug.eq.${norm.slug},name.ilike.${norm.canonical}`)
    .limit(5)

  if (directMatches && directMatches.length > 0) {
    const exact = directMatches.find(
      (s: any) => s.slug === norm.slug || s.name.toLowerCase() === norm.canonical
    )
    if (exact) {
      return {
        matched: true,
        confidence: 100.0,
        matchType: exact.slug === norm.slug ? 'slug' : 'exact',
        entity: exact,
        canonicalName: exact.name,
        normalizedSlug: exact.slug,
      }
    }
  }

  // 2. Fuzzy search across all subjects for this exam
  const { data: allSubjects } = await supabase
    .from('exam_subjects')
    .select('*, exam_topics(*)')
    .eq('exam_id', examId)

  let bestMatch: any = null
  let maxConfidence = 0.0

  if (allSubjects && allSubjects.length > 0) {
    for (const subj of allSubjects) {
      const nameSim = calculateLevenshteinSimilarity(norm.canonical, subj.name)
      const slugSim = calculateLevenshteinSimilarity(norm.slug, subj.slug)
      const sim = Math.max(nameSim, slugSim)

      if (sim > maxConfidence) {
        maxConfidence = sim
        bestMatch = subj
      }
    }
  }

  if (bestMatch && maxConfidence >= CONFIDENCE_THRESHOLD) {
    return {
      matched: true,
      confidence: maxConfidence,
      matchType: 'fuzzy',
      entity: bestMatch,
      canonicalName: bestMatch.name,
      normalizedSlug: bestMatch.slug,
    }
  }

  return {
    matched: false,
    confidence: maxConfidence,
    matchType: 'none',
    entity: null,
    canonicalName: norm.canonical,
    normalizedSlug: norm.slug,
  }
}

/**
 * Smart Topic Matcher
 * Resolves whether a topic already exists under a given subject before creating a duplicate.
 */
export async function matchTopicSmart(
  supabase: any,
  subjectId: string,
  rawInput: string
): Promise<MatchResult> {
  const norm = normalizeInput(rawInput)

  if (!norm.canonical || !subjectId) {
    return {
      matched: false,
      confidence: 0,
      matchType: 'none',
      entity: null,
      canonicalName: '',
      normalizedSlug: '',
    }
  }

  // 1. Exact match by slug or name under this subject
  const { data: directMatches } = await supabase
    .from('exam_topics')
    .select('*')
    .eq('subject_id', subjectId)
    .or(`slug.eq.${norm.slug},name.ilike.${norm.canonical}`)
    .limit(5)

  if (directMatches && directMatches.length > 0) {
    const exact = directMatches.find(
      (t: any) => t.slug === norm.slug || t.name.toLowerCase() === norm.canonical
    )
    if (exact) {
      return {
        matched: true,
        confidence: 100.0,
        matchType: exact.slug === norm.slug ? 'slug' : 'exact',
        entity: exact,
        canonicalName: exact.name,
        normalizedSlug: exact.slug,
      }
    }
  }

  // 2. Fuzzy search across all topics for this subject
  const { data: allTopics } = await supabase
    .from('exam_topics')
    .select('*')
    .eq('subject_id', subjectId)

  let bestMatch: any = null
  let maxConfidence = 0.0

  if (allTopics && allTopics.length > 0) {
    for (const top of allTopics) {
      const nameSim = calculateLevenshteinSimilarity(norm.canonical, top.name)
      const slugSim = calculateLevenshteinSimilarity(norm.slug, top.slug)
      const sim = Math.max(nameSim, slugSim)

      if (sim > maxConfidence) {
        maxConfidence = sim
        bestMatch = top
      }
    }
  }

  if (bestMatch && maxConfidence >= CONFIDENCE_THRESHOLD) {
    return {
      matched: true,
      confidence: maxConfidence,
      matchType: 'fuzzy',
      entity: bestMatch,
      canonicalName: bestMatch.name,
      normalizedSlug: bestMatch.slug,
    }
  }

  return {
    matched: false,
    confidence: maxConfidence,
    matchType: 'none',
    entity: null,
    canonicalName: norm.canonical,
    normalizedSlug: norm.slug,
  }
}

