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
  BookOpen,
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BadgeDollarSign className="w-7 h-7 text-emerald-400" />
            AI Cost Financial Analysis
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Calculated AI model expenditure based on active token usage and provider pricing tiers.
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
            Calculating AI Expenditure...
          </span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/90 border border-emerald-500/30 p-5 rounded-2xl shadow-lg shadow-emerald-500/5">
              <span className="text-slate-400 text-xs font-semibold uppercase block">Total Expenditure</span>
              <p className="text-4xl font-black text-emerald-400 mt-2">${costData.costs.totalCostUsd}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">In timeframe ({timeframe})</span>
            </div>

            <div className="bg-slate-900/90 border border-indigo-500/20 p-5 rounded-2xl">
              <span className="text-indigo-300 text-xs font-semibold uppercase block">Total Generated Assets</span>
              <p className="text-4xl font-black text-indigo-300 mt-2">{costData.costs.totalGeneratedAssets}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">MCQs, Notes, Flashcards, Sheets</span>
            </div>

            <div className="bg-slate-900/90 border border-purple-500/20 p-5 rounded-2xl">
              <span className="text-purple-300 text-xs font-semibold uppercase block">Cost Per Asset</span>
              <p className="text-4xl font-black text-purple-300 mt-2">${costData.costs.costPerAssetUsd}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Avg cost per generated item</span>
            </div>
          </div>

          {/* Detailed Cost Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Provider */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Cost by Provider
              </h2>

              <div className="space-y-3">
                {Object.entries(costData.costs.byProvider || {}).map(([pName, pCost]: [string, any]) => (
                  <div key={pName} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{pName}</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">${pCost}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Model */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Cost by Model
              </h2>

              <div className="space-y-3">
                {Object.entries(costData.costs.byModel || {}).map(([mName, mCost]: [string, any]) => (
                  <div key={mName} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-indigo-300">{mName}</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">${mCost}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
