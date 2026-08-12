'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AdvancedSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // System Reset Modal states
  const [resetModal, setResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  const [form, setForm] = useState({
    maintenanceMode: false,
    debugMode: false,
    queryCacheEnabled: true,
    connectionPoolLimit: 20,
    rateLimitingLimit: 100,
    allowedCorsOrigins: '*',
    auditLogsLevel: 'info',
  });

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings/advanced');
      const json = await res.json();
      if (json.success) {
        setForm(json.settings);
      } else {
        setError(json.error || 'Failed to load advanced settings');
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
      const res = await fetch('/api/admin/settings/advanced', {
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

  const handleSystemResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmText !== 'RESET CONFIGURATIONS') {
      alert('Confirmation word is incorrect.');
      return;
    }

    setResetting(true);
    try {
      const res = await fetch('/api/admin/settings/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_system_configurations' }),
      });
      const json = await res.json();
      if (json.success) {
        alert('System configuration parameters reverted successfully to canonical seeds.');
        setResetModal(false);
        setResetConfirmText('');
        loadSettings();
      } else {
        alert(json.error || 'Failed to perform system reset.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred during system reset.');
    } finally {
      setResetting(false);
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
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl relative">
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>Advanced system and infrastructure parameters updated.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* API Rate Limits */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Inbound API Limits & CORS
          </h2>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rate Limit Ceiling (Requests/Min)</label>
            <input
              type="number"
              required
              min={10}
              max={1000}
              value={form.rateLimitingLimit}
              onChange={(e) => setForm({ ...form, rateLimitingLimit: parseInt(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allowed CORS Origins</label>
            <input
              type="text"
              required
              value={form.allowedCorsOrigins}
              onChange={(e) => setForm({ ...form, allowedCorsOrigins: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Log Trace Level</label>
            <select
              value={form.auditLogsLevel}
              onChange={(e) => setForm({ ...form, auditLogsLevel: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="debug">DEBUG (Verbose Trace)</option>
              <option value="info">INFO (General Operations)</option>
              <option value="warn">WARN (Failures & Handshakes)</option>
              <option value="error">ERROR (Critical Crashes Only)</option>
            </select>
          </div>
        </div>

        {/* Database & Caching parameters */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Cache & Connection Parameters
          </h2>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DB Connection Pool limit</label>
            <input
              type="number"
              required
              min={5}
              max={100}
              value={form.connectionPoolLimit}
              onChange={(e) => setForm({ ...form, connectionPoolLimit: parseInt(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Active Global Query Caching</div>
              <p className="text-[10px] text-slate-500">Cache SELECT outputs on memory layers.</p>
            </div>
            <input
              type="checkbox"
              checked={form.queryCacheEnabled}
              onChange={(e) => setForm({ ...form, queryCacheEnabled: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Verbose Debugging Mode</div>
              <p className="text-[10px] text-slate-500">Enable verbose developer logs on server routes.</p>
            </div>
            <input
              type="checkbox"
              checked={form.debugMode}
              onChange={(e) => setForm({ ...form, debugMode: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>
        </div>
      </div>

      {/* Emergency Danger Block */}
      <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/20 space-y-4">
        <div>
          <h2 className="text-sm font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Emergency Danger Zone</span>
          </h2>
          <p className="text-[10px] text-slate-400 mt-1 leading-normal">
            Reverting settings system wipes all customized adjustments across all categories (branding, payments, SEO, integrations) back to their canonical initial seed configurations in the database.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setResetModal(true)}
          className="p-3 px-5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-black transition-all flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Configuration Database</span>
        </button>
      </div>

      {/* Shared Actions bar */}
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
          <span>Save Advanced Parameters</span>
        </button>
      </div>

      {/* Double Prompt Confirmation Modal overlay */}
      {resetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
              <div>
                <h3 className="font-heading font-black text-sm text-slate-900 dark:text-white">Critical: Double-Prompt System Safeguard</h3>
                <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                  You are about to clear all 14 categories of custom system settings and restore them to their fresh installation defaults. This action is irreversible.
                </p>
              </div>
            </div>

            <form onSubmit={handleSystemResetSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  To confirm, type <strong className="text-rose-500 font-black">RESET CONFIGURATIONS</strong> below:
                </label>
                <input
                  type="text"
                  required
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESET CONFIGURATIONS"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-gray-800 text-xs text-rose-400 placeholder-rose-900/30 font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    setResetModal(false);
                    setResetConfirmText('');
                  }}
                  className="p-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting || resetConfirmText !== 'RESET CONFIGURATIONS'}
                  className="p-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-black transition-all flex items-center gap-1.5"
                >
                  {resetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Execute Hard Revert</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </form>
  );
}
