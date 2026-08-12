import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const timeframe = searchParams.get('timeframe') || '30d';
    const planFilter = searchParams.get('plan') || 'ALL';
    const currencyFilter = searchParams.get('currency') || 'ALL';
    const paymentStatusFilter = searchParams.get('paymentStatus') || 'ALL';
    const subscriptionStatusFilter = searchParams.get('subscriptionStatus') || 'ALL';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    // Calculate dates
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (timeframe === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeframe === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeframe === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    } else if (timeframe === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (timeframe === 'custom' && customStart) {
      startDate = new Date(customStart);
      if (customEnd) endDate = new Date(customEnd);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }

    // Fetch Payments
    let paymentsQuery = admin
      .from('payments')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (paymentStatusFilter !== 'ALL') {
      paymentsQuery = paymentsQuery.eq('status', paymentStatusFilter);
    }
    if (currencyFilter !== 'ALL') {
      paymentsQuery = paymentsQuery.eq('currency', currencyFilter);
    }

    const { data: rawPayments } = await paymentsQuery;
    const payments = rawPayments || [];

    // Filter by plan if needed
    const filteredPayments = planFilter !== 'ALL'
      ? payments.filter((p: any) => p.plan_id === planFilter || p.plan_name === planFilter)
      : payments;

    // Fetch Subscriptions
    let subsQuery = admin.from('subscriptions').select('*');
    if (subscriptionStatusFilter !== 'ALL') {
      subsQuery = subsQuery.eq('status', subscriptionStatusFilter);
    }
    const { data: rawSubs } = await subsQuery;
    const subscriptions = rawSubs || [];

    // Aggregate key financial metrics
    const successful = filteredPayments.filter((p: any) => p.status === 'captured' || p.status === 'completed');
    const failed = filteredPayments.filter((p: any) => p.status === 'failed');
    const refunds = filteredPayments.filter((p: any) => p.status === 'refunded' || p.status === 'partially_refunded');

    const grossRevenue = successful.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const refundAmount = refunds.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const netRevenue = Math.max(0, grossRevenue - refundAmount);

    const activeSubscriptions = subscriptions.filter((s: any) => s.status === 'active').length;
    const newSubscriptions = subscriptions.filter((s: any) => new Date(s.created_at) >= startDate && new Date(s.created_at) <= endDate).length;
    const cancelledSubscriptions = subscriptions.filter((s: any) => s.status === 'cancelled' || s.status === 'expired').length;
    const trialUsers = subscriptions.filter((s: any) => s.status === 'trial').length;

    const successfulCount = successful.length;
    const avgTransactionValue = successfulCount > 0 ? Number((grossRevenue / successfulCount).toFixed(2)) : 0;

    const uniqueUsers = new Set(successful.map((p: any) => p.user_id)).size;
    const revenuePerUser = uniqueUsers > 0 ? Number((grossRevenue / uniqueUsers).toFixed(2)) : 0;
    const revenuePerSubscriber = activeSubscriptions > 0 ? Number((grossRevenue / activeSubscriptions).toFixed(2)) : 0;

    // Build Chart Data
    // 1. Revenue Over Time (Grouped by date)
    const timeSeriesMap: Record<string, { date: string; gross: number; refunds: number; successful: number; failed: number }> = {};
    
    // Pre-fill days in range for smooth chart
    const tempDate = new Date(startDate);
    while (tempDate <= endDate) {
      const dStr = tempDate.toISOString().split('T')[0];
      timeSeriesMap[dStr] = { date: dStr, gross: 0, refunds: 0, successful: 0, failed: 0 };
      tempDate.setDate(tempDate.getDate() + 1);
    }

    filteredPayments.forEach((p: any) => {
      const dStr = new Date(p.created_at).toISOString().split('T')[0];
      if (!timeSeriesMap[dStr]) {
        timeSeriesMap[dStr] = { date: dStr, gross: 0, refunds: 0, successful: 0, failed: 0 };
      }
      const amt = Number(p.amount) || 0;
      if (p.status === 'captured' || p.status === 'completed') {
        timeSeriesMap[dStr].gross += amt;
        timeSeriesMap[dStr].successful += 1;
      } else if (p.status === 'refunded' || p.status === 'partially_refunded') {
        timeSeriesMap[dStr].refunds += amt;
      } else if (p.status === 'failed') {
        timeSeriesMap[dStr].failed += 1;
      }
    });

    const revenueOverTime = Object.values(timeSeriesMap).sort((a, b) => a.date.localeCompare(b.date));

    // 2. Revenue by Plan
    const planMap: Record<string, number> = {};
    successful.forEach((p: any) => {
      const pKey = p.plan_name || p.plan_id || 'Pro Monthly';
      planMap[pKey] = (planMap[pKey] || 0) + (Number(p.amount) || 0);
    });

    const revenueByPlan = Object.entries(planMap).map(([plan, amount]) => ({
      plan,
      amount,
    }));

    // 3. Revenue by Currency
    const currencyMap: Record<string, number> = {};
    successful.forEach((p: any) => {
      const cKey = p.currency || 'INR';
      currencyMap[cKey] = (currencyMap[cKey] || 0) + (Number(p.amount) || 0);
    });

    const revenueByCurrency = Object.entries(currencyMap).map(([currency, amount]) => ({
      currency,
      amount,
    }));

    return NextResponse.json({
      success: true,
      timeframe,
      metrics: {
        grossRevenue,
        netRevenue,
        refundAmount,
        successfulPayments: successfulCount,
        failedPayments: failed.length,
        refundsCount: refunds.length,
        activeSubscriptions,
        newSubscriptions,
        cancelledSubscriptions,
        trialUsers,
        avgTransactionValue,
        revenuePerUser,
        revenuePerSubscriber,
      },
      charts: {
        revenueOverTime,
        revenueByPlan,
        revenueByCurrency,
        paymentsStatus: [
          { status: 'Captured', count: successfulCount },
          { status: 'Failed', count: failed.length },
          { status: 'Refunded', count: refunds.length },
        ],
        subscriptionTrends: [
          { type: 'Active', count: activeSubscriptions },
          { type: 'New', count: newSubscriptions },
          { type: 'Cancelled', count: cancelledSubscriptions },
          { type: 'Trial', count: trialUsers },
        ],
      },
    });
  } catch (error: any) {
    console.error('Error fetching revenue overview:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
