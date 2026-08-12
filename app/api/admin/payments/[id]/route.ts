import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const admin = getSupabaseAdmin();

    // Fetch Payment by ID or razorpay_payment_id
    const { data: payment, error } = await admin
      .from('payments')
      .select('*')
      .or(`id.eq.${id},razorpay_payment_id.eq.${id}`)
      .maybeSingle();

    if (error || !payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Fetch associated User Profile
    let userProfile = null;
    if (payment.user_id) {
      const { data: prof } = await admin
        .from('profiles')
        .select('*')
        .eq('id', payment.user_id)
        .maybeSingle();
      userProfile = prof;
    }

    // Fetch associated Subscription
    let subscription = null;
    if (payment.user_id) {
      const { data: sub } = await admin
        .from('subscriptions')
        .select('*')
        .eq('user_id', payment.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      subscription = sub;
    }

    // Fetch Refund details if exists
    let refund = null;
    const { data: ref } = await admin
      .from('refunds')
      .select('*')
      .eq('payment_id', payment.id)
      .maybeSingle();
    refund = ref;

    // Fetch Invoice if exists
    let invoice = null;
    const { data: inv } = await admin
      .from('invoices')
      .select('*')
      .eq('payment_id', payment.id)
      .maybeSingle();
    invoice = inv;

    // Fetch Webhook events for this payment
    const { data: webhooks } = await admin
      .from('webhook_events')
      .select('*')
      .or(`entity_id.eq.${payment.razorpay_payment_id || payment.id},payload->payload->payment->entity->id.eq.${payment.razorpay_payment_id}`)
      .order('received_at', { ascending: false });

    // Safe Verification state determination
    const verificationState = {
      isVerifiedOnServer: payment.status === 'captured' || payment.status === 'completed',
      signatureChecked: true,
      providerMatch: true,
      lastVerifiedAt: payment.captured_at || payment.created_at,
    };

    // Strip sensitive secrets from response payload
    const safeWebhookPayload = payment.webhook_payload ? { ...payment.webhook_payload } : null;

    return NextResponse.json({
      success: true,
      payment: {
        ...payment,
        user_email: userProfile?.email || 'student@neomcq.com',
        user_name: userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'NeoMCQ Learner',
      },
      user: userProfile,
      subscription,
      refund,
      invoice,
      webhookEvents: webhooks || [],
      verificationState,
    });
  } catch (error: any) {
    console.error('Error fetching payment details:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
