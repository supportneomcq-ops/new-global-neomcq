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

    // 1. Try fetching custom syllabi table if present
    let syllabiData: any[] = []
    try {
      let query = (supabase as any)
        .from('syllabi')
        .select('*, exams(id, name, slug, countries(name, flag_emoji))')
        .order('created_at', { ascending: false })

      if (examId) query = query.eq('exam_id', examId)
      if (status && status !== 'all') query = query.eq('status', status)

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        syllabiData = data.map((s: any) => ({
          ...s,
          exam_name: s.exams?.name || 'Unassigned Exam',
          country_flag: s.exams?.countries?.flag_emoji || '🌐',
        }))
      }
    } catch {
      // Table doesn't exist or error, fallback to derived canonical syllabi
    }

    // 2. If no custom syllabi records, derive canonical syllabi from canonical exams + subjects + topics
    if (syllabiData.length === 0) {
      let examQuery = (supabase as any)
        .from('exams')
        .select(`
          id,
          name,
          slug,
          official_syllabus_url,
          status,
          verification_status,
          created_at,
          countries(name, flag_emoji),
          exam_subjects(
            id,
            name,
            weight_percentage,
            exam_topics(id, name, importance)
          )
        `)
        .order('name', { ascending: true })

      if (examId) examQuery = examQuery.eq('id', examId)
      if (search) examQuery = examQuery.ilike('name', `%${search}%`)

      const { data: exams, error: examError } = await examQuery

      if (examError) {
        return NextResponse.json({ error: examError.message }, { status: 500 })
      }

      syllabiData = (exams || []).map((e: any) => {
        const subjectCount = e.exam_subjects?.length || 0
        const topicCount = e.exam_subjects?.reduce((acc: number, s: any) => acc + (s.exam_topics?.length || 0), 0) || 0
        const isPublished = e.status === 'active' || e.verification_status === 'verified'

        return {
          id: `syl-${e.id}`,
          exam_id: e.id,
          title: `${e.name} Canonical Syllabus`,
          version: '2025/2026',
          source: e.official_syllabus_url ? 'Official Examining Body' : 'Canonical Database Catalog',
          source_url: e.official_syllabus_url || null,
          status: isPublished ? 'published' : 'draft',
          exam_name: e.name,
          country_flag: e.countries?.flag_emoji || '🌐',
          subject_count: subjectCount,
          topic_count: topicCount,
          created_at: e.created_at,
          data: {
            subjects: (e.exam_subjects || []).map((s: any) => ({
              subject_id: s.id,
              name: s.name,
              weight: s.weight_percentage || 0,
              topics: (s.exam_topics || []).map((t: any) => ({
                topic_id: t.id,
                name: t.name,
                importance: t.importance || 'Medium',
              })),
            })),
          },
        }
      })

      if (status && status !== 'all') {
        syllabiData = syllabiData.filter((s) => s.status === status)
      }
    }

    const stats = {
      total: syllabiData.length,
      published: syllabiData.filter((s: any) => s.status === 'published').length,
      draft: syllabiData.filter((s: any) => s.status === 'draft').length,
    }

    // Fetch exams for selection dropdown
    const { data: examsList } = await (supabase as any)
      .from('exams')
      .select('id, name, slug')
      .neq('status', 'archived')
      .order('name', { ascending: true })

    return NextResponse.json({
      success: true,
      syllabi: syllabiData,
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
    const { exam_id, title, version, source, status, data } = body

    if (!exam_id || !title) {
      return NextResponse.json({ error: 'Exam ID and Syllabus Title are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch current subject/topic tree for auto-populating if data is empty
    let syllabusData = data
    if (!syllabusData || Object.keys(syllabusData).length === 0) {
      const { data: subjects } = await (supabase as any)
        .from('exam_subjects')
        .select('id, name, weight_percentage, exam_topics(id, name, importance)')
        .eq('exam_id', exam_id)
        .order('name', { ascending: true })

      syllabusData = {
        subjects: (subjects || []).map((s: any) => ({
          subject_id: s.id,
          name: s.name,
          weight: s.weight_percentage,
          topics: (s.exam_topics || []).map((t: any) => ({
            topic_id: t.id,
            name: t.name,
            importance: t.importance,
          })),
        })),
      }
    }

    // Try inserting into custom syllabi table if present
    const { data: newSyllabus, error } = await (supabase as any)
      .from('syllabi')
      .insert({
        exam_id,
        title: title.trim(),
        version: version || '2025/2026',
        source: source || 'Official Board',
        status: status || 'draft',
        data: syllabusData,
      })
      .select()
      .single()

    if (error && error.code !== '42P01') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      syllabus: newSyllabus || {
        id: `syl-${Date.now()}`,
        exam_id,
        title,
        version: version || '2025/2026',
        source: source || 'Official Board',
        status: status || 'draft',
        data: syllabusData,
      },
      message: 'Syllabus registered successfully',
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

    if (error && error.code !== '42P01') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, syllabus: updated || { id: syllabusId, ...updateData } })
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

    if (error && error.code !== '42P01') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Syllabus updated successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
