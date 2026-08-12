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

// GET: Single job details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await checkIsAdmin();
    const { id } = await params;
    const adminClient = getSupabaseAdmin();

    const { data: job, error } = await adminClient
      .from('ai_generation_jobs')
      .select('*, profiles(email, first_name, last_name)')
      .eq('id', id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Fetch related audit logs for retry/execution history
    const { data: logs } = await adminClient
      .from('audit_logs')
      .select('*')
      .eq('entity_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      job: {
        ...job,
        canonical_status: job.status === 'pending' ? 'QUEUED' : job.status === 'processing' ? 'RUNNING' : job.status.toUpperCase(),
        attempts: job.retry_count || 0,
        provider: job.input_params?.provider || 'Gemini',
        model: job.input_params?.model || 'gemini-3.5-flash',
        priority: job.input_params?.priority || 'Normal',
        exam_name: job.input_params?.exam_name || 'General',
        subject_name: job.input_params?.subject_name || 'General',
        topic_name: job.input_params?.topic_name || 'General',
        asset_type: job.input_params?.asset_type || job.job_type || 'MCQ',
        prompt_version: job.input_params?.prompt_version || '2026-v2',
        duration_ms: job.updated_at && job.created_at ? new Date(job.updated_at).getTime() - new Date(job.created_at).getTime() : null,
        logs: logs || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// PUT / PATCH: Job action (Retry, Cancel, Reprioritize)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await checkIsAdmin();
    const { id } = await params;
    const adminClient = getSupabaseAdmin();
    const body = await req.json();

    const { action, priority } = body;

    const { data: job } = await adminClient.from('ai_generation_jobs').select('*').eq('id', id).single();
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (action === 'retry') {
      const currentAttempts = job.retry_count || 0;
      if (currentAttempts >= 5 && !body.override) {
        return NextResponse.json({ error: 'Retry limit reached (5 attempts). Manual override required.' }, { status: 400 });
      }

      const updatedJob = await adminClient
        .from('ai_generation_jobs')
        .update({
          status: 'pending',
          retry_count: currentAttempts + 1,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'AI_JOB_RETRIED',
        entity_type: 'ai_generation_jobs',
        entity_id: id,
        details: { previous_attempts: currentAttempts, new_attempt: currentAttempts + 1 },
      });

      return NextResponse.json({ success: true, message: 'Job retry queued successfully', job: updatedJob.data });
    }

    if (action === 'cancel') {
      const updatedJob = await adminClient
        .from('ai_generation_jobs')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'AI_JOB_CANCELLED',
        entity_type: 'ai_generation_jobs',
        entity_id: id,
        details: { cancelled_by: user.email },
      });

      return NextResponse.json({ success: true, message: 'Job cancelled successfully', job: updatedJob.data });
    }

    if (action === 'reprioritize' && priority) {
      const updatedParams = { ...job.input_params, priority };
      const updatedJob = await adminClient
        .from('ai_generation_jobs')
        .update({
          input_params: updatedParams,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      return NextResponse.json({ success: true, message: `Job priority updated to ${priority}`, job: updatedJob.data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE: Delete job
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await checkIsAdmin();
    const { id } = await params;
    const adminClient = getSupabaseAdmin();

    const { error } = await adminClient.from('ai_generation_jobs').delete().eq('id', id);
    if (error) throw error;

    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'AI_JOB_DELETED',
      entity_type: 'ai_generation_jobs',
      entity_id: id,
      details: { deleted_by: user.email },
    });

    return NextResponse.json({ success: true, message: 'Job deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
