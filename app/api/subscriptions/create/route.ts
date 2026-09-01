import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createSubscriptionRazorpayOrder } from '@/lib/razorpay';
import { isValidPlanCode, getPlanByCode, PlanCode } from '@/lib/plans/plan-config';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { planCode, preferredCurrency } = body;

    if (!isValidPlanCode(planCode)) {
      return NextResponse.json(
        { error: 'Invalid plan selected. Only Pro, Max, and Elite plans are available.' },
        { status: 400 }
      );
    }

    const plan = getPlanByCode(planCode as PlanCode);
    if (!plan) {
      return NextResponse.json({ error: 'Plan configuration not found' }, { status: 404 });
    }

    const admin = getSupabaseAdmin();

    // Fetch user profile
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();

    const userName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Learner';

    // Create Razorpay Order or Subscription server-side
    const rzpResult = await createSubscriptionRazorpayOrder({
      userId: user.id,
      planCode: plan.code,
      userEmail: user.email || profile?.email || '',
      userName,
      preferredCurrency: preferredCurrency === 'INR' ? 'INR' : 'USD',
    });

    // Record pending subscription attempt
    await admin.from('subscriptions').upsert(
      {
        user_id: user.id,
        plan_code: plan.code,
        status: 'pending',
        razorpay_subscription_id: rzpResult.subscriptionId || null,
        amount: plan.price_usd,
        currency: rzpResult.currency,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    return NextResponse.json({
      success: true,
      orderId: rzpResult.orderId,
      subscriptionId: rzpResult.subscriptionId || null,
      amount: rzpResult.amount,
      currency: rzpResult.currency,
      keyId: rzpResult.keyId,
      planCode: plan.code,
      planName: plan.name,
      billingInterval: plan.billing_interval,
      displayPrice: `$${plan.price_usd.toFixed(2)} USD`,
      prefill: {
        name: userName,
        email: user.email || profile?.email || '',
      },
    });
  } catch (err: any) {
    console.error('Error creating subscription order:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initialize subscription checkout' },
      { status: 500 }
    );
  }
}
