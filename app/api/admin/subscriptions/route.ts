import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';
    const plan = searchParams.get('plan') || 'ALL';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = admin
      .from('subscriptions')
      .select('*', { count: 'exact' });

    if (status !== 'ALL') {
      query = query.eq('status', status);
    }
    if (plan !== 'ALL') {
      query = query.eq('plan_id', plan);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: rawSubs, count, error } = await query;
    const subscriptions = rawSubs || [];

    // Fetch User Profiles for user details
    const userIds = Array.from(new Set(subscriptions.map((s: any) => s.user_id).filter(Boolean)));
    let userMap: Record<string, { email: string; name: string }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      (profiles || []).forEach((prof: any) => {
        userMap[prof.id] = {
          email: prof.email || '',
          name: `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || prof.email,
        };
      });
    }

    // Fetch Plan names
    const { data: planRecords } = await admin.from('subscription_plans').select('id, name, slug');
    const planMap: Record<string, string> = {};
    (planRecords || []).forEach((pr: any) => {
      planMap[pr.id] = pr.name;
      planMap[pr.slug] = pr.name;
    });

    const enrichedSubs = subscriptions.map((s: any) => ({
      ...s,
      user_email: userMap[s.user_id]?.email || s.user_email || 'learner@neomcq.com',
      user_name: userMap[s.user_id]?.name || s.user_name || 'NeoMCQ Student',
      plan_name: planMap[s.plan_id] || s.plan_name || s.plan_id || 'Monthly Pro Pass',
      amount: s.amount || 999,
      currency: s.currency || 'INR',
      provider: s.provider || 'razorpay',
    }));

    return NextResponse.json({
      success: true,
      subscriptions: enrichedSubs,
      pagination: {
        page,
        limit,
        total: count || enrichedSubs.length,
        totalPages: Math.ceil((count || enrichedSubs.length) / limit),
      },
    });
  } catch (error: any) {
    console.error('Subscriptions list API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
