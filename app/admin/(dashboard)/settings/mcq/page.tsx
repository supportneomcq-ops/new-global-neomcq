'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

export default function MCQSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    defaultMcqCount: 20,
    allowedCounts: [20, 50, 100, 200],
    maxMcqs: 200,
    timerEnabled: true,
    difficultyLevels: ['Easy', 'Medium', 'Hard'],
    explanationDisplay: 'immediate',
    rationaleDisplay: true,
    practiceMode: true,
    examMode: true,
    retryBehavior: 'incorrect_only',
  });

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings/mcq');
      const json = await res.json();
      if (json.success) {
        setForm(json.settings);
      } else {
        setError(json.error || 'Failed to load MCQ settings');
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

    // Validate constraints client-side
    if (!form.allowedCounts.includes(form.defaultMcqCount)) {
      setError(`Default MCQ count (${form.defaultMcqCount}) must be one of the allowed counts.`);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/settings/mcq', {
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

  const handleAllowedCountToggle = (count: number) => {
    let counts = [...form.allowedCounts];
    if (counts.includes(count)) {
      if (counts.length === 1) {
        alert('You must allow at least one sprint count option.');
        return;
      }
      counts = counts.filter((c) => c !== count);
    } else {
      counts.push(count);
      counts.sort((a, b) => a - b);
    }
    setForm({ ...form, allowedCounts: counts });
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
          <span>MCQ quiz engine settings updated and validated on the server.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* MCQ Sprint Selection Sizer */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Sprint Sizes & Capping
          </h2>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default MCQ Practice Set Count</label>
            <input
              type="number"
              required
              value={form.defaultMcqCount}
              onChange={(e) => setForm({ ...form, defaultMcqCount: parseInt(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Allowed Sprint Sizes</label>
            <div className="flex gap-2.5">
              {[20, 50, 100, 200].map((num) => {
                const active = form.allowedCounts.includes(num);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleAllowedCountToggle(num)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      active
                        ? 'bg-[#6D5BFF]/10 border-[#6D5BFF] text-[#6D5BFF]'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-gray-800 text-slate-400'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Absolute Maximum MCQs per Quiz</label>
            <input
              type="number"
              required
              min={10}
              max={500}
              value={form.maxMcqs}
              onChange={(e) => setForm({ ...form, maxMcqs: parseInt(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
            />
          </div>
        </div>

        {/* MCQ Presentation Style */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Explanation & Practice Rules
          </h2>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Explanation Display Mode</label>
            <select
              value={form.explanationDisplay}
              onChange={(e) => setForm({ ...form, explanationDisplay: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
            >
              <option value="immediate">Show Immediately after click</option>
              <option value="after_quiz">Show only at the final Score summary</option>
              <option value="none">Completely hide explanations</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retry Behavior for Incorrect Answers</label>
            <select
              value={form.retryBehavior}
              onChange={(e) => setForm({ ...form, retryBehavior: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
            >
              <option value="incorrect_only">Prompt retry for incorrect options only</option>
              <option value="unlocked">Allow arbitrary choices retrial</option>
              <option value="disabled">Never allow retries (single-shot quiz)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Active Explanation Rationales</div>
              <p className="text-[10px] text-slate-500">Render diagnostic rationales on correct picks.</p>
            </div>
            <input
              type="checkbox"
              checked={form.rationaleDisplay}
              onChange={(e) => setForm({ ...form, rationaleDisplay: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Toggle Quiz Archetypes */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Practice vs Exam Mode Toggles
          </h2>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Practice Mode (Untimed / Hints)</div>
              <p className="text-[10px] text-slate-500">Unlocks detailed rationales and AI tutor companions during study.</p>
            </div>
            <input
              type="checkbox"
              checked={form.practiceMode}
              onChange={(e) => setForm({ ...form, practiceMode: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Exam Mode (Strict Timed Blocks)</div>
              <p className="text-[10px] text-slate-500">Requires complete silence, locks hints, scores on completion.</p>
            </div>
            <input
              type="checkbox"
              checked={form.examMode}
              onChange={(e) => setForm({ ...form, examMode: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Universal Countdown Timer</div>
              <p className="text-[10px] text-slate-500">Track and log user seconds per question.</p>
            </div>
            <input
              type="checkbox"
              checked={form.timerEnabled}
              onChange={(e) => setForm({ ...form, timerEnabled: e.target.checked })}
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
          <span>Save MCQ Configurations</span>
        </button>
      </div>
    </form>
  );
}
