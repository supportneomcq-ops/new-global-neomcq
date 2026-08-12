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
    const difficulty = searchParams.get('difficulty') || '';
    const question_type = searchParams.get('question_type') || '';
    const status = searchParams.get('status') || '';
    const ai_generated = searchParams.get('ai_generated');
    const reviewed = searchParams.get('reviewed');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = (supabase as any)
      .from('mcqs')
      .select(
        `
        id,
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
        source,
        ai_generated,
        ai_provider,
        ai_model,
        status,
        reviewed,
        reviewed_by,
        reviewed_at,
        review_notes,
        version,
        metadata,
        created_at,
        updated_at,
        exams(id, name, slug),
        exam_subjects(id, name),
        exam_topics(id, name)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (search) {
      if (search.startsWith('mcq-') || search.length === 36) {
        query = query.or(`id.eq.${search},question.ilike.%${search}%`);
      } else {
        query = query.ilike('question', `%${search}%`);
      }
    }

    if (exam_id && exam_id !== 'all') query = query.eq('exam_id', exam_id);
    if (subject_id && subject_id !== 'all') query = query.eq('subject_id', subject_id);
    if (topic_id && topic_id !== 'all') query = query.eq('topic_id', topic_id);
    if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty);
    if (question_type && question_type !== 'all') query = query.eq('question_type', question_type);
    if (status && status !== 'all') query = query.eq('status', status);
    if (ai_generated === 'true') query = query.eq('ai_generated', true);
    if (ai_generated === 'false') query = query.eq('ai_generated', false);
    if (reviewed === 'true') query = query.eq('reviewed', true);
    if (reviewed === 'false') query = query.eq('reviewed', false);

    query = query.range(offset, offset + limit - 1);

    const { data: mcqs, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Duplicate detection helper: find items with high similarity or identical question texts
    let duplicatePairs: any[] = [];
    if (mcqs && mcqs.length > 1) {
      for (let i = 0; i < mcqs.length; i++) {
        for (let j = i + 1; j < mcqs.length; j++) {
          const q1 = mcqs[i].question.toLowerCase().trim();
          const q2 = mcqs[j].question.toLowerCase().trim();
          if (q1 === q2 || (q1.length > 15 && q2.includes(q1.substring(0, 30)))) {
            duplicatePairs.push({
              mcq1: mcqs[i],
              mcq2: mcqs[j],
              similarity: q1 === q2 ? 100 : 88,
            });
          }
        }
      }
    }

    // Stats
    const { data: allStats } = await (supabase as any)
      .from('mcqs')
      .select('status, difficulty, ai_generated, reviewed');

    const total = allStats?.length || 0;
    const pendingReview = allStats?.filter((s: any) => s.status === 'pending_review').length || 0;
    const approved = allStats?.filter((s: any) => s.status === 'approved').length || 0;
    const draft = allStats?.filter((s: any) => s.status === 'draft').length || 0;
    const generating = allStats?.filter((s: any) => s.status === 'generating').length || 0;
    const rejected = allStats?.filter((s: any) => s.status === 'rejected').length || 0;
    const archived = allStats?.filter((s: any) => s.status === 'archived').length || 0;

    return NextResponse.json({
      success: true,
      mcqs: mcqs || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stats: {
        total,
        pendingReview,
        approved,
        draft,
        generating,
        rejected,
        archived,
      },
      duplicates: duplicatePairs,
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

    // Handle Bulk Operations
    if (action === 'bulk_update') {
      const { ids, target_status, target_topic_id, target_difficulty, rejection_reason } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'Array of MCQ IDs required' }, { status: 400 });
      }

      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (target_status) {
        updatePayload.status = target_status;
        if (target_status === 'approved') {
          updatePayload.reviewed = true;
          updatePayload.reviewed_by = auth.user?.id || null;
          updatePayload.reviewed_at = new Date().toISOString();
        }
        if (target_status === 'rejected' && rejection_reason) {
          updatePayload.review_notes = rejection_reason;
        }
      }
      if (target_topic_id) updatePayload.topic_id = target_topic_id;
      if (target_difficulty) updatePayload.difficulty = target_difficulty;

      const { data: updated, error } = await (supabase as any)
        .from('mcqs')
        .update(updatePayload)
        .in('id', ids)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Record Audit Log
      await (supabase as any).from('audit_logs').insert({
        user_id: auth.user?.id,
        action: 'MCQ_BULK_UPDATE',
        entity_type: 'mcq',
        details: { ids, target_status, target_topic_id, count: updated?.length || 0 },
      });

      return NextResponse.json({ success: true, count: updated?.length || 0, updated });
    }

    // Handle Create Single MCQ
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
      source,
      ai_generated,
      status,
    } = body;

    if (!question || !correct_answer || !exam_id) {
      return NextResponse.json(
        { error: 'Question text, correct answer, and exam ID are required.' },
        { status: 400 }
      );
    }

    const newMcq = {
      question: question.trim(),
      options: options || [
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B' },
        { id: 'c', text: 'Option C' },
        { id: 'd', text: 'Option D' },
      ],
      correct_answer,
      explanation: explanation || '',
      rationale: rationale || '',
      clinical_pearl: clinical_pearl || '',
      difficulty: difficulty || 'Intermediate',
      question_type: question_type || 'single_choice',
      exam_id,
      subject_id: subject_id || null,
      topic_id: topic_id || null,
      tags: Array.isArray(tags) ? tags : [],
      source: source || 'Manual Admin',
      ai_generated: !!ai_generated,
      status: status || 'pending_review',
      version: 1,
    };

    const { data: created, error } = await (supabase as any)
      .from('mcqs')
      .insert(newMcq)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit Log
    await (supabase as any).from('audit_logs').insert({
      user_id: auth.user?.id,
      action: 'MCQ_CREATED',
      entity_type: 'mcq',
      entity_id: created.id,
      details: { question: created.question, exam_id },
    });

    return NextResponse.json({ success: true, mcq: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
