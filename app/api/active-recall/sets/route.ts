import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ActiveRecallSet, ActiveRecallItem } from '@/lib/types/active-recall';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { examId, subjectId, topicId, subtopicId } = body;
    const sessionClient = await createClient();
    const { data: authData, error: authError } = await sessionClient.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: 'Please sign in to access active recall.' }, { status: 401 });
    }
    if (!topicId) return NextResponse.json({ success: false, error: 'topicId is required.' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: topicData, error: topicErr } = await (supabase as any)
      .from('exam_topics')
      .select('id,name,subject_id,exam_subjects(id,name,exam_id,exams(id,name))')
      .eq('id', topicId).maybeSingle();
    if (topicErr || !topicData) {
      return NextResponse.json({ success: false, error: 'Topic not found in curriculum hierarchy.' }, { status: 404 });
    }

    const canonicalSubject = topicData.exam_subjects;
    const canonicalExam = canonicalSubject?.exams;
    const topicName = topicData.name;
    const subjectName = canonicalSubject?.name || 'Subject';
    const examName = canonicalExam?.name || 'Board Exam';

    let subtopicName: string | undefined;
    if (subtopicId) {
      const { data: subData } = await (supabase as any).from('exam_subtopics')
        .select('id,name,topic_id').eq('id', subtopicId).maybeSingle();
      if (!subData || subData.topic_id !== topicId) {
        return NextResponse.json({ success: false, error: 'Subtopic does not belong to this topic.' }, { status: 400 });
      }
      subtopicName = subData.name;
    }

    const { data: versionRows, error: verErr } = await (supabase as any)
      .from('content_versions')
      .select('id,version,snapshot,created_at')
      .eq('asset_id', topicId).eq('asset_type', 'topic')
      .order('version', { ascending: false });
    if (verErr) {
      console.error('Active recall content lookup failed:', verErr);
      return NextResponse.json({ success: false, error: 'Unable to load recall sets.' }, { status: 500 });
    }

    const { data: sessionRows } = await (supabase as any).from('active_recall_sessions')
      .select('id,version_id,total_items,correct_count,status')
      .eq('user_id', authData.user.id).eq('topic_id', topicId);

    const { data: generationJobs } = await (supabase as any).from('ai_jobs')
      .select('status,progress_stage,error,created_at')
      .eq('task', 'canonical_topic_prefetch')
      .eq('topic_id', topicId)
      .in('status', ['queued', 'processing', 'failed', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(1);
    const generationJob = generationJobs?.[0] || null;

    const statsByVersion: Record<string, { total: number; correct: number; completion: number }> = {};
    for (const s of sessionRows || []) {
      statsByVersion[s.version_id || 'default'] = {
        total: Number(s.total_items) || 0,
        correct: Number(s.correct_count) || 0,
        completion: s.status === 'completed' ? 100 : 0,
      };
    }

    const sets: ActiveRecallSet[] = [];
    for (const v of versionRows || []) {
      const raw = Array.isArray(v.snapshot?.fill_in_the_blanks) ? v.snapshot.fill_in_the_blanks : [];
      if (!raw.length) continue;
      const allItems: ActiveRecallItem[] = raw.map((fib: any, idx: number) => ({
        id: typeof fib.id === 'string' ? fib.id : `fib_${v.version}_${idx}`,
        concept: fib.concept || `${topicName} High-Yield Concept`,
        sentence: fib.sentence || 'Complete the clinical statement.',
        // Answer keys and explanations are deliberately withheld until an authenticated attempt/reveal.
        difficulty: fib.difficulty || 'High Yield',
        imageUrl: fib.imageUrl || fib.diagramUrl || undefined,
        imageCaption: fib.imageCaption || undefined,
        videoUrl: fib.videoUrl || undefined,
        subtopicName: fib.subtopicName || fib.subtopic || subtopicName,
      })) as ActiveRecallItem[];
      const items = subtopicName
        ? allItems.filter((it) => it.subtopicName?.toLowerCase() === subtopicName.toLowerCase())
        : allItems;
      const stats = statsByVersion[v.id] || { total: items.length, correct: 0, completion: 0 };
      sets.push({
        id: v.id, topicId, topicName,
        subjectId: canonicalSubject?.id || subjectId, subjectName,
        examId: canonicalExam?.id || examId, examName,
        subtopicId, subtopicName, version: v.version,
        batch: `Batch ${String(v.version).padStart(2, '0')}`,
        updatedAt: v.created_at || new Date().toISOString(),
        itemsCount: items.length, difficulty: 'High-Yield',
        completionPercentage: stats.completion,
        bestAccuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        items,
      });
    }
    return NextResponse.json({
      success: true,
      hierarchy: { examId: canonicalExam?.id || examId, examName, subjectId: canonicalSubject?.id || subjectId,
        subjectName, topicId, topicName, subtopicId, subtopicName },
      sets,
      generation_status: generationJob?.status || null,
      generation_message: generationJob?.status === 'processing'
        ? generationJob.progress_stage || 'The shared topic pack is being generated.'
        : generationJob?.status === 'queued'
          ? 'The shared topic pack is queued. Fill-in-the-blanks will appear when generation completes.'
          : generationJob?.status === 'failed' || generationJob?.status === 'cancelled'
            ? generationJob.error || 'The shared topic-pack job needs an administrator retry.'
            : null,
    });
  } catch (error) {
    console.error('Error fetching active recall sets:', error);
    return NextResponse.json({ success: false, error: 'Unable to load active recall sets.' }, { status: 500 });
  }
}
