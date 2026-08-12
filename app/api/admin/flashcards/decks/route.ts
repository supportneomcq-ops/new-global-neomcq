import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const exam_id = searchParams.get('exam_id') || '';
    const search = searchParams.get('search') || '';

    let query = (supabase as any)
      .from('flashcard_decks')
      .select(`
        *,
        exams(id, name),
        exam_subjects(id, name),
        exam_topics(id, name)
      `)
      .order('created_at', { ascending: false });

    if (exam_id && exam_id !== 'all') query = query.eq('exam_id', exam_id);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data: decks, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, decks: decks || [] });
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

    const { title, description, exam_id, subject_id, topic_id } = body;

    if (!title || !exam_id) {
      return NextResponse.json({ error: 'Title and exam ID required' }, { status: 400 });
    }

    const { data: deck, error } = await (supabase as any)
      .from('flashcard_decks')
      .insert({
        title: title.trim(),
        description: description || '',
        exam_id,
        subject_id: subject_id || null,
        topic_id: topic_id || null,
        card_count: 0,
        status: 'approved',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, deck });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
