import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getOrGenerateCanonicalTopicContent } from '@/lib/knowledge/ai-content-intelligence'

export const runtime = 'nodejs'
export const maxDuration = 300

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return json(401, { success: false, error: 'Unauthorized' })
  }

  const admin = getSupabaseAdmin() as any
  const { data: claims, error: claimError } = await admin.rpc('claim_canonical_topic_prefetch_job')

  if (claimError) {
    console.error('[Canonical Content Worker] Claim failed:', claimError.message)
    return json(500, { success: false, error: 'Could not claim a canonical content job.' })
  }

  const claim = Array.isArray(claims) ? claims[0] : claims
  if (!claim?.job_id || !claim?.job_record) {
    return json(200, {
      success: true,
      processed: false,
      reason: claim?.claim_reason || 'queue_empty',
      availableBudgetUsd: Number(claim?.available_budget_usd || 0),
      requiredBudgetUsd: Number(claim?.required_budget_usd || 0),
    })
  }

  const job = claim.job_record
  const payload = job.input_payload || {}
  const examId = payload.examId || job.exam_id
  const subjectId = payload.subjectId || job.subject_id
  const topicId = payload.topicId || job.topic_id
  const now = new Date().toISOString()

  try {
    if (![examId, subjectId, topicId].every((value) =>
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    )) {
      throw new Error('Canonical prefetch job is missing a valid exam, subject, or topic ID.')
    }

    const [{ data: exam, error: examError }, { data: currentVersion, error: versionError }] = await Promise.all([
      admin.from('exams')
        .select('id, name, verification_status, metadata')
        .eq('id', examId)
        .maybeSingle(),
      admin.from('exam_versions')
        .select('id, verification_status, is_current, verified_at')
        .eq('exam_id', examId)
        .eq('is_current', true)
        .maybeSingle(),
    ])

    if (examError || !exam) throw new Error('Canonical exam record could not be loaded.')
    if (versionError) throw new Error('Current examination version could not be checked.')

    const metadata = exam.metadata || {}
    const verified = String(exam.verification_status || '').toLowerCase() === 'verified'
      && String(currentVersion?.verification_status || '').toLowerCase() === 'verified'
      && Boolean(currentVersion?.verified_at)
      && metadata.exam_metadata_audit_status === 'verified'
      && metadata.curriculum_validation_version === 4
      && metadata.curriculum_validation_passed === true

    if (!verified) {
      const reason = 'Exam verification or saved-curriculum validation is no longer current; shared content generation was blocked.'
      await admin.from('ai_jobs').update({
        status: 'cancelled',
        error: reason,
        progress_stage: 'Blocked by exam verification gate',
        step_percentage: 100,
        completed_at: now,
      }).eq('id', job.id).eq('status', 'processing')
      return json(200, { success: false, processed: false, jobId: job.id, reason })
    }

    await admin.from('ai_jobs').update({
      progress_stage: 'Generating shared canonical topic pack',
      step_percentage: 15,
    }).eq('id', job.id).eq('status', 'processing')

    await admin.from('topic_content_state').upsert({
      exam_id: examId,
      subject_id: subjectId,
      topic_id: topicId,
      refresh_status: 'in_progress',
      refresh_job_id: job.id,
      last_refresh_error: null,
      updated_at: now,
    }, { onConflict: 'exam_id,subject_id,topic_id' })

    // This is the shared canonical engine: it validates the full learning pack,
    // deduplicates concurrent requests, persists versioned assets and records provider costs.
    // Student requests reuse this pack; only an authenticated admin refresh job sets force_refresh.
    const result = await getOrGenerateCanonicalTopicContent({
      examInput: examId,
      subjectInput: subjectId,
      topicInput: topicId,
      userId: null,
      forceRefresh: payload.force_refresh === true,
      autoCreateEntities: false,
      parentJobId: job.id,
    })

    if (!result.success || !result.content) {
      throw new Error(result.error || 'Canonical content generation did not produce a valid content package.')
    }

    const content = result.content
    const completedAt = new Date().toISOString()
    const { error: stateError } = await admin.from('topic_content_state').upsert({
      exam_id: examId,
      subject_id: subjectId,
      topic_id: topicId,
      refresh_status: 'completed',
      refresh_job_id: job.id,
      last_refreshed_at: completedAt,
      content_version: result.version_number,
      total_mcq_count: content.mcqs?.length || 0,
      total_notes_count: content.notes ? 1 : 0,
      total_flashcards_count: content.flashcards?.length || 0,
      recent_added_mcqs: result.served_from_cache ? 0 : (content.mcqs?.length || 0),
      recent_added_notes: result.served_from_cache || !content.notes ? 0 : 1,
      recent_added_flashcards: result.served_from_cache ? 0 : (content.flashcards?.length || 0),
      last_refresh_error: null,
      updated_at: completedAt,
    }, { onConflict: 'exam_id,subject_id,topic_id' })

    if (stateError) throw new Error(`Canonical content was generated but its topic state could not be saved: ${stateError.message}`)

    const { error: finishError } = await admin.from('ai_jobs').update({
      status: 'completed',
      progress_stage: result.served_from_cache ? 'Existing canonical content reused' : 'Canonical content generated and saved',
      step_percentage: 100,
      completed_at: completedAt,
      error: null,
      output_payload: {
        examId,
        subjectId,
        topicId,
        version: result.version_number,
        servedFromCache: result.served_from_cache,
        generationReason: result.generation_reason,
        mcqCount: content.mcqs?.length || 0,
        quizACount: content.quiz_a?.length || 0,
        quizBCount: content.quiz_b?.length || 0,
        notesCreated: Boolean(content.notes),
        flashcardCount: content.flashcards?.length || 0,
        stickyNoteCount: content.sticky_notes?.length || 0,
        fillInTheBlankCount: content.fill_in_the_blanks?.length || 0,
        whiteboardPhaseCount: content.whiteboard_phases?.length || 0,
        provider: result.metrics.provider_used,
        model: result.metrics.model_used,
        actualCostUsd: result.metrics.actual_cost_usd,
        qualityScore: content.quality_score || null,
      },
    }).eq('id', job.id).eq('status', 'processing')

    if (finishError) throw new Error(`Content saved but the queue job could not be finalized: ${finishError.message}`)

    return json(200, {
      success: true,
      processed: true,
      jobId: job.id,
      exam: exam.name,
      version: result.version_number,
      reusedExisting: result.served_from_cache,
      actualCostUsd: result.metrics.actual_cost_usd,
      generated: {
        mcqs: content.mcqs?.length || 0,
        notes: Boolean(content.notes),
        flashcards: content.flashcards?.length || 0,
        stickyNotes: content.sticky_notes?.length || 0,
        fillInTheBlanks: content.fill_in_the_blanks?.length || 0,
        whiteboardPhases: content.whiteboard_phases?.length || 0,
      },
    })
  } catch (error: any) {
    const message = String(error?.message || 'Canonical content worker failed').slice(0, 1500)
    const failedAt = new Date().toISOString()

    await Promise.all([
      admin.from('ai_jobs').update({
        status: 'failed',
        progress_stage: 'Canonical content generation failed; retry may be attempted',
        step_percentage: 0,
        error: message,
        completed_at: failedAt,
      }).eq('id', job.id).eq('status', 'processing'),
      admin.from('topic_content_state').update({
        refresh_status: 'failed',
        refresh_job_id: job.id,
        last_refresh_error: message,
        updated_at: failedAt,
      }).eq('exam_id', examId).eq('subject_id', subjectId).eq('topic_id', topicId),
    ])

    console.error('[Canonical Content Worker] Job failed:', { jobId: job.id, attempts: job.attempts, message })
    return json(500, { success: false, processed: false, jobId: job.id, error: message })
  }
}
