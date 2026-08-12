'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  ArrowLeft,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react';

export default function AdminEmailLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, status: selectedStatus });
      const res = await fetch(`/api/admin/email/logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.logs || []);
      }
    } catch (err) {
      console.error('Failed to load email logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [search, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/email"
            className="p-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">
              <History className="w-6 h-6 text-[#6D5BFF]" />
              <span>SMTP & Email Execution Logs</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Audit individual email dispatch events, SMTP status responses, delivery latencies, and diagnostic bounce logs.
            </p>
          </div>
        </div>

        <button
          onClick={loadLogs}
          className="p-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 w-full sm:w-72 text-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search recipient email or message ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent focus:outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#6D5BFF]"
          >
            <option value="ALL">All Delivery Statuses</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed / Bounced</option>
            <option value="queued">Queued</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Message ID & Recipient</th>
                <th className="p-4">Template Flow</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Status</th>
                <th className="p-4">Provider</th>
                <th className="p-4 text-right">Dispatched At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
                    <span>Loading email logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    No email logs match your query.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {log.recipient}
                      </div>
                      <div className="text-slate-400 text-[10px]">{log.id}</div>
                    </td>
                    <td className="p-4 uppercase text-[10px] font-extrabold text-indigo-400">
                      {log.template_slug}
                    </td>
                    <td className="p-4 text-slate-300 max-w-xs truncate">
                      {log.subject}
                    </td>
                    <td className="p-4">
                      {log.status === 'delivered' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Delivered
                        </span>
                      ) : log.status === 'failed' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20" title={log.error_message || ''}>
                          Failed
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          {log.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400 text-[11px] font-semibold">
                      {log.provider || 'Resend SMTP'}
                    </td>
                    <td className="p-4 text-right text-slate-400 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
