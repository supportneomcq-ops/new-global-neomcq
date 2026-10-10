import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { checkFeatureQuota } from '@/lib/entitlements/quota-checker';
import { ContentScope } from '@/lib/types/a4-notes';
import {
  validateCurriculumHierarchy,
  getCanonicalA4NoteRecord,
  generateA4NotesManuscript,
  saveCanonicalA4Note,
  getUserA4NotesData,
} from '@/lib/notes-a4/a4-notes-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notes/a4
 * Fetches canonical A4 notes metadata, freshness, document content, and user-specific annotations.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');
    const topicId = searchParams.get('topicId');
    const subtopicId = searchParams.get('subtopicId') || null;
    const contentScope = (searchParams.get('contentScope') as ContentScope) || (subtopicId ? 'SUBTOPIC' : 'TOPIC');

    if (!examId || !subjectId || !topicId) {
      return NextResponse.json(
        { error: 'Missing required hierarchy identifiers (examId, subjectId, topicId)' },
        { status: 400 }
      );
    }

    // 1. Authenticate user (optional for GET, but used for user-specific highlights)
    let activeUserId: string | null = null;
    try {
      const userClient = await createClient();
      const { data: { user } } = await userClient.auth.getUser();
      if (user) activeUserId = user.id;
    } catch (_) {}

    // 2. Validate Curriculum Hierarchy Security
    const hierarchy = await validateCurriculumHierarchy({
      examId,
      subjectId,
      topicId,
      subtopicId,
    });

    if (!hierarchy.valid) {
      return NextResponse.json({ error: hierarchy.error }, { status: 400 });
    }

    // 3. Query Canonical Document Record & Freshness
    const recordResult = await getCanonicalA4NoteRecord({
      examId,
      subjectId,
      topicId,
      subtopicId,
      contentScope,
    });

    if (!recordResult.note) {
      return NextResponse.json({
        status: 'NOT_FOUND',
        isFresh: false,
        message: 'No canonical A4 Notes document found for this scope.',
        document: null,
        userData: null,
      });
    }

    // Populate context names
    recordResult.note.examName = hierarchy.examName || '';
    recordResult.note.subjectName = hierarchy.subjectName || '';
    recordResult.note.topicName = hierarchy.topicName || '';
    recordResult.note.subtopicName = hierarchy.subtopicName || null;
    recordResult.note.availableSubtopics = hierarchy.availableSubtopics || [];

    // 4. Fetch User-Specific Annotations & Highlights if authenticated
    let userData = null;
    if (activeUserId && recordResult.note.id) {
      try {
        userData = await getUserA4NotesData(activeUserId, recordResult.note.id);
      } catch (userErr) {
        console.warn('[A4 Notes GET] Non-fatal user annotations fetch error:', userErr);
      }
    }

    const documentStatus = recordResult.isFresh ? 'READY' : 'EXPIRED';

    return NextResponse.json({
      status: documentStatus,
      isFresh: recordResult.isFresh,
      expired: recordResult.expired,
      version: recordResult.version,
      createdAt: recordResult.note.createdAt,
      expiresAt: recordResult.note.expiresAt,
      totalPages: recordResult.note.totalPages,
      tableOfContents: recordResult.note.tableOfContents,
      document: recordResult.note,
      userData,
    });
  } catch (error: any) {
    console.error('[API GET /api/notes/a4] Internal Error:', error);
    return NextResponse.json(
      { error: 'An unexpected internal error occurred while retrieving A4 notes.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/a4
 * Retrieves or generates canonical A4 Notes using single-job concurrency via ai_jobs.
 */
export async function POST(req: NextRequest) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required to generate or access A4 notes.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      examId,
      subjectId,
      topicId,
      subtopicId = null,
      contentScope = subtopicId ? 'SUBTOPIC' : 'TOPIC',
      forceRefresh = false,
    } = body;

    if (!examId || !subjectId || !topicId) {
      return NextResponse.json(
        { error: 'Missing required curriculum identifiers (examId, subjectId, topicId)' },
        { status: 400 }
      );
    }

    // 1. Validate Curriculum Hierarchy Security
    const hierarchy = await validateCurriculumHierarchy({
      examId,
      subjectId,
      topicId,
      subtopicId,
    });

    if (!hierarchy.valid) {
      return NextResponse.json({ error: hierarchy.error }, { status: 400 });
    }

    // 2. Check Feature Entitlements & Quotas
    const quotaResult = await checkFeatureQuota({
      userId: user.id,
      feature: 'notes',
      topicId,
      examId,
      subjectId,
    });

    if (!quotaResult.allowed) {
      return NextResponse.json(
        {
          error: quotaResult.upgradeMessage || quotaResult.reason,
          limitReached: true,
          limitType: quotaResult.limitType,
          upgradeRequired: true,
          planCode: quotaResult.planCode,
        },
        { status: 403 }
      );
    }

    // 3. Query existing canonical record
    const existing = await getCanonicalA4NoteRecord({
      examId,
      subjectId,
      topicId,
      subtopicId,
      contentScope: contentScope as ContentScope,
    });

    // Re-use fresh canonical document unless forceRefresh is true
    if (existing.note && existing.isFresh && !forceRefresh) {
      existing.note.examName = hierarchy.examName || '';
      existing.note.subjectName = hierarchy.subjectName || '';
      existing.note.topicName = hierarchy.topicName || '';
      existing.note.subtopicName = hierarchy.subtopicName || null;
      existing.note.availableSubtopics = hierarchy.availableSubtopics || [];

      const userData = await getUserA4NotesData(user.id, existing.note.id);

      return NextResponse.json({
        status: 'READY',
        source: 'cache',
        isFresh: true,
        version: existing.version,
        document: existing.note,
        userData,
      });
    }

    // 4. Job Concurrency Locking via ai_jobs
    const adminClient = getSupabaseAdmin();
    const jobScopeKey = `a4_notes_${examId}_${subjectId}_${topicId}_${subtopicId || 'main'}_${contentScope}`;

    // Check for existing active job
    const { data: existingJobs } = await adminClient
      .from('ai_jobs')
      .select('id, status, created_at')
      .eq('task', 'a4_notes_generation')
      .eq('exam_id', examId)
      .eq('subject_id', subjectId)
      .eq('topic_id', topicId)
      .in('status', ['queued', 'running', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingJobs && existingJobs.length > 0) {
      const job = existingJobs[0];
      const jobAgeMs = Date.now() - new Date(job.created_at).getTime();

      // If job is actively running (< 3 mins old), request client wait/poll
      if (jobAgeMs < 180000) {
        return NextResponse.json({
          status: 'PREPARING',
          message: 'A canonical A4 Notes document generation is currently in progress.',
          jobId: job.id,
        });
      }
    }

    // 5. Create new AI Generation Job with database-enforced idempotency lock
    const targetVersion = existing.note ? existing.version + 1 : 1;
    const { data: jobRecord, error: jobInsertError } = await adminClient
      .from('ai_jobs')
      .insert({
        user_id: user.id,
        exam_id: examId,
        subject_id: subjectId,
        topic_id: topicId,
        task: 'a4_notes_generation',
        idempotency_key: jobScopeKey,
        status: 'running',
        provider: 'Google Gemini AI',
        model: 'gemini-3.5-flash',
        priority: 5,
        input_payload: {
          jobScopeKey,
          contentScope,
          examName: hierarchy.examName,
          subjectName: hierarchy.subjectName,
          topicName: hierarchy.topicName,
          subtopicName: hierarchy.subtopicName,
          availableSubtopics: hierarchy.availableSubtopics,
          targetVersion,
        },
      })
      .select('id')
      .single();

    if (jobInsertError && jobInsertError.code === '23505') {
      // Idempotency constraint violation: another active generation job was created concurrently
      return NextResponse.json({
        status: 'PREPARING',
        message: 'A canonical A4 Notes document generation is currently in progress.',
      });
    }

    if (jobInsertError) {
      console.error('[A4 Notes] Failed to create generation job:', jobInsertError);
      return NextResponse.json(
        { status: 'FAILED', error: 'Could not start notes generation. Please retry shortly.' },
        { status: 500 }
      );
    }

    // 6. Execute AI Generation
    try {
      const generatedDocument = await generateA4NotesManuscript({
        userId: user.id,
        examId,
        examName: hierarchy.examName || '',
        subjectId,
        subjectName: hierarchy.subjectName || '',
        topicId,
        topicName: hierarchy.topicName || '',
        subtopicId,
        subtopicName: hierarchy.subtopicName || null,
        availableSubtopics: hierarchy.availableSubtopics || [],
        contentScope: contentScope as ContentScope,
        targetVersion,
      });

      // 7. Store canonical document in Supabase
      const newDocId = await saveCanonicalA4Note(generatedDocument);
      generatedDocument.id = newDocId;

      // Update ai_job to completed
      if (jobRecord?.id) {
        await adminClient
          .from('ai_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobRecord.id);
      }

      // Fetch user annotations/highlights (preserves user data even on version update)
      const userData = await getUserA4NotesData(user.id, newDocId);

      return NextResponse.json({
        status: 'READY',
        source: 'generated',
        isFresh: true,
        version: targetVersion,
        document: generatedDocument,
        userData,
      });
    } catch (genError: any) {
      console.error('[A4 Notes Generator Error]:', genError);

      if (jobRecord?.id) {
        await adminClient
          .from('ai_jobs')
          .update({
            status: 'failed',
            error: genError.message || 'Generation failed',
          })
          .eq('id', jobRecord.id);
      }

      return NextResponse.json(
        {
          status: 'FAILED',
          error: 'Failed to generate A4 Notes manuscript. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[API POST /api/notes/a4] Fatal Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during A4 notes processing.' },
      { status: 500 }
    );
  }
}
