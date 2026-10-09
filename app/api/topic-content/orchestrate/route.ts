import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { checkFeatureQuota } from '@/lib/entitlements/quota-checker';
import { resolveCanonicalHierarchy } from '@/lib/knowledge/canonical-resolver';
import { GenerationJobManager } from '@/lib/server/content-engine/job-manager';
import { getOrGenerateCanonicalTopicContent } from '@/lib/knowledge/ai-content-intelligence';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Please sign in to access study content.' }, { status: 401 });
    }

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

    let actualExamInput = examSearch;
    let actualSubjectInput = subjectSearch;

    // Look up topic parent hierarchy in DB if exam or subject input is missing
    if ((!actualExamInput || !actualSubjectInput) && topicSearch) {
      try {
        let topicQuery = supabase
          .from('exam_topics')
          .select('id, name, subject_id, exam_subjects(id, name, exam_id, exams(id, name))');

        if (topicId) {
          topicQuery = topicQuery.eq('id', topicId);
        } else if (topicName) {
          topicQuery = topicQuery.ilike('name', topicName);
        }

        const { data: dbTopic } = await topicQuery.limit(1).maybeSingle();
        if (dbTopic) {
          const dbSub = (dbTopic as any).exam_subjects;
          const dbEx = dbSub?.exams;
          if (dbEx?.id) actualExamInput = actualExamInput || dbEx.id;
          if (dbSub?.id) actualSubjectInput = actualSubjectInput || dbSub.id;
        }
      } catch (lookupErr) {
        console.warn('[Orchestrate] Topic parent lookup notice:', lookupErr);
      }
    }

    // 1. Resolve canonical hierarchy
    const hierarchy = await resolveCanonicalHierarchy({
      examInput: actualExamInput || 'default_exam',
      subjectInput: actualSubjectInput || 'default_subject',
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

    // Snapshot payload. Support both the current schema and the slot-based format already stored in production.
    // Without these fallbacks, existing quizzes and flashcards appear empty and trigger unnecessary AI regeneration.
    const snapshot = (latestVersionRecord?.snapshot || {}) as any;
    const versionNum = latestVersionRecord?.version || 1;
    const versionId = latestVersionRecord?.id || `v-${topic.id}-${versionNum}`;
    const createdAt = latestVersionRecord?.created_at || new Date().toISOString();

    // 5. Evaluate status for each of the 8 features
    const legacyMainMcqs = Array.isArray(snapshot.mainMcqsSlot?.items) ? snapshot.mainMcqsSlot.items : [];
    const legacyQuizA = Array.isArray(snapshot.quiz1Slot?.items) ? snapshot.quiz1Slot.items : [];
    const legacyQuizB = Array.isArray(snapshot.quiz2Slot?.items) ? snapshot.quiz2Slot.items : [];
    const rawMcqs = Array.isArray(snapshot.mcqs)
      ? snapshot.mcqs
      : legacyMainMcqs.length > 0
        ? legacyMainMcqs
        : [...legacyQuizA, ...legacyQuizB];
    const rawQuizA = Array.isArray(snapshot.quiz_a) && snapshot.quiz_a.length > 0
      ? snapshot.quiz_a
      : legacyQuizA.length > 0
        ? legacyQuizA
        : rawMcqs.slice(0, Math.min(20, Math.ceil(rawMcqs.length / 2)));
    const rawQuizB = Array.isArray(snapshot.quiz_b) && snapshot.quiz_b.length > 0
      ? snapshot.quiz_b
      : legacyQuizB.length > 0
        ? legacyQuizB
        : rawMcqs.slice(rawQuizA.length, rawQuizA.length + 20);
    const rawFlashcards = Array.isArray(snapshot.flashcards)
      ? snapshot.flashcards
      : Array.isArray(snapshot.flashcardsSlot?.items)
        ? snapshot.flashcardsSlot.items
        : [];
    const legacyNotesContent = snapshot.notesSlot?.content;
    const rawNotes = typeof snapshot.notes === 'string' && snapshot.notes.trim().length > 20
      ? snapshot.notes
      : typeof legacyNotesContent === 'string' && legacyNotesContent.trim().length > 20
        ? legacyNotesContent
        : typeof legacyNotesContent?.content === 'string' && legacyNotesContent.content.trim().length > 20
          ? legacyNotesContent.content
          : typeof legacyNotesContent?.text === 'string' && legacyNotesContent.text.trim().length > 20
            ? legacyNotesContent.text
            : '';
    const rawSticky = Array.isArray(snapshot.sticky_notes)
      ? snapshot.sticky_notes
      : Array.isArray(snapshot.stickyNotesSlot?.items)
        ? snapshot.stickyNotesSlot.items
        : [];
    const rawBlanks = Array.isArray(snapshot.fill_in_the_blanks)
      ? snapshot.fill_in_the_blanks
      : Array.isArray(snapshot.fillInTheBlanksSlot?.items)
        ? snapshot.fillInTheBlanksSlot.items
        : [];
    const rawTutorPhases = Array.isArray(snapshot.whiteboard_phases)
      ? snapshot.whiteboard_phases
      : Array.isArray(snapshot.aiTutorSlot?.items)
        ? snapshot.aiTutorSlot.items
        : [];

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
      const quotaResult = await checkFeatureQuota({
        userId: user.id,
        feature: 'mcq',
        topicId: topic.id,
        examId: exam.id,
        subjectId: subject.id,
      });

      if (!quotaResult.allowed) {
        return NextResponse.json({
          success: false,
          limitReached: true,
          limitType: quotaResult.limitType,
          error: quotaResult.upgradeMessage || quotaResult.reason,
          upgradeRequired: true,
          planCode: quotaResult.planCode,
        }, { status: 403 });
      }

      // Generation runs only for the authenticated user and only after quota authorization.
      getOrGenerateCanonicalTopicContent({
        examInput: exam.id,
        subjectInput: subject.id,
        topicInput: topic.id,
        userId: user.id,
        forceRefresh: forceRefresh === true,
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
        description: 'Adaptive vignette and conceptual questions with high-yield rationale and instant explanations.',
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
        description: '3D animated spaced-repetition card deck for rapid concept recall.',
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
        description: 'Formatted high-yield printable notes with key concepts, tables, and rules.',
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
        description: 'Color-coded tiles highlighting key exam traps, rules, and pearls.',
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
        description: 'Active recall cloze-deletion exercises testing high-yield key terms.',
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
