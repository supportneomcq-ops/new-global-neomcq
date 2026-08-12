'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    inApp: true,
    email: true,
    push: false,
    studyReminder: true,
    paymentNotification: true,
    securityNotification: true,
    announcement: true,
    marketingNotification: false,
  });

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings/notifications');
      const json = await res.json();
      if (json.success) {
        setForm(json.settings);
      } else {
        setError(json.error || 'Failed to load notification settings');
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
      const res = await fetch('/api/admin/settings/notifications', {
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
          <span>Notification dispatch parameters saved and applied.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Delivery Channels */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Active Dissemination Channels
          </h2>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">In-App Notifications</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Render alerts inside active learner dashboard.</p>
            </div>
            <input
              type="checkbox"
              checked={form.inApp}
              onChange={(e) => setForm({ ...form, inApp: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Email Notification Triggers</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Allow dispatching summary emails to mailboxes.</p>
            </div>
            <input
              type="checkbox"
              checked={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Push Notifications (Mobile)</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Dispatch mobile app notification prompts.</p>
            </div>
            <input
              type="checkbox"
              checked={form.push}
              onChange={(e) => setForm({ ...form, push: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>
        </div>

        {/* Content Subjects */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Dispatched Topics
          </h2>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Study Reminders</div>
              <p className="text-[10px] text-slate-500">Nudge inactive users on streak risks.</p>
            </div>
            <input
              type="checkbox"
              checked={form.studyReminder}
              onChange={(e) => setForm({ ...form, studyReminder: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Payment & Subscription Invoices</div>
              <p className="text-[10px] text-slate-500">Dispatch billing outcomes immediately.</p>
            </div>
            <input
              type="checkbox"
              checked={form.paymentNotification}
              onChange={(e) => setForm({ ...form, paymentNotification: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Security Alerts</div>
              <p className="text-[10px] text-slate-500">Send password change alerts and login notices.</p>
            </div>
            <input
              type="checkbox"
              checked={form.securityNotification}
              onChange={(e) => setForm({ ...form, securityNotification: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Announcements & Releases</div>
              <p className="text-[10px] text-slate-500">Notify users of exam date announcements and feature releases.</p>
            </div>
            <input
              type="checkbox"
              checked={form.announcement}
              onChange={(e) => setForm({ ...form, announcement: e.target.checked })}
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
          <span>Reset Settings</span>
        </button>

        <button
          type="submit"
          disabled={saving}
          className="p-2.5 px-6 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-[#6D5BFF]/10"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Notification Settings</span>
        </button>
      </div>
    </form>
  );
}
