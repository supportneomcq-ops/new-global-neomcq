import { NextRequest, NextResponse } from 'next/server';
import { TutorSessionManager } from '@/lib/server/content-engine/tutor-session-manager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonId, userId, segment } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    if (!lessonId || !segment || typeof segment.sequence !== 'number' || !segment.phase) {
      return NextResponse.json(
        { success: false, error: 'lessonId and valid segment object are required', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    const result = await TutorSessionManager.persistSegment(lessonId, userId, segment);

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
