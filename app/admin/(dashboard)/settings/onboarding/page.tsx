'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, RotateCcw, ShieldCheck } from 'lucide-react';

export default function OnboardingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    emailVerificationRequired: true,
    examSelectionRequired: true,
    subjectSelectionRequired: true,
    topicSelectionRequired: false,
    allowExamChange: true,
    allowSubjectChange: true,
    allowTopicChange: true,
    allowMultipleExams: false,
    onboardingEnabled: true,
  });

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings/onboarding');
      const json = await res.json();
      if (json.success) {
        setForm(json.settings);
      } else {
        setError(json.error || 'Failed to load onboarding settings');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/admin/settings/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setForm(json.settings);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(json.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-[#6D5BFF] animate-spin" />
      </div>
    );
  }

  const TOGGLE_ITEMS = [
    { label: 'Onboarding System Enabled', key: 'onboardingEnabled' as const, description: 'Directs new signups through the multi-step onboarding wizard.' },
    { label: 'Enforce Email Verification', key: 'emailVerificationRequired' as const, description: 'Requires email verification prior to unlocking practice dashboards.' },
    { label: 'Mandate Exam Track Selection', key: 'examSelectionRequired' as const, description: 'Learner must choose an active exam syllabus (e.g. NEET PG) during signup.' },
    { label: 'Mandate Primary Subject Pick', key: 'subjectSelectionRequired' as const, description: 'Learner must choose a starting target subject on registration.' },
    { label: 'Mandate Topic Drill-down Pick', key: 'topicSelectionRequired' as const, description: 'Force selecting a specific topic node to finalize profile.' },
    { label: 'Allow Changing Selected Exams', key: 'allowExamChange' as const, description: 'Allows users to swap exam categories later in their Profile settings.' },
    { label: 'Allow Changing Selected Subjects', key: 'allowSubjectChange' as const, description: 'Enables modifying core study subject filters.' },
    { label: 'Allow Changing Selected Topics', key: 'allowTopicChange' as const, description: 'Enables modifying core focus topic filters.' },
    { label: 'Allow Multiple Exam Tracks Simultaneously', key: 'allowMultipleExams' as const, description: 'Unlocks concurrent enrolment across multiple independent test categories.' },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>Onboarding guidelines saved. Changes will not alter existing student selections.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold text-xs text-amber-200">Onboarding Scope Safeguard</div>
          <p className="text-[10px] text-amber-300 leading-relaxed">
            Changing onboarding mandates only governs future user registrations. This does NOT rewrite or clear selections made by existing users in the database, protecting current student progress history from data loss.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TOGGLE_ITEMS.map((item) => (
          <div key={item.key} className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-bold text-xs text-slate-900 dark:text-white">{item.label}</div>
              <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-normal">{item.description}</p>
            </div>
            <input
              type="checkbox"
              checked={form[item.key]}
              onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
              className="w-5.5 h-5.5 rounded cursor-pointer accent-[#6D5BFF] shrink-0"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-gray-800">
        <button
          type="button"
          onClick={loadSettings}
          className="p-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Rules</span>
        </button>

        <button
          type="submit"
          disabled={saving}
          className="p-2.5 px-6 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-[#6D5BFF]/10"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Pipeline Policies</span>
        </button>
      </div>
    </form>
  );
}
