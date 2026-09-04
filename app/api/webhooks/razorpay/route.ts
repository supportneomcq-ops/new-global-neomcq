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

    // Verify webhook HMAC SHA256 signature if secret is set
    if (secret) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      const sigBuf = Buffer.from(signature);
      const expectedBuf = Buffer.from(expectedSignature);

      const isSignatureValid =
        sigBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(sigBuf, expectedBuf);

      if (!isSignatureValid && process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id || `evt_${Date.now()}`;
    const eventType = event.event;
    const payload = event.payload;

    const admin = getSupabaseAdmin();

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
      if (userId && plan) {
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (plan.annual) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        await admin.from('subscriptions').upsert(
          {
            user_id: userId,
            plan_code: plan.code,
            status: 'active',
            razorpay_subscription_id: subscriptionId,
            razorpay_customer_id: subscriptionEntity?.customer_id || null,
            razorpay_plan_id: subscriptionEntity?.plan_id || null,
            currency: 'USD',
            amount: plan.price_usd,
            started_at: startDate.toISOString(),
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (plan.code === 'ELITE') {
          await admin.from('profiles').update({ exam_locked: false }).eq('id', userId);
        }
      }
    } else if (eventType === 'subscription.charged') {
      if (userId && plan) {
        const periodEndTimestamp = subscriptionEntity?.current_end
          ? new Date(subscriptionEntity.current_end * 1000).toISOString()
          : new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString();

        await admin.from('subscriptions').upsert(
          {
            user_id: userId,
            plan_code: plan.code,
            status: 'active',
            razorpay_subscription_id: subscriptionId,
            current_period_end: periodEndTimestamp,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (paymentId) {
          await admin.from('payments').upsert(
            {
              user_id: userId,
              razorpay_payment_id: paymentId,
              razorpay_order_id: paymentEntity?.order_id || null,
              amount: plan.price_usd,
              currency: 'USD',
              status: 'captured',
              webhook_payload: event,
            },
            { onConflict: 'razorpay_payment_id' }
          );
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

        // Standard subscription purchase via direct order
        if (plan && !isExamSwitch) {
          const startDate = new Date();
          const endDate = new Date(startDate);
          if (plan.annual) {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else {
            endDate.setMonth(endDate.getMonth() + 1);
          }

          await admin.from('subscriptions').upsert(
            {
              user_id: userId,
              plan_code: plan.code,
              status: 'active',
              razorpay_payment_id: paymentId,
              currency: 'USD',
              amount: plan.price_usd,
              started_at: startDate.toISOString(),
              current_period_start: startDate.toISOString(),
              current_period_end: endDate.toISOString(),
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

          if (plan.code === 'ELITE') {
            await admin.from('profiles').update({ exam_locked: false }).eq('id', userId);
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
