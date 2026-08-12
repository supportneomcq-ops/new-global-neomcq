import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminApiSession } from '@/lib/admin-auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { id: subjectId } = await params

    if (!subjectId) {
      return NextResponse.json({ error: 'Subject ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Fetch Subject & Parent Exam
    const { data: subject, error: sError } = await (supabase as any)
      .from('exam_subjects')
      .select(`
        *,
        exams(id, name, slug, status, difficulty, countries(name, flag_emoji), exam_categories(name))
      `)
      .eq('id', subjectId)
      .single()

    if (sError || !subject) {
      return NextResponse.json({ error: sError?.message || 'Subject not found' }, { status: 404 })
    }

    // 2. Fetch Topics under Subject
    const { data: topics } = await (supabase as any)
      .from('exam_topics')
      .select('*')
      .eq('subject_id', subjectId)
      .order('order_index', { ascending: true })

    // 3. Fetch Aliases
    const { data: aliases } = await (supabase as any)
      .from('subject_aliases')
      .select('*')
      .eq('subject_id', subjectId)

    // 4. Fetch Learning Content Cache for Topics
    const topicIds = (topics || []).map((t: any) => t.id)
    let cachedContentCount = 0
    if (topicIds.length > 0) {
      const { count } = await (supabase as any)
        .from('learning_content_cache')
        .select('*', { count: 'exact', head: true })
        .in('topic_id', topicIds)
      cachedContentCount = count || 0
    }

    return NextResponse.json({
      success: true,
      subject,
      topics: topics || [],
      aliases: aliases || [],
      analytics: {
        topicCount: topics?.length || 0,
        cachedContentCount,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
