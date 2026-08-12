'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Edit,
  Trash2,
  CheckSquare,
  XSquare,
  Copy,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileText,
  RefreshCw,
  Eye,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

export default function AdminMCQManager() {
  const [mcqs, setMcqs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, pendingReview: 0, approved: 0, draft: 0 });
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [aiFilter, setAiFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // New MCQ Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMcq, setNewMcq] = useState({
    question: '',
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
    correct_answer: 'a',
    explanation: '',
    rationale: '',
    clinical_pearl: '',
    difficulty: 'Intermediate',
    exam_id: '',
    subject_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    fetchMCQs();
  }, [search, examFilter, subjectFilter, difficultyFilter, statusFilter, aiFilter, page]);

  async function fetchExams() {
    try {
      const res = await fetch('/api/admin/exams');
      const data = await res.json();
      if (data.exams) setExams(data.exams);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchMCQs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        exam_id: examFilter,
        subject_id: subjectFilter,
        difficulty: difficultyFilter,
        status: statusFilter,
        ai_generated: aiFilter,
      });

      const res = await fetch(`/api/admin/mcqs?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setMcqs(data.mcqs || []);
        setStats(data.stats || {});
        setPagination(data.pagination || { total: 0, totalPages: 1 });
        setDuplicates(data.duplicates || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === mcqs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(mcqs.map((m) => m.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkAction = async (targetStatus: string) => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const res = await fetch('/api/admin/mcqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_update',
          ids: selectedIds,
          target_status: targetStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedIds([]);
        fetchMCQs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleCreateMCQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcq.question || !newMcq.exam_id) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/mcqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMcq),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewMcq({
          question: '',
          options: [
            { id: 'a', text: '' },
            { id: 'b', text: '' },
            { id: 'c', text: '' },
            { id: 'd', text: '' },
          ],
          correct_answer: 'a',
          explanation: '',
          rationale: '',
          clinical_pearl: '',
          difficulty: 'Intermediate',
          exam_id: '',
          subject_id: '',
        });
        fetchMCQs();
      } else {
        alert(data.error || 'Failed to create MCQ');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#6D5BFF]" />
            <span>MCQ Item Bank & Vignettes</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Real Supabase item bank. Medical vignette stems, distractor options, rationale, and review lifecycle.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer hover:opacity-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create New MCQ Item</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total MCQs</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total || 0}</p>
        </div>
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Pending Review
          </span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pendingReview || 0}</p>
        </div>
        <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Approved
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.approved || 0}</p>
        </div>
        <div className="p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Drafts / Generating
          </span>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {(stats.draft || 0) + (stats.generating || 0)}
          </p>
        </div>
      </div>

      {/* Duplicate Warning Panel */}
      {duplicates.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>
              <strong>Duplicate Question Stems Detected:</strong> {duplicates.length} potential duplicate pairs in this view.
            </span>
          </div>
          <span className="font-bold underline cursor-pointer">Review Duplicates</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stems, option text, or ID..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
            />
          </div>

          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold"
          >
            <option value="all">All Exams</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold"
          >
            <option value="all">All Difficulties</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>

          <button
            onClick={fetchMCQs}
            className="p-2 rounded-2xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-gray-200 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-gray-800 text-xs font-bold text-slate-700 dark:text-gray-300">
            <span>{selectedIds.length} items selected</span>
            <button
              onClick={() => handleBulkAction('approved')}
              disabled={bulkProcessing}
              className="px-3 py-1 rounded-xl bg-emerald-500 text-white font-extrabold hover:bg-emerald-600"
            >
              Approve Selected
            </button>
            <button
              onClick={() => handleBulkAction('rejected')}
              disabled={bulkProcessing}
              className="px-3 py-1 rounded-xl bg-rose-500 text-white font-extrabold hover:bg-rose-600"
            >
              Reject Selected
            </button>
            <button
              onClick={() => handleBulkAction('archived')}
              disabled={bulkProcessing}
              className="px-3 py-1 rounded-xl bg-slate-500 text-white font-extrabold hover:bg-slate-600"
            >
              Archive Selected
            </button>
          </div>
        )}
      </div>

      {/* MCQs Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-gray-400">
            Loading MCQ Item Bank...
          </div>
        ) : mcqs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-gray-400 space-y-3">
            <HelpCircle className="w-10 h-10 text-slate-300 dark:text-gray-600 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-gray-200">No MCQ items found in database</p>
            <p className="text-[11px] text-slate-400">
              Create your first question item or generate one with the AI engine.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === mcqs.length && mcqs.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-4">Clinical Vignette / Question Stem</th>
                  <th className="p-4">Exam & Subject</th>
                  <th className="p-4">Difficulty</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">AI / Source</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                {mcqs.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(m.id)}
                        onChange={() => toggleSelectOne(m.id)}
                      />
                    </td>
                    <td className="p-4 max-w-sm">
                      <p className="font-bold text-slate-900 dark:text-white line-clamp-2">{m.question}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">ID: {m.id.substring(0, 8)}...</p>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-gray-300">
                      <p className="font-bold">{m.exams?.name || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400">{m.exam_subjects?.name || 'Unassigned'}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-500">
                        {m.difficulty}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          m.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : m.status === 'pending_review'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-slate-500/10 text-slate-500'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">
                      {m.ai_generated ? (
                        <span className="flex items-center gap-1 text-purple-500 font-bold text-[10px]">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </span>
                      ) : (
                        <span className="text-[10px]">Manual</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/mcqs/${m.id}`}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-[#6D5BFF]/10 text-[#6D5BFF] hover:bg-[#6D5BFF]/20"
                      >
                        Edit / Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 bg-slate-50 dark:bg-gray-900/60 border-t border-slate-200 dark:border-gray-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing Page {page} of {pagination.totalPages} ({pagination.total} total items)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-gray-800 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-gray-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal to Create MCQ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Create New MCQ Item</h2>

            <form onSubmit={handleCreateMCQ} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Target Exam *</label>
                <select
                  required
                  value={newMcq.exam_id}
                  onChange={(e) => setNewMcq({ ...newMcq, exam_id: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                >
                  <option value="">Select Exam</option>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Question Vignette Stem *</label>
                <textarea
                  required
                  rows={3}
                  value={newMcq.question}
                  onChange={(e) => setNewMcq({ ...newMcq, question: e.target.value })}
                  placeholder="Enter high-yield medical stem / question statement..."
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Options *</label>
                {newMcq.options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase text-slate-500 w-4">{opt.id}.</span>
                    <input
                      type="text"
                      required
                      value={opt.text}
                      onChange={(e) => {
                        const updated = [...newMcq.options];
                        updated[idx].text = e.target.value;
                        setNewMcq({ ...newMcq, options: updated });
                      }}
                      placeholder={`Option ${opt.id.toUpperCase()}`}
                      className="w-full p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                    />
                    <input
                      type="radio"
                      name="correct_option"
                      checked={newMcq.correct_answer === opt.id}
                      onChange={() => setNewMcq({ ...newMcq, correct_answer: opt.id })}
                    />
                  </div>
                ))}
                <p className="text-[10px] text-slate-400">Select the radio button next to the correct answer.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">High-Yield Rationale / Explanation</label>
                <textarea
                  rows={2}
                  value={newMcq.explanation}
                  onChange={(e) => setNewMcq({ ...newMcq, explanation: e.target.value })}
                  placeholder="Explain why the correct answer is right and distractors are wrong..."
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-200 dark:bg-gray-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-2xl bg-[#6D5BFF] text-white text-xs font-bold"
                >
                  {submitting ? 'Saving...' : 'Save MCQ Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
