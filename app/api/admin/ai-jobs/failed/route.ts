import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

async function checkIsAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const adminClient = getSupabaseAdmin();
  const { data: userRoles } = await adminClient
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  const roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
  const userEmail = user.email?.toLowerCase().trim() || '';
  const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'support@neomcq.com').toLowerCase().trim();
  const isAdminEmail = userEmail === initialAdminEmail || userEmail === 'swapnilsonawane913@gmail.com';

  if (!isAdminEmail && !roleNames.includes('admin') && !roleNames.includes('super_admin') && !roleNames.includes('content_admin')) {
    throw new Error('Unauthorized: Admin access required');
  }
  return user;
}

// GET: Fetch failed jobs
export async function GET(req: NextRequest) {
  try {
    await checkIsAdmin();
    const adminClient = getSupabaseAdmin();

    const { data: jobs, error } = await adminClient
      .from('ai_generation_jobs')
      .select('*, profiles(email)')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const formattedJobs = (jobs || []).map((j: any) => ({
      ...j,
      provider: j.input_params?.provider || 'Gemini',
      model: j.input_params?.model || 'gemini-3.5-flash',
      exam_name: j.input_params?.exam_name || 'General',
      subject_name: j.input_params?.subject_name || 'General',
      topic_name: j.input_params?.topic_name || 'General',
      asset_type: j.input_params?.asset_type || j.job_type || 'MCQ',
      attempts: j.retry_count || 0,
      last_attempt: j.updated_at,
    }));

    return NextResponse.json({ success: true, failed_jobs: formattedJobs, total: formattedJobs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Batch retry or archive failed jobs
export async function POST(req: NextRequest) {
  try {
    const user = await checkIsAdmin();
    const adminClient = getSupabaseAdmin();
    const body = await req.json();

    const { action, job_ids } = body;
    if (!Array.isArray(job_ids) || job_ids.length === 0) {
      return NextResponse.json({ error: 'job_ids array is required' }, { status: 400 });
    }

    if (action === 'retry_all') {
      const { error } = await adminClient
        .from('ai_generation_jobs')
        .update({
          status: 'pending',
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', job_ids);

      if (error) throw error;

      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'AI_FAILED_JOBS_BATCH_RETRIED',
        entity_type: 'ai_generation_jobs',
        details: { count: job_ids.length, job_ids },
      });

      return NextResponse.json({ success: true, message: `Retried ${job_ids.length} jobs` });
    }

    if (action === 'cancel_all') {
      const { error } = await adminClient
        .from('ai_generation_jobs')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
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
