import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

// GET: Fetch failed jobs
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();

    const { data: jobs, error } = await adminClient
      .from('ai_jobs')
      .select('*')
      .eq('status', 'failed')
      .order('completed_at', { ascending: false });

    if (error) throw error;

    const formattedJobs = (jobs || []).map((j: any) => ({
      ...j,
      job_type: j.task || j.input_payload?.job_type || 'AI Generation',
      provider: j.provider || j.input_payload?.provider || 'Gemini',
      model: j.model || j.input_payload?.model || 'gemini-3.5-flash',
      exam_name: j.input_payload?.exam_name || 'General',
      subject_name: j.input_payload?.subject_name || 'General',
      topic_name: j.input_payload?.topic_name || 'General',
      asset_type: j.input_payload?.asset_type || j.task || 'MCQ',
      error_message: j.error || 'Job execution failed',
      attempts: j.attempts || 0,
      last_attempt: j.completed_at || j.created_at,
    }));

    return NextResponse.json({ success: true, failed_jobs: formattedJobs, total: formattedJobs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Batch retry or archive failed jobs
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;
    const user = auth.user!;
    const adminClient = getSupabaseAdmin();
    const body = await req.json();

    const { action, job_ids } = body;
    if (!Array.isArray(job_ids) || job_ids.length === 0) {
      return NextResponse.json({ error: 'job_ids array is required' }, { status: 400 });
    }

    if (action === 'retry_all') {
      const { error } = await adminClient
        .from('ai_jobs')
        .update({
          status: 'queued',
          error: null,
          attempts: 0,
        })
        .in('id', job_ids);

      if (error) throw error;

      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'AI_FAILED_JOBS_BATCH_RETRIED',
        entity_type: 'ai_jobs',
        details: { count: job_ids.length, job_ids },
      });

      return NextResponse.json({ success: true, message: `Retried ${job_ids.length} jobs` });
    }

    if (action === 'cancel_all') {
      const { error } = await adminClient
        .from('ai_jobs')
        .update({
          status: 'cancelled',
        })
        .in('id', job_ids);

      if (error) throw error;

      return NextResponse.json({ success: true, message: `Cancelled ${job_ids.length} jobs` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
