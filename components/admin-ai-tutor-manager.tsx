'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  BookOpen,
  Eye,
  RefreshCw,
  Brain,
  BarChart3,
  Layers,
} from 'lucide-react';
import { AdminAITutorAnalyticsDashboard } from '@/components/admin/ai-tutor-analytics-dashboard';

export default function AdminAITutorManager() {
  const [activeTab, setActiveTab] = useState<'lessons' | 'analytics'>('lessons');
  const [lessons, setLessons] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, pendingReview: 0, approved: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('all');

  const [exams, setExams] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newLesson, setNewLesson] = useState({ title: '', difficulty: 'Intermediate', exam_id: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchLessons();
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

  async function fetchLessons() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-tutor?search=${search}&exam_id=${examFilter}`);
      const data = await res.json();
      if (data.success) {
        setLessons(data.ai_tutor_lessons || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLesson.title || !newLesson.exam_id) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLesson),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setNewLesson({ title: '', difficulty: 'Intermediate', exam_id: '' });
        fetchLessons();
      } else {
        alert(data.error || 'Failed to create lesson');
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
            <Brain className="w-6 h-6 text-[#6D5BFF]" />
            <span>AI Tutor Structured Lessons</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Socratic teaching modules, clinical step-by-step breakdowns, and interactive AI tutor content.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 hover:opacity-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create AI Tutor Module</span>
        </button>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('lessons')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'lessons'
              ? 'bg-[#6D5BFF] text-white shadow-sm'
              : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Structured Modules ({stats.total || lessons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-[#6D5BFF] text-white shadow-sm'
              : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics Intelligence</span>
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <AdminAITutorAnalyticsDashboard />
      ) : (
        <>
          <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lesson module title..."
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

          <button onClick={fetchLessons} className="p-2 rounded-2xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading AI Tutor Lessons...</div>
        ) : lessons.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No AI tutor lessons found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">Module Title</th>
                  <th className="p-4">Difficulty</th>
                  <th className="p-4">Exam</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                {lessons.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{l.title}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-500">
                        {l.difficulty}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-gray-300">{l.exams?.name || 'N/A'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        {l.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/ai-tutor/${l.id}`}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-[#6D5BFF]/10 text-[#6D5BFF] hover:bg-[#6D5BFF]/20"
                      >
                        View & Teach
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Create AI Tutor Module</h2>

            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Exam *</label>
                <select
                  required
                  value={newLesson.exam_id}
                  onChange={(e) => setNewLesson({ ...newLesson, exam_id: e.target.value })}
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
                  value={newLesson.title}
                  onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                  placeholder="e.g. Acid-Base Disorders Masterclass"
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Difficulty</label>
                <select
                  value={newLesson.difficulty}
                  onChange={(e) => setNewLesson({ ...newLesson, difficulty: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
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
                  {submitting ? 'Creating...' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
