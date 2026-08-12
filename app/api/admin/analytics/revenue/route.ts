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

    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(timeframe, customStart, customEnd);

    // 1. Fetch Current Period Payments
    const { data: currPayments } = await adminClient
      .from('payments')
      .select('id, amount, currency, status, created_at, plan_id, user_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // 2. Fetch Previous Period Payments
    const { data: prevPayments } = await adminClient
      .from('payments')
      .select('id, amount, currency, status, created_at')
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString());

    const cPay = currPayments || [];
    const pPay = prevPayments || [];

    const successfulCurrPay = cPay.filter(p => p.status === 'captured' || p.status === 'completed' || p.status === 'success');
    const successfulPrevPay = pPay.filter(p => p.status === 'captured' || p.status === 'completed' || p.status === 'success');

    const grossRevenue = successfulCurrPay.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const prevGrossRevenue = successfulPrevPay.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const refundsCurr = cPay.filter(p => p.status === 'refunded');
    const refundAmount = refundsCurr.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const netRevenue = Math.max(0, grossRevenue - refundAmount);

    const successfulPaymentsCount = successfulCurrPay.length;
    const avgTransactionValue = safeAvg(grossRevenue, successfulPaymentsCount, 2);

    // Unique paying users for ARPU
    const uniquePayingUsers = new Set(successfulCurrPay.map(p => p.user_id)).size;
    const arpu = safeAvg(grossRevenue, uniquePayingUsers || 1, 2);

    // 3. Subscriptions
    const { data: subsData } = await adminClient.from('subscriptions').select('id, status, plan_id, created_at');
    const allSubs = subsData || [];

    const activeSubs = allSubs.filter(s => s.status === 'active').length;
    const newSubs = allSubs.filter(s => new Date(s.created_at) >= startDate && new Date(s.created_at) <= endDate).length;
    const prevNewSubs = allSubs.filter(s => new Date(s.created_at) >= prevStartDate && new Date(s.created_at) <= prevEndDate).length;
    const cancelledSubs = allSubs.filter(s => s.status === 'cancelled' || s.status === 'expired').length;

    // Period Comparisons
    const revenueChange = calcPercentChange(grossRevenue, prevGrossRevenue);
    const subscriptionChange = calcPercentChange(newSubs, prevNewSubs);
    const paymentChange = calcPercentChange(successfulPaymentsCount, successfulPrevPay.length);

    // Plan breakdown
    const planRevenueMap: Record<string, number> = {};
    successfulCurrPay.forEach((p) => {
      const pName = p.plan_id || 'Pro Plan';
      planRevenueMap[pName] = (planRevenueMap[pName] || 0) + (Number(p.amount) || 0);
    });

    const revenueByPlan = Object.entries(planRevenueMap).map(([plan, amount]) => ({
      plan,
      amount,
    }));

    return NextResponse.json({
      success: true,
      metrics: {
        grossRevenue,
        netRevenue,
        refundAmount,
        successfulPaymentsCount,
        refundsCount: refundsCurr.length,
        avgTransactionValue,
        arpu,
        activeSubs,
        newSubs,
        cancelledSubs,
      },
      comparison: {
        revenueChange,
        subscriptionChange,
        paymentChange,
      },
      revenueByPlan,
    });
  } catch (error: any) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
