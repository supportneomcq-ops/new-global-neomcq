import { NextRequest, NextResponse } from 'next/server';
import { TutorChatEngine } from '@/lib/server/content-engine/tutor-chat-engine';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lessonId = searchParams.get('lessonId');
  const requestedUserId = searchParams.get('userId');

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Please sign in to access tutor history.' }, { status: 401 });
  }
  if (requestedUserId && requestedUserId !== user.id) {
    return NextResponse.json({ success: false, error: 'You cannot access another user’s tutor history.' }, { status: 403 });
  }
  const userId = user.id;

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
    const { lessonId, userId: requestedUserId, topicId, question, requestId, idempotencyKey } = body;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Please sign in to use the AI tutor.' }, { status: 401 });
    }
    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json({ success: false, error: 'You cannot send tutor requests for another user.' }, { status: 403 });
    }
    const userId = user.id;

    if (!lessonId || !topicId || typeof question !== 'string' || !question.trim() || question.length > 8000) {
      return NextResponse.json(
        { success: false, error: 'Provide a lesson, topic, and question (maximum 8,000 characters).' },
        { status: 400 }
      );
    }

    if (userId) {
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
    console.error('[AI Tutor Chat] Request failed:', err);
    return NextResponse.json({ success: false, error: 'The tutor could not answer right now. Please retry.' }, { status: 500 });
  }
}
