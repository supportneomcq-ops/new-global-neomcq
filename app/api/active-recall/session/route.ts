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
    const { sessionId, examId, subjectId, topicId, subtopicId, versionId, totalItems = 0, status = 'in_progress' } = body ?? {};
    if (typeof sessionId !== 'string' || !sessionId || typeof topicId !== 'string' || !topicId ||
        typeof versionId !== 'string' || !versionId || !['in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Missing or invalid session parameters.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: version, error: versionError } = await (supabase as any).from('content_versions')
      .select('id,asset_id,asset_type').eq('id', versionId).maybeSingle();
    if (versionError || !version || version.asset_id !== topicId || version.asset_type !== 'topic') {
      return NextResponse.json({ success: false, error: 'Recall content version is unavailable.' }, { status: 404 });
    }

    const { data: existing, error: lookupError } = await (supabase as any).from('active_recall_sessions')
      .select('id,user_id,topic_id,version_id,status,total_items')
      .eq('id', sessionId).maybeSingle();
    if (lookupError) {
      console.error('Could not verify active recall session:', lookupError);
      return NextResponse.json({ success: false, error: 'Unable to verify session ownership.' }, { status: 500 });
    }

    if (existing && (existing.user_id !== authData.user.id || existing.topic_id !== topicId ||
        existing.version_id !== versionId)) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    if (status === 'in_progress') {
      if (!Number.isInteger(Number(totalItems)) || Number(totalItems) < 1) {
        return NextResponse.json({ success: false, error: 'A positive item count is required to start a session.' }, { status: 400 });
      }
      if (existing) {
        if (existing.status === 'completed') {
          return NextResponse.json({ success: false, error: 'This recall session is already completed.' }, { status: 409 });
        }
        return NextResponse.json({ success: true, status: 'in_progress', totalItems: existing.total_items });
      }

      const { error: insertError } = await (supabase as any).from('active_recall_sessions').insert({
        id: sessionId, user_id: authData.user.id, exam_id: examId || null, subject_id: subjectId || null,
        topic_id: topicId, subtopic_id: subtopicId || null, version_id: versionId,
        total_items: Number(totalItems), correct_count: 0, revealed_count: 0, reviewed_count: 0,
        accuracy: 0, status: 'in_progress', updated_at: new Date().toISOString(),
      });
      if (insertError) {
        console.error('Failed to create active recall session:', insertError);
        return NextResponse.json({ success: false, error: 'Unable to start your recall session.' }, { status: 500 });
      }
      return NextResponse.json({ success: true, status: 'in_progress', totalItems: Number(totalItems) });
    }

    // Completion metrics are derived from persisted attempts, never from client-supplied counts.
    if (!existing || existing.status !== 'in_progress') {
      return NextResponse.json({ success: false, error: 'An active recall session is required before completion.' }, { status: 409 });
    }
    const { data: attempts, error: attemptsError } = await (supabase as any).from('active_recall_attempts')
      .select('recall_item_id,is_correct,is_revealed')
      .eq('session_id', sessionId).eq('user_id', authData.user.id);
    if (attemptsError) {
      console.error('Could not calculate recall session result:', attemptsError);
      return NextResponse.json({ success: false, error: 'Unable to calculate your session result.' }, { status: 500 });
    }

    const uniqueAttempts = new Map<string, any>();
    for (const attempt of attempts || []) uniqueAttempts.set(attempt.recall_item_id, attempt);
    const persistedAttempts = Array.from(uniqueAttempts.values());
    const total = Number(existing.total_items) || 0;
    if (persistedAttempts.length > total) {
      return NextResponse.json({ success: false, error: 'The saved attempts do not match this recall session.' }, { status: 409 });
    }
    const correct = persistedAttempts.filter((attempt) => attempt.is_correct && !attempt.is_revealed).length;
    const revealed = persistedAttempts.filter((attempt) => attempt.is_revealed).length;
    const reviewed = Math.max(0, persistedAttempts.length - correct - revealed);
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    const { data: updated, error: updateError } = await (supabase as any).from('active_recall_sessions')
      .update({
        correct_count: correct, revealed_count: revealed, reviewed_count: reviewed,
        accuracy, status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId).eq('user_id', authData.user.id).eq('status', 'in_progress')
      .select('id').maybeSingle();
    if (updateError || !updated) {
      console.error('Failed to complete active recall session:', updateError);
      return NextResponse.json({ success: false, error: 'Unable to save session completion.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, accuracy, correctCount: correct, revealedCount: revealed, reviewedCount: reviewed });
  } catch (error) {
    console.error('Error saving active recall session:', error);
    return NextResponse.json({ success: false, error: 'Unable to save session progress.' }, { status: 500 });
  }
}
