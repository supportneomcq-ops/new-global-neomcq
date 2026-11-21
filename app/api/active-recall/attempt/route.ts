import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const sessionClient = await createClient();
    const { data: authData, error: authError } = await sessionClient.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: 'Please sign in to save your progress.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      examId, subjectId, topicId, subtopicId, recallItemId, sessionId,
      userAnswer, isRevealed, responseTimeMs = 0,
    } = body ?? {};

    if (!topicId || !recallItemId || !sessionId || typeof userAnswer !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters for recording attempt.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Derive the answer key from the stored canonical content; never trust the browser's answer or score.
    const { data: versionRows, error: versionError } = await (supabase as any)
      .from('content_versions')
      .select('snapshot')
      .eq('asset_id', topicId)
      .eq('asset_type', 'topic')
      .order('version', { ascending: false })
      .limit(1);

    if (versionError) {
      console.error('Could not load canonical recall content:', versionError);
      return NextResponse.json({ success: false, error: 'Unable to verify this recall item.' }, { status: 500 });
    }

    const recallItems = versionRows?.[0]?.snapshot?.fill_in_the_blanks;
    const item = Array.isArray(recallItems) ? recallItems.find((entry: any) => entry.id === recallItemId) : null;
    if (!item) {
      return NextResponse.json({ success: false, error: 'Recall item not found in the current curriculum.' }, { status: 404 });
    }

    const acceptedAnswers = [
      item.blank,
      ...(Array.isArray(item.acceptedAnswers) ? item.acceptedAnswers : []),
      ...(Array.isArray(item.synonyms) ? item.synonyms : []),
    ].filter((answer: unknown): answer is string => typeof answer === 'string' && answer.trim().length > 0);
    const normalizedAnswer = userAnswer.trim().toLowerCase();
    const isCorrect = acceptedAnswers.some((answer: string) => answer.trim().toLowerCase() === normalizedAnswer);
    const reviewIntervalDays = isCorrect && !isRevealed ? 3 : 1;
    const reviewDueAt = new Date(Date.now() + reviewIntervalDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await (supabase as any)
      .from('active_recall_attempts')
      .insert({
        user_id: authData.user.id,
        exam_id: examId || null,
        subject_id: subjectId || null,
        topic_id: topicId,
        subtopic_id: subtopicId || null,
        recall_item_id: recallItemId,
        session_id: sessionId,
        user_answer: isRevealed ? '[REVEALED]' : userAnswer.trim(),
        correct_answer: item.blank,
        is_correct: isCorrect,
        is_revealed: Boolean(isRevealed),
        response_time_ms: Math.max(0, Math.min(120000, Number(responseTimeMs) || 0)),
        review_due_at: reviewDueAt,
        attempted_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to persist active recall attempt:', insertError);
      return NextResponse.json({ success: false, error: 'Unable to save your attempt.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, isCorrect, reviewDueAt });
  } catch (error) {
    console.error('Error logging recall attempt:', error);
    return NextResponse.json({ success: false, error: 'Unable to save your attempt.' }, { status: 500 });
  }
}
