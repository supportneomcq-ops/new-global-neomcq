'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, CheckCircle2, RotateCw } from 'lucide-react';

export default function AdminFlashcardDetail({ id }: { id: string }) {
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const [formData, setFormData] = useState({
    front: '',
    back: '',
    difficulty: 'Medium',
    status: 'approved',
  });

  useEffect(() => {
    fetchCard();
  }, [id]);

  async function fetchCard() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/flashcards/${id}`);
      const data = await res.json();
      if (data.success) {
        setCard(data.flashcard);
        setFormData({
          front: data.flashcard.front || '',
          back: data.flashcard.back || '',
          difficulty: data.flashcard.difficulty || 'Medium',
          status: data.flashcard.status || 'approved',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/flashcards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setCard(data.flashcard);
        alert('Flashcard saved!');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-xs text-slate-500">Loading Flashcard...</div>;
  if (!card) return <div className="p-12 text-center text-xs text-slate-500">Flashcard not found.</div>;

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
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-2xl bg-[#6D5BFF] text-white font-extrabold text-xs flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Card'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Flip Card Preview */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Interactive Active Recall Preview</span>
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="text-xs text-[#6D5BFF] font-bold flex items-center gap-1 hover:underline"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Flip Card</span>
            </button>
          </h2>

          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer min-h-[260px] p-8 rounded-3xl bg-gradient-to-br from-[#6D5BFF]/10 to-[#A855F7]/10 border-2 border-[#6D5BFF]/30 flex flex-col items-center justify-center text-center space-y-4 shadow-inner transition-all hover:scale-[1.01]"
          >
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white dark:bg-gray-900 text-[#6D5BFF]">
              {isFlipped ? 'BACK (ANSWER)' : 'FRONT (QUESTION PROMPT)'}
            </span>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {isFlipped ? formData.back : formData.front}
            </p>
            <p className="text-[10px] text-slate-400 font-bold">(Click card to flip)</p>
          </div>
        </div>

        {/* Editor Form */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Flashcard Content Editor</h2>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Front (Prompt)</label>
            <textarea
              rows={3}
              value={formData.front}
              onChange={(e) => setFormData({ ...formData, front: e.target.value })}
              className="w-full mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Back (Key Points / Answer)</label>
            <textarea
              rows={4}
              value={formData.back}
              onChange={(e) => setFormData({ ...formData, back: e.target.value })}
              className="w-full mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
              >
                <option value="approved">Approved</option>
                <option value="pending_review">Pending Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
