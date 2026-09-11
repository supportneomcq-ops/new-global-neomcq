import { NextRequest, NextResponse } from 'next/server';
import { verifyCanonicalHierarchy } from '@/lib/server/content-engine/canonical-identity';
import { TutorDbService } from '@/lib/server/content-engine/tutor-db-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');
    const topicId = searchParams.get('topicId');
    const subtopicId = searchParams.get('subtopicId') || undefined;

    if (!topicId) {
      return NextResponse.json({ success: false, error: 'topicId parameter is required.', errorCode: 'INVALID_PARAMS' }, { status: 400 });
    }

    if (examId && subjectId) {
      const hierarchy = await verifyCanonicalHierarchy(examId, subjectId, topicId, subtopicId);
      if (!hierarchy.valid) {
        return NextResponse.json(
          { success: false, error: hierarchy.error || 'Invalid curriculum hierarchy scope.', errorCode: 'HIERARCHY_INVALID' },
          { status: 400 }
        );
      }
      const faqs = await TutorDbService.getCanonicalFaqs(examId, subjectId, topicId, subtopicId);
      return NextResponse.json({ success: true, faqs });
    }

    const faqs = await TutorDbService.getCanonicalFaqs(examId || '', subjectId || '', topicId, subtopicId);
    return NextResponse.json({ success: true, faqs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Finding an existing explanation…', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { examId, subjectId, topicId, subtopicId, question } = body;

    if (!examId || !subjectId || !topicId || !question) {
      return NextResponse.json(
        { success: false, error: 'examId, subjectId, topicId, and question parameters are required.', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    const hierarchy = await verifyCanonicalHierarchy(examId, subjectId, topicId, subtopicId);
    if (!hierarchy.valid) {
      return NextResponse.json(
        { success: false, error: hierarchy.error || 'Invalid curriculum hierarchy scope.', errorCode: 'HIERARCHY_INVALID' },
        { status: 400 }
      );
    }

    const searchResult = await TutorDbService.searchScopeFaq({
      examId,
      subjectId,
      topicId,
      subtopicId,
      question,
    });

    return NextResponse.json({
      success: true,
      ...searchResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Finding an existing explanation…', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
