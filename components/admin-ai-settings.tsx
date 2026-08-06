'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Key,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Save,
  Activity
} from 'lucide-react';

export function AdminAISettings() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latency?: number }>>({});
  const [saveMessage, setSaveMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai-settings');
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.error('Failed to load AI providers settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleTestConnection = async (providerId: string, apiKey?: string) => {
    setTestingId(providerId);
    setTestResults((prev) => ({ ...prev, [providerId]: { success: false, message: 'Testing connection...' } }));
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_provider', providerId, apiKey }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: data.success,
          message: data.message || (data.success ? 'Connected!' : 'Connection failed'),
          latency: data.latency,
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: { success: false, message: err.message || 'Network error' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    setSaveMessage('');
    setErrorMessage('');
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_providers', providersData: providers }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage('AI Provider Settings saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const updateProviderField = (index: number, field: string, value: any) => {
    const updated = [...providers];
    updated[index] = { ...updated[index], [field]: value };
    setProviders(updated);
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-heading font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#6D5BFF]" />
            <span>AI Model & Provider Routing Settings</span>
          </h3>
          <p className="text-slate-500">
            Configure primary inference engines, fallback order, temperature, and live API connectivity.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={loading}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white font-extrabold shadow hover:opacity-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save AI Configuration</span>
        </button>
      </div>

      {saveMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Provider List */}
      <div className="space-y-4">
        {providers.map((prov, idx) => {
          const testRes = testResults[prov.id];
          return (
            <div
              key={prov.id}
              className="p-5 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-gray-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#6D5BFF]/10 text-[#6D5BFF] flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-extrabold text-sm text-slate-900 dark:text-white">
                      {prov.name}
                    </h4>
                    <p className="text-[10px] text-slate-400">Priority #{prov.priority} Engine</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={prov.status}
                    onChange={(e) => updateProviderField(idx, 'status', e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer border ${
                      prov.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-gray-800 text-slate-500 border-slate-300 dark:border-gray-700'
                    }`}
                  >
                    <option value="Active">Active (Primary)</option>
                    <option value="Standby">Standby (Fallback)</option>
                    <option value="Disabled">Disabled</option>
                  </select>

                  <button
                    onClick={() => handleTestConnection(prov.id)}
                    disabled={testingId === prov.id}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 font-bold hover:bg-slate-200 dark:hover:bg-gray-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {testingId === prov.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6D5BFF]" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-[#00D4FF]" />
                    )}
                    <span>Test Latency</span>
                  </button>
                </div>
              </div>

              {testRes && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                    testRes.success
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  {testRes.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{testRes.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-semibold">
                <div>
                  <label className="block text-slate-500 mb-1">Target Model ID</label>
                  <input
                    type="text"
                    value={prov.model}
                    onChange={(e) => updateProviderField(idx, 'model', e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Temperature ({prov.temperature})</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={prov.temperature}
                    onChange={(e) => updateProviderField(idx, 'temperature', parseFloat(e.target.value))}
                    className="w-full mt-2 accent-[#6D5BFF]"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Max Tokens Limit</label>
                  <input
                    type="number"
                    value={prov.maxTokens}
                    onChange={(e) => updateProviderField(idx, 'maxTokens', parseInt(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
