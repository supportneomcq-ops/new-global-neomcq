'use client';

import React, { useState, useEffect } from 'react';
import { Users, Search, Ban, CheckCircle, ShieldAlert, Plus, RefreshCw, Key, Loader2, AlertCircle, Check } from 'lucide-react';
import { getAllUsersAction, createSupportAccountAction, toggleSupportRoleAction, toggleUserSuspensionAction, resetUserPasswordAction } from '@/app/actions/admin';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');

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

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllUsersAction();
      setUsers(allUsers || []);
    } catch (err) {
      console.error('Error fetching admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setSupportError('');
    setSupportSuccess(false);

    try {
      await createSupportAccountAction({
        email: supportEmail,
        password: supportPassword,
        firstName: supportFirstName,
        lastName: supportLastName,
      });
      setSupportSuccess(true);
      setSupportEmail('');
      setSupportPassword('');
      setSupportFirstName('');
      setSupportLastName('');
      await loadUsers();
      setTimeout(() => {
        setIsCreateSupportOpen(false);
        setSupportSuccess(false);
      }, 1500);
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
      await resetUserPasswordAction(resettingUser.id, newPassword);
      setResetSuccess(`Password updated successfully for ${resettingUser.email}`);
      setNewPassword('');
      setTimeout(() => {
        setResettingUser(null);
        setResetSuccess('');
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset user password');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.exam?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Users className="w-6 h-6 text-[#6D5BFF]" />
            <span>User Management Portal</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            View profiles, assign support roles, manage subscriptions, or suspend access.
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

      {/* User Search & Stats bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search users by name, email, or exam..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
          />
        </div>

        <div className="flex items-center gap-6 text-xs font-bold text-slate-500 dark:text-gray-400">
          <div>Total Users: <span className="text-slate-900 dark:text-white font-extrabold">{users.length}</span></div>
          <div>Active: <span className="text-emerald-500 font-extrabold">{users.filter((u) => !u.isSuspended).length}</span></div>
          <div>Suspended: <span className="text-rose-500 font-extrabold">{users.filter((u) => u.isSuspended).length}</span></div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#6D5BFF]" />
            <span>Loading user directory...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Selected Exam</th>
                  <th className="p-4">Global Region</th>
                  <th className="p-4">Registered On</th>
                  <th className="p-4">Assigned Roles</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No matching user profiles found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u: any) => {
                    const isSupport = u.roles.includes('support');
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{u.firstName} {u.lastName}</div>
                          <div className="text-[10px] text-slate-500 dark:text-gray-400">{u.email}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                            {u.exam || 'Not Selected'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-700 dark:text-gray-300">{u.country}</td>
                        <td className="p-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r: string) => (
                              <span key={r} className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
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
                          <button
                            disabled={actionLoading}
                            onClick={() => handleToggleSupportRole(u.id, u.roles)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer ${
                              isSupport
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20'
                                : 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:bg-slate-200'
                            }`}
                          >
                            {isSupport ? 'Demote Support' : 'Promote Support'}
                          </button>

                          <button
                            disabled={actionLoading}
                            onClick={() => setResettingUser(u)}
                            className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            <Key className="w-3 h-3 inline mr-1" />
                            Reset Password
                          </button>

                          <button
                            disabled={actionLoading}
                            onClick={() => handleToggleSuspension(u.id, u.isSuspended)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer ${
                              u.isSuspended
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
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
      </div>

      {/* Create Support Staff Modal */}
      {isCreateSupportOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 p-6 shadow-2xl space-y-4">
            <h3 className="font-heading font-black text-lg">Provision Support Staff Member</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Create an operational support account with permission to access ticket queues and user analytics.
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
            <h3 className="font-heading font-black text-lg">Reset User Password</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Specify a new secure password for <span className="font-bold text-slate-900 dark:text-white">{resettingUser.email}</span>.
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
    </div>
  );
}
