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
    const provider = searchParams.get('provider') || 'ALL';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = admin
      .from('payments')
      .select('*', { count: 'exact' });

    if (status !== 'ALL') {
      query = query.eq('status', status);
    }
    if (provider !== 'ALL') {
      query = query.eq('provider', provider);
    }

    if (search.trim()) {
      const term = search.trim();
      query = query.or(`razorpay_payment_id.ilike.%${term}%,razorpay_order_id.ilike.%${term}%,id.ilike.%${term}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: rawPayments, count, error } = await query;

    if (error) {
      console.error('Error querying payments table:', error);
    }

    const payments = rawPayments || [];

    // Attach user profile details if available
    const userIds = Array.from(new Set(payments.map((p: any) => p.user_id).filter(Boolean)));
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

    const enrichedPayments = payments.map((p: any) => ({
      ...p,
      user_email: userMap[p.user_id]?.email || p.user_email || 'student@neomcq.com',
      user_name: userMap[p.user_id]?.name || p.user_name || 'NeoMCQ Learner',
      provider: p.provider || 'razorpay',
      currency: p.currency || 'INR',
    }));

    return NextResponse.json({
      success: true,
      payments: enrichedPayments,
      pagination: {
        page,
        limit,
        total: count || enrichedPayments.length,
        totalPages: Math.ceil((count || enrichedPayments.length) / limit),
      },
    });
  } catch (error: any) {
    console.error('Payments list API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
