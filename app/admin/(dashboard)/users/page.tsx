'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Ban,
  CheckCircle,
  ShieldAlert,
  Plus,
  RefreshCw,
  Key,
  Loader2,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  UserCheck,
  Shield,
  CreditCard,
  BookOpen,
  Calendar,
  X,
  Lock,
} from 'lucide-react';
import {
  getUsersPaginatedAction,
  createSupportAccountAction,
  toggleSupportRoleAction,
  toggleUserSuspensionAction,
  resetUserPasswordAction,
  getRolesAndPermissionsAction,
  changeUserRoleAction,
} from '@/app/actions/admin';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState('');

  // Available roles for filter / assignment
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);

  // Create Support staff Modal State
  const [isCreateSupportOpen, setIsCreateSupportOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPassword, setSupportPassword] = useState('');
  const [supportFirstName, setSupportFirstName] = useState('');
  const [supportLastName, setSupportLastName] = useState('');
  const [supportError, setSupportError] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);

  // Reset password Modal State
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  // Change Roles Modal State
  const [roleManagingUser, setRoleManagingUser] = useState<any | null>(null);
  const [roleChangeSuccess, setRoleChangeSuccess] = useState('');
  const [roleChangeError, setRoleChangeError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsersPaginatedAction({
        page,
        pageSize,
        search,
        role: selectedRole || undefined,
        status: selectedStatus || undefined,
        subscription: selectedSubscription || undefined,
      });
      setUsers(res.users || []);
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      console.error('Error fetching admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await getRolesAndPermissionsAction();
      setAvailableRoles(res.roles || []);
    } catch (err) {
      console.error('Failed to load roles list:', err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, pageSize, selectedRole, selectedStatus, selectedSubscription]);

  useEffect(() => {
    loadRoles();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleCreateSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setSupportError('');
    setSupportSuccess(false);

    try {
      const res = await createSupportAccountAction({
        email: supportEmail,
        password: supportPassword,
        firstName: supportFirstName,
        lastName: supportLastName,
      });

      if (res?.error) {
        setSupportError(res.error);
      } else {
        setSupportSuccess(true);
        setSupportEmail('');
        setSupportPassword('');
        setSupportFirstName('');
        setSupportLastName('');
        await loadUsers();
        setTimeout(() => {
          setIsCreateSupportOpen(false);
          setSupportSuccess(false);
        }, 1200);
      }
    } catch (err: any) {
      setSupportError(err.message || 'Failed to create support account');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSupportRole = async (userId: string, currentRoles: string[]) => {
    const isSupport = currentRoles.includes('support');
    setActionLoading(true);
    try {
      await toggleSupportRoleAction(userId, !isSupport);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error updating user role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspension = async (userId: string, currentSuspended: boolean) => {
    setActionLoading(true);
    try {
      await toggleUserSuspensionAction(userId, !currentSuspended);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error toggling user suspension');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newPassword) return;
    setActionLoading(true);
    setResetError('');
    setResetSuccess('');

    try {
      const res = await resetUserPasswordAction(resettingUser.id, newPassword);
      if (res?.error) {
        setResetError(res.error);
      } else {
        setResetSuccess(`Password updated successfully for ${resettingUser.email}`);
        setNewPassword('');
        setTimeout(() => {
          setResettingUser(null);
          setResetSuccess('');
        }, 1200);
      }
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset user password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUserRoleToggle = async (userId: string, roleId: string, currentAssigned: boolean) => {
    setActionLoading(true);
    setRoleChangeError('');
    setRoleChangeSuccess('');
    try {
      await changeUserRoleAction(userId, roleId, currentAssigned ? 'remove' : 'add');
      setRoleChangeSuccess('Role membership updated successfully.');
      await loadUsers();
      // Update local modal user roles list
      if (roleManagingUser) {
        const roleObj = availableRoles.find((r) => r.id === roleId);
        if (roleObj) {
          const updatedRoles = currentAssigned
            ? roleManagingUser.roles.filter((rName: string) => rName !== roleObj.name)
            : [...roleManagingUser.roles, roleObj.name];
          setRoleManagingUser({ ...roleManagingUser, roles: updatedRoles });
        }
      }
    } catch (err: any) {
      setRoleChangeError(err.message || 'Failed to modify user role');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Users className="w-6 h-6 text-[#6D5BFF]" />
            <span>User Directory & Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Search production profiles, verify email statuses, assign RBAC permissions, reset access, or suspend users.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadUsers}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-200 dark:hover:bg-gray-800 transition-colors"
            title="Refresh Users List"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateSupportOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer hover:opacity-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Support Staff</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or UUID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF]"
          >
            <option value="">All Roles</option>
            {availableRoles.map((r) => (
              <option key={r.id} value={r.name}>
                Role: {r.name}
              </option>
            ))}
          </select>

          {/* Account Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF]"
          >
            <option value="">All Account Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending_verification">Pending Verification</option>
          </select>

          {/* Subscription Filter */}
          <select
            value={selectedSubscription}
            onChange={(e) => {
              setSelectedSubscription(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF]"
          >
            <option value="">All Subscriptions</option>
            <option value="active">Active Pro / Premium</option>
            <option value="free">Free Tier</option>
            <option value="canceled">Canceled</option>
            <option value="past_due">Past Due</option>
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF]"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#6D5BFF]" />
            <span>Loading database users...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Selected Exam</th>
                  <th className="p-4">Region / Country</th>
                  <th className="p-4">Registered On</th>
                  <th className="p-4">Assigned Roles</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No matching user profiles found in database.
                    </td>
                  </tr>
                ) : (
                  users.map((u: any) => {
                    const isSupport = u.roles.includes('support');
                    const isSuperAdmin = u.roles.includes('super_admin');
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30 transition-colors">
                        <td className="p-4">
                          <Link href={`/admin/users/${u.id}`} className="hover:underline block">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {u.firstName} {u.lastName}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                              <span>{u.email}</span>
                              {!u.emailVerified && (
                                <span className="text-amber-500 font-bold text-[9px]">(Unverified)</span>
                              )}
                            </div>
                          </Link>
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                            {u.exam || 'Not Selected'}
                          </span>
                        </td>

                        <td className="p-4 text-slate-700 dark:text-gray-300">{u.country}</td>

                        <td className="p-4 text-slate-500">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r: string) => (
                              <span
                                key={r}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                                  r === 'super_admin'
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    : r === 'admin'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : r === 'support'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                }`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="p-4">
                          {u.isSuspended ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1 w-fit">
                              <Ban className="w-3 h-3" /> Suspended
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 w-fit">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right space-x-2">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </Link>

                          <button
                            disabled={actionLoading}
                            onClick={() => setRoleManagingUser(u)}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                          >
                            <Shield className="w-3 h-3 inline mr-1" />
                            Roles
                          </button>

                          <button
                            disabled={actionLoading}
                            onClick={() => setResettingUser(u)}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            <Key className="w-3 h-3 inline mr-1" />
                            Reset
                          </button>

                          <button
                            disabled={actionLoading || isSuperAdmin}
                            onClick={() => handleToggleSuspension(u.id, u.isSuspended)}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer ${
                              u.isSuspended
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
                            title={isSuperAdmin ? 'Super Admin cannot be suspended' : undefined}
                          >
                            {u.isSuspended ? 'Reactivate' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900 dark:text-white">{users.length}</span> of{' '}
            <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span> total users
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-gray-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-gray-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-gray-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Support Staff Modal */}
      {isCreateSupportOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-lg">Provision Support Staff Member</h3>
              <button
                onClick={() => setIsCreateSupportOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Create an operational support account with permission to manage ticket queues and user analytics.
            </p>

            {supportError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{supportError}</span>
              </div>
            )}

            {supportSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>Support staff provisioned successfully!</span>
              </div>
            )}

            <form onSubmit={handleCreateSupport} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={supportFirstName}
                    onChange={(e) => setSupportFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={supportLastName}
                    onChange={(e) => setSupportLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Support Email</label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support.agent@neomcq.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={supportPassword}
                  onChange={(e) => setSupportPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSupportOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white font-bold text-xs"
                >
                  {actionLoading ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-lg">Reset User Password</h3>
              <button
                onClick={() => setResettingUser(null)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Specify a new secure password for{' '}
              <span className="font-bold text-slate-900 dark:text-white">{resettingUser.email}</span>.
            </p>

            {resetError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white font-bold text-xs"
                >
                  {actionLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {roleManagingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-lg">Manage RBAC User Roles</h3>
              <button
                onClick={() => setRoleManagingUser(null)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Assign or revoke roles for{' '}
              <span className="font-bold text-slate-900 dark:text-white">{roleManagingUser.email}</span>.
            </p>

            {roleChangeError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
                {roleChangeError}
              </div>
            )}

            {roleChangeSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold">
                {roleChangeSuccess}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-slate-500 font-bold text-xs">Available System Roles</label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {availableRoles.map((role) => {
                  const isAssigned = roleManagingUser.roles.includes(role.name);
                  return (
                    <div
                      key={role.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs uppercase text-slate-900 dark:text-white">
                          {role.name}
                        </div>
                        <div className="text-[10px] text-slate-400">{role.description || 'System authorization role'}</div>
                      </div>

                      <button
                        disabled={actionLoading}
                        onClick={() => handleUserRoleToggle(roleManagingUser.id, role.id, isAssigned)}
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold border cursor-pointer transition-colors ${
                          isAssigned
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isAssigned ? 'Revoke Role' : 'Assign Role'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setRoleManagingUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
