'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Users,
  BookOpen,
  Sparkles,
  HelpCircle,
  Clock,
  BadgeDollarSign,
  TrendingUp,
  Cpu,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from 'lucide-react';
import AnalyticsFilterBar, { AnalyticsFilterState } from '@/components/admin/analytics/analytics-filter-bar';
import { exportToCSV } from '@/lib/analytics-utils';

export default function AnalyticsOverviewPage() {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    timeframe: '30d',
    examId: '',
    subjectId: '',
    topicId: '',
    country: '',
    platform: '',
    subscriptionTier: '',
    userType: '',
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.timeframe) queryParams.set('timeframe', filters.timeframe);
      if (filters.customStart) queryParams.set('customStart', filters.customStart);
      if (filters.customEnd) queryParams.set('customEnd', filters.customEnd);
      if (filters.examId) queryParams.set('examId', filters.examId);
      if (filters.subjectId) queryParams.set('subjectId', filters.subjectId);
      if (filters.topicId) queryParams.set('topicId', filters.topicId);
      if (filters.country) queryParams.set('country', filters.country);
      if (filters.platform) queryParams.set('platform', filters.platform);
      if (filters.subscriptionTier) queryParams.set('subscriptionTier', filters.subscriptionTier);
      if (filters.userType) queryParams.set('userType', filters.userType);

      const res = await fetch(`/api/admin/analytics/overview?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch analytics overview');
      const json = await res.json();
      setData(json.metrics || null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading analytics overview');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleExport = () => {
    if (!data) return;
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Users', data.totalUsers],
      ['Active Users', data.activeUsers],
      ['New Users', data.newUsers],
      ['Returning Users', data.returningUsers],
      ['Paid Users', data.paidUsers],
      ['Learning Sessions', data.learningSessions],
      ['Questions Attempted', data.questionsAttempted],
      ['Questions Solved', data.questionsSolved],
      ['Average Accuracy', `${data.averageAccuracy}%`],
      ['Study Time (Hours)', data.studyTimeHours],
      ['Content Assets', data.contentConsumption],
      ['AI Tutor Sessions', data.aiTutorSessions],
      ['AI Requests', data.aiRequests],
      ['Gross Revenue ($)', data.revenue],
      ['Active Subscriptions', data.subscriptions],
      ['Retention Rate (%)', `${data.retentionRate}%`],
      ['Engagement Score', data.engagementScore],
    ];
    exportToCSV('analytics_overview', headers, rows);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2 text-slate-900 dark:text-white">
            <BarChart3 className="w-7 h-7 text-[#6D5BFF]" />
            <span>Analytics Overview</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Real-time multi-exam platform statistics, user growth, learner engagement, AI telemetry, and revenue.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchOverview}
        onExportCSV={handleExport}
        loading={loading}
      />

      {/* Main Grid Metrics */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-semibold">
          {error}
        </div>
      ) : !data ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          No data available for this period.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: User & Learner Health */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>User & Learner Health</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard
                title="Total Users"
                value={data.totalUsers.toLocaleString()}
                subtitle="Registered Platform Accounts"
                icon={Users}
                color="indigo"
              />
              <MetricCard
                title="Active Users"
                value={data.activeUsers.toLocaleString()}
                change={data.activeUsersChange?.formatted}
                isPositive={data.activeUsersChange?.isPositive}
                subtitle="Active in period"
                icon={Activity}
                color="emerald"
              />
              <MetricCard
                title="New Users"
                value={data.newUsers.toLocaleString()}
                change={data.newUsersChange?.formatted}
                isPositive={data.newUsersChange?.isPositive}
                subtitle="Signups in period"
                icon={TrendingUp}
                color="blue"
              />
              <MetricCard
                title="Returning Users"
                value={data.returningUsers.toLocaleString()}
                subtitle="Repeat Active Users"
                icon={CheckCircle2}
                color="violet"
              />
              <MetricCard
                title="Paid Subscribers"
                value={data.paidUsers.toLocaleString()}
                subtitle="Active Subscriptions"
                icon={BadgeDollarSign}
                color="amber"
              />
            </div>
          </div>

          {/* Section 2: Learning Activity & Performance */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Learning Activity & MCQ Performance</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Learning Sessions"
                value={data.learningSessions.toLocaleString()}
                subtitle="Completed study blocks"
                icon={Sparkles}
                color="purple"
              />
              <MetricCard
                title="Questions Attempted"
                value={data.questionsAttempted.toLocaleString()}
                subtitle="MCQs solved by users"
                icon={HelpCircle}
                color="blue"
              />
              <MetricCard
                title="Average Accuracy"
                value={`${data.averageAccuracy}%`}
                subtitle={`${data.questionsSolved.toLocaleString()} correct answers`}
                icon={CheckCircle2}
                color="emerald"
              />
              <MetricCard
                title="Total Study Time"
                value={`${data.studyTimeHours} hrs`}
                subtitle={`${data.studyTimeMins.toLocaleString()} minutes active`}
                icon={Clock}
                color="amber"
              />
            </div>
          </div>

          {/* Section 3: AI Engine & Platform Assets */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>AI Engine & Asset Usage</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="AI Requests"
                value={data.aiRequests.toLocaleString()}
                subtitle="Canonical AI Engine jobs"
                icon={Cpu}
                color="cyan"
              />
              <MetricCard
                title="AI Tutor Sessions"
                value={data.aiTutorSessions.toLocaleString()}
                subtitle="Interactive AI conversations"
                icon={Sparkles}
                color="indigo"
              />
              <MetricCard
                title="Content Assets"
                value={data.contentConsumption.toLocaleString()}
                subtitle="Notes, Cards & Sheets"
                icon={Layers}
                color="violet"
              />
              <MetricCard
                title="Gross Revenue"
                value={`$${data.revenue.toLocaleString()}`}
                subtitle={`${data.subscriptions} Active Subscriptions`}
                icon={BadgeDollarSign}
                color="emerald"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  change,
  isPositive,
  icon: Icon,
  color = 'indigo',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400">{title}</span>
        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-white">{value}</span>
        {change && (
          <span
            className={`text-xs font-bold flex items-center gap-0.5 ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {change}
          </span>
        )}
      </div>
      {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
    </div>
  );
}
