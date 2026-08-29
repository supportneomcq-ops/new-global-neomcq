import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

// GET: AI Financials, COGS Accounting, and the 60% AI Cost Budget Rule
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const timeframe = searchParams.get('timeframe') || '30d';

    let startDate = new Date();
    if (timeframe === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      // 30d default
      startDate.setDate(startDate.getDate() - 30);
    }

    // Fetch payments for actual realized revenue
    const [paymentsRes, costEventsRes, jobsRes] = await Promise.all([
      adminClient
        .from('payments')
        .select('*')
        .in('status', ['captured', 'succeeded', 'paid', 'completed'])
        .gte('created_at', startDate.toISOString()),
      adminClient
        .from('ai_cost_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),
      adminClient
        .from('ai_jobs')
        .select('*')
        .gte('created_at', startDate.toISOString()),
    ]);

    const payments = paymentsRes.data || [];
    const costEvents = costEventsRes.data || [];
    const jobs = jobsRes.data || [];

    // Calculate Realized Net Eligible Revenue in USD
    // Payments are usually in INR (paise) or USD. Normalize to USD approx: if > 1000 and currency INR, divide by 87
    let totalRevenueUsd = 0;
    payments.forEach((p: any) => {
      const amt = Number(p.amount || 0);
      const cur = (p.currency || 'INR').toUpperCase();
      if (cur === 'INR') {
        totalRevenueUsd += amt > 100 ? (amt / 100) / 87 : amt / 87; // paise or rupees to USD
      } else {
        totalRevenueUsd += amt > 100 ? amt / 100 : amt;
      }
    });

    // If cost events have revenue_allocated from credit packages, incorporate that
    let totalCreditRevenueUsd = 0;
    let totalActualProviderCostUsd = 0;
    let totalInfraCostUsd = 0;
    let totalCreditsDeducted = 0;

    const costByProvider: Record<string, number> = {};
    const costByModel: Record<string, number> = {};
    const costByTask: Record<string, number> = {};

    costEvents.forEach((ev: any) => {
      const pCost = Number(ev.actual_provider_cost || 0);
      const iCost = Number(ev.ai_infrastructure_cost || 0);
      const credits = Number(ev.credits_deducted || 0);
      const rev = Number(ev.revenue_allocated || 0);

      totalActualProviderCostUsd += pCost;
      totalInfraCostUsd += iCost;
      totalCreditsDeducted += credits;
      totalCreditRevenueUsd += rev;

      const provider = ev.provider || 'Google Gemini AI';
      const model = ev.model || 'gemini-3.5-flash';
      const task = ev.task_type || 'MCQ_GENERATION';

      costByProvider[provider] = (costByProvider[provider] || 0) + pCost + iCost;
      costByModel[model] = (costByModel[model] || 0) + pCost + iCost;
      costByTask[task] = (costByTask[task] || 0) + pCost + iCost;
    });

    const totalCogsUsd = totalActualProviderCostUsd + totalInfraCostUsd;
    const effectiveRevenueUsd = Math.max(totalRevenueUsd, totalCreditRevenueUsd);

    // 60% Rule Calculation: AI Cost must be <= 60% of Net Revenue
    const aiBudgetAllowanceUsd = effectiveRevenueUsd * 0.60;
    const remainingAiBudgetUsd = aiBudgetAllowanceUsd - totalCogsUsd;
    const aiCostRatioPercent = effectiveRevenueUsd > 0 ? (totalCogsUsd / effectiveRevenueUsd) * 100 : 0;
    const grossMarginPercent = effectiveRevenueUsd > 0 ? ((effectiveRevenueUsd - totalCogsUsd) / effectiveRevenueUsd) * 100 : 0;

    // Budget Health status
    let budgetHealth: 'Normal' | 'Caution' | 'Critical' = 'Normal';
    if (aiCostRatioPercent > 55) {
      budgetHealth = 'Critical';
    } else if (aiCostRatioPercent > 50) {
      budgetHealth = 'Caution';
    }

    return NextResponse.json({
      success: true,
      timeframe,
      rule60: {
        effectiveRevenueUsd: Number(effectiveRevenueUsd.toFixed(2)),
        aiBudgetAllowanceUsd: Number(aiBudgetAllowanceUsd.toFixed(2)),
        totalActualCogsUsd: Number(totalCogsUsd.toFixed(4)),
        providerCostUsd: Number(totalActualProviderCostUsd.toFixed(4)),
        infrastructureCostUsd: Number(totalInfraCostUsd.toFixed(4)),
        remainingAiBudgetUsd: Number(remainingAiBudgetUsd.toFixed(2)),
        aiCostRatioPercent: Number(aiCostRatioPercent.toFixed(2)),
        grossMarginPercent: Number(grossMarginPercent.toFixed(2)),
        budgetHealth,
        ruleTarget: 'Max 60% AI Cost of Eligible Revenue',
      },
      metrics: {
        totalCostEvents: costEvents.length,
        totalJobsLogged: jobs.length,
        totalCreditsDeducted,
        avgCostPerJobUsd: costEvents.length > 0 ? Number((totalCogsUsd / costEvents.length).toFixed(6)) : 0,
      },
      breakdowns: {
        byProvider: Object.fromEntries(Object.entries(costByProvider).map(([k, v]) => [k, Number(v.toFixed(4))])),
        byModel: Object.fromEntries(Object.entries(costByModel).map(([k, v]) => [k, Number(v.toFixed(4))])),
        byTask: Object.fromEntries(Object.entries(costByTask).map(([k, v]) => [k, Number(v.toFixed(4))])),
      },
      recentEvents: costEvents.slice(0, 15),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
