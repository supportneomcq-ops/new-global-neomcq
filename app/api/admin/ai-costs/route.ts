import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminApiSession } from '@/lib/admin-auth'

function round(value: number, digits = 4) {
  return Number(value.toFixed(digits))
}

// GET: auditable AI COGS, 20/20/60 allocation, FX and reservation health.
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const admin = getSupabaseAdmin() as any
    const { searchParams } = new URL(req.url)
    const requestedTimeframe = searchParams.get('timeframe') || '30d'
    const timeframe = ['today', '7d', '30d', '90d'].includes(requestedTimeframe)
      ? requestedTimeframe
      : '30d'

    const startDate = new Date()
    if (timeframe === 'today') {
      startDate.setHours(0, 0, 0, 0)
    } else {
      const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30
      startDate.setDate(startDate.getDate() - days)
    }

    const [
      budgetStatusResult,
      allocationsResult,
      costEventsResult,
      jobsResult,
      reservationsResult,
    ] = await Promise.all([
      admin.rpc('get_platform_ai_budget_status'),
      admin
        .from('platform_profit_allocations')
        .select('currency,allocation_status,payment_category,net_collected_amount,owner_profit_amount,operations_amount,ai_budget_amount,ai_budget_amount_usd,created_at')
        .gte('created_at', startDate.toISOString()),
      admin
        .from('ai_cost_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(500),
      admin
        .from('ai_jobs')
        .select('id,task,status,created_at')
        .gte('created_at', startDate.toISOString()),
      admin
        .from('ai_budget_reservations')
        .select('id,task_type,provider,model,reserved_amount_usd,actual_cost_usd,status,created_at,metadata')
        .in('status', ['reserved', 'uncertain'])
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    const queryErrors = [
      budgetStatusResult.error,
      allocationsResult.error,
      costEventsResult.error,
      jobsResult.error,
      reservationsResult.error,
    ].filter(Boolean)

    if (queryErrors.length) {
      console.error('[Admin AI Costs] Failed to load financial records:', queryErrors)
      return NextResponse.json(
        { success: false, error: 'AI financial records could not be loaded consistently.' },
        { status: 503 }
      )
    }

    const budget = budgetStatusResult.data || {}
    const allocations = allocationsResult.data || []
    const costEvents = costEventsResult.data || []
    const jobs = jobsResult.data || []
    const reservations = reservationsResult.data || []

    const fundedAiBudgetUsd = Number(budget.funded_ai_budget_usd || 0)
    const eligibleNetRevenueUsd = Number(budget.eligible_net_revenue_usd || 0)
    const providerSpendUsd = Number(budget.provider_spend_usd || 0)
    const infrastructureSpendUsd = Number(budget.infrastructure_spend_usd || 0)
    const totalSpendUsd = Number(budget.total_spend_usd || providerSpendUsd + infrastructureSpendUsd)
    const heldBudgetUsd = Number(budget.held_budget_usd || 0)
    const availableBudgetUsd = Number(budget.available_budget_usd || 0)
    const aiCostRatioPercent = eligibleNetRevenueUsd > 0
      ? (totalSpendUsd / eligibleNetRevenueUsd) * 100
      : 0
    const grossMarginPercent = eligibleNetRevenueUsd > 0
      ? ((eligibleNetRevenueUsd - totalSpendUsd) / eligibleNetRevenueUsd) * 100
      : 0

    let budgetHealth: 'Normal' | 'Caution' | 'Critical' = 'Normal'
    if (availableBudgetUsd < 0 || aiCostRatioPercent > 55) {
      budgetHealth = 'Critical'
    } else if (
      aiCostRatioPercent > 50
      || (fundedAiBudgetUsd > 0 && availableBudgetUsd / fundedAiBudgetUsd < 0.10)
      || Number(budget.uncertain_reservations || 0) > 0
    ) {
      budgetHealth = 'Caution'
    }

    let timeframeAiBudgetUsd = 0
    let timeframeNetRevenueUsd = 0
    const allocationByCurrency: Record<string, {
      paymentCount: number
      statuses: Record<string, number>
      netCollected: number
      ownerProfit: number
      operations: number
      aiBudget: number
      aiBudgetUsd: number
    }> = {}

    for (const allocation of allocations) {
      const currency = String(allocation.currency || 'UNKNOWN').toUpperCase()
      const status = String(allocation.allocation_status || 'unknown')
      if (!allocationByCurrency[currency]) {
        allocationByCurrency[currency] = {
          paymentCount: 0,
          statuses: {},
          netCollected: 0,
          ownerProfit: 0,
          operations: 0,
          aiBudget: 0,
          aiBudgetUsd: 0,
        }
      }
      const row = allocationByCurrency[currency]
      row.paymentCount += 1
      row.statuses[status] = (row.statuses[status] || 0) + 1
      row.netCollected += Number(allocation.net_collected_amount || 0)
      row.ownerProfit += Number(allocation.owner_profit_amount || 0)
      row.operations += Number(allocation.operations_amount || 0)
      row.aiBudget += Number(allocation.ai_budget_amount || 0)
      row.aiBudgetUsd += Number(allocation.ai_budget_amount_usd || 0)

      if (status === 'allocated' && allocation.ai_budget_amount_usd != null) {
        timeframeAiBudgetUsd += Number(allocation.ai_budget_amount_usd)
      }
    }
    timeframeNetRevenueUsd = timeframeAiBudgetUsd / 0.60

    let timeframeProviderCostUsd = 0
    let timeframeInfrastructureCostUsd = 0
    let totalCreditsDeducted = 0
    const costByProvider: Record<string, number> = {}
    const costByModel: Record<string, number> = {}
    const costByTask: Record<string, number> = {}

    for (const event of costEvents) {
      const providerCost = Number(event.actual_provider_cost || 0)
      const infrastructureCost = Number(event.ai_infrastructure_cost || 0)
      const credits = Number(event.credits_deducted || 0)
      const provider = String(event.provider || 'unknown')
      const model = String(event.model || 'unknown')
      const task = String(event.task_type || 'unknown')

      timeframeProviderCostUsd += providerCost
      timeframeInfrastructureCostUsd += infrastructureCost
      totalCreditsDeducted += credits
      costByProvider[provider] = (costByProvider[provider] || 0) + providerCost + infrastructureCost
      costByModel[model] = (costByModel[model] || 0) + providerCost + infrastructureCost
      costByTask[task] = (costByTask[task] || 0) + providerCost + infrastructureCost
    }

    return NextResponse.json({
      success: true,
      timeframe,
      rule60: {
        effectiveRevenueUsd: round(eligibleNetRevenueUsd, 2),
        aiBudgetAllowanceUsd: round(fundedAiBudgetUsd, 6),
        totalActualCogsUsd: round(totalSpendUsd, 6),
        providerCostUsd: round(providerSpendUsd, 6),
        infrastructureCostUsd: round(infrastructureSpendUsd, 6),
        reservedBudgetUsd: round(heldBudgetUsd, 6),
        remainingAiBudgetUsd: round(availableBudgetUsd, 6),
        aiCostRatioPercent: round(aiCostRatioPercent, 2),
        grossMarginPercent: round(grossMarginPercent, 2),
        ownerShareUsd: round(Number(budget.owner_share_usd || 0), 6),
        operationsShareUsd: round(Number(budget.operations_share_usd || 0), 6),
        budgetHealth,
        ruleTarget: '20% Owner / 20% Operations / 60% AI Budget of net collected revenue',
      },
      allocation: {
        timeframeNetRevenueUsd: round(timeframeNetRevenueUsd, 2),
        timeframeAiBudgetUsd: round(timeframeAiBudgetUsd, 6),
        pendingFxAllocations: Number(budget.pending_fx_allocations || 0),
        pendingSettlementAllocations: Number(budget.pending_settlement_allocations || 0),
        byCurrency: Object.fromEntries(Object.entries(allocationByCurrency).map(([currency, row]) => [
          currency,
          {
            ...row,
            netCollected: round(row.netCollected, 2),
            ownerProfit: round(row.ownerProfit, 2),
            operations: round(row.operations, 2),
            aiBudget: round(row.aiBudget, 2),
            aiBudgetUsd: round(row.aiBudgetUsd, 6),
          },
        ])),
        summary: budget.allocation_breakdown || [],
      },
      fx: {
        latestRates: budget.latest_fx_rates || [],
        source: 'Frankfurter v2 blended daily reference rates',
      },
      reservations: {
        activeCount: Number(budget.active_reservations || 0),
        uncertainCount: Number(budget.uncertain_reservations || 0),
        heldBudgetUsd: round(heldBudgetUsd, 6),
        recent: reservations,
      },
      metrics: {
        totalCostEvents: costEvents.length,
        totalJobsLogged: jobs.length,
        totalCreditsDeducted,
        timeframeProviderCostUsd: round(timeframeProviderCostUsd, 6),
        timeframeInfrastructureCostUsd: round(timeframeInfrastructureCostUsd, 6),
        timeframeCogsUsd: round(timeframeProviderCostUsd + timeframeInfrastructureCostUsd, 6),
        avgCostPerEventUsd: costEvents.length > 0
          ? round((timeframeProviderCostUsd + timeframeInfrastructureCostUsd) / costEvents.length, 6)
          : 0,
      },
      breakdowns: {
        byProvider: Object.fromEntries(Object.entries(costByProvider).map(([key, value]) => [key, round(value, 6)])),
        byModel: Object.fromEntries(Object.entries(costByModel).map(([key, value]) => [key, round(value, 6)])),
        byTask: Object.fromEntries(Object.entries(costByTask).map(([key, value]) => [key, round(value, 6)])),
      },
      recentEvents: costEvents.slice(0, 15),
    })
  } catch (error: any) {
    console.error('[Admin AI Costs] Unexpected failure:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error' },
      { status: 500 }
    )
  }
}
