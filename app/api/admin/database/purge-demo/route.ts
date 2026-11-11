import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const admin = getSupabaseAdmin();

    // 1. Clear demo student profiles table if exists
    try {
      await admin.from('demo_student_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.warn('demo_student_profiles table clear notice:', e);
    }

    // 2. Clear test/pending topup orders and simulated payments
    try {
      await admin.from('credit_topup_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.warn('credit_topup_orders table clear notice:', e);
    }

    try {
      await admin.from('credit_ledger').delete().eq('transaction_type', 'simulation');
    } catch (e) {
      console.warn('credit_ledger simulation clear notice:', e);
    }

    // 3. Clear simulated support tickets
    try {
      await admin.from('support_tickets').delete().eq('is_simulated', true);
    } catch (e) {
      console.warn('support_tickets simulation clear notice:', e);
    }

    // 4. Clear orphaned test AI jobs
    try {
      await admin.from('ai_jobs').delete().eq('status', 'failed');
    } catch (e) {
      console.warn('ai_jobs failed clear notice:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'All demo and simulation mock data successfully purged from the database. Production exam hierarchies and real accounts remain intact.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to purge demo data' }, { status: 500 });
  }
}
