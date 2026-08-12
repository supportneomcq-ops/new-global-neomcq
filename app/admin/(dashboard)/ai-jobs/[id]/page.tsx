'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Cpu,
  RotateCcw,
  XCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  Terminal,
  FileCode,
  ShieldCheck,
  Tag,
  User,
} from 'lucide-react';

export default function AdminAIJobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchJobDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-jobs/${jobId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch job details');

      setJob(json.job);
    } catch (err: any) {
      console.error('Error loading AI job details:', err);
      setError(err.message || 'Job not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) fetchJobDetails();
  }, [jobId]);

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Retry failed');

      alert('Job retry queued successfully');
      fetchJobDetails();
    } catch (err: any) {
      alert(`Error retrying job: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Cancel failed');

      alert('Job cancelled');
      fetchJobDetails();
    } catch (err: any) {
      alert(`Error cancelling job: ${err.message}`);
    }
    setActionLoading(false);
  };

  const handleCopyJSON = () => {
    if (!job) return;
    navigator.clipboard.writeText(JSON.stringify(job, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#6D5BFF]">
          Fetching AI Job Metadata...
        </span>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-8 text-center text-rose-400 space-y-4">
        <AlertCircle className="w-12 h-12 mx-auto" />
        <p className="text-lg font-bold">{error || 'Job not found'}</p>
        <Link
          href="/admin/ai-jobs"
          className="px-4 py-2 bg-slate-800 text-white rounded-lg inline-flex items-center gap-2 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to AI Jobs List</span>
        </Link>
      </div>
    );
  }

  const status = job.canonical_status;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/ai-jobs"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2 font-mono">
              <Cpu className="w-6 h-6 text-[#6D5BFF]" />
              Job #{job.id}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Created on {new Date(job.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyJSON}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            <span>{copied ? 'Copied JSON!' : 'Copy Raw JSON'}</span>
          </button>

          {(status === 'FAILED' || status === 'CANCELLED') && (
            <button
              onClick={handleRetry}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>Retry Job</span>
            </button>
          )}

          {(status === 'QUEUED' || status === 'RUNNING') && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              <span>Cancel Job</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Card: Core Meta */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#6D5BFF]" />
            Job Properties
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">Status</span>
              <span
                className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                  status === 'COMPLETED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : status === 'RUNNING'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : status === 'FAILED'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {status}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">Job Type</span>
              <span className="font-bold text-white">{job.job_type}</span>
            </div>

            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">Asset Type</span>
              <span className="font-bold text-indigo-400 uppercase">{job.asset_type}</span>
            </div>

            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">Priority</span>
              <span className="font-bold text-amber-400">{job.priority}</span>
            </div>

            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">Attempts</span>
              <span className="font-mono font-bold text-slate-200">{job.attempts} / 5</span>
            </div>

            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">Duration</span>
              <span className="font-mono font-bold text-slate-200">
                {job.duration_ms ? `${job.duration_ms} ms` : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Initiator</span>
              <span className="font-medium text-slate-300">{job.input_params?.initiated_by || 'System Worker'}</span>
            </div>
          </div>
        </div>

        {/* Middle Card: Canonical Resolution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Canonical Context
          </h2>

          <div className="space-y-3 text-xs">
            <div className="border-b border-slate-800/60 pb-2">
              <span className="text-slate-500 block text-[10px] uppercase">Exam</span>
              <span className="font-bold text-white text-sm">{job.exam_name}</span>
            </div>

            <div className="border-b border-slate-800/60 pb-2">
              <span className="text-slate-500 block text-[10px] uppercase">Subject</span>
              <span className="font-semibold text-slate-200">{job.subject_name}</span>
            </div>

            <div className="border-b border-slate-800/60 pb-2">
              <span className="text-slate-500 block text-[10px] uppercase">Topic</span>
              <span className="font-semibold text-slate-200">{job.topic_name}</span>
            </div>

            <div className="border-b border-slate-800/60 pb-2">
              <span className="text-slate-500 block text-[10px] uppercase">Provider & Model</span>
              <span className="font-mono font-bold text-indigo-300">{job.provider} ({job.model})</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Prompt Engine Version</span>
              <span className="font-mono text-slate-300">{job.prompt_version}</span>
            </div>
          </div>
        </div>

        {/* Right Card: Security & Credentials Note */}
        <div className="bg-slate-900 border border-indigo-500/20 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Security & Compliance
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            All API calls are proxied through server-side environment credentials. API keys and authorization tokens are strictly sanitized and never returned or rendered on the client browser.
          </p>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Zero Client-Side Keys Exposed</span>
          </div>
        </div>
      </div>

      {/* Error Message if Failed */}
      {job.error_message && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Execution Failure Log
          </h3>
          <p className="font-mono text-xs text-rose-200 bg-slate-950 p-3 rounded-lg border border-rose-500/20 whitespace-pre-wrap">
            {job.error_message}
          </p>
        </div>
      )}

      {/* Result Output Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <FileCode className="w-4 h-4 text-indigo-400" />
          Job Result Payload
        </h2>

        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-[400px]">
          {JSON.stringify(job.result || {}, null, 2)}
        </pre>
      </div>

      {/* Audit Trail / History Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          Operational Audit Logs
        </h2>

        {job.logs?.length === 0 ? (
          <p className="text-xs text-slate-500">No previous retry or operational audit events recorded for this job.</p>
        ) : (
          <div className="space-y-2">
            {job.logs?.map((l: any) => (
              <div key={l.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-indigo-300 font-mono">{l.action}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{JSON.stringify(l.details)}</p>
                </div>
                <span className="text-[10px] text-slate-500">{new Date(l.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
