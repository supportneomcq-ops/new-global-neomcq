import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const asset_type = searchParams.get('asset_type') || 'all';
    const exam_id = searchParams.get('exam_id') || '';
    const search = searchParams.get('search') || '';

    let queue: any[] = [];

    // Pending MCQs
    if (asset_type === 'all' || asset_type === 'mcq') {
      let q = (supabase as any)
        .from('mcqs')
        .select(`*, exams(id, name), exam_subjects(id, name), exam_topics(id, name)`)
        .eq('status', 'pending_review');
      if (exam_id && exam_id !== 'all') q = q.eq('exam_id', exam_id);
      if (search) q = q.ilike('question', `%${search}%`);

      const { data: mcqs } = await q;
      if (mcqs) {
        mcqs.forEach((m: any) => {
          queue.push({
            id: m.id,
            title: m.question,
            asset_type: 'mcq',
            asset_label: 'MCQ',
            exam_name: m.exams?.name || 'N/A',
            subject_name: m.exam_subjects?.name || 'N/A',
            topic_name: m.exam_topics?.name || 'N/A',
            ai_generated: m.ai_generated,
            created_at: m.created_at,
            edit_url: `/admin/mcqs/${m.id}`,
            details: m,
          });
        });
      }
    }

    // Pending Notes
    if (asset_type === 'all' || asset_type === 'note') {
      let q = (supabase as any)
        .from('notes')
        .select(`*, exams(id, name), exam_subjects(id, name), exam_topics(id, name)`)
        .eq('status', 'pending_review');
      if (exam_id && exam_id !== 'all') q = q.eq('exam_id', exam_id);
      if (search) q = q.ilike('title', `%${search}%`);

      const { data: notes } = await q;
      if (notes) {
        notes.forEach((n: any) => {
          queue.push({
            id: n.id,
            title: n.title,
            asset_type: 'note',
            asset_label: 'Note',
            exam_name: n.exams?.name || 'N/A',
            subject_name: n.exam_subjects?.name || 'N/A',
            topic_name: n.exam_topics?.name || 'N/A',
            ai_generated: n.ai_generated,
            created_at: n.created_at,
            edit_url: `/admin/notes/${n.id}`,
            details: n,
          });
        });
      }
    }

    // Pending Flashcards
    if (asset_type === 'all' || asset_type === 'flashcard') {
      let q = (supabase as any)
        .from('flashcards')
        .select(`*, exams(id, name), exam_subjects(id, name), exam_topics(id, name)`)
        .eq('status', 'pending_review');
      if (exam_id && exam_id !== 'all') q = q.eq('exam_id', exam_id);
      if (search) q = q.ilike('front', `%${search}%`);

      const { data: cards } = await q;
      if (cards) {
        cards.forEach((c: any) => {
          queue.push({
            id: c.id,
            title: c.front,
            asset_type: 'flashcard',
            asset_label: 'Flashcard',
            exam_name: c.exams?.name || 'N/A',
            subject_name: c.exam_subjects?.name || 'N/A',
            topic_name: c.exam_topics?.name || 'N/A',
            ai_generated: c.ai_generated,
            created_at: c.created_at,
            edit_url: `/admin/flashcards/${c.id}`,
            details: c,
          });
        });
      }
    }

    // Pending Revision Sheets
    if (asset_type === 'all' || asset_type === 'revision_sheet') {
      let q = (supabase as any)
        .from('revision_sheets')
        .select(`*, exams(id, name), exam_subjects(id, name), exam_topics(id, name)`)
        .eq('status', 'pending_review');
      if (exam_id && exam_id !== 'all') q = q.eq('exam_id', exam_id);
      if (search) q = q.ilike('title', `%${search}%`);

      const { data: sheets } = await q;
      if (sheets) {
        sheets.forEach((s: any) => {
          queue.push({
            id: s.id,
            title: s.title,
            asset_type: 'revision_sheet',
            asset_label: 'Revision Sheet',
            exam_name: s.exams?.name || 'N/A',
            subject_name: s.exam_subjects?.name || 'N/A',
            topic_name: s.exam_topics?.name || 'N/A',
            ai_generated: true,
            created_at: s.created_at,
            edit_url: `/admin/revision-sheets/${s.id}`,
            details: s,
          });
        });
      }
    }

    // Pending AI Tutor Lessons
    if (asset_type === 'all' || asset_type === 'ai_tutor_lesson') {
      let q = (supabase as any)
        .from('ai_tutor_lessons')
        .select(`*, exams(id, name), exam_subjects(id, name), exam_topics(id, name)`)
        .eq('status', 'pending_review');
      if (exam_id && exam_id !== 'all') q = q.eq('exam_id', exam_id);
      if (search) q = q.ilike('title', `%${search}%`);

      const { data: lessons } = await q;
      if (lessons) {
        lessons.forEach((l: any) => {
          queue.push({
            id: l.id,
            title: l.title,
            asset_type: 'ai_tutor_lesson',
            asset_label: 'AI Tutor Lesson',
            exam_name: l.exams?.name || 'N/A',
            subject_name: l.exam_subjects?.name || 'N/A',
            topic_name: l.exam_topics?.name || 'N/A',
            ai_generated: true,
            created_at: l.created_at,
            edit_url: `/admin/ai-tutor/${l.id}`,
            details: l,
          });
        });
      }
    }

    queue.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      pending_items: queue,
      count: queue.length,
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

    const { items, action, review_notes } = body;
    // items: Array of { id: string, asset_type: string }
    // action: 'approve' | 'reject' | 'request_revision'

    if (!Array.isArray(items) || items.length === 0 || !action) {
      return NextResponse.json({ error: 'Items array and action required' }, { status: 400 });
    }

    const targetStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'draft';

    let processedCount = 0;

    for (const item of items) {
      const tableMap: Record<string, string> = {
        mcq: 'mcqs',
        note: 'notes',
        flashcard: 'flashcards',
        revision_sheet: 'revision_sheets',
        ai_tutor_lesson: 'ai_tutor_lessons',
      };

      const table = tableMap[item.asset_type];
      if (!table) continue;

      const updateData: any = {
        status: targetStatus,
        reviewed: true,
        reviewed_by: auth.user?.id || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (review_notes) updateData.review_notes = review_notes;

      const { error } = await (supabase as any)
        .from(table)
        .update(updateData)
        .eq('id', item.id);

      if (!error) {
        processedCount++;
        // Audit log
        await (supabase as any).from('audit_logs').insert({
          user_id: auth.user?.id,
          action: `CONTENT_${action.toUpperCase()}`,
          entity_type: item.asset_type,
          entity_id: item.id,
          details: { action, targetStatus, review_notes },
        });
      }
    }

    return NextResponse.json({ success: true, processedCount, targetStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
