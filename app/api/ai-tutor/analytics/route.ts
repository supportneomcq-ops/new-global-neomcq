import { NextRequest, NextResponse } from 'next/server';
import { TutorDbService } from '@/lib/server/content-engine/tutor-db-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      eventType,
      examId,
      subjectId,
      topicId,
      subtopicId,
      lessonId,
      sceneId,
      faqId,
      metadata,
    } = body;

    if (!userId || !eventType || !examId || !subjectId || !topicId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields for analytics event.' },
        { status: 400 }
      );
    }

    const success = await TutorDbService.logTutorEvent({
      userId,
      eventType,
      examId,
      subjectId,
      topicId,
      subtopicId,
      lessonId,
      sceneId,
      faqId,
      metadata,
    });

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Invalid event type or missing scope.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to record analytics event.' },
      { status: 500 }
    );
  }
}
