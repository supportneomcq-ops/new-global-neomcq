import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (subError || !sub) {
      return NextResponse.json({ error: 'No active subscription found to cancel' }, { status: 404 });
    }

    // Set cancel_at_period_end = true
    const { error: updateError } = await admin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sub.id);

    if (updateError) {
      throw updateError;
    }

    // Create notification
    await admin.from('notifications').insert({
      user_id: user.id,
      title: 'Subscription Cancellation Scheduled',
      message: `Your subscription will remain active until ${new Date(sub.current_period_end).toLocaleDateString()}, after which it will not renew.`,
      type: 'info',
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription has been set to cancel at the end of the billing period.',
      current_period_end: sub.current_period_end,
    });
  } catch (err: any) {
    console.error('Cancel subscription error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
