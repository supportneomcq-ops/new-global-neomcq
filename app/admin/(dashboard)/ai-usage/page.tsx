'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Loader2,
  FileCode,
} from 'lucide-react';

export default function AdminAIUsagePage() {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');
  const [usageData, setUsageData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-usage?timeframe=${timeframe}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch AI usage telemetry');

      setUsageData(json);
    } catch (err: any) {
      console.error('Error fetching usage:', err);
      setError(err.message || 'Failed to load usage statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [timeframe]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-[#6D5BFF]" />
            AI Usage & Telemetry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real usage telemetry computed from active job requests, tokens consumed, and provider distributions.
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
            onClick={fetchUsage}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#6D5BFF]">
            Computing AI Usage Telemetry...
          </span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Core Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
              <span className="text-slate-400 text-xs font-semibold uppercase block">Total Generation Requests</span>
              <p className="text-3xl font-black text-white mt-2">{usageData.metrics.totalRequests}</p>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/20 p-5 rounded-2xl">
              <span className="text-emerald-400 text-xs font-semibold uppercase block">Success Rate</span>
              <p className="text-3xl font-black text-emerald-400 mt-2">{usageData.metrics.successRatePercentage}%</p>
            </div>

            <div className="bg-slate-900/90 border border-indigo-500/20 p-5 rounded-2xl">
              <span className="text-indigo-300 text-xs font-semibold uppercase block">Tokens Input</span>
              <p className="text-3xl font-black text-indigo-300 mt-2">{usageData.metrics.tokensInput.toLocaleString()}</p>
            </div>

            <div className="bg-slate-900/90 border border-purple-500/20 p-5 rounded-2xl">
              <span className="text-purple-300 text-xs font-semibold uppercase block">Tokens Output</span>
              <p className="text-3xl font-black text-purple-300 mt-2">{usageData.metrics.tokensOutput.toLocaleString()}</p>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Provider */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Requests by Provider
              </h2>

              <div className="space-y-3">
                {Object.entries(usageData.breakdowns.byProvider || {}).map(([pName, pData]: [string, any]) => (
                  <div key={pName} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">{pName}</span>
                      <span className="font-mono text-indigo-400 font-bold">{pData.requests} reqs</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Tokens: {pData.tokens.toLocaleString()}</span>
                      <span className="text-emerald-400 font-semibold">{pData.success} success / {pData.failed} failed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Asset Type */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-400" />
                Requests by Asset Type
              </h2>

              <div className="space-y-3">
                {Object.entries(usageData.breakdowns.byAssetType || {}).map(([aName, aCount]: [string, any]) => (
                  <div key={aName} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="font-bold text-white uppercase">{aName}</span>
                    <span className="font-mono text-purple-300 font-bold">{aCount} requests</span>
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
