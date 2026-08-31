import { NextRequest, NextResponse } from 'next/server';
import { AITutorGenerator } from '@/lib/server/content-engine/ai-tutor-generator';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonId, userId, state } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    if (!lessonId || !state) {
      return NextResponse.json(
        { success: false, error: 'lessonId and state are required', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    const action = state === 'PAUSED' ? 'PAUSE' : 'RESUME';
    const result = await AITutorGenerator.pauseOrResumeLesson(lessonId, userId, action);

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

