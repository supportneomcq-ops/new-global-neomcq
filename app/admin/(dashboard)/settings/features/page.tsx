'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Bot,
  Zap,
} from 'lucide-react';

export default function AdminFeatureFlagSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<Record<string, boolean>>({
    aiTutor: true,
    newMcqEngine: true,
    flashcards: true,
    revisionSheets: true,
    pwa: true,
    newOnboarding: true,
    paymentFeatures: true,
  });

  const loadFlags = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/features');
      const json = await res.json();
      if (json.success) {
        setFlags(json.featureFlags || {});
      }
    } catch (err) {
      console.error('Failed to load feature flags:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  const toggleFlag = async (key: string, enabled: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: enabled }));
    try {
      await fetch('/api/admin/settings/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      });
    } catch (err) {
      console.error('Failed to toggle flag:', err);
    }
  };

  const featureLabels: Record<string, { label: string; desc: string }> = {
    aiTutor: { label: 'AI Clinical Tutor Assistant', desc: 'Enable interactive Gemini medical AI chat tutor for learners.' },
    newMcqEngine: { label: 'High-Performance MCQ Engine', desc: 'Enable enhanced timer, explanation, and weakness tag tracking.' },
    flashcards: { label: 'Active Recall Flashcards', desc: 'Enable spaced repetition audio & text flashcards module.' },
    revisionSheets: { label: 'Last-Minute Revision Sheets', desc: 'Enable high-yield subject revision summaries.' },
    pwa: { label: 'PWA & Offline Study Support', desc: 'Enable progressive web app installation and local cache sync.' },
    newOnboarding: { label: 'New Medical Student Onboarding', desc: 'Enable targeted exam selection & goal setting wizard.' },
    paymentFeatures: { label: 'Pro Pass Payment Checkout', desc: 'Enable Razorpay subscription upgrades & coupon redemptions.' },
  };

  return (
    <div className="space-y-6">
      {/* Dynamic refresh bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Dynamically Toggle Learner Capabilities</h3>
        <button
          onClick={loadFlags}
          className="p-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Feature Flags List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(featureLabels).map((key) => {
          const info = featureLabels[key];
          const isEnabled = flags[key] ?? true;

          return (
            <div
              key={key}
              className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{info.label}</span>
                  {isEnabled ? (
                    <span className="px-2 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ON
                    </span>
                  ) : (
                    <span className="px-2 py-0.2 rounded text-[9px] font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                      OFF
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400">{info.desc}</p>
              </div>

              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => toggleFlag(key, e.target.checked)}
                className="w-6 h-6 rounded cursor-pointer accent-[#6D5BFF] flex-shrink-0"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
