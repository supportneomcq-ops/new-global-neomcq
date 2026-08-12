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
    const subject_id = searchParams.get('subject_id') || '';
    const topic_id = searchParams.get('topic_id') || '';
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    let items: any[] = [];

    // Query MCQs
    if (asset_type === 'all' || asset_type === 'mcq') {
      let q = (supabase as any)
        .from('mcqs')
        .select(`id, question, difficulty, status, ai_generated, version, created_at, exams(id, name), exam_subjects(id, name), exam_topics(id, name)`);
      if (exam_id && exam_id !== 'all') q = q.eq('exam_id', exam_id);
      if (subject_id && subject_id !== 'all') q = q.eq('subject_id', subject_id);
      if (topic_id && topic_id !== 'all') q = q.eq('topic_id', topic_id);
      if (status && status !== 'all') q = q.eq('status', status);
      if (search) q = q.ilike('question', `%${search}%`);

      const { data: mcqs } = await q.limit(50);
      if (mcqs) {
        mcqs.forEach((m: any) => {
          items.push({
            id: m.id,
            title: m.question,
            asset_type: 'MCQ',
            type_badge: 'indigo',
            exam_name: m.exams?.name || 'N/A',
            subject_name: m.exam_subjects?.name || 'N/A',
            topic_name: m.exam_topics?.name || 'N/A',
            status: m.status,
            ai_generated: m.ai_generated,
            version: m.version,
            created_at: m.created_at,
            edit_url: `/admin/mcqs/${m.id}`,
          });
        });
      }
    }

    // Query Notes
    if (asset_type === 'all' || asset_type === 'note') {
      let q = (supabase as any)
        .from('notes')
        .select(`id, title, note_type, status, ai_generated, version, created_at, exams(id, name), exam_subjects(id, name), exam_topics(id, name)`);
      if (exam_id && exam_id !== 'all') q = q.eq('exam_id', exam_id);
      if (subject_id && subject_id !== 'all') q = q.eq('subject_id', subject_id);
      if (topic_id && topic_id !== 'all') q = q.eq('topic_id', topic_id);
      if (status && status !== 'all') q = q.eq('status', status);
      if (search) q = q.ilike('title', `%${search}%`);

      const { data: notes } = await q.limit(50);
      if (notes) {
        notes.forEach((n: any) => {
          items.push({
            id: n.id,
            title: n.title,
            asset_type: 'Note',
            type_badge: 'purple',
            exam_name: n.exams?.name || 'N/A',
            subject_name: n.exam_subjects?.name || 'N/A',
            topic_name: n.exam_topics?.name || 'N/A',
            status: n.status,
            ai_generated: n.ai_generated,
            version: n.version,
            created_at: n.created_at,
            edit_url: `/admin/notes/${n.id}`,
          });
        });
      }
    }

    // Query Flashcards
    if (asset_type === 'all' || asset_type === 'flashcard') {
      let q = (supabase as any)
        .from('flashcards')
        .select(`id, front, status, ai_generated, version, created_at, exams(id, name), exam_subjects(id, name), exam_topics(id, name)`);
      if (exam_id && exam_id !== 'all') q = q.eq('exam_id', exam_id);
      if (subject_id && subject_id !== 'all') q = q.eq('subject_id', subject_id);
      if (topic_id && topic_id !== 'all') q = q.eq('topic_id', topic_id);
      if (status && status !== 'all') q = q.eq('status', status);
      if (search) q = q.ilike('front', `%${search}%`);

      const { data: flashcards } = await q.limit(50);
      if (flashcards) {
        flashcards.forEach((f: any) => {
          items.push({
            id: f.id,
            title: f.front,
            asset_type: 'Flashcard',
            type_badge: 'emerald',
            exam_name: f.exams?.name || 'N/A',
            subject_name: f.exam_subjects?.name || 'N/A',
            topic_name: f.exam_topics?.name || 'N/A',
            status: f.status,
            ai_generated: f.ai_generated,
            version: f.version,
            created_at: f.created_at,
            edit_url: `/admin/flashcards/${f.id}`,
          });
        });
      }
    }

    // Query Revision Sheets
    if (asset_type === 'all' || asset_type === 'revision_sheet') {
      let q = (supabase as any)
        .from('revision_sheets')
        .select(`id, title, sheet_type, status, version, created_at, exams(id, name), exam_subjects(id, name), exam_topics(id, name)`);
      if (exam_id && exam_id !== 'all') q = q.eq('exam_id', exam_id);
      if (subject_id && subject_id !== 'all') q = q.eq('subject_id', subject_id);
      if (topic_id && topic_id !== 'all') q = q.eq('topic_id', topic_id);
      if (status && status !== 'all') q = q.eq('status', status);
      if (search) q = q.ilike('title', `%${search}%`);

      const { data: sheets } = await q.limit(50);
      if (sheets) {
        sheets.forEach((rs: any) => {
          items.push({
            id: rs.id,
            title: rs.title,
            asset_type: 'Revision Sheet',
            type_badge: 'amber',
            exam_name: rs.exams?.name || 'N/A',
            subject_name: rs.exam_subjects?.name || 'N/A',
            topic_name: rs.exam_topics?.name || 'N/A',
            status: rs.status,
            ai_generated: true,
            version: rs.version,
            created_at: rs.created_at,
            edit_url: `/admin/revision-sheets/${rs.id}`,
          });
        });
      }
    }

    // Sort items by created_at descending
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Get Counts
    const { data: mcqCount } = await (supabase as any).from('mcqs').select('id');
    const { data: noteCount } = await (supabase as any).from('notes').select('id');
    const { data: flashcardCount } = await (supabase as any).from('flashcards').select('id');
    const { data: sheetCount } = await (supabase as any).from('revision_sheets').select('id');
    const { data: tutorCount } = await (supabase as any).from('ai_tutor_lessons').select('id');

    return NextResponse.json({
      success: true,
      items,
      stats: {
        total: (mcqCount?.length || 0) + (noteCount?.length || 0) + (flashcardCount?.length || 0) + (sheetCount?.length || 0) + (tutorCount?.length || 0),
        mcqs: mcqCount?.length || 0,
        notes: noteCount?.length || 0,
        flashcards: flashcardCount?.length || 0,
        revisionSheets: sheetCount?.length || 0,
        aiTutorLessons: tutorCount?.length || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
