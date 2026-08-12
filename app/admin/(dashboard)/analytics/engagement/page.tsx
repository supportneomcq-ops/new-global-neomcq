'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Timer, Activity, HelpCircle, Clock, Sparkles, Cpu, Users } from 'lucide-react';
import AnalyticsFilterBar, { AnalyticsFilterState } from '@/components/admin/analytics/analytics-filter-bar';
import { exportToCSV } from '@/lib/analytics-utils';

export default function EngagementAnalyticsPage() {
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

  const fetchEngagement = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.timeframe) queryParams.set('timeframe', filters.timeframe);
      if (filters.customStart) queryParams.set('customStart', filters.customStart);
      if (filters.customEnd) queryParams.set('customEnd', filters.customEnd);

      const res = await fetch(`/api/admin/analytics/engagement?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch engagement analytics');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading engagement analytics');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEngagement();
  }, [fetchEngagement]);

  const handleExport = () => {
    if (!data?.metrics) return;
    const m = data.metrics;
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Study Sessions', m.totalSessions],
      ['Sessions per Active User', m.sessionsPerUser],
      ['Total Study Time (Mins)', m.totalStudyMins],
      ['Avg Study Time per User (Mins)', m.avgStudyMinsPerUser],
      ['Total Questions Solved', m.totalQuestions],
      ['Questions per Active User', m.questionsPerUser],
      ['AI Interactions', m.aiInteractions],
      ['AI Uses per Active User', m.aiUsesPerUser],
      ['Avg Active Days per User', m.avgActiveDays],
    ];
    exportToCSV('engagement_analytics', headers, rows);
  };

  const m = data?.metrics;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-black flex items-center gap-2 text-slate-900 dark:text-white">
          <Timer className="w-7 h-7 text-[#6D5BFF]" />
          <span>Learner Engagement Analytics</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
          Study session intensity, question velocity per user, return frequency, and active days depth.
        </p>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchEngagement}
        onExportCSV={handleExport}
        loading={loading}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-semibold">
          {error}
        </div>
      ) : !m ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          No engagement metrics recorded for this period.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Engagement Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <EngageCard title="Study Sessions / User" value={m.sessionsPerUser} subtitle={`${m.totalSessions.toLocaleString()} Total Sessions`} icon={Timer} color="indigo" />
            <EngageCard title="Avg Study Time / User" value={`${m.avgStudyMinsPerUser} mins`} subtitle={`${m.totalStudyMins.toLocaleString()} Total Minutes`} icon={Clock} color="amber" />
            <EngageCard title="Questions / User" value={m.questionsPerUser} subtitle={`${m.totalQuestions.toLocaleString()} Total Solved`} icon={HelpCircle} color="blue" />
            <EngageCard title="AI Tutor Uses / User" value={m.aiUsesPerUser} subtitle={`${m.aiInteractions.toLocaleString()} Total AI Uses`} icon={Cpu} color="cyan" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <EngageCard title="Active Days / Learner" value={`${m.avgActiveDays} days`} subtitle="Unique active days in period" icon={Activity} color="emerald" />
            <EngageCard title="Active Learners in Period" value={m.activeUsersCount.toLocaleString()} subtitle="Unique active user IDs" icon={Users} color="violet" />
            <EngageCard title="Session Engagement Score" value={`${Math.round(m.questionsPerUser * 1.5 + m.sessionsPerUser * 2)}`} subtitle="Combined intensity index" icon={Sparkles} color="purple" />
          </div>
        </div>
      )}
    </div>
  );
}

function EngageCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
        <span>{title}</span>
        <Icon className="w-4 h-4 text-indigo-400" />
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
    </div>
  );
}
