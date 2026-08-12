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

    const { startDate, endDate } = getDateRange(timeframe, customStart, customEnd);

    // Fetch MCQ attempts & user profiles
    const [attemptsRes, usersRes, aiJobsRes] = await Promise.all([
      adminClient.from('mcq_attempts').select('id, user_id, time_spent_seconds, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      adminClient.from('profiles').select('id, updated_at, created_at'),
      adminClient.from('ai_generation_jobs').select('id, user_id, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
    ]);

    const attempts = attemptsRes.data || [];
    const users = usersRes.data || [];
    const aiJobs = aiJobsRes.data || [];

    const activeUsersCount = new Set(attempts.map((a) => a.user_id)).size || Math.min(users.length, 1);
    const totalQuestions = attempts.length;
    const questionsPerUser = safeAvg(totalQuestions, activeUsersCount, 1);

    const totalSeconds = attempts.reduce((acc, c) => acc + (c.time_spent_seconds || 0), 0);
    const totalStudyMins = Math.round(totalSeconds / 60);
    const avgStudyMinsPerUser = safeAvg(totalStudyMins, activeUsersCount, 1);

    // Estimated sessions
    const totalSessions = Math.max(Math.ceil(totalQuestions / 8), activeUsersCount);
    const sessionsPerUser = safeAvg(totalSessions, activeUsersCount, 1);

    // AI Tutor Interactions per active user
    const aiInteractions = aiJobs.length;
    const aiUsesPerUser = safeAvg(aiInteractions, activeUsersCount, 1);

    // Active Days Distribution
    const userActiveDaysMap: Record<string, Set<string>> = {};
    attempts.forEach((a) => {
      const uId = a.user_id || 'unknown';
      const dateStr = new Date(a.created_at).toISOString().slice(0, 10);
      if (!userActiveDaysMap[uId]) userActiveDaysMap[uId] = new Set();
      userActiveDaysMap[uId].add(dateStr);
    });

    const activeDaysCounts = Object.values(userActiveDaysMap).map((set) => set.size);
    const avgActiveDays = safeAvg(activeDaysCounts.reduce((sum, c) => sum + c, 0), activeDaysCounts.length || 1, 1);

    return NextResponse.json({
      success: true,
      metrics: {
        totalSessions,
        sessionsPerUser,
        totalStudyMins,
        avgStudyMinsPerUser,
        totalQuestions,
        questionsPerUser,
        aiInteractions,
        aiUsesPerUser,
        activeUsersCount,
        avgActiveDays,
      },
    });
  } catch (error: any) {
    console.error('Error fetching engagement analytics:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
