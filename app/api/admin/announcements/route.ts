import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession, logRevenueAuditEvent } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const supabase = getSupabaseAdmin();

    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !announcements || announcements.length === 0) {
      return NextResponse.json({ success: true, announcements: [] });
    }

    return NextResponse.json({ success: true, announcements });
  } catch (err: any) {
    console.error('Admin GET announcements error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { title, message, status, target_audience, scheduled_at } = body;

    if (!title || !message) {
      return NextResponse.json({ success: false, error: 'Title and message are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const newAnnouncement = {
      title: title.trim(),
      message: message.trim(),
      status: status || 'published',
      target_audience: target_audience || 'All Users',
      scheduled_at: scheduled_at || null,
      published_at: status === 'published' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted } = await supabase
      .from('announcements')
      .insert(newAnnouncement)
      .select()
      .maybeSingle();

    await logRevenueAuditEvent({
      userId: auth.user?.id || 'admin',
      action: 'CREATE_ANNOUNCEMENT',
      entityType: 'announcements',
      entityId: inserted?.id || `anc-${Date.now()}`,
      metadata: { title, status },
    });

    return NextResponse.json({
      success: true,
      message: 'Platform announcement saved successfully!',
      announcement: inserted || { id: `anc-${Date.now()}`, ...newAnnouncement },
    });
  } catch (err: any) {
    console.error('Admin POST announcements error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Announcement ID and status required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    await supabase
      .from('announcements')
      .update({
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    await logRevenueAuditEvent({
      userId: auth.user?.id || 'admin',
      action: 'UPDATE_ANNOUNCEMENT_STATUS',
      entityType: 'announcements',
      entityId: id,
      metadata: { status },
    });

    return NextResponse.json({ success: true, message: `Announcement status updated to ${status}` });
  } catch (err: any) {
    console.error('Admin PUT announcements error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
