import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import { checkFeatureQuota } from '@/lib/entitlements/quota-checker'
import { getOrGenerateCanonicalTopicContent } from '@/lib/knowledge/ai-content-intelligence'

export async function POST(req: NextRequest) {
  try {
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body' }, { status: 400 })
    }

    const topicId = body.topicId || body.topic_id
    const subjectId = body.subjectId || body.subject_id
    const examId = body.examId || body.exam_id
    let topicNameInput = (body.topicName || body.name || '').toString().trim()
    let subjectNameInput = (body.subjectName || '').toString().trim()
    let examNameInput = (body.examName || '').toString().trim()
    const contentType = body.contentType || 'full_pack'
    const difficulty = body.difficulty || 'Intermediate'
    const language = body.language || 'en'
    const forceRefresh = !!body.forceRefresh
    
    // Generation is authenticated and quota-bound. Never trust a user ID supplied by the browser.
    const userClient = await createClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Please sign in to generate study content.' }, { status: 401 })
    }
    const activeUserId = user.id

    // Derive quota category from the requested content type; do not accept a client-selected quota category.
    const featureKey = (contentType === 'quiz' ? 'quiz' : contentType === 'flashcards' ? 'flashcards' : 'mcq') as any

    // Enforce quota checking
    if (activeUserId) {
      const quotaResult = await checkFeatureQuota({
        userId: activeUserId,
        feature: featureKey,
        topicId: topicId || topicNameInput,
        examId,
        subjectId,
      })

      if (!quotaResult.allowed) {
        return NextResponse.json({
          success: false,
          limitReached: true,
          limitType: quotaResult.limitType,
          error: quotaResult.upgradeMessage || quotaResult.reason,
          upgradeRequired: true,
          planCode: quotaResult.planCode,
        }, { status: 403 })
      }
    }

    const supabase = getSupabaseAdmin()

    // If IDs provided without names, retrieve canonical names from DB
    if (topicId && (!topicNameInput || !subjectNameInput || !examNameInput)) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId)
      if (isUUID) {
        const { data: top } = await (supabase as any)
          .from('exam_topics')
          .select(`
            id,
            name,
            subject_id,
            exam_subjects (
              id,
              name,
              exam_id,
              exams (
                id,
                name
              )
            )
          `)
          .eq('id', topicId)
          .maybeSingle()

        if (top) {
          topicNameInput = top.name
          subjectNameInput = top.exam_subjects?.name || subjectNameInput
          examNameInput = top.exam_subjects?.exams?.name || examNameInput
        }
      }
    }

    if (!topicNameInput) {
      return NextResponse.json(
        { success: false, error: 'Missing required topic identifier (topicId or topicName)' },
        { status: 400 }
      )
    }

    // Never silently attach a learner's content to a default exam or subject.
    // Resolve missing names from canonical IDs above; if still missing, fail safely.
    if (!examId && !examNameInput) {
      return NextResponse.json(
        { success: false, error: 'Select your exam before preparing topic content.' },
        { status: 400 }
      )
    }
    if (!subjectId && !subjectNameInput) {
      return NextResponse.json(
        { success: false, error: 'Select your subject before preparing topic content.' },
        { status: 400 }
      )
    }

    // Execute through Master AI Content Intelligence Engine
    const result = await getOrGenerateCanonicalTopicContent({
      examInput: examId || examNameInput,
      subjectInput: subjectId || subjectNameInput,
      topicInput: topicId || topicNameInput,
      userId: activeUserId,
      difficulty,
      language,
      forceRefresh,
      autoCreateEntities: true,
    })

    if (result.error_code === 'GENERATION_IN_PROGRESS') {
      return NextResponse.json(
        {
          success: false,
          pending: true,
          status: 'generating',
          jobId: result.job_id || null,
          retryAfter: result.retry_after || 3,
          error: result.error || 'This topic pack is already being prepared.',
        },
        { status: 202, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    if (!result.success && !result.content) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to generate topic content' },
        { status: 500 }
      )
    }

    const { exam, subject, topic } = result.hierarchy

    return NextResponse.json({
      success: true,
      source: result.served_from_cache ? 'database_canonical' : 'ai_generated',
      cached: result.served_from_cache,
      isRefreshing: false,
      refreshJobId: result.job_id || null,
      generationReason: result.generation_reason,
      version: result.version_number,
      metrics: result.metrics,
      topicState: {
        last_refreshed_at: result.created_at,
        next_refresh_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        refresh_status: 'completed',
        total_mcq_count: result.content?.mcqs?.length || 0,
        content_version: result.version_number,
      },
      contentType,
      difficulty,
      topic: {
        id: topic?.id || topicId || 'topic-synth',
        name: topic?.name || topicNameInput,
        subject_id: subject?.id || subjectId || null,
        subjectName: subject?.name || subjectNameInput,
        exam_id: exam?.id || examId || null,
        examName: exam?.name || examNameInput,
      },
      content: result.content,
      assetStatus: {
        mcqs: 'ready',
        notes: 'ready',
        flashcards: 'ready',
        tutor_explanation: 'ready',
        revision_sheet: 'ready',
      },
    })
  } catch (error: any) {
    console.error('Topic Content API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Server error processing topic content' },
      { status: 500 }
    )
  }
}
