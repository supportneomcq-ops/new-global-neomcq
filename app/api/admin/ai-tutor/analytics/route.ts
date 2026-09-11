import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { TutorAnalyticsService } from '@/lib/server/content-engine/tutor-analytics-service';
import type { TutorAnalyticsTimeframe } from '@/lib/types/ai-tutor-analytics';

export async function GET(req: NextRequest) {
  try {
    // 1. Server-side Admin Authorization Verification
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);

    // 2. Validate Timeframe Date-Range Parameter
    const rawTimeframe = searchParams.get('range') || searchParams.get('timeframe') || '30d';
    const validTimeframes: TutorAnalyticsTimeframe[] = ['7d', '30d', '90d', 'all'];
    const timeframe: TutorAnalyticsTimeframe = validTimeframes.includes(
      rawTimeframe as TutorAnalyticsTimeframe
    )
      ? (rawTimeframe as TutorAnalyticsTimeframe)
      : '30d';

    // 3. Extract Scope Filters
    const examId = searchParams.get('exam_id') || searchParams.get('examId') || undefined;
    const subjectId = searchParams.get('subject_id') || searchParams.get('subjectId') || undefined;
    const topicId = searchParams.get('topic_id') || searchParams.get('topicId') || undefined;
    const subtopicId = searchParams.get('subtopic_id') || searchParams.get('subtopicId') || undefined;

    // 4. Aggregate Analytics via TutorAnalyticsService
    const analyticsData = await TutorAnalyticsService.getAnalytics({
      timeframe,
      examId,
      subjectId,
      topicId,
      subtopicId,
    });

    return NextResponse.json({
      success: true,
      data: analyticsData,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/ai-tutor/analytics:', err);
    return NextResponse.json(
      { success: false, error: 'Unable to load Tutor analytics.' },
      { status: 500 }
    );
  }
}
