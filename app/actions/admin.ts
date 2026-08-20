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

// 7. Get users with pagination, server-side search, and filters
export async function getUsersPaginatedAction(params: {
  page: number;
  pageSize: number;
  search: string;
  role?: string;
  status?: string;
  subscription?: string;
  exam?: string;
  country?: string;
}) {
  await checkIsSupportOrAdmin();
  const adminClient = getSupabaseAdmin();

  let query = adminClient
    .from('profiles')
    .select('*, countries(id, name), user_roles(roles(id, name)), user_exams(exams(id, name)), subscriptions(status, plan_id, current_period_end, subscription_plans(name))', { count: 'exact' });

  // Apply search
  if (params.search) {
    const q = params.search.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    if (isUuid) {
      query = query.eq('id', q);
    } else {
      query = query.or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
    }
  }

  // Apply country filter
  if (params.country) {
    query = query.eq('country_id', params.country);
  }

  // Apply role, subscription, and exam filters
  let filteredUserIds: string[] | null = null;

  const combineFilter = (current: string[] | null, list: string[]): string[] => {
    if (current === null) return list;
    return (current as string[]).filter((id) => list.includes(id));
  };

  if (params.role) {
    const { data: rData } = await adminClient.from('roles').select('id').eq('name', params.role).maybeSingle();
    if (rData) {
      const { data: urData } = await adminClient.from('user_roles').select('user_id').eq('role_id', rData.id);
      const roleUserIds = urData?.map((ur) => ur.user_id) || [];
      filteredUserIds = combineFilter(filteredUserIds, roleUserIds);
    } else {
      filteredUserIds = [];
    }
  }

  if (params.subscription) {
    const { data: subData } = await adminClient.from('subscriptions').select('user_id').eq('status', params.subscription);
    const subUserIds = subData?.map((s) => s.user_id) || [];
    filteredUserIds = combineFilter(filteredUserIds, subUserIds);
  }

  if (params.exam) {
    const { data: ueData } = await adminClient.from('user_exams').select('user_id').eq('exam_id', params.exam);
    const examUserIds = ueData?.map((ue) => ue.user_id) || [];
    filteredUserIds = combineFilter(filteredUserIds, examUserIds);
  }

  if (filteredUserIds !== null) {
    if (filteredUserIds.length === 0) {
      return { users: [], totalCount: 0 };
    }
    query = query.in('id', filteredUserIds);
  }

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  const { data: profiles, error, count } = await query
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const profilesList = profiles || [];
  
  // Batch fetch auth statuses from Auth service to bypass local DB sync delays
  const authUsersResults = await Promise.all(
    profilesList.map((p) => adminClient.auth.admin.getUserById(p.id).catch(() => null))
  );

  const users = profilesList.map((p, i) => {
    const authUserRes = authUsersResults[i];
    const authUser = authUserRes?.data?.user;
    const isSuspended = authUser?.user_metadata?.suspended === true;
    const emailVerified = !!authUser?.email_confirmed_at;

    const roles = p.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) || ['user'];
    const examName = p.user_exams?.[0]?.exams?.name || 'Not Selected';
    const countryName = p.countries?.name || p.timezone || 'Global';

    const activeSub = p.subscriptions?.[0];
    const subscriptionStatus = activeSub?.status || 'free';
    const subscriptionPlan = activeSub?.subscription_plans?.name || 'Free Plan';

    return {
      id: p.id,
      firstName: p.first_name || 'System',
      lastName: p.last_name || 'User',
      email: p.email,
      phone: p.phone || '',
      country: countryName,
      exam: examName,
      roles,
      isSuspended,
      emailVerified,
      createdAt: p.created_at,
      subscriptionStatus,
      subscriptionPlan,
      lastSignInAt: authUser?.last_sign_in_at || null,
    };
  });

  // Apply account status filters post-fetch if filtering on auth state
  let filteredUsers = users;
  if (params.status) {
    if (params.status === 'suspended') {
      filteredUsers = users.filter((u) => u.isSuspended);
    } else if (params.status === 'active') {
      filteredUsers = users.filter((u) => !u.isSuspended);
    } else if (params.status === 'pending_verification') {
      filteredUsers = users.filter((u) => !u.emailVerified);
    }
  }

  return {
    users: filteredUsers,
    totalCount: count || 0,
  };
}

// 8. Fetch user details profile context, stats, subscription, transactions, activity logs
export async function getAdminUserDetailAction(userId: string) {
  await checkIsSupportOrAdmin();
  const adminClient = getSupabaseAdmin();

  // 1. Fetch profile details
  const { data: profile, error: pError } = await adminClient
    .from('profiles')
    .select('*, countries(id, name)')
    .eq('id', userId)
    .single();

  if (pError) throw pError;

  // 2. Fetch auth details (security events, last login, verification)
  const { data: { user: authUser }, error: auError } = await adminClient.auth.admin.getUserById(userId);
  if (auError) throw auError;
  if (!authUser) throw new Error('User auth record not found');

  // 3. Fetch user roles
  const { data: userRoles } = await adminClient
    .from('user_roles')
    .select('role_id, roles(id, name, description)')
    .eq('user_id', userId);

  const roles = userRoles?.map((ur: any) => ({
    id: ur.roles?.id,
    name: ur.roles?.name,
    description: ur.roles?.description,
  })) || [];

  // 4. Fetch learning context (user exams)
  const { data: userExams } = await adminClient
    .from('user_exams')
    .select('*, exams(*)')
    .eq('user_id', userId);

  const activeExam = userExams?.[0]?.exams || null;

  // 5. Fetch study preferences
  const { data: studyPrefs } = await adminClient
    .from('study_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // 6. Fetch stats from study sessions
  const { data: studySessions } = await adminClient
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId);

  const totalQuestionsSolved = studySessions?.reduce((acc, s) => acc + s.questions_answered, 0) || 0;
  const correctAnswers = studySessions?.reduce((acc, s) => acc + s.correct_answers, 0) || 0;
  const accuracy = totalQuestionsSolved > 0 ? Math.round((correctAnswers / totalQuestionsSolved) * 100) : 0;
  const totalStudyTimeMins = studySessions?.reduce((acc, s) => acc + s.duration_mins, 0) || 0;

  // 7. Fetch subscription
  const { data: subscriptions } = await adminClient
    .from('subscriptions')
    .select('*, subscription_plans(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // 8. Fetch payments
  const { data: payments } = await adminClient
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // 9. Fetch audit logs (activity trail)
  const { data: auditLogs } = await adminClient
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    profile: {
      ...profile,
      country: profile.countries?.name || profile.timezone || 'Global',
    },
    auth: {
      id: authUser.id,
      email: authUser.email,
      emailConfirmed: !!authUser.email_confirmed_at,
      createdAt: authUser.created_at,
      lastSignInAt: authUser.last_sign_in_at,
      isSuspended: authUser.user_metadata?.suspended === true,
      userMetadata: authUser.user_metadata,
      phone: authUser.phone,
    },
    roles,
    learning: {
      exam: activeExam,
      studyPrefs,
      stats: {
        questionsSolved: totalQuestionsSolved,
        accuracy,
        studyTimeMins: totalStudyTimeMins,
        streak: studySessions && studySessions.length > 0 ? studySessions.length : 0,
      },
    },
    subscription: subscriptions?.[0] || null,
    payments: payments || [],
    activity: auditLogs || [],
  };
}

// 9. Fetch all User Activity Logs
export async function getUserActivitiesAction(params: {
  page: number;
  pageSize: number;
  search: string;
  activityType?: string;
  userId?: string;
}) {
  await checkIsSupportOrAdmin();
  const adminClient = getSupabaseAdmin();

  let query = adminClient
    .from('audit_logs')
    .select('*, profiles(email, first_name, last_name)', { count: 'exact' });

  if (params.userId) {
    query = query.eq('user_id', params.userId);
  }

  if (params.activityType && params.activityType !== 'all') {
    query = query.eq('action', params.activityType);
  }

  if (params.search) {
    const q = params.search.trim();
    query = query.or(`action.ilike.%${q}%,entity_type.ilike.%${q}%`);
  }

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  const { data: logs, error, count } = await query
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return {
    logs: logs || [],
    totalCount: count || 0,
  };
}

// 10. Fetch Roles & Permissions Matrix
export async function getRolesAndPermissionsAction() {
  await checkIsSupportOrAdmin();
  const adminClient = getSupabaseAdmin();

  // 1. Fetch roles
  const { data: roles, error: rError } = await adminClient
    .from('roles')
    .select('*')
    .order('name');

  if (rError) throw rError;

  // 2. Fetch permissions
  let { data: permissions, error: pError } = await adminClient
    .from('permissions')
    .select('*')
    .order('name');

  if (pError) throw pError;

  // Seed default permissions if table is empty
  if (!permissions || permissions.length === 0) {
    const standardPermissions = [
      { name: 'view_users', category: 'Users', description: 'Permission to view list of platform users' },
      { name: 'edit_users', category: 'Users', description: 'Permission to modify user roles, statuses, and profiles' },
      { name: 'manage_exams', category: 'Exams', description: 'Permission to create, update, or archive exams' },
      { name: 'manage_content', category: 'Content', description: 'Permission to create and approve MCQ questions and study notes' },
      { name: 'ai_settings', category: 'AI', description: 'Permission to tune AI parameters and models' },
      { name: 'revenue', category: 'Finance', description: 'Permission to manage plans, transactions, coupons, and refunds' },
      { name: 'system', category: 'System', description: 'Permission to view database, cron logs, and metrics' },
    ];
    
    const { data: seededPerms, error: seedError } = await adminClient
      .from('permissions')
      .insert(standardPermissions)
      .select();
    
    if (seedError) {
      console.error('Failed to seed standard permissions:', seedError);
    } else {
      permissions = seededPerms || [];
    }
  }

  // 3. Fetch role mappings
  const { data: rolePermissions, error: rpError } = await adminClient
    .from('role_permissions')
    .select('*');

  if (rpError) throw rpError;

  // 4. Fetch count of users per role
  const { data: userRoles, error: urError } = await adminClient
    .from('user_roles')
    .select('role_id');

  if (urError) throw urError;

  const roleCounts = userRoles?.reduce((acc: Record<string, number>, ur) => {
    acc[ur.role_id] = (acc[ur.role_id] || 0) + 1;
    return acc;
  }, {}) || {};

  return {
    roles: roles.map((r) => ({
      ...r,
      userCount: roleCounts[r.id] || 0,
    })),
    permissions: permissions || [],
    rolePermissions: rolePermissions || [],
  };
}

// 11. Toggle Role-Permission Matrix Element
export async function togglePermissionForRoleAction(roleId: string, permissionId: string, hasPermission: boolean) {
  const adminUser = await checkIsAdmin();
  const adminClient = getSupabaseAdmin();

  if (hasPermission) {
    const { error } = await adminClient
      .from('role_permissions')
      .insert({ role_id: roleId, permission_id: permissionId });
    if (error) throw error;
  } else {
    const { error } = await adminClient
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId);
    if (error) throw error;
  }

  // Security audit log entry
  await adminClient.from('audit_logs').insert({
    user_id: adminUser.id,
    action: 'PERMISSION_TOGGLED',
    entity_type: 'roles',
    entity_id: roleId,
    details: { role_id: roleId, permission_id: permissionId, assigned: hasPermission, admin_email: adminUser.email }
  });

  return { success: true };
}

// 12. Update User Roles mapping
export async function changeUserRoleAction(userId: string, roleId: string, actionType: 'add' | 'remove') {
  const adminUser = await checkIsAdmin();
  const adminClient = getSupabaseAdmin();

  if (actionType === 'add') {
    const { error } = await adminClient
      .from('user_roles')
      .insert({ user_id: userId, role_id: roleId });
    if (error) throw error;
  } else {
    const { error } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);
    if (error) throw error;
  }

  // Security audit log entry
  await adminClient.from('audit_logs').insert({
    user_id: adminUser.id,
    action: 'USER_ROLE_CHANGED',
    entity_type: 'profiles',
    entity_id: userId,
    details: { target_user_id: userId, role_id: roleId, action_type: actionType, admin_email: adminUser.email }
  });

  return { success: true };
}

// 13. Fetch real platform subscriptions with pagination & filtering
export async function getSubscriptionsAction(params: {
  page: number;
  pageSize: number;
  status?: string;
  search?: string;
}) {
  await checkIsSupportOrAdmin();
  const adminClient = getSupabaseAdmin();

  let query = adminClient
    .from('subscriptions')
    .select('*, profiles(email, first_name, last_name), subscription_plans(*)', { count: 'exact' });

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params.search) {
    const q = params.search.trim();
    const { data: matchingProfiles } = await adminClient
      .from('profiles')
      .select('id')
      .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
    const userIds = matchingProfiles?.map((p) => p.id) || [];
    query = query.in('user_id', userIds);
  }

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  const { data: subs, error, count } = await query
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return {
    subscriptions: subs || [],
    totalCount: count || 0,
  };
}

// 14. Fetch actual live dashboard metrics
export async function getLiveDashboardMetricsAction(timeRange: string = '7_days') {
  await checkIsSupportOrAdmin();
  const adminClient = getSupabaseAdmin();

  // Helper for date ranges
  let startDate = new Date();
  if (timeRange === '7_days') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (timeRange === '30_days') {
    startDate.setDate(startDate.getDate() - 30);
  } else {
    startDate = new Date(0); // All time
  }

  const results: Record<string, any> = {};

  // 1. Total Users Count
  try {
    const { count, error } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    results.totalUsers = count !== null ? count : 'Awaiting first event';
  } catch (err) {
    results.totalUsers = 'Service unavailable';
  }

  // 2. New Users Count (last 7 / 30 days)
  try {
    let q = adminClient.from('profiles').select('id', { count: 'exact', head: true });
    if (timeRange !== 'all') {
      q = q.gte('created_at', startDate.toISOString());
    }
    const { count, error } = await q;
    if (error) throw error;
    results.newUsers = count !== null ? count : 0;
  } catch (err) {
    results.newUsers = 'Service unavailable';
  }

  // 3. Active Users Count (distinct user_ids from study sessions)
  try {
    let q = adminClient.from('study_sessions').select('user_id');
    if (timeRange !== 'all') {
      q = q.gte('completed_at', startDate.toISOString());
    }
    const { data, error } = await q;
    if (error) throw error;
    const uniqueUsers = new Set(data?.map(d => d.user_id) || []);
    results.activeUsers = uniqueUsers.size > 0 ? uniqueUsers.size : 'Awaiting first event';
  } catch (err) {
    results.activeUsers = 'Not configured';
  }

  // 4. Premium Users Count (active subscriptions)
  try {
    const { count, error } = await adminClient
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
    if (error) throw error;
    results.premiumUsers = count !== null ? count : 0;
  } catch (err) {
    results.premiumUsers = 'Service unavailable';
  }

  // 5. Monthly Revenue
  try {
    let q = adminClient
      .from('payments')
      .select('amount, created_at')
      .in('status', ['captured', 'completed', 'success']);
    if (timeRange !== 'all') {
      q = q.gte('created_at', startDate.toISOString());
    }
    const { data, error } = await q;
    if (error) throw error;
    const sum = data?.reduce((acc, p) => acc + Number(p.amount || 0), 0) || 0;
    results.revenue = sum;

    // Daily revenue calculation for chart
    const dailyRev = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      const dayPayments = data?.filter(p => {
        const created = new Date(p.created_at);
        return created.toDateString() === dateStr;
      }) || [];
      const daySum = dayPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      dailyRev.push({ name: label, revenue: daySum });
    }
    results.dailyRevenue = dailyRev;
  } catch (err) {
    results.revenue = 'Service unavailable';
    results.dailyRevenue = [];
  }

  // 6. AI Requests Count
  try {
    let q = adminClient.from('ai_generation_jobs').select('id', { count: 'exact', head: true });
    if (timeRange !== 'all') {
      q = q.gte('created_at', startDate.toISOString());
    }
    const { count, error } = await q;
    if (error) throw error;
    results.aiRequests = count !== null ? count : 'Awaiting first event';
  } catch (err) {
    results.aiRequests = 'Service unavailable';
  }

  // 7. Questions Generated Count
  try {
    const { count, error } = await adminClient
      .from('mcqs')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    results.questionsGenerated = count !== null ? count : 'Awaiting first event';
  } catch (err) {
    results.questionsGenerated = 'Not configured';
  }

  // 8. Questions Solved Count
  try {
    let q = adminClient.from('study_sessions').select('questions_answered');
    if (timeRange !== 'all') {
      q = q.gte('completed_at', startDate.toISOString());
    }
    const { data, error } = await q;
    if (error) throw error;
    const sum = data?.reduce((acc, s) => acc + Number(s.questions_answered || 0), 0) || 0;
    results.questionsSolved = sum > 0 ? sum : 'Awaiting first event';
  } catch (err) {
    results.questionsSolved = 'Not configured';
  }

  // 9. Learning Sessions Count
  try {
    let q = adminClient.from('study_sessions').select('id', { count: 'exact', head: true });
    if (timeRange !== 'all') {
      q = q.gte('completed_at', startDate.toISOString());
    }
    const { count, error } = await q;
    if (error) throw error;
    results.learningSessions = count !== null ? count : 'Awaiting first event';
  } catch (err) {
    results.learningSessions = 'Not configured';
  }

  // 10. AI Cost
  try {
    const { data: costEvents, error: costErr } = await adminClient
      .from('ai_cost_events')
      .select('actual_provider_cost, ai_infrastructure_cost');
    if (!costErr && costEvents && costEvents.length > 0) {
      const totalCost = costEvents.reduce((sum, ev) => sum + (Number(ev.actual_provider_cost || 0) + Number(ev.ai_infrastructure_cost || 0)), 0);
      results.aiCost = `₹${Math.round(totalCost * 83.5).toLocaleString()}`;
    } else {
      const { data: jobs } = await adminClient.from('ai_generation_jobs').select('input_params, status, result');
      if (jobs && jobs.length > 0) {
        let totalCostUsd = 0;
        jobs.forEach((j: any) => {
          const pricing = { inputPerM: 0.10, outputPerM: 0.40 };
          const estInput = j.input_params?.estimated_input_tokens || 850;
          const estOutput = j.result?.generated_count ? j.result.generated_count * 220 : (j.status === 'completed' ? 2400 : 0);
          totalCostUsd += (estInput / 1000000) * pricing.inputPerM + (estOutput / 1000000) * pricing.outputPerM;
        });
        results.aiCost = `₹${Math.round(totalCostUsd * 83.5).toLocaleString()}`;
      } else {
        results.aiCost = 'Awaiting first event';
      }
    }
  } catch (err) {
    results.aiCost = 'Not configured';
  }

  // 11. Storage Used
  try {
    const { data: buckets, error: storageErr } = await adminClient.storage.listBuckets();
    if (storageErr) throw storageErr;
    if (buckets && buckets.length > 0) {
      let totalSizeMB = 0;
      for (const b of buckets) {
        const { data: files } = await adminClient.storage.from(b.id).list();
        files?.forEach(f => {
          totalSizeMB += (f.metadata?.size || 0) / (1024 * 1024);
        });
      }
      results.storageUsed = totalSizeMB > 1024 ? `${(totalSizeMB / 1024).toFixed(2)} GB` : `${totalSizeMB.toFixed(2)} MB`;
    } else {
      results.storageUsed = '0.00 MB';
    }
  } catch (err) {
    results.storageUsed = 'Service unavailable';
  }

  // 12. Failed Jobs Count
  try {
    const { count, error } = await adminClient
      .from('ai_generation_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed');
    if (error) throw error;
    results.failedJobs = count !== null ? count : 0;
  } catch (err) {
    results.failedJobs = 'Service unavailable';
  }

  // 13. Subscriptions Count
  try {
    const { count, error } = await adminClient
      .from('subscriptions')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    results.subscriptions = count !== null ? count : 'Awaiting first event';
  } catch (err) {
    results.subscriptions = 'Service unavailable';
  }

  // 14. Payments Count
  try {
    const { count, error } = await adminClient
      .from('payments')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    results.payments = count !== null ? count : 'Awaiting first event';
  } catch (err) {
    results.payments = 'Service unavailable';
  }

  // 15. Refunds Count
  try {
    const { data, error } = await adminClient
      .from('payments')
      .select('amount')
      .eq('status', 'refunded');
    if (error) throw error;
    results.refundsCount = data ? data.length : 0;
    const sum = data?.reduce((acc, p) => acc + Number(p.amount || 0), 0) || 0;
    results.refundAmount = sum;
  } catch (err) {
    results.refundsCount = 'Service unavailable';
    results.refundAmount = 'Service unavailable';
  }

  // 16. Credits Sold & Used
  try {
    const { data: ledgerIn } = await adminClient
      .from('credit_ledger')
      .select('credits')
      .eq('transaction_type', 'PURCHASE');
    const creditsSold = ledgerIn?.reduce((acc, curr) => acc + Number(curr.credits || 0), 0) || 0;

    const { data: ledgerOut } = await adminClient
      .from('credit_ledger')
      .select('credits')
      .in('transaction_type', ['DEDUCTION', 'CONSUMPTION', 'USE', 'GENERATION']);
    const creditsUsed = ledgerOut?.reduce((acc, curr) => acc + Math.abs(Number(curr.credits || 0)), 0) || 0;

    results.creditsSold = creditsSold;
    results.creditsUsed = creditsUsed;
  } catch (err) {
    results.creditsSold = 'Not configured';
    results.creditsUsed = 'Not configured';
  }

  // 17. AI Gross Margin
  try {
    let totalCostUsd = 0;
    const { data: costEvents } = await adminClient.from('ai_cost_events').select('actual_provider_cost, ai_infrastructure_cost');
    if (costEvents && costEvents.length > 0) {
      totalCostUsd = costEvents.reduce((sum, ev) => sum + (Number(ev.actual_provider_cost || 0) + Number(ev.ai_infrastructure_cost || 0)), 0);
    } else {
      const { data: jobs } = await adminClient.from('ai_generation_jobs').select('input_params, status, result');
      if (jobs && jobs.length > 0) {
        jobs.forEach((j: any) => {
          const pricing = { inputPerM: 0.10, outputPerM: 0.40 };
          const estInput = j.input_params?.estimated_input_tokens || 850;
          const estOutput = j.result?.generated_count ? j.result.generated_count * 220 : (j.status === 'completed' ? 2400 : 0);
          totalCostUsd += (estInput / 1000000) * pricing.inputPerM + (estOutput / 1000000) * pricing.outputPerM;
        });
      }
    }

    let revenueUsd = 0;
    const { data: payments } = await adminClient.from('payments').select('amount, currency').in('status', ['captured', 'completed', 'success']);
    payments?.forEach(p => {
      const amt = Number(p.amount || 0);
      revenueUsd += p.currency === 'INR' ? amt / 83.5 : amt;
    });

    if (revenueUsd > 0) {
      const margin = ((revenueUsd - totalCostUsd) / revenueUsd) * 100;
      results.aiGrossMargin = `${margin.toFixed(1)}%`;
    } else {
      results.aiGrossMargin = 'Not enough data';
    }
  } catch (err) {
    results.aiGrossMargin = 'Service unavailable';
  }

  return results;
}

// 18. Fetch all Exam Switch Requests (for admin audit & monitoring)
export async function getAllExamSwitchRequestsAction() {
  await checkIsSupportOrAdmin();
  const adminClient = getSupabaseAdmin();

  const { data, error } = await adminClient
    .from('exam_switch_requests')
    .select(`
      *,
      profiles:user_id(id, email, first_name, last_name),
      from_exam:from_exam_id(id, name),
      to_exam:to_exam_id(id, name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// 19. Fetch Exam Switch History
export async function getAllExamSwitchHistoryAction() {
  await checkIsSupportOrAdmin();
  const adminClient = getSupabaseAdmin();

  const { data, error } = await adminClient
    .from('exam_switch_history')
    .select(`
      *,
      profiles:user_id(id, email, first_name, last_name),
      from_exam:from_exam_id(id, name),
      to_exam:to_exam_id(id, name)
    `)
    .order('switched_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// 20. Admin Manual Exam Switch (Overrides/Corrections)
export async function adminManualExamSwitchAction(params: {
  userId: string;
  targetExamId: string;
  reason?: string;
}) {
  const adminUser = await checkIsAdmin();
  const adminClient = getSupabaseAdmin();

  const { data: targetExam, error: examErr } = await adminClient
    .from('exams')
    .select('id, name')
    .eq('id', params.targetExamId)
    .single();

  if (examErr || !targetExam) throw new Error('Target exam not found');

  const { data: profile } = await adminClient
    .from('profiles')
    .select('current_exam_id, exam_switch_count')
    .eq('id', params.userId)
    .single();

  const fromExamId = profile?.current_exam_id || params.targetExamId;
  const newCount = (profile?.exam_switch_count || 0) + 1;

  // Update Profile
  await adminClient
    .from('profiles')
    .update({
      current_exam_id: params.targetExamId,
      exam_locked: true,
      exam_selected_at: new Date().toISOString(),
      exam_switch_count: newCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.userId);

  // Upsert user_exams
  await adminClient.from('user_exams').upsert({
    user_id: params.userId,
    exam_id: params.targetExamId,
    status: 'in_progress',
    target_score: 85.0,
  }, { onConflict: 'user_id,exam_id' });

  // Record audit history
  await adminClient.from('exam_switch_history').insert({
    user_id: params.userId,
    from_exam_id: fromExamId,
    to_exam_id: params.targetExamId,
    amount: 0.00,
    currency: 'USD',
    payment_reference: `admin_override_by_${adminUser.id}`,
    switched_at: new Date().toISOString(),
  });

  revalidatePath('/admin');
  return { success: true, message: `Exam manually switched to ${targetExam.name}` };
}

// 21. Fetch all Exams for Admin selectors
export async function getAllExamsAction() {
  await checkIsSupportOrAdmin();
  const adminClient = getSupabaseAdmin();
  const { data, error } = await adminClient
    .from('exams')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

