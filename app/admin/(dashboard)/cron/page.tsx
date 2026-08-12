'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Timer,
  RefreshCw,
  CheckCircle2,
  Play,
  ArrowRight,
  Clock,
  Activity,
} from 'lucide-react';

export default function AdminCronJobsPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);

  const loadCronJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cron');
      const json = await res.json();
      if (json.success) {
        setJobs(json.cronJobs || []);
      }
    } catch (err) {
      console.error('Failed to load cron jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCronJobs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Timer className="w-6 h-6 text-[#6D5BFF]" />
            <span>Automated Cron Jobs & Queue Workers</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Scheduled background workers for AI queue processing, payment retries, email dispatch, and system maintenance.
          </p>
        </div>

        <button
          onClick={loadCronJobs}
          className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Schedules</span>
        </button>
      </div>

      {/* Cron Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
            <span>Loading scheduled cron jobs...</span>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {job.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ACTIVE
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-gray-400">{job.purpose}</p>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800/80 space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Cron Schedule: <span className="text-amber-400 font-bold">{job.schedule}</span></span>
                    <span>Last Latency: {job.durationMs}ms</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 truncate">
                    {job.lastResult}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-gray-800/80 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 font-mono">
                  Next: {new Date(job.nextRun).toLocaleTimeString()}
                </div>

                <Link
                  href={`/admin/cron/${job.id}`}
                  className="text-xs font-bold text-[#6D5BFF] hover:underline flex items-center gap-1"
                >
                  <span>Inspect Job Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
