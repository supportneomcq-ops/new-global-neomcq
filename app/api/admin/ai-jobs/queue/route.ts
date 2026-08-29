import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

// GET: Fetch queued/running jobs
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();

    const { data: jobs, error } = await adminClient
      .from('ai_jobs')
      .select('*')
      .in('status', ['queued', 'pending', 'processing', 'running'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formattedJobs = (jobs || []).map((j: any) => {
      const createdTime = new Date(j.created_at).getTime();
      const nowTime = Date.now();
      const waitingMins = Math.round((nowTime - createdTime) / 60000);

      return {
        ...j,
        job_type: j.task || j.input_payload?.job_type || 'AI Generation',
        canonical_status: (j.status === 'queued' || j.status === 'pending') ? 'QUEUED' : 'RUNNING',
        priority: j.priority ? String(j.priority) : (j.input_payload?.priority || 'Normal'),
        provider: j.provider || j.input_payload?.provider || 'Gemini',
        model: j.model || j.input_payload?.model || 'gemini-3.5-flash',
        exam_name: j.input_payload?.exam_name || 'General',
        subject_name: j.input_payload?.subject_name || 'General',
        topic_name: j.input_payload?.topic_name || 'General',
        asset_type: j.input_payload?.asset_type || j.task || 'MCQ',
        waiting_mins: waitingMins,
      };
    });

    return NextResponse.json({ success: true, queue: formattedJobs, total: formattedJobs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
