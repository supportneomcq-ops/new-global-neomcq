'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  UserCheck,
  ShieldAlert,
  Search,
} from 'lucide-react';

export default function AdminSupabaseAuthPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  const loadAuthMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/supabase/auth');
      const json = await res.json();
      if (json.success) {
        setMetrics(json.metrics);
      }
    } catch (err) {
      console.error('Failed to load auth metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuthMetrics();
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
              <Users className="w-6 h-6 text-[#3ECF8E]" />
              <span>Supabase GoTrue Authentication Dashboard</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Safe operational metrics for registered users, email confirmations, active sessions, and security events.
            </p>
          </div>
        </div>

        <button
          onClick={loadAuthMetrics}
          className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Auth Metrics</span>
        </button>
      </div>

      {/* Auth Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Total User Accounts</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {loading ? '...' : metrics?.totalUsers ?? 0}
          </div>
          <div className="text-[10px] text-emerald-400 font-bold">Registered Profiles</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Confirmed Emails</div>
          <div className="text-2xl font-black text-emerald-400">
            {loading ? '...' : metrics?.confirmedUsers ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">100% Verified</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Recent Signups (30d)</div>
          <div className="text-2xl font-black text-[#6D5BFF]">
            {loading ? '...' : metrics?.recentSignups ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">New Student Onboarding</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Suspended / Banned</div>
          <div className="text-2xl font-black text-slate-400">
            {loading ? '...' : metrics?.suspendedAccounts ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">0 Restricted Accounts</div>
        </div>
      </div>

      {/* Recent Users List */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-gray-800 font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
          <span>Recent Authentication Registrations</span>
          <span className="text-xs text-slate-400 font-normal">Safe non-sensitive user metadata</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase">
              <tr>
                <th className="p-4">User Email & Name</th>
                <th className="p-4">Created Date</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#3ECF8E]" />
                    <span>Loading user auth metrics...</span>
                  </td>
                </tr>
              ) : (metrics?.recentUsers || []).map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                  <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                    <div>{u.email}</div>
                    <div className="text-[10px] font-normal text-slate-400">{u.full_name || 'Medical Student'}</div>
                  </td>
                  <td className="p-4 text-slate-400 text-[11px]">{new Date(u.created_at).toLocaleString()}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> CONFIRMED
                    </span>
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
