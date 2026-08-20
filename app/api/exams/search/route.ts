import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { GLOBAL_EXAM_REGISTRY } from '@/lib/data/exam-registry'
import { normalizeInput, calculateLevenshteinSimilarity } from '@/lib/knowledge/normalizer'
import { classifyUserInput } from '@/lib/knowledge/classifier'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rawQuery = searchParams.get('q')?.trim() || ''
    const countryFilter = searchParams.get('country')?.trim()
    const categoryFilter = searchParams.get('category')?.trim()
    const featuredOnly = searchParams.get('featured') === 'true'

    const supabase = getSupabaseAdmin()

    // 1. If query is empty and featured requested, return featured exams
    if (!rawQuery) {
      // Query DB for active featured exams
      const { data: dbExams } = await (supabase as any)
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
          official_website,
          countries(name, iso2, flag_emoji),
          exam_categories(name, slug)
        `)
        .eq('status', 'active')
        .limit(20)

      const dbMap = new Map<string, any>()
      ;(dbExams || []).forEach((e: any) => {
        dbMap.set(e.slug, {
          id: e.id,
          name: e.name,
          slug: e.slug,
          category: e.exam_categories?.name || 'Professional Certification',
          country: e.countries?.name || 'Global',
          flag: e.countries?.flag_emoji || '🌐',
          description: e.description || '',
          difficulty: e.difficulty || 'Intermediate',
          question_count: e.question_count || 100,
          time_limit_mins: e.time_limit_mins || 120,
          is_featured: e.is_featured,
          in_database: true,
        })
      })

      // Add featured from Global Registry if not already in DB
      GLOBAL_EXAM_REGISTRY.forEach((reg) => {
        if (!dbMap.has(reg.slug) && (featuredOnly ? reg.isFeatured : true)) {
          dbMap.set(reg.slug, {
            id: `reg-${reg.slug}`,
            name: reg.canonicalName,
            slug: reg.slug,
            category: reg.category,
            country: reg.country,
            flag: reg.country === 'India' ? '🇮🇳' : reg.country === 'United States' ? '🇺🇸' : reg.country === 'United Kingdom' ? '🇬🇧' : reg.country === 'Canada' ? '🇨🇦' : reg.country === 'Australia' ? '🇦🇺' : '🌐',
            description: `Official ${reg.canonicalName} (${reg.organization})`,
            difficulty: reg.difficulty,
            question_count: reg.questionCount,
            time_limit_mins: reg.timeLimitMins,
            is_featured: reg.isFeatured,
            in_database: false,
          })
        }
      })

      const list = Array.from(dbMap.values())
      return NextResponse.json({
        success: true,
        total: list.length,
        exams: list,
      })
    }

    // 2. Classify Input & Normalize
    const classification = classifyUserInput(rawQuery)
    const norm = normalizeInput(rawQuery)
    const cleanQuery = norm.canonical.toLowerCase()
    const querySlug = norm.slug.toLowerCase()

    // 3. Search Supabase Database
    const { data: dbMatches } = await (supabase as any)
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
        countries(name, iso2, flag_emoji),
        exam_categories(name, slug)
      `)
      .neq('status', 'archived')
      .or(`name.ilike.%${rawQuery}%,slug.ilike.%${querySlug}%,description.ilike.%${rawQuery}%`)
      .limit(20)

    const scoredResults: Array<{ exam: any; score: number }> = []
    const seenSlugs = new Set<string>()

    // Score DB matches
    ;(dbMatches || []).forEach((dbExam: any) => {
      seenSlugs.add(dbExam.slug)
      let score = 50

      const examNameLower = dbExam.name.toLowerCase()
      if (examNameLower === cleanQuery || dbExam.slug === querySlug) {
        score = 100
      } else if (examNameLower.startsWith(cleanQuery)) {
        score = 90
      } else if (examNameLower.includes(cleanQuery)) {
        score = 80
      } else if (dbExam.aliases && Array.isArray(dbExam.aliases)) {
        if (dbExam.aliases.some((a: string) => a.toLowerCase() === cleanQuery)) {
          score = 95
        }
      }

      scoredResults.push({
        exam: {
          id: dbExam.id,
          name: dbExam.name,
          slug: dbExam.slug,
          category: dbExam.exam_categories?.name || 'Professional Licensing',
          country: dbExam.countries?.name || 'Global',
          flag: dbExam.countries?.flag_emoji || '🌐',
          description: dbExam.description || '',
          difficulty: dbExam.difficulty || 'Intermediate',
          question_count: dbExam.question_count || 100,
          time_limit_mins: dbExam.time_limit_mins || 120,
          is_featured: dbExam.is_featured,
          in_database: true,
        },
        score,
      })
    })

    // 4. Search Global Registry for comprehensive matches
    GLOBAL_EXAM_REGISTRY.forEach((reg) => {
      let regScore = 0
      const regNameLower = reg.canonicalName.toLowerCase()

      // Exact match on slug, name, or aliases
      if (reg.slug === querySlug || regNameLower === cleanQuery) {
        regScore = 100
      } else if (reg.aliases.some((a) => a.toLowerCase() === cleanQuery)) {
        regScore = 98
      } else if (reg.aliases.some((a) => a.toLowerCase().includes(cleanQuery) || cleanQuery.includes(a.toLowerCase()))) {
        regScore = 85
      } else if (regNameLower.includes(cleanQuery)) {
        regScore = 80
      } else {
        // Levenshtein fuzzy match
        for (const al of reg.aliases) {
          const sim = calculateLevenshteinSimilarity(cleanQuery, al.toLowerCase())
          if (sim > regScore) regScore = sim
        }
      }

      if (regScore >= 60) {
        const flag =
          reg.country === 'India'
            ? '🇮🇳'
            : reg.country === 'United States'
            ? '🇺🇸'
            : reg.country === 'United Kingdom'
            ? '🇬🇧'
            : reg.country === 'Canada'
            ? '🇨🇦'
            : reg.country === 'Australia'
            ? '🇦🇺'
            : reg.country === 'United Arab Emirates'
            ? '🇦🇪'
            : '🌐'

        // If not already in results with higher score, add it
        const existingIdx = scoredResults.findIndex((r) => r.exam.slug === reg.slug)
        if (existingIdx !== -1) {
          if (regScore > scoredResults[existingIdx].score) {
            scoredResults[existingIdx].score = regScore
          }
        } else {
          scoredResults.push({
            exam: {
              id: `reg-${reg.slug}`,
              name: reg.canonicalName,
              slug: reg.slug,
              category: reg.category,
              country: reg.country,
              flag,
              description: `Official ${reg.canonicalName} (${reg.organization})`,
              difficulty: reg.difficulty,
              question_count: reg.questionCount,
              time_limit_mins: reg.timeLimitMins,
              is_featured: reg.isFeatured,
              in_database: false,
            },
            score: regScore,
          })
        }
      }
    })

    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score)

    let finalExams = scoredResults.map((r) => r.exam)

    // Apply country/category filters if specified
    if (countryFilter && countryFilter !== 'all') {
      finalExams = finalExams.filter((e) => e.country.toLowerCase().includes(countryFilter.toLowerCase()))
    }
    if (categoryFilter && categoryFilter !== 'all') {
      finalExams = finalExams.filter((e) => e.category.toLowerCase().includes(categoryFilter.toLowerCase()))
    }

    return NextResponse.json({
      success: true,
      query: rawQuery,
      classification,
      total: finalExams.length,
      exams: finalExams,
    })
  } catch (error: any) {
    console.error('Exam Search Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search exam registry' },
      { status: 500 }
    )
  }
}
