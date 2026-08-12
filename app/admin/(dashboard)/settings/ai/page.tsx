'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, RotateCcw, Cpu, Sliders, Shield, Zap, Activity } from 'lucide-react';

export default function AISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string; latency?: number }>>({});
  
  const [form, setForm] = useState({
    aiEnabled: true,
    aiTutorEnabled: true,
    mcqGenerationEnabled: true,
    notesGenerationEnabled: true,
    flashcardGenerationEnabled: true,
    revisionGenerationEnabled: true,
    defaultProvider: 'Google Gemini AI',
    defaultModel: 'gemini-3.5-flash',
    fallbackProvider: 'OpenAI',
    fallbackModel: 'gpt-4o-mini',
    maxOutputTokens: 2048,
    timeoutSeconds: 30,
    retryCount: 3,
    costProtectionEnabled: true,
    creditSystemEnabled: true,
    batchGenerationEnabled: true,
    contextCachingEnabled: true,
    modelRoutingEnabled: true,
  });

  const [providers, setProviders] = useState([
    { id: 'gemini', name: 'Google Gemini', environment: 'Production', configured: true, status: 'Active', cost: 'Low ($0.075 / 1M input)', lastHealth: 'Healthy', lastSuccess: 'Just Now', lastFailure: 'None' },
    { id: 'openai', name: 'OpenAI GPT-Mini', environment: 'Sandbox', configured: true, status: 'Standby', cost: 'Balanced ($0.15 / 1M input)', lastHealth: 'Healthy', lastSuccess: '10 min ago', lastFailure: 'None' },
  ]);

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings/ai');
      const json = await res.json();
      if (json.success) {
        setForm(json.settings);
      } else {
        setError(json.error || 'Failed to load AI settings');
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
      const res = await fetch('/api/admin/settings/ai', {
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

  const handleTestConnection = async (providerId: string) => {
    setTesting(providerId);
    setTestResult((prev) => ({ ...prev, [providerId]: { success: false, message: 'Initiating secure handshake...' } }));
    try {
      // Direct call to provider test endpoint which executes the client test server-side
      const res = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_provider', providerId }),
      });
      const json = await res.json();
      setTestResult((prev) => ({
        ...prev,
        [providerId]: {
          success: json.success,
          message: json.message || (json.success ? 'Secure handshaking successful!' : 'Connection rejected.'),
          latency: json.latency,
        },
      }));
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [providerId]: { success: false, message: err.message || 'Inbound timeout.' },
      }));
    } finally {
      setTesting(null);
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
          <span>AI core configurations saved and connected to centralized routing engine.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Provider API credentials test section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>AI Providers Connectivity & Testing</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((p) => (
            <div key={p.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-gray-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{p.name}</div>
                  <div className="text-[10px] text-slate-500">{p.environment} • {p.cost}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${p.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  {p.status.toUpperCase()}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 grid grid-cols-2 gap-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-900">
                <div>Health: <strong className="text-emerald-500">{p.lastHealth}</strong></div>
                <div>Last Success: <strong className="text-slate-300">{p.lastSuccess}</strong></div>
                <div>Configured: <strong className="text-slate-300">Credentials Masked</strong></div>
                <div>Last Failure: <strong className="text-slate-500">{p.lastFailure}</strong></div>
              </div>

              {testResult[p.id] && (
                <div className={`p-2 rounded-xl text-[10px] font-bold ${testResult[p.id].success ? 'bg-emerald-500/5 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/5 text-rose-400 border border-rose-500/10'}`}>
                  {testResult[p.id].message} {testResult[p.id].latency && `(${testResult[p.id].latency}ms)`}
                </div>
              )}

              <button
                type="button"
                disabled={testing !== null}
                onClick={() => handleTestConnection(p.id)}
                className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
              >
                {testing === p.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-[#6D5BFF]" />}
                <span>Test Connection</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Core AI Engines Switches */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            AI Service Switches
          </h2>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Centralized AI Enabled</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Toggle all automated AI features globally.</p>
            </div>
            <input
              type="checkbox"
              checked={form.aiEnabled}
              onChange={(e) => setForm({ ...form, aiEnabled: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">AI Tutor Enabled</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Allow virtual tutor interaction sidebar.</p>
            </div>
            <input
              type="checkbox"
              checked={form.aiTutorEnabled}
              onChange={(e) => setForm({ ...form, aiTutorEnabled: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Inference MCQ Generation</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Unlocks clinical case question generators.</p>
            </div>
            <input
              type="checkbox"
              checked={form.mcqGenerationEnabled}
              onChange={(e) => setForm({ ...form, mcqGenerationEnabled: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Notes, Flashcards & Revision</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Allow summaries and space repetition cards generation.</p>
            </div>
            <input
              type="checkbox"
              checked={form.notesGenerationEnabled}
              onChange={(e) => setForm({
                ...form,
                notesGenerationEnabled: e.target.checked,
                flashcardGenerationEnabled: e.target.checked,
                revisionGenerationEnabled: e.target.checked
              })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>
        </div>

        {/* Model Routing Configurations */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Model Routing & Limits
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default Provider</label>
              <select
                value={form.defaultProvider}
                onChange={(e) => setForm({ ...form, defaultProvider: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="Google Gemini AI">Google Gemini AI</option>
                <option value="OpenAI">OpenAI Engine</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default Model</label>
              <input
                type="text"
                required
                value={form.defaultModel}
                onChange={(e) => setForm({ ...form, defaultModel: e.target.value })}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fallback Provider</label>
              <select
                value={form.fallbackProvider}
                onChange={(e) => setForm({ ...form, fallbackProvider: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="OpenAI">OpenAI Engine</option>
                <option value="Google Gemini AI">Google Gemini AI</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fallback Model</label>
              <input
                type="text"
                required
                value={form.fallbackModel}
                onChange={(e) => setForm({ ...form, fallbackModel: e.target.value })}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Max Output</label>
              <input
                type="number"
                required
                value={form.maxOutputTokens}
                onChange={(e) => setForm({ ...form, maxOutputTokens: parseInt(e.target.value) })}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Timeout (s)</label>
              <input
                type="number"
                required
                value={form.timeoutSeconds}
                onChange={(e) => setForm({ ...form, timeoutSeconds: parseInt(e.target.value) })}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Retries</label>
              <input
                type="number"
                required
                value={form.retryCount}
                onChange={(e) => setForm({ ...form, retryCount: parseInt(e.target.value) })}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Cost & Guardrails */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Financial Guardrails & Ledger Options
          </h2>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Active Credit System</div>
              <p className="text-[10px] text-slate-500">Require credits deduction on all learner AI jobs.</p>
            </div>
            <input
              type="checkbox"
              checked={form.creditSystemEnabled}
              onChange={(e) => setForm({ ...form, creditSystemEnabled: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">AI Cost Circuit Breaker</div>
              <p className="text-[10px] text-slate-500">Throttle requests immediately on anomalies/spikes.</p>
            </div>
            <input
              type="checkbox"
              checked={form.costProtectionEnabled}
              onChange={(e) => setForm({ ...form, costProtectionEnabled: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>
        </div>

        {/* Caching and Optimization */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Speed & Token Optimization
          </h2>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Active Context Caching</div>
              <p className="text-[10px] text-slate-500">Stores prompt contexts to reduce token bills (Gemini).</p>
            </div>
            <input
              type="checkbox"
              checked={form.contextCachingEnabled}
              onChange={(e) => setForm({ ...form, contextCachingEnabled: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Margin Model Routing</div>
              <p className="text-[10px] text-slate-500">Route automatically by remaining margin guidelines.</p>
            </div>
            <input
              type="checkbox"
              checked={form.modelRoutingEnabled}
              onChange={(e) => setForm({ ...form, modelRoutingEnabled: e.target.checked })}
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
          <span>Save AI Settings</span>
        </button>
      </div>
    </form>
  );
}
