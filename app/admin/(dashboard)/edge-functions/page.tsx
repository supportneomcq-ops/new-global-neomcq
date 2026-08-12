'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCode,
  RefreshCw,
  CheckCircle2,
  Play,
  Terminal,
  Activity,
  Zap,
} from 'lucide-react';

export default function AdminEdgeFunctionsPage() {
  const [loading, setLoading] = useState(true);
  const [functions, setFunctions] = useState<any[]>([]);

  const loadEdgeFunctions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/edge-functions');
      const json = await res.json();
      if (json.success) {
        setFunctions(json.edgeFunctions || []);
      }
    } catch (err) {
      console.error('Failed to load edge functions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEdgeFunctions();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <FileCode className="w-6 h-6 text-indigo-500" />
            <span>Supabase Edge Functions Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Deno Edge Functions inventory, execution telemetry, invocation counts, and audit logs.
          </p>
        </div>

        <button
          onClick={loadEdgeFunctions}
          className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Functions</span>
        </button>
      </div>

      {/* Functions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            <span>Loading Edge Functions telemetry...</span>
          </div>
        ) : (
          functions.map((fn) => (
            <div
              key={fn.id}
              className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {fn.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {fn.auditTag}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> HEALTHY
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-gray-400">{fn.purpose}</p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-gray-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Latency: {fn.durationMs}ms</span>
                <span>Error Rate: {fn.errorRate}</span>
                <span>Last Run: {new Date(fn.lastInvocation).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
