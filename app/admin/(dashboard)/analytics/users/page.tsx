'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, Globe, Smartphone, Activity, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import AnalyticsFilterBar, { AnalyticsFilterState } from '@/components/admin/analytics/analytics-filter-bar';
import { exportToCSV } from '@/lib/analytics-utils';

export default function UserAnalyticsPage() {
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

  const fetchUserAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.timeframe) queryParams.set('timeframe', filters.timeframe);
      if (filters.customStart) queryParams.set('customStart', filters.customStart);
      if (filters.customEnd) queryParams.set('customEnd', filters.customEnd);
      if (filters.country) queryParams.set('country', filters.country);
      if (filters.platform) queryParams.set('platform', filters.platform);
      if (filters.subscriptionTier) queryParams.set('subscriptionTier', filters.subscriptionTier);
      if (filters.userType) queryParams.set('userType', filters.userType);

      const res = await fetch(`/api/admin/analytics/users?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch user analytics');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading user analytics');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUserAnalytics();
  }, [fetchUserAnalytics]);

  const handleExport = () => {
    if (!data?.charts?.countryDistribution) return;
    const headers = ['Country', 'User Count'];
    const rows = data.charts.countryDistribution.map((c: any) => [c.country, c.count]);
    exportToCSV('user_analytics_countries', headers, rows);
  };

  const metrics = data?.metrics;
  const charts = data?.charts;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-black flex items-center gap-2 text-slate-900 dark:text-white">
          <Users className="w-7 h-7 text-[#6D5BFF]" />
          <span>User Analytics</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
          User growth trends, active user metrics (DAU / WAU / MAU), geography distribution, and retention profile.
        </p>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchUserAnalytics}
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
      ) : !metrics ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          No user data available for this period.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatBox label="Total Users" value={metrics.totalUsers} icon={Users} color="indigo" />
            <StatBox label="New Users" value={metrics.newUsers} change={metrics.growthComparison?.formatted} isPositive={metrics.growthComparison?.isPositive} icon={TrendingUp} color="blue" />
            <StatBox label="Active Users" value={metrics.activeUsers} icon={Activity} color="emerald" />
            <StatBox label="DAU" value={metrics.dau} subtitle="Daily Active" icon={Activity} color="cyan" />
            <StatBox label="WAU" value={metrics.wau} subtitle="Weekly Active" icon={Activity} color="violet" />
            <StatBox label="MAU" value={metrics.mau} subtitle="Monthly Active" icon={Activity} color="purple" />
            <StatBox label="Returning" value={metrics.returningUsers} icon={CheckCircle2} color="teal" />
            <StatBox label="Inactive" value={metrics.inactiveUsers} icon={Users} color="slate" />
          </div>

          {/* Registration Trends Visual Bar Chart */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Registration & Growth Trends over Time</span>
              </h3>
              <span className="text-xs text-slate-400">{charts?.registrationTrends?.length || 0} Data points</span>
            </div>

            {charts?.registrationTrends?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No registration history in this timeframe.</div>
            ) : (
              <div className="h-44 flex items-end gap-1 pt-6 overflow-x-auto scrollbar-none">
                {charts?.registrationTrends?.map((item: any, idx: number) => {
                  const maxVal = Math.max(...charts.registrationTrends.map((t: any) => t.count), 1);
                  const pct = Math.round((item.count / maxVal) * 100);
                  return (
                    <div key={idx} className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-8 hidden group-hover:flex bg-slate-950 border border-slate-700 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                        {item.date}: {item.count} users
                      </div>
                      <div
                        style={{ height: `${Math.max(pct, 6)}%` }}
                        className="w-full bg-[#6D5BFF] hover:bg-indigo-400 rounded-t transition-all"
                      />
                      <span className="text-[9px] text-slate-500 truncate w-full text-center">{item.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Geography & Platform Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Country Distribution Table */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>User Geography Distribution</span>
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {charts?.countryDistribution?.map((c: any, i: number) => {
                  const total = metrics.totalUsers || 1;
                  const pct = ((c.count / total) * 100).toFixed(1);
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                      <span className="font-semibold text-slate-200">{c.country}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-bold">{c.count} users</span>
                        <span className="text-emerald-400 font-semibold">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Platform Distribution */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Device & Platform Distribution</span>
              </h3>
              <div className="space-y-3 pt-2">
                {charts?.platformDistribution?.map((p: any, i: number) => {
                  const total = metrics.totalUsers || 1;
                  const pct = Math.round((p.count / total) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300 capitalize">{p.platform}</span>
                        <span className="text-indigo-400">{p.count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  subtitle,
  change,
  isPositive,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
      <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
        <span>{label}</span>
        <Icon className="w-3.5 h-3.5 text-indigo-400" />
      </div>
      <div className="text-xl font-black text-white">{value}</div>
      {change ? (
        <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {change}
        </span>
      ) : subtitle ? (
        <span className="text-[10px] text-slate-500">{subtitle}</span>
      ) : null}
    </div>
  );
}
