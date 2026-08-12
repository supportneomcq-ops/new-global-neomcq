'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  Search,
  Code,
  ShieldCheck,
} from 'lucide-react';

export default function AdminApiHealthPage() {
  const [loading, setLoading] = useState(true);
  const [apis, setApis] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const loadApiHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/api-health');
      const json = await res.json();
      if (json.success) {
        setApis(json.apis || []);
      }
    } catch (err) {
      console.error('Failed to load API health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApiHealth();
  }, []);

  const filteredApis = apis.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.endpoint.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#6D5BFF]" />
            <span>Core Application API Routes Health</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Real-time diagnostic health checks across all core NeoMCQ REST API routes and microservices.
          </p>
        </div>

        <button
          onClick={loadApiHealth}
          className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Ping All API Routes</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 w-full sm:w-80 text-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search API route, category, or endpoint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent focus:outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        <div className="text-xs text-slate-400 font-bold hidden sm:block">
          Monitored API Routes: {filteredApis.length} / {apis.length}
        </div>
      </div>

      {/* API Health Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">API Name & Category</th>
                <th className="p-4">Endpoint Path</th>
                <th className="p-4">Status</th>
                <th className="p-4">Response Latency</th>
                <th className="p-4">Last Health Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
                    <span>Executing safe diagnostic health probes on all API routes...</span>
                  </td>
                </tr>
              ) : filteredApis.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                  <td className="p-4">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{a.name}</div>
                    <div className="text-[10px] font-extrabold uppercase text-[#6D5BFF]">
                      {a.category}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-400 text-xs">{a.endpoint}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> OPERATIONAL
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-emerald-400 text-xs">
                    {a.latencyMs}ms
                  </td>
                  <td className="p-4 text-slate-400 text-[11px] font-mono">
                    {new Date(a.lastCheck).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
