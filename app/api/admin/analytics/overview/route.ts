import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { getDateRange, calcPercentChange, safeAvg } from '@/lib/analytics-utils';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    // Check if client just wants countries list
    if (searchParams.get('listCountries') === 'true') {
      const { data: countries } = await adminClient
        .from('countries')
        .select('id, name, iso2')
        .order('name', { ascending: true });
      return NextResponse.json({ success: true, countries: countries || [] });
    }

    const timeframe = searchParams.get('timeframe') || '30d';
    const customStart = searchParams.get('customStart') || undefined;
    const customEnd = searchParams.get('customEnd') || undefined;
    const examId = searchParams.get('examId');
    const country = searchParams.get('country');
    const platform = searchParams.get('platform');
    const subscriptionTier = searchParams.get('subscriptionTier');
    const userType = searchParams.get('userType');

    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(timeframe, customStart, customEnd);

    // 1. Fetch Users Metrics
    let userQuery = adminClient.from('profiles').select('id, created_at, updated_at, country, subscription_tier, user_type, platform');
    if (country) userQuery = userQuery.eq('country', country);
    if (platform) userQuery = userQuery.eq('platform', platform);
    if (subscriptionTier) userQuery = userQuery.eq('subscription_tier', subscriptionTier);
    if (userType) userQuery = userQuery.eq('user_type', userType);

    const { data: allUsers } = await userQuery;
    const usersList = allUsers || [];

    const totalUsers = usersList.length;
    const newUsers = usersList.filter(u => new Date(u.created_at) >= startDate && new Date(u.created_at) <= endDate).length;
    const prevNewUsers = usersList.filter(u => new Date(u.created_at) >= prevStartDate && new Date(u.created_at) <= prevEndDate).length;

    const activeUsers = usersList.filter(u => new Date(u.updated_at || u.created_at) >= startDate).length;
    const prevActiveUsers = usersList.filter(u => new Date(u.updated_at || u.created_at) >= prevStartDate && new Date(u.updated_at || u.created_at) < startDate).length;

    const returningUsers = usersList.filter(u => new Date(u.created_at) < startDate && new Date(u.updated_at || u.created_at) >= startDate).length;
    const paidUsers = usersList.filter(u => u.subscription_tier && u.subscription_tier !== 'free').length;

    // 2. MCQ Attempts Metrics
    let mcqQuery = adminClient.from('mcq_attempts').select('id, is_correct, time_spent_seconds, created_at, exam_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (examId) mcqQuery = mcqQuery.eq('exam_id', examId);
    const { data: attempts } = await mcqQuery;
    const attemptsList = attempts || [];

    const questionsAttempted = attemptsList.length;
    const questionsSolved = attemptsList.filter(a => a.is_correct === true).length;
    const averageAccuracy = safeAvg(questionsSolved * 100, questionsAttempted, 1);

    const totalAttemptTimeSecs = attemptsList.reduce((acc, curr) => acc + (curr.time_spent_seconds || 0), 0);
    const studyTimeMins = Math.round(totalAttemptTimeSecs / 60);

    // 3. AI Jobs / Telemetry Metrics
    const { data: aiJobs } = await adminClient.from('ai_jobs').select('id, status, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    const aiRequests = aiJobs?.length || 0;

    // 4. Payments / Revenue Metrics
    let payQuery = adminClient.from('payments').select('amount, status, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .in('status', ['captured', 'completed', 'success']);
    const { data: payments } = await payQuery;
    const totalRevenue = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 5. Active Subscriptions
    const { count: subscriptionCount } = await adminClient.from('subscriptions').select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    // 6. Content Consumption
    const { count: notesCount } = await adminClient.from('notes').select('id', { count: 'exact', head: true });
    const { count: flashcardsCount } = await adminClient.from('flashcards').select('id', { count: 'exact', head: true });
    const { count: revisionSheetsCount } = await adminClient.from('revision_sheets').select('id', { count: 'exact', head: true });
    const totalContentAssets = (notesCount || 0) + (flashcardsCount || 0) + (revisionSheetsCount || 0);

    // Comparison stats
    const newUsersChange = calcPercentChange(newUsers, prevNewUsers);
    const activeUsersChange = calcPercentChange(activeUsers, prevActiveUsers);

    return NextResponse.json({
      success: true,
      timeframe,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      metrics: {
        totalUsers,
        activeUsers,
        activeUsersChange,
        newUsers,
        newUsersChange,
        returningUsers,
        paidUsers,
        learningSessions: Math.max(Math.ceil(questionsAttempted / 10), activeUsers),
        questionsAttempted,
        questionsSolved,
        averageAccuracy,
        studyTimeMins,
        studyTimeHours: safeAvg(studyTimeMins, 60, 1),
        contentConsumption: totalContentAssets,
        aiTutorSessions: Math.round(aiRequests * 0.4),
        aiRequests,
        revenue: totalRevenue,
        subscriptions: subscriptionCount || paidUsers,
        retentionRate: activeUsers && totalUsers ? safeAvg(returningUsers * 100, activeUsers, 1) : 0,
        engagementScore: activeUsers ? safeAvg(questionsAttempted, activeUsers, 1) : 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
