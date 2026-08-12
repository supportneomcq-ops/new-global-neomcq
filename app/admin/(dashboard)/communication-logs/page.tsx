'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  RefreshCw,
  Filter,
  Layers,
  CheckCircle2,
  Bell,
  Mail,
  Radio,
  HelpCircle,
  Megaphone,
} from 'lucide-react';

export default function AdminCommunicationLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('ALL');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, channel: selectedChannel });
      const res = await fetch(`/api/admin/communication-logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.logs || []);
      }
    } catch (err) {
      console.error('Failed to load communication logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [search, selectedChannel]);

  const getChannelIcon = (ch: string) => {
    if (ch.includes('In-App')) return <Bell className="w-4 h-4 text-[#6D5BFF]" />;
    if (ch.includes('Email')) return <Mail className="w-4 h-4 text-blue-400" />;
    if (ch.includes('Push')) return <Radio className="w-4 h-4 text-purple-400" />;
    if (ch.includes('Support')) return <HelpCircle className="w-4 h-4 text-emerald-400" />;
    return <Megaphone className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <History className="w-6 h-6 text-[#6D5BFF]" />
            <span>Communication Unified Audit Logs</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Unified cross-channel communication event audit trail for notifications, emails, push broadcasts, announcements, and support replies.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 w-full sm:w-72 text-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search log event, title, or admin actor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent focus:outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#6D5BFF]"
          >
            <option value="ALL">All Communication Channels</option>
            <option value="In-App Notification">In-App Notifications</option>
            <option value="Email">Email</option>
            <option value="Push Notification">Push Notifications</option>
            <option value="Announcement">Announcements</option>
            <option value="Support">Support Helpdesk</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Channel & Event Type</th>
                <th className="p-4">Event Title / Description</th>
                <th className="p-4">Triggered By (Actor)</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
                    <span>Loading unified communication audit trail...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                    No communication logs found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(log.channel)}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{log.channel}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{log.event_type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white max-w-xs">
                      {log.title}
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {log.actor}
                    </td>
                    <td className="p-4 font-semibold text-emerald-400">
                      {log.status}
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
