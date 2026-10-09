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
/**
 * Credit packs must only be granted after a verified payment.
 * The previous implementation directly credited balances with a simulated payment ID,
 * allowing any signed-in user to obtain paid credits for free.
 * Keep this endpoint fail-closed until the real order + Razorpay verification flow is wired here.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Credit pack checkout is temporarily unavailable. Credits are added only after a verified payment.' },
    { status: 503 }
  );
}
