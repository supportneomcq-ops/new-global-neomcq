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
      let dbExams: any[] = []
      try {
        let dbQuery = (supabase as any)
          .from('exams')
          .select(`
            id,
            name,
            slug,
            short_name,
            description,
            difficulty,
            level,
            question_count,
            time_limit_mins,
            is_featured,
            official_url,
            countries(name, iso2, flag_emoji),
            exam_categories(name, slug)
          `)
          .neq('status', 'archived')

        if (featuredOnly) {
          dbQuery = dbQuery.eq('is_featured', true)
        }

        const res = await dbQuery.order('name', { ascending: true }).limit(50)
        if (!res.error && res.data) {
          dbExams = res.data
        } else {
          // Fallback to simple select without joins if needed
          const flatRes = await (supabase as any)
            .from('exams')
            .select('id, name, slug, short_name, description, difficulty, level, question_count, time_limit_mins, is_featured, official_url')
            .neq('status', 'archived')
            .order('name', { ascending: true })
            .limit(50)
          dbExams = flatRes.data || []
        }
      } catch (err: any) {
        console.error('Error fetching exams from DB:', err)
        dbExams = []
      }

      let list = (dbExams || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        slug: e.slug,
        short_name: e.short_name || e.name,
        category: e.exam_categories?.name || 'Standard Exam Prep',
        country: e.countries?.name || 'India',
        flag: e.countries?.flag_emoji || '🇮🇳',
        description: e.description || '',
        difficulty: e.difficulty || 'Intermediate',
        level: e.level || null,
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
    const cleanQuery = norm.canonical.toLowerCase().trim()
    const querySlug = cleanQuery.replace(/[^a-z0-9]+/g, '-')

    // 3. Search Supabase DB: fetch exams matching name, short_name, slug, or normalized_name
    let dbMatches: any[] = []
    try {
      const { data, error: searchErr } = await (supabase as any)
        .from('exams')
        .select(`
          id,
          name,
          slug,
          short_name,
          description,
          difficulty,
          level,
          question_count,
          time_limit_mins,
          is_featured,
          status,
          countries(name, iso2, flag_emoji),
          exam_categories(name, slug)
        `)
        .neq('status', 'archived')
        .or(`short_name.ilike.${rawQuery}%,name.ilike.${rawQuery}%,short_name.ilike.%${rawQuery}%,name.ilike.%${rawQuery}%,slug.ilike.%${querySlug}%,normalized_name.ilike.%${cleanQuery}%`)
        .limit(60)

      if (searchErr) {
        // Fallback without joins
        const flatSearch = await (supabase as any)
          .from('exams')
          .select('id, name, slug, short_name, description, difficulty, level, question_count, time_limit_mins, is_featured, status')
          .neq('status', 'archived')
          .or(`short_name.ilike.${rawQuery}%,name.ilike.${rawQuery}%,short_name.ilike.%${rawQuery}%,name.ilike.%${rawQuery}%,slug.ilike.%${querySlug}%`)
          .limit(60)
        dbMatches = flatSearch.data || []
      } else {
        dbMatches = data || []
      }
    } catch (searchErr) {
      console.warn('DB exam search warning:', searchErr)
      dbMatches = []
    }

    // 4. Check exam_aliases table
    let aliasMatches: any[] = []
    try {
      const { data, error: aliasErr } = await (supabase as any)
        .from('exam_aliases')
        .select(`
          exam_id,
          alias,
          exams (
            id,
            name,
            slug,
            short_name,
            description,
            difficulty,
            level,
            question_count,
            time_limit_mins,
            is_featured,
            status,
            countries(name, iso2, flag_emoji),
            exam_categories(name, slug)
          )
        `)
        .ilike('alias', `%${rawQuery}%`)
        .limit(40)

      if (!aliasErr && data) {
        aliasMatches = data
      }
    } catch (err) {
      console.warn('Alias search warning:', err)
    }

    const examMap = new Map<string, { exam: any; score: number }>()

    // Helper to process exam record
    const processExamRecord = (dbExam: any, aliasMatched: string | null = null) => {
      if (!dbExam || dbExam.status === 'archived') return
      
      const nameLower = (dbExam.name || '').toLowerCase()
      const shortLower = (dbExam.short_name || '').toLowerCase()
      const slugLower = (dbExam.slug || '').toLowerCase()
      const aliasLower = (aliasMatched || '').toLowerCase()

      let score = 50

      if (shortLower === cleanQuery || nameLower === cleanQuery || slugLower === querySlug) {
        score = 100
      } else if (aliasLower === cleanQuery) {
        score = 99
      } else if (shortLower.startsWith(cleanQuery)) {
        score = 95
      } else if (nameLower.startsWith(cleanQuery)) {
        score = 90
      } else if (aliasLower.startsWith(cleanQuery)) {
        score = 88
      } else if (shortLower.includes(cleanQuery)) {
        score = 85
      } else if (nameLower.includes(cleanQuery)) {
        score = 80
      } else if (aliasLower.includes(cleanQuery)) {
        score = 75
      }

      if (examMap.has(dbExam.id)) {
        const existing = examMap.get(dbExam.id)!
        existing.score = Math.max(existing.score, score)
        return
      }

      examMap.set(dbExam.id, {
        exam: {
          id: dbExam.id,
          name: dbExam.name,
          slug: dbExam.slug,
          short_name: dbExam.short_name || dbExam.name,
          category: dbExam.exam_categories?.name || 'Professional Licensing',
          country: dbExam.countries?.name || 'India',
          flag: dbExam.countries?.flag_emoji || '🇮🇳',
          description: dbExam.description || '',
          difficulty: dbExam.difficulty || 'Intermediate',
      level: dbExam.level || null,
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
