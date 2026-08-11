'use client';

import React, { useState, useEffect } from 'react';
import { BadgeDollarSign, CreditCard, ArrowUpRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

export default function AdminRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    successfulPayments: 0,
    activeSubscriptions: 0,
  });

  const loadRevenueData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      const { count: subCount } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const successful = (paymentsData || []).filter((p) => p.status === 'captured' || p.status === 'completed');
      const totalRev = successful.reduce((acc, p) => acc + (p.amount || 0), 0);

      setPayments(paymentsData || []);
      setStats({
        totalRevenue: totalRev,
        successfulPayments: successful.length,
        activeSubscriptions: subCount || 0,
      });
    } catch (err) {
      console.error('Revenue load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevenueData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <BadgeDollarSign className="w-6 h-6 text-[#6D5BFF]" />
            <span>Revenue & Razorpay Gateway Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Real-time tracking of payments, Razorpay capture logs, and active subscription volume.
          </p>
        </div>

        <button
          onClick={loadRevenueData}
          className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-200 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase">Total Revenue (INR)</div>
          <div className="text-3xl font-black mt-2 text-emerald-500">₹{stats.totalRevenue.toLocaleString()}</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase">Captured Payments</div>
          <div className="text-3xl font-black mt-2 text-slate-900 dark:text-white">{stats.successfulPayments}</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase">Active Subscriptions</div>
          <div className="text-3xl font-black mt-2 text-[#6D5BFF]">{stats.activeSubscriptions}</div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-gray-800 font-bold text-xs">
          Recent Payment Logs
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900 font-bold text-slate-600 dark:text-gray-300">
              <tr>
                <th className="p-4">Payment ID / Order</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No transactions recorded in DB yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {p.razorpay_payment_id || p.id}
                    </td>
                    <td className="p-4 font-bold text-emerald-500">₹{p.amount}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                        {p.status || 'Captured'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(p.created_at).toLocaleDateString()}</td>
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
