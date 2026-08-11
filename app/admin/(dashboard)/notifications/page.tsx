'use client';

import React from 'react';
import { Bell, Plus, Send } from 'lucide-react';

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#6D5BFF]" />
            <span>Broadcast Notifications & Alerts</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Send platform announcements, maintenance windows, exam countdown reminders, and updates.
          </p>
        </div>

        <button className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer hover:opacity-95">
          <Send className="w-4 h-4" />
          <span>New System Broadcast</span>
        </button>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
        <div className="font-bold text-sm">Recent Broadcasts</div>
        <div className="divide-y divide-slate-200 dark:divide-gray-800 text-xs">
          <div className="py-3 flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">USMLE Step 1 2026 Question Bank Update</div>
              <div className="text-[10px] text-slate-400">Sent to 4,200 USMLE aspirants • Delivered 100%</div>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Sent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
