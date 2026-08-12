'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Users, Calendar, ArrowRight } from 'lucide-react';
import AnalyticsFilterBar, { AnalyticsFilterState } from '@/components/admin/analytics/analytics-filter-bar';
import { exportToCSV } from '@/lib/analytics-utils';

export default function RetentionAnalyticsPage() {
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

  const fetchRetention = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.country) queryParams.set('country', filters.country);
      if (filters.subscriptionTier) queryParams.set('subscriptionTier', filters.subscriptionTier);
      if (filters.userType) queryParams.set('userType', filters.userType);

      const res = await fetch(`/api/admin/analytics/retention?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch retention analytics');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading retention analytics');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRetention();
  }, [fetchRetention]);

  const handleExport = () => {
    if (!data?.cohorts) return;
    const headers = ['Cohort', 'Size', 'Day 1 %', 'Day 7 %', 'Day 14 %', 'Day 30 %', 'Day 60 %', 'Day 90 %'];
    const rows = data.cohorts.map((c: any) => [c.cohort, c.size, `${c.day1}%`, `${c.day7}%`, `${c.day14}%`, `${c.day30}%`, `${c.day60}%`, `${c.day90}%`]);
    exportToCSV('retention_cohorts', headers, rows);
  };

  const avg = data?.averageRetention;
  const cohorts = data?.cohorts || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-black flex items-center gap-2 text-slate-900 dark:text-white">
          <Activity className="w-7 h-7 text-[#6D5BFF]" />
          <span>Learner Retention Analytics</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
          Weekly cohort retention tracking across Day 1, 7, 14, 30, 60, and 90 intervals.
        </p>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchRetention}
        onExportCSV={handleExport}
        loading={loading}
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-semibold">
          {error}
        </div>
      ) : cohorts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 space-y-2">
          <p className="text-sm font-bold text-white">No sufficient historical cohort data available for this selection.</p>
          <p className="text-xs">Try selecting a broader date or country filter.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Average Retention Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <RetentionPill label="Avg Day 1" value={`${avg?.day1 || 0}%`} color="emerald" />
            <RetentionPill label="Avg Day 7" value={`${avg?.day7 || 0}%`} color="teal" />
            <RetentionPill label="Avg Day 14" value={`${avg?.day14 || 0}%`} color="indigo" />
            <RetentionPill label="Avg Day 30" value={`${avg?.day30 || 0}%`} color="blue" />
            <RetentionPill label="Avg Day 60" value={`${avg?.day60 || 0}%`} color="violet" />
            <RetentionPill label="Avg Day 90" value={`${avg?.day90 || 0}%`} color="purple" />
          </div>

          {/* Cohort Heatmap Table */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Cohort Retention Matrix</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-3">Cohort (Week)</th>
                    <th className="py-3 px-3">Cohort Size</th>
                    <th className="py-3 px-3">Day 1</th>
                    <th className="py-3 px-3">Day 7</th>
                    <th className="py-3 px-3">Day 14</th>
                    <th className="py-3 px-3">Day 30</th>
                    <th className="py-3 px-3">Day 60</th>
                    <th className="py-3 px-3">Day 90</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {cohorts.map((c: any) => (
                    <tr key={c.cohort} className="hover:bg-slate-800/30 transition-all">
                      <td className="py-3 px-3 font-semibold text-white font-sans">{c.cohort}</td>
                      <td className="py-3 px-3 text-indigo-400 font-bold">{c.size} users</td>
                      <RetentionCell pct={c.day1} />
                      <RetentionCell pct={c.day7} />
                      <RetentionCell pct={c.day14} />
                      <RetentionCell pct={c.day30} />
                      <RetentionCell pct={c.day60} />
                      <RetentionCell pct={c.day90} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RetentionPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
      <span className="text-[10px] font-bold uppercase text-slate-400 block">{label}</span>
      <span className="text-xl font-black text-white">{value}</span>
    </div>
  );
}

function RetentionCell({ pct }: { pct: number }) {
  const bgOpacity = Math.min(Math.max(pct / 100, 0.05), 0.9);
  return (
    <td className="py-3 px-3">
      <div
        style={{ backgroundColor: `rgba(109, 91, 255, ${bgOpacity})` }}
        className="py-1 px-2 rounded font-bold text-center text-white"
      >
        {pct}%
      </div>
    </td>
  );
}
