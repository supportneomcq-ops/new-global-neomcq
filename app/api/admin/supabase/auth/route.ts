import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const supabase = getSupabaseAdmin();

    // Query auth profile stats safely
    const { count: totalProfiles } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    
    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count: recentSignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo);

    // Recent profiles for display
    const { data: recentUsers } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const metrics = {
      totalUsers: totalProfiles ?? 0,
      confirmedUsers: totalProfiles ?? 0,
      unconfirmedUsers: 0,
      activeAccounts: totalProfiles ?? 0,
      suspendedAccounts: 0,
      recentSignups: recentSignups ?? 0,
      recentAuthFailures: 0,
      recentUsers: recentUsers || [],
    };

    return NextResponse.json({ success: true, metrics });
  } catch (err: any) {
    console.error('Admin GET supabase auth stats error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
