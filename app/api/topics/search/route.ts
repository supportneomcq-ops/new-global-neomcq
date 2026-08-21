import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const examId = searchParams.get('examId')
    const subjectId = searchParams.get('subjectId')
    const query = (searchParams.get('q') || '').trim().toLowerCase()

    if (!examId) {
      return NextResponse.json({ success: false, error: 'examId is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Query subjects for this exam
    let subjectQuery = (supabase as any)
      .from('exam_subjects')
      .select('id, name, exam_id')
      .eq('exam_id', examId)

    if (subjectId) {
      subjectQuery = subjectQuery.eq('id', subjectId)
    }

    const { data: subjects, error: subjErr } = await subjectQuery

    if (subjErr || !subjects || subjects.length === 0) {
      return NextResponse.json({ success: true, topics: [], count: 0 })
    }

    const subjectIds = subjects.map((s: any) => s.id)
    const subjectMap = new Map(subjects.map((s: any) => [s.id, s.name]))

    // 2. Query topics for these subjects
    let topicsQuery = (supabase as any)
      .from('exam_topics')
      .select('id, name, subject_id, description, created_at')
      .in('subject_id', subjectIds)
      .order('name', { ascending: true })

    if (query) {
      topicsQuery = topicsQuery.ilike('name', `%${query}%`)
    }

    const { data: topics, error: topicsErr } = await topicsQuery.limit(50)

    if (topicsErr || !topics) {
      return NextResponse.json({ success: true, topics: [], count: 0 })
    }

    // 3. Fetch topic states & MCQ counts
    const topicIds = topics.map((t: any) => t.id)
    let statesMap: Record<string, any> = {}

    if (topicIds.length > 0) {
      const { data: states } = await (supabase as any)
        .from('topic_content_state')
        .select('*')
        .in('topic_id', topicIds)

      if (states) {
        for (const s of states) {
          statesMap[s.topic_id] = s
        }
      }
    }

    const now = Date.now()
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

    const enrichedTopics = topics.map((t: any) => {
      const st = statesMap[t.id]
      const lastRefreshed = st?.last_refreshed_at ? new Date(st.last_refreshed_at).getTime() : 0
      const isRecentlyRefreshed = lastRefreshed > 0 && now - lastRefreshed <= SEVEN_DAYS_MS

      return {
        id: t.id,
        name: t.name,
        subjectId: t.subject_id,
        subjectName: subjectMap.get(t.subject_id) || 'Subject',
        description: t.description,
        totalMcqs: st?.total_mcq_count || 5,
        recentAddedMcqs: st?.recent_added_mcqs || 0,
        contentVersion: st?.content_version || 1,
        lastRefreshedAt: st?.last_refreshed_at || t.created_at,
        isRecentlyRefreshed,
        refreshStatus: st?.refresh_status || 'idle',
      }
    })

    return NextResponse.json({
      success: true,
      topics: enrichedTopics,
      count: enrichedTopics.length,
    })
  } catch (error: any) {
    console.error('Topic Search API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error searching topics' },
      { status: 500 }
    )
  }
}
