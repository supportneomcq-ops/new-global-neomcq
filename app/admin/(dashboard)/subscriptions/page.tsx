'use client';

import React from 'react';
import { CreditCard, ShieldCheck, Zap } from 'lucide-react';

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#6D5BFF]" />
            <span>Subscriptions & Memberships</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Monitor active tier plans, free trials, renewal dates, and manual entitlement grants.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-2">
          <div className="text-xs font-bold text-slate-400">Active Pro Members</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">1,482</div>
          <div className="text-[10px] text-emerald-500 font-bold">+18% this month</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-2">
          <div className="text-xs font-bold text-slate-400">Institutional Grants</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">14</div>
          <div className="text-[10px] text-indigo-500 font-bold">Medical Schools & Colleges</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-2">
          <div className="text-xs font-bold text-slate-400">Free Tier Learners</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">8,920</div>
          <div className="text-[10px] text-slate-400 font-bold">Conversion Rate: 16.6%</div>
        </div>
      </div>
    </div>
  );
}
