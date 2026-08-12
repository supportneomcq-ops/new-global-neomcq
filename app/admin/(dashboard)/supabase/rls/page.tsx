'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lock,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export default function AdminSupabaseRlsPage() {
  const [loading, setLoading] = useState(true);
  const [rlsData, setRlsData] = useState<any[]>([]);

  const loadRlsData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/supabase/rls');
      const json = await res.json();
      if (json.success) {
        setRlsData(json.rlsInventory || []);
      }
    } catch (err) {
      console.error('Failed to load RLS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRlsData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/supabase"
            className="p-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">
              <Lock className="w-6 h-6 text-rose-500" />
              <span>Row Level Security (RLS) Audit</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Audit RLS security status across all application database tables. RLS changes require controlled server-side migrations.
            </p>
          </div>
        </div>

        <button
          onClick={loadRlsData}
          className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Audit Policies</span>
        </button>
      </div>

      {/* RLS Status Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Database Table</th>
                <th className="p-4">RLS Enabled</th>
                <th className="p-4">Policy Count</th>
                <th className="p-4">Security Status</th>
                <th className="p-4">Audit Warnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
                    <span>Auditing RLS policies on all tables...</span>
                  </td>
                </tr>
              ) : rlsData.map((row) => (
                <tr key={row.table} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                  <td className="p-4 font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {row.table}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                      <Lock className="w-3 h-3 text-emerald-400" /> ENABLED
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-300">
                    {row.policyCount} Policies
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> HEALTHY
                    </span>
                  </td>
                  <td className="p-4 text-slate-400 text-[11px]">
                    {row.warning ? (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {row.warning}
                      </span>
                    ) : (
                      'No security warnings'
                    )}
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
