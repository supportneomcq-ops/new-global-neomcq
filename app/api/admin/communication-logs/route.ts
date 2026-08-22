import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel') || '';
    const search = searchParams.get('search') || '';

    const supabase = getSupabaseAdmin();

    const { data: auditLogs } = await supabase
      .from('revenue_audit_logs')
      .select('*')
      .in('action', [
        'CREATE_NOTIFICATION',
        'CREATE_ANNOUNCEMENT',
        'UPDATE_ANNOUNCEMENT_STATUS',
        'UPDATE_EMAIL_TEMPLATE',
        'DISPATCH_PUSH_NOTIFICATION',
        'POST_SUPPORT_REPLY',
        'ADD_SUPPORT_INTERNAL_NOTE',
        'UPDATE_SUPPORT_TICKET_METADATA',
      ])
      .order('created_at', { ascending: false })
      .limit(100);

    const logs = (auditLogs || []).map((l: any) => ({
      id: l.id,
      channel: l.action?.includes('NOTIFICATION') ? 'In-App Notification' : l.action?.includes('EMAIL') ? 'Email' : l.action?.includes('SUPPORT') ? 'Support' : 'System',
      event_type: l.action,
      title: l.details?.title || l.details?.subject || l.action,
      actor: l.admin_email || 'System',
      status: 'Recorded',
      created_at: l.created_at,
    }));

    const filtered = logs.filter((l: any) => {
      if (channel && channel !== 'ALL' && l.channel.toLowerCase() !== channel.toLowerCase()) return false;
      if (search) {
        const s = search.toLowerCase();
        return l.title?.toLowerCase().includes(s) || l.actor?.toLowerCase().includes(s) || l.event_type?.toLowerCase().includes(s);
      }
      return true;
    });

    return NextResponse.json({ success: true, logs: filtered });
  } catch (err: any) {
    console.error('Admin GET communication logs error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
