'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Save,
  Bell,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

export default function AdminSystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    maintenanceMode: false,
    registrationEnabled: true,
    contentGenerationEnabled: true,
    aiGenerationEnabled: true,
    paymentsEnabled: true,
    notificationsEnabled: true,
    defaultPagination: 25,
    systemAnnouncement: '',
  });
  const [toast, setToast] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/system');
      const json = await res.json();
      if (json.success) {
        setSettings(json.settings);
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setToast('');
    try {
      const res = await fetch('/api/admin/settings/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        setToast('System configuration saved and audited successfully.');
      }
    } catch (err: any) {
      setToast(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#6D5BFF]" />
            <span>System Configuration & Operational Controls</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Server-side toggles for Maintenance Mode, User Registration, AI MCQ Generation, Payment Processing, and System Announcements.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="p-2.5 px-5 rounded-2xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#6D5BFF]/20"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save System Settings</span>
        </button>
      </div>

      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="space-y-4">
        {/* Maintenance Mode Toggle Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex items-center justify-between gap-4">
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Maintenance Mode</span>
              {settings.maintenanceMode && (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              Restricts learner access with a friendly maintenance screen while preserving Admin Control Center access.
            </p>
          </div>

          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
            className="w-6 h-6 rounded cursor-pointer accent-[#6D5BFF]"
          />
        </div>

        {/* Feature Switches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">User Registration</div>
              <div className="text-[11px] text-slate-500">Allow new students to sign up for accounts.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.registrationEnabled}
              onChange={(e) => setSettings({ ...settings, registrationEnabled: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">AI Generation Engine</div>
              <div className="text-[11px] text-slate-500">Allow automated Gemini AI clinical content generation.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.aiGenerationEnabled}
              onChange={(e) => setSettings({ ...settings, aiGenerationEnabled: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Razorpay Payments</div>
              <div className="text-[11px] text-slate-500">Accept checkout & Pro Pass subscriptions.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.paymentsEnabled}
              onChange={(e) => setSettings({ ...settings, paymentsEnabled: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Push & Email Notifications</div>
              <div className="text-[11px] text-slate-500">Dispatch automated study reminders.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>
        </div>

        {/* Global Announcement Banner Input */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-3">
          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Global System Announcement Banner Text</span>
          </div>
          <input
            type="text"
            value={settings.systemAnnouncement}
            onChange={(e) => setSettings({ ...settings, systemAnnouncement: e.target.value })}
            placeholder="e.g. NEET PG 2026 Test Series is live now! Enroll today."
            className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
