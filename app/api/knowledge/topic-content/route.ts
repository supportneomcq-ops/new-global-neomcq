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

    // Resolve missing display names from the selected canonical IDs; never silently
    // substitute USMLE or General Medicine for a different learner's exam.
    if (!examNameInput && examId) {
      const { data: selectedExam } = await (supabase as any)
        .from('exams')
        .select('name')
        .eq('id', examId)
        .maybeSingle()
      examNameInput = selectedExam?.name || ''
    }

    if (!subjectNameInput && subjectId) {
      const { data: selectedSubject } = await (supabase as any)
        .from('exam_subjects')
        .select('name')
        .eq('id', subjectId)
        .maybeSingle()
      subjectNameInput = selectedSubject?.name || ''
    }

    if (!examNameInput || !subjectNameInput) {
      return NextResponse.json(
        { success: false, error: 'Select the correct exam and subject before generating study content.' },
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

    // An idempotent request may find another worker generating this topic pack.
    // Report a retryable pending state rather than turning that expected condition into a 500.
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

    if (!result.success || !result.content) {
      return NextResponse.json(
        { success: false, pending: false, status: 'failed', error: result.error || 'Failed to generate and save topic content' },
        { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    // Never claim that an asset is ready unless the response actually contains it.
    // This is an availability signal; persistence is confirmed by the content engine.
    const hasMcqs = Array.isArray(result.content.mcqs) && result.content.mcqs.length > 0
    const hasNotes = typeof result.content.notes === 'string' && result.content.notes.trim().length > 0
    const hasFlashcards = Array.isArray(result.content.flashcards) && result.content.flashcards.length > 0
    const hasTutorExplanation = typeof result.content.tutor_explanation === 'string' && result.content.tutor_explanation.trim().length > 0
    const hasRevisionSheet = typeof result.content.revision_sheet === 'string' && result.content.revision_sheet.trim().length > 0

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
        total_mcq_count: hasMcqs ? result.content.mcqs.length : 0,
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
        mcqs: hasMcqs ? 'ready' : 'missing',
        notes: hasNotes ? 'ready' : 'missing',
        flashcards: hasFlashcards ? 'ready' : 'missing',
        tutor_explanation: hasTutorExplanation ? 'ready' : 'missing',
        revision_sheet: hasRevisionSheet ? 'ready' : 'missing',
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
