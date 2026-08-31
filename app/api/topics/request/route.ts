import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { resolveTopic } from '@/lib/server/exam-intelligence'
import { normalizeInput } from '@/lib/knowledge/normalizer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { examId, subjectId, topicName, description, userId, confirmed } = body

    if (!examId || !subjectId || !topicName || typeof topicName !== 'string' || !topicName.trim()) {
      return NextResponse.json(
        { success: false, error: 'examId, subjectId, and a valid topicName string are required.' },
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
      .maybeSingle()

    if (subjErr || !subjectData) {
      return NextResponse.json({ success: false, error: 'Target subject was not found.' }, { status: 404 })
    }

    if (subjectData.exam_id !== examId) {
      return NextResponse.json(
        { success: false, error: 'Subject does not belong to your active exam.' },
        { status: 403 }
      )
    }

    const examName = subjectData.exams?.name || 'Selected Exam'

    // 2. Perform Intelligence Resolution
    const resolution = await resolveTopic({
      examInput: examName,
      subjectInput: subjectData.name,
      topicInput: trimmedTopicName,
    })

    // 3. Handle Canonical Matches
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

    // 4. Handle Invalid or Irrelevant
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
      if (confirmed !== true) {
        return NextResponse.json({
          success: true,
          requiresConfirmation: true,
          resolution,
          message: `New topic identified for ${subjectData.name}. Please confirm to add.`,
        })
      }

      const norm = normalizeInput(trimmedTopicName)
      let insertedTopic: any = null

      try {
        const { data: newTop, error: insertErr } = await (supabase as any)
          .from('exam_topics')
          .insert({
            subject_id: subjectId,
            name: trimmedTopicName,
            description: description || `High-yield topic: ${trimmedTopicName} under ${subjectData.name}`,
          })
          .select('id, subject_id, name, description, created_at')
          .single()

        if (insertErr) {
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
        console.error('Database insert topic error:', dbErr)
        return NextResponse.json(
          { success: false, error: dbErr.message || 'Failed to insert topic into database.' },
          { status: 500 }
        )
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
        } catch {
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
        resolution,
        topic: {
          id: insertedTopic.id,
          subject_id: insertedTopic.subject_id,
          name: insertedTopic.name,
          slug: norm.slug,
          description: insertedTopic.description,
        },
        message: `Topic '${trimmedTopicName}' created and ready for study!`,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Unexpected resolution outcome.', resolution },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Topic Request Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error processing topic request.' },
      { status: 500 }
    )
  }
}

