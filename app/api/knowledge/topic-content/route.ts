import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminApiSession } from '@/lib/admin-auth'

export const maxDuration = 20

function isCompleteCanonicalSnapshot(snapshot: any): boolean {
  if (!snapshot || typeof snapshot !== 'object') return false
  const mcqs = Array.isArray(snapshot.mcqs) ? snapshot.mcqs : []
  const quizA = Array.isArray(snapshot.quiz_a) ? snapshot.quiz_a : []
  const quizB = Array.isArray(snapshot.quiz_b) ? snapshot.quiz_b : []
  const flashcards = Array.isArray(snapshot.flashcards) ? snapshot.flashcards : []
  const stickyNotes = Array.isArray(snapshot.sticky_notes) ? snapshot.sticky_notes : []
  const blanks = Array.isArray(snapshot.fill_in_the_blanks) ? snapshot.fill_in_the_blanks : []
  const whiteboard = Array.isArray(snapshot.whiteboard_phases) ? snapshot.whiteboard_phases : []
  const notes = typeof snapshot.notes === 'string' ? snapshot.notes.trim() : ''
  const tutor = typeof snapshot.tutor_explanation === 'string' ? snapshot.tutor_explanation.trim() : ''
  const revision = typeof snapshot.revision_sheet === 'string' ? snapshot.revision_sheet.trim() : ''

  const validBlanks = blanks.filter((item: any) =>
    typeof item?.sentence === 'string' &&
    (item.sentence.match(/\[BLANK\]/g) || []).length === 1 &&
    typeof item?.blank === 'string' &&
    item.blank.trim().length > 0 &&
    Array.isArray(item?.acceptedAnswers) &&
    item.acceptedAnswers.length >= 2 &&
    typeof item?.subtopicName === 'string' &&
    item.subtopicName.trim().length > 0
  )

  return mcqs.length >= 10 &&
    quizA.length >= 5 &&
    quizB.length >= 5 &&
    flashcards.length >= 10 &&
    stickyNotes.length >= 3 &&
    validBlanks.length >= 8 &&
    whiteboard.length >= 1 &&
    notes.length > 20 &&
    tutor.length >= 100 &&
    revision.length >= 100
}

function safeQuestion(question: any, storedRows: any[], subjectName: string) {
  const stored = storedRows.find((row: any) => row.id === question?.id) ||
    storedRows.find((row: any) => String(row.question || '').trim().toLowerCase() === String(question?.question || '').trim().toLowerCase())
  return {
    id: stored?.id,
    question: typeof question?.question === 'string' ? question.question : '',
    options: Array.isArray(question?.options) ? question.options : (Array.isArray(stored?.options) ? stored.options : []),
    high_yield_tag: question?.high_yield_tag || stored?.metadata?.high_yield_tag || (Array.isArray(stored?.tags) ? stored.tags[0] : undefined),
    difficulty: question?.difficulty || stored?.difficulty || 'Intermediate',
    subject: subjectName,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 })
    }

    const topicId = String(body.topicId || body.topic_id || '').trim()
    const subjectId = String(body.subjectId || body.subject_id || '').trim()
    const examId = String(body.examId || body.exam_id || '').trim()
    const subtopicId = String(body.subtopicId || body.subtopic_id || '').trim() || null
    const contentType = String(body.contentType || 'full_pack')
    const difficulty = String(body.difficulty || 'Intermediate')
    const language = String(body.language || 'en')
    const forceRefresh = body.forceRefresh === true

    const userClient = await createClient()
    const { data: authData, error: authError } = await userClient.auth.getUser()
    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: 'Please sign in to access shared study content.' }, { status: 401 })
    }

    if (!topicId) {
      return NextResponse.json({
        success: false,
        error: 'Select a saved curriculum topic. Shared canonical content requires a topic ID.',
      }, { status: 400 })
    }

    if (forceRefresh) {
      const adminAuth = await verifyAdminApiSession()
      if (!adminAuth.authorized) {
        return NextResponse.json({
          success: false,
          error: 'Only an authorized administrator can request a shared topic-pack refresh.',
        }, { status: 403 })
      }
    }

    const supabase = getSupabaseAdmin() as any
    const { data: topicData, error: topicError } = await supabase
      .from('exam_topics')
      .select('id,name,subject_id,exam_subjects(id,name,exam_id,exams(id,name,verification_status,current_version,metadata))')
      .eq('id', topicId)
      .maybeSingle()

    if (topicError || !topicData) {
      return NextResponse.json({ success: false, error: 'Topic not found in the selected curriculum.' }, { status: 404 })
    }

    const subject = topicData.exam_subjects
    const exam = subject?.exams
    if (!subject || !exam) {
      return NextResponse.json({ success: false, error: 'The selected topic is not attached to a complete exam hierarchy.' }, { status: 409 })
    }
    if ((subjectId && subjectId !== subject.id) || (examId && examId !== subject.exam_id)) {
      return NextResponse.json({ success: false, error: 'The selected exam or subject does not match this topic.' }, { status: 400 })
    }

    if (subtopicId) {
      const { data: subtopic } = await supabase
        .from('exam_subtopics')
        .select('id,topic_id')
        .eq('id', subtopicId)
        .maybeSingle()
      if (!subtopic || subtopic.topic_id !== topicId) {
        return NextResponse.json({ success: false, error: 'The selected subtopic does not belong to this topic.' }, { status: 400 })
      }
    }

    const { data: topicState } = await supabase
      .from('topic_content_state')
      .select('*')
      .eq('topic_id', topicId)
      .maybeSingle()

    const { data: versions, error: versionError } = await supabase
      .from('content_versions')
      .select('id,version,snapshot,created_at')
      .eq('asset_type', 'topic')
      .eq('asset_id', topicId)
      .order('version', { ascending: false })
      .limit(1)

    if (versionError) {
      return NextResponse.json({ success: false, error: 'Unable to read the saved shared topic pack.' }, { status: 500 })
    }

    const latestVersion = versions?.[0] || null
    const snapshot = latestVersion?.snapshot || null
    const snapshotComplete = isCompleteCanonicalSnapshot(snapshot)

    // Shared content is read-only for learners. A user request never invokes an AI provider
    // and never consumes that learner's generation credits.
    if (snapshotComplete && !forceRefresh &&
        exam.verification_status === 'verified' &&
        exam.metadata?.exam_metadata_audit_status === 'verified' &&
        String(exam.metadata?.curriculum_validation_version || '') === '4' &&
        (exam.metadata?.curriculum_validation_passed === true || exam.metadata?.curriculum_validation_passed === 'true')) {

      const { data: storedMcqs, error: storedMcqsError } = await supabase
        .from('mcqs')
        .select('id,question,options,difficulty,tags,metadata')
        .eq('topic_id', topicId)
        .eq('version', latestVersion.version)
        .order('id', { ascending: true })

      if (storedMcqsError) {
        return NextResponse.json({ success: false, error: 'Unable to load the saved MCQ set.' }, { status: 500 })
      }

      let deckQuery = supabase.from('flashcard_decks')
        .select('id')
        .eq('topic_id', topicId)
        .eq('version_num', latestVersion.version)
        .eq('is_current', true)
      if (subtopicId) deckQuery = deckQuery.eq('subtopic_id', subtopicId)
      else deckQuery = deckQuery.is('subtopic_id', null)
      const { data: flashcardDeck, error: deckError } = await deckQuery.maybeSingle()
      if (deckError) {
        return NextResponse.json({ success: false, error: 'Unable to load the saved flashcard deck.' }, { status: 500 })
      }

      let storedFlashcards: any[] = []
      if (flashcardDeck?.id) {
        const { data, error } = await supabase.from('flashcards')
          .select('id,deck_id,front,back,difficulty,explanation,high_yield_pearl,clinical_correlation,reference_notes,card_index,subtopic_id')
          .eq('deck_id', flashcardDeck.id)
          .eq('status', 'approved')
          .order('card_index', { ascending: true })
        if (error) {
          return NextResponse.json({ success: false, error: 'Unable to load the saved flashcards.' }, { status: 500 })
        }
        storedFlashcards = data || []
      }

      const mcqRows = storedMcqs || []
      const safeMcqs = (Array.isArray(snapshot.mcqs) ? snapshot.mcqs : [])
        .map((question: any) => safeQuestion(question, mcqRows, subject.name))
        .filter((item: any) => item.id)
      const safeQuizA = (Array.isArray(snapshot.quiz_a) ? snapshot.quiz_a : [])
        .map((question: any) => safeQuestion(question, mcqRows, subject.name))
        .filter((item: any) => item.id)
      const safeQuizB = (Array.isArray(snapshot.quiz_b) ? snapshot.quiz_b : [])
        .map((question: any) => safeQuestion(question, mcqRows, subject.name))
        .filter((item: any) => item.id)

      const safeContent = {
        ...snapshot,
        mcqs: safeMcqs,
        quiz_a: safeQuizA,
        quiz_b: safeQuizB,
        flashcards: storedFlashcards.map((card: any) => ({
          id: card.id,
          deck_id: card.deck_id,
          front: card.front,
          back: card.back,
          difficulty: card.difficulty,
          explanation: card.explanation || '',
          clinical_pearl: card.high_yield_pearl || card.clinical_correlation || '',
          reference_notes: card.reference_notes || '',
          category: subject.name,
          subtopic_id: card.subtopic_id,
        })),
        fill_in_the_blanks: (Array.isArray(snapshot.fill_in_the_blanks) ? snapshot.fill_in_the_blanks : []).map((item: any) => ({
          id: item.id,
          concept: item.concept,
          sentence: item.sentence,
          difficulty: item.difficulty,
          subtopic: item.subtopic,
          subtopicName: item.subtopicName,
        })),
      }

      const completeAssets = {
        mcqs: safeMcqs.length >= 10,
        notes: typeof safeContent.notes === 'string' && safeContent.notes.trim().length > 20,
        flashcards: storedFlashcards.length >= 10,
        sticky_notes: Array.isArray(safeContent.sticky_notes) && safeContent.sticky_notes.length >= 3,
        fill_in_the_blanks: safeContent.fill_in_the_blanks.length >= 8,
        whiteboard_phases: Array.isArray(safeContent.whiteboard_phases) && safeContent.whiteboard_phases.length >= 1,
        tutor_explanation: typeof safeContent.tutor_explanation === 'string' && safeContent.tutor_explanation.trim().length >= 100,
        revision_sheet: typeof safeContent.revision_sheet === 'string' && safeContent.revision_sheet.trim().length >= 100,
      }

      if (Object.values(completeAssets).every(Boolean)) {
        return NextResponse.json({
          success: true,
          source: 'database_canonical',
          cached: true,
          isRefreshing: false,
          generationReason: 'CANONICAL_SHARED_PACK',
          version: latestVersion.version,
          topicState: {
            ...topicState,
            last_refreshed_at: topicState?.last_refreshed_at || latestVersion.created_at,
            next_refresh_at: topicState?.next_refresh_at || new Date(new Date(latestVersion.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            refresh_status: topicState?.refresh_status || 'completed',
            total_mcq_count: mcqRows.length,
            content_version: latestVersion.version,
          },
          contentType,
          difficulty,
          topic: {
            id: topicData.id,
            name: topicData.name,
            subject_id: subject.id,
            subjectName: subject.name,
            exam_id: exam.id,
            examName: exam.name,
          },
          content: safeContent,
          assetStatus: Object.fromEntries(Object.entries(completeAssets).map(([key, ready]) => [key, ready ? 'ready' : 'missing'])),
        }, { headers: { 'Cache-Control': 'private, no-store' } })
      }
    }

    if (exam.verification_status !== 'verified' || exam.metadata?.exam_metadata_audit_status !== 'verified') {
      return NextResponse.json({
        success: false,
        pending: false,
        status: 'awaiting_exam_verification',
        error: 'Official exam sources are awaiting admin verification. Shared AI content will be available after approval.',
        topicState: { ...topicState, refresh_status: 'blocked_verification' },
      }, { status: 409, headers: { 'Cache-Control': 'no-store, max-age=0' } })
    }

    if (String(exam.metadata?.curriculum_validation_version || '') !== '4' ||
        !(exam.metadata?.curriculum_validation_passed === true || exam.metadata?.curriculum_validation_passed === 'true')) {
      return NextResponse.json({
        success: false,
        pending: false,
        status: 'awaiting_curriculum_validation',
        error: 'The official subject → topic → subtopic hierarchy is awaiting validation. Shared content generation is paused until it passes.',
        topicState: { ...topicState, refresh_status: 'blocked_curriculum_validation' },
      }, { status: 409, headers: { 'Cache-Control': 'no-store, max-age=0' } })
    }

    const targetVersion = Number(latestVersion?.version || 0) + 1
    let idempotencyKey = forceRefresh
      ? `canonical-topic-prefetch:admin-refresh:${exam.id}:${topicId}:v${targetVersion}`
      : latestVersion
        ? `canonical-topic-prefetch:v2:${exam.id}:${topicId}:v${targetVersion}`
        : `canonical-topic-prefetch:v1:${exam.id}:${topicId}`

    let { data: job } = await supabase.from('ai_jobs')
      .select('id,status,attempts,max_attempts,error,progress_stage')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (!job) {
      const { data: inserted, error: insertError } = await supabase.from('ai_jobs')
        .insert({
          task: 'canonical_topic_prefetch',
          user_id: null,
          exam_id: exam.id,
          subject_id: subject.id,
          topic_id: topicId,
          idempotency_key: idempotencyKey,
          priority: forceRefresh ? 20 : 10,
          status: 'queued',
          attempts: 0,
          max_attempts: 3,
          progress_stage: 'Queued for shared canonical topic-pack generation',
          step_percentage: 0,
          input_payload: {
            requested_by_feature: 'topic_learning_workspace',
            requested_subtopic_id: subtopicId,
            force_refresh: forceRefresh,
          },
        })
        .select('id,status,attempts,max_attempts,error,progress_stage')
        .maybeSingle()
      if (insertError) {
        const { data: raced } = await supabase.from('ai_jobs')
          .select('id,status,attempts,max_attempts,error,progress_stage')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle()
        job = raced
      } else {
        job = inserted
      }
    }

    if (job && ['failed', 'cancelled'].includes(job.status) &&
        Number(job.attempts || 0) < Number(job.max_attempts || 3)) {
      const { data: requeued } = await supabase.from('ai_jobs')
        .update({
          status: 'queued',error:null,started_at:null,completed_at:null,
          progress_stage:'Requeued for shared canonical topic-pack generation',step_percentage:0,
        })
        .eq('id',job.id).in('status',['failed','cancelled'])
        .select('id,status,attempts,max_attempts,error,progress_stage').maybeSingle()
      if (requeued) job = requeued
    }

    if (!job) {
      return NextResponse.json({ success: false, error: 'Could not register the shared topic-pack job.' }, { status: 500 })
    }
    if (job.status === 'completed') {
      return NextResponse.json({
        success: false,status:'content_pack_incomplete',
        error:'The previous shared pack completed but one or more required learning assets are missing. An administrator must inspect the saved pack.',
      }, { status: 409 })
    }
    if (['failed','cancelled'].includes(job.status) && Number(job.attempts || 0) >= Number(job.max_attempts || 3)) {
      return NextResponse.json({ success:false,status:'generation_failed',error:job.error || 'The shared content job exhausted its retry limit and needs an administrator retry.' }, { status: 503 })
    }
    if (!['queued','processing'].includes(job.status)) {
      return NextResponse.json({ success:false,status:'generation_unavailable',error:'The shared content job is in an unsupported state.' }, { status: 409 })
    }

    const { data: budgetStatus } = await supabase.rpc('get_platform_ai_budget_status')
    const { data: route } = await supabase.from('ai_task_routing')
      .select('cost_ceiling').eq('task_type','MCQ_GENERATION').eq('enabled',true).maybeSingle()
    const requiredBudget = Math.max(Number(route?.cost_ceiling || 0.30) * 1.05,0)
    const availableBudget = Number(budgetStatus?.available_budget_usd || 0)
    const waitingForBudget = availableBudget < requiredBudget

    const isProcessing = job.status === 'processing'
    const status = waitingForBudget ? 'waiting_for_ai_budget' : (isProcessing ? 'processing' : 'queued')
    const message = waitingForBudget
      ? 'The shared topic pack is queued, but the platform AI budget is not currently funded for this generation.'
      : isProcessing
        ? 'The shared topic pack is being generated. MCQs, notes, flashcards and fill-in-the-blanks will appear when the pack is saved.'
        : 'The shared topic pack is queued. The background worker will generate and save the complete exam-specific learning pack.'

    return NextResponse.json({
      success:false,pending:true,status,jobId:job.id,retryAfter:5,message,error:message,
      topicState:{...topicState,refresh_status:isProcessing?'in_progress':'queued',refresh_job_id:job.id},
    }, { status:202, headers:{'Cache-Control':'no-store, max-age=0'} })
  } catch (error: any) {
    console.error('Topic Content API Error:', error)
    return NextResponse.json({ success:false,error:error?.message || 'Server error loading shared topic content.' }, { status:500 })
  }
}
