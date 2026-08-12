'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, Plus, ArrowLeft, Search, RefreshCw } from 'lucide-react';

export default function AdminFlashcardDecksManager() {
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [exams, setExams] = useState<any[]>([]);

  const [newDeck, setNewDeck] = useState({ title: '', description: '', exam_id: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchDecks();
  }, []);

  async function fetchExams() {
    try {
      const res = await fetch('/api/admin/exams');
      const data = await res.json();
      if (data.exams) setExams(data.exams);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchDecks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/flashcards/decks?search=${search}`);
      const data = await res.json();
      if (data.success) setDecks(data.decks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeck.title || !newDeck.exam_id) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/flashcards/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeck),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setNewDeck({ title: '', description: '', exam_id: '' });
        fetchDecks();
      } else {
        alert(data.error || 'Failed to create deck');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/flashcards"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-gray-300 hover:text-[#6D5BFF]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Flashcards</span>
        </Link>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-[#6D5BFF] text-white font-extrabold text-xs flex items-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Create Flashcard Deck</span>
        </button>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#6D5BFF]" />
          <span>Flashcard Study Decks</span>
        </h1>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading Decks...</div>
        ) : decks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No flashcard decks created yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {decks.map((d) => (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-2"
              >
                <span className="text-[10px] font-bold uppercase text-[#6D5BFF]">{d.exams?.name || 'Exam'}</span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{d.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{d.description || 'No description'}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-gray-800 text-[10px] font-bold text-slate-400">
                  <span>{d.card_count || 0} Flashcards</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Create Deck</h2>

            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Exam *</label>
                <select
                  required
                  value={newDeck.exam_id}
                  onChange={(e) => setNewDeck({ ...newDeck, exam_id: e.target.value })}
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
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Title *</label>
                <input
                  type="text"
                  required
                  value={newDeck.title}
                  onChange={(e) => setNewDeck({ ...newDeck, title: e.target.value })}
                  placeholder="e.g. High-Yield Pathology Decks"
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Description</label>
                <textarea
                  rows={2}
                  value={newDeck.description}
                  onChange={(e) => setNewDeck({ ...newDeck, description: e.target.value })}
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
                  {submitting ? 'Creating...' : 'Create Deck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
