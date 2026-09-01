import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ActiveRecallSet, ActiveRecallItem } from '@/lib/types/active-recall';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { examId, subjectId, topicId, subtopicId, userId } = body;

    if (!topicId) {
      return NextResponse.json(
        { success: false, error: 'topicId is required to fetch active recall sets.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Verify Topic & Parent Hierarchy
    const { data: topicData, error: topicErr } = await (supabase as any)
      .from('exam_topics')
      .select(`
        id,
        name,
        subject_id,
        exam_subjects (
          id,
          name,
          exam_id,
          exams (
            id,
            name
          )
        )
      `)
      .eq('id', topicId)
      .maybeSingle();

    if (topicErr || !topicData) {
      return NextResponse.json(
        { success: false, error: 'Topic not found in curriculum hierarchy.' },
        { status: 404 }
      );
    }

    const canonicalExam = topicData.exam_subjects?.exams;
    const canonicalSubject = topicData.exam_subjects;
    const topicName = topicData.name;
    const subjectName = canonicalSubject?.name || 'Subject';
    const examName = canonicalExam?.name || 'Board Exam';

    // Optional Subtopic validation
    let subtopicName: string | undefined = undefined;
    if (subtopicId) {
      const { data: subData } = await (supabase as any)
        .from('exam_subtopics')
        .select('id, name')
        .eq('id', subtopicId)
        .maybeSingle();
      if (subData) {
        subtopicName = subData.name;
      }
    }

    // 2. Fetch Content Versions for this topic
    const { data: versionRows, error: verErr } = await (supabase as any)
      .from('content_versions')
      .select('id, version, is_current, generation_reason, snapshot, quality_score, created_at')
      .eq('asset_id', topicId)
      .eq('asset_type', 'topic')
      .order('version', { ascending: false });

    // 3. User past sessions/attempts for accuracy
    let userStatsByVersion: Record<string, { total: number; correct: number; completion: number }> = {};
    if (userId) {
      try {
        const { data: sessionRows } = await (supabase as any)
          .from('active_recall_sessions')
          .select('id, version_id, total_items, correct_count, accuracy, status')
          .eq('user_id', userId)
          .eq('topic_id', topicId);

        if (sessionRows && sessionRows.length > 0) {
          for (const s of sessionRows) {
            const vKey = s.version_id || 'default';
            userStatsByVersion[vKey] = {
              total: s.total_items,
              correct: s.correct_count,
              completion: s.status === 'completed' ? 100 : Math.round((s.correct_count / Math.max(1, s.total_items)) * 100),
            };
          }
        }
      } catch (err) {
        console.warn('Session stats lookup notice:', err);
      }
    }

    const sets: ActiveRecallSet[] = [];

    if (versionRows && versionRows.length > 0) {
      for (const v of versionRows) {
        const snapshot = v.snapshot || {};
        const rawBlanks = Array.isArray(snapshot.fill_in_the_blanks) ? snapshot.fill_in_the_blanks : [];

        if (rawBlanks.length > 0) {
          const items: ActiveRecallItem[] = rawBlanks.map((fib: any, idx: number) => {
            // If subtopic filter was requested and fib has subtopic tag, optionally prioritize
            const isMatchingSubtopic = !subtopicName || !fib.subtopic || fib.subtopic.toLowerCase().includes(subtopicName.toLowerCase());

            return {
              id: fib.id || `fib_${v.version}_${idx}`,
              concept: fib.concept || `${topicName} High-Yield Concept`,
              sentence: fib.sentence || 'The primary presentation of [Condition] begins with [BLANK].',
              blank: fib.blank || 'Standard Clinical Target',
              acceptedAnswers: Array.isArray(fib.acceptedAnswers)
                ? fib.acceptedAnswers
                : fib.synonyms && Array.isArray(fib.synonyms)
                ? fib.synonyms
                : [fib.blank],
              explanation: fib.explanation || 'Evidence-based clinical protocol and board rationale.',
              highYieldPoint: fib.highYieldPoint || fib.takeaway || fib.pearl || 'Mastery of this diagnostic sequence is frequently tested on board examinations.',
              memoryHook: fib.memoryHook || fib.mnemonic || undefined,
              examTip: fib.examTip || fib.trap || undefined,
              difficulty: fib.difficulty || 'High Yield',
              imageUrl: fib.imageUrl || fib.diagramUrl || undefined,
              imageCaption: fib.imageCaption || undefined,
              videoUrl: fib.videoUrl || undefined,
              subtopicName: fib.subtopic || subtopicName,
            };
          });

          // Filter by subtopic if specified and matching items exist
          const filteredItems = subtopicName
            ? items.filter((it) => !it.subtopicName || it.subtopicName.toLowerCase().includes(subtopicName!.toLowerCase()))
            : items;

          const finalItems = filteredItems.length > 0 ? filteredItems : items;

          const stats = userStatsByVersion[v.id] || { total: finalItems.length, correct: 0, completion: 0 };

          sets.push({
            id: v.id,
            topicId,
            topicName,
            subjectId: canonicalSubject?.id || subjectId,
            subjectName,
            examId: canonicalExam?.id || examId,
            examName,
            subtopicId,
            subtopicName,
            version: v.version,
            batch: `Batch ${String(v.version).padStart(2, '0')}`,
            updatedAt: v.created_at || new Date().toISOString(),
            itemsCount: finalItems.length,
            difficulty: 'High-Yield',
            completionPercentage: stats.completion,
            bestAccuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
            items: finalItems,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      hierarchy: {
        examId: canonicalExam?.id || examId,
        examName,
        subjectId: canonicalSubject?.id || subjectId,
        subjectName,
        topicId,
        topicName,
        subtopicId,
        subtopicName,
      },
      sets,
    });
  } catch (error: any) {
    console.error('Error fetching active recall sets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
