import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { resolveTopic } from '@/lib/server/exam-intelligence'
import { normalizeInput } from '@/lib/knowledge/normalizer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subjectId, topicName, confirmed, description } = body

    if (!subjectId || !topicName || typeof topicName !== 'string' || !topicName.trim()) {
      return NextResponse.json(
        { success: false, error: 'subjectId and a valid topicName string are required.' },
        { status: 400 }
      )
    }

    const trimmedTopicName = topicName.trim()
    const supabase = getSupabaseAdmin()

    // 1. Verify parent subject and linked exam exist
    const { data: subjectData, error: subjErr } = await (supabase as any)
      .from('exam_subjects')
      .select('id, exam_id, name, exams(id, name)')
      .eq('id', subjectId)
      .maybeSingle()

    if (subjErr || !subjectData) {
      return NextResponse.json(
        { success: false, error: 'Target subject was not found in database.' },
        { status: 404 }
      )
    }

    const examName = subjectData.exams?.name || 'Selected Exam'

    // 2. Perform Intelligence Resolution using Phase 3A Engine
    const resolution = await resolveTopic({
      examInput: examName,
      subjectInput: subjectData.name,
      topicInput: trimmedTopicName,
    })

    // 3. Handle Canonical Matches (EXACT_MATCH, NORMALIZED_MATCH, ALIAS_MATCH, SEMANTIC_MATCH)
    if (['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH', 'SEMANTIC_MATCH'].includes(resolution.decision)) {
      let canonicalTopic: any = null

      if (resolution.canonical_id || resolution.topic_id) {
        const targetId = resolution.canonical_id || resolution.topic_id
        const { data: foundTopic } = await (supabase as any)
          .from('exam_topics')
          .select('id, subject_id, name, description')
          .eq('id', targetId)
          .maybeSingle()
        canonicalTopic = foundTopic
      }

      // Fallback search by normalized slug or name under this subject
      if (!canonicalTopic) {
        const norm = normalizeInput(trimmedTopicName)
        const { data: matchedTopics } = await (supabase as any)
          .from('exam_topics')
          .select('id, subject_id, name, description')
          .eq('subject_id', subjectId)
          .or(`name.ilike.${norm.canonical},name.ilike.${trimmedTopicName}`)
          .limit(1)

        if (matchedTopics && matchedTopics.length > 0) {
          canonicalTopic = matchedTopics[0]
        }
      }

      if (canonicalTopic) {
        return NextResponse.json({
          success: true,
          reused: true,
          resolution,
          topic: {
            id: canonicalTopic.id,
            subject_id: canonicalTopic.subject_id,
            name: canonicalTopic.name,
            slug: normalizeInput(canonicalTopic.name).slug,
            description: canonicalTopic.description,
          },
          message: `Reused existing canonical topic '${canonicalTopic.name}' (${resolution.decision}).`,
        })
      }
    }

    // 4. Handle Irrelevant / Invalid Input
    if (resolution.decision === 'INVALID') {
      return NextResponse.json(
        {
          success: false,
          error: resolution.reason || `"${trimmedTopicName}" does not appear relevant to ${subjectData.name} under ${examName}.`,
          decision: 'INVALID',
          resolution,
        },
        { status: 400 }
      )
    }

    // 5. Handle Needs Review
    if (resolution.decision === 'NEEDS_REVIEW') {
      return NextResponse.json(
        {
          success: false,
          error: resolution.reason || `Unable to classify "${trimmedTopicName}". Queued for curriculum review.`,
          decision: 'NEEDS_REVIEW',
          resolution,
        },
        { status: 400 }
      )
    }

    // 6. Handle Valid New Topic Creation
    if (resolution.decision === 'VALID_NEW') {
      // Step A: If client has not confirmed yet, ask for explicit confirmation in UI
      if (confirmed !== true) {
        return NextResponse.json({
          success: true,
          requiresConfirmation: true,
          resolution,
          message: `New topic identified for ${subjectData.name}. Please confirm to add.`,
        })
      }

      // Step B: Server-authoritative insertion after confirmation
      const norm = normalizeInput(trimmedTopicName)
      let insertedTopic: any = null

      try {
        const { data: newTop, error: insertErr } = await (supabase as any)
          .from('exam_topics')
          .insert({
            subject_id: subjectId,
            name: trimmedTopicName,
            description: description || `Topic ${trimmedTopicName} under ${subjectData.name}`,
          })
          .select('id, subject_id, name, description, created_at')
          .single()

        if (insertErr) {
          // Check for unique constraint / race condition (Postgres 23505)
          if (insertErr.code === '23505' || insertErr.message?.includes('unique') || insertErr.message?.includes('duplicate')) {
            const { data: existingTop } = await (supabase as any)
              .from('exam_topics')
              .select('id, subject_id, name, description')
              .eq('subject_id', subjectId)
              .ilike('name', trimmedTopicName)
              .maybeSingle()

            if (existingTop) {
              return NextResponse.json({
                success: true,
                reused: true,
                resolution,
                topic: {
                  id: existingTop.id,
                  subject_id: existingTop.subject_id,
                  name: existingTop.name,
                  slug: normalizeInput(existingTop.name).slug,
                  description: existingTop.description,
                },
                message: `Topic '${existingTop.name}' already existed (race condition handled).`,
              })
            }
          }
          throw insertErr
        }

        insertedTopic = newTop
      } catch (dbErr: any) {
        console.error('Database insertion error for exam_topics:', dbErr)
        return NextResponse.json(
          { success: false, error: dbErr.message || 'Failed to insert topic into database.' },
          { status: 500 }
        )
      }

      // Record alias
      try {
        await (supabase as any)
          .from('topic_aliases')
          .insert({
            topic_id: insertedTopic.id,
            alias: norm.canonical || trimmedTopicName.toLowerCase(),
          })
      } catch {
        // Non-blocking alias insert
      }

      return NextResponse.json({
        success: true,
        reused: false,
        resolution,
        topic: {
          id: insertedTopic.id,
          subject_id: insertedTopic.subject_id,
          name: insertedTopic.name,
          slug: norm.slug,
          description: insertedTopic.description,
        },
        message: `Created new topic '${trimmedTopicName}' under ${subjectData.name}.`,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Unexpected resolution outcome.', resolution },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Topic Create API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create topic.' },
      { status: 500 }
    )
  }
}

