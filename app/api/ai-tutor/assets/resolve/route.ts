import { NextRequest, NextResponse } from 'next/server';
import { TutorAssetResolver } from '@/lib/server/content-engine/tutor-asset-resolver';
import { verifyCanonicalHierarchy } from '@/lib/server/content-engine/canonical-identity';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { examId, subjectId, topicId, subtopicId, lessonId, forceRefresh } = body;

    if (!examId || !subjectId || !topicId || !lessonId) {
      return NextResponse.json(
        { success: false, error: 'examId, subjectId, topicId, and lessonId are required.', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    // Verify curriculum hierarchy scope
    const hierarchy = await verifyCanonicalHierarchy(examId, subjectId, topicId, subtopicId);
    if (!hierarchy.valid) {
      return NextResponse.json(
        { success: false, error: hierarchy.error || 'Invalid curriculum scope hierarchy.', errorCode: 'HIERARCHY_INVALID' },
        { status: 400 }
      );
    }

    const result = await TutorAssetResolver.resolveAndSaveLessonAssets({
      examId,
      subjectId,
      topicId,
      subtopicId,
      lessonId,
      forceRefresh: Boolean(forceRefresh),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to resolve visual assets.', errorCode: result.errorCode },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lessonId: result.lessonId,
      assets: result.assets,
      servedFromCache: result.servedFromCache || false,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'An unexpected server error occurred during asset resolution.', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
