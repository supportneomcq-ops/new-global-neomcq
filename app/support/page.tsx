'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Cpu,
  DollarSign,
  Search,
  Key,
  RefreshCw,
  Loader2,
  LogOut,
  HelpCircle,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  getAllUsersAction,
  resetUserPasswordAction,
  getSystemMetricsAction
} from '@/app/actions/admin';

export default function SupportDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'jobs' | 'revenue'>('users');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({ jobs: [], subscriptions: [] });
  const [userSearch, setUserSearch] = useState('');
  
  // Reset password State
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  // Selected student help detail
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const loadData = async () => {
    try {
      const allUsers = await getAllUsersAction();
      setUsers(allUsers);
      
      const allMetrics = await getSystemMetricsAction();
      setMetrics(allMetrics);
    } catch (err) {
      console.error('Error fetching support details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      // Defer to make it fully asynchronous
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      try {
        const allUsers = await getAllUsersAction();
        if (!active) return;
        setUsers(allUsers);
        
        const allMetrics = await getSystemMetricsAction();
        if (!active) return;
        setMetrics(allMetrics);
      } catch (err) {
        console.error('Error fetching support details:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const { getSupabaseClient } = await import('@/lib/supabase');
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      localStorage.removeItem('neomcq_user_session');
      router.push('/auth/sign-in');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    if (!resettingUser || !newPassword) return;

    try {
      setActionLoading(true);
      const res = await resetUserPasswordAction(resettingUser.id, newPassword);
      if (res?.error) {
        setResetError(res.error);
      } else {
        setResetSuccess('Student password updated successfully');
        setNewPassword('');
        setTimeout(() => setResettingUser(null), 1500);
      }
    } catch (err: any) {
      setResetError(err?.message || 'Failed to update student password');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const searchString = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase();
    return searchString.includes(userSearch.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#050816]">
        <Loader2 className="w-12 h-12 text-[#00D4FF] animate-spin" />
        <p className="mt-4 text-sm font-heading font-bold text-slate-600 dark:text-gray-300">
          Loading NeoMCQ Support Helpdesk...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050816] text-slate-900 dark:text-white pb-16 font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/85 dark:border-gray-800/80 bg-white/85 dark:bg-[#050816]/85 backdrop-blur-md">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full tracking-wider">
              Support Desk
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Helpdesk Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 to-[#00D4FF]/10 border border-amber-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-black">NeoMCQ Support Helpdesk</h1>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Help students reset credentials, view active subscriptions, track AI generation status, and manage active learning experiences.
              </p>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Desk</span>
            </button>
          </div>
        </div>

        {/* Support Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold border-b border-slate-200 dark:border-gray-800">
          {[
            { id: 'users', label: 'Student Accounts', icon: Users },
            { id: 'jobs', label: 'AI Generation Status', icon: Cpu },
            { id: 'revenue', label: 'Subscriptions List', icon: DollarSign },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200/60 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT/CENTER 2 COLS: MAIN TABLE */}
          <div className="lg:col-span-2 min-h-[300px]">
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search students by name, email..."
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-amber-500 text-xs font-medium"
                  />
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#0E1324] overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                      <tr>
                        <th className="p-4">Student</th>
                        <th className="p-4">Timezone</th>
                        <th className="p-4">Roles</th>
                        <th className="p-4 text-right">Help Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400">No student accounts found.</td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isAdmin = u.roles.includes('admin') || u.roles.includes('super_admin');
                          return (
                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                              <td className="p-4">
                                <div className="font-bold">{u.firstName} {u.lastName}</div>
                                <div className="text-[10px] text-slate-500">{u.email}</div>
                              </td>
                              <td className="p-4 text-slate-500">{u.country}</td>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-1">
                                  {u.roles.map((r: string) => (
                                    <span key={r} className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                                      {r}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedUser(u)}
                                  className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 cursor-pointer inline-flex items-center"
                                  title="Inspect Account"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {!isAdmin && (
                                  <button
                                    onClick={() => {
                                      setResettingUser(u);
                                      setResetSuccess('');
                                      setResetError('');
                                    }}
                                    className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 cursor-pointer inline-flex items-center"
                                    title="Reset Password"
                                  >
                                    <Key className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="rounded-3xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#0E1324] overflow-hidden text-xs">
                <div className="p-4 border-b border-slate-200 dark:border-gray-800 font-bold text-slate-800 dark:text-gray-200">
                  AI Question Generation Status
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300">
                    <tr>
                      <th className="p-3">Job ID</th>
                      <th className="p-3">Job Type</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                    {metrics.jobs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">No active AI generation status found.</td>
                      </tr>
                    ) : (
                      metrics.jobs.map((j: any) => (
                        <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                          <td className="p-3 font-mono text-[#00D4FF]">{j.id.slice(0, 8)}...</td>
                          <td className="p-3 font-bold">{j.job_type}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                              j.status === 'completed' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
                            }`}>
                              {j.status}
                            </span>
                          </td>
                          <td className="p-3 text-right text-slate-500">{new Date(j.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'revenue' && (
              <div className="rounded-3xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#0E1324] overflow-hidden text-xs">
                <div className="p-4 border-b border-slate-200 dark:border-gray-800 font-bold text-slate-800 dark:text-gray-200">
                  Active Subscriber Receipts
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300">
                    <tr>
                      <th className="p-4">Student</th>
                      <th className="p-4">Plan Name</th>
                      <th className="p-4">Paid Amount</th>
                      <th className="p-4 text-right">Subscribed On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                    {metrics.subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">No active Razorpay subscriptions found.</td>
                      </tr>
                    ) : (
                      metrics.subscriptions.map((sub: any) => (
                        <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                          <td className="p-4">
                            <div className="font-bold">{sub.profiles?.first_name} {sub.profiles?.last_name}</div>
                            <div className="text-[10px] text-slate-500">{sub.profiles?.email}</div>
                          </td>
                          <td className="p-4 font-bold text-[#00D4FF]">{sub.subscription_plans?.name}</td>
                          <td className="p-4 text-emerald-500 font-bold">₹{sub.amount || 999}</td>
                          <td className="p-4 text-right text-slate-500">{new Date(sub.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT 1 COL: INSPECTOR PANEL */}
          <div className="space-y-4">
            <div className="p-6 bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 space-y-4 text-xs">
              <h3 className="font-heading font-extrabold text-sm flex items-center gap-2 text-slate-800 dark:text-gray-100">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <span>Student Inspector</span>
              </h3>

              {selectedUser ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Full Name</div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedUser.firstName} {selectedUser.lastName}</div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Email Address</div>
                    <div className="font-bold text-slate-800 dark:text-gray-300">{selectedUser.email}</div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Country Location</div>
                    <div className="font-bold text-slate-800 dark:text-gray-300">{selectedUser.country}</div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Registration Date</div>
                    <div className="font-bold text-slate-800 dark:text-gray-300">{new Date(selectedUser.createdAt).toLocaleDateString()}</div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Syllabus Status</div>
                    <div className="font-bold text-emerald-500">Active study session synchronized</div>
                  </div>

                  <button
                    onClick={() => setSelectedUser(null)}
                    className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl text-center font-bold cursor-pointer"
                  >
                    Clear Inspector
                  </button>
                </div>
              ) : (
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Select any student account from the student ledger list to inspect active subscription histories, geographic parameters, and security credentials.
                </p>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* PASSWORD RESET MODAL */}
      {resettingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 w-full max-w-sm rounded-3xl p-6 relative">
            <h4 className="text-lg font-heading font-extrabold mb-1">Reset Password</h4>
            <p className="text-[11px] text-slate-400 mb-4">Resetting student credentials for: <strong>{resettingUser.email}</strong></p>

            {resetError && (
              <div className="p-3 mb-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}
            {resetSuccess && (
              <div className="p-3 mb-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-gray-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 dark:text-gray-300 dark:border-gray-800 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:opacity-90 text-white flex items-center gap-1 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
