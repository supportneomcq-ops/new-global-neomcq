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

    const timeframe = searchParams.get('timeframe') || '30d';
    const customStart = searchParams.get('customStart') || undefined;
    const customEnd = searchParams.get('customEnd') || undefined;
    const country = searchParams.get('country');
    const platform = searchParams.get('platform');
    const subscriptionTier = searchParams.get('subscriptionTier');
    const userType = searchParams.get('userType');

    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(timeframe, customStart, customEnd);

    let query = adminClient.from('profiles').select('id, full_name, email, country, created_at, updated_at, subscription_tier, user_type, platform');
    if (country) query = query.eq('country', country);
    if (platform) query = query.eq('platform', platform);
    if (subscriptionTier) query = query.eq('subscription_tier', subscriptionTier);
    if (userType) query = query.eq('user_type', userType);

    const { data: users, error } = await query;
    if (error) throw error;

    const allUsers = users || [];
    const totalUsers = allUsers.length;

    // Time ranges for DAU, WAU, MAU
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dau = allUsers.filter(u => new Date(u.updated_at || u.created_at) >= oneDayAgo).length;
    const wau = allUsers.filter(u => new Date(u.updated_at || u.created_at) >= sevenDaysAgo).length;
    const mau = allUsers.filter(u => new Date(u.updated_at || u.created_at) >= thirtyDaysAgo).length;

    const newUsers = allUsers.filter(u => new Date(u.created_at) >= startDate && new Date(u.created_at) <= endDate).length;
    const prevNewUsers = allUsers.filter(u => new Date(u.created_at) >= prevStartDate && new Date(u.created_at) <= prevEndDate).length;

    const activeUsers = allUsers.filter(u => new Date(u.updated_at || u.created_at) >= startDate).length;
    const returningUsers = allUsers.filter(u => new Date(u.created_at) < startDate && new Date(u.updated_at || u.created_at) >= startDate).length;
    const inactiveUsers = totalUsers - activeUsers;

    // Registration trends grouped by date
    const registrationTrendMap: Record<string, number> = {};
    const activeTrendMap: Record<string, number> = {};

    allUsers.forEach((u) => {
      const cDate = new Date(u.created_at).toISOString().slice(0, 10);
      registrationTrendMap[cDate] = (registrationTrendMap[cDate] || 0) + 1;

      const aDate = new Date(u.updated_at || u.created_at).toISOString().slice(0, 10);
      activeTrendMap[aDate] = (activeTrendMap[aDate] || 0) + 1;
    });

    const registrationTrends = Object.entries(registrationTrendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Geography breakdown
    const countryDistributionMap: Record<string, number> = {};
    allUsers.forEach((u) => {
      const c = u.country || 'Unknown';
      countryDistributionMap[c] = (countryDistributionMap[c] || 0) + 1;
    });

    const countryDistribution = Object.entries(countryDistributionMap)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    // Platform breakdown
    const platformDistributionMap: Record<string, number> = {};
    allUsers.forEach((u) => {
      const p = u.platform || 'Web';
      platformDistributionMap[p] = (platformDistributionMap[p] || 0) + 1;
    });

    const growthComparison = calcPercentChange(newUsers, prevNewUsers);

    return NextResponse.json({
      success: true,
      metrics: {
        totalUsers,
        newUsers,
        growthComparison,
        activeUsers,
        dau,
        wau,
        mau,
        returningUsers,
        inactiveUsers,
      },
      charts: {
        registrationTrends,
        countryDistribution,
        platformDistribution: Object.entries(platformDistributionMap).map(([platform, count]) => ({ platform, count })),
        newVsReturning: [
          { name: 'New Users', value: newUsers },
          { name: 'Returning Users', value: returningUsers },
          { name: 'Inactive Users', value: inactiveUsers },
        ],
      },
    });
  } catch (error: any) {
    console.error('Error fetching user analytics:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
