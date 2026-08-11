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
  FileText
} from 'lucide-react';
import {
  getAllUsersAction,
  getSystemMetricsAction
} from '@/app/actions/admin';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, Cell } from 'recharts';

export default function AdminDashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({ jobs: [], subscriptions: [] });

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allMetrics] = await Promise.all([
        getAllUsersAction(),
        getSystemMetricsAction()
      ]);
      setUsers(allUsers || []);
      setMetrics(allMetrics || { jobs: [], subscriptions: [] });
    } catch (err) {
      console.error('Error loading dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => !u.isSuspended).length;
  const supportUsers = users.filter((u) => u.roles?.includes('support')).length;
  
  const jobsCompleted = metrics.jobs.filter((j: any) => j.status === 'completed').length;
  const jobsProcessing = metrics.jobs.filter((j: any) => j.status === 'processing').length;
  const jobsFailed = metrics.jobs.filter((j: any) => j.status === 'failed').length;

  const jobStatusData = [
    { name: 'Completed', value: jobsCompleted },
    { name: 'Processing', value: jobsProcessing },
    { name: 'Pending', value: metrics.jobs.filter((j: any) => j.status === 'pending').length },
    { name: 'Failed', value: jobsFailed },
  ].filter((item) => item.value > 0);

  const colors = ['#10B981', '#F59E0B', '#6D5BFF', '#EF4444'];

  const revenueData = metrics.subscriptions.map((sub: any) => ({
    date: new Date(sub.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    amount: sub.amount || 999,
  })).slice(0, 10);

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
        <span className="text-xs font-bold">Synchronizing NeoMCQ System Telemetry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#6D5BFF]/10 via-[#A855F7]/10 to-[#00D4FF]/10 border border-[#6D5BFF]/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
              NeoMCQ System Control Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Live Production
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Real-time platform status, active user sessions, AI content pipelines, and subscription volume.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors text-xs font-bold text-slate-700 dark:text-gray-200 flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#6D5BFF]" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-[#6D5BFF]" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{totalUsers}</div>
          <div className="text-[10px] text-emerald-500 font-bold">{activeUsers} Active Accounts</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Active Subscriptions</span>
            <BadgeDollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-500">{metrics.subscriptions.length}</div>
          <div className="text-[10px] text-slate-400 font-bold">Synchronized Razorpay Plans</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">AI Generation Jobs</span>
            <Cpu className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{metrics.jobs.length}</div>
          <div className="text-[10px] text-emerald-500 font-bold">{jobsCompleted} Completed</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Support Staff</span>
            <ShieldCheck className="w-4 h-4 text-[#00D4FF]" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{supportUsers}</div>
          <div className="text-[10px] text-slate-400 font-bold">Assigned Representatives</div>
        </div>
      </div>

      {/* Main Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Job Pipeline Status Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#6D5BFF]" />
              <h3 className="font-heading font-black text-sm text-slate-900 dark:text-white">
                AI Generation Job Queue
              </h3>
            </div>
            <Link href="/admin/content-queue" className="text-xs text-[#6D5BFF] font-bold hover:underline flex items-center gap-1">
              <span>View Queue</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-56">
            {jobStatusData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active job logs recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobStatusData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                  <YAxis stroke="#888888" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6D5BFF" radius={[8, 8, 0, 0]}>
                    {jobStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Subscriptions Revenue Flow Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BadgeDollarSign className="w-4 h-4 text-emerald-500" />
              <h3 className="font-heading font-black text-sm text-slate-900 dark:text-white">
                Recent Subscriptions Activity
              </h3>
            </div>
            <Link href="/admin/payments" className="text-xs text-[#6D5BFF] font-bold hover:underline flex items-center gap-1">
              <span>Payments Log</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-56">
            {revenueData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No recent subscription purchases recorded in DB.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <XAxis dataKey="date" stroke="#888888" fontSize={10} />
                  <YAxis stroke="#888888" fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="amount" stroke="#10B981" fill="#10B981" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access Modules Navigation Grid */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="font-heading font-black text-sm text-slate-900 dark:text-white">
          Quick Management Shortcuts
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Exams', href: '/admin/exams', icon: BookOpen },
            { label: 'Subjects', href: '/admin/subjects', icon: BookOpen },
            { label: 'MCQs Bank', href: '/admin/mcqs', icon: HelpCircle },
            { label: 'Flashcards', href: '/admin/flashcards', icon: Layers },
            { label: 'AI Tutor', href: '/admin/ai-tutor', icon: Bot },
            { label: 'System Health', href: '/admin/system-health', icon: Activity },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 hover:border-[#6D5BFF]/50 transition-all text-center space-y-1 group"
              >
                <Icon className="w-5 h-5 mx-auto text-[#6D5BFF] group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-800 dark:text-gray-200">{item.label}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
