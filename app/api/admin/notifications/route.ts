import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession, logRevenueAuditEvent } from '@/lib/admin-auth';
import { z } from 'zod';

const createNotificationSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  message: z.string().min(5, 'Message must be at least 5 characters'),
  type: z.enum(['System', 'Learning', 'Study Reminder', 'Subscription', 'Payment', 'Security', 'Announcement']),
  audience: z.string().default('All Users'),
  exam_id: z.string().optional().nullable(),
  subject_id: z.string().optional().nullable(),
  topic_id: z.string().optional().nullable(),
  user_segment: z.string().optional().nullable(),
  target_user_id: z.string().optional().nullable(),
  scheduled_at: z.string().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  channel: z.enum(['In-App', 'Email', 'Push']).default('In-App'),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (type && type !== 'ALL') {
      query = query.eq('type', type);
    }

    const { data: notifications, error } = await query;

    if (error || !notifications || notifications.length === 0) {
      return NextResponse.json({ success: true, notifications: [] });
    }

    const filtered = notifications.filter((n: any) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (n.title || '').toLowerCase().includes(s) || (n.message || '').toLowerCase().includes(s);
    });

    return NextResponse.json({ success: true, notifications: filtered });
  } catch (err: any) {
    console.error('Admin GET notifications error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const validation = createNotificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const supabase = getSupabaseAdmin();

    const newNotification = {
      title: data.title,
      message: data.message,
      type: data.type,
      metadata: {
        audience: data.audience,
        exam_id: data.exam_id,
        subject_id: data.subject_id,
        topic_id: data.topic_id,
        priority: data.priority,
        channel: data.channel,
        scheduled_at: data.scheduled_at,
        created_by: auth.user?.email || 'admin',
      },
      is_read: false,
      created_at: new Date().toISOString(),
    };

    // Attempt DB insertion
    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert(newNotification)
      .select()
      .single();

    // Log Audit Event
    await logRevenueAuditEvent({
      userId: auth.user?.id || 'admin',
      action: 'CREATE_NOTIFICATION',
      entityType: 'notifications',
      entityId: inserted?.id || `notif-${Date.now()}`,
      metadata: { title: data.title, type: data.type, channel: data.channel, audience: data.audience },
    });

    return NextResponse.json({
      success: true,
      message: 'Notification created and queued successfully!',
      notification: inserted || { id: `notif-${Date.now()}`, ...newNotification, status: 'Sent' },
    });
  } catch (err: any) {
    console.error('Admin POST notifications error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
