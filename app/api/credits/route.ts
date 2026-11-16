import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const admin = getSupabaseAdmin();
    let { data: wallet, error: walletError } = await admin
      .from('credit_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError) throw walletError;
    if (!wallet) {
      // Wallet reads must never mint promotional credits. A zero-balance account is safe to create lazily.
      const { error: createError } = await admin
        .from('credit_accounts')
        .upsert({ user_id: user.id, credit_balance: 0 }, { onConflict: 'user_id', ignoreDuplicates: true });
      if (createError) throw createError;
      const refreshed = await admin
        .from('credit_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (refreshed.error) throw refreshed.error;
      wallet = refreshed.data;
    }

    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('*, subscription_plans(name, slug)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (subError) throw subError;

    const { data: packs, error: packsError } = await admin
      .from('credit_packs')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });
    if (packsError) throw packsError;

    const { data: ledger, error: ledgerError } = await admin
      .from('credit_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15);
    if (ledgerError) throw ledgerError;

    return NextResponse.json({
      success: true,
      wallet,
      subscription: sub,
      creditPacks: packs || [],
      ledger: ledger || [],
    });
  } catch (err: any) {
    console.error('[Credits] Wallet lookup failed:', err);
    return NextResponse.json({ error: 'Could not load your credit wallet.' }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Use the verified credit-pack checkout. Credits are never granted from a client-side request.' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}
