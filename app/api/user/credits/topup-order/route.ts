import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import Razorpay from 'razorpay';

const CREDIT_PACKS = {
  '5usd': { amount: 500, credits: 800, name: '800 AI Credits Top-Up ($5)' },
  '10usd': { amount: 1000, credits: 1600, name: '1600 AI Credits Top-Up ($10)' },
} as const;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
    if (subError) {
      return NextResponse.json({ success: false, error: 'Could not verify your subscription. Please retry.' }, { status: 503 });
    }
    if (!sub || periodEnd <= Date.now()) {
      return NextResponse.json(
        { success: false, error: 'Credit top-ups are available only to users with an active paid subscription.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const packType = body?.packType as keyof typeof CREDIT_PACKS;
    const pack = CREDIT_PACKS[packType];
    if (!pack) {
      return NextResponse.json({ success: false, error: 'Choose a valid credit pack.' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!keyId || !keySecret || keyId.startsWith('mock_')) {
      return NextResponse.json({ success: false, error: 'Secure credit checkout is temporarily unavailable.' }, { status: 503 });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount: pack.amount,
      currency: 'USD',
      receipt: `topup_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        purpose: 'credit_topup',
        user_id: user.id,
        credits: String(pack.credits),
        pack_type: packType,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      credits: pack.credits,
      packName: pack.name,
    });
  } catch (err: any) {
    console.error('[Credit Top-up] Order creation failed:', err);
    return NextResponse.json(
      { success: false, error: 'Could not create a secure credit checkout. No credits were charged.' },
      { status: 502 }
    );
  }
}
