import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'
import { GenerationJobManager } from '@/lib/server/content-engine/job-manager'

export const maxDuration = 60;

const inputParamsSchema = z.record(z.string(), z.any()).superRefine((value, ctx) => {
  if (JSON.stringify(value).length > 16_000) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Input parameters must be 16 KB or smaller.' });
  }

  const requestedBatchSize =
    value.batch_size ?? value.batchSize ?? value.num_questions ?? value.question_count ??
    value.numQuestions ?? value.questionCount ?? value.total_questions ?? value.totalQuestions ??
    value.number_of_questions ?? value.numberOfQuestions ?? value.count ?? value.num_items;
  if (typeof requestedBatchSize === 'number' &&
      (!Number.isInteger(requestedBatchSize) || requestedBatchSize < 1 || requestedBatchSize > 50)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Batch size must be between 1 and 50.' });
  }
});

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
  inputParams: inputParamsSchema,
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

    // The deployed schema does not contain ai_content_cache. Avoid issuing a
    // guaranteed-failing REST query here; GenerationJobManager performs the
    // persisted deduplication/attach check against ai_jobs below.
    // 1. Atomically Create or Attach to AI Generation Job in database
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
      getSupabaseAdmin()
    )

    if (!job) {
      return NextResponse.json({ error: 'Failed to enqueue AI job' }, { status: 500 })
    }

    // 3. Trigger the worker after returning the queued response. A bare unawaited
    // fetch can be frozen when the serverless request completes, leaving jobs stuck QUEUED.
    if (isNew && job.status === 'QUEUED') {
      after(async () => {
        try {
          const workerResponse = await fetch(`${req.nextUrl.origin}/api/ai/process-job`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-api-secret': process.env.INTERNAL_API_SECRET || '',
            },
            body: JSON.stringify({ jobId: job.id }),
          });

          if (!workerResponse.ok) {
            const workerText = await workerResponse.text();
            console.error('[AI Enqueue] Worker rejected job:', job.id, workerResponse.status, workerText.slice(0, 400));
            await (getSupabaseAdmin() as any).from('ai_jobs').update({
              status: 'failed',
              progress_stage: 'Failed to start',
              step_percentage: 100,
              error: 'The AI worker could not start this job. Please retry.',
              completed_at: new Date().toISOString(),
            }).eq('id', job.id).eq('user_id', user.id);
          }
        } catch (err) {
          console.error('[AI Enqueue] Background worker trigger failed:', err);
          await (getSupabaseAdmin() as any).from('ai_jobs').update({
            status: 'failed',
            progress_stage: 'Failed to start',
            step_percentage: 100,
            error: 'The AI worker could not start this job. Please retry.',
            completed_at: new Date().toISOString(),
          }).eq('id', job.id).eq('user_id', user.id);
        }
      });
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
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('AI_JOB_RATE_LIMIT')) {
      return NextResponse.json(
        { error: 'You have reached the AI generation limit for this hour. Please try again later.' },
        { status: 429 }
      );
    }
    if (message.includes('payload exceeds 16 KB') || message.includes('batch size must be')) {
      return NextResponse.json(
        { error: 'Your AI generation request is too large. Reduce the batch size and try again.' },
        { status: 400 }
      );
    }
    console.error('[AI Enqueue] Error:', error);
    return NextResponse.json({ error: 'Failed to enqueue AI job' }, { status: 500 })
  }
}
