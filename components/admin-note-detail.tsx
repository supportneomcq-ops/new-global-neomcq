'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  StickyNote,
  ArrowLeft,
  Save,
  Trash2,
  Eye,
  Edit,
  CheckCircle2,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export default function AdminNoteDetail({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'editor' | 'notebook_preview'>('editor');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    note_type: 'high_yield',
    status: 'pending_review',
  });

  useEffect(() => {
    fetchNote();
  }, [id]);

  async function fetchNote() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notes/${id}`);
      const data = await res.json();
      if (data.success) {
        setNote(data.note);
        setFormData({
          title: data.note.title || '',
          content: data.note.content || '',
          note_type: data.note.note_type || 'high_yield',
          status: data.note.status || 'pending_review',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (statusOverride?: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: statusOverride || formData.status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNote(data.note);
        alert('Note updated successfully!');
      } else {
        alert(data.error || 'Failed to update note');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-xs text-slate-500">Loading Note...</div>;
  if (!note) return <div className="p-12 text-center text-xs text-slate-500">Note not found.</div>;

  return (
    <div className="space-y-6">
      {/* Top Nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/notes"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-gray-300 hover:text-[#6D5BFF]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Notes</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode(mode === 'editor' ? 'notebook_preview' : 'editor')}
            className="px-3 py-2 rounded-2xl bg-purple-500/10 text-purple-600 font-extrabold text-xs flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>{mode === 'editor' ? 'Notebook Preview' : 'Edit Mode'}</span>
          </button>
          <button
            onClick={() => handleSave('approved')}
            disabled={saving}
            className="px-3 py-2 rounded-2xl bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve Note</span>
          </button>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-2 rounded-2xl bg-[#6D5BFF] text-white font-extrabold text-xs flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Note'}</span>
          </button>
        </div>
      </div>

      {mode === 'editor' ? (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Type</label>
              <select
                value={formData.note_type}
                onChange={(e) => setFormData({ ...formData, note_type: e.target.value })}
                className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
              >
                <option value="high_yield">High-Yield Concept</option>
                <option value="topper_handwritten">Topper Handwritten</option>
                <option value="clinical_pearl">Clinical Pearl</option>
                <option value="revision">Quick Revision</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
              >
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="draft">Draft</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Content</label>
            <textarea
              rows={12}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-mono"
            />
          </div>
        </div>
      ) : (
        /* Topper Handwritten Notebook Style Preview */
        <div className="p-8 rounded-3xl bg-[#FFFDF5] dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/40 shadow-lg space-y-6 relative overflow-hidden font-sans">
          {/* Notebook Paper Lines styling */}
          <div className="border-b-2 border-rose-300 pb-2">
            <span className="text-[10px] uppercase tracking-widest text-amber-800 dark:text-amber-300 font-black">
              NEOMCQ TOPPER HANDWRITTEN REVISION SHEET
            </span>
            <h1 className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-1">{formData.title}</h1>
          </div>

          <div className="bg-amber-100/50 dark:bg-amber-900/30 p-4 rounded-2xl border border-amber-300/50 text-amber-900 dark:text-amber-200 text-xs space-y-2">
            <p className="font-extrabold uppercase text-[10px] text-amber-700">★ High-Yield Medical Summary</p>
            <p className="whitespace-pre-wrap leading-relaxed">{formData.content}</p>
          </div>
        </div>
      )}
    </div>
  );
}
