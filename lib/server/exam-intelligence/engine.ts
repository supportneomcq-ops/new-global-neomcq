import { getSupabaseAdmin } from '@/lib/supabase'
import { buildExamMetadataAudit, normalizeOfficialSyllabusSubjects } from './metadata-audit'
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
// PROVISIONAL SEED TEMPLATES — never treated as official syllabus or verified exam rules
// ============================================================================

// Universal curriculum quality gate.
// Adapts subject, topic, and subtopic depth requirements dynamically based on exam difficulty level.
function isCurriculumSpecComprehensive(examName: string, spec: AIExamIntelligenceOutput, levelHint?: string): boolean {
  const subjects = Array.isArray(spec.subjects) ? spec.subjects : []
  if (subjects.length === 0) return false

  const normalizedLevel = (levelHint || spec.exam?.difficulty_level || '').toLowerCase()
  const normalizedCategory = (spec.exam?.category || '').toLowerCase()
  const isHighDifficulty =
    normalizedLevel.includes('advanced') ||
    normalizedLevel.includes('expert') ||
    normalizedLevel.includes('medical') ||
    normalizedLevel.includes('competitive') ||
    normalizedLevel.includes('licensing') ||
    normalizedCategory.includes('medical') ||
    normalizedCategory.includes('engineering') ||
    normalizedCategory.includes('civil-services') ||
    normalizedCategory.includes('finance') ||
    /usmle|fmge|neet|jee|upsc|cfa|cpa|nclex|aws|bar|gate/i.test(examName)

  const isFoundationDifficulty =
    normalizedLevel.includes('beginner') ||
    normalizedLevel.includes('school') ||
    normalizedLevel.includes('foundation') ||
    normalizedLevel.includes('basic')

  const minTopics = isFoundationDifficulty ? 3 : isHighDifficulty ? 5 : 4
  const minSubtopics = isFoundationDifficulty ? 2 : isHighDifficulty ? 3 : 2

  const normalize = (value: unknown) => String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const uniqueMeaningfulNames = (values: unknown[]) => {
    const names = values.map(normalize)
    return names.every(Boolean) && new Set(names).size === names.length
  }
  const genericLabel = /^(subject|topic|subtopic|core subject|core topic|topic number|module)\s*\d*$/i

  if (!uniqueMeaningfulNames(subjects.map((subject: any) => subject.name))) return false

  for (const subject of subjects as any[]) {
    const topics = Array.isArray(subject.topics) ? subject.topics : []
    if (topics.length < minTopics || !uniqueMeaningfulNames(topics.map((topic: any) => topic.name))) return false
    if (genericLabel.test(String(subject.name || '').trim())) return false

    for (const topic of topics) {
      const subtopics = Array.isArray(topic.subtopics) ? topic.subtopics : []
      if (subtopics.length < minSubtopics || !uniqueMeaningfulNames(subtopics.map((item: any) => item.name))) return false
      if (genericLabel.test(String(topic.name || '').trim())) return false
      if (subtopics.some((item: any) => genericLabel.test(String(item.name || '').trim()))) return false
    }
  }

  return true
}

/**
 * Direct model-based curriculum synthesis is disabled.
 * All curriculum hierarchy must be extracted from verified official syllabus evidence.
 * AI source extraction, when enabled, must go through the budget-controlled AI gateway.
 */
export async function generateAIExamIntelligence(
  examQuery: string,
  countryHint?: string,
  categoryHint?: string,
  levelHint?: string
): Promise<AIExamIntelligenceOutput | null> {
  void examQuery
  void countryHint
  void categoryHint
  void levelHint
  throw new Error('Direct AI exam curriculum synthesis is disabled. Use the budget-controlled extraction workflow and verified structured official syllabus evidence.')
}

export async function resolveOrInitializeExamIntelligence(options: {
  examQuery: string
  country?: string
  category?: string
  level?: string
  authorityName?: string
  officialWebsite?: string
  userId?: string | null
}): Promise<ExamResolutionResponse> {
  const { examQuery, country, category, level, authorityName, officialWebsite, userId } = options
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
  const idempotencyKey = `${cleanQuery}::${(country || '').toLowerCase()}::${(category || '').toLowerCase()}::${(level || '').toLowerCase()}::${(authorityName || '').toLowerCase()}::${(officialWebsite || '').toLowerCase()}`
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
      authority_id,
      country_id,
      category_id,
      exam_type,
      current_version,
      version_year,
      is_current,
      last_verified_at,
      next_verification_at,
      official_url,
      official_notification_url,
      official_syllabus_url,
      source_url,
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
    if (matchedExam?.id) {
      // Fuzzy matching may return a compact projection. Reload the canonical record
      // with every field required by the official verification gate.
      const { data: fullMatchedExam } = await supabase
        .from('exams')
        .select(selectQuery)
        .eq('id', matchedExam.id)
        .maybeSingle()
      if (fullMatchedExam) matchedExam = fullMatchedExam
    }

    if (matchedExam) {
      console.log(`[Exam Intelligence] Reusing canonical exam: "${matchedExam.name}" (${matchedExam.id})`)

      const matchedMetadata = matchedExam.metadata || {}
      const auditApproved =
        matchedExam.verification_status === 'verified' &&
        matchedMetadata.exam_metadata_audit_status === 'verified' &&
        Boolean(matchedExam.next_verification_at) &&
        new Date(matchedExam.next_verification_at).getTime() > Date.now()

      let rulesResult: any
      if (auditApproved) {
        // Reuse the last admin-approved official audit until its re-verification date.
        rulesResult = {
          rulesStatus: 'ready',
          verificationStatus: 'verified',
          auditStatus: 'verified',
          question_count: Number(matchedExam.question_count || 0) || null,
          duration_minutes: Number(matchedExam.time_limit_mins || 0) || null,
          marking_scheme: matchedExam.marking_scheme || null,
          question_types: matchedExam.question_types || [],
        }
      } else {
        rulesResult = await collectExamRulesProcess(matchedExam.id, matchedExam.name, country, category, supabase)
      }

      const verificationApproved = rulesResult.verificationStatus === 'verified'

      if (!verificationApproved) {
        if (userId) {
          try {
            await supabase.from('user_exams').upsert(
              { user_id: userId, exam_id: matchedExam.id, status: 'in_progress' },
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
            description: matchedExam.description || `Exam profile for ${matchedExam.name}`,
            difficulty: matchedExam.difficulty || 'Intermediate',
            question_count: null,
            time_limit_mins: null,
            country: matchedExam.countries?.name || 'Unspecified',
            flag: matchedExam.countries?.flag_emoji || '🌐',
            curriculum_status: 'pending_verification',
            verification_status: 'needs_review',
            rules_status: rulesResult.rulesStatus,
            coverage_percentage: 0,
            evidence_scope: 'Official exam metadata review is required before curriculum generation.',
            authority_name: null,
            subjectCount: 0,
            topicCount: 0,
            subtopicCount: 0,
            exam_subjects: [],
            marking_scheme: null,
            question_types: [],
            exam_metadata_audit_status: rulesResult.auditStatus,
            missing_verification_fields: rulesResult.missingFields || [],
            conflicting_verification_fields: rulesResult.conflictingFields || [],
          },
          message: `"${matchedExam.name}" is selected. Official exam verification is pending; curriculum generation is blocked until the pattern and source evidence are approved.`,
        }
      }

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
          verification_status: 'verified',
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
        message: `Resolved verified canonical exam '${matchedExam.name}'.`,
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

    // A student-supplied exam name is not enough evidence to infer an official pattern.
    // Create a minimal provisional record without calling an AI provider or inventing rules.
    const emptyQuestionConfig = {
      default_question_count: 0,
      option_count: 0,
      answer_type: 'single' as const,
      single_correct: true,
      multiple_correct: false,
      has_negative_marking: false,
      positive_mark: 0,
      negative_mark: 0,
      total_marks: null,
      duration_minutes: null,
      time_per_question_seconds: null,
      has_image_questions: false,
      has_video_questions: false,
      has_audio_questions: false,
      has_case_based_questions: false,
      has_clinical_vignettes: false,
      has_calculation_questions: false,
      has_matching_questions: false,
      has_true_false_questions: false,
      question_types: [],
    }

    const intelligenceProfile: ExamIntelligenceProfile = {
      exam_id: '',
      exam_code: norm.slug.toUpperCase(),
      exam_name: rawInput,
      official_name: null,
      country: country || 'Unspecified',
      region: null,
      exam_category: category || 'Unspecified',
      exam_type: 'Unverified',
      specialty_or_domain: null,
      difficulty_level: 'Adaptive',
      difficulty_distribution: { easy: 0, medium: 0, hard: 0 },
      question_config: emptyQuestionConfig,
      content_language: 'en',
      syllabus_source: 'user_custom',
      syllabus_confidence: 0,
      ai_generated: false,
      ai_generation_version: 'provisional-input-only',
      curriculum_status: 'pending_verification',
      content_generation_rules: {
        mcq: {}, quiz: {}, flashcard: {}, ai_tutor: {},
        fill_in_blank: {}, notes: {}, flowchart: {},
      },
      confidence: { overall: 0, curriculum: 0, exam_rules: 0 },
      provenance: {
        rules_verified: false,
        rules_inferred: false,
        source: 'User-provided exam details and optional reference only; no official pattern or syllabus inferred',
        last_updated_at: new Date().toISOString(),
      },
      metadata: {
        generated_from_query: rawInput,
        provisional_only: true,
        timestamp: new Date().toISOString(),
        user_submitted_exam_details: {
          authority_name: authorityName?.trim() || null,
          official_website: officialWebsite?.trim() || null,
          verification_status: 'unverified_user_submitted',
        },
      },
    }

    const examPayload: any = {
      name: rawInput,
      slug: querySlug,
      description: `Draft exam profile for ${rawInput}; official pattern and syllabus verification are pending.`,
      difficulty: intelligenceProfile.difficulty_level,
      exam_type: null,
      authority: null,
      question_count: 0,
      time_limit_mins: 0,
      total_marks: null,
      negative_marking: null,
      passing_criteria: null,
      eligibility: null,
      attempt_rules: null,
      application_information: null,
      selection_process: null,
      marking_scheme: null,
      question_types: [],
      stages: [],
      papers: [],
      languages: [],
      country_id: countryId,
      category_id: categoryId,
      level: level?.trim() || null,
      current_version: null,
      version_year: null,
      is_current: false,
      last_verified_at: null,
      next_verification_at: null,
      status: 'active',
      is_featured: false,
      created_by_ai: false,
      verification_status: 'pending_review',
      metadata: {
        exam_intelligence: intelligenceProfile,
        content_generation_rules: intelligenceProfile.content_generation_rules,
        proposed_authority: authorityName?.trim() || null,
        provisional_exam_rules: {
          question_config: intelligenceProfile.question_config,
          source: 'user_input_only',
          status: 'unverified_until_official_evidence_review',
        },
        exam_metadata_audit_status: 'needs_review',
        curriculum_status: 'pending_verification',
      },
      syllabus_info: {
        source: 'user_custom',
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
      await supabase.from('exam_aliases').upsert([
        { exam_id: newExam.id, alias: rawInput.trim().toLowerCase() },
        { exam_id: newExam.id, alias: cleanQuery.toLowerCase() },
      ], { onConflict: 'exam_id,alias' })
    } catch (aliasErr) {
      console.warn('[Exam Intelligence] Alias registration note:', aliasErr)
    }

    // Collect and persist official exam-rule evidence first. An AI profile is only
    // a provisional suggestion; no curriculum hierarchy is written before approval.
    const rulesResult = await collectExamRulesProcess(newExam.id, rawInput, country, category, supabase)

    // A newly submitted exam is never auto-approved. The admin must verify its
    // official authority, current version, pattern fields and structured syllabus.
    if (userId) {
      try {
        await supabase.from('user_exams').upsert(
          { user_id: userId, exam_id: newExam.id, status: 'in_progress' },
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
        question_count: null,
        time_limit_mins: null,
        country: intelligenceProfile.country,
        flag: country === 'India' ? '🇮🇳' : country === 'United States' ? '🇺🇸' : '🌐',
        curriculum_status: 'pending_verification',
        verification_status: 'needs_review',
        rules_status: rulesResult.rulesStatus,
        coverage_percentage: 0,
        evidence_scope: 'Official exam metadata review is required before curriculum generation.',
        authority_name: null,
        subjectCount: 0,
        topicCount: 0,
        subtopicCount: 0,
        exam_subjects: [],
        marking_scheme: null,
        question_types: [],
        exam_metadata_audit_status: rulesResult.auditStatus,
        missing_verification_fields: rulesResult.missingFields || [],
        conflicting_verification_fields: rulesResult.conflictingFields || [],
      },
      message: `"${newExam.name}" has been saved for official verification. Curriculum generation is blocked until the exam pattern and sources are approved.`,
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

function buildOfficialCurriculumSpecFromEvidence(
  examRow: any,
  evidenceRows: any[],
  authorityRow: any,
  countryName: string | null,
  categoryName: string | null
): { spec: AIExamIntelligenceOutput | null; source: any | null; reason: string | null } {
  const versionYear = Number(examRow.version_year || 0);
  const authorityUrl = authorityRow?.official_website || authorityRow?.source_url || null;

  const officialSources = (evidenceRows || [])
    .filter((source: any) => {
      const sourceType = String(source.source_type || '').toLowerCase();
      if (!['official_syllabus', 'official_guideline', 'official_handbook'].includes(sourceType)) return false;
      if (String(source.verification_status || '').toLowerCase() !== 'verified') return false;
      if (!source.source_version_date || !source.source_url || !authorityUrl) return false;
      try {
        const sourceUrl = new URL(source.source_url);
        const authority = new URL(authorityUrl);
        if (sourceUrl.protocol !== 'https:' || authority.protocol !== 'https:') return false;
        const sourceHost = sourceUrl.hostname.toLowerCase().replace(/^www\./, '');
        const authorityHost = authority.hostname.toLowerCase().replace(/^www\./, '');
        if (!(sourceHost === authorityHost || sourceHost.endsWith(`.${authorityHost}`))) return false;
      } catch {
        return false;
      }
      const year = new Date(String(source.source_version_date)).getUTCFullYear();
      return Number.isFinite(year) && versionYear > 0 && year >= versionYear - 5 && year <= versionYear + 1;
    })
    .sort((a: any, b: any) => new Date(String(b.source_version_date)).getTime() - new Date(String(a.source_version_date)).getTime());

  let selectedSource: any = null;
  let subjects: any[] | null = null;
  for (const source of officialSources) {
    const normalized = normalizeOfficialSyllabusSubjects(source.extracted_data);
    if (normalized?.length) {
      selectedSource = source;
      subjects = normalized;
      break;
    }
  }

  if (!selectedSource || !subjects?.length) {
    return {
      spec: null,
      source: null,
      reason: 'OFFICIAL_SYLLABUS_STRUCTURE_MISSING: A verified official syllabus source with structured subjects, topics and subtopics is required. AI-generated guesses and starter templates are not accepted as the official curriculum.',
    };
  }

  const marking = examRow.marking_scheme && typeof examRow.marking_scheme === 'object'
    ? examRow.marking_scheme
    : {};
  const questionTypes = Array.isArray(examRow.question_types) ? examRow.question_types : [];
  const questionTypeText = questionTypes.map((item: any) => String(item)).join(' ').toLowerCase();
  const negativeText = String(examRow.negative_marking || '').toLowerCase();
  const hasNegativeMarking = typeof marking.has_negative_marking === 'boolean'
    ? marking.has_negative_marking
    : typeof examRow.negative_marking === 'boolean'
      ? examRow.negative_marking
      : /yes|true|deduct|minus|negative/.test(negativeText) && !/no negative|none|not applicable|false/.test(negativeText);
  const answerType = String(marking.answer_type || '').toLowerCase() === 'multiple' ? 'multiple' : 'single';
  const difficulty = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Adaptive'].includes(String(examRow.difficulty))
    ? examRow.difficulty
    : 'Adaptive';

  const rawSpec = {
    exam: {
      name: examRow.name,
      official_name: examRow.official_name || examRow.name,
      code: examRow.short_name || examRow.code || normalizeInput(examRow.name).slug.toUpperCase(),
      country: countryName || 'Unspecified',
      category: categoryName || 'Unspecified',
      type: examRow.exam_type || 'Unverified',
      difficulty_level: difficulty,
      difficulty_distribution: { easy: 0, medium: 0, hard: 0 },
      question_config: {
        default_question_count: Number(examRow.question_count || 0),
        option_count: Number(marking.option_count || marking.options_count || 0),
        answer_type: answerType,
        single_correct: marking.single_correct ?? answerType === 'single',
        multiple_correct: marking.multiple_correct ?? answerType === 'multiple',
        has_negative_marking: hasNegativeMarking,
        positive_mark: Number(marking.positive_mark ?? marking.marks_per_question ?? marking.correct_mark ?? 0),
        negative_mark: Number(marking.negative_mark ?? marking.negative_mark_value ?? 0),
        total_marks: Number(examRow.total_marks || 0),
        duration_minutes: Number(examRow.time_limit_mins || 0),
        time_per_question_seconds: null,
        has_image_questions: /image|diagram|picture/.test(questionTypeText),
        has_video_questions: /video/.test(questionTypeText),
        has_audio_questions: /audio|listening/.test(questionTypeText),
        has_case_based_questions: /case|scenario/.test(questionTypeText),
        has_clinical_vignettes: /clinical|vignette/.test(questionTypeText),
        has_calculation_questions: /calculation|numerical/.test(questionTypeText),
        has_matching_questions: /matching/.test(questionTypeText),
        has_true_false_questions: /true.?false/.test(questionTypeText),
        question_types: questionTypes,
      },
    },
    subjects,
    content_generation_rules: {
      mcq: {}, quiz: {}, flashcard: {}, ai_tutor: {},
      fill_in_blank: {}, notes: {}, flowchart: {},
    },
    confidence: { overall: 1, curriculum: 1, exam_rules: 1 },
    metadata: {
      curriculum_source: 'verified_official_syllabus',
      source_id: selectedSource.id,
      source_url: selectedSource.source_url,
      source_version_date: selectedSource.source_version_date,
      extracted_by: 'admin_verified_structured_evidence',
    },
  };

  const parsed = AIExamIntelligenceOutputSchema.safeParse(rawSpec);
  if (!parsed.success) {
    return {
      spec: null,
      source: selectedSource,
      reason: `OFFICIAL_SYLLABUS_STRUCTURE_INCOMPLETE: Structured syllabus evidence failed schema validation: ${parsed.error.issues.slice(0, 5).map((issue) => issue.message).join('; ')}`,
    };
  }

  return { spec: parsed.data, source: selectedSource, reason: null };
}

async function deactivateNodesOutsideOfficialSyllabus(
  examId: string,
  officialSpec: AIExamIntelligenceOutput,
  supabase: any
): Promise<{ subjects: number; topics: number; subtopics: number }> {
  const { data: savedSubjects } = await supabase
    .from('exam_subjects')
    .select('id,name,is_active,exam_topics(id,name,is_active,exam_subtopics(id,name,is_active))')
    .eq('exam_id', examId)

  let deactivatedSubjects = 0
  let deactivatedTopics = 0
  let deactivatedSubtopics = 0
  const expectedSubjects = officialSpec.subjects || []

  for (const savedSubject of savedSubjects || []) {
    const expectedSubject = findMatchingSubjectInList(savedSubject.name, expectedSubjects)
    if (!expectedSubject) {
      if (savedSubject.is_active !== false) {
        const { error } = await supabase.from('exam_subjects').update({ is_active: false }).eq('id', savedSubject.id)
        if (error) throw new Error(`Could not deactivate subject outside official syllabus: ${error.message}`)
        deactivatedSubjects += 1
      }
      continue
    }

    const expectedTopics = expectedSubject.topics || []
    for (const savedTopic of savedSubject.exam_topics || []) {
      const expectedTopic = findMatchingTopicInList(savedTopic.name, expectedTopics, expectedSubject.name)
      if (!expectedTopic) {
        if (savedTopic.is_active !== false) {
          const { error } = await supabase.from('exam_topics').update({ is_active: false }).eq('id', savedTopic.id)
          if (error) throw new Error(`Could not deactivate topic outside official syllabus: ${error.message}`)
          deactivatedTopics += 1
        }
        continue
      }

      const expectedSubtopics = expectedTopic.subtopics || []
      for (const savedSubtopic of savedTopic.exam_subtopics || []) {
        const expectedSubtopic = findMatchingSubtopicInList(savedSubtopic.name, expectedSubtopics, expectedTopic.name)
        if (!expectedSubtopic && savedSubtopic.is_active !== false) {
          const { error } = await supabase.from('exam_subtopics').update({ is_active: false }).eq('id', savedSubtopic.id)
          if (error) throw new Error(`Could not deactivate subtopic outside official syllabus: ${error.message}`)
          deactivatedSubtopics += 1
        }
      }
    }
  }

  return {
    subjects: deactivatedSubjects,
    topics: deactivatedTopics,
    subtopics: deactivatedSubtopics,
  }
}

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
  void specOverride

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

  // 2. Query exam record, authority, official evidence and current version.
  const { data: examRow } = await supabase.from('exams').select('*').eq('id', examId).maybeSingle()
  if (!examRow) {
    return {
      subjectCount: 0, topicCount: 0, subtopicCount: 0, subjects: [],
      curriculumStatus: 'needs_enrichment', verificationStatus: 'needs_review',
      coveragePercentage: 0, evidenceScope: 'Exam record not found.',
      authorityName: null,
    }
  }

  const [{ data: evidenceRows }, { data: versionRows }, { data: authorityRow }, { data: countryRow }, { data: categoryRow }] = await Promise.all([
    supabase.from('exam_evidence').select('*').eq('exam_id', examId),
    supabase.from('exam_versions').select('*').eq('exam_id', examId),
    examRow.authority_id
      ? supabase.from('exam_authorities').select('*').eq('id', examRow.authority_id).maybeSingle()
      : Promise.resolve({ data: null }),
    examRow.country_id
      ? supabase.from('countries').select('id,name').eq('id', examRow.country_id).maybeSingle()
      : Promise.resolve({ data: null }),
    examRow.category_id
      ? supabase.from('exam_categories').select('id,name').eq('id', examRow.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const currentVersion = (versionRows || []).find((version: any) => version.is_current === true) || null
  const examMetadata = examRow.metadata || {}
  const examMetadataAuditStatus = String(examMetadata.exam_metadata_audit_status || '')
  const authorityVerified = authorityRow?.verification_status === 'verified'
    && Boolean(authorityRow?.official_website)
    && Boolean(authorityRow?.last_verified_at)
    && (Date.now() - new Date(authorityRow.last_verified_at).getTime()) <= 366 * 24 * 60 * 60 * 1000
  const currentVersionVerified = currentVersion?.verification_status === 'verified'
    && Boolean(currentVersion?.verified_at)
    && Number(currentVersion?.version_year || 0) === Number(examRow.version_year || 0)
    && Boolean(currentVersion?.source_url)
  const nextVerificationAt = examRow.next_verification_at ? new Date(examRow.next_verification_at).getTime() : 0
  const auditApproved = examRow.verification_status === 'verified'
    && examMetadataAuditStatus === 'verified'
    && authorityVerified
    && currentVersionVerified
    && nextVerificationAt > Date.now()

  if (!auditApproved) {
    return {
      subjectCount: 0,
      topicCount: 0,
      subtopicCount: 0,
      subjects: [],
      curriculumStatus: 'needs_enrichment',
      verificationStatus: 'needs_review',
      coveragePercentage: 0,
      evidenceScope: 'Blocked: current authority, exam version and field-level official metadata audit are not all verified.',
      authorityName: authorityRow?.name || null,
    }
  }

  // 3. Curriculum hierarchy is sourced only from a verified official syllabus.
  // Cached AI guesses and starter templates are deliberately ignored.
  const officialSpecResult = buildOfficialCurriculumSpecFromEvidence(
    examRow,
    evidenceRows || [],
    authorityRow,
    countryRow?.name || countryHint || null,
    categoryRow?.name || categoryHint || null
  )

  const existing = existingSubjects || []
  const existingTopicCount = existing.reduce((n: number, subject: any) => n + (subject.exam_topics || []).length, 0)
  const existingSubtopicCount = existing.reduce((n: number, subject: any) =>
    n + (subject.exam_topics || []).reduce((m: number, topic: any) => m + (topic.exam_subtopics || []).length, 0), 0)

  if (!officialSpecResult.spec) {
    const nextMetadata = {
      ...examMetadata,
      curriculum_status: 'needs_enrichment',
      curriculum_validation_passed: false,
      curriculum_validation_version: 0,
      curriculum_source_status: 'missing_structured_official_syllabus',
      curriculum_source_requirement: officialSpecResult.reason,
    }
    await supabase.from('exams').update({ metadata: nextMetadata, updated_at: new Date().toISOString() }).eq('id', examId)
    return {
      subjectCount: existing.length,
      topicCount: existingTopicCount,
      subtopicCount: existingSubtopicCount,
      subjects: existing,
      curriculumStatus: 'needs_enrichment',
      verificationStatus: 'needs_review',
      coveragePercentage: 0,
      evidenceScope: officialSpecResult.reason || 'OFFICIAL_SYLLABUS_STRUCTURE_MISSING',
      authorityName: authorityRow?.name || null,
    }
  }

  const aiSpec = officialSpecResult.spec
  if (!isCurriculumSpecComprehensive(examName, aiSpec)) {
    const reason = 'OFFICIAL_SYLLABUS_STRUCTURE_INCOMPLETE: Official source structure does not meet the required subject, topic and subtopic coverage threshold. No AI-inferred hierarchy was persisted.'
    await supabase.from('exams').update({
      metadata: {
        ...examMetadata,
        curriculum_status: 'needs_enrichment',
        curriculum_validation_passed: false,
        curriculum_validation_version: 0,
        curriculum_source_status: 'incomplete_structured_official_syllabus',
        curriculum_source_requirement: reason,
        curriculum_spec_cache: null,
        curriculum_spec_cached_at: null,
        curriculum_source_evidence_id: officialSpecResult.source?.id || null,
        curriculum_source_url: officialSpecResult.source?.source_url || null,
        curriculum_source_version_date: officialSpecResult.source?.source_version_date || null,
      },
      updated_at: new Date().toISOString(),
    }).eq('id', examId)
    return {
      subjectCount: existing.length,
      topicCount: existingTopicCount,
      subtopicCount: existingSubtopicCount,
      subjects: existing,
      curriculumStatus: 'needs_enrichment',
      verificationStatus: 'needs_review',
      coveragePercentage: 0,
      evidenceScope: reason,
      authorityName: authorityRow?.name || null,
    }
  }

  const { error: cacheError } = await supabase.from('exams').update({
    metadata: {
      ...examMetadata,
      curriculum_spec_cache: aiSpec,
      curriculum_spec_cached_at: new Date().toISOString(),
      curriculum_source_status: 'verified_official_syllabus',
      curriculum_source_evidence_id: officialSpecResult.source?.id || null,
      curriculum_source_url: officialSpecResult.source?.source_url || null,
      curriculum_source_version_date: officialSpecResult.source?.source_version_date || null,
    },
    updated_at: new Date().toISOString(),
  }).eq('id', examId)
  if (cacheError) console.warn('[Curriculum Intelligence] Could not cache official syllabus spec:', cacheError.message)

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

  const deactivatedOutOfScopeNodes = await deactivateNodesOutsideOfficialSyllabus(examId, aiSpec, supabase)
  await deactivateGenericCurriculumNodes(examId, supabase)

  // Acceptance gate: compare against the expected tree AND absolute breadth/depth.
  // Relative coverage alone can falsely bless a tiny AI-generated syllabus.
  const specIsComprehensive = isCurriculumSpecComprehensive(examName, aiSpec)
  let hierarchyTargetsMet =
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

  const exactOfficialHierarchy =
    finalSubjects.length === aiSpec.subjects.length &&
    aiSpec.subjects.every((expectedSubject: any) => {
      const savedSubject = findMatchingSubjectInList(expectedSubject.name, finalSubjects)
      if (!savedSubject) return false
      const expectedTopics = expectedSubject.topics || []
      const savedTopics = savedSubject.exam_topics || []
      if (savedTopics.length !== expectedTopics.length) return false
      return expectedTopics.every((expectedTopic: any) => {
        const savedTopic = findMatchingTopicInList(expectedTopic.name, savedTopics, expectedSubject.name)
        if (!savedTopic) return false
        const expectedSubtopics = expectedTopic.subtopics || []
        const savedSubtopics = savedTopic.exam_subtopics || []
        if (savedSubtopics.length !== expectedSubtopics.length) return false
        return expectedSubtopics.every((expectedSubtopic: any) =>
          Boolean(findMatchingSubtopicInList(expectedSubtopic.name, savedSubtopics, expectedTopic.name))
        )
      })
    })
  hierarchyTargetsMet = hierarchyTargetsMet && exactOfficialHierarchy

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
  const curriculumVerificationStatus = hierarchyTargetsMet ? 'verified' : 'needs_review'
  const officialSourceUrl = officialSpecResult.source?.source_url || null
  const officialEvidenceScope = `Curriculum reconciled against verified official syllabus source: ${officialSourceUrl || 'source URL unavailable'}; evidence ID: ${officialSpecResult.source?.id || 'unknown'}.`
  const sourceReference = `${examName} Official Syllabus Reconciliation`
  const evidencePayload = {
    exam_id: examId,
    source_url: officialSourceUrl,
    source_reference: sourceReference,
    source_type: 'other',
    publisher_authority: authorityRow?.name || null,
    verification_status: 'pending',
    extracted_data: {
      source_evidence_id: officialSpecResult.source?.id || null,
      source_version_date: officialSpecResult.source?.source_version_date || null,
      coverage_percentage: evalResult.coveragePercentage,
      matched_subjects: comparisonReport.matchedSubjects,
      total_expected_subjects: comparisonReport.totalExpectedSubjects,
      matched_topics: comparisonReport.matchedTopics,
      total_expected_topics: comparisonReport.totalExpectedTopics,
      evidence_scope: officialEvidenceScope,
      reconciled_at: new Date().toISOString(),
      generated_by: 'official_syllabus_reconciliation',
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

  // 8. Persist curriculum validation separately from official exam-pattern approval.
  // The latter is owned by the field-level audit and admin approval workflow.
  const { error: examStatusError } = await supabase
    .from('exams')
    .update({
      syllabus_info: {
        ...(examRow?.syllabus_info || {}),
        source: 'verified_official_syllabus',
        coverage_percentage: evalResult.coveragePercentage,
        evidence_scope: officialEvidenceScope,
        authority: authorityRow?.name || null,
        source_evidence_id: officialSpecResult.source?.id || null,
        source_url: officialSourceUrl,
        source_version_date: officialSpecResult.source?.source_version_date || null,
      },
      metadata: {
        ...(examRow?.metadata || {}),
        curriculum_status: hierarchyTargetsMet && examMetadataAuditStatus === 'verified' ? 'ready' : 'needs_enrichment',
        curriculum_validation_version: 4,
        curriculum_validation_passed: hierarchyTargetsMet && examMetadataAuditStatus === 'verified',
        curriculum_source_status: 'verified_official_syllabus',
        curriculum_source_evidence_id: officialSpecResult.source?.id || null,
        curriculum_source_url: officialSourceUrl,
        curriculum_source_version_date: officialSpecResult.source?.source_version_date || null,
        curriculum_deactivated_out_of_scope_nodes: deactivatedOutOfScopeNodes,
        curriculum_validation_checked_at: new Date().toISOString(),
        curriculum_spec_cache: aiSpec,
        curriculum_spec_cached_at: (examRow?.metadata as any)?.curriculum_spec_cached_at || new Date().toISOString(),
        rules_status: (examRow?.metadata || {}).rules_status || 'needs_review',
        curriculum_verification_status: curriculumVerificationStatus,
        curriculum_verification_audit: {
          official_evidence_present: true,
          authority_verified: authorityVerified,
          current_exam_version_verified: currentVersionVerified,
          coverage_percentage: evalResult.coveragePercentage,
          status: curriculumVerificationStatus,
          source_url: officialSourceUrl,
          source_evidence_id: officialSpecResult.source?.id || null,
          checked_at: new Date().toISOString(),
        },
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
    verificationStatus: curriculumVerificationStatus,
    coveragePercentage: evalResult.coveragePercentage,
    evidenceScope: officialEvidenceScope,
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
  verificationStatus: 'needs_review'
  auditStatus: 'needs_review' | 'ready_for_review'
  auditId: string | null
  missingFields: string[]
  conflictingFields: any[]
  marking_scheme: any
  question_types: any[]
  duration_minutes: number | null
  question_count: number | null
}> {
  const supabase = supabaseClient || getSupabaseAdmin()

  const [{ data: examRow, error: examError }, { data: versionRows }, { data: evidenceRows }] = await Promise.all([
    supabase.from('exams').select('*').eq('id', examId).single(),
    supabase.from('exam_versions').select('*').eq('exam_id', examId),
    supabase.from('exam_evidence').select('*').eq('exam_id', examId),
  ])

  if (examError || !examRow) {
    throw new Error(`Cannot audit exam rules for ${examName}: ${examError?.message || 'exam not found'}`)
  }

  const [{ data: countryRow }, { data: categoryRow }, { data: authorityRow }] = await Promise.all([
    examRow.country_id
      ? supabase.from('countries').select('id, name, iso2').eq('id', examRow.country_id).maybeSingle()
      : Promise.resolve({ data: null }),
    examRow.category_id
      ? supabase.from('exam_categories').select('id, name, slug').eq('id', examRow.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    examRow.authority_id
      ? supabase.from('exam_authorities').select('*').eq('id', examRow.authority_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Rules may be read from the stored record for audit comparison, but no fallback
  // template or AI-generated profile is allowed to supply official exam facts.
  const rulesValidation = detectAndValidateExamRules(
    examRow,
    versionRows || [],
    evidenceRows || [],
    undefined
  )

  const audit = buildExamMetadataAudit({
    exam: examRow,
    country: countryRow,
    category: categoryRow,
    authority: authorityRow,
    versions: versionRows || [],
    evidence: evidenceRows || [],
  })

  const previousAuditUpdate = await supabase
    .from('exam_verification_audits')
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq('exam_id', examId)
    .eq('is_current', true)

  if (previousAuditUpdate.error) {
    console.error('[Exam Rules Process B] Could not close prior metadata audit:', previousAuditUpdate.error)
  }

  const { data: auditRow, error: auditInsertError } = await supabase
    .from('exam_verification_audits')
    .insert({
      exam_id: examId,
      exam_version_id: audit.current_exam_version_id,
      audit_version: audit.audit_version,
      status: audit.status,
      field_results: audit.field_results,
      missing_fields: audit.missing_fields,
      conflicting_fields: audit.conflicting_fields,
      source_ids: audit.source_ids,
      source_urls: audit.source_urls,
      checked_at: audit.checked_at,
      is_current: true,
    })
    .select('id')
    .single()

  if (auditInsertError) {
    console.error('[Exam Rules Process B] Failed to persist field-level audit:', auditInsertError)
  }

  const auditStatus = auditInsertError ? 'needs_review' : audit.status
  const rulesStatus: 'ready' | 'partial' | 'needs_review' =
    auditStatus === 'ready_for_review' ? 'ready' : 'needs_review'
  const auditId = auditRow?.id || null
  const combinedConflicts = [
    ...(rulesValidation.conflictDetails || []).map((reason: string) => ({ reason })),
    ...(audit.conflicting_fields || []),
  ]

  const metadata = {
    ...(examRow.metadata || {}),
    rules_conflicts: combinedConflicts,
    rules_status: rulesStatus,
    exam_metadata_audit_status: auditStatus,
    exam_metadata_audit_id: auditId,
    exam_metadata_audit_checked_at: audit.checked_at,
    exam_metadata_audit_summary: {
      status: auditStatus,
      missing_fields: audit.missing_fields,
      conflicting_fields: audit.conflicting_fields,
      source_urls: audit.source_urls,
      authority_domain: audit.authority_domain,
      current_exam_version_id: audit.current_exam_version_id,
      current_version_year: audit.current_version_year,
      official_evidence_count: audit.official_evidence_count,
      candidate_official_evidence_count: audit.candidate_official_evidence_count,
    },
    provisional_exam_rules: {
      question_count: rulesValidation.question_count,
      duration_minutes: rulesValidation.duration_minutes,
      marking_scheme: rulesValidation.marking_scheme,
      question_types: rulesValidation.question_types,
      status: 'unverified_until_official_audit_approval',
      source: 'stored_exam_fields_or_verified_evidence_only',
    },
  }

  const { error: examUpdateError } = await supabase
    .from('exams')
    .update({
      verification_status: 'needs_review',
      last_verified_at: null,
      next_verification_at: null,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', examId)

  if (examUpdateError) {
    console.error('[Exam Rules Process B] Failed to persist exam metadata audit summary:', examUpdateError)
  }

  return {
    rulesStatus,
    verificationStatus: 'needs_review',
    auditStatus,
    auditId,
    missingFields: audit.missing_fields || [],
    conflictingFields: audit.conflicting_fields || [],
    marking_scheme: null,
    question_types: [],
    duration_minutes: null,
    question_count: null,
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
        } else {
          throw new Error(
            `Failed to persist curriculum subject "${sItem.name}": ${subErr?.message || 'insert returned no row'}`
          )
        }
      }
    }

    if (!subjectId) {
      throw new Error(`Curriculum subject "${sItem.name}" could not be resolved after insertion.`)
    }

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
          } else {
            throw new Error(
              `Failed to persist curriculum topic "${tItem.name}" under "${sItem.name}": ${topErr?.message || 'insert returned no row'}`
            )
          }
        }
      }

      if (!topicId) {
        throw new Error(`Curriculum topic "${tItem.name}" under "${sItem.name}" could not be resolved after insertion.`)
      }

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
