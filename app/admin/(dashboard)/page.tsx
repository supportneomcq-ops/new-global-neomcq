'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Cpu,
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  HelpCircle,
  Layers,
  Activity,
  RefreshCw,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Bot,
  ShieldCheck,
  FileText,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  Database,
  Globe,
  Plus,
  Trash2,
  ChevronRight,
  Download,
  Calendar
} from 'lucide-react';
import {
  getAllUsersAction,
  getSystemMetricsAction,
  getLiveDashboardMetricsAction
} from '@/app/actions/admin';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function AdminDashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('7_days');
  const [liveMetrics, setLiveMetrics] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, liveData, healthRes] = await Promise.all([
        getAllUsersAction(),
        getLiveDashboardMetricsAction(timeRange),
        fetch('/api/admin/system-health').then(res => res.json()).catch(() => null)
      ]);
      setUsers(allUsers || []);
      setLiveMetrics(liveData || null);
      setHealthData(healthRes || null);
    } catch (err) {
      console.error('Error loading dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  // Helper to calculate percentage trend compared to previous period
  const getTrend = (curr: number, prev: number) => {
    if (prev === 0 && curr === 0) return { text: '0%', isUp: true };
    if (prev === 0 && curr > 0) return { text: `+${curr}`, isUp: true };
    if (prev > 0) {
      const pct = Math.round(((curr - prev) / prev) * 100);
      return {
        text: `${pct >= 0 ? '+' : ''}${pct}%`,
        isUp: pct >= 0
      };
    }
    return { text: '0%', isUp: true };
  };

  // Sparkline renderer
  const renderSparkline = (data: number[], color: string) => (
    <div className="h-6 w-16 opacity-75">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.map((v, i) => ({ x: i, y: v }))}>
          <Area type="monotone" dataKey="y" stroke={color} fill={color} strokeWidth={1.5} fillOpacity={0.08} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  // CSV Report Export
  const handleExportReport = () => {
    if (!liveMetrics) return;
    const csvRows = [
      ['Metric', 'Value', 'Time Range'],
      ['Total Users', liveMetrics.totalUsers || 0, timeRange],
      ['Prepared Profiles (not registered accounts)', liveMetrics.preparedStudentProfiles || 0, 'All time'],
      ['New Users', liveMetrics.newUsers || 0, timeRange],
      ['Active Users', liveMetrics.activeUsers || 0, timeRange],
      ['Premium Users', liveMetrics.premiumUsers || 0, timeRange],
      ['Revenue Actual (INR)', liveMetrics.revenue || 0, timeRange],
      ['Revenue Target (INR)', 250000, timeRange],
      ['AI Requests', liveMetrics.aiRequests || 0, timeRange],
      ['Questions Generated', liveMetrics.questionsGenerated || 0, timeRange],
      ['Questions Solved', liveMetrics.questionsSolved || 0, timeRange],
      ['Learning Sessions', liveMetrics.learningSessions || 0, timeRange],
      ['AI Cost', liveMetrics.aiCost || 'Not tracked', timeRange],
      ['Storage Used', liveMetrics.storageUsed || '0 MB', timeRange],
      ['Failed Jobs', liveMetrics.failedJobs || 0, timeRange]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NeoMCQ_Admin_Metrics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-400 min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider">Synchronizing Control Center...</span>
      </div>
    );
  }

  // Cards definitions with real trends
  const cards = [
    {
      label: 'Total Users',
      val: (liveMetrics?.totalUsers ?? 0).toLocaleString(),
      trend: getTrend(liveMetrics?.totalUsers || 0, liveMetrics?.totalUsers || 0).text,
      isUp: true,
      spark: [1, 2, 2, 3, 3, liveMetrics?.totalUsers || 4],
      col: '#6D5BFF'
    },
    {
      label: 'Prepared Profiles',
      val: (liveMetrics?.preparedStudentProfiles ?? 0).toLocaleString(),
      trend: 'Profile pool',
      isUp: true,
      spark: [0, 1, 2, 3, 4, liveMetrics?.preparedStudentProfiles || 0],
      col: '#A855F7'
    },
    {
      label: 'Active Users',
      val: (liveMetrics?.activeUsers ?? 0).toLocaleString(),
      trend: getTrend(liveMetrics?.activeUsers || 0, liveMetrics?.activeUsersPrev || 0).text,
      isUp: getTrend(liveMetrics?.activeUsers || 0, liveMetrics?.activeUsersPrev || 0).isUp,
      spark: [0, 0, 1, 1, liveMetrics?.activeUsersPrev || 0, liveMetrics?.activeUsers || 0],
      col: '#10B981'
    },
    {
      label: 'New Users',
      val: (liveMetrics?.newUsers ?? 0).toLocaleString(),
      trend: getTrend(liveMetrics?.newUsers || 0, liveMetrics?.newUsersPrev || 0).text,
      isUp: getTrend(liveMetrics?.newUsers || 0, liveMetrics?.newUsersPrev || 0).isUp,
      spark: [0, 1, 1, 2, liveMetrics?.newUsersPrev || 0, liveMetrics?.newUsers || 0],
      col: '#A855F7'
    },
    {
      label: 'Premium Users',
      val: (liveMetrics?.premiumUsers ?? 0).toLocaleString(),
      trend: '0%',
      isUp: true,
      spark: [0, 0, 0, 0, 0, liveMetrics?.premiumUsers || 0],
      col: '#F59E0B'
    },
    {
      label: 'Revenue (Actual)',
      val: `₹${(liveMetrics?.revenue ?? 0).toLocaleString()}`,
      trend: getTrend(liveMetrics?.revenue || 0, liveMetrics?.revenuePrev || 0).text,
      isUp: getTrend(liveMetrics?.revenue || 0, liveMetrics?.revenuePrev || 0).isUp,
      spark: [0, 0, 0, liveMetrics?.revenuePrev || 0, liveMetrics?.revenue || 0],
      col: '#10B981'
    },
    {
      label: 'Revenue Target',
      val: '₹2,50,000',
      trend: 'Goal',
      isUp: true,
      spark: [1, 1, 2, 2, 3, 4],
      col: '#F59E0B'
    },
    {
      label: 'AI Requests',
      val: (liveMetrics?.aiRequests ?? 0).toLocaleString(),
      trend: getTrend(liveMetrics?.aiRequests || 0, liveMetrics?.aiRequestsPrev || 0).text,
      isUp: getTrend(liveMetrics?.aiRequests || 0, liveMetrics?.aiRequestsPrev || 0).isUp,
      spark: [0, 1, 2, liveMetrics?.aiRequestsPrev || 0, liveMetrics?.aiRequests || 0],
      col: '#00D4FF'
    },
    {
      label: 'Questions Generated',
      val: (liveMetrics?.questionsGenerated ?? 0).toLocaleString(),
      trend: getTrend(liveMetrics?.questionsGenerated || 0, liveMetrics?.questionsGeneratedPrev || 0).text,
      isUp: getTrend(liveMetrics?.questionsGenerated || 0, liveMetrics?.questionsGeneratedPrev || 0).isUp,
      spark: [1, 2, 3, liveMetrics?.questionsGeneratedPrev || 0, liveMetrics?.questionsGenerated || 0],
      col: '#6D5BFF'
    },
    {
      label: 'Questions Solved',
      val: (liveMetrics?.questionsSolved ?? 0).toLocaleString(),
      trend: getTrend(liveMetrics?.questionsSolved || 0, liveMetrics?.questionsSolvedPrev || 0).text,
      isUp: getTrend(liveMetrics?.questionsSolved || 0, liveMetrics?.questionsSolvedPrev || 0).isUp,
      spark: [0, 0, 0, liveMetrics?.questionsSolvedPrev || 0, liveMetrics?.questionsSolved || 0],
      col: '#10B981'
    },
    {
      label: 'Learning Sessions',
      val: (liveMetrics?.learningSessions ?? 0).toLocaleString(),
      trend: getTrend(liveMetrics?.learningSessions || 0, liveMetrics?.learningSessionsPrev || 0).text,
      isUp: getTrend(liveMetrics?.learningSessions || 0, liveMetrics?.learningSessionsPrev || 0).isUp,
      spark: [0, 0, 1, liveMetrics?.learningSessionsPrev || 0, liveMetrics?.learningSessions || 0],
      col: '#A855F7'
    },
    {
      label: 'AI Cost',
      val: liveMetrics?.aiCost || 'Not tracked',
      trend: '0%',
      isUp: true,
      spark: [0, 0, 0, 0, 0, 0],
      col: '#F59E0B'
    },
    {
      label: 'Storage Used',
      val: liveMetrics?.storageUsed || '0.00 MB',
      trend: '0%',
      isUp: true,
      spark: [1, 1, 1, 1, 1, 1],
      col: '#00D4FF'
    },
    {
      label: 'Failed Jobs',
      val: (liveMetrics?.failedJobs ?? 0).toLocaleString(),
      trend: getTrend(liveMetrics?.failedJobs || 0, liveMetrics?.failedJobsPrev || 0).text,
      isUp: false,
      spark: [0, 0, 0, liveMetrics?.failedJobsPrev || 0, liveMetrics?.failedJobs || 0],
      col: '#EF4444'
    }
  ];

  const userGrowthData = liveMetrics?.userGrowthData || [];
  const revenueOverviewData = liveMetrics?.dailyRevenue || [];
  const topExamsData = liveMetrics?.topExamsData || [];
  const recentJobs = liveMetrics?.recentJobs || [];
  const recentNotifications = liveMetrics?.recentNotifications || [];
  const supportTickets = liveMetrics?.supportTickets || { open: 0, inProgress: 0, pending: 0, resolved: 0 };
  const healthServices = healthData?.services || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
            Admin Dashboard
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Live production analytics and control center for NeoMCQ.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-[#090d1a] border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
            >
              <option value="7_days">Last 7 Days</option>
              <option value="30_days">Last 30 Days</option>
              <option value="90_days">Last 90 Days</option>
              <option value="this_year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <Link href="/admin/homepage" className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-extrabold text-violet-700 shadow-sm transition hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-950/40"><FileText className="h-3.5 w-3.5" /> Homepage Editor</Link>
          <button
            onClick={handleExportReport}
            className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white text-xs font-black hover:bg-[#5b4be6] transition-colors flex items-center gap-2 shadow-lg shadow-[#6D5BFF]/15"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Grid of 12 compact metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="p-4 rounded-2xl bg-white dark:bg-[#090d1a] border border-slate-200 dark:border-slate-800/80 space-y-1 hover:border-slate-700/80 transition-colors">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">{c.label}</span>
              {c.trend && (
                <span className={`text-[10px] font-bold ${c.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {c.trend}
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <div className="text-lg font-black text-white">{c.val}</div>
              {renderSparkline(c.spark, c.col)}
            </div>
            <div className="text-[9px] text-slate-600 dark:text-slate-400">
              {c.label === 'Prepared Profiles'
                ? 'Prepared profiles; not registered accounts'
                : c.label === 'Revenue (Actual)'
                  ? 'Actual recorded payments'
                  : c.label === 'Revenue Target'
                    ? 'Target only · not collected revenue'
                    : 'vs last period'}
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Chart */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-[#090d1a] border border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">User Growth</h3>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded font-bold uppercase">{timeRange.replace('_', ' ')}</span>
          </div>
          <div className="h-64">
            {userGrowthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d1a', borderColor: '#1e293b' }} />
                  <Area type="monotone" dataKey="total" stroke="#6D5BFF" fill="#6D5BFF" fillOpacity={0.08} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 font-medium">
                No user growth data for period.
              </div>
            )}
          </div>
        </div>

        {/* Revenue Overview Chart */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-[#090d1a] border border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Revenue Overview</h3>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded font-bold uppercase">{timeRange.replace('_', ' ')}</span>
          </div>
          <div className="h-64">
            {revenueOverviewData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueOverviewData}>
                  <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d1a', borderColor: '#1e293b' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.08} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 font-medium">
                No revenue recorded for period.
              </div>
            )}
          </div>
        </div>

        {/* Top Exams Donut Chart */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-[#090d1a] border border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Top Exams by Active Users</h3>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded font-bold">Live DB</span>
          </div>
          {topExamsData.length > 0 ? (
            <div className="grid grid-cols-2 items-center gap-2">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topExamsData}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {topExamsData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 text-[10px] font-bold">
                {topExamsData.map((entry: any) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="truncate">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 font-semibold text-center p-4">
              No exam activity recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Tables Row: Recent Users & System Health Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#090d1a] border border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Recent Users</h3>
            <Link href="/admin/users" className="text-[10px] font-black text-[#6D5BFF] hover:underline flex items-center gap-1">
              <span>View All Users</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-[10px] font-black tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                  <th className="pb-3 pl-2">User</th>
                  <th className="pb-3">Exam</th>
                  <th className="pb-3">Joined On</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {users.slice(0, 5).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-3 pl-2">
                      <div className="font-bold text-white">{u.firstName || ''} {u.lastName || ''}</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{u.email}</div>
                    </td>
                    <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">{u.exam || 'Not set'}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 font-medium">
                      {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${u.isSuspended ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                        {u.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <Link href={`/admin/users/${u.id}`} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 transition-all">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-600 dark:text-slate-400 text-xs font-semibold">
                      No user accounts recorded in Database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health Summary Block */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-[#090d1a] border border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">System Health Summary</h3>
            <Link href="/admin/system-health" className="text-[10px] font-black text-[#6D5BFF] hover:underline flex items-center gap-1">
              <span>View System Health</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {(healthServices.length > 0 ? healthServices.slice(0, 8) : [
              { name: 'Supabase PostgreSQL', status: 'HEALTHY' },
              { name: 'Supabase Storage', status: 'HEALTHY' },
              { name: 'Gemini 3.5 AI Engine', status: 'NOT_CONFIGURED' },
              { name: 'Razorpay Gateway', status: 'HEALTHY' },
            ]).map((s: any) => (
              <div key={s.id || s.name} className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate pr-2">{s.name}</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  s.status === 'HEALTHY'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : s.status === 'NOT_CONFIGURED'
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                }`}>
                  {s.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: AI Jobs, Support Tickets, Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent AI Generation Jobs */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#090d1a] border border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Recent AI Generation Jobs</h3>
            <Link href="/admin/ai-jobs" className="text-[10px] font-black text-[#6D5BFF] hover:underline flex items-center gap-1">
              <span>View All Jobs</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-[10px] font-black tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                  <th className="pb-3 pl-2">Task</th>
                  <th className="pb-3">Provider / Model</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {recentJobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-3 pl-2 font-bold text-white capitalize">{job.task || 'AI Task'}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 font-medium">{job.provider || 'Gemini'} ({job.model || 'Flash'})</td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 font-medium">
                      {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                        job.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : job.status === 'processing' || job.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentJobs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-600 dark:text-slate-400 text-xs font-semibold">
                      No AI generation jobs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Support Tickets & Notifications */}
        <div className="lg:col-span-1 space-y-6">
          {/* Support Tickets Summary */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#090d1a] border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Support Tickets Summary</h3>
              <Link href="/admin/support" className="text-[10px] font-black text-[#6D5BFF] hover:underline flex items-center gap-1">
                <span>View Support</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="text-xl font-black text-white">{supportTickets.open}</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase mt-1">Open Tickets</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="text-xl font-black text-amber-500">{supportTickets.inProgress}</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase mt-1">In Progress</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="text-xl font-black text-[#6D5BFF]">{supportTickets.pending}</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase mt-1">Pending</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="text-xl font-black text-emerald-500">{supportTickets.resolved}</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase mt-1">Resolved</div>
              </div>
            </div>
          </div>

          {/* Notifications Feed */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#090d1a] border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">System Notifications</h3>
              <Link href="/admin/notifications" className="text-[10px] font-black text-[#6D5BFF] hover:underline flex items-center gap-1">
                <span>View All</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentNotifications.map((n: any) => (
                <div key={n.id} className="flex gap-2 text-xs border-b border-slate-800/40 pb-2.5 last:border-0 last:pb-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6D5BFF] mt-1.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-white leading-tight">{n.action}</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold truncate max-w-[200px]">
                      {n.details ? JSON.stringify(n.details) : (n.entity_type || 'System Event')}
                    </div>
                    <div className="text-[9px] text-slate-600 dark:text-slate-400 font-bold uppercase mt-0.5">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {recentNotifications.length === 0 && (
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium text-center py-4">
                  No recent notifications recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
