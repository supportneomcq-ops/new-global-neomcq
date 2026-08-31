import { NextRequest, NextResponse } from 'next/server';
import { AITutorGenerator } from '@/lib/server/content-engine/ai-tutor-generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonId, userId, sequence, forceRefresh } = body;

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

    const result = await AITutorGenerator.generateNextSegment({
      lessonId,
      userId,
      sequenceNumber: sequence ? parseInt(String(sequence), 10) : undefined,
      forceRefresh: Boolean(forceRefresh),
    });

    if (!result.success) {
      const status = result.errorCode === 'UNAUTHORIZED'
        ? 401
        : result.errorCode === 'HIERARCHY_INVALID'
        ? 400
        : result.errorCode === 'NOT_FOUND'
        ? 404
        : 500;
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

