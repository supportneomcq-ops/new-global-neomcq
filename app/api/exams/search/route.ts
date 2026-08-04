import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim()
    const country = searchParams.get('country')?.trim()
    const category = searchParams.get('category')?.trim()

    if (!query) {
      return NextResponse.json({ success: true, exams: [] })
    }

    const supabase = getSupabaseAdmin()
    const cleanQuery = query.toLowerCase()

    // 1. Try fuzzy search stored procedure if available or fallback query
    const { data: rpcMatches, error: rpcError } = await (supabase as any)
      .rpc('search_exams_fuzzy', { p_query: cleanQuery })

    let results = rpcMatches || []

    if (rpcError || !results || results.length === 0) {
      // Direct query fallback matching name, slug, aliases
      const { data: directMatches } = await (supabase as any)
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
          created_by_ai,
          status,
          aliases,
          ai_confidence_score,
          official_website,
          category_id,
          country_id,
          exam_categories(name, slug),
          countries(name, iso2, flag_emoji)
        `)
        .neq('status', 'archived')
        .or(`name.ilike.%${cleanQuery}%,slug.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`)
        .limit(20)

      results = directMatches || []
    }

    // Filter by country or category if specified
    if (country && country !== 'all') {
      results = results.filter((e: any) => 
        e.countries?.name?.toLowerCase().includes(country.toLowerCase()) || 
        e.country_id === country
      )
    }

    if (category && category !== 'all') {
      results = results.filter((e: any) => 
        e.exam_categories?.slug === category || 
        e.category_id === category
      )
    }

    return NextResponse.json({
      success: true,
      total: results.length,
      exams: results,
      query: cleanQuery,
    })
  } catch (error: any) {
    console.error('Exam Search Error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Search failed' }, { status: 500 })
  }
}
