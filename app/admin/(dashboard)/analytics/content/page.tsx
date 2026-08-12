'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileCode, Layers, HelpCircle, BookOpen, Sparkles, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import AnalyticsFilterBar, { AnalyticsFilterState } from '@/components/admin/analytics/analytics-filter-bar';
import { exportToCSV } from '@/lib/analytics-utils';

export default function ContentAnalyticsPage() {
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

  const fetchContentAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/analytics/content');
      if (!res.ok) throw new Error('Failed to fetch content analytics');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading content analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContentAnalytics();
  }, [fetchContentAnalytics]);

  const handleExport = () => {
    if (!data?.assetTypes) return;
    const headers = ['Asset Type', 'Total Count', 'Published Count'];
    const rows = data.assetTypes.map((a: any) => [a.name, a.count, a.published]);
    exportToCSV('content_analytics_summary', headers, rows);
  };

  const s = data?.summary;
  const statusByType = data?.statusByType;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-black flex items-center gap-2 text-slate-900 dark:text-white">
          <FileCode className="w-7 h-7 text-[#6D5BFF]" />
          <span>Content Analytics & Asset Performance</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
          Catalog status breakdown across MCQs, Notes, Flashcards, and Revision Sheets.
        </p>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchContentAnalytics}
        onExportCSV={handleExport}
        loading={loading}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-semibold">
          {error}
        </div>
      ) : !s ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          No content asset data available.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Status Bar */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatPill label="Total Assets" value={s.totalAssets} color="indigo" />
            <StatPill label="Published" value={s.totalPublished} color="emerald" />
            <StatPill label="Drafts" value={s.totalDraft} color="amber" />
            <StatPill label="Pending Review" value={s.totalPending} color="blue" />
            <StatPill label="Rejected" value={s.totalRejected} color="rose" />
            <StatPill label="Archived" value={s.totalArchived} color="slate" />
          </div>

          {/* Asset Type Status Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MCQs Breakdown */}
            <AssetCard title="MCQs Catalog" count={statusByType?.mcqs?.total || 0} icon={HelpCircle} color="indigo">
              <StatusRow label="Published" count={statusByType?.mcqs?.published || 0} total={statusByType?.mcqs?.total || 1} color="emerald" />
              <StatusRow label="Drafts" count={statusByType?.mcqs?.draft || 0} total={statusByType?.mcqs?.total || 1} color="amber" />
              <StatusRow label="Pending Review" count={statusByType?.mcqs?.pending || 0} total={statusByType?.mcqs?.total || 1} color="blue" />
            </AssetCard>

            {/* Notes Breakdown */}
            <AssetCard title="High-Yield Notes" count={statusByType?.notes?.total || 0} icon={BookOpen} color="blue">
              <StatusRow label="Published" count={statusByType?.notes?.published || 0} total={statusByType?.notes?.total || 1} color="emerald" />
              <StatusRow label="Drafts" count={statusByType?.notes?.draft || 0} total={statusByType?.notes?.total || 1} color="amber" />
              <StatusRow label="Pending Review" count={statusByType?.notes?.pending || 0} total={statusByType?.notes?.total || 1} color="blue" />
            </AssetCard>

            {/* Flashcards Breakdown */}
            <AssetCard title="Smart Flashcards" count={statusByType?.flashcards?.total || 0} icon={Layers} color="violet">
              <StatusRow label="Published" count={statusByType?.flashcards?.published || 0} total={statusByType?.flashcards?.total || 1} color="emerald" />
              <StatusRow label="Drafts" count={statusByType?.flashcards?.draft || 0} total={statusByType?.flashcards?.total || 1} color="amber" />
            </AssetCard>

            {/* Revision Sheets Breakdown */}
            <AssetCard title="Revision Sheets" count={statusByType?.revisionSheets?.total || 0} icon={Sparkles} color="emerald">
              <StatusRow label="Published" count={statusByType?.revisionSheets?.published || 0} total={statusByType?.revisionSheets?.total || 1} color="emerald" />
              <StatusRow label="Drafts" count={statusByType?.revisionSheets?.draft || 0} total={statusByType?.revisionSheets?.total || 1} color="amber" />
            </AssetCard>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 text-center">
      <span className="text-[10px] font-bold uppercase text-slate-400 block">{label}</span>
      <span className="text-xl font-black text-white">{value.toLocaleString()}</span>
    </div>
  );
}

function AssetCard({
  title,
  count,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ElementType;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-indigo-400" />
          <span>{title}</span>
        </h3>
        <span className="text-xs font-black text-indigo-400">{count.toLocaleString()} Total</span>
      </div>
      <div className="space-y-2 pt-2">{children}</div>
    </div>
  );
}

function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = Math.round((count / Math.max(total, 1)) * 100);
  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between font-semibold">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">{count} ({pct}%)</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
        <div className={`h-full rounded-full bg-${color}-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
