import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalHierarchy } from '@/lib/knowledge/canonical-resolver';
import { GenerationJobManager } from '@/lib/server/content-engine/job-manager';
import { getOrGenerateCanonicalTopicContent } from '@/lib/knowledge/ai-content-intelligence';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      examId,
      examName,
      subjectId,
      subjectName,
      topicId,
      topicName,
      subtopicId,
      subtopicName,
      forceRefresh = false,
      userId,
    } = body;

    const topicSearch = topicId || topicName;
    const subjectSearch = subjectId || subjectName;
    const examSearch = examId || examName;

    if (!topicSearch) {
      return NextResponse.json(
        { success: false, error: 'Topic selection is required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Resolve canonical hierarchy
    const hierarchy = await resolveCanonicalHierarchy({
      examInput: examSearch || 'USMLE Step 1 & 2 CK',
      subjectInput: subjectSearch || 'Clinical Medicine',
      topicInput: topicSearch,
      autoCreate: true,
    });

    if (!hierarchy.success || !hierarchy.topic) {
      return NextResponse.json(
        { success: false, error: hierarchy.error || 'Failed to resolve topic workspace.' },
        { status: 404 }
      );
    }

    const exam = hierarchy.exam!;
    const subject = hierarchy.subject!;
    const topic = hierarchy.topic!;

    // 2. Fetch latest content_versions record for this topic
    const { data: latestVersionRecord } = await supabase
      .from('content_versions')
      .select('id, version, created_at, snapshot')
      .eq('asset_id', topic.id)
      .eq('asset_type', 'topic')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Fetch active job status for this topic from ai_jobs
    const activeJob = await GenerationJobManager.getLatestJobForTopic(topic.id, supabase);

    // 4. Determine 30-day freshness
    let isFresh = false;
    if (latestVersionRecord?.created_at && !forceRefresh) {
      const ageMs = Date.now() - new Date(latestVersionRecord.created_at).getTime();
      if (ageMs < THIRTY_DAYS_MS) {
        isFresh = true;
      }
    }

    // Snapshot payload
    const snapshot = (latestVersionRecord?.snapshot || {}) as any;
    const versionNum = latestVersionRecord?.version || 1;
    const versionId = latestVersionRecord?.id || `v-${topic.id}-${versionNum}`;
    const createdAt = latestVersionRecord?.created_at || new Date().toISOString();

    // 5. Evaluate status for each of the 8 features
    const rawMcqs = Array.isArray(snapshot.mcqs) ? snapshot.mcqs : [];
    const rawQuizA = Array.isArray(snapshot.quiz_a) && snapshot.quiz_a.length > 0
      ? snapshot.quiz_a
      : rawMcqs.slice(0, Math.min(20, Math.ceil(rawMcqs.length / 2)));
    const rawQuizB = Array.isArray(snapshot.quiz_b) && snapshot.quiz_b.length > 0
      ? snapshot.quiz_b
      : rawMcqs.slice(rawQuizA.length, rawQuizA.length + 20);
    const rawFlashcards = Array.isArray(snapshot.flashcards) ? snapshot.flashcards : [];
    const rawNotes = typeof snapshot.notes === 'string' && snapshot.notes.trim().length > 20 ? snapshot.notes : '';
    const rawSticky = Array.isArray(snapshot.sticky_notes) ? snapshot.sticky_notes : [];
    const rawBlanks = Array.isArray(snapshot.fill_in_the_blanks) ? snapshot.fill_in_the_blanks : [];
    const rawTutorPhases = Array.isArray(snapshot.whiteboard_phases) ? snapshot.whiteboard_phases : [];

    const hasFullContent = rawMcqs.length >= 3 && Boolean(rawNotes);

    // Check if background job is currently running
    const isJobActive = activeJob && ['QUEUED', 'RUNNING', 'VALIDATING'].includes(activeJob.status);
    const isJobFailed = activeJob && activeJob.status === 'FAILED';

    // If no fresh content and no job active, trigger generation asynchronously in the background!
    let triggerGeneration = false;
    if ((!hasFullContent || !isFresh || forceRefresh) && !isJobActive) {
      triggerGeneration = true;
    }

    if (triggerGeneration) {
      // Fire-and-forget generation call so endpoint responds instantly
      getOrGenerateCanonicalTopicContent({
        examInput: exam.id,
        subjectInput: subject.id,
        topicInput: topic.id,
        userId: userId || null,
        forceRefresh: true,
      }).catch((err) => console.error('[Orchestration API] Async generation error:', err));
    }

    // Helper to compute individual card status
    const getFeatureStatus = (hasFeatureData: boolean) => {
      if (hasFeatureData && isFresh && !forceRefresh) return 'READY';
      if (isJobActive) return 'GENERATING';
      if (triggerGeneration) return 'QUEUED';
      if (isJobFailed) return 'FAILED';
      if (hasFeatureData && !isFresh) return 'EXPIRED';
      return 'NOT_AVAILABLE';
    };

    const cards = [
      {
        featureId: 'mcq',
        featureName: 'MCQ Practice',
        versionNumber: versionNum,
        versionLabel: `Latest Version (v${versionNum})`,
        status: getFeatureStatus(rawMcqs.length > 0),
        createdAt,
        updatedAt: createdAt,
        quantity: rawMcqs.length || 40,
        quantityLabel: rawMcqs.length > 0 ? `${rawMcqs.length} MCQs Ready` : '40 MCQs Expected',
        contentVersionId: versionId,
        description: 'Adaptive vignette questions with clinical pearls and instant explanations.',
      },
      {
        featureId: 'quiz_a',
        featureName: 'Quiz A',
        versionNumber: versionNum,
        versionLabel: `Latest Version (v${versionNum})`,
        status: getFeatureStatus(rawQuizA.length > 0),
        createdAt,
        updatedAt: createdAt,
        quantity: rawQuizA.length || 20,
        quantityLabel: rawQuizA.length > 0 ? `${rawQuizA.length} Questions` : '20 Questions Expected',
        contentVersionId: versionId,
        description: 'First timed evaluation sprint set with score analytics and pacing.',
      },
      {
        featureId: 'quiz_b',
        featureName: 'Quiz B',
        versionNumber: versionNum,
        versionLabel: `Latest Version (v${versionNum})`,
        status: getFeatureStatus(rawQuizB.length > 0),
        createdAt,
        updatedAt: createdAt,
        quantity: rawQuizB.length || 20,
        quantityLabel: rawQuizB.length > 0 ? `${rawQuizB.length} Questions` : '20 Questions Expected',
        contentVersionId: versionId,
        description: 'Parallel non-overlapping evaluation set to verify topic mastery.',
      },
      {
        featureId: 'flashcards',
        featureName: 'Flashcards',
        versionNumber: versionNum,
        versionLabel: `Latest Version (v${versionNum})`,
        status: getFeatureStatus(rawFlashcards.length > 0),
        createdAt,
        updatedAt: createdAt,
        quantity: rawFlashcards.length || 20,
        quantityLabel: rawFlashcards.length > 0 ? `${rawFlashcards.length} Cards Ready` : '20 Cards Expected',
        contentVersionId: versionId,
        description: '3D animated spaced-repetition card deck for rapid clinical recall.',
      },
      {
        featureId: 'a4_notes',
        featureName: 'A4 Study Notes',
        versionNumber: versionNum,
        versionLabel: `Latest Version (v${versionNum})`,
        status: getFeatureStatus(Boolean(rawNotes)),
        createdAt,
        updatedAt: createdAt,
        quantity: rawNotes ? Math.max(1, Math.ceil(rawNotes.length / 1500)) : 1,
        quantityLabel: rawNotes ? `${Math.max(1, Math.ceil(rawNotes.length / 1500))} Pages Document` : 'Complete Notes Expected',
        contentVersionId: versionId,
        description: 'Formatted high-yield printable notes with triads, tables, and algorithms.',
      },
      {
        featureId: 'sticky_notes',
        featureName: 'Sticky Notes Board',
        versionNumber: versionNum,
        versionLabel: `Latest Version (v${versionNum})`,
        status: getFeatureStatus(rawSticky.length > 0),
        createdAt,
        updatedAt: createdAt,
        quantity: rawSticky.length || 20,
        quantityLabel: rawSticky.length > 0 ? `${rawSticky.length} Notes Board` : '20 Notes Expected',
        contentVersionId: versionId,
        description: 'Color-coded tiles highlighting key board traps, buzzwords, and pearls.',
      },
      {
        featureId: 'fill_in_the_blanks',
        featureName: 'Fill in the Blanks',
        versionNumber: versionNum,
        versionLabel: `Latest Version (v${versionNum})`,
        status: getFeatureStatus(rawBlanks.length > 0),
        createdAt,
        updatedAt: createdAt,
        quantity: rawBlanks.length || 30,
        quantityLabel: rawBlanks.length > 0 ? `${rawBlanks.length} Exercises` : '30 Exercises Expected',
        contentVersionId: versionId,
        description: 'Active recall cloze-deletion exercises testing high-yield medical terms.',
      },
      {
        featureId: 'ai_tutor',
        featureName: 'AI Tutor Whiteboard',
        versionNumber: versionNum,
        versionLabel: `Latest Version (v${versionNum})`,
        status: getFeatureStatus(rawTutorPhases.length > 0 || Boolean(snapshot.tutor_explanation)),
        createdAt,
        updatedAt: createdAt,
        quantity: rawTutorPhases.length || 1,
        quantityLabel: rawTutorPhases.length > 0 ? `${rawTutorPhases.length} Whiteboard Scenes` : '1 Interactive Lesson Expected',
        contentVersionId: versionId,
        description: 'Step-by-step visual diagram breakdown with interactive AI Q&A.',
      },
    ];

    return NextResponse.json({
      success: true,
      context: {
        examId: exam.id,
        examName: exam.name,
        subjectId: subject.id,
        subjectName: subject.name,
        topicId: topic.id,
        topicName: topic.name,
        subtopicId: subtopicId || null,
        subtopicName: subtopicName || null,
      },
      cards,
      versionRecord: {
        id: versionId,
        version: versionNum,
        createdAt,
        isFresh,
      },
    });
  } catch (err: any) {
    console.error('[Orchestration API] Fatal error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error orchestrating topic content.' },
      { status: 500 }
    );
  }
}
