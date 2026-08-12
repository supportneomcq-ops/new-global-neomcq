'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        page: page.toString(),
        limit: '15',
      });
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPayments(json.payments || []);
        setPagination(json.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error('Error loading payments list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [search, statusFilter, page]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'captured':
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Captured</span>;
      case 'failed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20">Failed</span>;
      case 'refunded':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20">Refunded</span>;
      case 'authorized':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-500 border border-blue-500/20">Authorized</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status || 'Pending'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#6D5BFF]" />
            <span>Payments & Canonical Transactions</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Real payment records, Razorpay order bindings, verification states, and transaction histories.
          </p>
        </div>

        <button
          onClick={loadPayments}
          className="p-2.5 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Toolbar Filters */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 w-full sm:w-72 text-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Payment ID, Order ID, Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent focus:outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#6D5BFF]"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="captured">Captured</option>
            <option value="authorized">Authorized</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Payment ID / Order</th>
                <th className="p-4">User</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
                    <span>Loading payment transactions...</span>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    No payment records match the filter criteria.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white font-mono">
                        {p.razorpay_payment_id || p.id}
                      </div>
                      {p.razorpay_order_id && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Order: {p.razorpay_order_id}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{p.user_name || 'Learner'}</div>
                      <div className="text-[10px] text-slate-400">{p.user_email}</div>
                    </td>
                    <td className="p-4 uppercase font-extrabold text-[10px] text-indigo-400">
                      {p.provider || 'razorpay'}
                    </td>
                    <td className="p-4 font-black text-slate-900 dark:text-white">
                      {p.currency === 'USD' ? '$' : '₹'}{p.amount}
                    </td>
                    <td className="p-4 text-slate-400 font-bold">
                      {p.plan_name || p.plan_id || 'Pro Pass'}
                    </td>
                    <td className="p-4">{getStatusBadge(p.status)}</td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/payments/${p.id}`}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-[#6D5BFF] hover:text-white transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing Page <span className="font-bold text-slate-900 dark:text-white">{pagination.page}</span> of <span className="font-bold text-slate-900 dark:text-white">{pagination.totalPages}</span> ({pagination.total} total)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-800 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-gray-800 font-bold"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-800 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-gray-800 font-bold"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
