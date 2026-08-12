'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Loader2,
  ListTodo,
  RefreshCw,
  Clock,
  XCircle,
  Eye,
  Sliders,
  AlertCircle,
  Cpu,
} from 'lucide-react';

export default function AdminGenerationQueuePage() {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-jobs/queue');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch generation queue');

      setQueue(json.queue || []);
    } catch (err: any) {
      console.error('Error fetching queue:', err);
      setError(err.message || 'Failed to retrieve active generation queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const handleCancel = async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/ai-jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to cancel job');
      setRefreshKey((p) => p + 1);
    } catch (err: any) {
      alert(`Error cancelling job: ${err.message}`);
    }
  };

  const handleReprioritize = async (jobId: string, priority: string) => {
    try {
      const res = await fetch(`/api/admin/ai-jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reprioritize', priority }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update priority');
      setRefreshKey((p) => p + 1);
    } catch (err: any) {
      alert(`Error updating priority: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ListTodo className="w-7 h-7 text-[#6D5BFF]" />
            AI Generation Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time buffer of QUEUED and RUNNING content generation tasks in worker memory.
          </p>
        </div>

        <button
          onClick={() => setRefreshKey((p) => p + 1)}
          className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          <span>Sync Queue</span>
        </button>
      </div>

      {/* Main Queue Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[300px]">
            <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#6D5BFF]">
              Inspecting Active Generation Queue...
            </span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2Icon className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-base font-bold text-white">Generation Queue Clean</p>
            <p className="text-xs text-slate-500 mt-1">
              There are no pending or processing AI generation jobs currently in queue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Job ID</th>
                  <th className="py-3 px-4">Asset Type</th>
                  <th className="py-3 px-4">Exam / Topic</th>
                  <th className="py-3 px-4">Provider / Model</th>
                  <th className="py-3 px-4">Waiting Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {queue.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <select
                        value={job.priority}
                        onChange={(e) => handleReprioritize(job.id, e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded text-[11px] font-bold text-amber-400 px-2 py-1"
                      >
                        <option value="High">High</option>
                        <option value="Normal">Normal</option>
                        <option value="Low">Low</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
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

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {job.provider} ({job.model})
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {job.waiting_mins} min(s)
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          job.canonical_status === 'RUNNING'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {job.canonical_status === 'RUNNING' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {job.canonical_status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        href={`/admin/ai-jobs/${job.id}`}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 inline-block"
                        title="Inspect Job"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={() => handleCancel(job.id)}
                        className="p-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 inline-block border border-rose-500/30"
                        title="Cancel Job"
                      >
                        <XCircle className="w-3.5 h-3.5" />
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

function CheckCircle2Icon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
