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

    // Fetch support staff profiles to correlate assigned support members
    const { data: supportRoles } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'support')
      .maybeSingle();

    let supportStaff: any[] = [];
    if (supportRoles?.id) {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, profiles(id, first_name, last_name, email)')
        .eq('role_id', supportRoles.id);

      supportStaff = userRoles?.map((ur: any) => ur.profiles).filter(Boolean) || [];
    }

    if (error || !tickets || tickets.length === 0) {
      return NextResponse.json({
        success: true,
        tickets: [],
        supportStaff,
        metrics: {
          open: 0,
          inProgress: 0,
          pending: 0,
          resolved: 0,
          closed: 0,
          total: 0,
        },
      });
    }

    // Calculate real metrics from database records
    const metrics = {
      open: tickets.filter((t) => (t.status || '').toLowerCase() === 'open').length,
      inProgress: tickets.filter((t) => (t.status || '').toLowerCase() === 'in_progress' || (t.status || '').toLowerCase() === 'in progress').length,
      pending: tickets.filter((t) => (t.status || '').toLowerCase() === 'pending').length,
      resolved: tickets.filter((t) => (t.status || '').toLowerCase() === 'resolved').length,
      closed: tickets.filter((t) => (t.status || '').toLowerCase() === 'closed').length,
      total: tickets.length,
    };

    const filtered = tickets.filter((t) => {
      if (status && status !== 'ALL' && (t.status || '').toLowerCase() !== status.toLowerCase()) return false;
      if (priority && priority !== 'ALL' && (t.priority || '').toLowerCase() !== priority.toLowerCase()) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          (t.ticket_number || '').toLowerCase().includes(s) ||
          (t.user_email || '').toLowerCase().includes(s) ||
          (t.subject || '').toLowerCase().includes(s) ||
          (t.id || '').toLowerCase().includes(s)
        );
      }
      return true;
    });

    return NextResponse.json({
      success: true,
      tickets: filtered,
      supportStaff,
      metrics,
    });
  } catch (err: any) {
    console.error('Admin GET support tickets error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { ticketId, status, priority, assignedAdmin, responseMessage } = body;

    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'Ticket ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updatePayload.status = status;
    if (priority) updatePayload.priority = priority;
    if (assignedAdmin !== undefined) updatePayload.assigned_admin = assignedAdmin;
    if (responseMessage) updatePayload.admin_response = responseMessage;

    const { data: updatedTicket, error } = await supabase
      .from('support_tickets')
      .update(updatePayload)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;

    // Log security audit event
    await supabase.from('audit_logs').insert({
      user_id: auth.user.id,
      action: 'SUPPORT_TICKET_UPDATED',
      entity_type: 'support_tickets',
      entity_id: ticketId,
      details: { ticketId, updates: updatePayload, admin_email: auth.user.email },
    });

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (err: any) {
    console.error('Admin PATCH support ticket error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
