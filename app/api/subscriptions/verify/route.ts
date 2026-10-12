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

    // A missing signature must never be treated as a successful payment, in any environment.
    if (typeof razorpay_signature !== 'string' || !razorpay_signature.trim()) {
      return NextResponse.json(
        { error: 'Payment signature is required. Your subscription has not been activated.' },
        { status: 400 }
      );
    }

    const signatureIsValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      subscriptionId: razorpay_subscription_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!signatureIsValid) {
      return NextResponse.json(
        { error: 'Payment signature could not be verified. Your subscription has not been activated.' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // The live schema requires a valid subscription_plans foreign key.
    const { data: subscriptionPlan, error: subscriptionPlanError } = await admin
      .from('subscription_plans')
      .select('id, slug, price_inr, price_usd, billing_interval')
      .eq('slug', plan.slug)
      .eq('is_active', true)
      .maybeSingle();

    if (subscriptionPlanError || !subscriptionPlan) {
      console.error('Could not resolve subscription plan during verification:', subscriptionPlanError);
      return NextResponse.json({ error: 'The selected plan could not be verified. Please contact support.' }, { status: 503 });
    }

    // Only verify a checkout that this authenticated user initiated for this exact plan.
    const { data: pendingSub, error: pendingSubError } = await admin
      .from('subscriptions')
      .select('plan_code, status, currency, amount, razorpay_subscription_id, razorpay_payment_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (pendingSubError) {
      console.error('Could not load pending subscription:', pendingSubError);
      return NextResponse.json({ error: 'Could not verify checkout. Please contact support if you were charged.' }, { status: 500 });
    }

    const callbackCheckoutId = razorpay_subscription_id || razorpay_order_id;
    const subscriptionCreditReason = razorpay_subscription_id
      ? `Subscription Charge ${razorpay_subscription_id}:${razorpay_payment_id}`
      : `Subscription Activated ${callbackCheckoutId}`;
    const ensureSubscriptionCredits = async () => {
      const { error } = await admin.rpc('credit_adjust', {
        p_user_id: user.id,
        p_amount: 1000,
        p_type: 'SUBSCRIPTION_GRANT',
        p_reason: subscriptionCreditReason,
      });
      if (error) {
        console.error('Verified subscription credit grant failed:', error.message);
        return false;
      }
      return true;
    };

    // The Razorpay webhook can activate a subscription before the browser callback
    // reaches this route. Accept that exact same payment idempotently, but never a
    // different payment or checkout.
    const alreadyActivatedByWebhook = Boolean(
      pendingSub &&
      pendingSub.status === 'active' &&
      pendingSub.plan_code === plan.code &&
      pendingSub.razorpay_subscription_id === callbackCheckoutId &&
      pendingSub.razorpay_payment_id === razorpay_payment_id
    );
    if (
      !pendingSub ||
      (pendingSub.status !== 'pending' && !alreadyActivatedByWebhook) ||
      pendingSub.plan_code !== plan.code ||
      !pendingSub.razorpay_subscription_id ||
      pendingSub.razorpay_subscription_id !== callbackCheckoutId
    ) {
      return NextResponse.json(
        { error: 'This checkout does not match your pending plan. No subscription was activated.' },
        { status: 400 }
      );
    }

    // Confirm payment state, amount, currency, and checkout linkage directly with Razorpay.
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!keyId || !keySecret || keyId.startsWith('mock_')) {
      return NextResponse.json(
        { error: 'Payment verification is temporarily unavailable. Please contact support before retrying a payment.' },
        { status: 503 }
      );
    }

    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`,
      {
        method: 'GET',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
        },
        cache: 'no-store',
      }
    );
    if (!razorpayResponse.ok) {
      console.error('Razorpay payment lookup failed with status:', razorpayResponse.status);
      return NextResponse.json(
        { error: 'Razorpay could not confirm this payment. Please contact support if money was deducted.' },
        { status: 502 }
      );
    }

    const verifiedPayment = await razorpayResponse.json();
    const expectedAmountMinor = Math.round(Number(pendingSub.amount) * 100);
    const checkoutMatches = razorpay_subscription_id
      ? verifiedPayment.subscription_id === razorpay_subscription_id
      : verifiedPayment.order_id === razorpay_order_id;
    if (
      verifiedPayment.status !== 'captured' ||
      verifiedPayment.currency !== pendingSub.currency ||
      Number(verifiedPayment.amount) !== expectedAmountMinor ||
      !checkoutMatches
    ) {
      return NextResponse.json(
        { error: 'Razorpay payment status, amount, currency, or checkout did not match. No subscription was activated.' },
        { status: 400 }
      );
    }

    // 2. IDEMPOTENCY CHECK: a payment already used by another account must never be accepted.
    const { data: existingPayment, error: existingPaymentError } = await admin
      .from('payments')
      .select('id, status, user_id')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle();

    if (existingPaymentError) {
      console.error('Could not check duplicate payment:', existingPaymentError);
      return NextResponse.json({ error: 'Could not verify payment record. Please contact support.' }, { status: 500 });
    }
    if (existingPayment && existingPayment.user_id !== user.id) {
      return NextResponse.json({ error: 'This payment is already associated with another account.' }, { status: 409 });
    }
    if (existingPayment && existingPayment.status === 'captured') {
      const { data: activeSub } = await admin
        .from('subscriptions')
        .select('plan_code, status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (activeSub?.status === 'active' && activeSub.plan_code === plan.code) {
        // Idempotently ensure the credit grant even if a webhook partially failed after
        // recording the payment. credit_adjust deduplicates by the same reference as webhook.
        if (!(await ensureSubscriptionCredits())) {
          return NextResponse.json({
            error: 'Your payment and subscription are verified, but credits are still being finalized. Please retry shortly; do not pay again.',
          }, { status: 503 });
        }
        const entitlements = await getServerUserEntitlements(user.id);
        return NextResponse.json({
          success: true,
          message: 'Payment already processed and subscription active.',
          isDuplicate: true,
          plan: plan.name,
          entitlements,
        });
      }
      return NextResponse.json({ error: 'This payment was recorded but the subscription needs support review.' }, { status: 409 });
    }

    // 3. Compute subscription billing period using server-stored currency and amount.
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (plan.annual) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const paymentCurrency = pendingSub.currency;
    const paymentAmount = Number(pendingSub.amount);

    // 4. Update / Upsert Subscription record
    const { error: subError } = await admin.from('subscriptions').upsert(
      {
        user_id: user.id,
        plan_id: subscriptionPlan.id,
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
    const { error: paymentRecordError } = await admin.from('payments').upsert(
      {
        user_id: user.id,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_order_id: razorpay_order_id || null,
        amount: paymentAmount,
        currency: paymentCurrency,
        status: 'captured',
        webhook_payload: {
          verified_via: 'server_signature_and_razorpay_api',
          plan_code: plan.code,
          plan_name: plan.name,
          timestamp: new Date().toISOString(),
        },
      },
      { onConflict: 'razorpay_payment_id' }
    );
    if (paymentRecordError) {
      console.error('Error recording verified payment:', paymentRecordError);
      throw new Error('Payment was verified but could not be fully recorded. Please contact support; do not pay again.');
    }

    // Grant subscription credits here as well as in the webhook. The database RPC is
    // idempotent with the webhook's reference, so either delivery order grants once.
    if (!(await ensureSubscriptionCredits())) {
      return NextResponse.json({
        error: 'Your payment is verified and your plan is active, but credits are still being finalized. Please retry shortly; do not pay again.',
      }, { status: 503 });
    }

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
