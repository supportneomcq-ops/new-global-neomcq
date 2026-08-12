'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Workflow,
  Key,
  Database,
  Terminal,
} from 'lucide-react';

export default function AdminRazorpayPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchRazorpayStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/razorpay');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching Razorpay operational status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRazorpayStatus();
  }, []);

  const status = data?.status || {
    connectionStatus: 'Checking...',
    keyIdMasked: 'Not Set',
    hasSecretKey: false,
    hasWebhookSecret: false,
    webhookStatus: 'Checking...',
    lastWebhookAt: null,
    webhookSuccessRate: '0%',
    apiHealth: 'Checking...',
  };

  const environment = data?.environment || 'Test / Sandbox';
  const recentEvents = data?.recentEvents || [];
  const failedPayments = data?.failedPayments || [];
  const failedWebhooks = data?.failedWebhooks || [];
  const reconciliation = data?.reconciliation || {
    totalAnalyzed: 0,
    matched: 0,
    pendingVerification: 0,
    failed: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#6D5BFF]" />
            <span>Razorpay Gateway Operations & Reconciliation</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Operational status, server payment verification, webhook event stream, and database reconciliation.
          </p>
        </div>

        <button
          onClick={fetchRazorpayStatus}
          className="p-2.5 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Test API Connection</span>
        </button>
      </div>

      {/* Operational Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
            <span>Connection Status</span>
            <Key className="w-4 h-4 text-[#6D5BFF]" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            {status.connectionStatus === 'Configured' ? (
              <span className="text-emerald-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" />
                <span>Configured</span>
              </span>
            ) : (
              <span className="text-amber-500 flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5" />
                <span>Not Configured</span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Key ID: {status.keyIdMasked}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
            <span>Environment</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {environment}
          </div>
          <div className="text-[10px] text-slate-400">
            Secrets masked & safely managed
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
            <span>Webhook Health</span>
            <Workflow className="w-4 h-4 text-[#6D5BFF]" />
          </div>
          <div className="text-2xl font-black text-emerald-500">
            {status.webhookStatus}
          </div>
          <div className="text-[10px] text-slate-400">
            Success Rate: {status.webhookSuccessRate}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
            <span>API Health</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-500">
            {status.apiHealth}
          </div>
          <div className="text-[10px] text-slate-400">
            Server verification operational
          </div>
        </div>
      </div>

      {/* Payment Reconciliation Tool */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-[#6D5BFF]" />
          <span>Payment Reconciliation (Razorpay Gateway vs. NeoMCQ Database)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
            <div className="text-slate-400 text-[10px] uppercase">Matched Transactions</div>
            <div className="text-xl font-black text-emerald-500 mt-1">{reconciliation.matched}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
            <div className="text-slate-400 text-[10px] uppercase">Pending Verification</div>
            <div className="text-xl font-black text-amber-500 mt-1">{reconciliation.pendingVerification}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
            <div className="text-slate-400 text-[10px] uppercase">Failed Payments</div>
            <div className="text-xl font-black text-rose-500 mt-1">{reconciliation.failed}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
            <div className="text-slate-400 text-[10px] uppercase">Discrepancies Flagged</div>
            <div className="text-xl font-black text-slate-400 mt-1">0</div>
          </div>
        </div>
      </div>

      {/* Payment Error Monitoring */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-rose-500" />
          <span>Recent Payment & Webhook Errors</span>
        </h3>

        {failedPayments.length === 0 && failedWebhooks.length === 0 ? (
          <div className="text-xs text-slate-400 font-bold py-4 text-center">
            No recent payment failures or webhook errors detected. System is running cleanly.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-gray-800 text-xs">
            {failedPayments.map((p: any) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-rose-500 font-mono">Payment Failed: {p.razorpay_payment_id || p.id}</div>
                  <div className="text-[10px] text-slate-400">{new Date(p.created_at).toLocaleString()} • User: {p.user_id}</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-500">
                  ₹{p.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
