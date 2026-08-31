import { NextRequest, NextResponse } from 'next/server';
import { AITutorGenerator } from '@/lib/server/content-engine/ai-tutor-generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { examId, subjectId, topicId, userId, forceNew } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required for Tutor lesson operations', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    if (!examId || !subjectId || !topicId) {
      return NextResponse.json(
        { success: false, error: 'examId, subjectId, and topicId are required', errorCode: 'HIERARCHY_INVALID' },
        { status: 400 }
      );
    }

    const result = await AITutorGenerator.createOrResumeLesson({
      examId,
      subjectId,
      topicId,
      userId,
      forceNew: Boolean(forceNew),
    });

    if (!result.success) {
      const status = result.errorCode === 'HIERARCHY_INVALID' ? 400 : result.errorCode === 'UNAUTHORIZED' ? 401 : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    if (!lessonId) {
      return NextResponse.json(
        { success: false, error: 'lessonId is required', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    const result = await AITutorGenerator.getLessonState(lessonId, userId);

    if (!result.success) {
      const status = result.errorCode === 'UNAUTHORIZED' ? 403 : result.errorCode === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

