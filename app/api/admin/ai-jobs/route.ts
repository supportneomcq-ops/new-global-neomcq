import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

// GET: List AI jobs with status, search, and pagination
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status') || 'all';
    const jobType = searchParams.get('job_type') || 'all';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('ai_jobs')
      .select('*', { count: 'exact' });

    if (status !== 'all') {
      if (status === 'queued') query = query.in('status', ['queued', 'pending']);
      else if (status === 'running') query = query.in('status', ['running', 'processing']);
      else query = query.eq('status', status);
    }

    if (jobType !== 'all') {
      query = query.or(`task.ilike.%${jobType}%,input_payload->>asset_type.eq.${jobType}`);
    }

    if (search) {
      query = query.or(`task.ilike.%${search}%,error.ilike.%${search}%,id.eq.${search}`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: jobs, count, error } = await query;
    if (error) throw error;

    // Fetch stats
    const { count: totalJobs } = await adminClient.from('ai_jobs').select('*', { count: 'exact', head: true });
    const { count: queuedJobs } = await adminClient.from('ai_jobs').select('*', { count: 'exact', head: true }).in('status', ['queued', 'pending']);
    const { count: runningJobs } = await adminClient.from('ai_jobs').select('*', { count: 'exact', head: true }).in('status', ['running', 'processing']);
    const { count: completedJobs } = await adminClient.from('ai_jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed');
    const { count: failedJobs } = await adminClient.from('ai_jobs').select('*', { count: 'exact', head: true }).eq('status', 'failed');

    return NextResponse.json({
      success: true,
      jobs: (jobs || []).map((j: any) => ({
        ...j,
        job_type: j.task || j.input_payload?.job_type || 'AI Generation',
        canonical_status: (j.status === 'queued' || j.status === 'pending') ? 'QUEUED' : (j.status === 'processing' || j.status === 'running') ? 'RUNNING' : (j.status || 'QUEUED').toUpperCase(),
        attempts: j.attempts || 0,
        provider: j.provider || j.input_payload?.provider || 'Gemini',
        model: j.model || j.input_payload?.model || 'gemini-3.5-flash',
        priority: j.priority ? String(j.priority) : (j.input_payload?.priority || 'Normal'),
        exam_name: j.input_payload?.exam_name || 'General',
        subject_name: j.input_payload?.subject_name || 'General',
        topic_name: j.input_payload?.topic_name || 'General',
        asset_type: j.input_payload?.asset_type || j.task || 'MCQ',
      })),
      total: count || 0,
      page,
      limit,
      stats: {
        total: totalJobs || 0,
        queued: queuedJobs || 0,
        running: runningJobs || 0,
        completed: completedJobs || 0,
        failed: failedJobs || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch AI jobs' }, { status: 500 });
  }
}

// POST: Trigger/Create a new AI generation job
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;
    const user = auth.user!;
    const adminClient = getSupabaseAdmin();
    const body = await req.json();

    const { job_type, asset_type, exam_id, subject_id, topic_id, provider = 'gemini', model = 'gemini-3.5-flash', batch_size = 20, priority = 'Normal' } = body;

    if (!job_type) {
      return NextResponse.json({ error: 'job_type is required' }, { status: 400 });
    }

    // Resolve Canonical Exam, Subject, Topic names if IDs provided
    let exam_name = 'General';
    let subject_name = 'General';
    let topic_name = 'General';

    if (exam_id) {
      const { data: ex } = await adminClient.from('exams').select('name').eq('id', exam_id).single();
      if (ex) exam_name = ex.name;
    }
    if (subject_id) {
      const { data: sb } = await adminClient.from('exam_subjects').select('name').eq('id', subject_id).single();
      if (sb) subject_name = sb.name;
    }
    if (topic_id) {
      const { data: tp } = await adminClient.from('exam_topics').select('name').eq('id', topic_id).single();
      if (tp) topic_name = tp.name;
    }

    // Create Job Entry
    const input_payload = {
      asset_type: asset_type || 'mcq',
      exam_id,
      exam_name,
      subject_id,
      subject_name,
      topic_id,
      topic_name,
      provider,
      model,
      batch_size,
      priority,
      initiated_by: user.email,
    };

    const { data: job, error } = await adminClient
      .from('ai_jobs')
      .insert({
        user_id: user.id,
        exam_id: exam_id || null,
        subject_id: subject_id || null,
        topic_id: topic_id || null,
        task: job_type,
        status: 'queued',
        provider: provider || 'gemini',
        model: model || 'gemini-3.5-flash',
        priority: priority === 'High' ? 10 : priority === 'Low' ? 1 : 5,
        input_payload,
        attempts: 0,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Record Audit Log
    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'AI_JOB_CREATED',
      entity_type: 'ai_jobs',
      entity_id: job.id,
      details: { job_type, asset_type, exam_name, topic_name, provider, model },
    });

    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create AI job' }, { status: 500 });
  }
}
