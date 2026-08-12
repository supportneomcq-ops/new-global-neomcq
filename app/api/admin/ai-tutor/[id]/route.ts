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

    const { data: lesson, error } = await (supabase as any)
      .from('ai_tutor_lessons')
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

    if (error || !lesson) {
      return NextResponse.json({ error: 'AI Tutor lesson not found' }, { status: 404 });
    }

    const { data: versions } = await (supabase as any)
      .from('content_versions')
      .select('*')
      .eq('asset_id', id)
      .eq('asset_type', 'ai_tutor_lesson')
      .order('version', { ascending: false });

    return NextResponse.json({ success: true, ai_tutor_lesson: lesson, versions: versions || [] });
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

    const { data: currentLesson } = await (supabase as any)
      .from('ai_tutor_lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentLesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

    const nextVersion = (currentLesson.version || 1) + 1;
    await (supabase as any).from('content_versions').insert({
      asset_id: id,
      asset_type: 'ai_tutor_lesson',
      version: currentLesson.version || 1,
      snapshot: currentLesson,
      created_by: auth.user?.id || null,
      change_summary: body.change_summary || 'AI Tutor lesson updated by admin',
    });

    const { title, exam_id, subject_id, topic_id, difficulty, content, status } = body;

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
      version: nextVersion,
    };

    if (title !== undefined) updatePayload.title = title;
    if (exam_id !== undefined) updatePayload.exam_id = exam_id;
    if (subject_id !== undefined) updatePayload.subject_id = subject_id || null;
    if (topic_id !== undefined) updatePayload.topic_id = topic_id || null;
    if (difficulty !== undefined) updatePayload.difficulty = difficulty;
    if (content !== undefined) updatePayload.content = content;
    if (status !== undefined) updatePayload.status = status;

    const { data: updated, error } = await (supabase as any)
      .from('ai_tutor_lessons')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, ai_tutor_lesson: updated });
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
      .from('ai_tutor_lessons')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: 'AI Tutor lesson archived successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
