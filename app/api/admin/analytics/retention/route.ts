import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { safeAvg } from '@/lib/analytics-utils';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const country = searchParams.get('country');
    const subscriptionTier = searchParams.get('subscriptionTier');
    const userType = searchParams.get('userType');

    let userQuery = adminClient.from('profiles').select('id, created_at, updated_at, country, subscription_tier, user_type');
    if (country) userQuery = userQuery.eq('country', country);
    if (subscriptionTier) userQuery = userQuery.eq('subscription_tier', subscriptionTier);
    if (userType) userQuery = userQuery.eq('user_type', userType);

    const { data: users } = await userQuery;
    const allUsers = users || [];

    if (allUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No data available for this period.',
        cohorts: [],
        averageRetention: { day1: 0, day7: 0, day14: 0, day30: 0, day60: 0, day90: 0 },
      });
    }

    // Group users into weekly cohorts based on created_at
    const cohortMap: Record<string, any[]> = {};

    allUsers.forEach((u) => {
      const cDate = new Date(u.created_at);
      // Get week string YYYY-Www
      const startOfYear = new Date(cDate.getFullYear(), 0, 1);
      const weekNum = Math.ceil((((cDate.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
      const cohortKey = `${cDate.getFullYear()}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;

      if (!cohortMap[cohortKey]) cohortMap[cohortKey] = [];
      cohortMap[cohortKey].push(u);
    });

    const cohorts = Object.entries(cohortMap).map(([cohort, members]) => {
      const size = members.length;
      let d1 = 0, d7 = 0, d14 = 0, d30 = 0, d60 = 0, d90 = 0;

      members.forEach((m) => {
        const created = new Date(m.created_at).getTime();
        const lastActive = new Date(m.updated_at || m.created_at).getTime();
        const diffDays = (lastActive - created) / (1000 * 3600 * 24);

        if (diffDays >= 1) d1++;
        if (diffDays >= 7) d7++;
        if (diffDays >= 14) d14++;
        if (diffDays >= 30) d30++;
        if (diffDays >= 60) d60++;
        if (diffDays >= 90) d90++;
      });

      return {
        cohort,
        size,
        day1: safeAvg(d1 * 100, size, 1),
        day7: safeAvg(d7 * 100, size, 1),
        day14: safeAvg(d14 * 100, size, 1),
        day30: safeAvg(d30 * 100, size, 1),
        day60: safeAvg(d60 * 100, size, 1),
        day90: safeAvg(d90 * 100, size, 1),
      };
    }).sort((a, b) => b.cohort.localeCompare(a.cohort)).slice(0, 12);

    // Compute Overall Average Retention
    const avgRetention = {
      day1: safeAvg(cohorts.reduce((sum, c) => sum + c.day1, 0), cohorts.length, 1),
      day7: safeAvg(cohorts.reduce((sum, c) => sum + c.day7, 0), cohorts.length, 1),
      day14: safeAvg(cohorts.reduce((sum, c) => sum + c.day14, 0), cohorts.length, 1),
      day30: safeAvg(cohorts.reduce((sum, c) => sum + c.day30, 0), cohorts.length, 1),
      day60: safeAvg(cohorts.reduce((sum, c) => sum + c.day60, 0), cohorts.length, 1),
      day90: safeAvg(cohorts.reduce((sum, c) => sum + c.day90, 0), cohorts.length, 1),
    };

    return NextResponse.json({
      success: true,
      cohorts,
      averageRetention: avgRetention,
    });
  } catch (error: any) {
    console.error('Error fetching retention analytics:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
