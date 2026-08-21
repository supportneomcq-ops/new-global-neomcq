import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { executeAppendOnlyTopicRefresh } from '@/lib/knowledge/topic-refresher'

export async function POST(req: NextRequest) {
  try {
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const { topicId, subjectId, examId, topicName, subjectName, examName, difficulty, language } = body

    if (!topicId || !subjectId || !examId) {
      return NextResponse.json(
        { success: false, error: 'Missing required hierarchy identifiers: topicId, subjectId, examId' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Verify hierarchy
    const { data: topicData, error: topicErr } = await (supabase as any)
      .from('exam_topics')
      .select('id, name, subject_id, exam_subjects(id, name, exam_id, exams(id, name))')
      .eq('id', topicId)
      .single()

    if (topicErr || !topicData) {
      return NextResponse.json({ success: false, error: 'Topic not found in Knowledge Graph' }, { status: 404 })
    }

    const resolvedExamId = topicData.exam_subjects?.exams?.id || examId
    const resolvedExamName = topicData.exam_subjects?.exams?.name || examName || 'Exam'
    const resolvedSubjectId = topicData.exam_subjects?.id || subjectId
    const resolvedSubjectName = topicData.exam_subjects?.name || subjectName || 'Subject'
    const resolvedTopicName = topicData.name || topicName || 'Topic'

    // Perform Append-Only Refresh
    const result = await executeAppendOnlyTopicRefresh({
      examId: resolvedExamId,
      examName: resolvedExamName,
      subjectId: resolvedSubjectId,
      subjectName: resolvedSubjectName,
      topicId,
      topicName: resolvedTopicName,
      difficulty: difficulty || 'Intermediate',
      language: language || 'en',
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Topic Refresh API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error processing topic refresh' },
      { status: 500 }
    )
  }
}
