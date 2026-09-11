import { NextRequest, NextResponse } from 'next/server';
import { TutorDbService } from '@/lib/server/content-engine/tutor-db-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const lessonId = searchParams.get('lessonId');

    if (!userId || !lessonId) {
      return NextResponse.json(
        { success: false, error: 'userId and lessonId are required.', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    const progress = await TutorDbService.getUserTutorProgress(userId, lessonId);

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve progress.', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      lessonId,
      lastSceneSequence = 1,
      playbackPositionSeconds = 0,
      isCompleted = false,
      completedScenes = [],
      checkpointsPassed = [],
    } = body;

    if (!userId || !lessonId) {
      return NextResponse.json(
        { success: false, error: 'userId and lessonId are required.', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    const updated = await TutorDbService.upsertUserTutorProgress({
      userId,
      lessonId,
      lastSceneSequence: Number(lastSceneSequence) || 1,
      playbackPositionSeconds: Number(playbackPositionSeconds) || 0,
      isCompleted: Boolean(isCompleted),
      completedScenes: Array.isArray(completedScenes) ? completedScenes : [],
      checkpointsPassed: Array.isArray(checkpointsPassed) ? checkpointsPassed : [],
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update progress.', errorCode: 'SAVE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to save progress.', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
