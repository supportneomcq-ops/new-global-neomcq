import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { matchTopicSmart } from '@/lib/knowledge/matcher'
import { normalizeInput } from '@/lib/knowledge/normalizer'
import { classifyUserInput } from '@/lib/knowledge/classifier'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { examId, subjectId, topicName, description, userId } = body

    if (!examId || !subjectId || !topicName || typeof topicName !== 'string' || !topicName.trim()) {
      return NextResponse.json(
        { success: false, error: 'examId, subjectId, and a valid topicName are required' },
        { status: 400 }
      )
    }

    const trimmedTopicName = topicName.trim()
    const supabase = getSupabaseAdmin()

    // 1. Verify subject belongs to active exam
    const { data: subjectData, error: subjErr } = await (supabase as any)
      .from('exam_subjects')
      .select('id, exam_id, name, exams(id, name)')
      .eq('id', subjectId)
      .single()

    if (subjErr || !subjectData) {
      return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 })
    }

    if (subjectData.exam_id !== examId) {
      return NextResponse.json(
        { success: false, error: 'Subject does not belong to your active exam' },
        { status: 403 }
      )
    }

    // 2. Classify input to reject invalid geographic or non-curricular entries
    const classification = classifyUserInput(trimmedTopicName, {
      targetLevel: 'topic',
      activeExamName: subjectData.exams?.name,
      activeSubjectName: subjectData.name,
    })

    if (classification.type === 'COUNTRY' && !classification.isCurricularValid) {
      return NextResponse.json(
        {
          success: false,
          error: `"${trimmedTopicName}" appears to be geographic metadata rather than a study topic in ${subjectData.name}.`,
          classification,
        },
        { status: 400 }
      )
    }

    // 3. Check for existing canonical match to reuse
    const matchResult = await matchTopicSmart(supabase, subjectId, trimmedTopicName)

    if (matchResult.matched && matchResult.entity) {
      return NextResponse.json({
        success: true,
        reused: true,
        topic: {
          id: matchResult.entity.id,
          subject_id: matchResult.entity.subject_id,
          name: matchResult.entity.name,
          slug: matchResult.normalizedSlug || normalizeInput(matchResult.entity.name).slug,
          description: matchResult.entity.description,
        },
        message: `Reused existing canonical topic '${matchResult.canonicalName}'`,
      })
    }

    // 4. Create new canonical topic under this subject
    const norm = normalizeInput(trimmedTopicName)
    const { data: insertedTopic, error: insertErr } = await (supabase as any)
      .from('exam_topics')
      .insert({
        subject_id: subjectId,
        name: trimmedTopicName,
        description: description || `High-yield topic: ${trimmedTopicName} under ${subjectData.name}`,
      })
      .select('id, subject_id, name, description, created_at')
      .single()

    if (insertErr || !insertedTopic) {
      console.error('Insert topic error:', insertErr)
      throw new Error(`Failed to create topic: ${insertErr?.message || 'Database error'}`)
    }

    // Record request audit if userId provided
    if (userId) {
      try {
        await (supabase as any).from('topic_requests').insert({
          user_id: userId,
          exam_id: examId,
          subject_id: subjectId,
          requested_topic_name: trimmedTopicName,
          description,
          status: 'created',
          created_topic_id: insertedTopic.id,
        })
      } catch (auditErr) {
        // Non-blocking
      }
    }

    // Record alias
    try {
      await (supabase as any).from('topic_aliases').insert({
        topic_id: insertedTopic.id,
        alias: norm.canonical || trimmedTopicName.toLowerCase(),
      })
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      reused: false,
      topic: {
        id: insertedTopic.id,
        subject_id: insertedTopic.subject_id,
        name: insertedTopic.name,
        slug: norm.slug,
        description: insertedTopic.description,
      },
      message: `Topic '${trimmedTopicName}' created and ready for instant study!`,
    })
  } catch (error: any) {
    console.error('Topic Request Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error processing topic request' },
      { status: 500 }
    )
  }
}
