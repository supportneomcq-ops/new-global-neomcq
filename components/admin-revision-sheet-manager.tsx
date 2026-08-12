'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Eye,
  RefreshCw,
  Printer,
  FileText,
} from 'lucide-react';

export default function AdminRevisionSheetManager() {
  const [sheets, setSheets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, pendingReview: 0, approved: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('all');

  const [exams, setExams] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newSheet, setNewSheet] = useState({ title: '', sheet_type: 'quick_revision', exam_id: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchSheets();
  }, [search, examFilter]);

  async function fetchExams() {
    try {
      const res = await fetch('/api/admin/exams');
      const data = await res.json();
      if (data.exams) setExams(data.exams);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchSheets() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/revision-sheets?search=${search}&exam_id=${examFilter}`);
      const data = await res.json();
      if (data.success) {
        setSheets(data.revision_sheets || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheet.title || !newSheet.exam_id) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/revision-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSheet),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setNewSheet({ title: '', sheet_type: 'quick_revision', exam_id: '' });
        fetchSheets();
      } else {
        alert(data.error || 'Failed to create revision sheet');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#6D5BFF]" />
            <span>Revision Sheets & Printable Key Facts</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Generate and manage high-yield printable revision sheets,mnemonics tables, and fill-in-blank summaries.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 hover:opacity-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create Revision Sheet</span>
        </button>
      </div>

      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sheet title..."
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

          <button onClick={fetchSheets} className="p-2 rounded-2xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading Revision Sheets...</div>
        ) : sheets.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No revision sheets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">Sheet Title</th>
                  <th className="p-4">Format Type</th>
                  <th className="p-4">Exam</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                {sheets.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{s.title}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 uppercase">
                        {s.sheet_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-gray-300">{s.exams?.name || 'N/A'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/revision-sheets/${s.id}`}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-[#6D5BFF]/10 text-[#6D5BFF] hover:bg-[#6D5BFF]/20"
                      >
                        View & Print
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Create Revision Sheet</h2>

            <form onSubmit={handleCreateSheet} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Exam *</label>
                <select
                  required
                  value={newSheet.exam_id}
                  onChange={(e) => setNewSheet({ ...newSheet, exam_id: e.target.value })}
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
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Sheet Type</label>
                <select
                  value={newSheet.sheet_type}
                  onChange={(e) => setNewSheet({ ...newSheet, sheet_type: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                >
                  <option value="quick_revision">Quick Revision Sheet</option>
                  <option value="printable">Printable PDF High-Yield</option>
                  <option value="fill_in_blanks">Fill-In-The-Blanks Active Recall</option>
                  <option value="mnemonics">Mnemonics & Clinical Table</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Title *</label>
                <input
                  type="text"
                  required
                  value={newSheet.title}
                  onChange={(e) => setNewSheet({ ...newSheet, title: e.target.value })}
                  placeholder="e.g. Cardiology High-Yield Mnemonics Sheet"
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-200 dark:bg-gray-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-2xl bg-[#6D5BFF] text-white text-xs font-bold"
                >
                  {submitting ? 'Creating...' : 'Create Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
