'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  XCircle,
  Eye,
  ShieldAlert,
} from 'lucide-react';

export default function AdminFailedJobsPage() {
  const [loading, setLoading] = useState(true);
  const [failedJobs, setFailedJobs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFailedJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-jobs/failed');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch failed jobs');

      setFailedJobs(json.failed_jobs || []);
    } catch (err: any) {
      console.error('Error fetching failed jobs:', err);
      setError(err.message || 'Failed to retrieve failed jobs registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailedJobs();
  }, [refreshKey]);

  const handleRetryAll = async () => {
    if (failedJobs.length === 0) return;
    setActionLoading(true);
    try {
      const jobIds = failedJobs.map((j) => j.id);
      const res = await fetch('/api/admin/ai-jobs/failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry_all', job_ids: jobIds }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Batch retry failed');

      alert(`Batch retry triggered for ${jobIds.length} failed jobs!`);
      setRefreshKey((p) => p + 1);
    } catch (err: any) {
      alert(`Error in batch retry: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAll = async () => {
    if (failedJobs.length === 0) return;
    if (!confirm('Are you sure you want to cancel and clear all failed jobs?')) return;
    setActionLoading(true);
    try {
      const jobIds = failedJobs.map((j) => j.id);
      const res = await fetch('/api/admin/ai-jobs/failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_all', job_ids: jobIds }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Batch cancel failed');

      alert(`Cancelled ${jobIds.length} jobs.`);
      setRefreshKey((p) => p + 1);
    } catch (err: any) {
      alert(`Error cancelling jobs: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSingleRetry = async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/ai-jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', override: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Retry failed');

      setRefreshKey((p) => p + 1);
    } catch (err: any) {
      alert(`Error retrying job: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <AlertCircle className="w-7 h-7 text-rose-500" />
            Failed AI Jobs Station
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dead-letter queue for inspecting, debugging, and retrying failed generation jobs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshKey((p) => p + 1)}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <span>Sync</span>
          </button>

          {failedJobs.length > 0 && (
            <>
              <button
                onClick={handleRetryAll}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>Retry All ({failedJobs.length})</span>
              </button>

              <button
                onClick={handleCancelAll}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                <span>Dismiss All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Limit Banner */}
      <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex items-center gap-3 text-xs text-slate-300">
        <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
        <p>
          <strong className="text-white">Retry Governance Rule:</strong> Jobs exceeding 5 automatic attempts are automatically marked as dead-letter. You can override and force retry individual or batch jobs below.
        </p>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[300px]">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400">
              Scanning Dead-Letter Queue...
            </span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : failedJobs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckIcon className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-base font-bold text-white">No Failed Jobs</p>
            <p className="text-xs text-slate-500 mt-1">
              Zero failed jobs in dead-letter registry. All system workers operating cleanly.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Job ID</th>
                  <th className="py-3 px-4">Asset Type</th>
                  <th className="py-3 px-4">Exam / Topic</th>
                  <th className="py-3 px-4">Provider / Model</th>
                  <th className="py-3 px-4">Error Log</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Last Attempt</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {failedJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-rose-400">
                      <Link href={`/admin/ai-jobs/${job.id}`} className="hover:underline">
                        {job.id.substring(0, 8)}...
                      </Link>
                    </td>

                    <td className="py-3 px-4 font-semibold text-white uppercase">
                      {job.asset_type}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200 block">{job.exam_name}</span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                        {job.topic_name}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-indigo-300">
                      {job.provider} ({job.model})
                    </td>

                    <td className="py-3 px-4 max-w-[220px]">
                      <span className="text-rose-300 font-mono text-[11px] truncate block bg-rose-950/40 px-2 py-1 rounded border border-rose-500/20">
                        {job.error_message || 'Unknown provider execution failure'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-rose-400">
                      {job.attempts} / 5
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(job.last_attempt).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        href={`/admin/ai-jobs/${job.id}`}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 inline-block"
                        title="Inspect Job Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={() => handleSingleRetry(job.id)}
                        className="p-1.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 inline-block border border-indigo-500/30"
                        title="Override & Retry Job"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
