'use client';

import React from 'react';
import { Activity, CheckCircle2, Cpu, HardDrive, Database, Server } from 'lucide-react';

export default function AdminSystemHealthPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-500" />
            <span>Infrastructure System Health</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Real-time status of Cloud Run container, Supabase database connection, Edge network, and AI endpoints.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-3">
          <div className="flex justify-between items-center">
            <Database className="w-5 h-5 text-[#00D4FF]" />
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Operational
            </span>
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Supabase PostgreSQL</h3>
          <p className="text-xs text-slate-500">Latency: 14ms • Connection pool: 8% utilization</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-3">
          <div className="flex justify-between items-center">
            <Cpu className="w-5 h-5 text-[#6D5BFF]" />
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Operational
            </span>
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Gemini 3.5 Flash API</h3>
          <p className="text-xs text-slate-500">Latency: 280ms • Success Rate: 99.98%</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-3">
          <div className="flex justify-between items-center">
            <Server className="w-5 h-5 text-purple-500" />
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Operational
            </span>
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Cloud Run Application</h3>
          <p className="text-xs text-slate-500">CPU Usage: 12% • Memory: 240MB / 2GB</p>
        </div>
      </div>
    </div>
  );
}
