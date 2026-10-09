import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function verifyAdminApiSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 }),
    };
  }

  let roleNames: string[] = [];
  try {
    const adminClient = getSupabaseAdmin();
    const { data: userRoles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error loading stored user roles:', rolesError);
      return {
        authorized: false,
        response: NextResponse.json({ error: 'Unable to verify administrator permissions.' }, { status: 503 }),
      };
    }

    roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
  } catch (err) {
    console.error('Error verifying user roles in API:', err);
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unable to verify administrator permissions.' }, { status: 503 }),
    };
  }

  // Privileged access comes only from an explicit database role assignment.
  // Email addresses are identifiers, never proof of administrator privileges.
  const authorized =
    roleNames.includes('admin') ||
    roleNames.includes('super_admin') ||
    roleNames.includes('support') ||
    roleNames.includes('content_admin');
  if (!authorized) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden: Admin authorization required' }, { status: 403 }),
    };
  }

  return { authorized: true, user, roleNames };
}

export async function logRevenueAuditEvent(entry: {
  admin_id?: string;
  admin_email?: string;
  userId?: string;
  action: string;
  target?: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
}) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('revenue_audit_logs').insert({
      admin_id: entry.admin_id || entry.userId || null,
      admin_email: entry.admin_email || 'system',
      action: entry.action,
      target: entry.target || entry.entityId || entry.entityType || '',
      metadata: entry.metadata || {},
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

