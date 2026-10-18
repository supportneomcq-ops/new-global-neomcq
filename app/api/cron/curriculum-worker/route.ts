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

  // Bulk catalogue backfill is opt-in only. The cron worker must prioritize
  // signup-triggered/on-demand work instead of generating jobs for every exam
  // on every invocation. Run with ?backfill=1 only for an intentional audit.
  const backfillRequested = req.nextUrl.searchParams.get('backfill') === '1'
  let jobs: any[] = []
  if (backfillRequested) {
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

    jobs = (exams || []).map((exam: any) => ({
      task: TASK,
      exam_id: exam.id,
      priority: 5,
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
  }

  // Claim a single job per invocation so a slow provider cannot consume the
  // entire worker window. The conditional update is the atomic claim operation.
  let candidate: any = null
  // Retry a previously failed job before taking new work, so transient provider
  // failures recover promptly rather than waiting behind the entire backlog.
  let failedQuery = admin.from('ai_jobs')
    .select('*')
    .eq('task', TASK)
    .eq('status', 'failed')
    .lt('attempts', 3)
  if (!backfillRequested) {
    failedQuery = failedQuery.or('input_payload->>source.is.null,input_payload->>source.neq.existing_exam_backfill')
  }
  const { data: failed } = await failedQuery
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
  candidate = failed?.[0] || null

  if (!candidate) {
    let queuedQuery = admin.from('ai_jobs')
      .select('*')
      .eq('task', TASK)
      .eq('status', 'queued')
    if (!backfillRequested) {
      queuedQuery = queuedQuery.or('input_payload->>source.is.null,input_payload->>source.neq.existing_exam_backfill')
    }
    const { data: queued } = await queuedQuery
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
      .select('id, name, metadata, exam_subjects(id, name, active, is_active, exam_topics(id, name, active, is_active, exam_subtopics(id, name, is_active)))')
      .eq('id', examId)
      .maybeSingle()
    if (verifyError || !persisted) throw new Error('Could not verify the saved curriculum.')

    const metadata = persisted.metadata || {}
    const spec = metadata.curriculum_spec_cache
    const expectedSubjects = Array.isArray(spec?.subjects) ? spec.subjects : []
    const allSubjects = persisted.exam_subjects || []
    const subjects = allSubjects.filter((s: any) => s.is_active !== false && s.active !== false)
    const normalize = (value: unknown) => String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
    const activeChildren = (items: any[]) => (items || []).filter((item: any) =>
      item.is_active !== false && item.active !== false
    )
    const findByName = (items: any[], name: string) =>
      activeChildren(items).find((item: any) => normalize(item.name) === normalize(name))
    const genericLabel = /^(subject|topic|subtopic|core subject|core topic|topic number|module)\s*\d*$/i

    // Validate the persisted database hierarchy against the cached exam-specific
    // specification. This is intentionally universal: never infer subject/topic
    // counts from a few hard-coded exams. User-added extra nodes remain allowed.
    let missingSubjects: string[] = []
    let topicCoverageFailures: string[] = []
    let subtopicCoverageFailures: string[] = []
    let hasInvalidLabels = false

    if (expectedSubjects.length > 0) {
      for (const expectedSubject of expectedSubjects) {
        const savedSubject = findByName(subjects, expectedSubject.name)
        if (!savedSubject) {
          missingSubjects.push(String(expectedSubject.name || '(unnamed subject)'))
          continue
        }
        if (genericLabel.test(String(savedSubject.name || '').trim())) hasInvalidLabels = true

        const expectedTopics = Array.isArray(expectedSubject.topics) ? expectedSubject.topics : []
        const savedTopics = activeChildren(savedSubject.exam_topics || [])
        if (expectedTopics.length === 0) {
          topicCoverageFailures.push(String(expectedSubject.name || '(unnamed subject)'))
          continue
        }

        let matchedTopics = 0
        for (const expectedTopic of expectedTopics) {
          const savedTopic = findByName(savedTopics, expectedTopic.name)
          if (!savedTopic) continue
          matchedTopics += 1
          if (genericLabel.test(String(savedTopic.name || '').trim())) hasInvalidLabels = true

          const expectedSubtopics = Array.isArray(expectedTopic.subtopics) ? expectedTopic.subtopics : []
          const savedSubtopics = activeChildren(savedTopic.exam_subtopics || [])
          const matchedSubtopics = expectedSubtopics.filter((expectedSubtopic: any) =>
            Boolean(findByName(savedSubtopics, expectedSubtopic.name))
          ).length

          // A topic must have at least one meaningful saved subtopic, and at
          // least 80% of its expected subtopics must be present.
          if (
            savedSubtopics.length === 0 ||
            (expectedSubtopics.length > 0 && matchedSubtopics / expectedSubtopics.length < 0.8)
          ) {
            subtopicCoverageFailures.push(`${expectedSubject.name} > ${expectedTopic.name}`)
          }
        }

        // Every expected subject is required; at least 80% of each subject's
        // expected topics must be present in the persisted hierarchy.
        if (matchedTopics / expectedTopics.length < 0.8) {
          topicCoverageFailures.push(String(expectedSubject.name || '(unnamed subject)'))
        }
      }
    }

    const topicRows = subjects.flatMap((subject: any) => activeChildren(subject.exam_topics || []))
    const subtopicRows = topicRows.flatMap((topic: any) => activeChildren(topic.exam_subtopics || []))
    const topicCount = topicRows.length
    const subtopicCount = subtopicRows.length
    const hasDuplicateNames = (items: any[]) => {
      const names = items.map((item: any) => normalize(item.name)).filter(Boolean)
      return new Set(names).size !== names.length
    }
    const duplicateSubjects = hasDuplicateNames(subjects)
    const duplicateTopics = subjects.some((subject: any) =>
      hasDuplicateNames(activeChildren(subject.exam_topics || []))
    )
    const duplicateSubtopics = topicRows.some((topic: any) =>
      hasDuplicateNames(activeChildren(topic.exam_subtopics || []))
    )
    const validated =
      metadata.curriculum_validation_version === 3 &&
      metadata.curriculum_validation_passed === true &&
      expectedSubjects.length > 0 &&
      missingSubjects.length === 0 &&
      topicCoverageFailures.length === 0 &&
      subtopicCoverageFailures.length === 0 &&
      !hasInvalidLabels &&
      !duplicateSubjects &&
      !duplicateTopics &&
      !duplicateSubtopics &&
      subjects.length > 0 &&
      topicRows.length > 0 &&
      subtopicRows.length > 0

    if (!validated) {
      await admin.from('exams').update({
        metadata: {
          ...metadata,
          curriculum_validation_passed: false,
          curriculum_status: 'needs_enrichment',
          curriculum_validation_errors: {
            missingSubjects: missingSubjects.slice(0, 30),
            topicCoverageFailures: topicCoverageFailures.slice(0, 30),
            subtopicCoverageFailures: subtopicCoverageFailures.slice(0, 30),
            hasInvalidLabels,
            duplicateSubjects,
            duplicateTopics,
            duplicateSubtopics,
          },
        },
        updated_at: new Date().toISOString(),
      }).eq('id', examId)
      throw new Error(
        `Curriculum failed universal saved-hierarchy validation (expected subjects=${expectedSubjects.length}, missing subjects=${missingSubjects.length}, topic coverage failures=${topicCoverageFailures.length}, subtopic coverage failures=${subtopicCoverageFailures.length}).`
      )
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
