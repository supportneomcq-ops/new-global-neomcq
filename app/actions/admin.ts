'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper: Ensure currently logged in user is Admin
async function checkIsAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  const roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
  if (!roleNames.includes('admin') && !roleNames.includes('super_admin')) {
    throw new Error('Unauthorized: Admin access required');
  }
  return user;
}

// Helper: Ensure currently logged in user is Support or Admin
async function checkIsSupportOrAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  const roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
  const authorized = roleNames.includes('admin') || roleNames.includes('super_admin') || roleNames.includes('support');
  
  if (!authorized) {
    throw new Error('Unauthorized: Support or Admin access required');
  }
  return { user, roleNames };
}

// 1. Fetch all users and roles (for both admin and support)
export async function getAllUsersAction() {
  await checkIsSupportOrAdmin();
  const adminClient = getSupabaseAdmin();

  // Fetch profiles
  const { data: profiles, error: pError } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (pError) throw pError;

  // Fetch user roles
  const { data: userRoles, error: urError } = await adminClient
    .from('user_roles')
    .select('user_id, roles(name)');

  if (urError) throw urError;

  // Fetch user exams to get user-specific selected exam
  const { data: userExams, error: ueError } = await adminClient
    .from('user_exams')
    .select('user_id, exam_id, exams(name)');

  if (ueError) {
    console.error('Failed to fetch user_exams in admin action:', ueError);
  }

  // Fetch Auth users to get suspended status
  const { data: { users: authUsers }, error: auError } = await adminClient.auth.admin.listUsers();
  if (auError) {
    console.error('Failed to list auth users:', auError);
  }

  // Combine data
  return profiles.map((p) => {
    const authUser = authUsers?.find((au) => au.id === p.id);
    const isSuspended = authUser?.user_metadata?.suspended === true;
    
    const userRoleEntries = userRoles ? userRoles.filter((ur) => ur.user_id === p.id) : [];
    const roles = userRoleEntries.map((ur: any) => ur.roles?.name).filter(Boolean);

    const userExamEntry = userExams?.find((ue) => ue.user_id === p.id);
    const examName = (userExamEntry?.exams as any)?.name || 'Not Selected';

    return {
      id: p.id,
      firstName: p.first_name || 'System',
      lastName: p.last_name || 'User',
      email: p.email,
      phone: p.phone || '',
      country: p.timezone || 'Global',
      exam: examName,
      roles: roles.length > 0 ? roles : ['user'],
      isSuspended,
      createdAt: p.created_at,
    };
  });
}

// 2. Create support account (Admin only)
export async function createSupportAccountAction(formData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  await checkIsAdmin();
  const adminClient = getSupabaseAdmin();

  // 1. Create the user in Auth
  const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      first_name: formData.firstName,
      last_name: formData.lastName,
    }
  });

  if (createError) return { error: createError.message };

  // 2. Query 'support' role ID
  const { data: roleData, error: rError } = await adminClient
    .from('roles')
    .select('id')
    .eq('name', 'support')
    .single();

  if (rError) return { error: 'Failed to retrieve support role' };

  // 3. Assign support role
  const { error: roleAssignError } = await adminClient
    .from('user_roles')
    .insert({
      user_id: authUser.user.id,
      role_id: roleData.id,
    });

  if (roleAssignError) {
    console.error('Failed to assign support role:', roleAssignError);
  }

  revalidatePath('/admin');
  return { success: true };
}

// 3. Promote/Demote support status (Admin only)
export async function toggleSupportRoleAction(userId: string, isPromote: boolean) {
  await checkIsAdmin();
  const adminClient = getSupabaseAdmin();

  // Query 'support' role ID
  const { data: roleData, error: rError } = await adminClient
    .from('roles')
    .select('id')
    .eq('name', 'support')
    .single();

  if (rError) return { error: 'Failed to retrieve support role' };

  if (isPromote) {
    const { error } = await adminClient
      .from('user_roles')
      .upsert({
        user_id: userId,
        role_id: roleData.id,
      });
    if (error) return { error: error.message };
  } else {
    const { error } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleData.id);
    if (error) return { error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

// 4. Suspend/Reactivate user (Admin only)
export async function toggleUserSuspensionAction(userId: string, shouldSuspend: boolean) {
  await checkIsAdmin();
  const adminClient = getSupabaseAdmin();

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { suspended: shouldSuspend },
  });

  if (error) return { error: error.message };

  revalidatePath('/admin');
  return { success: true };
}

// 5. Reset user password (both support and admin can do this for standard users, but support cannot reset admins)
export async function resetUserPasswordAction(userId: string, newPassword: string) {
  const { roleNames } = await checkIsSupportOrAdmin();
  const adminClient = getSupabaseAdmin();

  // Safeguard: support users cannot reset passwords of admins or super_admins
  const isOnlySupport = roleNames.includes('support') && !roleNames.includes('admin') && !roleNames.includes('super_admin');
  if (isOnlySupport) {
    const { data: targetRoles } = await adminClient
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId);

    const targetRoleNames = targetRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
    if (targetRoleNames.includes('admin') || targetRoleNames.includes('super_admin')) {
      return { error: 'Unauthorized: Support staff cannot reset administrator passwords.' };
    }
  }

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) return { error: error.message };

  return { success: true };
}

// 6. Fetch full system logs, subscriptions, and AI jobs metrics
export async function getSystemMetricsAction() {
  await checkIsSupportOrAdmin();
  const adminClient = getSupabaseAdmin();

  // AI jobs counts
  const { data: jobs, error: jError } = await adminClient
    .from('ai_generation_jobs')
    .select('*')
    .order('created_at', { ascending: false });

  // Subscriptions
  const { data: subscriptions, error: sError } = await adminClient
    .from('subscriptions')
    .select('*, profiles(first_name, last_name, email), subscription_plans(name)')
    .order('created_at', { ascending: false });

  return {
    jobs: jobs || [],
    subscriptions: subscriptions || [],
  };
}
