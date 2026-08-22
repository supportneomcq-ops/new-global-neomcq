import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession, logRevenueAuditEvent } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';

    const supabase = getSupabaseAdmin();

    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error || !tickets || tickets.length === 0) {
      return NextResponse.json({ success: true, tickets: [] });
    }

    const filtered = tickets.filter((t) => {
      if (status && status !== 'ALL' && t.status.toLowerCase() !== status.toLowerCase()) return false;
      if (priority && priority !== 'ALL' && t.priority.toLowerCase() !== priority.toLowerCase()) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          (t.ticket_number || '').toLowerCase().includes(s) ||
          (t.user_email || '').toLowerCase().includes(s) ||
          (t.subject || '').toLowerCase().includes(s)
        );
      }
      return true;
    });

    return NextResponse.json({ success: true, tickets: filtered });
  } catch (err: any) {
    console.error('Admin GET support tickets error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
