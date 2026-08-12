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

    const { data: sheet, error } = await (supabase as any)
      .from('revision_sheets')
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

    if (error || !sheet) {
      return NextResponse.json({ error: 'Revision sheet not found' }, { status: 404 });
    }

    const { data: versions } = await (supabase as any)
      .from('content_versions')
      .select('*')
      .eq('asset_id', id)
      .eq('asset_type', 'revision_sheet')
      .order('version', { ascending: false });

    return NextResponse.json({ success: true, revision_sheet: sheet, versions: versions || [] });
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

    const { data: currentSheet } = await (supabase as any)
      .from('revision_sheets')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentSheet) return NextResponse.json({ error: 'Revision sheet not found' }, { status: 404 });

    const nextVersion = (currentSheet.version || 1) + 1;
    await (supabase as any).from('content_versions').insert({
      asset_id: id,
      asset_type: 'revision_sheet',
      version: currentSheet.version || 1,
      snapshot: currentSheet,
      created_by: auth.user?.id || null,
      change_summary: body.change_summary || 'Revision sheet updated by admin',
    });

    const { title, sheet_type, exam_id, subject_id, topic_id, content, status } = body;

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
      version: nextVersion,
    };

    if (title !== undefined) updatePayload.title = title;
    if (sheet_type !== undefined) updatePayload.sheet_type = sheet_type;
    if (exam_id !== undefined) updatePayload.exam_id = exam_id;
    if (subject_id !== undefined) updatePayload.subject_id = subject_id || null;
    if (topic_id !== undefined) updatePayload.topic_id = topic_id || null;
    if (content !== undefined) updatePayload.content = content;
    if (status !== undefined) updatePayload.status = status;

    const { data: updated, error } = await (supabase as any)
      .from('revision_sheets')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, revision_sheet: updated });
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
      .from('revision_sheets')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: 'Revision sheet archived successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
