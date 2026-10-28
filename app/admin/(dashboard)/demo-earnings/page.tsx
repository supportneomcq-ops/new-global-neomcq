'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  TrendingUp,
  Wallet,
  Target,
  RefreshCw,
  Download,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getSupabaseClient } from '@/lib/supabase';

type DemoEarning = {
  id: string;
  period_start: string;
  period_label: string;
  currency: string;
  gross_revenue: number;
  operating_expenses: number;
  net_profit: number;
  target_profit: number;
  is_demo: boolean;
  demo_notice: string;
};

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const money = (value: number) => INR.format(value);
const numeric = (value: unknown) => Number(value ?? 0);

export default function DemoEarningsPage() {
  const [rows, setRows] = useState<DemoEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDemoEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error: queryError } = await supabase
        .from('demo_earnings_monthly')
        .select('id, period_start, period_label, currency, gross_revenue, operating_expenses, net_profit, target_profit, is_demo, demo_notice')
        .eq('is_demo', true)
        .order('period_start', { ascending: true });

      if (queryError) throw queryError;
      setRows((data ?? []).map((row: any) => ({
        ...row,
        gross_revenue: numeric(row.gross_revenue),
        operating_expenses: numeric(row.operating_expenses),
        net_profit: numeric(row.net_profit),
        target_profit: numeric(row.target_profit),
      })));
    } catch (err: any) {
      setError(err?.message || 'Could not load demo earnings. Confirm admin access and database migration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDemoEarnings();
  }, [loadDemoEarnings]);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    revenue: acc.revenue + row.gross_revenue,
    expenses: acc.expenses + row.operating_expenses,
    profit: acc.profit + row.net_profit,
    target: acc.target + row.target_profit,
  }), { revenue: 0, expenses: 0, profit: 0, target: 0 }), [rows]);

  const chartRows = rows.map((row) => ({
    month: row.period_label,
    revenue: row.gross_revenue,
    expenses: row.operating_expenses,
    profit: row.net_profit,
    target: row.target_profit,
  }));

  const exportCsv = () => {
    const headers = ['Period', 'Currency', 'Demo Revenue', 'Demo Expenses', 'Demo Profit', 'Demo Profit Target', 'Is Demo'];
    const csvRows = [
      headers,
      ...rows.map((row) => [
        row.period_label, row.currency, row.gross_revenue, row.operating_expenses,
        row.net_profit, row.target_profit, 'TRUE',
      ]),
      ['TOTAL', 'INR', totals.revenue, totals.expenses, totals.profit, totals.target, 'TRUE'],
    ];
    const csv = csvRows.map((row) => row.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'NeoMCQ_DEMO_Earnings_Aug-Oct-2026.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BadgeDollarSign className="h-7 w-7 text-[#6D5BFF]" />
            <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white">Demo Earnings Dashboard</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Illustrative financial scenario · August–October 2026 · INR
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadDemoEarnings} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#090D1E] dark:text-slate-200 dark:hover:bg-slate-800">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh demo
          </button>
          <button onClick={exportCsv} disabled={rows.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-[#6D5BFF] px-3 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </header>

      <section role="alert" className="rounded-2xl border-2 border-amber-400/70 bg-amber-50 p-4 text-amber-950 dark:bg-amber-500/10 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="text-sm font-black uppercase tracking-wide">Demo data — not actual NeoMCQ earnings</div>
            <p className="mt-1 text-xs leading-5">
              Every amount on this page is simulated for UI/testing and financial planning. These figures are stored separately from real payments, Razorpay events, and subscriptions. Do not use them as evidence of actual revenue or profit.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">
          <strong>Unable to load demo data.</strong> {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#090D1E]" />)}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Demo revenue" value={money(totals.revenue)} subtitle="Simulated gross revenue" icon={<TrendingUp className="h-5 w-5" />} tone="emerald" />
            <MetricCard title="Demo expenses" value={money(totals.expenses)} subtitle="Simulated operating costs" icon={<Wallet className="h-5 w-5" />} tone="amber" />
            <MetricCard title="Demo profit" value={money(totals.profit)} subtitle="Revenue minus demo expenses" icon={<BadgeDollarSign className="h-5 w-5" />} tone="violet" />
            <MetricCard title="3-month profit target" value={money(totals.target)} subtitle={totals.target > 0 ? `${Math.round((totals.profit / totals.target) * 100)}% of illustrative target` : 'No target loaded'} icon={<Target className="h-5 w-5" />} tone="blue" />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#090D1E] xl:col-span-3">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Demo revenue vs. profit</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Monthly illustrative values · not transaction-derived</p>
                </div>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase text-amber-600 dark:text-amber-300">Demo only</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="demoRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6D5BFF" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6D5BFF" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="demoProfitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.2} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => value >= 100000 ? `₹${Math.round(value / 1000)}k` : `₹${Math.round(value / 1000)}k`} width={54} />
                    <Tooltip formatter={(value: any) => money(Number(value))} contentStyle={{ borderRadius: 12, border: '1px solid #334155', background: '#0b1020', color: '#fff', fontSize: 12 }} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Demo revenue" stroke="#6D5BFF" fill="url(#demoRevenueFill)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="profit" name="Demo profit" stroke="#10B981" fill="url(#demoProfitFill)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#090D1E] xl:col-span-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Profit vs. illustrative target</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Targets are demo assumptions, not forecasts.</p>
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.2} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} width={48} />
                    <Tooltip formatter={(value: any) => money(Number(value))} contentStyle={{ borderRadius: 12, border: '1px solid #334155', background: '#0b1020', color: '#fff', fontSize: 12 }} />
                    <Legend />
                    <Bar dataKey="profit" name="Demo profit" fill="#10B981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="target" name="Demo target" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#090D1E]">
            <div className="flex items-center gap-2 border-b border-slate-200 p-5 dark:border-slate-800">
              <BadgeDollarSign className="h-5 w-5 text-[#6D5BFF]" />
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">Monthly demo breakdown</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">October is month-to-date through 28 October 2026.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Period</th>
                    <th className="px-5 py-3 text-right">Demo revenue</th>
                    <th className="px-5 py-3 text-right">Demo expenses</th>
                    <th className="px-5 py-3 text-right">Demo profit</th>
                    <th className="px-5 py-3 text-right">Demo target</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((row) => (
                    <tr key={row.id} className="text-slate-700 dark:text-slate-200">
                      <td className="px-5 py-4 font-bold">{row.period_label}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{money(row.gross_revenue)}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{money(row.operating_expenses)}</td>
                      <td className="px-5 py-4 text-right font-black text-emerald-600 dark:text-emerald-400">{money(row.net_profit)}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{money(row.target_profit)}</td>
                      <td className="px-5 py-4 text-right"><span className="rounded-full bg-amber-500/10 px-2 py-1 text-[9px] font-black uppercase text-amber-600 dark:text-amber-300">Simulated</span></td>
                    </tr>
                  ))}
                  {rows.length > 0 && (
                    <tr className="bg-slate-50 font-black text-slate-900 dark:bg-slate-900/60 dark:text-white">
                      <td className="px-5 py-4">TOTAL</td>
                      <td className="px-5 py-4 text-right">{money(totals.revenue)}</td>
                      <td className="px-5 py-4 text-right">{money(totals.expenses)}</td>
                      <td className="px-5 py-4 text-right text-emerald-600 dark:text-emerald-400">{money(totals.profit)}</td>
                      <td className="px-5 py-4 text-right">{money(totals.target)}</td>
                      <td className="px-5 py-4 text-right">DEMO</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Source: dedicated <code>demo_earnings_monthly</code> table. This page does not read from or write to <code>payments</code>, <code>subscriptions</code>, Razorpay events, or live revenue analytics.</p>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, tone }: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'amber' | 'violet' | 'blue';
}) {
  const toneClasses = {
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    violet: 'text-[#6D5BFF] bg-[#6D5BFF]/10 border-[#6D5BFF]/20',
    blue: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
  };
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#090D1E]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</div>
        <div className={`rounded-xl border p-2 ${toneClasses[tone]}`}>{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</div>
      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{subtitle}</div>
    </div>
  );
}
