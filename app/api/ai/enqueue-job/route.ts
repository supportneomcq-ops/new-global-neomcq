import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { GenerationJobManager } from '@/lib/server/content-engine/job-manager'

const enqueueJobSchema = z.object({
  jobType: z.enum([
    'study_plan',
    'question_bank',
    'summary_notes',
    'mock_exam',
    'adaptive_quiz',
    'exam_syllabus',
    'exam_structure',
    'exam_topics',
  ]),
  inputParams: z.record(z.string(), z.any()),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const validation = enqueueJobSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }

    const { jobType, inputParams } = validation.data

    // 1. Check AI Content Cache first
    const cacheKey = `${jobType}:${JSON.stringify(inputParams)}`
    const { data: cached } = await (supabase as any)
      .from('ai_content_cache')
      .select('payload')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached) {
      return NextResponse.json({
        success: true,
        cached: true,
        jobId: null,
        result: (cached as any).payload,
        status: 'completed',
      })
    }

    // 2. Atomically Create or Attach to AI Generation Job in database
    const { job, isNew, resolutionType } = await GenerationJobManager.createOrAttachJob(
      {
        examId: inputParams.examId || '',
        subjectId: inputParams.subjectId,
        topicId: inputParams.topicId,
        examVersionId: inputParams.examVersionId,
        packageType: jobType,
        version: inputParams.version || 1,
        task: `${jobType}_generation`,
        userId: user.id,
        inputPayload: {
          job_type: jobType,
          ...inputParams,
        },
      },
      supabase
    )

    if (!job) {
      return NextResponse.json({ error: 'Failed to enqueue AI job' }, { status: 500 })
    }

    // 3. Trigger asynchronous worker processing only if this is a newly created job
    if (isNew && job.status === 'QUEUED') {
      fetch(`${req.nextUrl.origin}/api/ai/process-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId: job.id }),
      }).catch((err) => console.error('Background AI job trigger error:', err))
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status.toLowerCase(),
      isNew,
      resolutionType,
      message: isNew
        ? 'AI generation job enqueued asynchronously'
        : 'Reusing existing active or completed generation job',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
