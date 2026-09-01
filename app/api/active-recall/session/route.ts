import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      sessionId,
      userId,
      examId,
      subjectId,
      topicId,
      subtopicId,
      versionId,
      totalItems = 0,
      correctCount = 0,
      revealedCount = 0,
      reviewedCount = 0,
      status = 'completed',
    } = body;

    if (!sessionId || !userId || !topicId) {
      return NextResponse.json(
        { success: false, error: 'Missing required session parameters.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const accuracy = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 0;

    const { error } = await (supabase as any)
      .from('active_recall_sessions')
      .upsert(
        {
          id: sessionId,
          user_id: userId,
          exam_id: examId || null,
          subject_id: subjectId || null,
          topic_id: topicId,
          subtopic_id: subtopicId || null,
          version_id: versionId || null,
          total_items: totalItems,
          correct_count: correctCount,
          revealed_count: revealedCount,
          reviewed_count: reviewedCount,
          accuracy,
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('Notice saving active recall session:', error);
    }

    return NextResponse.json({
      success: true,
      accuracy,
    });
  } catch (error: any) {
    console.error('Error saving recall session:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
