'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Cpu,
  RefreshCw,
  Search,
  Plus,
  Play,
  RotateCcw,
  XCircle,
  Eye,
  CheckCircle2,
  AlertCircle,
  ListTodo,
  Clock,
  Sparkles,
  Filter,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

export default function AdminAIJobsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, queued: 0, running: 0, completed: 0, failed: 0 });

  // Trigger New Generation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [assetType, setAssetType] = useState('mcq');
  const [batchSize, setBatchSize] = useState(10);
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('gemini-3.5-flash');
  const [priority, setPriority] = useState('Normal');

  const [existingContentCount, setExistingContentCount] = useState<number | null>(null);
  const [checkingContent, setCheckingContent] = useState(false);
  const [submittingJob, setSubmittingJob] = useState(false);

  // Load Jobs
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/ai-jobs?status=${statusFilter}&job_type=${jobTypeFilter}&search=${encodeURIComponent(searchQuery)}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to fetch AI jobs');

        setJobs(json.jobs || []);
        setStats(json.stats || { total: 0, queued: 0, running: 0, completed: 0, failed: 0 });
      } catch (err: any) {
        console.error('Error fetching AI jobs:', err);
        setError(err.message || 'Failed to retrieve AI jobs registry.');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();

    // Auto refresh every 5 seconds if running jobs exist
    const interval = setInterval(() => {
      fetchJobs();
    }, 6000);

    return () => clearInterval(interval);
  }, [refreshKey, statusFilter, jobTypeFilter, searchQuery]);

  // Load Exams for Trigger Modal
  useEffect(() => {
    if (isModalOpen && exams.length === 0) {
      const loadExams = async () => {
        try {
          const supabase = getSupabaseClient();
          const { data } = await supabase.from('exams').select('id, name').order('name');
          setExams(data || []);
        } catch (e) {
          console.error(e);
        }
      };
      loadExams();
    }
  }, [isModalOpen, exams.length]);

  // Load Subjects when Exam changes
  useEffect(() => {
    if (selectedExamId) {
      const loadSubjects = async () => {
        try {
          const supabase = getSupabaseClient();
          const { data } = await supabase.from('exam_subjects').select('id, name').eq('exam_id', selectedExamId).order('name');
          setSubjects(data || []);
          setSelectedSubjectId('');
          setTopics([]);
          setSelectedTopicId('');
          setExistingContentCount(null);
        } catch (e) {
          console.error(e);
        }
      };
      loadSubjects();
    } else {
      setSubjects([]);
      setSelectedSubjectId('');
    }
  }, [selectedExamId]);

  // Load Topics when Subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      const loadTopics = async () => {
        try {
          const supabase = getSupabaseClient();
          const { data } = await supabase.from('exam_topics').select('id, name').eq('subject_id', selectedSubjectId).order('name');
          setTopics(data || []);
          setSelectedTopicId('');
          setExistingContentCount(null);
        } catch (e) {
          console.error(e);
        }
      };
      loadTopics();
    } else {
      setTopics([]);
      setSelectedTopicId('');
    }
  }, [selectedSubjectId]);

  // Check Existing Content
  const handleCheckExisting = async () => {
    if (!selectedTopicId) return;
    setCheckingContent(true);
    try {
      const res = await fetch('/api/admin/ai-jobs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: selectedTopicId,
          asset_type: assetType,
          mode: 'check_only',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setExistingContentCount(json.existing_count);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingContent(false);
    }
  };

  // Submit New Generation Job
  const handleTriggerGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingJob(true);
    try {
      const res = await fetch('/api/admin/ai-jobs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_type: assetType,
          exam_id: selectedExamId,
          subject_id: selectedSubjectId,
          topic_id: selectedTopicId,
          batch_size: batchSize,
          priority,
          provider,
          model,
          mode: 'check_and_generate',
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to submit generation request');

      setIsModalOpen(false);
      setRefreshKey((prev) => prev + 1);
      alert(`AI Job #${json.job_id} launched successfully! Status: ${json.status}`);
    } catch (err: any) {
      alert(`Error triggering generation: ${err.message}`);
    } finally {
      setSubmittingJob(false);
    }
  };

  // Action: Retry Job
  const handleRetryJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/ai-jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Retry failed');
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      alert(`Failed to retry job: ${err.message}`);
    }
  };

  // Action: Cancel Job
  const handleCancelJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/ai-jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Cancel failed');
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      alert(`Failed to cancel job: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Cpu className="w-7 h-7 text-[#6D5BFF]" />
            AI Jobs Management Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time control tower for canonical background AI generation jobs, provider orchestration, and retries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshKey((p) => p + 1)}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-2 text-xs font-semibold"
            title="Refresh Jobs"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <span>Sync</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-[#6D5BFF] hover:bg-[#5b4aee] text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New AI Generation Request</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Jobs</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{stats.total}</p>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/20 p-4 rounded-xl">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>Queued</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{stats.queued}</p>
        </div>

        <div className="bg-slate-900/80 border border-blue-500/20 p-4 rounded-xl">
          <div className="flex items-center justify-between text-blue-400 text-xs font-semibold">
            <span>Running</span>
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-2">{stats.running}</p>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 p-4 rounded-xl">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{stats.completed}</p>
        </div>

        <div className="bg-slate-900/80 border border-rose-500/20 p-4 rounded-xl">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>Failed</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-2">{stats.failed}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Job ID, Type, Error, or Exam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="queued">Queued (Pending)</option>
            <option value="running">Running (Processing)</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={jobTypeFilter}
            onChange={(e) => setJobTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Job Types</option>
            <option value="mcq_generation">MCQ Generation</option>
            <option value="notes_generation">Notes Generation</option>
            <option value="flashcard_generation">Flashcard Generation</option>
            <option value="revision_sheet_generation">Revision Sheet Generation</option>
            <option value="ai_tutor_generation">AI Tutor Generation</option>
            <option value="study_plan">Study Plan Generation</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[300px]">
            <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#6D5BFF]">
              Synchronizing AI Jobs Registry...
            </span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Cpu className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-bold text-white">No AI Jobs Found</p>
            <p className="text-xs text-slate-500 mt-1">No AI generation jobs match your current query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Job ID</th>
                  <th className="py-3 px-4">Job / Asset Type</th>
                  <th className="py-3 px-4">Exam / Topic</th>
                  <th className="py-3 px-4">Provider / Model</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {jobs.map((job) => {
                  const status = job.canonical_status;

                  return (
                    <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-indigo-400 font-bold">
                        <Link href={`/admin/ai-jobs/${job.id}`} className="hover:underline">
                          {job.id.substring(0, 8)}...
                        </Link>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">{job.job_type}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                          {job.asset_type}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-200 block">{job.exam_name}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[150px] block">
                          {job.topic_name}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-indigo-300 block">{job.provider}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{job.model}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            job.priority === 'High'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {job.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : status === 'RUNNING'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                              : status === 'QUEUED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : status === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {status === 'RUNNING' && <Loader2 className="w-3 h-3 animate-spin" />}
                          {status}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-400">
                        {job.attempts} / 5
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          href={`/admin/ai-jobs/${job.id}`}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 inline-block"
                          title="Inspect Job Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {(status === 'FAILED' || status === 'CANCELLED') && (
                          <button
                            onClick={() => handleRetryJob(job.id)}
                            className="p-1.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 inline-block border border-indigo-500/30"
                            title="Retry Job"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(status === 'QUEUED' || status === 'RUNNING') && (
                          <button
                            onClick={() => handleCancelJob(job.id)}
                            className="p-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 inline-block border border-rose-500/30"
                            title="Cancel Job"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trigger Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#6D5BFF]" />
                Trigger AI Generation Request
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleTriggerGeneration} className="space-y-4 text-xs">
              {/* Asset Type */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Asset Type</label>
                <select
                  value={assetType}
                  onChange={(e) => {
                    setAssetType(e.target.value);
                    setExistingContentCount(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="mcq">MCQ (Multiple Choice Questions)</option>
                  <option value="note">Notes & Summary Pearls</option>
                  <option value="flashcard">Flashcards</option>
                  <option value="revision_sheet">Revision Sheet</option>
                  <option value="ai_tutor">AI Tutor Lesson</option>
                </select>
              </div>

              {/* Hierarchy Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Exam</label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="">Select Exam</option>
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subject</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    required
                    disabled={!selectedExamId}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white disabled:opacity-50"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sb) => (
                      <option key={sb.id} value={sb.id}>{sb.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Topic</label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    required
                    disabled={!selectedSubjectId}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white disabled:opacity-50"
                  >
                    <option value="">Select Topic</option>
                    {topics.map((tp) => (
                      <option key={tp.id} value={tp.id}>{tp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Existing Content Check Button */}
              {selectedTopicId && (
                <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block font-semibold">Existing Content Check:</span>
                    {existingContentCount !== null ? (
                      <span className="text-indigo-400 font-bold">{existingContentCount} item(s) already exist in database</span>
                    ) : (
                      <span className="text-slate-500">Not checked yet</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckExisting}
                    disabled={checkingContent}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    {checkingContent ? 'Checking...' : 'Check Database'}
                  </button>
                </div>
              )}

              {/* Batch & Provider Config */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Batch Size</label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value={5}>5 items</option>
                    <option value={10}>10 items</option>
                    <option value={20}>20 items</option>
                    <option value={50}>50 items</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="gemini">Google Gemini AI</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="groq">Groq</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                    <option value="gemini-3.6-flash">gemini-3.6-flash</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingJob || !selectedTopicId}
                  className="px-5 py-2 rounded-lg bg-[#6D5BFF] hover:bg-[#5b4aee] text-white font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingJob && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Launch AI Generation Job</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
