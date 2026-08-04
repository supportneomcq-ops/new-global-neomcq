import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'demo_webhook_secret'

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook HMAC SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    // Timing safe comparison in production
    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )

    if (!isSignatureValid && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(rawBody)
    const eventType = event.event
    const payload = event.payload

    const supabase = await createClient()

    // 1. Idempotency Check using razorpay payment id or event id
    const paymentEntity = payload?.payment?.entity
    const paymentId = paymentEntity?.id || event.id

    if (paymentId) {
      const { data: existingPayment } = await (supabase as any)
        .from('payments')
        .select('id, status')
        .eq('razorpay_payment_id', paymentId)
        .single()

      if (existingPayment && (existingPayment as any).status === 'captured') {
        // Already processed - idempotent early return
        return NextResponse.json({
          status: 'success',
          message: 'Event already processed (idempotent duplicate skipped)',
        })
      }
    }

    const userId = paymentEntity?.notes?.user_id || payload?.subscription?.entity?.notes?.user_id
    const planId = paymentEntity?.notes?.plan_id || payload?.subscription?.entity?.notes?.plan_id

    // Handle key Razorpay events
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const amount = (paymentEntity?.amount || 0) / 100 // Convert paise to INR
      const currency = paymentEntity?.currency || 'INR'

      if (userId) {
        // Record or update payment
        await (supabase as any).from('payments').upsert({
          user_id: userId,
          razorpay_payment_id: paymentId,
          razorpay_order_id: paymentEntity?.order_id || null,
          amount,
          currency,
          status: 'captured',
          webhook_payload: event,
        })

        // Activate or extend subscription if plan specified
        if (planId) {
          const startDate = new Date()
          const endDate = new Date()
          endDate.setMonth(endDate.getMonth() + 1) // Default 1 month access

          await (supabase as any).from('subscriptions').upsert({
            user_id: userId,
            plan_id: planId,
            razorpay_subscription_id: paymentEntity?.subscription_id || null,
            status: 'active',
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
          })
        }

        // Notify user
        await (supabase as any).from('notifications').insert({
          user_id: userId,
          title: 'Payment Successful',
          message: `Your payment of ${currency} ${amount.toFixed(2)} was received successfully. Your subscription is active.`,
          type: 'success',
          metadata: { paymentId, eventType },
        })

        // Audit Log
        await (supabase as any).rpc('log_audit_event', {
          p_user_id: userId,
          p_action: 'PAYMENT_CAPTURED',
          p_entity_type: 'payments',
          p_entity_id: paymentId,
          p_details: { amount, currency, eventType },
        })
      }
    } else if (eventType === 'payment.failed') {
      if (userId) {
        await (supabase as any).from('payments').upsert({
          user_id: userId,
          razorpay_payment_id: paymentId,
          amount: (paymentEntity?.amount || 0) / 100,
          currency: paymentEntity?.currency || 'INR',
          status: 'failed',
          webhook_payload: event,
        })

        await (supabase as any).from('notifications').insert({
          user_id: userId,
          title: 'Payment Failed',
          message: 'Your recent payment attempt failed. Please check your payment details and retry.',
          type: 'error',
          metadata: { paymentId, eventType },
        })
      }
    }

    return NextResponse.json({ success: true, event: eventType })
  } catch (error: any) {
    console.error('Razorpay Webhook Error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
