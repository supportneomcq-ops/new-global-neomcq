'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BadgeDollarSign, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react';
import AnalyticsFilterBar, { AnalyticsFilterState } from '@/components/admin/analytics/analytics-filter-bar';
import { exportToCSV } from '@/lib/analytics-utils';

export default function RevenueAnalyticsPage() {
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

  const fetchRevenueAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.timeframe) queryParams.set('timeframe', filters.timeframe);
      if (filters.customStart) queryParams.set('customStart', filters.customStart);
      if (filters.customEnd) queryParams.set('customEnd', filters.customEnd);

      const res = await fetch(`/api/admin/analytics/revenue?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch revenue analytics');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading revenue analytics');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRevenueAnalytics();
  }, [fetchRevenueAnalytics]);

  const handleExport = () => {
    if (!data?.metrics) return;
    const m = data.metrics;
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Gross Revenue ($)', m.grossRevenue],
      ['Net Revenue ($)', m.netRevenue],
      ['Refund Amount ($)', m.refundAmount],
      ['Successful Payments', m.successfulPaymentsCount],
      ['Refunds Count', m.refundsCount],
      ['Average Transaction Value ($)', m.avgTransactionValue],
      ['ARPU ($)', m.arpu],
      ['Active Subscriptions', m.activeSubs],
      ['New Subscriptions', m.newSubs],
      ['Cancelled Subscriptions', m.cancelledSubs],
    ];
    exportToCSV('revenue_analytics', headers, rows);
  };

  const m = data?.metrics;
  const comp = data?.comparison;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-black flex items-center gap-2 text-slate-900 dark:text-white">
          <BadgeDollarSign className="w-7 h-7 text-[#6D5BFF]" />
          <span>Revenue & Subscription Analytics</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
          Gross vs Net revenue, subscription velocity, average revenue per user (ARPU), and period comparisons.
        </p>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchRevenueAnalytics}
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
          No revenue transactions recorded for this period.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Revenue Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <RevCard title="Gross Revenue" value={`$${m.grossRevenue.toLocaleString()}`} change={comp?.revenueChange?.formatted} isPositive={comp?.revenueChange?.isPositive} subtitle="TotalCaptured Payments" icon={BadgeDollarSign} color="emerald" />
            <RevCard title="Net Revenue" value={`$${m.netRevenue.toLocaleString()}`} subtitle={`$${m.refundAmount} in refunds`} icon={BadgeDollarSign} color="emerald" />
            <RevCard title="Average Revenue / User (ARPU)" value={`$${m.arpu}`} subtitle="Per paying customer" icon={TrendingUp} color="indigo" />
            <RevCard title="Average Transaction Value" value={`$${m.avgTransactionValue}`} subtitle={`${m.successfulPaymentsCount} Successful Payments`} icon={CreditCard} color="cyan" />
          </div>

          {/* Subscriptions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <RevCard title="Active Subscriptions" value={m.activeSubs.toLocaleString()} subtitle="Recurring Pass Holders" icon={CheckCircle2} color="emerald" />
            <RevCard title="New Subscriptions" value={m.newSubs.toLocaleString()} change={comp?.subscriptionChange?.formatted} isPositive={comp?.subscriptionChange?.isPositive} subtitle="Signups in period" icon={TrendingUp} color="blue" />
            <RevCard title="Cancelled / Churned" value={m.cancelledSubs.toLocaleString()} subtitle="Involuntary & Voluntary" icon={ShieldAlert} color="rose" />
            <RevCard title="Successful Payments" value={m.successfulPaymentsCount.toLocaleString()} change={comp?.paymentChange?.formatted} isPositive={comp?.paymentChange?.isPositive} subtitle="Captured Transactions" icon={CreditCard} color="teal" />
          </div>

          {/* Revenue by Plan */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Revenue Breakdown by Subscription Plan</span>
            </h3>

            {data?.revenueByPlan?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No plan revenue breakdown available.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {data?.revenueByPlan?.map((p: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400 block uppercase">{p.plan}</span>
                    <span className="text-xl font-black text-emerald-400">${p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RevCard({
  title,
  value,
  subtitle,
  change,
  isPositive,
  icon: Icon,
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
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
        <span>{title}</span>
        <Icon className="w-4 h-4 text-emerald-400" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-white">{value}</span>
        {change && (
          <span className={`text-xs font-bold flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {change}
          </span>
        )}
      </div>
      {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
    </div>
  );
}
