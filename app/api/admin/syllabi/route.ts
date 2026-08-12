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
      .from('syllabi')
      .select('*, exams(id, name, slug, countries(name, flag_emoji))')
      .order('created_at', { ascending: false })

    if (examId) query = query.eq('exam_id', examId)
    if (status && status !== 'all') query = query.eq('status', status)

    const { data: syllabi, error } = await query

    if (error) {
      // Fallback if table doesn't exist yet
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, syllabi: [], stats: { total: 0, published: 0, draft: 0 } })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const enrichedSyllabi = (syllabi || []).map((s: any) => ({
      ...s,
      exam_name: s.exams?.name || 'Unassigned Exam',
      country_flag: s.exams?.countries?.flag_emoji || '🌐',
    }))

    const stats = {
      total: enrichedSyllabi.length,
      published: enrichedSyllabi.filter((s: any) => s.status === 'published').length,
      draft: enrichedSyllabi.filter((s: any) => s.status === 'draft').length,
    }

    // Fetch exams for selection dropdown
    const { data: exams } = await (supabase as any)
      .from('exams')
      .select('id, name, slug')
      .neq('status', 'archived')
      .order('name', { ascending: true })

    return NextResponse.json({
      success: true,
      syllabi: enrichedSyllabi,
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
    const { exam_id, title, version, source, status, data } = body

    if (!exam_id || !title) {
      return NextResponse.json({ error: 'Exam ID and Syllabus Title are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Fetch current subject/topic tree for auto-populating if data is empty
    let syllabusData = data
    if (!syllabusData || Object.keys(syllabusData).length === 0) {
      const { data: subjects } = await (supabase as any)
        .from('exam_subjects')
        .select('id, name, slug, weight_percentage, exam_topics(id, name, level, target_weight)')
        .eq('exam_id', exam_id)
        .order('order_index', { ascending: true })

      syllabusData = {
        subjects: (subjects || []).map((s: any) => ({
          subject_id: s.id,
          name: s.name,
          weight: s.weight_percentage,
          topics: (s.exam_topics || []).map((t: any) => ({
            topic_id: t.id,
            name: t.name,
            weight: t.target_weight,
          })),
        })),
      }
    }

    const { data: newSyllabus, error } = await (supabase as any)
      .from('syllabi')
      .insert({
        exam_id,
        title: title.trim(),
        version: version || '1.0',
        source: source || 'Official Board',
        status: status || 'draft',
        data: syllabusData,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, syllabus: newSyllabus, message: 'Syllabus created successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const body = await req.json()
    const { syllabusId, title, version, source, status, data } = body

    if (!syllabusId) {
      return NextResponse.json({ error: 'Syllabus ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const updateData: any = { updated_at: new Date().toISOString() }

    if (title) updateData.title = title.trim()
    if (version) updateData.version = version
    if (source) updateData.source = source
    if (status) updateData.status = status
    if (data !== undefined) updateData.data = data

    const { data: updated, error } = await (supabase as any)
      .from('syllabi')
      .update(updateData)
      .eq('id', syllabusId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, syllabus: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(req.url)
    const syllabusId = searchParams.get('id')

    if (!syllabusId) {
      return NextResponse.json({ error: 'Syllabus ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { error } = await (supabase as any)
      .from('syllabi')
      .delete()
      .eq('id', syllabusId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Syllabus deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
