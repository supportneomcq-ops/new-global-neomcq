'use client';

import React, { useState, useEffect } from 'react';
import { useRouter as useNextRouter } from 'next/navigation';
import {
  Users,
  Cpu,
  DollarSign,
  BarChart3,
  Settings,
  ShieldAlert,
  Search,
  Ban,
  Plus,
  Key,
  RefreshCw,
  Lock,
  Check,
  CheckCircle2,
  AlertCircle,
  LogOut,
  UserCheck,
  UserX,
  Activity,
  Globe2,
  Loader2,
  HelpCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  getAllUsersAction,
  createSupportAccountAction,
  toggleSupportRoleAction,
  toggleUserSuspensionAction,
  resetUserPasswordAction,
  getSystemMetricsAction
} from '@/app/actions/admin';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboardPage() {
  const router = useNextRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'support' | 'jobs' | 'revenue' | 'analytics' | 'system'>('users');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({ jobs: [], subscriptions: [] });
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

  const loadData = async () => {
    try {
      const allUsers = await getAllUsersAction();
      setUsers(allUsers);
      
      const allMetrics = await getSystemMetricsAction();
      setMetrics(allMetrics);
    } catch (err) {
      console.error('Error fetching admin details:', err);
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
        console.error('Error fetching admin details:', err);
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

  // Actions
  const handleCreateSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportError('');
    setSupportSuccess(false);
    setActionLoading(true);

    try {
      const res = await createSupportAccountAction({
        email: supportEmail,
        password: supportPassword,
        firstName: supportFirstName,
        lastName: supportLastName
      });

      if (res?.error) {
        setSupportError(res.error);
      } else {
        setSupportSuccess(true);
        setSupportEmail('');
        setSupportPassword('');
        setSupportFirstName('');
        setSupportLastName('');
        await loadData();
        setTimeout(() => setIsCreateSupportOpen(false), 1500);
      }
    } catch (err: any) {
      setSupportError(err?.message || 'Failed to create support account');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSupport = async (userId: string, isSupport: boolean) => {
    if (!confirm(`Are you sure you want to ${isSupport ? 'demote' : 'promote'} this user?`)) return;
    try {
      setActionLoading(true);
      const res = await toggleSupportRoleAction(userId, !isSupport);
      if (res?.error) {
        alert(res.error);
      } else {
        await loadData();
      }
    } catch (err: any) {
      alert(err?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspension = async (userId: string, isSuspended: boolean) => {
    const actionText = isSuspended ? 'reactivate' : 'suspend';
    if (!confirm(`Are you sure you want to ${actionText} this user account?`)) return;

    try {
      setActionLoading(true);
      const res = await toggleUserSuspensionAction(userId, !isSuspended);
      if (res?.error) {
        alert(res.error);
      } else {
        await loadData();
      }
    } catch (err: any) {
      alert(err?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
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
        setResetSuccess('Password updated successfully');
        setNewPassword('');
        setTimeout(() => setResettingUser(null), 1500);
      }
    } catch (err: any) {
      setResetError(err?.message || 'Failed to update password');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const searchString = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase();
    return searchString.includes(userSearch.toLowerCase());
  });

  // Render Charts Data
  const jobStatusData = [
    { name: 'Completed', value: metrics.jobs.filter((j: any) => j.status === 'completed').length },
    { name: 'Processing', value: metrics.jobs.filter((j: any) => j.status === 'processing').length },
    { name: 'Pending', value: metrics.jobs.filter((j: any) => j.status === 'pending').length },
    { name: 'Failed', value: metrics.jobs.filter((j: any) => j.status === 'failed').length },
  ].filter(item => item.value > 0);

  const activeSubscriptionsData = metrics.subscriptions.map((sub: any, i: number) => ({
    name: sub.subscription_plans?.name || 'Pro Pass',
    price: sub.amount || 999,
    date: new Date(sub.created_at).toLocaleDateString(),
  })).slice(0, 10);

  const colors = ['#6D5BFF', '#00D4FF', '#F59E0B', '#EF4444'];

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#050816]">
        <Loader2 className="w-12 h-12 text-[#6D5BFF] animate-spin" />
        <p className="mt-4 text-sm font-heading font-bold text-slate-600 dark:text-gray-300">
          Loading NeoMCQ Control Room...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050816] text-slate-900 dark:text-white pb-16 font-sans">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/85 dark:border-gray-800/80 bg-white/85 dark:bg-[#050816]/85 backdrop-blur-md">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-[10px] font-extrabold uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full tracking-wider animate-pulse">
              System Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Welcome Section */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#6D5BFF]/10 to-[#00D4FF]/10 border border-[#6D5BFF]/35">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-black">NeoMCQ Administrative Control Room</h1>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Real-time management, analytics evaluation, security enforcement, and high-performance system configurations.
              </p>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Databases</span>
            </button>
          </div>
        </div>

        {/* Dashboard Menu Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold border-b border-slate-200 dark:border-gray-800">
          {[
            { id: 'users', label: 'All Users', icon: Users },
            { id: 'support', label: 'Support Accounts', icon: UserCheck },
            { id: 'jobs', label: 'AI Jobs & Status', icon: Cpu },
            { id: 'revenue', label: 'Razorpay Receipts', icon: DollarSign },
            { id: 'analytics', label: 'Syllabi Charts', icon: BarChart3 },
            { id: 'system', label: 'System Configuration', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#6D5BFF] text-white shadow-md'
                    : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200/60 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          
          {/* TAB 1: ALL USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name, email, country..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-xs font-medium"
                  />
                </div>

                <div className="text-xs font-bold text-slate-500 dark:text-gray-400">
                  Matches: <strong className="text-[#00D4FF]">{filteredUsers.length}</strong> / Total: <strong>{users.length}</strong>
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-3xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#0E1324] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                      <tr>
                        <th className="p-4">User Details</th>
                        <th className="p-4">Selected Exam</th>
                        <th className="p-4">Global Country</th>
                        <th className="p-4">Registered On</th>
                        <th className="p-4">Assigned Roles</th>
                        <th className="p-4">Account Status</th>
                        <th className="p-4 text-right">Administrative Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">No matching user profiles found.</td>
                        </tr>
                      ) : (
                        filteredUsers.map((u: any) => {
                          const isSupport = u.roles.includes('support');
                          return (
                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                              <td className="p-4">
                                <div className="font-bold text-slate-900 dark:text-white">{u.firstName} {u.lastName}</div>
                                <div className="text-[10px] text-slate-500">{u.email}</div>
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
                                    <span key={r} className="px-2 py-0.5 rounded-md font-bold text-[9px] bg-[#6D5BFF]/10 text-[#6D5BFF]">
                                      {r}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] ${
                                  u.isSuspended 
                                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                }`}>
                                  {u.isSuspended ? 'Suspended' : 'Active'}
                                </span>
                              </td>
                              <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setResettingUser(u);
                                    setResetSuccess('');
                                    setResetError('');
                                  }}
                                  className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 cursor-pointer inline-flex items-center gap-1"
                                  title="Reset Password"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleToggleSuspension(u.id, u.isSuspended)}
                                  className={`p-1.5 rounded-lg cursor-pointer inline-flex items-center ${
                                    u.isSuspended 
                                      ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                                      : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                                  }`}
                                  title={u.isSuspended ? 'Reactivate User' : 'Suspend User'}
                                >
                                  {u.isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUPPORT ACCOUNTS */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-heading font-bold text-slate-800 dark:text-gray-200">
                  Customer Support Representatives
                </h3>
                <button
                  onClick={() => {
                    setIsCreateSupportOpen(true);
                    setSupportError('');
                    setSupportSuccess(false);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Support Account</span>
                </button>
              </div>

              {/* Support Staff Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.filter(u => u.roles.includes('support')).map(u => (
                  <div key={u.id} className="p-5 bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-[#00D4FF]" />
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{u.firstName} {u.lastName}</h4>
                        <p className="text-[10px] text-slate-500">{u.email}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 text-[8px] font-black uppercase">
                        SUPPORT STAFF
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-gray-900 flex justify-between items-center text-xs">
                      <span className="text-slate-500 text-[10px]">Active representative</span>
                      <button
                        onClick={() => handleToggleSupport(u.id, true)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-[10px] font-bold cursor-pointer"
                      >
                        Demote to User
                      </button>
                    </div>
                  </div>
                ))}

                {users.filter(u => u.roles.includes('support')).length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                    No active support representative accounts found. Click the button above to add some.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AI JOBS & CACHE */}
          {activeTab === 'jobs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 text-center">
                  <div className="text-xs font-bold text-slate-500 dark:text-gray-400">Total Jobs logged</div>
                  <div className="text-3xl font-black mt-1 text-[#6D5BFF]">{metrics.jobs.length}</div>
                </div>
                <div className="p-5 bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 text-center">
                  <div className="text-xs font-bold text-slate-500 dark:text-gray-400">Processing</div>
                  <div className="text-3xl font-black mt-1 text-amber-500">
                    {metrics.jobs.filter((j: any) => j.status === 'processing').length}
                  </div>
                </div>
                <div className="p-5 bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 text-center">
                  <div className="text-xs font-bold text-slate-500 dark:text-gray-400">Succeeded</div>
                  <div className="text-3xl font-black mt-1 text-emerald-500">
                    {metrics.jobs.filter((j: any) => j.status === 'completed').length}
                  </div>
                </div>
                <div className="p-5 bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 text-center">
                  <div className="text-xs font-bold text-slate-500 dark:text-gray-400">Failed Pipelines</div>
                  <div className="text-3xl font-black mt-1 text-rose-500">
                    {metrics.jobs.filter((j: any) => j.status === 'failed').length}
                  </div>
                </div>
              </div>

              {/* Jobs Table */}
              <div className="rounded-3xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#0E1324] overflow-hidden text-xs">
                <div className="p-4 border-b border-slate-200 dark:border-gray-800 font-heading font-bold text-slate-800 dark:text-gray-200">
                  AI Generation Job History Log
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300">
                    <tr>
                      <th className="p-3">Job ID</th>
                      <th className="p-3">Syllabus / Type</th>
                      <th className="p-3">Created At</th>
                      <th className="p-3">Queue Status</th>
                      <th className="p-3 text-right">Retry Counts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                    {metrics.jobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">No active AI generation jobs found.</td>
                      </tr>
                    ) : (
                      metrics.jobs.map((j: any) => (
                        <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                          <td className="p-3 font-bold text-[#00D4FF]">{j.id.slice(0, 8)}...</td>
                          <td className="p-3 font-semibold">{j.job_type}</td>
                          <td className="p-3 text-slate-500">{new Date(j.created_at).toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                              j.status === 'completed' 
                                ? 'bg-emerald-500/15 text-emerald-500' 
                                : j.status === 'failed' 
                                ? 'bg-rose-500/15 text-rose-500' 
                                : 'bg-amber-500/15 text-amber-500'
                            }`}>
                              {j.status}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-600 dark:text-gray-300">{j.retry_count || 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: REVENUE & RECEIPTS */}
          {activeTab === 'revenue' && (
            <div className="space-y-4">
              <div className="p-5 bg-[#6D5BFF]/10 rounded-3xl border border-[#6D5BFF]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm">Secured Razorpay Payment Pipeline</h4>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Automatic receipts generation and webhook logs synchronized with production tables.</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-bold">Estimated MMR</div>
                  <div className="text-xl font-heading font-black text-emerald-500">₹84,950 / $1,020</div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="rounded-3xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#0E1324] overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300">
                    <tr>
                      <th className="p-4">Subscriber</th>
                      <th className="p-4">Syllabus Package</th>
                      <th className="p-4">Paid Amount</th>
                      <th className="p-4">Assigned On</th>
                      <th className="p-4">Razorpay Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                    {metrics.subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">No synchronized Razorpay receipts found.</td>
                      </tr>
                    ) : (
                      metrics.subscriptions.map((sub: any) => (
                        <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                          <td className="p-4">
                            <div className="font-bold">{sub.profiles?.first_name || 'Premium'} {sub.profiles?.last_name || 'Learner'}</div>
                            <div className="text-[10px] text-slate-500">{sub.profiles?.email}</div>
                          </td>
                          <td className="p-4 font-bold text-[#6D5BFF]">{sub.subscription_plans?.name}</td>
                          <td className="p-4 font-extrabold text-emerald-500">₹{sub.amount || 999}</td>
                          <td className="p-4 text-slate-500">{new Date(sub.created_at).toLocaleDateString()}</td>
                          <td className="p-4 font-mono text-slate-400">{sub.razorpay_subscription_id || 'sub_demo_781'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ANALYTICS CHARTS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Chart 1 */}
                <div className="p-5 bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-gray-400">AI Pipelines Status distribution</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={jobStatusData}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                        <YAxis stroke="#888888" fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6D5BFF">
                          {jobStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2 */}
                <div className="p-5 bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-gray-400">Recent Revenue Flow</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activeSubscriptionsData.length > 0 ? activeSubscriptionsData : [{ name: 'August 1', price: 999 }, { name: 'August 2', price: 1998 }, { name: 'August 3', price: 1499 }]}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                        <YAxis stroke="#888888" fontSize={10} />
                        <Tooltip />
                        <Area type="monotone" dataKey="price" stroke="#00D4FF" fill="#00D4FF" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 6: SYSTEM CONFIGURATION */}
          {activeTab === 'system' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-5 bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-[#6D5BFF]" />
                  <span>Currencies and Exchange Engine</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-gray-400">Dynamic exchange rates based on global licensing regions.</p>
                <div className="divide-y divide-slate-100 dark:divide-gray-900 text-xs">
                  <div className="py-2.5 flex justify-between">
                    <span>Indian Rupee (INR)</span>
                    <strong className="text-emerald-500">Active (₹ Symbol)</strong>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span>US Dollar (USD)</span>
                    <strong className="text-emerald-500">Active ($ Symbol)</strong>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span>Euro (EUR)</span>
                    <strong className="text-emerald-500">Active (€ Symbol)</strong>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-[#00D4FF]" />
                  <span>Authorized Languages</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-gray-400">Syllabi translation queues.</p>
                <div className="divide-y divide-slate-100 dark:divide-gray-900 text-xs">
                  <div className="py-2.5 flex justify-between">
                    <span>English (en)</span>
                    <strong>Primary</strong>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span>Spanish (es)</span>
                    <span className="text-slate-500">Supported</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span>Hindi (hi)</span>
                    <span className="text-slate-500">Supported</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* MODAL 1: CREATE SUPPORT STAFF */}
      {isCreateSupportOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 w-full max-w-md rounded-3xl p-6 relative">
            <h4 className="text-lg font-heading font-extrabold mb-4">Create Customer Support Agent</h4>
            
            {supportError && (
              <div className="p-3 mb-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold rounded-xl">
                {supportError}
              </div>
            )}
            {supportSuccess && (
              <div className="p-3 mb-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold rounded-xl">
                Support Agent created successfully!
              </div>
            )}

            <form onSubmit={handleCreateSupport} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={supportFirstName}
                    onChange={(e) => setSupportFirstName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={supportLastName}
                    onChange={(e) => setSupportLastName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Support Email Address</label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="agent@neomcq.com"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Assigned Password</label>
                <input
                  type="password"
                  required
                  value={supportPassword}
                  onChange={(e) => setSupportPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSupportOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 dark:text-gray-300 dark:border-gray-800 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Register Support</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET PASSWORDS */}
      {resettingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 w-full max-w-sm rounded-3xl p-6 relative">
            <h4 className="text-lg font-heading font-extrabold mb-2">Reset Password</h4>
            <p className="text-[11px] text-slate-400 mb-4">Resetting credentials for: <strong>{resettingUser.email}</strong></p>

            {resetError && (
              <div className="p-3 mb-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold rounded-xl">
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div className="p-3 mb-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold rounded-xl">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 mb-1">New Secret Password</label>
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 dark:text-gray-300 dark:border-gray-800 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white flex items-center gap-1"
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
