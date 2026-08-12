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

    const mockLogs = [
      {
        id: 'clog-901',
        channel: 'In-App Notification',
        event_type: 'DISPATCH_BROADCAST',
        title: 'NEET 2026 Grand Mock Test Available',
        actor: 'support@neomcq.com',
        status: 'Delivered (14,200)',
        created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
      {
        id: 'clog-902',
        channel: 'Email',
        event_type: 'TEMPLATE_UPDATE',
        title: 'Welcome & Onboarding Email (v3)',
        actor: 'swapnilsonawane913@gmail.com',
        status: 'Success',
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
      {
        id: 'clog-903',
        channel: 'Support',
        event_type: 'USER_REPLY_SENT',
        title: 'Re: [TCK-8901] Payment deducted via Razorpay',
        actor: 'support@neomcq.com',
        status: 'Sent to User',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 'clog-904',
        channel: 'Push Notification',
        event_type: 'VAPID_BROADCAST',
        title: 'Daily High-Yield MCQ Streak Reminder',
        actor: 'System Auto-Cron',
        status: 'Delivered (36,200)',
        created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      },
      {
        id: 'clog-905',
        channel: 'Announcement',
        event_type: 'PUBLISH_BANNER',
        title: 'NeoMCQ 3.0 Platform Upgrade & AI High-Yield Questions',
        actor: 'swapnilsonawane913@gmail.com',
        status: 'Published',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ];

    const filtered = mockLogs.filter((l) => {
      if (channel && channel !== 'ALL' && l.channel.toLowerCase() !== channel.toLowerCase()) return false;
      if (search) {
        const s = search.toLowerCase();
        return l.title.toLowerCase().includes(s) || l.actor.toLowerCase().includes(s) || l.event_type.toLowerCase().includes(s);
      }
      return true;
    });

    return NextResponse.json({ success: true, logs: filtered });
  } catch (err: any) {
    console.error('Admin GET communication logs error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
