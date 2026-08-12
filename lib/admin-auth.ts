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

  const adminClient = getSupabaseAdmin();
  const { data: userRoles } = await adminClient
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  const roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];

  const userEmail = user.email?.toLowerCase().trim() || '';
  const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'support@neomcq.com').toLowerCase().trim();

  // Auto-seed initial admin email if role isn't already present
  if (
    (userEmail === initialAdminEmail || userEmail === 'support@neomcq.com' || userEmail === 'swapnilsonawane913@gmail.com') &&
    !roleNames.includes('admin') &&
    !roleNames.includes('super_admin')
  ) {
    const { data: adminRole } = await adminClient.from('roles').select('id').eq('name', 'admin').maybeSingle();
    if (adminRole?.id) {
      await adminClient.from('user_roles').upsert(
        { user_id: user.id, role_id: adminRole.id },
        { onConflict: 'user_id,role_id' }
      );
      roleNames.push('admin');
    }
  }

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

