import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

// GET: Single job details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const adminClient = getSupabaseAdmin();

    const { data: job, error } = await adminClient
      .from('ai_jobs')
      .select('*')
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
        job_type: job.task || job.input_payload?.job_type || 'AI Generation',
        canonical_status: (job.status === 'queued' || job.status === 'pending') ? 'QUEUED' : (job.status === 'processing' || job.status === 'running') ? 'RUNNING' : (job.status || 'QUEUED').toUpperCase(),
        attempts: job.attempts || 0,
        provider: job.provider || job.input_payload?.provider || 'Gemini',
        model: job.model || job.input_payload?.model || 'gemini-3.5-flash',
        priority: job.priority ? String(job.priority) : (job.input_payload?.priority || 'Normal'),
        exam_name: job.input_payload?.exam_name || 'General',
        subject_name: job.input_payload?.subject_name || 'General',
        topic_name: job.input_payload?.topic_name || 'General',
        asset_type: job.input_payload?.asset_type || job.task || 'MCQ',
        prompt_version: job.input_payload?.prompt_version || '2026-v2',
        duration_ms: job.completed_at && job.created_at ? new Date(job.completed_at).getTime() - new Date(job.created_at).getTime() : null,
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
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;
    const user = auth.user!;
    const { id } = await params;
    const adminClient = getSupabaseAdmin();
    const body = await req.json();

    const { action, priority } = body;

    const { data: job } = await adminClient.from('ai_jobs').select('*').eq('id', id).single();
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (action === 'retry') {
      const currentAttempts = job.attempts || 0;
      if (currentAttempts >= 5 && !body.override) {
        return NextResponse.json({ error: 'Retry limit reached (5 attempts). Manual override required.' }, { status: 400 });
      }

      const updatedJob = await adminClient
        .from('ai_jobs')
        .update({
          status: 'queued',
          attempts: currentAttempts + 1,
          error: null,
        })
        .eq('id', id)
        .select('*')
        .single();

      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'AI_JOB_RETRIED',
        entity_type: 'ai_jobs',
        entity_id: id,
        details: { previous_attempts: currentAttempts, new_attempt: currentAttempts + 1 },
      });

      return NextResponse.json({ success: true, message: 'Job retry queued successfully', job: updatedJob.data });
    }

    if (action === 'cancel') {
      const updatedJob = await adminClient
        .from('ai_jobs')
        .update({
          status: 'cancelled',
        })
        .eq('id', id)
        .select('*')
        .single();

      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'AI_JOB_CANCELLED',
        entity_type: 'ai_jobs',
        entity_id: id,
        details: { cancelled_by: user.email },
      });

      return NextResponse.json({ success: true, message: 'Job cancelled successfully', job: updatedJob.data });
    }

    if (action === 'reprioritize' && priority) {
      const updatedPayload = { ...job.input_payload, priority };
      const updatedJob = await adminClient
        .from('ai_jobs')
        .update({
          priority: priority === 'High' ? 10 : priority === 'Low' ? 1 : 5,
          input_payload: updatedPayload,
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
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;
    const user = auth.user!;
    const { id } = await params;
    const adminClient = getSupabaseAdmin();

    const { error } = await adminClient.from('ai_jobs').delete().eq('id', id);
    if (error) throw error;

    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'AI_JOB_DELETED',
      entity_type: 'ai_jobs',
      entity_id: id,
      details: { deleted_by: user.email },
    });

    return NextResponse.json({ success: true, message: 'Job deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
