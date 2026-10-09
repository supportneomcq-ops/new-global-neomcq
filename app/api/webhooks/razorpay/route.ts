import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getPlanByCode, PlanCode } from '@/lib/plans/plan-config';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      );
    }

    if (!secret) {
      console.error('Razorpay webhook verification is not configured.');
      return NextResponse.json({ error: 'Webhook verification is temporarily unavailable.' }, { status: 503 });
    }

    // Webhooks must always have a valid HMAC signature; never fail open when configuration is missing.
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const isSignatureValid =
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf);

    if (!isSignatureValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id || `evt_${Date.now()}`;
    const eventType = event.event;
    const payload = event.payload;

    const admin = getSupabaseAdmin();

    let subscriptionPlan: { id: string; price_inr: number; price_usd: number } | null = null;
    if (plan) {
      const { data: dbPlan, error: dbPlanError } = await admin
        .from('subscription_plans')
        .select('id, price_inr, price_usd')
        .eq('slug', plan.code.toLowerCase())
        .eq('is_active', true)
        .maybeSingle();

      if (dbPlanError || !dbPlan) {
        console.error('Webhook could not resolve the active subscription plan:', dbPlanError);
        return NextResponse.json({ error: 'Subscription plan could not be verified.' }, { status: 500 });
      }
      subscriptionPlan = dbPlan;
    }

    // 1. STRICT IDEMPOTENCY CHECK via webhook_events table
    const { data: existingEvent } = await admin
      .from('webhook_events')
      .select('id, status')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingEvent && existingEvent.status === 'processed') {
      return NextResponse.json({
        status: 'success',
        message: 'Event already processed (idempotent duplicate skipped)',
      });
    }

    // Record receipt of webhook event
    await admin.from('webhook_events').upsert(
      {
        event_id: eventId,
        event_type: eventType,
        entity_id: payload?.payment?.entity?.id || payload?.subscription?.entity?.id || null,
        status: 'processing',
        payload: event,
        received_at: new Date().toISOString(),
      },
      { onConflict: 'event_id' }
    );

    const paymentEntity = payload?.payment?.entity;
    const subscriptionEntity = payload?.subscription?.entity;
    const paymentId = paymentEntity?.id;
    const subscriptionId = subscriptionEntity?.id || paymentEntity?.subscription_id;

    const userId =
      paymentEntity?.notes?.user_id ||
      subscriptionEntity?.notes?.user_id ||
      payload?.order?.entity?.notes?.user_id;

    const rawPlanCode =
      paymentEntity?.notes?.plan_code ||
      subscriptionEntity?.notes?.plan_code ||
      payload?.order?.entity?.notes?.plan_code;

    const planCode = rawPlanCode ? (rawPlanCode.toUpperCase() as PlanCode) : null;
    const plan = getPlanByCode(planCode);

    const isExamSwitch =
      paymentEntity?.notes?.type === 'exam_switch' ||
      !!paymentEntity?.notes?.to_exam_id;
    const toExamId = paymentEntity?.notes?.to_exam_id;
    const fromExamId = paymentEntity?.notes?.from_exam_id;

    // =========================================================================
    // 2. EVENT ROUTING & PROCESSING
    // =========================================================================

    if (eventType === 'subscription.activated' || eventType === 'subscription.authenticated') {
      if (userId && plan && subscriptionPlan) {
        const { data: pendingSub, error: pendingSubError } = await admin
          .from('subscriptions')
          .select('plan_code, status, currency, amount, razorpay_subscription_id')
          .eq('user_id', userId)
          .maybeSingle();

        const matchesPendingCheckout =
          !pendingSubError &&
          !!pendingSub &&
          pendingSub.plan_code === plan.code &&
          pendingSub.razorpay_subscription_id === subscriptionId &&
          ['pending', 'active'].includes(pendingSub.status);

        if (!matchesPendingCheckout) {
          console.warn('[Razorpay webhook] Ignoring activation without a matching pending checkout.', {
            userId,
            subscriptionId,
            planCode: plan.code,
          });
        } else {
          const startDate = new Date();
          const endDate = new Date(startDate);
          if (plan.annual) {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else {
            endDate.setMonth(endDate.getMonth() + 1);
          }

          const currency = pendingSub.currency || paymentEntity?.currency || 'INR';
          const amount = Number(pendingSub.amount ?? (currency === 'INR' ? subscriptionPlan.price_inr : subscriptionPlan.price_usd));
          const { error: activationError } = await admin.from('subscriptions').upsert(
            {
              user_id: userId,
              plan_id: subscriptionPlan.id,
              plan_code: plan.code,
              status: 'active',
              razorpay_subscription_id: subscriptionId,
              razorpay_customer_id: subscriptionEntity?.customer_id || null,
              razorpay_plan_id: subscriptionEntity?.plan_id || null,
              currency,
              amount,
              started_at: startDate.toISOString(),
              current_period_start: startDate.toISOString(),
              current_period_end: endDate.toISOString(),
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

          if (activationError) throw activationError;

          if (plan.code === 'ELITE') {
            await admin.from('profiles').update({ exam_locked: false }).eq('id', userId);
          }
        }
      }
    } else if (eventType === 'subscription.charged') {
      if (userId && plan && subscriptionPlan) {
        const { data: pendingSub, error: pendingSubError } = await admin
          .from('subscriptions')
          .select('plan_code, status, currency, amount, razorpay_subscription_id')
          .eq('user_id', userId)
          .maybeSingle();

        const matchesPendingCheckout =
          !pendingSubError &&
          !!pendingSub &&
          pendingSub.plan_code === plan.code &&
          pendingSub.razorpay_subscription_id === subscriptionId &&
          ['pending', 'active'].includes(pendingSub.status);

        if (!matchesPendingCheckout) {
          console.warn('[Razorpay webhook] Ignoring charge without a matching subscription.', {
            userId,
            subscriptionId,
            planCode: plan.code,
          });
        } else {
          const periodEndTimestamp = subscriptionEntity?.current_end
            ? new Date(subscriptionEntity.current_end * 1000).toISOString()
            : new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString();

          const { error: chargeUpdateError } = await admin.from('subscriptions').upsert(
            {
              user_id: userId,
              plan_id: subscriptionPlan.id,
              plan_code: plan.code,
              status: 'active',
              razorpay_subscription_id: subscriptionId,
              currency: pendingSub.currency || paymentEntity?.currency || 'INR',
              amount: Number(pendingSub.amount ?? (pendingSub.currency === 'USD' ? subscriptionPlan.price_usd : subscriptionPlan.price_inr)),
              current_period_end: periodEndTimestamp,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

          if (chargeUpdateError) throw chargeUpdateError;

          if (paymentId) {
            const paymentCurrency = paymentEntity?.currency || pendingSub.currency || 'INR';
            const paymentAmount = paymentEntity?.amount != null
              ? Number(paymentEntity.amount) / 100
              : Number(pendingSub.amount ?? (paymentCurrency === 'USD' ? subscriptionPlan.price_usd : subscriptionPlan.price_inr));
            const { error: paymentRecordError } = await admin.from('payments').upsert(
              {
                user_id: userId,
                razorpay_payment_id: paymentId,
                razorpay_order_id: paymentEntity?.order_id || null,
                amount: paymentAmount,
                currency: paymentCurrency,
                status: 'captured',
                webhook_payload: event,
              },
              { onConflict: 'razorpay_payment_id' }
            );
            if (paymentRecordError) throw paymentRecordError;
          }
        }
      }
    } else if (eventType === 'subscription.cancelled') {
      if (userId) {
        await admin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancel_at_period_end: true,
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }
    } else if (eventType === 'subscription.paused' || eventType === 'subscription.halted') {
      if (userId) {
        await admin
          .from('subscriptions')
          .update({
            status: eventType === 'subscription.paused' ? 'paused' : 'halted',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }
    } else if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const amount = (paymentEntity?.amount || 0) / 100;
      const currency = paymentEntity?.currency || 'USD';

      if (userId) {
        // Record payment
        if (paymentId) {
          await admin.from('payments').upsert(
            {
              user_id: userId,
              razorpay_payment_id: paymentId,
              razorpay_order_id: paymentEntity?.order_id || null,
              amount,
              currency,
              status: 'captured',
              webhook_payload: event,
            },
            { onConflict: 'razorpay_payment_id' }
          );
        }

        // Exam Switch handling
        if (isExamSwitch && toExamId) {
          try {
            await admin.rpc('execute_exam_switch_atomic', {
              p_user_id: userId,
              p_switch_request_id: null,
              p_razorpay_payment_id: paymentId,
              p_razorpay_order_id: paymentEntity?.order_id || null,
              p_razorpay_signature: null,
              p_amount: amount,
              p_currency: currency,
            });

            await admin
              .from('profiles')
              .update({
                current_exam_id: toExamId,
                exam_locked: true,
                exam_selected_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);

            await admin.from('user_exams').upsert(
              {
                user_id: userId,
                exam_id: toExamId,
                status: 'in_progress',
              },
              { onConflict: 'user_id,exam_id' }
            );

            if (fromExamId) {
              await admin.from('exam_switch_history').insert({
                user_id: userId,
                from_exam_id: fromExamId,
                to_exam_id: toExamId,
                amount,
                currency,
                payment_reference: paymentId,
                switched_at: new Date().toISOString(),
              });
            }
          } catch (switchErr) {
            console.error('Webhook atomic exam switch error:', switchErr);
          }
        }

        // Standard subscription purchase via direct order: require the exact server-created checkout.
        if (plan && !isExamSwitch && subscriptionPlan) {
          const checkoutOrderId = paymentEntity?.order_id || payload?.order?.entity?.id || null;
          const { data: pendingSub, error: pendingSubError } = await admin
            .from('subscriptions')
            .select('plan_code, status, currency, amount, razorpay_subscription_id')
            .eq('user_id', userId)
            .maybeSingle();

          const matchesPendingCheckout =
            !pendingSubError &&
            !!pendingSub &&
            pendingSub.plan_code === plan.code &&
            pendingSub.razorpay_subscription_id === checkoutOrderId &&
            ['pending', 'active'].includes(pendingSub.status);

          if (!matchesPendingCheckout) {
            console.warn('[Razorpay webhook] Ignoring order payment without a matching pending checkout.', {
              userId,
              checkoutOrderId,
              planCode: plan.code,
            });
          } else {
            const startDate = new Date();
            const endDate = new Date(startDate);
            if (plan.annual) {
              endDate.setFullYear(endDate.getFullYear() + 1);
            } else {
              endDate.setMonth(endDate.getMonth() + 1);
            }

            const subscriptionCurrency = pendingSub.currency || currency || 'INR';
            const subscriptionAmount = Number(
              pendingSub.amount ??
              (subscriptionCurrency === 'INR' ? subscriptionPlan.price_inr : subscriptionPlan.price_usd)
            );
            const { error: activationError } = await admin.from('subscriptions').upsert(
              {
                user_id: userId,
                plan_id: subscriptionPlan.id,
                plan_code: plan.code,
                status: 'active',
                razorpay_subscription_id: checkoutOrderId,
                razorpay_payment_id: paymentId,
                currency: subscriptionCurrency,
                amount: subscriptionAmount,
                started_at: startDate.toISOString(),
                current_period_start: startDate.toISOString(),
                current_period_end: endDate.toISOString(),
                cancel_at_period_end: false,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );

            if (activationError) throw activationError;

            if (plan.code === 'ELITE') {
              await admin.from('profiles').update({ exam_locked: false }).eq('id', userId);
            }
          }
        }
      }
    } else if (eventType === 'payment.failed') {
      if (userId && paymentId) {
        await admin.from('payments').upsert(
          {
            user_id: userId,
            razorpay_payment_id: paymentId,
            amount: (paymentEntity?.amount || 0) / 100,
            currency: paymentEntity?.currency || 'USD',
            status: 'failed',
            webhook_payload: event,
          },
          { onConflict: 'razorpay_payment_id' }
        );

        await admin.from('notifications').insert({
          user_id: userId,
          title: 'Payment Attempt Failed',
          message: 'Your recent payment attempt could not be processed. Please verify your card details or try a different payment method.',
          type: 'error',
          metadata: { paymentId },
        });
      }
    }

    // 3. Mark webhook as processed
    await admin
      .from('webhook_events')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId);

    return NextResponse.json({ success: true, event: eventType });
  } catch (error: any) {
    console.error('Razorpay Webhook Error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
