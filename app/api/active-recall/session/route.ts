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
    const { sessionId, examId, subjectId, topicId, subtopicId, versionId,
      totalItems = 0, correctCount = 0, revealedCount = 0, reviewedCount = 0,
      status = 'in_progress' } = body ?? {};
    if (typeof sessionId !== 'string' || !sessionId || typeof topicId !== 'string' || !topicId ||
        typeof versionId !== 'string' || !versionId) {
      return NextResponse.json({ success: false, error: 'Missing required session parameters.' }, { status: 400 });
    }
    const counts = [totalItems, correctCount, revealedCount, reviewedCount].map(Number);
    if (counts.some((v) => !Number.isInteger(v) || v < 0) || counts[1] > counts[0] ||
        counts[2] + counts[3] + counts[1] > counts[0] || !['in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Session metrics are invalid.' }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const { data: version, error: versionError } = await (supabase as any).from('content_versions')
      .select('id,asset_id,asset_type').eq('id', versionId).maybeSingle();
    if (versionError || !version || version.asset_id !== topicId || version.asset_type !== 'topic') {
      return NextResponse.json({ success: false, error: 'Recall content version is unavailable.' }, { status: 404 });
    }
    const { data: existing, error: lookupError } = await (supabase as any).from('active_recall_sessions')
      .select('id,user_id,topic_id,version_id,status').eq('id', sessionId).maybeSingle();
    if (lookupError) {
      console.error('Could not verify active recall session:', lookupError);
      return NextResponse.json({ success: false, error: 'Unable to verify session ownership.' }, { status: 500 });
    }
    if (existing && (existing.user_id !== authData.user.id || existing.topic_id !== topicId ||
        existing.version_id !== versionId || existing.status === 'completed')) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }
    const accuracy = counts[0] > 0 ? Math.round((counts[1] / counts[0]) * 100) : 0;
    const { error } = await (supabase as any).from('active_recall_sessions').upsert({
      id: sessionId, user_id: authData.user.id, exam_id: examId || null, subject_id: subjectId || null,
      topic_id: topicId, subtopic_id: subtopicId || null, version_id: versionId,
      total_items: counts[0], correct_count: counts[1], revealed_count: counts[2],
      reviewed_count: counts[3], accuracy, status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) {
      console.error('Failed to save active recall session:', error);
      return NextResponse.json({ success: false, error: 'Unable to save session progress.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, accuracy });
  } catch (error) {
    console.error('Error saving active recall session:', error);
    return NextResponse.json({ success: false, error: 'Unable to save session progress.' }, { status: 500 });
  }
}
