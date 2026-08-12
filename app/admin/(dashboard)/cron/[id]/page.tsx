'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Timer,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Clock,
  Activity,
  FileCode,
} from 'lucide-react';

export default function AdminCronJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);

  const loadJobDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cron/${id}`);
      const json = await res.json();
      if (json.success) {
        setJob(json.job);
      }
    } catch (err) {
      console.error('Failed to load cron job detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobDetail();
  }, [id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cron"
            className="p-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">
              <Timer className="w-6 h-6 text-[#6D5BFF]" />
              <span>Cron Job Execution Details: {id}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Detailed schedule specification, recent run telemetry logs, and configuration reference.
            </p>
          </div>
        </div>

        <button
          onClick={loadJobDetail}
          className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Details</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
          <span>Loading cron job execution logs...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Job Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Schedule</div>
              <div className="text-lg font-mono font-black text-amber-400">{job?.schedule}</div>
              <div className="text-[10px] text-slate-400 font-medium">Cron Spec</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Status</div>
              <div className="text-lg font-black text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> ACTIVE
              </div>
              <div className="text-[10px] text-slate-400 font-medium">0 Consecutive Failures</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Last Latency</div>
              <div className="text-xl font-mono font-black text-slate-900 dark:text-white">
                {job?.durationMs}ms
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Execution Time</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Next Scheduled Run</div>
              <div className="text-xs font-mono font-bold text-slate-300">
                {new Date(job?.nextRun).toLocaleTimeString()}
              </div>
              <div className="text-[10px] text-emerald-400 font-bold">Auto-Triggered</div>
            </div>
          </div>

          {/* Recent Executions Table */}
          <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-gray-800 font-bold text-sm text-slate-900 dark:text-white">
              Recent Execution Logs
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase">
                  <tr>
                    <th className="p-4">Execution Timestamp</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Result</th>
                    <th className="p-4">Log Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                  {(job?.recentRuns || []).map((run: any) => (
                    <tr key={run.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                      <td className="p-4 text-slate-300 font-mono text-[11px]">
                        {new Date(run.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-400">{run.durationMs}ms</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> SUCCESS
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 text-[11px] font-mono">{run.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
