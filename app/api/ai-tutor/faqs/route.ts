import { NextRequest, NextResponse } from 'next/server';
import { TutorChatEngine } from '@/lib/server/content-engine/tutor-chat-engine';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get('topicId');
  const examId = searchParams.get('examId') || undefined;
  const subjectId = searchParams.get('subjectId') || undefined;

  if (!topicId) {
    return NextResponse.json({ success: false, error: 'topicId parameter is required.' }, { status: 400 });
  }

  const result = await TutorChatEngine.getTopicFaqs(topicId, { examId, subjectId });
  return NextResponse.json(result);
}
