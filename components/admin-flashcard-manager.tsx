'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Eye,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';

export default function AdminFlashcardManager() {
  const [cards, setCards] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, pendingReview: 0, approved: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [exams, setExams] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCard, setNewCard] = useState({
    front: '',
    back: '',
    difficulty: 'Medium',
    exam_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    fetchCards();
  }, [search, examFilter, page]);

  async function fetchExams() {
    try {
      const res = await fetch('/api/admin/exams');
      const data = await res.json();
      if (data.exams) setExams(data.exams);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchCards() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        exam_id: examFilter,
      });

      const res = await fetch(`/api/admin/flashcards?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setCards(data.flashcards || []);
        setStats(data.stats || {});
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.front || !newCard.back || !newCard.exam_id) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCard),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewCard({ front: '', back: '', difficulty: 'Medium', exam_id: '' });
        fetchCards();
      } else {
        alert(data.error || 'Failed to create flashcard');
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
            <Layers className="w-6 h-6 text-[#6D5BFF]" />
            <span>Spaced Repetition Flashcards</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Manage high-yield active recall flashcard pairs and study decks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/flashcards/decks"
            className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-gray-800 font-extrabold text-xs flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Manage Decks</span>
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 hover:opacity-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Flashcard</span>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Cards</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total || 0}</p>
        </div>
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-amber-600">Pending Review</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.pendingReview || 0}</p>
        </div>
        <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-emerald-600">Approved</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.approved || 0}</p>
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
            placeholder="Search front or back text..."
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

          <button
            onClick={fetchCards}
            className="p-2 rounded-2xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading Flashcards...</div>
        ) : cards.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-gray-200">No flashcards found</p>
            <p className="text-[11px] text-slate-400">Create active recall flashcard items.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">Front (Question Prompt)</th>
                  <th className="p-4">Back (Answer Key)</th>
                  <th className="p-4">Exam</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                {cards.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                    <td className="p-4 max-w-xs font-bold text-slate-900 dark:text-white line-clamp-2">{c.front}</td>
                    <td className="p-4 max-w-xs text-slate-600 dark:text-gray-300 line-clamp-2">{c.back}</td>
                    <td className="p-4 text-slate-600 dark:text-gray-300">{c.exams?.name || 'N/A'}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          c.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/flashcards/${c.id}`}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-[#6D5BFF]/10 text-[#6D5BFF] hover:bg-[#6D5BFF]/20"
                      >
                        View & Flip
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl max-w-xl w-full p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Create New Flashcard</h2>

            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Target Exam *</label>
                <select
                  required
                  value={newCard.exam_id}
                  onChange={(e) => setNewCard({ ...newCard, exam_id: e.target.value })}
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
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Front (Prompt) *</label>
                <textarea
                  required
                  rows={2}
                  value={newCard.front}
                  onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                  placeholder="Enter front card text..."
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Back (Answer) *</label>
                <textarea
                  required
                  rows={3}
                  value={newCard.back}
                  onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                  placeholder="Enter back card key points..."
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
                  {submitting ? 'Creating...' : 'Create Flashcard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
