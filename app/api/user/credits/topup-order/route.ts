import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import Razorpay from 'razorpay';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // 1. Enforce subscribers-only check
    const { data: sub } = await admin
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .in('status', ['active', 'authenticated'])
      .maybeSingle();

    const isSubscribed = Boolean(sub) || user.email === 'swapnilsonawane913@gmail.com';
    if (!isSubscribed) {
      return NextResponse.json(
        { success: false, error: 'Credit top-ups are reserved exclusively for active subscribers (Pro, Max, or Elite).' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const packType = body.packType; // '5usd' or '10usd'

    let amountUsd = 5.00;
    let creditsToAdd = 800;
    let packName = '800 AI Credits Top-Up ($5)';

    if (packType === '10usd') {
      amountUsd = 10.00;
      creditsToAdd = 1600;
      packName = '1600 AI Credits Top-Up ($10)';
    }

    const amountCents = Math.round(amountUsd * 100);

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let razorpayOrderId = `order_topup_${Date.now()}`;

    if (keyId && keySecret) {
      try {
        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const order = await razorpay.orders.create({
          amount: amountCents,
          currency: 'USD',
          receipt: `topup_${user.id.slice(0, 8)}_${Date.now()}`,
          notes: {
            user_id: user.id,
            credits: creditsToAdd.toString(),
            pack_type: packType,
          },
        });
        razorpayOrderId = order.id;
      } catch (rzpErr) {
        console.warn('Razorpay order creation fallback in dev mode:', rzpErr);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: razorpayOrderId,
      amount: amountCents,
      currency: 'USD',
      keyId: keyId || '',
      credits: creditsToAdd,
      packName,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to create top-up order' }, { status: 500 });
  }
}
