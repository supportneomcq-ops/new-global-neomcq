import { NextResponse } from 'next/server';
import { getPublicPlansConfig } from '@/lib/plans/plan-config';

export async function GET() {
  try {
    const plans = getPublicPlansConfig();
    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (err: any) {
    console.error('Error fetching subscription plans:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch subscription plans' },
      { status: 500 }
    );
  }
}
