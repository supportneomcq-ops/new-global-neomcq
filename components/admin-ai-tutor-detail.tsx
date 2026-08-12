'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Brain, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AdminAITutorDetail({ id }: { id: string }) {
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    difficulty: 'Intermediate',
    status: 'approved',
    learning_objective: '',
    concept_explanation: '',
    clinical_context: '',
  });

  useEffect(() => {
    fetchLesson();
  }, [id]);

  async function fetchLesson() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-tutor/${id}`);
      const data = await res.json();
      if (data.success) {
        setLesson(data.ai_tutor_lesson);
        setFormData({
          title: data.ai_tutor_lesson.title || '',
          difficulty: data.ai_tutor_lesson.difficulty || 'Intermediate',
          status: data.ai_tutor_lesson.status || 'approved',
          learning_objective: data.ai_tutor_lesson.content?.learning_objective || '',
          concept_explanation: data.ai_tutor_lesson.content?.concept_explanation || '',
          clinical_context: data.ai_tutor_lesson.content?.clinical_context || '',
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
      const res = await fetch(`/api/admin/ai-tutor/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          difficulty: formData.difficulty,
          status: formData.status,
          content: {
            learning_objective: formData.learning_objective,
            concept_explanation: formData.concept_explanation,
            clinical_context: formData.clinical_context,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLesson(data.ai_tutor_lesson);
        alert('AI Tutor Module saved!');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-xs text-slate-500">Loading Module...</div>;
  if (!lesson) return <div className="p-12 text-center text-xs text-slate-500">Module not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/ai-tutor"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-gray-300 hover:text-[#6D5BFF]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to AI Tutor</span>
        </Link>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-2xl bg-[#6D5BFF] text-white font-extrabold text-xs flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Lesson'}</span>
        </button>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#6D5BFF]" />
          <span>Socratic AI Teaching Lesson Editor</span>
        </h2>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Module Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Core Learning Objective</label>
          <input
            type="text"
            value={formData.learning_objective}
            onChange={(e) => setFormData({ ...formData, learning_objective: e.target.value })}
            className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Socratic Concept Explanation</label>
          <textarea
            rows={6}
            value={formData.concept_explanation}
            onChange={(e) => setFormData({ ...formData, concept_explanation: e.target.value })}
            className="w-full mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-medium"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Clinical Context & Application</label>
          <textarea
            rows={4}
            value={formData.clinical_context}
            onChange={(e) => setFormData({ ...formData, clinical_context: e.target.value })}
            className="w-full mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-medium"
          />
        </div>
      </div>
    </div>
  );
}
