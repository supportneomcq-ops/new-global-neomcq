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

    const { data: note, error } = await (supabase as any)
      .from('notes')
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

    if (error || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const { data: versions } = await (supabase as any)
      .from('content_versions')
      .select('*')
      .eq('asset_id', id)
      .eq('asset_type', 'note')
      .order('version', { ascending: false });

    return NextResponse.json({ success: true, note, versions: versions || [] });
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

    const { data: currentNote } = await (supabase as any)
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentNote) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

    const nextVersion = (currentNote.version || 1) + 1;
    await (supabase as any).from('content_versions').insert({
      asset_id: id,
      asset_type: 'note',
      version: currentNote.version || 1,
      snapshot: currentNote,
      created_by: auth.user?.id || null,
      change_summary: body.change_summary || 'Note details updated by admin',
    });

    const {
      title,
      content,
      note_type,
      exam_id,
      subject_id,
      topic_id,
      author_source,
      handwritten_style,
      status,
    } = body;

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
      version: nextVersion,
    };

    if (title !== undefined) updatePayload.title = title;
    if (content !== undefined) updatePayload.content = content;
    if (note_type !== undefined) updatePayload.note_type = note_type;
    if (exam_id !== undefined) updatePayload.exam_id = exam_id;
    if (subject_id !== undefined) updatePayload.subject_id = subject_id || null;
    if (topic_id !== undefined) updatePayload.topic_id = topic_id || null;
    if (author_source !== undefined) updatePayload.author_source = author_source;
    if (handwritten_style !== undefined) updatePayload.handwritten_style = handwritten_style;
    if (status !== undefined) updatePayload.status = status;

    const { data: updated, error } = await (supabase as any)
      .from('notes')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await (supabase as any).from('audit_logs').insert({
      user_id: auth.user?.id,
      action: 'NOTE_UPDATED',
      entity_type: 'note',
      entity_id: id,
      details: { version: nextVersion, title: updated.title },
    });

    return NextResponse.json({ success: true, note: updated });
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
      .from('notes')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: 'Note archived successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
