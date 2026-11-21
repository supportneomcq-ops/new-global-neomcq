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
    const { examId, subjectId, topicId, subtopicId, recallItemId, sessionId, versionId,
      userAnswer, isRevealed, responseTimeMs = 0 } = body ?? {};
    if (!topicId || !recallItemId || !sessionId || !versionId || typeof userAnswer !== 'string' ||
        userAnswer.length > 2000 || typeof isRevealed !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Missing or invalid attempt parameters.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: session, error: sessionError } = await (supabase as any)
      .from('active_recall_sessions')
      .select('id,user_id,topic_id,version_id,status,exam_id,subject_id,subtopic_id')
      .eq('id', sessionId).maybeSingle();
    if (sessionError) {
      console.error('Active recall session lookup failed:', sessionError);
      return NextResponse.json({ success: false, error: 'Unable to verify this session.' }, { status: 500 });
    }
    if (!session || session.user_id !== authData.user.id || session.topic_id !== topicId ||
        session.version_id !== versionId || session.status !== 'in_progress') {
      return NextResponse.json({ success: false, error: 'Active recall session not found.' }, { status: 404 });
    }

    const { data: version, error: versionError } = await (supabase as any).from('content_versions')
      .select('id,asset_id,asset_type,version,snapshot').eq('id', versionId).maybeSingle();
    if (versionError || !version || version.asset_id !== topicId || version.asset_type !== 'topic') {
      return NextResponse.json({ success: false, error: 'Recall content version is unavailable.' }, { status: 404 });
    }
    const recallItems = version.snapshot?.fill_in_the_blanks;
    const item = Array.isArray(recallItems) ? recallItems.find((entry: any, index: number) =>
      (typeof entry.id === 'string' ? entry.id : `fib_${version.version || 1}_${index}`) === recallItemId
    ) : null;
    if (!item || typeof item.blank !== 'string' || !item.blank.trim()) {
      return NextResponse.json({ success: false, error: 'Recall item not found in this set.' }, { status: 404 });
    }

    const acceptedAnswers = [item.blank, ...(Array.isArray(item.acceptedAnswers) ? item.acceptedAnswers : []),
      ...(Array.isArray(item.synonyms) ? item.synonyms : [])]
      .filter((answer: unknown): answer is string => typeof answer === 'string' && answer.trim().length > 0);
    const normalizedAnswer = userAnswer.trim().toLocaleLowerCase();
    const isCorrect = !isRevealed && normalizedAnswer.length > 0 &&
      acceptedAnswers.some((answer: string) => answer.trim().toLocaleLowerCase() === normalizedAnswer);
    const reviewDueAt = new Date(Date.now() + (isCorrect ? 3 : 1) * 86400000).toISOString();

    const { error: insertError } = await (supabase as any).from('active_recall_attempts').insert({
      user_id: authData.user.id, exam_id: session.exam_id || examId || null,
      subject_id: session.subject_id || subjectId || null, topic_id: topicId,
      subtopic_id: session.subtopic_id || subtopicId || null, recall_item_id: recallItemId,
      session_id: sessionId, user_answer: isRevealed ? '[REVEALED]' : userAnswer.trim(),
      correct_answer: item.blank, is_correct: isCorrect, is_revealed: isRevealed,
      response_time_ms: Math.max(0, Math.min(120000, Number(responseTimeMs) || 0)),
      review_due_at: reviewDueAt, attempted_at: new Date().toISOString(),
    });
    if (insertError) {
      console.error('Failed to persist active recall attempt:', insertError);
      return NextResponse.json({ success: false, error: 'Unable to save your attempt.' }, { status: 500 });
    }
    return NextResponse.json({
      success: true, isCorrect, isRevealed, reviewDueAt,
      feedback: { answer: item.blank, acceptedAnswers, explanation: item.explanation || '',
        highYieldPoint: item.highYieldPoint || item.takeaway || item.pearl || '',
        memoryHook: item.memoryHook || item.mnemonic || '', examTip: item.examTip || item.trap || '' },
    });
  } catch (error) {
    console.error('Error logging recall attempt:', error);
    return NextResponse.json({ success: false, error: 'Unable to save your attempt.' }, { status: 500 });
  }
}
