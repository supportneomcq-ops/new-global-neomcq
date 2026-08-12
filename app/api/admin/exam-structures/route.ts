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

    const supabase = getSupabaseAdmin()

    let query = (supabase as any)
      .from('exam_structures')
      .select('*, exams(id, name, slug, countries(name, flag_emoji))')
      .order('created_at', { ascending: false })

    if (examId) query = query.eq('exam_id', examId)
    if (status && status !== 'all') query = query.eq('status', status)

    const { data: structures, error } = await query

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, structures: [], stats: { total: 0, published: 0, draft: 0 } })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const enrichedStructures = (structures || []).map((st: any) => ({
      ...st,
      exam_name: st.exams?.name || 'Unassigned Exam',
      country_flag: st.exams?.countries?.flag_emoji || '🌐',
      section_count: Array.isArray(st.sections) ? st.sections.length : 0,
    }))

    const stats = {
      total: enrichedStructures.length,
      published: enrichedStructures.filter((s: any) => s.status === 'published').length,
      draft: enrichedStructures.filter((s: any) => s.status === 'draft').length,
    }

    // Fetch exams list
    const { data: exams } = await (supabase as any)
      .from('exams')
      .select('id, name, slug')
      .neq('status', 'archived')
      .order('name', { ascending: true })

    return NextResponse.json({
      success: true,
      structures: enrichedStructures,
      stats,
      exams: exams || [],
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
          {
            id: 'sec-2',
            name: 'Section 2: Advanced Clinical & Applied Knowledge',
            question_count: 50,
            time_limit_mins: 60,
            passing_score_pct: 75,
            subjects_covered: [],
          },
        ]

    const { data: newStructure, error } = await (supabase as any)
      .from('exam_structures')
      .insert({
        exam_id,
        title: title.trim(),
        version: version || '1.0',
        status: status || 'draft',
        sections: defaultSections,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, structure: newStructure, message: 'Exam structure created successfully' })
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, structure: updated })
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Structure deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
