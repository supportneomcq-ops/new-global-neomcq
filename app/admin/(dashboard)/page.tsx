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
  Cell,
  LineChart,
  Line
} from 'recharts';

export default function AdminDashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({ jobs: [], subscriptions: [] });
  const [timeRange, setTimeRange] = useState('7_days');
  const [liveMetrics, setLiveMetrics] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allMetrics, liveData] = await Promise.all([
        getAllUsersAction(),
        getSystemMetricsAction(),
        getLiveDashboardMetricsAction(timeRange)
      ]);
      setUsers(allUsers || []);
      setMetrics(allMetrics || { jobs: [], subscriptions: [] });
      setLiveMetrics(liveData || null);
    } catch (err) {
      console.error('Error loading dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const formatMetric = (val: any, prefix: string = '') => {
    if (typeof val === 'number') {
      return `${prefix}${val.toLocaleString()}`;
    }
    return val || 'Awaiting first event';
  };

  const displayTotalUsers = formatMetric(liveMetrics?.totalUsers);
  const displayActiveUsers = formatMetric(liveMetrics?.activeUsers);
  const displayNewUsers = formatMetric(liveMetrics?.newUsers);
  const displayPremiumUsers = formatMetric(liveMetrics?.premiumUsers);
  const displayMonthlyRevenue = formatMetric(liveMetrics?.revenue, '₹');
  const displayAIRequests = formatMetric(liveMetrics?.aiRequests);
  const displayQuestionsGenerated = formatMetric(liveMetrics?.questionsGenerated);
  const displayQuestionsSolved = formatMetric(liveMetrics?.questionsSolved);
  const displayLearningSessions = formatMetric(liveMetrics?.learningSessions);
  const displayAICost = liveMetrics?.aiCost || 'Awaiting first event';
  const displayStorageUsed = liveMetrics?.storageUsed || 'Awaiting first event';
  const displayFailedJobs = formatMetric(liveMetrics?.failedJobs);

  // Pie chart data for Exams
  const getRealExamPieData = () => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const examName = u.exam || 'Not Selected';
      counts[examName] = (counts[examName] || 0) + 1;
    });

    const colors = ['#6D5BFF', '#00D4FF', '#10B981', '#F59E0B', '#EF4444', '#A855F7', '#64748B'];
    const entries = Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    }));

    if (entries.length === 0) {
      return [{ name: 'No exams registered', value: 0, color: '#64748B' }];
    }
    return entries;
  };
  const examPieData = getRealExamPieData();

  // User Growth Chart Data
  const getRealUserGrowthData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));
      
      const newCount = users.filter(u => {
        const created = new Date(u.createdAt);
        return created >= dayStart && created <= dayEnd;
      }).length;
      
      const runningTotal = users.filter(u => {
        const created = new Date(u.createdAt);
        return created <= dayEnd;
      }).length;

      days.push({ name: label, total: runningTotal, new: newCount });
    }
    return days;
  };
  const userGrowthData = getRealUserGrowthData();

  // Revenue Overview Chart Data
  const revenueOverviewData = liveMetrics?.dailyRevenue || [];

  // Mini sparkline mock renderers
  const renderSparkline = (data: number[], color: string) => (
    <div className="h-6 w-16 opacity-75">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.map((v, i) => ({ x: i, y: v }))}>
          <Area type="monotone" dataKey="y" stroke={color} fill={color} strokeWidth={1.5} fillOpacity={0.08} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider">Synchronizing Control Center...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white font-heading">
            Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Welcome back! Here's what's happening with NeoMCQ today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#090d1a] border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-300 font-bold cursor-pointer"
            >
              <option value="7_days">Last 7 Days</option>
              <option value="30_days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <button className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white text-xs font-black hover:bg-[#5b4be6] transition-colors flex items-center gap-2 shadow-lg shadow-[#6D5BFF]/15">
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Grid of 12 beautiful compact metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Users', val: displayTotalUsers, trend: '', isUp: true, spark: [1, 2, 2, 3, 3, 4], col: '#6D5BFF' },
          { label: 'Active Users', val: displayActiveUsers, trend: '', isUp: true, spark: [1, 1, 2, 2, 2, 2], col: '#10B981' },
          { label: 'New Users', val: displayNewUsers, trend: '', isUp: true, spark: [2, 3, 2, 4, 3, 4], col: '#A855F7' },
          { label: 'Premium Users', val: displayPremiumUsers, trend: '', isUp: true, spark: [0, 1, 1, 2, 2, 2], col: '#F59E0B' },
          { label: 'Monthly Revenue', val: displayMonthlyRevenue, trend: '', isUp: true, spark: [1, 2, 1, 3, 2, 4], col: '#10B981' },
          { label: 'AI Requests', val: displayAIRequests, trend: '', isUp: true, spark: [1, 2, 3, 2, 4, 5], col: '#00D4FF' },
          { label: 'Questions Generated', val: displayQuestionsGenerated, trend: '', isUp: true, spark: [3, 4, 3, 5, 4, 6], col: '#6D5BFF' },
          { label: 'Questions Solved', val: displayQuestionsSolved, trend: '', isUp: true, spark: [2, 3, 4, 3, 5, 6], col: '#10B981' },
          { label: 'Learning Sessions', val: displayLearningSessions, trend: '', isUp: true, spark: [1, 2, 2, 3, 3, 4], col: '#A855F7' },
          { label: 'AI Cost', val: displayAICost, trend: '', isUp: true, spark: [1, 2, 2, 3, 2, 3], col: '#F59E0B' },
          { label: 'Storage Used', val: displayStorageUsed, trend: '', isUp: true, spark: [1, 1, 1, 2, 2, 2], col: '#00D4FF' },
          { label: 'Failed Jobs', val: displayFailedJobs, trend: '', isUp: false, spark: [4, 3, 2, 2, 1, 0], col: '#EF4444' },
        ].map((c) => (
          <div key={c.label} className="p-4 rounded-2xl bg-[#090d1a] border border-slate-800/80 space-y-1 hover:border-slate-700/80 transition-colors">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider">{c.label}</span>
              {c.trend && <span className={`text-[10px] font-bold ${c.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>{c.trend}</span>}
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <div className="text-lg font-black text-white">{c.val}</div>
              {renderSparkline(c.spark, c.col)}
            </div>
            <div className="text-[9px] text-slate-500">vs last period</div>
          </div>
        ))}
      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Chart */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-[#090d1a] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">User Growth</h3>
            <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded font-bold">7 Days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData}>
                <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#090d1a', borderColor: '#1e293b' }} />
                <Area type="monotone" dataKey="total" stroke="#6D5BFF" fill="#6D5BFF" fillOpacity={0.05} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Overview Chart */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-[#090d1a] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Revenue Overview</h3>
            <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded font-bold">7 Days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueOverviewData}>
                <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#090d1a', borderColor: '#1e293b' }} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.05} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Exams by Active Users Donut Chart */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-[#090d1a] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Top Exams by Active Users</h3>
            <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded font-bold">This Week</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={examPieData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {examPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 text-[10px] font-bold">
              {examPieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="truncate">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users Table with Live Data */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#090d1a] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Recent Users</h3>
            <Link href="/admin/users" className="text-[10px] font-black text-[#6D5BFF] hover:underline flex items-center gap-1">
              <span>View All Users</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-[10px] font-black tracking-wider text-slate-500 uppercase">
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
                      <div className="font-bold text-white">{u.firstName} {u.lastName}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{u.email}</div>
                    </td>
                    <td className="py-3 font-semibold text-slate-300">{u.exam}</td>
                    <td className="py-3 text-slate-400 font-medium">
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
                    <td colSpan={5} className="py-4 text-center text-slate-500 text-xs font-semibold">
                      No user accounts recorded in Database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health Block */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-[#090d1a] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">System Health</h3>
            <Link href="/admin/system-health" className="text-[10px] font-black text-[#6D5BFF] hover:underline flex items-center gap-1">
              <span>View System Health</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {[
              { label: 'Supabase Server', stat: 'Operational', color: 'text-emerald-500' },
              { label: 'PostgreSQL Database', stat: 'Operational', color: 'text-emerald-500' },
              { label: 'Storage Bucket (R2)', stat: 'Operational', color: 'text-emerald-500' },
              { label: 'AI Providers Gateways', stat: 'Operational', color: 'text-emerald-500' },
              { label: 'Razorpay Gateway API', stat: 'Operational', color: 'text-emerald-500' },
              { label: 'SMTP Email Service', stat: 'Operational', color: 'text-emerald-500' },
              { label: 'Edge Functions', stat: 'Operational', color: 'text-emerald-500' },
              { label: 'Cron Schedules', stat: 'Operational', color: 'text-emerald-500' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                <span className="text-xs font-bold text-slate-300">{s.label}</span>
                <span className={`text-[10px] font-black uppercase ${s.color}`}>{s.stat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second details row: Recent AI Jobs, Support tickets, Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent AI Jobs */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#090d1a] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Recent AI Generation Jobs</h3>
            <Link href="/admin/ai-jobs" className="text-[10px] font-black text-[#6D5BFF] hover:underline flex items-center gap-1">
              <span>View All Jobs</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-[10px] font-black tracking-wider text-slate-500 uppercase">
                  <th className="pb-3 pl-2">Job Type</th>
                  <th className="pb-3">Asset</th>
                  <th className="pb-3">Topic / Exam</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {[
                  { id: '1', type: 'MCQ Generation', asset: 'MCQs', ref: 'NEET PG / Cardiology', status: 'completed', time: '1.2s' },
                  { id: '2', type: 'Notes Generation', asset: 'Notes', ref: 'USMLE Step 1 / Biochemistry', status: 'completed', time: '3.4s' },
                  { id: '3', type: 'Flashcards Generation', asset: 'Flashcards', ref: 'JEE Main / Physics', status: 'processing', time: '12s' },
                  { id: '4', type: 'AI Tutor Content', asset: 'AI Tutor', ref: 'UPSC / Polity', status: 'completed', time: '2.1s' },
                  { id: '5', type: 'Revision Sheet', asset: 'Revision Sheet', ref: 'NEET UG / Biology', status: 'failed', time: '0.8s' },
                ].map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-3 pl-2 font-bold text-white">{job.type}</td>
                    <td className="py-3 text-slate-400 font-medium">{job.asset}</td>
                    <td className="py-3 text-slate-300 font-semibold">{job.ref}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                        job.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : job.status === 'processing'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 text-right pr-2 font-bold text-slate-400">{job.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Support Tickets & Notifications */}
        <div className="lg:col-span-1 space-y-6">
          {/* Support Tickets Summary */}
          <div className="p-5 rounded-2xl bg-[#090d1a] border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Support Tickets</h3>
              <Link href="/admin/support" className="text-[10px] font-black text-[#6D5BFF] hover:underline flex items-center gap-1">
                <span>View Support</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xl font-black text-white">15</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Open Tickets</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xl font-black text-amber-500">8</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">In Progress</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xl font-black text-[#6D5BFF]">5</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Pending Response</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xl font-black text-emerald-500">23</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Resolved Today</div>
              </div>
            </div>
          </div>

          {/* Notifications Feed */}
          <div className="p-5 rounded-2xl bg-[#090d1a] border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Notifications</h3>
              <Link href="/admin/notifications" className="text-[10px] font-black text-[#6D5BFF] hover:underline flex items-center gap-1">
                <span>View All Notifications</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {[
                { title: 'Payment received successfully', desc: 'Subscription for user Swapnil Sonawane processed', time: '2m ago' },
                { title: 'New user registered', desc: 'Account created with email test@neomcq.com', time: '5m ago' },
                { title: 'AI MCQ generator job failed', desc: 'Attempt to generate MCQ for USMLE Step 1 failed', time: '12m ago' },
                { title: 'Database backup succeeded', desc: 'Automatic daily system backup finished successfully', time: '1h ago' },
              ].map((n, i) => (
                <div key={i} className="flex gap-2 text-xs border-b border-slate-800/40 pb-2.5 last:border-0 last:pb-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6D5BFF] mt-1.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-white leading-tight">{n.title}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">{n.desc}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
