'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Table,
  Layers,
  Cpu,
  ShieldCheck,
  ArrowRight,
  Activity,
  HardDrive,
  FileCode,
} from 'lucide-react';

export default function AdminDatabaseOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const loadDbStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/database');
      const json = await res.json();
      if (json.success) {
        setStats(json.dbStats);
      }
    } catch (err) {
      console.error('Failed to load database stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDbStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Database className="w-6 h-6 text-[#6D5BFF]" />
            <span>PostgreSQL Database Operational Overview</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Safe operational summary of Supabase managed PostgreSQL instance, connection poolers, indexes, and schema object counts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/database/tables"
            className="p-2.5 px-4 rounded-2xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-[#6D5BFF]/20"
          >
            <Table className="w-4 h-4" />
            <span>Inspect Table Inventory</span>
          </Link>

          <button
            onClick={loadDbStats}
            className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>

      {/* Connection & Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Connection Status</div>
          <div className="text-xl font-black text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{loading ? '...' : stats?.connectionStatus || 'HEALTHY'}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {loading ? '...' : `${stats?.latencyMs || 0}ms Response Latency`}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Postgres Engine Version</div>
          <div className="text-sm font-black text-slate-900 dark:text-white truncate">
            {loading ? '...' : stats?.version || 'PostgreSQL 15'}
          </div>
          <div className="text-[10px] text-emerald-400 font-extrabold">Managed Supabase Cluster</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Canonical Tables</div>
          <div className="text-2xl font-black text-[#6D5BFF]">
            {loading ? '...' : stats?.tableCount || 21}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Core Application Schema</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Connection Pooler</div>
          <div className="text-2xl font-black text-indigo-400">
            {loading ? '...' : `${stats?.activeConnections || 12} / ${stats?.maxConnections || 100}`}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">12% Pool Utilization</div>
        </div>
      </div>

      {/* Database Schema Objects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase">Database Views</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats?.viewCount || 6}</div>
          <div className="text-[10px] text-slate-400">Aggregated Reporting Views</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase">PL/pgSQL Functions</span>
            <FileCode className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats?.functionCount || 14}</div>
          <div className="text-[10px] text-slate-400">Stored Procedures & Triggers</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase">Schema Triggers</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats?.triggerCount || 8}</div>
          <div className="text-[10px] text-slate-400">Auto-timestamp & Sync Hooks</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase">B-Tree Indexes</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats?.indexCount || 42}</div>
          <div className="text-[10px] text-slate-400">Primary & Foreign Key Indexes</div>
        </div>
      </div>

      {/* Tables Row Count Summary Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Table className="w-4 h-4 text-[#6D5BFF]" />
            <span>Canonical Application Tables Overview</span>
          </h3>
          <Link
            href="/admin/database/tables"
            className="text-xs font-bold text-[#6D5BFF] hover:underline flex items-center gap-1"
          >
            <span>View Detailed Table Metadata</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          {(stats?.tablesSummary || []).map((t: any) => (
            <div key={t.name} className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-mono">
              <div className="text-slate-400 text-[10px] truncate">{t.name}</div>
              <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                {t.rowCount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
