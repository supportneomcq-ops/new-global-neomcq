import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { GLOBAL_EXAM_REGISTRY } from '@/lib/data/exam-registry'
import { classifyUserInput } from '@/lib/knowledge/classifier'
import { normalizeInput, calculateLevenshteinSimilarity } from '@/lib/knowledge/normalizer'
import { ensureExamCurriculum } from '@/lib/knowledge/curriculum-generator'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { examQuery, country, category, userId } = body

    if (!examQuery || typeof examQuery !== 'string' || !examQuery.trim()) {
      return NextResponse.json({ success: false, error: 'Exam search term is required' }, { status: 400 })
    }

    const rawInput = examQuery.trim()

    // -------------------------------------------------------------
    // STEP 1: Input Classification & Country Guard
    // -------------------------------------------------------------
    const classification = classifyUserInput(rawInput)

    if (classification.type === 'COUNTRY') {
      return NextResponse.json(
        {
          success: false,
          error: `"${rawInput}" is a country or geographical region, not an examination. Please select or search for an examination (e.g. FMGE, NEET PG, USMLE, UPSC, CFA, NCLEX, AWS).`,
          classification,
        },
        { status: 400 }
      )
    }

    const norm = normalizeInput(rawInput)
    const cleanQuery = norm.canonical.toLowerCase()
    const querySlug = norm.slug.toLowerCase()
    const supabase = getSupabaseAdmin()

    // -------------------------------------------------------------
    // STEP 2: Search Supabase Database for existing exam
    // -------------------------------------------------------------
    const { data: existingExams } = await (supabase as any)
      .from('exams')
      .select(`
        id,
        name,
        slug,
        description,
        difficulty,
        question_count,
        time_limit_mins,
        is_featured,
        aliases,
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
            order_index
          )
        )
      `)
      .neq('status', 'archived')
      .or(`slug.eq.${querySlug},name.ilike.%${cleanQuery}%`)
      .limit(10)

    let matchedExam: any = null

    if (existingExams && existingExams.length > 0) {
      // Find best match
      matchedExam = existingExams.find(
        (e: any) =>
          e.slug === querySlug ||
          e.name.toLowerCase() === cleanQuery ||
          (e.aliases && Array.isArray(e.aliases) && e.aliases.some((a: string) => a.toLowerCase() === cleanQuery))
      ) || existingExams[0]
    }

    // Check alias table if still not found
    if (!matchedExam) {
      try {
        const { data: aliasMatch } = await (supabase as any)
          .from('exam_aliases')
          .select('exam_id, exams(*, exam_subjects(id, name, slug, description, exam_topics(id, name, slug)))')
          .ilike('alias', cleanQuery)
          .maybeSingle()

        if (aliasMatch && aliasMatch.exams) {
          matchedExam = aliasMatch.exams
        }
      } catch (aliasErr) {
        // Non-blocking
      }
    }

    // -------------------------------------------------------------
    // STEP 3: If exam found in DB, check curriculum and return
    // -------------------------------------------------------------
    if (matchedExam) {
      let subjects = matchedExam.exam_subjects || []

      // If existing DB exam has no subjects/topics yet, ensure lazy curriculum
      if (subjects.length === 0) {
        await ensureExamCurriculum(matchedExam.id, matchedExam.name, matchedExam.slug)

        const { data: refreshedSubjects } = await (supabase as any)
          .from('exam_subjects')
          .select('id, name, slug, description, weight_percentage, exam_topics(id, name, slug, description)')
          .eq('exam_id', matchedExam.id)
          .order('order_index', { ascending: true })

        subjects = refreshedSubjects || []
      }

      // Record to user_exams if userId provided
      if (userId) {
        try {
          await (supabase as any).from('user_exams').upsert({
            user_id: userId,
            exam_id: matchedExam.id,
            is_primary: true,
            status: 'active',
            last_accessed_at: new Date().toISOString(),
          })
        } catch (ueErr) {
          console.warn('user_exams link note:', ueErr)
        }
      }

      return NextResponse.json({
        success: true,
        reused: true,
        exam: {
          id: matchedExam.id,
          name: matchedExam.name,
          slug: matchedExam.slug,
          description: matchedExam.description,
          difficulty: matchedExam.difficulty || 'Intermediate',
          question_count: matchedExam.question_count || 100,
          time_limit_mins: matchedExam.time_limit_mins || 120,
          country: matchedExam.countries?.name || 'Global',
          flag: matchedExam.countries?.flag_emoji || '🌐',
          exam_subjects: subjects,
        },
        message: `Resolved canonical exam '${matchedExam.name}'.`,
      })
    }

    // -------------------------------------------------------------
    // STEP 4: Match Global Exam Registry
    // -------------------------------------------------------------
    let registryEntry = GLOBAL_EXAM_REGISTRY.find(
      (r) =>
        r.slug === querySlug ||
        r.canonicalName.toLowerCase() === cleanQuery ||
        r.aliases.some((a) => a.toLowerCase() === cleanQuery)
    )

    // Fuzzy match against registry if direct alias didn't hit
    if (!registryEntry) {
      let bestSim = 0
      for (const reg of GLOBAL_EXAM_REGISTRY) {
        for (const al of reg.aliases) {
          const sim = calculateLevenshteinSimilarity(cleanQuery, al.toLowerCase())
          if (sim > bestSim && sim >= 85) {
            bestSim = sim
            registryEntry = reg
          }
        }
      }
    }

    // Country & Category Resolution
    let countryId: string | null = null
    let categoryId: string | null = null

    const targetCountryName = registryEntry?.country || country || 'Global'
    const { data: countryRow } = await (supabase as any)
      .from('countries')
      .select('id')
      .ilike('name', targetCountryName)
      .maybeSingle()
    if (countryRow) countryId = countryRow.id

    const targetCatSlug =
      registryEntry?.category?.toLowerCase().includes('medic') || registryEntry?.category?.toLowerCase().includes('nurs')
        ? 'medical-healthcare'
        : registryEntry?.category?.toLowerCase().includes('tech') || registryEntry?.category?.toLowerCase().includes('engineer') || registryEntry?.category?.toLowerCase().includes('cloud')
        ? 'engineering-tech'
        : registryEntry?.category?.toLowerCase().includes('finan') || registryEntry?.category?.toLowerCase().includes('account')
        ? 'business-finance'
        : registryEntry?.category?.toLowerCase().includes('law') || registryEntry?.category?.toLowerCase().includes('civil')
        ? 'civil-services-govt'
        : 'medical-healthcare'

    const { data: catRow } = await (supabase as any)
      .from('exam_categories')
      .select('id')
      .eq('slug', targetCatSlug)
      .maybeSingle()
    if (catRow) categoryId = catRow.id

    // -------------------------------------------------------------
    // STEP 5: Create Canonical Exam Record in Supabase
    // -------------------------------------------------------------
    const examName = registryEntry?.canonicalName || rawInput
    const examSlug = registryEntry?.slug || querySlug
    const examDesc =
      (registryEntry as any)?.description ||
      `Official examination preparation and curriculum for ${examName} (${registryEntry?.organization || 'Accredited Board'}).`

    const { data: insertedExam, error: insertExamErr } = await (supabase as any)
      .from('exams')
      .insert({
        name: examName,
        slug: examSlug,
        description: examDesc,
        difficulty: registryEntry?.difficulty || 'Intermediate',
        question_count: registryEntry?.questionCount || 100,
        time_limit_mins: registryEntry?.timeLimitMins || 120,
        country_id: countryId,
        category_id: categoryId,
        aliases: registryEntry?.aliases || [rawInput],
        official_website: registryEntry?.officialWebsite || null,
        status: 'active',
        is_featured: registryEntry?.isFeatured || false,
      })
      .select('id, name, slug, description, difficulty, question_count, time_limit_mins')
      .single()

    if (insertExamErr || !insertedExam) {
      console.error('Failed to insert new exam:', insertExamErr)
      throw new Error(`Database error resolving exam: ${insertExamErr?.message || 'Unknown'}`)
    }

    // -------------------------------------------------------------
    // STEP 6: Lazy Curriculum Preparation
    // -------------------------------------------------------------
    await ensureExamCurriculum(insertedExam.id, insertedExam.name, insertedExam.slug)

    // Retrieve generated curriculum
    const { data: generatedSubjects } = await (supabase as any)
      .from('exam_subjects')
      .select('id, name, slug, description, weight_percentage, exam_topics(id, name, slug, description)')
      .eq('exam_id', insertedExam.id)
      .order('order_index', { ascending: true })

    // Link user if authenticated
    if (userId) {
      try {
        await (supabase as any).from('user_exams').upsert({
          user_id: userId,
          exam_id: insertedExam.id,
          is_primary: true,
          status: 'active',
          last_accessed_at: new Date().toISOString(),
        })
      } catch (ueErr) {
        console.warn('user_exams link note:', ueErr)
      }
    }

    return NextResponse.json({
      success: true,
      reused: false,
      exam: {
        id: insertedExam.id,
        name: insertedExam.name,
        slug: insertedExam.slug,
        description: insertedExam.description,
        difficulty: insertedExam.difficulty,
        question_count: insertedExam.question_count,
        time_limit_mins: insertedExam.time_limit_mins,
        country: targetCountryName,
        flag: targetCountryName === 'India' ? '🇮🇳' : targetCountryName === 'United States' ? '🇺🇸' : '🌐',
        exam_subjects: generatedSubjects || [],
      },
      message: `Initialized canonical curriculum for '${insertedExam.name}'.`,
    })
  } catch (error: any) {
    console.error('Exam Resolution API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resolve exam curriculum' },
      { status: 500 }
    )
  }
}
