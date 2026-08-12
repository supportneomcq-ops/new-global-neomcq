'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
} from 'lucide-react';

export default function AdminAIModelsPage() {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-models');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load AI models');

      setModels(json.models || []);
    } catch (err: any) {
      console.error('Error fetching models:', err);
      setError(err.message || 'Failed to fetch AI models settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleToggleEnabled = (id: string) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const handleSaveModels = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelsData: models }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to save model rules');

      alert('AI Models routing and fallback rules saved successfully!');
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-[#6D5BFF]" />
            AI Models Routing & Pricing
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure default models, fallback chains, context limits, and cost tiers per 1M tokens.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchModels}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <span>Sync</span>
          </button>

          <button
            onClick={handleSaveModels}
            disabled={saving}
            className="px-4 py-2.5 rounded-lg bg-[#6D5BFF] hover:bg-[#5b4aee] text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Routing Rules</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[300px]">
            <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#6D5BFF]">
              Loading AI Models Rules...
            </span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Provider / Model</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Context Limit</th>
                  <th className="py-3 px-4">Input Cost</th>
                  <th className="py-3 px-4">Output Cost</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Fallback Model</th>
                  <th className="py-3 px-4 text-right">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {models.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{m.model}</span>
                      <span className="text-[10px] text-indigo-400 font-semibold">{m.provider}</span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {m.purpose}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {m.contextLimit}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {m.costInput}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {m.costOutput}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-amber-400">
                      #{m.priority}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {m.fallback}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleEnabled(m.id)}
                        className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider transition-colors ${
                          m.enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {m.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
