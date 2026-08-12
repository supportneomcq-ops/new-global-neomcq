import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { logRevenueAuditEvent } from '@/lib/revenue-db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const admin = getSupabaseAdmin();

    const { data: webhook, error } = await admin
      .from('webhook_events')
      .select('*')
      .or(`id.eq.${id},event_id.eq.${id}`)
      .maybeSingle();

    if (error || !webhook) {
      return NextResponse.json({ error: 'Webhook event record not found' }, { status: 404 });
    }

    const payload = webhook.payload;
    const paymentEntity = payload?.payload?.payment?.entity;
    const paymentId = paymentEntity?.id || webhook.entity_id;

    // Idempotency check: Check if payment is already recorded in DB as captured
    if (paymentId) {
      const { data: existingPayment } = await admin
        .from('payments')
        .select('id, status')
        .eq('razorpay_payment_id', paymentId)
        .maybeSingle();

      if (existingPayment && (existingPayment.status === 'captured' || existingPayment.status === 'completed')) {
        // Update webhook retry record to duplicate_skipped / processed
        await admin
          .from('webhook_events')
          .update({
            status: 'duplicate_skipped',
            processed_at: new Date().toISOString(),
            retry_count: (webhook.retry_count || 0) + 1,
            error_message: 'Skipped - Payment already processed (idempotent guard)',
          })
          .eq('id', webhook.id);

        return NextResponse.json({
          success: true,
          message: 'Webhook retry completed: Event already processed (idempotent duplicate skipped)',
          status: 'duplicate_skipped',
        });
      }
    }

    // Process event safely according to type
    const eventType = webhook.event_type || payload?.event;
    const userId = paymentEntity?.notes?.user_id || payload?.payload?.subscription?.entity?.notes?.user_id;

    if ((eventType === 'payment.captured' || eventType === 'order.paid') && userId) {
      const amount = (paymentEntity?.amount || 0) / 100;
      const currency = paymentEntity?.currency || 'INR';

      await admin.from('payments').upsert({
        user_id: userId,
        razorpay_payment_id: paymentId,
        amount,
        currency,
        status: 'captured',
        created_at: new Date().toISOString(),
      });
    }

    // Mark webhook as successfully retried
    await admin
      .from('webhook_events')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        retry_count: (webhook.retry_count || 0) + 1,
        error_message: null,
      })
      .eq('id', webhook.id);

    await logRevenueAuditEvent({
      userId: auth.user?.id || 'admin',
      action: 'RETRY_WEBHOOK',
      entityType: 'webhook_events',
      entityId: webhook.id,
      details: { eventType, paymentId, status: 'processed' },
    });

    return NextResponse.json({
      success: true,
      message: `Webhook ${webhook.event_id || id} retried successfully`,
      status: 'processed',
    });
  } catch (error: any) {
    console.error('Webhook retry POST error:', error);
    return NextResponse.json({ error: error.message || 'Retry failed' }, { status: 500 });
  }
}
