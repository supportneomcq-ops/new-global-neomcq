'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, RotateCcw, Smartphone, ShieldCheck, Activity } from 'lucide-react';

interface AuditItem {
  key: string;
  label: string;
  url: string;
  status: 'pending' | 'checking' | 'pass' | 'fail';
  message?: string;
}

export default function PWASettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditTimestamp, setAuditTimestamp] = useState<string | null>(null);

  const [auditItems, setAuditItems] = useState<AuditItem[]>([
    { key: 'manifest', label: 'Web Manifest (/manifest.webmanifest)', url: '/manifest.webmanifest', status: 'pending' },
    { key: 'sw', label: 'Service Worker (/sw.js)', url: '/sw.js', status: 'pending' },
    { key: 'icon192', label: '192x192 Icon (/icon-192.png)', url: '/icon-192.png', status: 'pending' },
    { key: 'icon512', label: '512x512 Icon (/icon-512.png)', url: '/icon-512.png', status: 'pending' },
    { key: 'maskable', label: 'Maskable Icon (/icon-512-maskable.png)', url: '/icon-512-maskable.png', status: 'pending' },
    { key: 'favicon', label: 'Favicon (/favicon.ico)', url: '/favicon.ico', status: 'pending' },
    { key: 'apple', label: 'Apple Touch Icon (/apple-touch-icon.png)', url: '/apple-touch-icon.png', status: 'pending' },
    { key: 'offline', label: 'Offline Fallback Page (/offline)', url: '/offline', status: 'pending' },
  ]);

  const [form, setForm] = useState({
    pwaEnabled: true,
    name: 'NeoMCQ — Global Exam Preparation',
    shortName: 'NeoMCQ',
    description: 'AI-Powered Global Exam Preparation & Learning Platform',
    startUrl: '/',
    display: 'standalone',
    orientation: 'portrait',
    themeColor: '#090D1E',
    backgroundColor: '#090D1E',
    icon192: '/icon-192.png',
    icon512: '/icon-512.png',
  });

  const runPwaAudit = async () => {
    setAuditRunning(true);
    const updated = [...auditItems];

    for (let i = 0; i < updated.length; i++) {
      updated[i].status = 'checking';
      setAuditItems([...updated]);

      try {
        const res = await fetch(updated[i].url, { method: 'HEAD' });
        if (res.ok) {
          updated[i].status = 'pass';
          updated[i].message = `HTTP ${res.status} OK`;
        } else {
          updated[i].status = 'fail';
          updated[i].message = `HTTP ${res.status}`;
        }
      } catch (err: any) {
        updated[i].status = 'fail';
        updated[i].message = err.message || 'Fetch failed';
      }

      setAuditItems([...updated]);
    }

    setAuditTimestamp(new Date().toLocaleTimeString());
    setAuditRunning(false);
  };

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings/pwa');
      const json = await res.json();
      if (json.success) {
        setForm({ ...form, ...json.settings });
      } else {
        setError(json.error || 'Failed to load PWA settings');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    runPwaAudit();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/admin/settings/pwa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setForm({ ...form, ...json.settings });
        setTimeout(() => setSuccess(false), 3000);
        runPwaAudit();
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

  const allPassed = auditItems.every((item) => item.status === 'pass');

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>PWA manifest attributes successfully updated. Manifest cache cleared.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* PWA Audit & Health Check Panel */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#00D4FF]" />
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Production PWA System Health Check
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-gray-400">
                Verifies manifest endpoints, service worker file, icons, and offline fallback route.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {auditTimestamp && (
              <span className="text-[10px] text-slate-400 font-mono">
                Last Audit: {auditTimestamp}
              </span>
            )}

            <button
              type="button"
              onClick={runPwaAudit}
              disabled={auditRunning}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all flex items-center gap-1.5"
            >
              <Activity className={`w-3.5 h-3.5 ${auditRunning ? 'animate-spin text-[#00D4FF]' : ''}`} />
              <span>{auditRunning ? 'Auditing...' : 'Run Audit'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {auditItems.map((item) => (
            <div
              key={item.key}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{item.label}</p>
                <p className="text-[9px] font-mono text-slate-400">{item.message || 'Pending check'}</p>
              </div>

              <div>
                {item.status === 'pass' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    PASS
                  </span>
                )}
                {item.status === 'fail' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    FAIL
                  </span>
                )}
                {item.status === 'checking' && (
                  <RefreshCw className="w-3.5 h-3.5 text-[#00D4FF] animate-spin" />
                )}
                {item.status === 'pending' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                    WAIT
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">PWA Installability Status:</span>
          {allPassed ? (
            <span className="font-extrabold text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> 100% Ready (Chromium / Safari / Edge / Android)
            </span>
          ) : (
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Audit Warning — Check Failed Assets Above
            </span>
          )}
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#6D5BFF]" />
            <span>Enable Progressive Web App (PWA) Mode</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-gray-400">Allows offline MCQ practice, installation prompts on Android/iOS/Desktop Chrome, and home-screen shortcut launch capabilities.</p>
        </div>
        <input
          type="checkbox"
          checked={form.pwaEnabled}
          onChange={(e) => setForm({ ...form, pwaEnabled: e.target.checked })}
          className="w-5.5 h-5.5 rounded cursor-pointer accent-[#6D5BFF] shrink-0"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Core Manifest Info */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Manifest Presentation Info
          </h2>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PWA Full Name</label>
            <input
              type="text"
              required
              disabled={!form.pwaEnabled}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white disabled:opacity-50 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Short App Name</label>
            <input
              type="text"
              required
              disabled={!form.pwaEnabled}
              value={form.shortName}
              onChange={(e) => setForm({ ...form, shortName: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white disabled:opacity-50 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">App Manifest Description</label>
            <textarea
              rows={2}
              disabled={!form.pwaEnabled}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white disabled:opacity-50 focus:outline-none"
            />
          </div>
        </div>

        {/* Display Frame Modes */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            App Launch Parameters
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Display Mode</label>
              <select
                disabled={!form.pwaEnabled}
                value={form.display}
                onChange={(e) => setForm({ ...form, display: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="standalone">Standalone App Frame</option>
                <option value="fullscreen">Fullscreen Canvas</option>
                <option value="minimal-ui">Minimal UI</option>
                <option value="browser">Standard Browser Tab</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orientation</label>
              <select
                disabled={!form.pwaEnabled}
                value={form.orientation}
                onChange={(e) => setForm({ ...form, orientation: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="any">Flexible (Any)</option>
                <option value="portrait">Lock Portrait</option>
                <option value="landscape">Lock Landscape</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Theme Color</label>
              <input
                type="text"
                disabled={!form.pwaEnabled}
                value={form.themeColor}
                onChange={(e) => setForm({ ...form, themeColor: e.target.value })}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Splash Bg Color</label>
              <input
                type="text"
                disabled={!form.pwaEnabled}
                value={form.backgroundColor}
                onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start URL Route</label>
            <input
              type="text"
              disabled={!form.pwaEnabled}
              value={form.startUrl}
              onChange={(e) => setForm({ ...form, startUrl: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white disabled:opacity-50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Icons */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4 col-span-2">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            PWA Launcher Icons
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Launcher Icon Path (192x192)</label>
              <input
                type="text"
                disabled={!form.pwaEnabled}
                value={form.icon192}
                onChange={(e) => setForm({ ...form, icon192: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Launcher Icon Path (512x512)</label>
              <input
                type="text"
                disabled={!form.pwaEnabled}
                value={form.icon512}
                onChange={(e) => setForm({ ...form, icon512: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 disabled:opacity-50"
              />
            </div>
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
          <span>Save PWA Assets</span>
        </button>
      </div>
    </form>
  );
}

