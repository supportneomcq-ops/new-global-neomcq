import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createSubscriptionRazorpayOrder } from '@/lib/razorpay';
import { isValidPlanCode, getPlanByCode, PlanCode, getFormattedPlanPrice } from '@/lib/plans/plan-config';
import { detectServerCountryAndCurrency } from '@/lib/geo';

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

    // Server-side independent country detection
    const geo = await detectServerCountryAndCurrency(req, user.id);
    
    // Determine authoritative currency: if server detects India OR client requested INR & user/req is India
    const authoritativeCurrency: 'INR' | 'USD' =
      geo.isIndia || preferredCurrency === 'INR' && geo.countryCode === 'IN' ? 'INR' : (preferredCurrency === 'INR' && !geo.isIndia ? (geo.countryCode === 'IN' ? 'INR' : 'USD') : (geo.isIndia ? 'INR' : 'USD'));

    const admin = getSupabaseAdmin();

    // The live schema uses a required foreign key to subscription_plans; resolve it before checkout.
    const { data: subscriptionPlan, error: subscriptionPlanError } = await admin
      .from('subscription_plans')
      .select('id, slug, price_inr, price_usd, billing_interval')
      .eq('slug', plan.slug)
      .eq('is_active', true)
      .maybeSingle();

    if (subscriptionPlanError || !subscriptionPlan) {
      console.error('Could not resolve active subscription plan:', subscriptionPlanError);
      return NextResponse.json({ error: 'This subscription plan is temporarily unavailable. Please contact support.' }, { status: 503 });
    }

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
      preferredCurrency: authoritativeCurrency,
    });

    const planAmount = rzpResult.currency === 'INR' ? plan.price_inr : plan.price_usd;
    const formattedPriceObj = getFormattedPlanPrice(plan.code, rzpResult.currency as 'USD' | 'INR');

    // The live subscriptions schema requires both period timestamps even while checkout is pending.
    // Pending status prevents these provisional dates from granting paid entitlements.
    const pendingPeriodStart = new Date();
    const pendingPeriodEnd = new Date(pendingPeriodStart);
    if (plan.annual) {
      pendingPeriodEnd.setFullYear(pendingPeriodEnd.getFullYear() + 1);
    } else {
      pendingPeriodEnd.setMonth(pendingPeriodEnd.getMonth() + 1);
    }

    // Record pending subscription attempt
    const { error: pendingSubscriptionError } = await admin.from('subscriptions').upsert(
      {
        user_id: user.id,
        plan_id: subscriptionPlan.id,
        plan_code: plan.code,
        status: 'pending',
        // Keep the server-created checkout identifier so verification can bind the callback to this user and plan.
        razorpay_subscription_id: rzpResult.subscriptionId || rzpResult.orderId,
        amount: planAmount,
        currency: rzpResult.currency,
        current_period_start: pendingPeriodStart.toISOString(),
        current_period_end: pendingPeriodEnd.toISOString(),
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (pendingSubscriptionError) {
      console.error('Error recording pending subscription:', pendingSubscriptionError);
      throw new Error('Could not securely record the pending checkout. Please try again.');
    }

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
      displayPrice: formattedPriceObj.displayPrice,
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
