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

    // If this is a real recurring Razorpay subscription, cancel it at the provider too.
    // One-time order fallback IDs begin with "order_" and have no auto-renewal to cancel.
    if (sub.razorpay_plan_id && sub.razorpay_subscription_id &&
        !String(sub.razorpay_subscription_id).startsWith('order_')) {
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
      const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
      if (!keyId || !keySecret || keyId.startsWith('mock_')) {
        return NextResponse.json({
          error: 'We could not verify the payment provider configuration, so your subscription was not changed. Please contact support.',
        }, { status: 503 });
      }

      const providerResponse = await fetch(
        `https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(sub.razorpay_subscription_id)}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cancel_at_cycle_end: 1 }),
        },
      );

      if (!providerResponse.ok) {
        const providerError = await providerResponse.text();
        console.error('Razorpay subscription cancellation failed:', providerResponse.status, providerError.slice(0, 500));
        return NextResponse.json({
          error: 'Razorpay could not schedule your cancellation. Your subscription has not been changed; please retry or contact support.',
        }, { status: 502 });
      }
    }

    // Only update the local entitlement after the provider accepts cancellation.
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
