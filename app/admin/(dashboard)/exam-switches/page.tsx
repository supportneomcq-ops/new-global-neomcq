'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Search,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  History,
  RefreshCw,
  User,
  ArrowRight,
  ShieldCheck,
  Zap,
  Filter,
} from 'lucide-react';
import {
  getAllExamSwitchRequestsAction,
  getAllExamSwitchHistoryAction,
  adminManualExamSwitchAction,
  getAllExamsAction,
} from '@/app/actions/admin';

export default function AdminExamSwitchesPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqData, histData, examList] = await Promise.all([
        getAllExamSwitchRequestsAction(),
        getAllExamSwitchHistoryAction(),
        getAllExamsAction().catch(() => []),
      ]);
      setRequests(reqData || []);
      setHistory(histData || []);
      setExams(examList || []);
    } catch (err) {
      console.error('Failed to load exam switches in admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRequests = requests.filter((r) => {
    const term = searchQuery.toLowerCase();
    const email = r.profiles?.email?.toLowerCase() || '';
    const name = `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.toLowerCase();
    const fromExam = r.from_exam?.name?.toLowerCase() || '';
    const toExam = r.to_exam?.name?.toLowerCase() || '';
    return email.includes(term) || name.includes(term) || fromExam.includes(term) || toExam.includes(term) || r.order_id?.toLowerCase().includes(term);
  });

  const filteredHistory = history.filter((h) => {
    const term = searchQuery.toLowerCase();
    const email = h.profiles?.email?.toLowerCase() || '';
    const name = `${h.profiles?.first_name || ''} ${h.profiles?.last_name || ''}`.toLowerCase();
    const fromExam = h.from_exam?.name?.toLowerCase() || '';
    const toExam = h.to_exam?.name?.toLowerCase() || '';
    return email.includes(term) || name.includes(term) || fromExam.includes(term) || toExam.includes(term) || h.payment_reference?.toLowerCase().includes(term);
  });

  const totalSwitchedRevenue = history.reduce((sum, h) => sum + Number(h.amount || 0), 0);

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20 mb-2">
            <Lock className="w-3.5 h-3.5" /> Exam Locking & Switch Control
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
            Exam Switch Audit & Revenue
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Monitor $2 USD exam switch orders, Razorpay verifications, and user exam locks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-xs font-bold text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Total Switch Revenue
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-black text-emerald-500 flex items-center gap-1">
            <DollarSign className="w-6 h-6" />
            {totalSwitchedRevenue.toFixed(2)} USD
          </div>
          <div className="text-[11px] text-slate-500 dark:text-gray-400">
            From {history.length} completed paid switches ($2/switch)
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Total Switch Requests
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-black text-[#6D5BFF]">
            {requests.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-gray-400">
            {requests.filter((r) => r.status === 'completed').length} completed,{' '}
            {requests.filter((r) => r.status === 'pending').length} pending
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Enforcement Strategy
          </div>
          <div className="text-base font-heading font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Dual-Level Lock Active</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-gray-400">
            Database trigger + Server-side Razorpay verification
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden space-y-4 p-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-gray-800/80 rounded-2xl">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-white dark:bg-[#0E1324] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900'
              }`}
            >
              Switch Requests ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-[#0E1324] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900'
              }`}
            >
              Completed History ({history.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, email, exam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF] text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Table Content */}
        {activeTab === 'requests' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Curriculum Transition</th>
                  <th className="pb-3">Fee / Currency</th>
                  <th className="pb-3">Order / Razorpay ID</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading exam switch requests...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No exam switch requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/40">
                      <td className="py-3.5 font-semibold text-slate-900 dark:text-white">
                        <div>
                          {req.profiles?.first_name} {req.profiles?.last_name}
                        </div>
                        <div className="text-[11px] text-slate-400">{req.profiles?.email}</div>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="text-slate-500 dark:text-gray-400">
                            {req.from_exam?.name || 'Previous'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#6D5BFF]" />
                          <span className="text-slate-900 dark:text-white">
                            {req.to_exam?.name || 'Target'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        ${req.amount || 2.0} {req.currency || 'USD'}
                      </td>
                      <td className="py-3.5 font-mono text-[11px] text-slate-500 dark:text-gray-400">
                        <div>{req.order_id || 'N/A'}</div>
                        {req.payment_id && (
                          <div className="text-[10px] text-emerald-500 font-semibold">{req.payment_id}</div>
                        )}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            req.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : req.status === 'failed'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-400 text-[11px]">
                        {new Date(req.created_at).toLocaleDateString()} {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Curriculum Transition</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Payment Reference</th>
                  <th className="pb-3">Switched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading switch audit history...
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No switch history recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((hist) => (
                    <tr key={hist.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/40">
                      <td className="py-3.5 font-semibold text-slate-900 dark:text-white">
                        <div>
                          {hist.profiles?.first_name} {hist.profiles?.last_name}
                        </div>
                        <div className="text-[11px] text-slate-400">{hist.profiles?.email}</div>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="text-slate-500 dark:text-gray-400">
                            {hist.from_exam?.name || 'Previous'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-slate-900 dark:text-white font-extrabold">
                            {hist.to_exam?.name || 'Target'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 font-bold text-emerald-500">
                        ${hist.amount || 2.0} {hist.currency || 'USD'}
                      </td>
                      <td className="py-3.5 font-mono text-[11px] text-slate-500 dark:text-gray-400">
                        {hist.payment_reference || 'N/A'}
                      </td>
                      <td className="py-3.5 text-slate-400 text-[11px]">
                        {new Date(hist.switched_at).toLocaleDateString()} {new Date(hist.switched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
