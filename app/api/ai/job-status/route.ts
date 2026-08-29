import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: job, error } = await (supabase as any)
      .from('ai_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        job_type: job.task || job.input_payload?.job_type || 'study_plan',
        status: job.status,
        progress_stage: job.status === 'completed' ? 'Completed' : job.status === 'running' || job.status === 'processing' ? 'Generating high-yield assets...' : 'Queued',
        step_percentage: job.status === 'completed' ? 100 : job.status === 'running' || job.status === 'processing' ? 60 : 10,
        result: job.output_payload?.payload || job.output_payload,
        error_message: job.error,
        created_at: job.created_at,
        updated_at: job.completed_at || job.created_at,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
