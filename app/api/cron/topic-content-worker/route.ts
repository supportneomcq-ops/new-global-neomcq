import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getOrGenerateCanonicalTopicContent } from '@/lib/knowledge/ai-content-intelligence'

export const runtime = 'nodejs'
export const maxDuration = 300

const TASK = 'canonical_topic_prefetch'
const MAX_ATTEMPTS = 3

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return json(401, { success: false, error: 'Unauthorized' })
  }

  const admin = getSupabaseAdmin() as any
  const now = new Date()
  const nowIso = now.toISOString()
  const staleBefore = new Date(now.getTime() - 20 * 60 * 1000).toISOString()
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()

  // Recover only this queue's abandoned claims. A second invocation may safely
  // retry because the topic content engine itself uses canonical version keys.
  await admin.from('ai_jobs')
    .update({
      status: 'queued',
      progress_stage: 'Recovered after topic-content worker timeout',
      step_percentage: 0,
      error: 'Previous topic-content worker did not finish; safely requeued.',
    })
    .eq('task', TASK)
    .eq('status', 'processing')
    .lt('started_at', staleBefore)

  // Respect the existing platform-wide AI cost-protection setting. If protection
  // is disabled or the cap is missing/invalid, fail closed rather than spend.
  const { data: settings, error: settingsError } = await admin.from('system_settings')
    .select('key, value')
    .in('key', ['advanced', 'ai'])
  if (settingsError) {
    return json(503, { success: false, paused: true, error: 'AI budget settings could not be loaded.' })
  }
  const settingMap = Object.fromEntries((settings || []).map((row: any) => [row.key, row.value || {}]))
  const advanced = settingMap.advanced || {}
  const ai = settingMap.ai || {}
  const dailyCap = Number(advanced.aiCostProtectionMaxDailyUsd)
  if (ai.costProtectionEnabled !== true || !Number.isFinite(dailyCap) || dailyCap <= 0) {
    return json(200, { success: true, paused: true, reason: 'AI cost protection is disabled or no valid daily USD cap is configured.' })
  }

  const { data: costRows, error: costError } = await admin.from('ai_cost_events')
    .select('actual_provider_cost')
    .gte('created_at', dayStart)
    .limit(10000)
  if (costError) {
    return json(503, { success: false, paused: true, error: 'Could not verify today’s AI provider spend.' })
  }
  if ((costRows || []).length >= 10000) {
    return json(503, { success: false, paused: true, error: 'Daily AI spend records exceeded the safety-query limit; refusing to estimate spend from a truncated result.' })
  }
  const spentToday = (costRows || []).reduce((total: number, row: any) => {
    const cost = Number(row.actual_provider_cost || 0)
    return total + (Number.isFinite(cost) && cost > 0 ? cost : 0)
  }, 0)
  if (spentToday >= dailyCap) {
    return json(200, { success: true, paused: true, budget: { spentToday, dailyCap }, reason: 'Daily AI spend cap reached.' })
  }

  const requestedJobId = req.nextUrl.searchParams.get('jobId')
  let failedQuery = admin.from('ai_jobs')
    .select('*')
    .eq('task', TASK)
    .eq('status', 'failed')
    .lt('attempts', MAX_ATTEMPTS)
  if (requestedJobId) failedQuery = failedQuery.eq('id', requestedJobId)
  const { data: failed } = await failedQuery
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)

  let candidate = failed?.[0] || null
  if (!candidate) {
    let queuedQuery = admin.from('ai_jobs')
      .select('*')
      .eq('task', TASK)
      .eq('status', 'queued')
    if (requestedJobId) queuedQuery = queuedQuery.eq('id', requestedJobId)
    const { data: queued } = await queuedQuery
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
    candidate = queued?.[0] || null
  }

  if (!candidate) {
    return json(200, { success: true, message: 'No canonical topic-content jobs are waiting.', budget: { spentToday, dailyCap } })
  }

  const attempt = Number(candidate.attempts || 0) + 1
  const { data: claimed, error: claimError } = await admin.from('ai_jobs')
    .update({
      status: 'processing',
      attempts: attempt,
      started_at: nowIso,
      completed_at: null,
      error: null,
      progress_stage: 'Checking canonical exam and topic scope',
      step_percentage: 5,
    })
    .eq('id', candidate.id)
    .in('status', ['queued', 'failed'])
    .select('*')
    .maybeSingle()

  if (claimError || !claimed) {
    return json(200, { success: true, message: 'Another worker claimed the available topic job.' })
  }

  try {
    const payload = claimed.input_payload || {}
    const examId = payload.examId || claimed.exam_id
    const subjectId = payload.subjectId || claimed.subject_id
    const topicId = payload.topicId || claimed.topic_id
    if (!examId || !subjectId || !topicId) throw new Error('Topic-content job is missing canonical hierarchy IDs.')

    const [{ data: exam, error: examError }, { data: subject, error: subjectError }, { data: topic, error: topicError }] = await Promise.all([
      admin.from('exams').select('id, name, verification_status, metadata').eq('id', examId).maybeSingle(),
      admin.from('exam_subjects').select('id, name, exam_id, active, is_active').eq('id', subjectId).maybeSingle(),
      admin.from('exam_topics').select('id, name, subject_id, active, is_active').eq('id', topicId).maybeSingle(),
    ])
    if (examError || !exam) throw new Error('Canonical exam could not be loaded.')
    if (subjectError || !subject || subject.exam_id !== exam.id) throw new Error('Topic job subject does not belong to the canonical exam.')
    if (topicError || !topic || topic.subject_id !== subject.id) throw new Error('Topic job does not belong to the canonical subject.')
    if (subject.active === false || subject.is_active === false || topic.active === false || topic.is_active === false) {
      throw new Error('Inactive subject or topic cannot receive canonical content.')
    }
    if (String(exam.verification_status || '').toLowerCase() !== 'verified') {
      throw new Error('Exam is not officially verified; canonical content generation remains paused.')
    }
    if (exam.metadata?.curriculum_validation_version !== 3 || exam.metadata?.curriculum_validation_passed !== true) {
      throw new Error('Exam curriculum has not passed persisted hierarchy validation.')
    }

    await admin.from('ai_jobs').update({
      progress_stage: 'Generating shared canonical topic learning pack',
      step_percentage: 20,
    }).eq('id', claimed.id)

    const result = await getOrGenerateCanonicalTopicContent({
      examInput: exam.id,
      subjectInput: subject.id,
      topicInput: topic.id,
      userId: null,
      difficulty: 'Intermediate',
      language: 'en',
      forceRefresh: false,
      autoCreateEntities: false,
    })
    if (!result.success || !result.content) {
      throw new Error(result.error || 'Canonical topic content generation did not complete.')
    }

    // Confirm persisted shared assets before declaring the queue item complete.
    const [{ data: version }, { count: mcqCount }, { count: noteCount }, { count: flashcardCount }] = await Promise.all([
      admin.from('content_versions').select('id, version, snapshot').eq('asset_id', topic.id).eq('asset_type', 'topic').order('version', { ascending: false }).limit(1).maybeSingle(),
      admin.from('mcqs').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id),
      admin.from('notes').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id),
      admin.from('flashcards').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id),
    ])
    const hasPersistedPack = Boolean(
      version?.snapshot ||
      Number(mcqCount || 0) > 0 ||
      Number(noteCount || 0) > 0 ||
      Number(flashcardCount || 0) > 0
    )
    if (!hasPersistedPack) throw new Error('Generation returned content but no canonical assets were found in persistent storage.')

    const { error: finishError } = await admin.from('ai_jobs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      progress_stage: 'Shared canonical topic pack persisted',
      step_percentage: 100,
      output_payload: {
        examId: exam.id,
        subjectId: subject.id,
        topicId: topic.id,
        versionNumber: result.version_number,
        servedFromCache: result.served_from_cache,
        persisted: {
          contentVersionId: version?.id || null,
          mcqs: Number(mcqCount || 0),
          notes: Number(noteCount || 0),
          flashcards: Number(flashcardCount || 0),
        },
        metrics: result.metrics,
      },
      error: null,
    }).eq('id', claimed.id)
    if (finishError) throw new Error('Canonical topic content was saved, but queue completion could not be recorded.')

    return json(200, {
      success: true,
      processed: { examId: exam.id, subjectId: subject.id, topicId: topic.id, version: result.version_number, servedFromCache: result.served_from_cache },
      budget: { spentToday, dailyCap },
    })
  } catch (error: any) {
    const message = String(error?.message || 'Unknown canonical topic-content failure').slice(0, 1500)
    const retryable = attempt < Number(claimed.max_attempts || MAX_ATTEMPTS)
    await admin.from('ai_jobs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      progress_stage: retryable ? 'Failed; awaiting automatic retry' : 'Failed after maximum attempts',
      step_percentage: 0,
      error: message,
    }).eq('id', claimed.id)
    console.error('[Canonical Topic Worker] Job failed:', { jobId: claimed.id, topicId: claimed.topic_id, attempt, retryable, message })
    return json(200, { success: false, jobId: claimed.id, attempt, retryable, error: 'Canonical topic generation failed; the job has been recorded for retry.' })
  }
}
