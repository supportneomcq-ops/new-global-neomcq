import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { resolveOrInitializeExamIntelligence } from '@/lib/server/exam-intelligence'

export const runtime = 'nodejs'
export const maxDuration = 300

const TASK = 'curriculum_rebuild'
const BATCH_SIZE = 1

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authorization = req.headers.get('authorization')
  if (!secret || authorization !== `Bearer ${secret}`) {
    return json(401, { success: false, error: 'Unauthorized' })
  }

  const admin = getSupabaseAdmin() as any
  const now = new Date().toISOString()
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  // Recover jobs abandoned by a terminated serverless invocation.
  await admin.from('ai_jobs')
    .update({ status: 'queued', progress_stage: 'Recovered after worker timeout', step_percentage: 0, error: 'Previous worker did not finish; safely requeued.' })
    .eq('task', TASK)
    .eq('status', 'processing')
    .lt('started_at', staleBefore)

  // Seed one durable, idempotent job for every existing non-archived exam.
  // The resolver reuses canonical IDs and reconciles missing hierarchy nodes.
  const { data: exams, error: examsError } = await admin
    .from('exams')
    .select('id, name, slug, status, metadata')
    .neq('status', 'archived')
    .order('name', { ascending: true })
    .limit(250)

  if (examsError) {
    console.error('[Curriculum Worker] Exam scan failed:', examsError.message)
    return json(500, { success: false, error: 'Could not scan the existing exam catalogue.' })
  }

  const jobs = (exams || []).map((exam: any) => ({
    task: TASK,
    exam_id: exam.id,
    priority: /fmge|neet pg|neet ug|usmle/i.test(`${exam.name} ${exam.slug || ''}`) ? 10 : 5,
    status: 'queued',
    max_attempts: 3,
    idempotency_key: `curriculum-rebuild-v1:${exam.id}`,
    input_payload: {
      examId: exam.id,
      examName: exam.name,
      source: 'existing_exam_backfill',
    },
    progress_stage: 'Queued for curriculum validation',
    step_percentage: 0,
  }))

  if (jobs.length) {
    const { error: seedError } = await admin.from('ai_jobs')
      .upsert(jobs, { onConflict: 'idempotency_key', ignoreDuplicates: true })
    if (seedError) {
      console.error('[Curriculum Worker] Queue seeding failed:', seedError.message)
      return json(500, { success: false, error: 'Could not queue existing exams for curriculum repair.' })
    }
  }

  // Claim a single job per invocation so a slow provider cannot consume the
  // entire worker window. The conditional update is the atomic claim operation.
  let candidate: any = null
  // Retry a previously failed job before taking new work, so transient provider
  // failures recover promptly rather than waiting behind the entire backlog.
  const { data: failed } = await admin.from('ai_jobs')
    .select('*')
    .eq('task', TASK)
    .eq('status', 'failed')
    .lt('attempts', 3)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
  candidate = failed?.[0] || null

  if (!candidate) {
    const { data: queued } = await admin.from('ai_jobs')
      .select('*')
      .eq('task', TASK)
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)
    candidate = queued?.[0] || null
  }
  if (!candidate) {
    const { count } = await admin.from('ai_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('task', TASK)
      .eq('status', 'completed')
    return json(200, { success: true, message: 'No curriculum jobs are waiting.', examsQueued: jobs.length, completedJobs: count || 0 })
  }

  const nextAttempt = Number(candidate.attempts || 0) + 1
  const { data: claimed, error: claimError } = await admin.from('ai_jobs')
    .update({
      status: 'processing',
      attempts: nextAttempt,
      started_at: now,
      completed_at: null,
      error: null,
      progress_stage: 'Reconciling curriculum',
      step_percentage: 10,
    })
    .eq('id', candidate.id)
    .in('status', ['queued', 'failed'])
    .select('*')
    .maybeSingle()

  if (claimError || !claimed) {
    return json(200, { success: true, message: 'Another worker claimed the available job.', examsQueued: jobs.length })
  }

  try {
    const payload = claimed.input_payload || {}
    let examId = payload.examId || claimed.exam_id
    let examName = payload.examName

    if (!examName && examId) {
      const { data: examRow, error: examError } = await admin.from('exams')
        .select('id, name')
        .eq('id', examId)
        .maybeSingle()
      if (examError || !examRow) throw new Error('Canonical exam record could not be loaded.')
      examName = examRow.name
    }
    if (!examName) throw new Error('Curriculum job is missing its exam name.')

    await admin.from('ai_jobs').update({
      progress_stage: 'Generating and reconciling subject/topic/subtopic hierarchy',
      step_percentage: 25,
    }).eq('id', claimed.id)

    const result = await resolveOrInitializeExamIntelligence({
      examQuery: examName,
      country: payload.country,
      category: payload.category,
      level: payload.level,
      userId: payload.userId || null,
    })

    if (!result?.success || !result.exam?.id) {
      throw new Error('Exam intelligence resolver did not return a canonical exam.')
    }
    examId = result.exam.id

    const { data: persisted, error: verifyError } = await admin.from('exams')
      .select('id, name, metadata, exam_subjects(id, exam_topics(id, exam_subtopics(id)))')
      .eq('id', examId)
      .maybeSingle()
    if (verifyError || !persisted) throw new Error('Could not verify the saved curriculum.')

    const subjects = persisted.exam_subjects || []
    const topicCount = subjects.reduce((n: number, s: any) => n + (s.exam_topics || []).length, 0)
    const subtopicCount = subjects.reduce((n: number, s: any) => n + (s.exam_topics || []).reduce((m: number, t: any) => m + (t.exam_subtopics || []).length, 0), 0)
    const metadata = persisted.metadata || {}
    const validated = metadata.curriculum_validation_version === 2 &&
      metadata.curriculum_validation_passed === true &&
      subjects.length > 0 && topicCount > 0 && subtopicCount > 0

    if (!validated) {
      throw new Error(`Curriculum did not pass persisted hierarchy validation (subjects=${subjects.length}, topics=${topicCount}, subtopics=${subtopicCount}).`)
    }

    // Attach the verified canonical curriculum to a learner only after the
    // persisted hierarchy passes the validation gate.
    const learnerId = payload.userId
    if (learnerId) {
      const { error: profileError } = await admin.from('profiles').update({
        current_exam_id: examId,
        exam_locked: true,
        exam_selected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', learnerId)
      if (profileError) throw new Error('Verified curriculum could not be attached to the learner profile.')

      const { error: linkError } = await admin.from('user_exams').upsert({
        user_id: learnerId,
        exam_id: examId,
        target_date: payload.examDate || null,
        target_score: 85,
        status: 'in_progress',
      }, { onConflict: 'user_id,exam_id' })
      if (linkError) throw new Error('Verified curriculum could not be linked to the learner account.')

      const { data: authRecord } = await admin.auth.admin.getUserById(learnerId)
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(learnerId, {
        user_metadata: {
          ...(authRecord?.user?.user_metadata || {}),
          neo_curriculum_status: 'ready',
          neo_exam_id: examId,
          neo_exam_name: persisted.name,
          neo_curriculum_ready_at: new Date().toISOString(),
        },
      })
      if (authUpdateError) throw new Error('Curriculum is verified, but learner status could not be updated.')
    }

    const { error: finishError } = await admin.from('ai_jobs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      progress_stage: 'Curriculum saved and verified',
      step_percentage: 100,
      output_payload: {
        examId,
        examName: persisted.name,
        subjectCount: subjects.length,
        topicCount,
        subtopicCount,
        curriculumValidationVersion: metadata.curriculum_validation_version,
        curriculumValidationPassed: metadata.curriculum_validation_passed,
      },
      error: null,
    }).eq('id', claimed.id)
    if (finishError) throw new Error('Curriculum was verified but job completion could not be recorded.')

    console.log(`[Curriculum Worker] Verified ${persisted.name}: ${subjects.length} subjects, ${topicCount} topics, ${subtopicCount} subtopics.`)
    return json(200, {
      success: true,
      processed: { examId, examName: persisted.name, subjects: subjects.length, topics: topicCount, subtopics: subtopicCount },
      examsQueued: jobs.length,
    })
  } catch (error: any) {
    const message = String(error?.message || 'Unknown curriculum processing failure').slice(0, 1500)
    const retryable = nextAttempt < Number(claimed.max_attempts || 3)
    await admin.from('ai_jobs').update({
      status: retryable ? 'failed' : 'failed',
      completed_at: new Date().toISOString(),
      progress_stage: retryable ? 'Failed; awaiting automatic retry' : 'Failed after maximum attempts',
      step_percentage: 0,
      error: message,
    }).eq('id', claimed.id)
    console.error('[Curriculum Worker] Job failed:', { jobId: claimed.id, examName: claimed.input_payload?.examName, attempt: nextAttempt, retryable, message })
    return json(200, {
      success: false,
      jobId: claimed.id,
      attempt: nextAttempt,
      retryable,
      error: 'Curriculum generation or persistence validation failed; the job has been recorded for retry.',
    })
  }
}
