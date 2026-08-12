'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  ArrowRight,
  Filter,
} from 'lucide-react';

export default function AdminSupportPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        status: selectedStatus,
        priority: selectedPriority,
      });
      const res = await fetch(`/api/admin/support?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTickets(json.tickets || []);
      }
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [search, selectedStatus, selectedPriority]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Open':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">Open</span>;
      case 'In Progress':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">In Progress</span>;
      case 'Pending':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">Pending</span>;
      case 'Resolved':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolved</span>;
      case 'Closed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/20">Closed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/20">{st}</span>;
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="text-[10px] font-black uppercase text-rose-500">Urgent</span>;
      case 'high':
        return <span className="text-[10px] font-black uppercase text-amber-500">High</span>;
      case 'normal':
        return <span className="text-[10px] font-black uppercase text-slate-400">Normal</span>;
      default:
        return <span className="text-[10px] font-black uppercase text-slate-400">{p}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#6D5BFF]" />
            <span>Customer Support Helpdesk</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Manage user support inquiries, payment discrepancies, content feedback, and technical support tickets.
          </p>
        </div>

        <button
          onClick={loadTickets}
          className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Tickets</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Open Tickets</div>
          <div className="text-2xl font-black text-blue-500">12</div>
          <div className="text-[10px] text-blue-400 font-extrabold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Awaiting Initial Reply</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">In Progress</div>
          <div className="text-2xl font-black text-amber-500">8</div>
          <div className="text-[10px] text-amber-400 font-extrabold">Active Resolution</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Avg Resolution Time</div>
          <div className="text-2xl font-black text-[#6D5BFF]">1.4 Hrs</div>
          <div className="text-[10px] text-slate-400 font-medium">98.2% CSAT Index</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Resolved Today</div>
          <div className="text-2xl font-black text-emerald-500">24</div>
          <div className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% Satisfied</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 w-full sm:w-72 text-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket #, email, or subject..."
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
            <option value="ALL">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#6D5BFF]"
          >
            <option value="ALL">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Ticket ID & Subject</th>
                <th className="p-4">User Details</th>
                <th className="p-4">Category</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4">Assigned Admin</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
                    <span>Loading tickets...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    No tickets match your filter criteria.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 max-w-xs">
                      <div className="font-mono text-[11px] font-bold text-[#6D5BFF]">
                        {t.ticket_number || t.id}
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1 mt-0.5">
                        {t.subject}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{t.user_name || 'User'}</div>
                      <div className="text-slate-400 text-[11px]">{t.user_email}</div>
                    </td>
                    <td className="p-4 font-semibold text-slate-300">
                      {t.category || 'General Inquiry'}
                    </td>
                    <td className="p-4">{getPriorityBadge(t.priority)}</td>
                    <td className="p-4">{getStatusBadge(t.status)}</td>
                    <td className="p-4 text-slate-400 text-[11px] font-mono">
                      {t.assigned_admin_email || 'Unassigned'}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/support/${t.id}`}
                        className="p-1.5 px-3 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <span>Open Thread</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
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
