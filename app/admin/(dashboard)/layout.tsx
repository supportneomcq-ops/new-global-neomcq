import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let roleNames: string[] = [];
  const userEmail = user.email?.toLowerCase().trim() || '';
  const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'support@neomcq.com').toLowerCase().trim();

  const isKnownAdminEmail =
    userEmail === initialAdminEmail ||
    userEmail === 'support@neomcq.com' ||
    userEmail === 'admin@neomcq.com' ||
    userEmail === 'swapnilsonawane913@gmail.com';

  try {
    const adminClient = getSupabaseAdmin();
    const { data: userRoles } = await adminClient
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id);

    roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];

    // Auto-seed initial admin email if role isn't already present
    if (isKnownAdminEmail && !roleNames.includes('admin') && !roleNames.includes('super_admin')) {
      const { data: adminRole } = await adminClient.from('roles').select('id').eq('name', 'admin').maybeSingle();
      if (adminRole?.id) {
        await adminClient.from('user_roles').upsert(
          { user_id: user.id, role_id: adminRole.id },
          { onConflict: 'user_id,role_id' }
        );
        roleNames.push('admin');
      }
    }
  } catch (err) {
    console.error('Error fetching admin roles:', err);
  }

  if (isKnownAdminEmail && !roleNames.includes('admin')) {
    roleNames.push('admin');
  }

  const isAuthorizedAdmin =
    isKnownAdminEmail ||
    roleNames.includes('admin') ||
    roleNames.includes('super_admin') ||
    roleNames.includes('support') ||
    roleNames.includes('content_admin');

  if (!isAuthorizedAdmin) {
    redirect('/dashboard');
  }

  return (
    <AdminShell userEmail={user.email || ''} roles={roleNames}>
      {children}
    </AdminShell>
  );
}
