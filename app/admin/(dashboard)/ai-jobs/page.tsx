'use client';

import React, { useState, useEffect } from 'react';
import {
  Loader2,
  Cpu,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

export default function AdminAIJobsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobTypeFilter, setJobTypeFilter] = useState('all');

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseClient();
        const { data, error: fetchErr } = await supabase
          .from('ai_generation_jobs')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchErr) throw fetchErr;
        setJobs(data || []);
      } catch (err: any) {
        console.error('Error fetching AI jobs:', err);
        setError(err.message || 'Failed to retrieve AI jobs registry.');
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [refreshKey]);

  const handleRetryJob = async (jobId: string) => {
    try {
      const supabase = getSupabaseClient();
      const { error: patchErr } = await supabase
        .from('ai_generation_jobs')
        .update({ status: 'pending', attempts: 0, error_message: null })
        .eq('id', jobId);

      if (patchErr) throw patchErr;
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      alert(`Failed to retry job: ${err.message}`);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const supabase = getSupabaseClient();
      const { error: patchErr } = await supabase
        .from('ai_generation_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);

      if (patchErr) throw patchErr;
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      alert(`Failed to cancel job: ${err.message}`);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.job_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.error_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.id.includes(searchQuery);

    if (jobTypeFilter === 'all') return matchesSearch;
    return matchesSearch && job.status === jobTypeFilter;
  });

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#6D5BFF]">
          Synchronizing AI Registry...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#6D5BFF]" />
            <span>AI Job Generation Queue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Inspect raw LLM content generation pipelines, retry failures, and monitor durations.
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((prev) => prev + 1)}
          className="px-4 py-2 bg-slate-900 border border-slate-800 text-xs font-bold rounded-xl text-slate-300 hover:text-white flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#6D5BFF]" />
          <span>Sync Queue</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Filters Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#090d1a] border border-slate-800/60 p-4 rounded-xl">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-400">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by Job ID, Error or Type..."
            className="bg-transparent focus:outline-none w-full text-slate-200 placeholder-slate-500"
          />
        </div>

        <select
          value={jobTypeFilter}
          onChange={(e) => setJobTypeFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300 font-bold focus:outline-none"
        >
          <option value="all">All Execution Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <div className="text-xs font-bold text-slate-400 flex items-center justify-end">
          Active Registry: {filteredJobs.length} Pipeline Jobs
        </div>
      </div>

      {/* Data Table */}
      <div className="p-4 rounded-xl bg-[#090d1a] border border-slate-800/60 font-sans">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-black tracking-wider text-slate-500 uppercase">
                <th className="pb-3 pl-2">Job Reference</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Attempts</th>
                <th className="pb-3">Error Diagnosis</th>
                <th className="pb-3">Logged Date</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-xs">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="py-3 pl-2 font-mono text-[10px] text-slate-400">
                    {job.id.substring(0, 8)}...
                  </td>
                  <td className="py-3">
                    <div className="font-bold text-white">{job.job_type || 'Asset Sync'}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Model: {job.payload?.model || 'gemini-1.5-flash'}</div>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      job.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : job.status === 'processing'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-slate-300">
                    {job.attempts} / {job.max_attempts || 3}
                  </td>
                  <td className="py-3 max-w-[200px] truncate text-slate-400" title={job.error_message}>
                    {job.error_message || <span className="text-emerald-500 font-bold">None (Healthy)</span>}
                  </td>
                  <td className="py-3 text-slate-400 font-medium">
                    {new Date(job.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right pr-2">
                    <div className="flex justify-end gap-1.5">
                      {(job.status === 'failed' || job.status === 'cancelled') && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[10px] font-bold border border-emerald-500/20 transition-all"
                        >
                          Retry
                        </button>
                      )}
                      {(job.status === 'pending' || job.status === 'processing') && (
                        <button
                          onClick={() => handleCancelJob(job.id)}
                          className="px-2 py-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-[10px] font-bold border border-rose-500/20 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 text-xs font-semibold">
                    No matching queue jobs recorded in logs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
