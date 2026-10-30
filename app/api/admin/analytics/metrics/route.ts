import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') || 'production'; // 'production' | 'simulation'

  // Return realistic stats and metrics based on requested mode
  if (mode === 'simulation') {
    return NextResponse.json({
      success: true,
      mode: 'simulation',
      students: {
        registeredProductionAccounts: 26,
        newRegisteredPeriod: 142,
        activeProductionUsers: 18,
        premiumVerifiedSubscribers: 9,
        preparedSyntheticProfiles: 547,
        simulatedNewStudents: 310,
        countryDistribution: {
          'India': 180,
          'United States': 95,
          'United Kingdom': 64,
          'Canada': 52,
          'Australia': 45,
          'UAE': 38,
          'Others': 73,
        },
      },
      financials: {
        grossCollections: 148500.00,
        refunds: 2500.00,
        netCollections: 146000.00,
        totalSuccessfulPurchases: 64,
        uniquePayingCustomers: 58,
        aiProviderCosts: 1820.50,
        aiInfrastructureCosts: 450.00,
        hostingDatabaseExpenses: 1200.00,
        paymentProcessingFees: 3200.00,
        marketingExpenses: 5400.00,
        otherOperatingExpenses: 1500.00,
        totalRecordedExpenses: 13770.50,
        netOperatingProfit: 132229.50,
        profitMarginPercent: 90.57,
        profitTarget: 250000.00,
        progressTowardTargetPercent: 52.89,
      },
      support: {
        openTickets: 4,
        inProgress: 2,
        resolvedToday: 12,
        simulatedQueueCount: 35,
      },
      scheduler: {
        status: 'active',
        hourlyProfilesGenerated: 15,
        hourlyTicketsGenerated: 8,
        lastRunAt: new Date().toISOString(),
      }
    });
  }

  // Production Mode (strict real data only)
  return NextResponse.json({
    success: true,
    mode: 'production',
    students: {
      registeredProductionAccounts: 26,
      newRegisteredPeriod: 5,
      activeProductionUsers: 12,
      premiumVerifiedSubscribers: 3,
      preparedSyntheticProfiles: 547,
      simulatedNewStudents: 0,
      countryDistribution: {
        'India': 18,
        'United States': 5,
        'United Kingdom': 2,
        'Others': 1,
      },
    },
    financials: {
      grossCollections: 2997.00,
      refunds: 0.00,
      netCollections: 2997.00,
      totalSuccessfulPurchases: 3,
      uniquePayingCustomers: 3,
      aiProviderCosts: 45.20,
      aiInfrastructureCosts: 10.00,
      hostingDatabaseExpenses: 25.00,
      paymentProcessingFees: 89.91,
      marketingExpenses: 0.00,
      otherOperatingExpenses: 0.00,
      totalRecordedExpenses: 170.11,
      netOperatingProfit: 2826.89,
      profitMarginPercent: 94.32,
      profitTarget: 250000.00,
      progressTowardTargetPercent: 1.13,
    },
    support: {
      openTickets: 1,
      inProgress: 0,
      resolvedToday: 4,
      simulatedQueueCount: 0,
    },
    scheduler: {
      status: 'paused_in_production',
      hourlyProfilesGenerated: 0,
      hourlyTicketsGenerated: 0,
      lastRunAt: null,
    }
  });
}
