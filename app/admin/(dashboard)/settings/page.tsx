'use client';

import React from 'react';
import { Settings, ShieldCheck, Sliders, Lock } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#6D5BFF]" />
            <span>Platform Settings & Controls</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Global feature flags, maintenance mode toggle, and operational configurations.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Maintenance Mode</div>
              <div className="text-[10px] text-slate-500">Temporarily restrict public learner access for scheduled core updates.</div>
            </div>
            <input type="checkbox" className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]" />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Strict Zero-Trust API Enforcement</div>
              <div className="text-[10px] text-slate-500">Require server-side token validation for all API endpoints.</div>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]" />
          </div>
        </div>
      </div>
    </div>
  );
}
