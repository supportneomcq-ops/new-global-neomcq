'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  History,
  Save,
  Trash2,
  AlertCircle,
  FileText,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export default function AdminMCQDetail({ id }: { id: string }) {
  const router = useRouter();
  const [mcq, setMcq] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'versions'>('editor');

  const [formData, setFormData] = useState<any>({
    question: '',
    options: [],
    correct_answer: 'a',
    explanation: '',
    rationale: '',
    clinical_pearl: '',
    difficulty: 'Intermediate',
    status: 'pending_review',
    review_notes: '',
    change_summary: '',
  });

  useEffect(() => {
    fetchMCQDetail();
  }, [id]);

  async function fetchMCQDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/mcqs/${id}`);
      const data = await res.json();
      if (data.success) {
        setMcq(data.mcq);
        setVersions(data.versions || []);
        setFormData({
          question: data.mcq.question || '',
          options: data.mcq.options || [],
          correct_answer: data.mcq.correct_answer || 'a',
          explanation: data.mcq.explanation || '',
          rationale: data.mcq.rationale || '',
          clinical_pearl: data.mcq.clinical_pearl || '',
          difficulty: data.mcq.difficulty || 'Intermediate',
          status: data.mcq.status || 'pending_review',
          review_notes: data.mcq.review_notes || '',
          change_summary: '',
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
      const payload = {
        ...formData,
        status: statusOverride || formData.status,
      };

      const res = await fetch(`/api/admin/mcqs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMcq(data.mcq);
        fetchMCQDetail();
        alert('MCQ saved successfully!');
      } else {
        alert(data.error || 'Failed to save MCQ');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this MCQ?')) return;
    try {
      const res = await fetch(`/api/admin/mcqs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.push('/admin/mcqs');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading MCQ Details...</div>;
  }

  if (!mcq) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 space-y-4">
        <p className="font-bold text-slate-700">MCQ not found</p>
        <Link href="/admin/mcqs" className="text-[#6D5BFF] font-bold">
          &larr; Return to MCQs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/mcqs"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-gray-300 hover:text-[#6D5BFF]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to MCQ Item Bank</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave('approved')}
            disabled={saving}
            className="px-3 py-2 rounded-2xl bg-emerald-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 hover:bg-emerald-600"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve & Publish</span>
          </button>
          <button
            onClick={() => handleSave('rejected')}
            disabled={saving}
            className="px-3 py-2 rounded-2xl bg-rose-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 hover:bg-rose-600"
          >
            <XCircle className="w-4 h-4" />
            <span>Reject</span>
          </button>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-2 rounded-2xl bg-[#6D5BFF] text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 hover:bg-[#5b4aee]"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span>MCQ ID: {mcq.id}</span>
            <span>•</span>
            <span>Version {mcq.version}</span>
            <span>•</span>
            <span>Exam: {mcq.exams?.name || 'Unassigned'}</span>
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white mt-1 line-clamp-2">
            {mcq.question}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold ${
              mcq.status === 'approved'
                ? 'bg-emerald-500/10 text-emerald-500'
                : mcq.status === 'pending_review'
                ? 'bg-amber-500/10 text-amber-500'
                : 'bg-slate-500/10 text-slate-500'
            }`}
          >
            Status: {mcq.status}
          </span>
          <button onClick={handleArchive} className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-gray-800 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 rounded-2xl ${
            activeTab === 'editor'
              ? 'bg-[#6D5BFF] text-white'
              : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400'
          }`}
        >
          MCQ Editor & Review
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          className={`px-4 py-2 rounded-2xl flex items-center gap-1.5 ${
            activeTab === 'versions'
              ? 'bg-[#6D5BFF] text-white'
              : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Version History ({versions.length})</span>
        </button>
      </div>

      {activeTab === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Question Vignette Stem</h2>
              <textarea
                rows={4}
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-medium focus:outline-none focus:border-[#6D5BFF]"
              />

              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white pt-2">Options & Distractors</h2>
              <div className="space-y-3">
                {formData.options.map((opt: any, idx: number) => (
                  <div key={opt.id || idx} className="flex items-center gap-3">
                    <span className="font-extrabold text-xs uppercase text-slate-500 w-4">{opt.id}.</span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const updated = [...formData.options];
                        updated[idx].text = e.target.value;
                        setFormData({ ...formData, options: updated });
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-medium"
                    />
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer shrink-0">
                      <input
                        type="radio"
                        name="correct_radio"
                        checked={formData.correct_answer === opt.id}
                        onChange={() => setFormData({ ...formData, correct_answer: opt.id })}
                      />
                      <span>Correct</span>
                    </label>
                  </div>
                ))}
              </div>

              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white pt-2">Explanation & Rationale</h2>
              <textarea
                rows={3}
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="High-yield answer explanation..."
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-medium"
              />

              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white pt-2">Clinical Pearl</h2>
              <textarea
                rows={2}
                value={formData.clinical_pearl}
                onChange={(e) => setFormData({ ...formData, clinical_pearl: e.target.value })}
                placeholder="High-yield key takeaway..."
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-medium"
              />
            </div>
          </div>

          {/* Sidebar Properties & Review Notes (1 Col) */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Review & Quality Control</h2>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-gray-300">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold"
                >
                  <option value="pending_review">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="draft">Draft</option>
                  <option value="rejected">Rejected</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-gray-300">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-gray-300">Review Notes / Rejection Reason</label>
                <textarea
                  rows={3}
                  value={formData.review_notes}
                  onChange={(e) => setFormData({ ...formData, review_notes: e.target.value })}
                  placeholder="Notes for content review audit..."
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-gray-300">Change Summary (for Versioning)</label>
                <input
                  type="text"
                  value={formData.change_summary}
                  onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
                  placeholder="e.g. Corrected distractor C explanation"
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Version History View */
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Version History Audit Trail</h2>
          {versions.length === 0 ? (
            <p className="text-xs text-slate-400">No previous versions saved yet.</p>
          ) : (
            <div className="space-y-3">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between font-bold text-slate-700 dark:text-gray-200">
                    <span>Version {v.version}</span>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(v.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-gray-300 italic">{v.change_summary}</p>
                  <p className="text-slate-500 line-clamp-2">Stem: {v.snapshot?.question}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
