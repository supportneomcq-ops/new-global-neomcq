import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || '';
    const exam_id = searchParams.get('exam_id') || '';
    const subject_id = searchParams.get('subject_id') || '';
    const topic_id = searchParams.get('topic_id') || '';
    const deck_id = searchParams.get('deck_id') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = (supabase as any)
      .from('flashcards')
      .select(
        `
        *,
        flashcard_decks(id, title),
        exams(id, name, slug),
        exam_subjects(id, name),
        exam_topics(id, name)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`front.ilike.%${search}%,back.ilike.%${search}%`);
    }

    if (exam_id && exam_id !== 'all') query = query.eq('exam_id', exam_id);
    if (subject_id && subject_id !== 'all') query = query.eq('subject_id', subject_id);
    if (topic_id && topic_id !== 'all') query = query.eq('topic_id', topic_id);
    if (deck_id && deck_id !== 'all') query = query.eq('deck_id', deck_id);
    if (status && status !== 'all') query = query.eq('status', status);

    query = query.range(offset, offset + limit - 1);

    const { data: flashcards, count, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: allStats } = await (supabase as any).from('flashcards').select('status');
    const total = allStats?.length || 0;
    const pendingReview = allStats?.filter((s: any) => s.status === 'pending_review').length || 0;
    const approved = allStats?.filter((s: any) => s.status === 'approved').length || 0;

    return NextResponse.json({
      success: true,
      flashcards: flashcards || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stats: { total, pendingReview, approved },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const { action } = body;

    if (action === 'bulk_update') {
      const { ids, target_status, target_deck_id } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'Array of Flashcard IDs required' }, { status: 400 });
      }

      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (target_status) updatePayload.status = target_status;
      if (target_deck_id) updatePayload.deck_id = target_deck_id;

      const { data: updated, error } = await (supabase as any)
        .from('flashcards')
        .update(updatePayload)
        .in('id', ids)
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ success: true, count: updated?.length || 0 });
    }

    const {
      front,
      back,
      deck_id,
      exam_id,
      subject_id,
      topic_id,
      difficulty,
      ai_generated,
      status,
    } = body;

    if (!front || !back || !exam_id) {
      return NextResponse.json({ error: 'Front, back, and exam ID required' }, { status: 400 });
    }

    const newCard = {
      front: front.trim(),
      back: back.trim(),
      deck_id: deck_id || null,
      exam_id,
      subject_id: subject_id || null,
      topic_id: topic_id || null,
      difficulty: difficulty || 'Medium',
      ai_generated: !!ai_generated,
      status: status || 'approved',
      version: 1,
    };

    const { data: created, error } = await (supabase as any)
      .from('flashcards')
      .insert(newCard)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update deck card_count if deck_id provided
    if (deck_id) {
      const { data: deckCards } = await (supabase as any)
        .from('flashcards')
        .select('id')
        .eq('deck_id', deck_id);
      await (supabase as any)
        .from('flashcard_decks')
        .update({ card_count: deckCards?.length || 1 })
        .eq('id', deck_id);
    }

    return NextResponse.json({ success: true, flashcard: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
