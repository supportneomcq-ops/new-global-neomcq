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
  const isAdminEmail = userEmail === initialAdminEmail ||
                       userEmail === 'admin@neomcq.com' ||
                       userEmail === 'swapnilsonawane913@gmail.com';

  const authorized =
    isAdminEmail ||
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
