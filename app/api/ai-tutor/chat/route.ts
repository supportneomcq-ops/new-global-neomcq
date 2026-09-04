import { NextRequest, NextResponse } from 'next/server';
import { TutorChatEngine } from '@/lib/server/content-engine/tutor-chat-engine';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lessonId = searchParams.get('lessonId');
  const userId = searchParams.get('userId') || 'system-user';

  if (!lessonId) {
    return NextResponse.json({ success: false, error: 'lessonId query parameter is required.' }, { status: 400 });
  }

  const result = await TutorChatEngine.getLessonChatHistory(lessonId, userId);
  if (!result.success) {
    const status = result.errorCode === 'LESSON_UNAUTHORIZED' || result.errorCode === 'UNAUTHORIZED' ? 403 : result.errorCode === 'NOT_FOUND' ? 404 : 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonId, userId = 'system-user', topicId, question, requestId, idempotencyKey } = body;

    if (!lessonId || !topicId || !question) {
      return NextResponse.json(
        { success: false, error: 'lessonId, topicId, and question are required.' },
        { status: 400 }
      );
    }

    if (userId && userId !== 'system-user') {
      const { checkFeatureQuota } = await import('@/lib/entitlements/quota-checker');
      const quotaResult = await checkFeatureQuota({
        userId,
        feature: 'tutor',
        topicId,
      });

      if (!quotaResult.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: quotaResult.upgradeMessage || quotaResult.reason,
            limitReached: true,
            limitType: quotaResult.limitType,
            upgradeRequired: true,
            planCode: quotaResult.planCode,
          },
          { status: 403 }
        );
      }
    }

    const result = await TutorChatEngine.askDoubtQuestion({
      lessonId,
      userId,
      topicId,
      question,
      requestId,
      idempotencyKey,
    });

    if (!result.success) {
      const status = result.errorCode === 'LESSON_UNAUTHORIZED' || result.errorCode === 'UNAUTHORIZED' ? 403 : result.errorCode === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
