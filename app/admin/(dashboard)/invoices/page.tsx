'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  Download,
} from 'lucide-react';

export default function AdminInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/invoices?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.invoices || []);
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#6D5BFF]" />
            <span>Tax Invoices & Billing Documents</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Generated payment tax invoices, user billing statements, and proof of purchases.
          </p>
        </div>

        <button
          onClick={loadInvoices}
          className="p-2.5 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Toolbar Search */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search Invoice ID, Email, Plan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent focus:outline-none w-full text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400"
        />
      </div>

      {/* Invoices Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Invoice ID</th>
                <th className="p-4">Customer Email</th>
                <th className="p-4">Payment ID</th>
                <th className="p-4">Plan Name</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Issued At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
                    <span>Loading tax invoices...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    No tax invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 font-mono font-black text-slate-900 dark:text-white">
                      {inv.id}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {inv.user_email || 'student@neomcq.com'}
                    </td>
                    <td className="p-4 font-mono text-slate-400 text-[11px]">
                      {inv.payment_id}
                    </td>
                    <td className="p-4 text-slate-400 font-bold">
                      {inv.plan_name}
                    </td>
                    <td className="p-4 font-black text-emerald-500">
                      ₹{inv.amount}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {new Date(inv.issued_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-[#6D5BFF] hover:text-white transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-4">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">NeoMCQ Tax Invoice</div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">{selectedInvoice.id}</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                {selectedInvoice.status}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                <span className="text-slate-400 font-medium">Billed To:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedInvoice.user_email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                <span className="text-slate-400 font-medium">Plan Item:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedInvoice.plan_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                <span className="text-slate-400 font-medium">Payment ID:</span>
                <span className="font-mono text-slate-400">{selectedInvoice.payment_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                <span className="text-slate-400 font-medium">Issued On:</span>
                <span className="text-slate-900 dark:text-white">{new Date(selectedInvoice.issued_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <span className="font-bold text-slate-900 dark:text-white">Total Amount Paid:</span>
                <span className="font-black text-emerald-500">₹{selectedInvoice.amount} {selectedInvoice.currency}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
