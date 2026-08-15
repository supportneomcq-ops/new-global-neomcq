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
      id,
      name,
      slug,
      description,
      difficulty,
      status,
      exam_subjects (
        id,
        exam_id,
        name,
        description,
        weight_percentage,
        created_at,
        exam_topics (
          id,
          subject_id,
          name,
          description,
          created_at
        )
      )
    `)
    .or(`slug.eq.${norm.slug},name.ilike.${norm.canonical}`)
    .limit(5)

  if (directMatches && directMatches.length > 0) {
    const exact = directMatches.find((e: any) => 
      e.slug === norm.slug || 
      (e.name && e.name.toLowerCase().trim() === norm.canonical)
    )
    if (exact) {
      return {
        matched: true,
        confidence: 100.0,
        matchType: exact.slug === norm.slug ? 'slug' : 'exact',
        entity: exact,
        canonicalName: exact.name,
        normalizedSlug: exact.slug || norm.slug,
      }
    }
  }

  // 2. Check exam_aliases table
  try {
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
        normalizedSlug: aliasMatch.exams.slug || norm.slug,
      }
    }
  } catch (aliasErr) {
    // Ignore if exam_aliases does not exist
  }

  // 3. Fuzzy search or string distance check on all exams
  const { data: allExams } = await supabase
    .from('exams')
    .select('id, name, slug, description, difficulty, status')
    .neq('status', 'archived')
    .limit(50)

  let bestMatch: any = null
  let maxConfidence = 0.0

  if (allExams && allExams.length > 0) {
    for (const exam of allExams) {
      const nameSim = calculateLevenshteinSimilarity(norm.canonical, exam.name)
      const slugSim = calculateLevenshteinSimilarity(norm.slug, exam.slug)
      const rawSim = calculateLevenshteinSimilarity(rawInput.trim(), exam.name)
      const bestLocalSim = Math.max(nameSim, slugSim, rawSim)

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
    return {
      matched: true,
      confidence: maxConfidence,
      matchType: 'fuzzy',
      entity: bestMatch,
      canonicalName: bestMatch.name,
      normalizedSlug: bestMatch.slug || norm.slug,
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

  // 1. Exact match by name under this exam
  const { data: directMatches } = await supabase
    .from('exam_subjects')
    .select('id, exam_id, name, description, weight_percentage, created_at, exam_topics(id, subject_id, name, description, created_at)')
    .eq('exam_id', examId)
    .ilike('name', norm.canonical)
    .limit(5)

  if (directMatches && directMatches.length > 0) {
    const exact = directMatches.find(
      (s: any) =>
        (s.name && s.name.toLowerCase().trim() === norm.canonical) ||
        (s.name && s.name.toLowerCase().trim() === (rawInput || '').toLowerCase().trim())
    ) || directMatches[0]
    if (exact) {
      return {
        matched: true,
        confidence: 100.0,
        matchType: 'exact',
        entity: exact,
        canonicalName: exact.name,
        normalizedSlug: norm.slug,
      }
    }
  }

  // 2. Check subject_aliases table if present
  try {
    const { data: aliasMatch } = await supabase
      .from('subject_aliases')
      .select('subject_id, alias, exam_subjects(id, exam_id, name, description, weight_percentage, created_at, exam_topics(id, subject_id, name, description, created_at))')
      .ilike('alias', norm.canonical)
      .limit(5)

    if (aliasMatch && aliasMatch.length > 0) {
      const matchForExam = aliasMatch.find((a: any) => a.exam_subjects && a.exam_subjects.exam_id === examId)
      if (matchForExam && matchForExam.exam_subjects) {
        return {
          matched: true,
          confidence: 95.0,
          matchType: 'alias',
          entity: matchForExam.exam_subjects,
          canonicalName: matchForExam.exam_subjects.name,
          normalizedSlug: norm.slug,
        }
      }
    }
  } catch (aliasErr) {
    // Ignore if table has strict RLS or alias lookup error
  }

  // 3. Fuzzy search across all subjects for this exam
  const { data: allSubjects } = await supabase
    .from('exam_subjects')
    .select('id, exam_id, name, description, weight_percentage, created_at, exam_topics(id, subject_id, name, description, created_at)')
    .eq('exam_id', examId)

  let bestMatch: any = null
  let maxConfidence = 0.0

  if (allSubjects && allSubjects.length > 0) {
    for (const subj of allSubjects) {
      const nameSim = calculateLevenshteinSimilarity(norm.canonical, subj.name)
      const rawSim = calculateLevenshteinSimilarity(rawInput.trim(), subj.name)
      const sim = Math.max(nameSim, rawSim)

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
      normalizedSlug: norm.slug,
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

  // 1. Exact match by name under this subject
  const { data: directMatches } = await supabase
    .from('exam_topics')
    .select('id, subject_id, name, description, created_at')
    .eq('subject_id', subjectId)
    .ilike('name', norm.canonical)
    .limit(5)

  if (directMatches && directMatches.length > 0) {
    const exact = directMatches.find(
      (t: any) =>
        (t.name && t.name.toLowerCase().trim() === norm.canonical) ||
        (t.name && t.name.toLowerCase().trim() === (rawInput || '').toLowerCase().trim())
    ) || directMatches[0]
    if (exact) {
      return {
        matched: true,
        confidence: 100.0,
        matchType: 'exact',
        entity: exact,
        canonicalName: exact.name,
        normalizedSlug: norm.slug,
      }
    }
  }

  // 2. Check topic_aliases table if present
  try {
    const { data: aliasMatch } = await supabase
      .from('topic_aliases')
      .select('topic_id, alias, exam_topics(id, subject_id, name, description, created_at)')
      .ilike('alias', norm.canonical)
      .limit(5)

    if (aliasMatch && aliasMatch.length > 0) {
      const matchForSubj = aliasMatch.find((a: any) => a.exam_topics && a.exam_topics.subject_id === subjectId)
      if (matchForSubj && matchForSubj.exam_topics) {
        return {
          matched: true,
          confidence: 95.0,
          matchType: 'alias',
          entity: matchForSubj.exam_topics,
          canonicalName: matchForSubj.exam_topics.name,
          normalizedSlug: norm.slug,
        }
      }
    }
  } catch (aliasErr) {
    // Ignore
  }

  // 3. Fuzzy search across all topics for this subject
  const { data: allTopics } = await supabase
    .from('exam_topics')
    .select('id, subject_id, name, description, created_at')
    .eq('subject_id', subjectId)

  let bestMatch: any = null
  let maxConfidence = 0.0

  if (allTopics && allTopics.length > 0) {
    for (const top of allTopics) {
      const nameSim = calculateLevenshteinSimilarity(norm.canonical, top.name)
      const rawSim = calculateLevenshteinSimilarity(rawInput.trim(), top.name)
      const sim = Math.max(nameSim, rawSim)

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
      normalizedSlug: norm.slug,
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

