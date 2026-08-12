'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Terminal,
  RefreshCw,
  Search,
  Eye,
  AlertCircle,
  Loader2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export default function AdminAILogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-logs?search=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch AI operational logs');

      setLogs(json.logs || []);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [refreshKey, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Terminal className="w-7 h-7 text-amber-400" />
            AI Operational Audit Logs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time audit records for AI jobs, provider events, and worker operations with strict credential sanitization.
          </p>
        </div>

        <button
          onClick={() => setRefreshKey((p) => p + 1)}
          className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          <span>Sync Logs</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter logs by Action, Job ID, or Provider..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[300px]">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Fetching Operational Audit Logs...
            </span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-bold text-white">No Audit Logs Found</p>
            <p className="text-xs text-slate-500 mt-1">No AI engine audit events match your search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Job ID</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Provider / Model</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-amber-300 font-mono">{log.action}</span>
                    </td>

                    <td className="py-3 px-4 font-mono text-indigo-400 font-bold">
                      {log.job_id ? (
                        <Link href={`/admin/ai-jobs/${log.job_id}`} className="hover:underline">
                          {log.job_id.substring(0, 8)}...
                        </Link>
                      ) : (
                        <span className="text-slate-600">N/A</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-300">
                      {log.actor}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {log.provider} ({log.model})
                    </td>

                    <td className="py-3 px-4 max-w-[250px]">
                      <span className="font-mono text-[11px] text-slate-400 truncate block bg-slate-950 p-1.5 rounded border border-slate-800">
                        {JSON.stringify(log.details)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
