import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { getDateRange, safeAvg } from '@/lib/analytics-utils';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const timeframe = searchParams.get('timeframe') || '30d';
    const customStart = searchParams.get('customStart') || undefined;
    const customEnd = searchParams.get('customEnd') || undefined;
    const examId = searchParams.get('examId');

    const { startDate, endDate } = getDateRange(timeframe, customStart, customEnd);

    // 1. MCQ Attempts & Difficulty Performance
    let attemptsQuery = adminClient.from('mcq_attempts')
      .select('id, is_correct, time_spent_seconds, user_id, exam_id, subject_id, created_at, mcqs(difficulty)')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (examId) attemptsQuery = attemptsQuery.eq('exam_id', examId);
    const { data: attempts } = await attemptsQuery;
    const attemptsList = attempts || [];

    const totalAttempted = attemptsList.length;
    const totalCorrect = attemptsList.filter(a => a.is_correct === true).length;
    const totalIncorrect = totalAttempted - totalCorrect;
    const accuracy = safeAvg(totalCorrect * 100, totalAttempted, 1);

    const totalSeconds = attemptsList.reduce((acc, c) => acc + (c.time_spent_seconds || 0), 0);
    const avgSecsPerQuestion = safeAvg(totalSeconds, totalAttempted, 1);
    const totalStudyTimeMins = Math.round(totalSeconds / 60);

    const uniqueActiveLearners = new Set(attemptsList.map(a => a.user_id)).size;
    const avgStudyTimePerUserMins = safeAvg(totalStudyTimeMins, uniqueActiveLearners, 1);

    // Difficulty breakdown
    const easyAttempts = attemptsList.filter((a: any) => a.mcqs?.difficulty === 'easy');
    const mediumAttempts = attemptsList.filter((a: any) => a.mcqs?.difficulty === 'medium');
    const hardAttempts = attemptsList.filter((a: any) => a.mcqs?.difficulty === 'hard');

    const easyAccuracy = safeAvg(easyAttempts.filter(a => a.is_correct).length * 100, easyAttempts.length, 1);
    const mediumAccuracy = safeAvg(mediumAttempts.filter(a => a.is_correct).length * 100, mediumAttempts.length, 1);
    const hardAccuracy = safeAvg(hardAttempts.filter(a => a.is_correct).length * 100, hardAttempts.length, 1);

    // 2. Counts of Assets
    const { count: notesCount } = await adminClient.from('notes').select('id', { count: 'exact', head: true });
    const { count: flashcardsCount } = await adminClient.from('flashcards').select('id', { count: 'exact', head: true });
    const { count: revisionCount } = await adminClient.from('revision_sheets').select('id', { count: 'exact', head: true });

    // 3. AI Tutor & Study Plan Sessions
    const { count: aiSessionsCount } = await adminClient.from('ai_generation_jobs').select('id', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    const { count: studyPlansCount } = await adminClient.from('study_plans').select('id', { count: 'exact', head: true });

    // Grouping by date for trends chart
    const dateTrendMap: Record<string, { attempted: number; correct: number; timeSecs: number }> = {};
    attemptsList.forEach((a) => {
      const d = new Date(a.created_at).toISOString().slice(0, 10);
      if (!dateTrendMap[d]) dateTrendMap[d] = { attempted: 0, correct: 0, timeSecs: 0 };
      dateTrendMap[d].attempted += 1;
      if (a.is_correct) dateTrendMap[d].correct += 1;
      dateTrendMap[d].timeSecs += a.time_spent_seconds || 0;
    });

    const trends = Object.entries(dateTrendMap)
      .map(([date, val]) => ({
        date,
        attempted: val.attempted,
        correct: val.correct,
        accuracy: safeAvg(val.correct * 100, val.attempted, 1),
        studyMins: Math.round(val.timeSecs / 60),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      metrics: {
        totalAttempted,
        totalCorrect,
        totalIncorrect,
        accuracy,
        avgSecsPerQuestion,
        totalStudyTimeMins,
        avgStudyTimePerUserMins,
        activeLearners: uniqueActiveLearners,
        notesViewed: notesCount || 0,
        flashcardsStudied: flashcardsCount || 0,
        revisionSheetsUsed: revisionCount || 0,
        aiTutorSessions: aiSessionsCount || 0,
        studyPlans: studyPlansCount || 0,
      },
      difficultyPerformance: {
        easy: { attempted: easyAttempts.length, accuracy: easyAccuracy },
        medium: { attempted: mediumAttempts.length, accuracy: mediumAccuracy },
        hard: { attempted: hardAttempts.length, accuracy: hardAccuracy },
      },
      trends,
    });
  } catch (error: any) {
    console.error('Error fetching learning analytics:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
