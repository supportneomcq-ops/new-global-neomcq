import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      userId,
      examId,
      subjectId,
      topicId,
      subtopicId,
      recallItemId,
      sessionId,
      userAnswer,
      correctAnswer,
      isCorrect,
      isRevealed,
      responseTimeMs = 0,
    } = body;

    if (!userId || !topicId || !recallItemId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters for recording attempt.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Calculate Spaced Repetition Due Date
    // If correct: review in 3 days; if incorrect or revealed: review in 1 day
    const reviewIntervalDays = isCorrect && !isRevealed ? 3 : 1;
    const reviewDueAt = new Date(Date.now() + reviewIntervalDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await (supabase as any)
      .from('active_recall_attempts')
      .insert({
        user_id: userId,
        exam_id: examId || null,
        subject_id: subjectId || null,
        topic_id: topicId,
        subtopic_id: subtopicId || null,
        recall_item_id: recallItemId,
        session_id: sessionId,
        user_answer: userAnswer || (isRevealed ? '[REVEALED]' : ''),
        correct_answer: correctAnswer,
        is_correct: !!isCorrect,
        is_revealed: !!isRevealed,
        response_time_ms: responseTimeMs,
        review_due_at: reviewDueAt,
        attempted_at: new Date().toISOString(),
      });

    if (insertErr) {
      console.warn('Notice inserting recall attempt:', insertErr);
    }

    return NextResponse.json({
      success: true,
      reviewDueAt,
    });
  } catch (error: any) {
    console.error('Error logging recall attempt:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
