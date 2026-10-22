import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { orderId, paymentId, credits } = body;

    if (!orderId || !paymentId || !credits) {
      return NextResponse.json({ success: false, error: 'Missing verification parameters.' }, { status: 400 });
    }

    const creditsNum = Number(credits);

    // Fetch or create user credit wallet
    let { data: wallet } = await admin
      .from('credit_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!wallet) {
      const { data: created } = await admin
        .from('credit_accounts')
        .insert({
          user_id: user.id,
          credit_balance: creditsNum,
          lifetime_credits_granted: creditsNum,
        })
        .select()
        .single();
      wallet = created;
    } else {
      const newBalance = Number(wallet.credit_balance || 0) + creditsNum;
      const newLifetime = Number(wallet.lifetime_credits_granted || 0) + creditsNum;
      await admin
        .from('credit_accounts')
        .update({
          credit_balance: newBalance,
          lifetime_credits_granted: newLifetime,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }

    // Record in credit ledger
    await admin.from('credit_ledger').insert({
      user_id: user.id,
      amount: creditsNum,
      transaction_type: 'topup',
      description: `Purchased ${creditsNum} AI Credits Top-Up (Razorpay ID: ${paymentId})`,
    });

    // Record payment
    await admin.from('payments').insert({
      user_id: user.id,
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      amount: creditsNum === 1600 ? 10.00 : 5.00,
      currency: 'USD',
      status: 'captured',
    });

    return NextResponse.json({
      success: true,
      message: `Successfully added ${creditsNum} AI credits to your wallet!`,
      addedCredits: creditsNum,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Payment verification failed' }, { status: 500 });
  }
}
