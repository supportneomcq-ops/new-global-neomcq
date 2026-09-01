import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getServerUserEntitlements } from '@/lib/entitlements/server-entitlements';
import { getPlanByCode, PlanCode } from '@/lib/plans/plan-config';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Query active or recent subscription
    const { data: sub } = await admin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    // Query recent payments
    const { data: payments } = await admin
      .from('payments')
      .select('id, razorpay_payment_id, amount, currency, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const entitlements = await getServerUserEntitlements(user.id);
    const plan = entitlements.isPaid ? getPlanByCode(entitlements.planCode as PlanCode) : null;

    return NextResponse.json({
      success: true,
      subscription: sub || null,
      plan: plan || null,
      entitlements,
      payments: payments || [],
    });
  } catch (err: any) {
    console.error('Error in /api/subscriptions/me:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch subscription data' },
      { status: 500 }
    );
  }
}
