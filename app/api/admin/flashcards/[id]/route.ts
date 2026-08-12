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

    const { data: flashcard, error } = await (supabase as any)
      .from('flashcards')
      .select(
        `
        *,
        flashcard_decks(id, title),
        exams(id, name, slug),
        exam_subjects(id, name),
        exam_topics(id, name)
      `
      )
      .eq('id', id)
      .single();

    if (error || !flashcard) {
      return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });
    }

    const { data: versions } = await (supabase as any)
      .from('content_versions')
      .select('*')
      .eq('asset_id', id)
      .eq('asset_type', 'flashcard')
      .order('version', { ascending: false });

    return NextResponse.json({ success: true, flashcard, versions: versions || [] });
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

    const { data: currentCard } = await (supabase as any)
      .from('flashcards')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentCard) return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });

    const nextVersion = (currentCard.version || 1) + 1;
    await (supabase as any).from('content_versions').insert({
      asset_id: id,
      asset_type: 'flashcard',
      version: currentCard.version || 1,
      snapshot: currentCard,
      created_by: auth.user?.id || null,
      change_summary: body.change_summary || 'Flashcard details updated by admin',
    });

    const { front, back, deck_id, exam_id, subject_id, topic_id, difficulty, status } = body;

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
      version: nextVersion,
    };

    if (front !== undefined) updatePayload.front = front;
    if (back !== undefined) updatePayload.back = back;
    if (deck_id !== undefined) updatePayload.deck_id = deck_id || null;
    if (exam_id !== undefined) updatePayload.exam_id = exam_id;
    if (subject_id !== undefined) updatePayload.subject_id = subject_id || null;
    if (topic_id !== undefined) updatePayload.topic_id = topic_id || null;
    if (difficulty !== undefined) updatePayload.difficulty = difficulty;
    if (status !== undefined) updatePayload.status = status;

    const { data: updated, error } = await (supabase as any)
      .from('flashcards')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, flashcard: updated });
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
      .from('flashcards')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: 'Flashcard archived successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
