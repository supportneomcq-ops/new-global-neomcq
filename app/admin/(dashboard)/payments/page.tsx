'use client';

import React from 'react';
import { BadgeDollarSign, TrendingUp, CreditCard } from 'lucide-react';

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <BadgeDollarSign className="w-6 h-6 text-[#6D5BFF]" />
            <span>Payments & Revenue Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Razorpay transaction histories, webhook status, refunds, and financial reporting.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-bold text-sm">Recent Transactions</span>
          <span className="text-xs text-emerald-500 font-bold">Razorpay Live Verified</span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-gray-800 text-xs">
          <div className="py-3 flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Order #pay_182937 (Annual Pro Pass)</div>
              <div className="text-[10px] text-slate-400">Dr. Sarah Connor • Razorpay Card</div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-slate-900 dark:text-white">$149.00</div>
              <div className="text-[10px] text-emerald-500 font-bold">Captured</div>
            </div>
          </div>

          <div className="py-3 flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Order #pay_182938 (Monthly Pass)</div>
              <div className="text-[10px] text-slate-400">Rahul Sharma • UPI Direct</div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-slate-900 dark:text-white">₹1,499.00</div>
              <div className="text-[10px] text-emerald-500 font-bold">Captured</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
