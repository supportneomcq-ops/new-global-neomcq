import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { isValidPlanCode, getPlanByCode, PlanCode } from '@/lib/plans/plan-config';
import { getServerUserEntitlements } from '@/lib/entitlements/server-entitlements';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      planCode,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_subscription_id,
      razorpay_signature,
    } = body;

    if (!isValidPlanCode(planCode)) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    if (!razorpay_payment_id || (!razorpay_order_id && !razorpay_subscription_id)) {
      return NextResponse.json(
        { error: 'Missing required payment verification details' },
        { status: 400 }
      );
    }

    const plan = getPlanByCode(planCode as PlanCode);
    if (!plan) {
      return NextResponse.json({ error: 'Plan configuration not found' }, { status: 404 });
    }

    // 1. Signature Verification on Server
    if (razorpay_signature) {
      const isValid = verifyRazorpaySignature({
        orderId: razorpay_order_id,
        subscriptionId: razorpay_subscription_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isValid && process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Payment signature could not be verified. Your subscription has not been activated.' },
          { status: 400 }
        );
      }
    }

    const admin = getSupabaseAdmin();

    // 2. IDEMPOTENCY CHECK: Check if this payment was already recorded
    const { data: existingPayment } = await admin
      .from('payments')
      .select('id, status, user_id')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle();

    if (existingPayment && existingPayment.status === 'captured') {
      const entitlements = await getServerUserEntitlements(user.id);
      return NextResponse.json({
        success: true,
        message: 'Payment already processed and subscription active.',
        isDuplicate: true,
        plan: plan.name,
        entitlements,
      });
    }

    // 3. Compute subscription billing period & resolve currency
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (plan.annual) {
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 full year for ELITE
    } else {
      endDate.setMonth(endDate.getMonth() + 1); // 1 month for PRO / MAX
    }

    // Look up existing pending subscription to preserve order currency & amount
    const { data: pendingSub } = await admin
      .from('subscriptions')
      .select('currency, amount')
      .eq('user_id', user.id)
      .maybeSingle();

    const paymentCurrency = body.currency || pendingSub?.currency || 'USD';
    const paymentAmount =
      pendingSub?.amount || (paymentCurrency === 'INR' ? plan.price_inr : plan.price_usd);

    // 4. Update / Upsert Subscription record
    const { error: subError } = await admin.from('subscriptions').upsert(
      {
        user_id: user.id,
        plan_code: plan.code,
        status: 'active',
        razorpay_subscription_id: razorpay_subscription_id || razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        currency: paymentCurrency,
        amount: paymentAmount,
        started_at: startDate.toISOString(),
        current_period_start: startDate.toISOString(),
        current_period_end: endDate.toISOString(),
        cancel_at_period_end: false,
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (subError) {
      console.error('Error saving active subscription:', subError);
      throw new Error('Database error activating subscription record');
    }

    // 5. Record captured payment in payments table
    await admin.from('payments').upsert(
      {
        user_id: user.id,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_order_id: razorpay_order_id || null,
        amount: paymentAmount,
        currency: paymentCurrency,
        status: 'captured',
        webhook_payload: {
          verified_via: 'client_checkout_verification',
          plan_code: plan.code,
          plan_name: plan.name,
          timestamp: new Date().toISOString(),
        },
      },
      { onConflict: 'razorpay_payment_id' }
    );

    // 6. If user upgraded to ELITE, ensure exam locking does not impede unlimited switching
    if (plan.code === 'ELITE') {
      await admin
        .from('profiles')
        .update({
          exam_locked: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    // 7. Create notification for user
    await admin.from('notifications').insert({
      user_id: user.id,
      title: `${plan.name} Plan Activated!`,
      message: `Your NeoMCQ ${plan.name} membership is now active until ${endDate.toLocaleDateString()}. Thank you for choosing NeoMCQ!`,
      type: 'success',
      metadata: {
        plan_code: plan.code,
        payment_id: razorpay_payment_id,
      },
    });

    const entitlements = await getServerUserEntitlements(user.id);

    return NextResponse.json({
      success: true,
      message: `Successfully activated ${plan.name} subscription!`,
      plan: {
        code: plan.code,
        name: plan.name,
        current_period_end: endDate.toISOString(),
        is_unlimited: plan.is_unlimited,
      },
      entitlements,
    });
  } catch (err: any) {
    console.error('Subscription verification failed:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to verify payment and activate subscription.' },
      { status: 500 }
    );
  }
}
