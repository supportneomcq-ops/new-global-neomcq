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
    const sheet_type = searchParams.get('sheet_type') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = (supabase as any)
      .from('revision_sheets')
      .select(
        `
        *,
        exams(id, name, slug),
        exam_subjects(id, name),
        exam_topics(id, name)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (search) query = query.ilike('title', `%${search}%`);
    if (exam_id && exam_id !== 'all') query = query.eq('exam_id', exam_id);
    if (subject_id && subject_id !== 'all') query = query.eq('subject_id', subject_id);
    if (topic_id && topic_id !== 'all') query = query.eq('topic_id', topic_id);
    if (sheet_type && sheet_type !== 'all') query = query.eq('sheet_type', sheet_type);
    if (status && status !== 'all') query = query.eq('status', status);

    query = query.range(offset, offset + limit - 1);

    const { data: sheets, count, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: allStats } = await (supabase as any).from('revision_sheets').select('status');
    const total = allStats?.length || 0;
    const pendingReview = allStats?.filter((s: any) => s.status === 'pending_review').length || 0;
    const approved = allStats?.filter((s: any) => s.status === 'approved' || s.status === 'published').length || 0;

    return NextResponse.json({
      success: true,
      revision_sheets: sheets || [],
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
      const { ids, target_status, target_topic_id } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'Array of Revision Sheet IDs required' }, { status: 400 });
      }

      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (target_status) updatePayload.status = target_status;
      if (target_topic_id) updatePayload.topic_id = target_topic_id;

      const { data: updated, error } = await (supabase as any)
        .from('revision_sheets')
        .update(updatePayload)
        .in('id', ids)
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ success: true, count: updated?.length || 0 });
    }

    const { title, sheet_type, exam_id, subject_id, topic_id, content, status } = body;

    if (!title || !exam_id) {
      return NextResponse.json({ error: 'Title and exam ID required' }, { status: 400 });
    }

    const newSheet = {
      title: title.trim(),
      sheet_type: sheet_type || 'quick_revision',
      exam_id,
      subject_id: subject_id || null,
      topic_id: topic_id || null,
      content: content || { key_facts: [], mnemonics: [], summary: '' },
      status: status || 'pending_review',
      version: 1,
    };

    const { data: created, error } = await (supabase as any)
      .from('revision_sheets')
      .insert(newSheet)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, revision_sheet: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
