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
  try {
    const adminClient = getSupabaseAdmin();
    const { data: userRoles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      redirect('/dashboard');
    }

    roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
  } catch (err) {
    console.error('Error fetching admin roles:', err);
    redirect('/dashboard');
  }

  // Admin access is based only on explicit role assignments in the database.
  const isAuthorizedAdmin =
    roleNames.includes('admin') ||
    roleNames.includes('super_admin') ||
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
