import { NextRequest, NextResponse } from 'next/server';
import { AITutorLessonService } from '@/lib/server/content-engine/ai-tutor-lesson-service';
import { verifyCanonicalHierarchy } from '@/lib/server/content-engine/canonical-identity';
import { TutorDbService } from '@/lib/server/content-engine/tutor-db-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');
    const topicId = searchParams.get('topicId');
    const subtopicId = searchParams.get('subtopicId') || undefined;
    const version = Number(searchParams.get('version') || 1);

    if (!examId || !subjectId || !topicId) {
      return NextResponse.json(
        { success: false, error: 'examId, subjectId, and topicId query parameters are required.', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    // Server-side hierarchy verification
    const hierarchy = await verifyCanonicalHierarchy(examId, subjectId, topicId, subtopicId);
    if (!hierarchy.valid) {
      return NextResponse.json(
        { success: false, error: hierarchy.error || 'Invalid curriculum hierarchy scope.', errorCode: 'HIERARCHY_INVALID' },
        { status: 400 }
      );
    }

    // Retrieve canonical lesson
    const canonical = await TutorDbService.getCanonicalTutorLesson(examId, subjectId, topicId, subtopicId, version);

    if (!canonical || !canonical.lesson) {
      return NextResponse.json({
        success: true,
        exists: false,
        message: "We're preparing this lesson for you.",
      });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      lesson: canonical.lesson,
      scenes: canonical.scenes,
      assets: canonical.assets,
      voiceMetadata: canonical.voiceMetadata,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'An unexpected server error occurred.', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { examId, subjectId, topicId, subtopicId, version, userId, forceRefresh } = body;

    if (!examId || !subjectId || !topicId) {
      return NextResponse.json(
        { success: false, error: 'examId, subjectId, and topicId are required.', errorCode: 'HIERARCHY_INVALID' },
        { status: 400 }
      );
    }

    // Server-side hierarchy verification
    const hierarchy = await verifyCanonicalHierarchy(examId, subjectId, topicId, subtopicId);
    if (!hierarchy.valid) {
      return NextResponse.json(
        { success: false, error: hierarchy.error || 'Invalid curriculum hierarchy scope.', errorCode: 'HIERARCHY_INVALID' },
        { status: 400 }
      );
    }

    const result = await AITutorLessonService.getOrGenerateLesson({
      examId,
      subjectId,
      topicId,
      subtopicId,
      contentVersion: Number(version || 1),
      userId,
      forceRefresh: Boolean(forceRefresh),
    });

    if (!result.success) {
      const status = result.errorCode === 'HIERARCHY_INVALID' ? 400 : 500;
      return NextResponse.json(
        { success: false, error: result.error || "We're preparing this lesson for you.", errorCode: result.errorCode },
        { status }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "We're preparing this lesson for you.", errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
