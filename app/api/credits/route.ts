import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const adminClient = getSupabaseAdmin();

    // 1. Fetch user credit wallet details
    let { data: wallet } = await adminClient
      .from('credit_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // If wallet doesn't exist, retroactively create one for them
    if (!wallet) {
      const { data: newWallet, error: createError } = await adminClient
        .from('credit_accounts')
        .insert({
          user_id: user.id,
          credit_balance: 10.00, // grant 10 starter credits!
          lifetime_credits_granted: 10.00,
        })
        .select()
        .single();

      if (!createError && newWallet) {
        wallet = newWallet;
      }
    }

    // 2. Fetch active subscription details to check for fair use limits
    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('*, subscription_plans(name, slug)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    // 3. Fetch active commercial credit packs
    const { data: packs } = await adminClient
      .from('credit_packs')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    // 4. Fetch recent ledger history for user
    const { data: ledger } = await adminClient
      .from('credit_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15);

    return NextResponse.json({
      success: true,
      wallet: wallet || { credit_balance: 0, reserved_credits: 0 },
      subscription: sub,
      creditPacks: packs || [],
      ledger: ledger || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/**
 * Initiates simulated or live credit pack purchase
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { packId } = await req.json();
    if (!packId) {
      return NextResponse.json({ error: 'Missing packId' }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();

    const { data: pack } = await adminClient
      .from('credit_packs')
      .select('*')
      .eq('id', packId)
      .eq('active', true)
      .maybeSingle();

    if (!pack) {
      return NextResponse.json({ error: 'Credit pack not found or inactive' }, { status: 404 });
    }

    // Grant credits immediately for the user (simulated payment capture)
    // In production, this is done via Razorpay Webhook. For testing, we can do it directly.
    const { data: wallet } = await adminClient
      .from('credit_accounts')
      .select('credit_balance, lifetime_credits_purchased')
      .eq('user_id', user.id)
      .maybeSingle();

    const totalCredits = Number(pack.credits) + Number(pack.bonus_credits || 0);
    const oldBal = wallet ? Number(wallet.credit_balance) : 0;
    const newBal = oldBal + totalCredits;
    const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9);

    if (wallet) {
      await adminClient
        .from('credit_accounts')
        .update({
          credit_balance: newBal,
          lifetime_credits_purchased: Number(wallet.lifetime_credits_purchased || 0) + totalCredits,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    } else {
      await adminClient.from('credit_accounts').insert({
        user_id: user.id,
        credit_balance: newBal,
        lifetime_credits_purchased: totalCredits,
      });
    }

    // Insert to ledger
    await adminClient.from('credit_ledger').insert({
      user_id: user.id,
      transaction_type: 'PURCHASE',
      credits: totalCredits,
      balance_before: oldBal,
      balance_after: newBal,
      reference_type: 'credit_pack',
      reference_id: paymentId,
      description: `Purchased credit pack: ${pack.name} (Simulated Sandbox)`
    });

    return NextResponse.json({
      success: true,
      message: `Successfully credited ${totalCredits} credits to your account!`,
      newBalance: newBal
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
