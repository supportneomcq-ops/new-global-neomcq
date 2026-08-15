import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { matchTopicSmart } from '@/lib/knowledge/matcher'
import { normalizeInput } from '@/lib/knowledge/normalizer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subjectId, topicName } = body

    if (!subjectId || !topicName || typeof topicName !== 'string' || !topicName.trim()) {
      return NextResponse.json(
        { success: false, error: 'subjectId and a valid topicName are required' },
        { status: 400 }
      )
    }

    const trimmedTopicName = topicName.trim()
    const supabase = getSupabaseAdmin()

    // 1. Verify subject exists
    const { data: subjectData, error: subjErr } = await (supabase as any)
      .from('exam_subjects')
      .select('id, exam_id, name')
      .eq('id', subjectId)
      .single()

    if (subjErr || !subjectData) {
      return NextResponse.json(
        { success: false, error: 'Subject not found' },
        { status: 404 }
      )
    }

    // 2. Smart Match to prevent duplicate topics
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
        message: `Reused existing topic '${matchResult.canonicalName}'`,
      })
    }

    // 3. Create new canonical topic under this subject
    const norm = normalizeInput(trimmedTopicName)
    const { data: insertedTopic, error: insertErr } = await (supabase as any)
      .from('exam_topics')
      .insert({
        subject_id: subjectId,
        name: trimmedTopicName,
        description: `Topic ${trimmedTopicName} under ${subjectData.name}`,
      })
      .select('id, subject_id, name, description, created_at')
      .single()

    if (insertErr || !insertedTopic) {
      console.error('Insert exam_topics error:', insertErr)
      throw new Error(`Failed to create topic: ${insertErr?.message || 'Database error'}`)
    }

    // Also record alias if topic_aliases table exists
    try {
      await (supabase as any)
        .from('topic_aliases')
        .insert({
          topic_id: insertedTopic.id,
          alias: norm.canonical || trimmedTopicName.toLowerCase(),
        })
    } catch (aliasErr) {
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
      message: `Created new topic '${trimmedTopicName}'`,
    })
  } catch (error: any) {
    console.error('Topic Create API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create topic' },
      { status: 500 }
    )
  }
}
