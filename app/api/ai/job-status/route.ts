import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Please sign in to check your AI job.' }, { status: 401 })
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Use the service client only after authenticating, and always scope the read to this user.
    const admin = getSupabaseAdmin()
    const { data: job, error } = await (admin as any)
      .from('ai_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .maybeSingle()

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
    console.error('[AI Job Status] Failed to load job status:', error)
    return NextResponse.json({ error: 'Could not load AI job status. Please retry.' }, { status: 500 })
  }
}
