import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const admin = getSupabaseAdmin();

    const { data: subscription, error } = await admin
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // User details
    let userProfile = null;
    if (subscription.user_id) {
      const { data: prof } = await admin
        .from('profiles')
        .select('*')
        .eq('id', subscription.user_id)
        .maybeSingle();
      userProfile = prof;
    }

    // Plan details
    let planDetails = null;
    if (subscription.plan_id) {
      const { data: plan } = await admin
        .from('subscription_plans')
        .select('*')
        .or(`id.eq.${subscription.plan_id},slug.eq.${subscription.plan_id}`)
        .maybeSingle();
      planDetails = plan;
    }

    // Related payments
    const { data: payments } = await admin
      .from('payments')
      .select('*')
      .eq('user_id', subscription.user_id)
      .order('created_at', { ascending: false });

    // Related invoices
    const { data: invoices } = await admin
      .from('invoices')
      .select('*')
      .eq('user_id', subscription.user_id)
      .order('issued_at', { ascending: false });

    // Entitlements
    const entitlements = [
      'Unlimited Q-Bank Practice',
      'Real-Time AI Tutor Answers',
      'Full Exam Simulation Mode',
      'Performance Analytics & Weakness Heatmap',
    ];

    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription,
        user_email: userProfile?.email || 'learner@neomcq.com',
        user_name: userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'NeoMCQ Student',
        plan_name: planDetails?.name || subscription.plan_id || 'Pro Pass',
      },
      user: userProfile,
      plan: planDetails,
      payments: payments || [],
      invoices: invoices || [],
      entitlements,
    });
  } catch (error: any) {
    console.error('Subscription detail API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const body = await req.json();
    const { status, currentPeriodEnd } = body;

    const admin = getSupabaseAdmin();
    const updateData: any = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (currentPeriodEnd) updateData.current_period_end = currentPeriodEnd;

    const { data, error } = await admin
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, subscription: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
