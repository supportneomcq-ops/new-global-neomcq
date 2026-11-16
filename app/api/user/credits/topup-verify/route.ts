import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyRazorpaySignature } from '@/lib/razorpay';

const CREDIT_PACKS = {
  '5usd': { amount: 500, credits: 800 },
  '10usd': { amount: 1000, credits: 1600 },
} as const;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { orderId, paymentId, signature } = await req.json();
    if (!orderId || !paymentId || typeof signature !== 'string' || !signature.trim()) {
      return NextResponse.json({ success: false, error: 'Missing payment verification details.' }, { status: 400 });
    }
    if (!verifyRazorpaySignature({ orderId, paymentId, signature })) {
      return NextResponse.json({ success: false, error: 'Payment signature verification failed.' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!keyId || !keySecret || keyId.startsWith('mock_')) {
      return NextResponse.json({ success: false, error: 'Payment verification is temporarily unavailable.' }, { status: 503 });
    }

    const auth = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const [orderResponse, paymentResponse] = await Promise.all([
      fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
        headers: { Authorization: auth }, cache: 'no-store',
      }),
      fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: auth }, cache: 'no-store',
      }),
    ]);
    if (!orderResponse.ok || !paymentResponse.ok) {
      return NextResponse.json({ success: false, error: 'Razorpay could not confirm this payment. No credits were added.' }, { status: 502 });
    }

    const [order, payment] = await Promise.all([orderResponse.json(), paymentResponse.json()]);
    const packType = order?.notes?.pack_type as keyof typeof CREDIT_PACKS;
    const pack = CREDIT_PACKS[packType];
    if (
      !pack ||
      order?.notes?.purpose !== 'credit_topup' ||
      order?.notes?.user_id !== user.id ||
      Number(order?.notes?.credits) !== pack.credits ||
      Number(order?.amount) !== pack.amount ||
      order?.currency !== 'USD' ||
      payment?.status !== 'captured' ||
      payment?.order_id !== orderId ||
      Number(payment?.amount) !== pack.amount ||
      payment?.currency !== 'USD'
    ) {
      return NextResponse.json({ success: false, error: 'Payment details did not match this account and credit pack. No credits were added.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
    if (subError || !sub || periodEnd <= Date.now()) {
      return NextResponse.json({ success: false, error: 'An active subscription is required to redeem credit top-ups.' }, { status: 403 });
    }

    const { error: paymentRecordError } = await admin.from('payments').upsert({
      user_id: user.id,
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      amount: pack.amount / 100,
      currency: 'USD',
      status: 'captured',
      payment_category: 'credit_topup',
      processing_fee_amount: payment?.fee == null ? null : Number(payment.fee) / 100,
      tax_amount: payment?.tax == null ? null : Number(payment.tax) / 100,
      webhook_payload: { verified_via: 'razorpay_signature_and_api', pack_type: packType },
    }, { onConflict: 'razorpay_payment_id' });
    if (paymentRecordError) {
      console.error('[Credit Top-up] Payment record failed:', paymentRecordError);
      return NextResponse.json({ success: false, error: 'Payment verified but account crediting is pending. Retry verification; do not pay again.' }, { status: 503 });
    }

    const { error: creditError } = await admin.rpc('credit_adjust', {
      p_user_id: user.id,
      p_amount: pack.credits,
      p_type: 'PURCHASE',
      p_reason: `Razorpay Credit Top-up ${paymentId}`,
    });
    if (creditError) {
      console.error('[Credit Top-up] Credit grant failed:', creditError);
      return NextResponse.json({ success: false, error: 'Payment verified but credits are pending. Retry verification; do not pay again.' }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${pack.credits} AI credits to your wallet.`,
      addedCredits: pack.credits,
    });
  } catch (err: any) {
    console.error('[Credit Top-up] Verification failed:', err);
    return NextResponse.json({ success: false, error: 'Payment verification failed. No unverified credits were granted.' }, { status: 500 });
  }
}
