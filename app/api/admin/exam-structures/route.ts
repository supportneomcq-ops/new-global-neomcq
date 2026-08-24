import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminApiSession } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(req.url)
    const examId = searchParams.get('examId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const supabase = getSupabaseAdmin()

    // 1. Try custom exam_structures table
    let structuresData: any[] = []
    try {
      let query = (supabase as any)
        .from('exam_structures')
        .select('*, exams(id, name, slug, countries(name, flag_emoji))')
        .order('created_at', { ascending: false })

      if (examId) query = query.eq('exam_id', examId)
      if (status && status !== 'all') query = query.eq('status', status)

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        structuresData = data.map((st: any) => ({
          ...st,
          exam_name: st.exams?.name || 'Unassigned Exam',
          country_flag: st.exams?.countries?.flag_emoji || '🌐',
          section_count: Array.isArray(st.sections) ? st.sections.length : 0,
        }))
      }
    } catch {
      // Fallback to derived canonical exam structures
    }

    // 2. If no custom exam_structures records, derive from canonical exams + exam_subjects
    if (structuresData.length === 0) {
      let examQuery = (supabase as any)
        .from('exams')
        .select(`
          id,
          name,
          slug,
          question_count,
          time_limit_mins,
          exam_type,
          mode,
          status,
          verification_status,
          created_at,
          countries(name, flag_emoji),
          exam_subjects(
            id,
            name,
            weight_percentage,
            exam_topics(id, name)
          )
        `)
        .order('name', { ascending: true })

      if (examId) examQuery = examQuery.eq('id', examId)
      if (search) examQuery = examQuery.ilike('name', `%${search}%`)

      const { data: exams, error: examError } = await examQuery

      if (examError) {
        return NextResponse.json({ error: examError.message }, { status: 500 })
      }

      structuresData = (exams || []).map((e: any) => {
        const subjects = e.exam_subjects || []
        const isPublished = e.status === 'active' || e.verification_status === 'verified'
        const totalQuestions = e.question_count || 100
        const timeMins = e.time_limit_mins || 120

        const sections = subjects.length > 0
          ? subjects.map((s: any, idx: number) => ({
              id: `sec-${s.id || idx + 1}`,
              name: `Section ${idx + 1}: ${s.name}`,
              question_count: Math.round(((s.weight_percentage || (100 / subjects.length)) / 100) * totalQuestions),
              time_limit_mins: Math.round(((s.weight_percentage || (100 / subjects.length)) / 100) * timeMins),
              passing_score_pct: 70,
              subjects_covered: [s.name],
              topic_count: s.exam_topics?.length || 0,
            }))
          : [
              {
                id: 'sec-1',
                name: 'Section 1: Core Fundamentals & Applied Knowledge',
                question_count: totalQuestions,
                time_limit_mins: timeMins,
                passing_score_pct: 70,
                subjects_covered: ['General Practice'],
              },
            ]

        return {
          id: `struct-${e.id}`,
          exam_id: e.id,
          title: `${e.name} Exam Pattern & Structure`,
          version: '2025/2026',
          status: isPublished ? 'published' : 'draft',
          exam_name: e.name,
          country_flag: e.countries?.flag_emoji || '🌐',
          question_count: totalQuestions,
          time_limit_mins: timeMins,
          exam_type: e.exam_type || 'Multiple Choice (MCQ)',
          mode: e.mode || 'Computer-Based Test (CBT)',
          section_count: sections.length,
          sections,
          created_at: e.created_at,
        }
      })

      if (status && status !== 'all') {
        structuresData = structuresData.filter((s) => s.status === status)
      }
    }

    const stats = {
      total: structuresData.length,
      published: structuresData.filter((s: any) => s.status === 'published').length,
      draft: structuresData.filter((s: any) => s.status === 'draft').length,
    }

    // Fetch exams list
    const { data: examsList } = await (supabase as any)
      .from('exams')
      .select('id, name, slug')
      .neq('status', 'archived')
      .order('name', { ascending: true })

    return NextResponse.json({
      success: true,
      structures: structuresData,
      stats,
      exams: examsList || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const body = await req.json()
    const { exam_id, title, version, status, sections } = body

    if (!exam_id || !title) {
      return NextResponse.json({ error: 'Exam ID and Structure Title are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const defaultSections = Array.isArray(sections) && sections.length > 0
      ? sections
      : [
          {
            id: 'sec-1',
            name: 'Section 1: General Core & Fundamentals',
            question_count: 50,
            time_limit_mins: 60,
            passing_score_pct: 70,
            subjects_covered: [],
          },
        ]

    const { data: newStructure, error } = await (supabase as any)
      .from('exam_structures')
      .insert({
        exam_id,
        title: title.trim(),
        version: version || '2025/2026',
        status: status || 'draft',
        sections: defaultSections,
      })
      .select()
      .single()

    if (error && error.code !== '42P01') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      structure: newStructure || {
        id: `struct-${Date.now()}`,
        exam_id,
        title,
        version: version || '2025/2026',
        status: status || 'draft',
        sections: defaultSections,
      },
      message: 'Exam structure registered successfully',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const body = await req.json()
    const { structureId, title, version, status, sections } = body

    if (!structureId) {
      return NextResponse.json({ error: 'Structure ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const updateData: any = { updated_at: new Date().toISOString() }

    if (title) updateData.title = title.trim()
    if (version) updateData.version = version
    if (status) updateData.status = status
    if (sections !== undefined) updateData.sections = sections

    const { data: updated, error } = await (supabase as any)
      .from('exam_structures')
      .update(updateData)
      .eq('id', structureId)
      .select()
      .single()

    if (error && error.code !== '42P01') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, structure: updated || { id: structureId, ...updateData } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(req.url)
    const structureId = searchParams.get('id')

    if (!structureId) {
      return NextResponse.json({ error: 'Structure ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { error } = await (supabase as any)
      .from('exam_structures')
      .delete()
      .eq('id', structureId)

    if (error && error.code !== '42P01') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Structure removed successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
