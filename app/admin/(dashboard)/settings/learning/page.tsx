'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

export default function LearningSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    dailyStudyGoal: 45,
    studyStreak: 5,
    sessionLength: 15,
    flashcardSettings: { autoSchedule: true, repetitions: 5 },
    revisionSettings: { autoSummarize: true },
    studyPlanSettings: { active: true },
    aiTutorAvailability: 'Always Available',
    learningReminderDefaults: 'Daily Email',
  });

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings/learning');
      const json = await res.json();
      if (json.success) {
        setForm(json.settings);
      } else {
        setError(json.error || 'Failed to load learning settings');
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
      const res = await fetch('/api/admin/settings/learning', {
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

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>Learning settings successfully updated.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Core Study Targets */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Study Goal & Streak Targets
          </h2>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Study Target (Minutes)</label>
            <input
              type="number"
              required
              min={5}
              max={300}
              value={form.dailyStudyGoal}
              onChange={(e) => setForm({ ...form, dailyStudyGoal: parseInt(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Streak Lock Milestone (Days)</label>
            <input
              type="number"
              required
              min={1}
              value={form.studyStreak}
              onChange={(e) => setForm({ ...form, studyStreak: parseInt(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default Practice Session length (MCQs)</label>
            <input
              type="number"
              required
              min={5}
              value={form.sessionLength}
              onChange={(e) => setForm({ ...form, sessionLength: parseInt(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
            />
          </div>
        </div>

        {/* Dynamic Study Modules settings */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Module Parameters & Reminders
          </h2>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Tutor Availability Mode</label>
            <select
              value={form.aiTutorAvailability}
              onChange={(e) => setForm({ ...form, aiTutorAvailability: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
            >
              <option value="Always Available">Always Available</option>
              <option value="Pro Only">Pro Only PASS Holders</option>
              <option value="Offline Maintenance">Offline / Under Maintenance</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default Study Reminders</label>
            <select
              value={form.learningReminderDefaults}
              onChange={(e) => setForm({ ...form, learningReminderDefaults: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
            >
              <option value="Daily Email">Daily Email reminders</option>
              <option value="Push Notifications">Push notifications only</option>
              <option value="Both">Both Email and Push</option>
              <option value="None">None (Manual/Opt-in)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Active Adaptive Study Plans</div>
              <p className="text-[10px] text-slate-500">Enable calendar study scheduling.</p>
            </div>
            <input
              type="checkbox"
              checked={form.studyPlanSettings.active}
              onChange={(e) => setForm({ ...form, studyPlanSettings: { ...form.studyPlanSettings, active: e.target.checked } })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Flashcard engine parameters */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Flashcard Leitner Engine
          </h2>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Automatic Spaced-Repetitions</div>
              <p className="text-[10px] text-slate-500">Auto-inject cards into review decks.</p>
            </div>
            <input
              type="checkbox"
              checked={form.flashcardSettings.autoSchedule}
              onChange={(e) => setForm({ ...form, flashcardSettings: { ...form.flashcardSettings, autoSchedule: e.target.checked } })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Box Graduation Threshold (Corrects)</label>
            <input
              type="number"
              required
              min={1}
              value={form.flashcardSettings.repetitions}
              onChange={(e) => setForm({ ...form, flashcardSettings: { ...form.flashcardSettings, repetitions: parseInt(e.target.value) } })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
            />
          </div>
        </div>

        {/* Revision summary settings */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Revision Summarizer Settings
          </h2>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Automatic Chapter Summaries</div>
              <p className="text-[10px] text-slate-500">Use AI summarizer to create condensed revision notes.</p>
            </div>
            <input
              type="checkbox"
              checked={form.revisionSettings.autoSummarize}
              onChange={(e) => setForm({ ...form, revisionSettings: { ...form.revisionSettings, autoSummarize: e.target.checked } })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-gray-800">
        <button
          type="button"
          onClick={loadSettings}
          className="p-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Forms</span>
        </button>

        <button
          type="submit"
          disabled={saving}
          className="p-2.5 px-6 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-[#6D5BFF]/10"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Learning Presets</span>
        </button>
      </div>
    </form>
  );
}
