import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { matchTopicSmart } from '@/lib/knowledge/matcher'
import { normalizeInput } from '@/lib/knowledge/normalizer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subjectId, topicName } = body

    if (!subjectId || !topicName || !topicName.trim()) {
      return NextResponse.json(
        { success: false, error: 'subjectId and topicName are required' },
        { status: 400 }
      )
    }

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
    const matchResult = await matchTopicSmart(supabase, subjectId, topicName.trim())

    if (matchResult.matched && matchResult.entity) {
      return NextResponse.json({
        success: true,
        reused: true,
        topic: matchResult.entity,
        message: `Reused existing topic '${matchResult.canonicalName}'`,
      })
    }

    // 3. Create new canonical topic under this subject
    const norm = normalizeInput(topicName)
    const { data: insertedTopic, error: insertErr } = await (supabase as any)
      .from('exam_topics')
      .insert({
        subject_id: subjectId,
        parent_id: null,
        name: topicName.trim(),
        slug: norm.slug || topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: `Topic ${topicName.trim()} under ${subjectData.name}`,
        level: 'topic',
        order_index: 50,
        version: 1,
        ai_confidence: 95.0,
        tags: ['user-created'],
      })
      .select('id, subject_id, name, slug, description, level, order_index')
      .single()

    if (insertErr || !insertedTopic) {
      throw new Error(`Failed to create topic: ${insertErr?.message}`)
    }

    return NextResponse.json({
      success: true,
      reused: false,
      topic: insertedTopic,
      message: `Created new topic '${topicName.trim()}'`,
    })
  } catch (error: any) {
    console.error('Topic Create API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create topic' },
      { status: 500 }
    )
  }
}
