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

// GET: Fetch queued/running jobs
export async function GET(req: NextRequest) {
  try {
    await checkIsAdmin();
    const adminClient = getSupabaseAdmin();

    const { data: jobs, error } = await adminClient
      .from('ai_generation_jobs')
      .select('*, profiles(email)')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formattedJobs = (jobs || []).map((j: any) => {
      const createdTime = new Date(j.created_at).getTime();
      const nowTime = Date.now();
      const waitingMins = Math.round((nowTime - createdTime) / 60000);

      return {
        ...j,
        canonical_status: j.status === 'pending' ? 'QUEUED' : 'RUNNING',
        priority: j.input_params?.priority || 'Normal',
        provider: j.input_params?.provider || 'Gemini',
        model: j.input_params?.model || 'gemini-3.5-flash',
        exam_name: j.input_params?.exam_name || 'General',
        subject_name: j.input_params?.subject_name || 'General',
        topic_name: j.input_params?.topic_name || 'General',
        asset_type: j.input_params?.asset_type || j.job_type || 'MCQ',
        waiting_mins: waitingMins,
      };
    });

    return NextResponse.json({ success: true, queue: formattedJobs, total: formattedJobs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
