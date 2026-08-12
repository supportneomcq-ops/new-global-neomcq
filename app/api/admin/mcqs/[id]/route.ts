import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: mcq, error } = await (supabase as any)
      .from('mcqs')
      .select(
        `
        *,
        exams(id, name, slug),
        exam_subjects(id, name),
        exam_topics(id, name)
      `
      )
      .eq('id', id)
      .single();

    if (error || !mcq) {
      return NextResponse.json({ error: 'MCQ not found' }, { status: 404 });
    }

    // Get Version History
    const { data: versions } = await (supabase as any)
      .from('content_versions')
      .select('*')
      .eq('asset_id', id)
      .eq('asset_type', 'mcq')
      .order('version', { ascending: false });

    return NextResponse.json({ success: true, mcq, versions: versions || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    // 1. Fetch current version for snapshot
    const { data: currentMcq } = await (supabase as any)
      .from('mcqs')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentMcq) {
      return NextResponse.json({ error: 'MCQ not found' }, { status: 404 });
    }

    // 2. Save snapshot of current version into content_versions
    const nextVersion = (currentMcq.version || 1) + 1;
    await (supabase as any).from('content_versions').insert({
      asset_id: id,
      asset_type: 'mcq',
      version: currentMcq.version || 1,
      snapshot: currentMcq,
      created_by: auth.user?.id || null,
      change_summary: body.change_summary || 'MCQ details updated by admin',
    });

    // 3. Prepare update fields
    const {
      question,
      options,
      correct_answer,
      explanation,
      rationale,
      clinical_pearl,
      difficulty,
      question_type,
      exam_id,
      subject_id,
      topic_id,
      tags,
      status,
      reviewed,
      review_notes,
    } = body;

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
      version: nextVersion,
    };

    if (question !== undefined) updatePayload.question = question;
    if (options !== undefined) updatePayload.options = options;
    if (correct_answer !== undefined) updatePayload.correct_answer = correct_answer;
    if (explanation !== undefined) updatePayload.explanation = explanation;
    if (rationale !== undefined) updatePayload.rationale = rationale;
    if (clinical_pearl !== undefined) updatePayload.clinical_pearl = clinical_pearl;
    if (difficulty !== undefined) updatePayload.difficulty = difficulty;
    if (question_type !== undefined) updatePayload.question_type = question_type;
    if (exam_id !== undefined) updatePayload.exam_id = exam_id;
    if (subject_id !== undefined) updatePayload.subject_id = subject_id || null;
    if (topic_id !== undefined) updatePayload.topic_id = topic_id || null;
    if (tags !== undefined) updatePayload.tags = tags;
    if (status !== undefined) {
      updatePayload.status = status;
      if (status === 'approved') {
        updatePayload.reviewed = true;
        updatePayload.reviewed_by = auth.user?.id || null;
        updatePayload.reviewed_at = new Date().toISOString();
      }
    }
    if (reviewed !== undefined) updatePayload.reviewed = reviewed;
    if (review_notes !== undefined) updatePayload.review_notes = review_notes;

    const { data: updated, error } = await (supabase as any)
      .from('mcqs')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. Record Audit Log
    await (supabase as any).from('audit_logs').insert({
      user_id: auth.user?.id,
      action: 'MCQ_UPDATED',
      entity_type: 'mcq',
      entity_id: id,
      details: { version: nextVersion, status: updated.status, question: updated.question },
    });

    return NextResponse.json({ success: true, mcq: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await (supabase as any)
      .from('mcqs')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await (supabase as any).from('audit_logs').insert({
      user_id: auth.user?.id,
      action: 'MCQ_ARCHIVED',
      entity_type: 'mcq',
      entity_id: id,
    });

    return NextResponse.json({ success: true, message: 'MCQ archived successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
