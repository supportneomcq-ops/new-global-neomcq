'use client';

import React, { useState, useEffect } from 'react';
import {
  Loader2,
  Cpu,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

export default function AdminGenerationQueuePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    const loadQueueJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseClient();
        const { data, error: fetchErr } = await supabase
          .from('ai_generation_jobs')
          .select('*')
          .in('status', ['pending', 'processing'])
          .order('created_at', { ascending: false });

        if (fetchErr) throw fetchErr;
        setJobs(data || []);
      } catch (err: any) {
        console.error('Error fetching generation queue:', err);
        setError(err.message || 'Failed to retrieve active generation queue.');
      } finally {
        setLoading(false);
      }
    };

    loadQueueJobs();
  }, [refreshKey]);

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
    return (
      job.job_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.id.includes(searchQuery)
    );
  });

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#6D5BFF]">
          Retrieving Active Queues...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#00D4FF]" />
            <span>AI Generation Queue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Observe active background inference flows currently being processed by LLM nodes.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#090d1a] border border-slate-800/60 p-4 rounded-xl">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-400">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Job ID or Type..."
            className="bg-transparent focus:outline-none w-full text-slate-200 placeholder-slate-500"
          />
        </div>

        <div className="text-xs font-bold text-slate-400 flex items-center justify-end">
          Queue Registry: {filteredJobs.length} Active Jobs
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
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-slate-300">
                    {job.attempts} / {job.max_attempts || 3}
                  </td>
                  <td className="py-3 text-slate-400 font-medium">
                    {new Date(job.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right pr-2">
                    <button
                      onClick={() => handleCancelJob(job.id)}
                      className="px-2.5 py-1.5 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-[10px] font-black border border-rose-500/20 transition-all"
                    >
                      Cancel Job
                    </button>
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 text-xs font-semibold">
                    No active background generation jobs in the queue.
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
