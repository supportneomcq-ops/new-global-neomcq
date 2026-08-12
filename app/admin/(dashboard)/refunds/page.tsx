'use client';

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
} from 'lucide-react';

export default function AdminRefundsPage() {
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Duplicate accidental purchase');
  const [errorMsg, setErrorMsg] = useState('');

  const loadRefunds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/refunds');
      const json = await res.json();
      if (json.success) {
        setRefunds(json.refunds || []);
      }
    } catch (err) {
      console.error('Error loading refunds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, []);

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentId.trim() || !reason.trim()) return;

    setProcessing(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: paymentId.trim(),
          amount: parseFloat(amount) || undefined,
          reason,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowModal(false);
        setPaymentId('');
        setAmount('');
        loadRefunds();
      } else {
        setErrorMsg(json.error || 'Refund execution failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server connection error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-[#6D5BFF]" />
            <span>Financial Refunds & Dispute Processing</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Process payment refunds, enforce role permissions (SUPER_ADMIN / FINANCE_ADMIN), and maintain audit trails.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setShowModal(true);
          }}
          className="p-2.5 px-4 rounded-2xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white transition-colors flex items-center gap-2 text-xs font-bold shadow-lg shadow-[#6D5BFF]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Process Refund</span>
        </button>
      </div>

      {/* Refunds Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Refund ID</th>
                <th className="p-4">Payment ID</th>
                <th className="p-4">Customer Email</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Requested By</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Processed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
                    <span>Loading refund histories...</span>
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    No refunds issued yet.
                  </td>
                </tr>
              ) : (
                refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                      {r.razorpay_refund_id || r.id}
                    </td>
                    <td className="p-4 font-mono text-slate-400 text-[11px]">
                      {r.payment_id}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {r.user_email || 'customer@neomcq.com'}
                    </td>
                    <td className="p-4 font-black text-rose-500">
                      ₹{r.amount}
                    </td>
                    <td className="p-4 text-slate-400">
                      {r.reason}
                    </td>
                    <td className="p-4 font-bold text-indigo-400 uppercase text-[10px]">
                      {r.requested_by}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-400 text-[11px]">
                      {new Date(r.processed_at || r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Refund Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Process Payment Refund</h2>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleProcessRefund} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Payment Record ID / Razorpay Payment ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. pay_182937 or pay_rzp_102"
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Refund Amount (₹) (Leave empty for full refund)</label>
                <input
                  type="number"
                  placeholder="Full amount default"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Reason for Refund</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Reason for financial refund..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-800 font-bold hover:bg-slate-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold"
                >
                  {processing ? 'Processing Refund...' : 'Authorize & Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
