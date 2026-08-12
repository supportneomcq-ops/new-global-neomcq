'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  StickyNote,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export default function AdminNoteManager() {
  const [notes, setNotes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, pendingReview: 0, approved: 0, handwrittenCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [exams, setExams] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    note_type: 'high_yield',
    exam_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [search, examFilter, typeFilter, statusFilter, page]);

  async function fetchExams() {
    try {
      const res = await fetch('/api/admin/exams');
      const data = await res.json();
      if (data.exams) setExams(data.exams);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchNotes() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        exam_id: examFilter,
        note_type: typeFilter,
        status: statusFilter,
      });

      const res = await fetch(`/api/admin/notes?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setNotes(data.notes || []);
        setStats(data.stats || {});
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title || !newNote.content || !newNote.exam_id) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewNote({ title: '', content: '', note_type: 'high_yield', exam_id: '' });
        fetchNotes();
      } else {
        alert(data.error || 'Failed to create note');
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
            <StickyNote className="w-6 h-6 text-[#6D5BFF]" />
            <span>High-Yield Notes & Topper Handwritten Sheets</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Manage comprehensive clinical notes, topper handwritten notebook-style summaries, and revision material.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer hover:opacity-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Study Note</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Notes</span>
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
        <div className="p-4 rounded-3xl bg-purple-500/10 border border-purple-500/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Topper Handwritten
          </span>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.handwrittenCount || 0}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search note title or content..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold"
          >
            <option value="all">All Exams</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold"
          >
            <option value="all">All Types</option>
            <option value="topper_handwritten">Topper Handwritten</option>
            <option value="high_yield">High-Yield Concept</option>
            <option value="clinical_pearl">Clinical Pearl</option>
            <option value="revision">Quick Revision</option>
          </select>

          <button
            onClick={fetchNotes}
            className="p-2 rounded-2xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-gray-200 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading Notes...</div>
        ) : notes.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3">
            <StickyNote className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-gray-200">No notes found</p>
            <p className="text-[11px] text-slate-400">Create study notes or topper handwritten sheets.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">Title</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Exam</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                {notes.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{n.title}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-500 uppercase">
                        {n.note_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-gray-300">{n.exams?.name || 'N/A'}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          n.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {n.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/notes/${n.id}`}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-[#6D5BFF]/10 text-[#6D5BFF] hover:bg-[#6D5BFF]/20"
                      >
                        View & Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal to Create Note */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl max-w-xl w-full p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Create New Study Note</h2>

            <form onSubmit={handleCreateNote} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Exam *</label>
                <select
                  required
                  value={newNote.exam_id}
                  onChange={(e) => setNewNote({ ...newNote, exam_id: e.target.value })}
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
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Note Type</label>
                <select
                  value={newNote.note_type}
                  onChange={(e) => setNewNote({ ...newNote, note_type: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                >
                  <option value="high_yield">High-Yield Concept</option>
                  <option value="topper_handwritten">Topper Handwritten Sheet</option>
                  <option value="clinical_pearl">Clinical Pearl</option>
                  <option value="revision">Quick Revision</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Title *</label>
                <input
                  type="text"
                  required
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  placeholder="e.g. Myocardial Infarction High-Yield Summary"
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Content (Markdown) *</label>
                <textarea
                  required
                  rows={6}
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Enter detailed note content..."
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
                  {submitting ? 'Creating...' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
