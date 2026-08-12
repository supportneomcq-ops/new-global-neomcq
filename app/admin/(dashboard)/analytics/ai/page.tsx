'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Zap, Activity, AlertCircle, CheckCircle2, Clock, DollarSign, Layers } from 'lucide-react';
import AnalyticsFilterBar, { AnalyticsFilterState } from '@/components/admin/analytics/analytics-filter-bar';
import { exportToCSV } from '@/lib/analytics-utils';

export default function AIAnalyticsPage() {
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

  const fetchAIAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.timeframe) queryParams.set('timeframe', filters.timeframe);
      if (filters.customStart) queryParams.set('customStart', filters.customStart);
      if (filters.customEnd) queryParams.set('customEnd', filters.customEnd);

      const res = await fetch(`/api/admin/analytics/ai?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch AI analytics');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading AI analytics');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAIAnalytics();
  }, [fetchAIAnalytics]);

  const handleExport = () => {
    if (!data?.byModel) return;
    const headers = ['Model', 'Total Requests', 'Successful Requests', 'Token Volume'];
    const rows = data.byModel.map((m: any) => [m.model, m.requests, m.success, m.tokens]);
    exportToCSV('ai_analytics_models', headers, rows);
  };

  const m = data?.metrics;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-black flex items-center gap-2 text-slate-900 dark:text-white">
          <Cpu className="w-7 h-7 text-[#6D5BFF]" />
          <span>AI Analytics & Engine Telemetry</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
          Canonical Phase 4 AI job volume, model breakdown, generation latency, retry rate, and token expenditure.
        </p>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchAIAnalytics}
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
          No AI job telemetry recorded for this period.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <AICard label="AI Requests" value={m.totalRequests} icon={Cpu} color="cyan" />
            <AICard label="Success Rate" value={`${m.successRate}%`} icon={CheckCircle2} color="emerald" />
            <AICard label="Successful" value={m.successfulRequests} icon={CheckCircle2} color="emerald" />
            <AICard label="Failed" value={m.failedRequests} icon={AlertCircle} color="rose" />
            <AICard label="Total Tokens" value={m.totalTokens.toLocaleString()} icon={Zap} color="amber" />
            <AICard label="Estimated Cost" value={`$${m.totalCostUSD}`} icon={DollarSign} color="emerald" />
            <AICard label="Avg Latency" value={`${m.avgLatencySecs}s`} icon={Clock} color="purple" />
            <AICard label="Retry Rate" value={`${m.retryRate}%`} icon={Activity} color="orange" />
          </div>

          {/* Provider & Model Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Providers */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>AI Requests by Provider</span>
              </h3>
              <div className="space-y-2">
                {data?.byProvider?.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div>
                      <span className="font-bold text-white block">{p.provider}</span>
                      <span className="text-[10px] text-slate-400">{p.success} succeeded, {p.failed} failed</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-indigo-400 block">{p.requests} jobs</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">${p.cost}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Models */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>AI Requests by Model</span>
              </h3>
              <div className="space-y-2">
                {data?.byModel?.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div>
                      <span className="font-bold text-white block">{m.model}</span>
                      <span className="text-[10px] text-slate-400">{m.tokens.toLocaleString()} tokens</span>
                    </div>
                    <span className="font-bold text-amber-400">{m.requests} requests</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Asset Type Generation Volume */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              <span>Generation Volume by Asset Type</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data?.byAssetType?.map((a: any, i: number) => (
                <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-400 block uppercase">{a.assetType}</span>
                  <span className="text-xl font-black text-white">{a.count} generated</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AICard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
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
    </div>
  );
}
