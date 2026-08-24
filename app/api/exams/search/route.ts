import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { normalizeInput } from '@/lib/knowledge/normalizer'
import { classifyUserInput } from '@/lib/knowledge/classifier'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rawQuery = searchParams.get('q')?.trim() || ''
    const countryFilter = searchParams.get('country')?.trim()
    const categoryFilter = searchParams.get('category')?.trim()
    const featuredOnly = searchParams.get('featured') === 'true'

    const supabase = getSupabaseAdmin()

    // 1. If query is empty, fetch featured or all active verified exams from DB
    if (!rawQuery) {
      let dbQuery = (supabase as any)
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
        .eq('verification_status', 'verified')

      if (featuredOnly) {
        dbQuery = dbQuery.eq('is_featured', true)
      }

      const { data: dbExams, error: dbErr } = await dbQuery.order('name', { ascending: true }).limit(50)

      if (dbErr) {
        console.error('Error fetching exams from DB:', dbErr)
        return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 })
      }

      let list = (dbExams || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        slug: e.slug,
        category: e.exam_categories?.name || 'Professional Licensing',
        country: e.countries?.name || 'India',
        flag: e.countries?.flag_emoji || '🇮🇳',
        description: e.description || '',
        difficulty: e.difficulty || 'Intermediate',
        question_count: e.question_count || 100,
        time_limit_mins: e.time_limit_mins || 120,
        is_featured: e.is_featured,
        in_database: true,
      }))

      if (countryFilter && countryFilter !== 'all') {
        list = list.filter((e: any) => e.country.toLowerCase().includes(countryFilter.toLowerCase()))
      }
      if (categoryFilter && categoryFilter !== 'all') {
        list = list.filter((e: any) => e.category.toLowerCase().includes(categoryFilter.toLowerCase()))
      }

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

    // 3. Search Supabase DB: fetch exams table
    const { data: dbMatches, error: searchErr } = await (supabase as any)
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
      .eq('status', 'active')
      .eq('verification_status', 'verified')
      .or(`name.ilike.%${rawQuery}%,slug.ilike.%${querySlug}%,description.ilike.%${rawQuery}%`)
      .limit(50)

    if (searchErr) {
      console.error('DB exam search error:', searchErr)
    }

    // Also check exam_aliases table
    const { data: aliasMatches } = await (supabase as any)
      .from('exam_aliases')
      .select(`
        exam_id,
        alias,
        exams (
          id,
          name,
          slug,
          description,
          difficulty,
          question_count,
          time_limit_mins,
          is_featured,
          aliases,
          status,
          verification_status,
          countries(name, iso2, flag_emoji),
          exam_categories(name, slug)
        )
      `)
      .ilike('alias', `%${rawQuery}%`)
      .limit(30)

    const examMap = new Map<string, { exam: any; score: number }>()

    // Helper to process exam record
    const processExamRecord = (dbExam: any, aliasMatched: string | null = null) => {
      if (!dbExam || dbExam.status !== 'active' || dbExam.verification_status !== 'verified') return
      if (examMap.has(dbExam.id)) {
        // If already present, maybe upgrade score if exact match
        const existing = examMap.get(dbExam.id)!
        if (aliasMatched && aliasMatched.toLowerCase() === cleanQuery) {
          existing.score = Math.max(existing.score, 98)
        }
        return
      }

      let score = 50
      const nameLower = dbExam.name.toLowerCase()

      if (nameLower === cleanQuery || dbExam.slug === querySlug) {
        score = 100
      } else if (aliasMatched && aliasMatched.toLowerCase() === cleanQuery) {
        score = 98
      } else if (nameLower.startsWith(cleanQuery)) {
        score = 90
      } else if (nameLower.includes(cleanQuery)) {
        score = 80
      } else if (dbExam.aliases && Array.isArray(dbExam.aliases)) {
        if (dbExam.aliases.some((a: string) => a.toLowerCase() === cleanQuery)) {
          score = 95
        } else if (dbExam.aliases.some((a: string) => a.toLowerCase().includes(cleanQuery))) {
          score = 85
        }
      }

      examMap.set(dbExam.id, {
        exam: {
          id: dbExam.id,
          name: dbExam.name,
          slug: dbExam.slug,
          category: dbExam.exam_categories?.name || 'Professional Licensing',
          country: dbExam.countries?.name || 'India',
          flag: dbExam.countries?.flag_emoji || '🇮🇳',
          description: dbExam.description || '',
          difficulty: dbExam.difficulty || 'Intermediate',
          question_count: dbExam.question_count || 100,
          time_limit_mins: dbExam.time_limit_mins || 120,
          is_featured: dbExam.is_featured,
          in_database: true,
        },
        score,
      })
    }

    ;(dbMatches || []).forEach((dbExam: any) => processExamRecord(dbExam))
    ;(aliasMatches || []).forEach((am: any) => processExamRecord(am.exams, am.alias))

    const scoredResults = Array.from(examMap.values())
    scoredResults.sort((a, b) => b.score - a.score)

    let finalExams = scoredResults.map((r) => r.exam)

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
      { success: false, error: error.message || 'Failed to search exam database' },
      { status: 500 }
    )
  }
}
