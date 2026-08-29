'use client';

import React, { useState, useEffect } from 'react';
import {
  BadgeDollarSign,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Loader2,
  Cpu,
  Layers,
  ShieldCheck,
  Coins,
  DollarSign,
  PieChart,
  CheckCircle2,
  FileCode,
} from 'lucide-react';

export default function AdminAICostsPage() {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [costData, setCostData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-costs?timeframe=${timeframe}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch AI cost breakdown');

      setCostData(json);
    } catch (err: any) {
      console.error('Error fetching costs:', err);
      setError(err.message || 'Failed to calculate AI costs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
  }, [timeframe]);

  const hasData = costData && costData.metrics && (costData.metrics.totalCostEvents > 0 || costData.rule60.effectiveRevenueUsd > 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BadgeDollarSign className="w-7 h-7 text-emerald-400" />
            AI Cost & Margin Accounting
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enforcing the 60% AI Cost Budget Rule: Real COGS accounting, provider expenses, and gross margins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-semibold"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <button
            onClick={fetchCosts}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <span>Sync Costs</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Calculating Real AI Expenditure & Margin Rules...
          </span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 space-y-2 bg-slate-900 border border-rose-500/20 rounded-xl">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 60% Rule Command Banner */}
          {costData.rule60 && (
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Core Rule
                    </span>
                    <h2 className="text-lg font-black text-white">60% AI Cost Budget Discipline</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    AI generation expenses must never exceed 60% of net eligible revenue (AI Cost / Net Revenue ≤ 60%).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider border flex items-center gap-1.5 ${
                      costData.rule60.budgetHealth === 'Normal'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : costData.rule60.budgetHealth === 'Caution'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Status: {costData.rule60.budgetHealth}
                  </span>
                </div>
              </div>

              {/* Rule KPIs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Eligible Revenue</span>
                  <span className="text-lg font-black text-white font-mono mt-1 block">
                    ${costData.rule60.effectiveRevenueUsd}
                  </span>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-indigo-300 block text-[11px]">60% AI Budget Cap</span>
                  <span className="text-lg font-black text-indigo-300 font-mono mt-1 block">
                    ${costData.rule60.aiBudgetAllowanceUsd}
                  </span>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Total AI COGS</span>
                  <span className="text-lg font-black text-emerald-400 font-mono mt-1 block">
                    ${costData.rule60.totalActualCogsUsd}
                  </span>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">AI Cost Ratio</span>
                  <span
                    className={`text-lg font-black font-mono mt-1 block ${
                      costData.rule60.aiCostRatioPercent > 60
                        ? 'text-rose-400'
                        : costData.rule60.aiCostRatioPercent > 50
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {costData.rule60.aiCostRatioPercent}%
                  </span>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Remaining AI Budget</span>
                  <span className="text-lg font-black text-white font-mono mt-1 block">
                    ${costData.rule60.remainingAiBudgetUsd}
                  </span>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Gross Margin</span>
                  <span className="text-lg font-black text-emerald-400 font-mono mt-1 block">
                    {costData.rule60.grossMarginPercent}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Provider */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Actual Cost by Provider
              </h2>

              <div className="space-y-3">
                {Object.keys(costData.breakdowns?.byProvider || {}).length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl">No provider expenses logged yet.</p>
                ) : (
                  Object.entries(costData.breakdowns.byProvider).map(([pName, pCost]: [string, any]) => (
                    <div key={pName} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{pName}</span>
                      <span className="font-mono text-emerald-400 font-bold text-sm">${pCost}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* By Task Type */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                Actual Cost by Task Type
              </h2>

              <div className="space-y-3">
                {Object.keys(costData.breakdowns?.byTask || {}).length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl">No task expenses logged yet.</p>
                ) : (
                  Object.entries(costData.breakdowns.byTask).map(([tName, tCost]: [string, any]) => (
                    <div key={tName} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-indigo-300">{tName}</span>
                      <span className="font-mono text-emerald-400 font-bold text-sm">${tCost}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Cost Events */}
          {costData.recentEvents && costData.recentEvents.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Recent AI Generation Cost Events (Real Audit)
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/60 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-700/60">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Task</th>
                      <th className="py-3 px-4">Provider / Model</th>
                      <th className="py-3 px-4">Tokens (In / Out)</th>
                      <th className="py-3 px-4">Provider COGS</th>
                      <th className="py-3 px-4">Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {costData.recentEvents.map((ev: any) => (
                      <tr key={ev.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(ev.created_at).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{ev.task_type}</td>
                        <td className="py-3 px-4 text-indigo-300">{ev.provider} ({ev.model})</td>
                        <td className="py-3 px-4 text-slate-300">
                          {ev.input_tokens} / {ev.output_tokens}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          ${Number(ev.actual_provider_cost || 0).toFixed(5)}
                        </td>
                        <td className="py-3 px-4 text-amber-400 font-bold">
                          {ev.credits_deducted || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
