import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession, logRevenueAuditEvent } from '@/lib/admin-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { id: ticketId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle();

    const { data: messages } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Support ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket, messages: messages || [] });
  } catch (err: any) {
    console.error('Admin GET support ticket details error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { id: ticketId } = await params;
    const body = await req.json();
    const { message, is_internal } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message content is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const newMessage = {
      ticket_id: ticketId,
      sender_id: auth.user?.id || 'admin',
      sender_email: auth.user?.email || 'support@neomcq.com',
      sender_name: 'NeoMCQ Admin',
      sender_type: 'admin',
      message: message.trim(),
      is_internal: !!is_internal,
      created_at: new Date().toISOString(),
    };

    const { data: inserted } = await supabase
      .from('support_messages')
      .insert(newMessage)
      .select()
      .maybeSingle();

    // Update ticket updated_at and status if replying to user
    await supabase
      .from('support_tickets')
      .update({
        updated_at: new Date().toISOString(),
        status: is_internal ? undefined : 'In Progress',
      })
      .eq('id', ticketId);

    await logRevenueAuditEvent({
      userId: auth.user?.id || 'admin',
      action: is_internal ? 'ADD_SUPPORT_INTERNAL_NOTE' : 'POST_SUPPORT_REPLY',
      entityType: 'support_tickets',
      entityId: ticketId,
      metadata: { is_internal },
    });

    return NextResponse.json({
      success: true,
      message: is_internal ? 'Internal note added!' : 'Reply sent to user!',
      messageItem: inserted || { id: `msg-${Date.now()}`, ...newMessage },
    });
  } catch (err: any) {
    console.error('Admin POST support message error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { id: ticketId } = await params;
    const body = await req.json();
    const { status, priority, assigned_admin_email } = body;

    const supabase = getSupabaseAdmin();

    const updates: any = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assigned_admin_email) updates.assigned_admin_email = assigned_admin_email;

    await supabase.from('support_tickets').update(updates).eq('id', ticketId);

    await logRevenueAuditEvent({
      userId: auth.user?.id || 'admin',
      action: 'UPDATE_SUPPORT_TICKET_METADATA',
      entityType: 'support_tickets',
      entityId: ticketId,
      metadata: updates,
    });

    return NextResponse.json({
      success: true,
      message: 'Support ticket updated successfully!',
    });
  } catch (err: any) {
    console.error('Admin PATCH support ticket error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
