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
  Cpu,
  Coins,
  ShieldAlert,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface TaskRouting {
  id: string;
  task_type: string;
  primary_provider: string;
  primary_model: string;
  fallback_provider: string;
  fallback_model: string;
  max_input_tokens: number;
  max_output_tokens: number;
  credit_cost: number;
  temperature: number;
  enabled: boolean;
}

interface ModelPricing {
  id: string;
  provider: string;
  model: string;
  input_cost_per_1m: number;
  cached_input_cost_per_1m: number;
  output_cost_per_1m: number;
  active: boolean;
  currency: string;
}

export default function AdminAIModelsPage() {
  const [activeTab, setActiveTab] = useState<'routing' | 'pricing'>('routing');
  const [loading, setLoading] = useState(true);
  const [routing, setRouting] = useState<TaskRouting[]>([]);
  const [pricing, setPricing] = useState<ModelPricing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-models');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load AI models and routing');

      setRouting(json.routing || []);
      setPricing(json.pricing || []);
    } catch (err: any) {
      console.error('Error fetching models:', err);
      setError(err.message || 'Failed to fetch AI models settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateRouting = async (item: TaskRouting) => {
    setSavingId(item.id);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_routing', ...item }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update routing rule');

      setSuccessMsg(`Routing for ${item.task_type} saved successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdatePricing = async (item: ModelPricing) => {
    setSavingId(item.id);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_pricing', ...item }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update pricing rule');

      setSuccessMsg(`Pricing for ${item.model} saved successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-[#6D5BFF]" />
            AI Task Routing & Model Pricing
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Canonical task routing matrix, provider failover hierarchies, and token COGS pricing.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          <span>Sync Rules</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm">
        <button
          onClick={() => setActiveTab('routing')}
          className={`pb-3 font-bold transition-all flex items-center gap-2 ${
            activeTab === 'routing'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Task Routing Matrix ({routing.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`pb-3 font-bold transition-all flex items-center gap-2 ${
            activeTab === 'pricing'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Model COGS Pricing ({pricing.length})</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#6D5BFF]">
            Loading Model Configurations...
          </span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 space-y-2 bg-slate-900 border border-rose-500/20 rounded-xl">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : activeTab === 'routing' ? (
        /* Routing Table */
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-700/60">
                <tr>
                  <th className="py-3.5 px-4">Task Type</th>
                  <th className="py-3.5 px-4">Primary Model</th>
                  <th className="py-3.5 px-4">Fallback Model</th>
                  <th className="py-3.5 px-4">Credit Cost</th>
                  <th className="py-3.5 px-4">Temp</th>
                  <th className="py-3.5 px-4">Max Tokens</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {routing.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white font-mono">{item.task_type}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={item.primary_model}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRouting((prev) =>
                            prev.map((r) =>
                              r.id === item.id
                                ? {
                                    ...r,
                                    primary_model: val,
                                    primary_provider: val.includes('gemini') ? 'Google Gemini AI' : 'OpenAI',
                                  }
                                : r
                            )
                          );
                        }}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-indigo-300 font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="gemini-3.7-flash">gemini-3.7-flash (Gemini Reasoning)</option>
                        <option value="gemini-3.6-flash">gemini-3.6-flash (Gemini Refresh)</option>
                        <option value="gemini-3.5-flash">gemini-3.5-flash (Gemini Standard)</option>
                        <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Gemini Lite)</option>
                        <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Gemini Ultra-Lite)</option>
                        <option value="gpt-5.4-mini">gpt-5.4-mini (OpenAI Reasoning)</option>
                        <option value="gpt-5.4-nano">gpt-5.4-nano (OpenAI Economy)</option>
                        <option value="gpt-5-mini">gpt-5-mini (OpenAI Fallback)</option>
                        <option value="gpt-5-nano">gpt-5-nano (OpenAI Fallback)</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={item.fallback_model}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRouting((prev) =>
                            prev.map((r) =>
                              r.id === item.id
                                ? {
                                    ...r,
                                    fallback_model: val,
                                    fallback_provider: val.includes('gemini') ? 'Google Gemini AI' : 'OpenAI',
                                  }
                                : r
                            )
                          );
                        }}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="gpt-5.4-mini">gpt-5.4-mini (OpenAI Reasoning)</option>
                        <option value="gpt-5.4-nano">gpt-5.4-nano (OpenAI Economy)</option>
                        <option value="gemini-3.7-flash">gemini-3.7-flash (Gemini Reasoning)</option>
                        <option value="gemini-3.6-flash">gemini-3.6-flash (Gemini Refresh)</option>
                        <option value="gemini-3.5-flash">gemini-3.5-flash (Gemini Standard)</option>
                        <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Gemini Lite)</option>
                        <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Gemini Ultra-Lite)</option>
                        <option value="gpt-5-mini">gpt-5-mini (OpenAI Fallback)</option>
                        <option value="gpt-5-nano">gpt-5-nano (OpenAI Fallback)</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={item.credit_cost}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setRouting((prev) =>
                            prev.map((r) => (r.id === item.id ? { ...r, credit_cost: val } : r))
                          );
                        }}
                        className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-amber-400 font-bold text-xs"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={item.temperature}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0.7;
                          setRouting((prev) =>
                            prev.map((r) => (r.id === item.id ? { ...r, temperature: val } : r))
                          );
                        }}
                        className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs font-mono"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="number"
                        step="512"
                        min="256"
                        max="16384"
                        value={item.max_output_tokens}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 2048;
                          setRouting((prev) =>
                            prev.map((r) => (r.id === item.id ? { ...r, max_output_tokens: val } : r))
                          );
                        }}
                        className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs font-mono"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => {
                          setRouting((prev) =>
                            prev.map((r) => (r.id === item.id ? { ...r, enabled: !r.enabled } : r))
                          );
                        }}
                        className="flex items-center gap-1.5"
                      >
                        {item.enabled ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 text-[10px] font-bold">
                            Disabled
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleUpdateRouting(item)}
                        disabled={savingId === item.id}
                        className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] disabled:opacity-50 inline-flex items-center gap-1 transition-all"
                      >
                        {savingId === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        <span>Save</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Pricing Table */
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-700/60">
                <tr>
                  <th className="py-3.5 px-4">Provider</th>
                  <th className="py-3.5 px-4">Model ID</th>
                  <th className="py-3.5 px-4">Input Cost / 1M</th>
                  <th className="py-3.5 px-4">Cached Input / 1M</th>
                  <th className="py-3.5 px-4">Output Cost / 1M</th>
                  <th className="py-3.5 px-4">Active</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pricing.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{p.provider}</td>
                    <td className="py-3.5 px-4 font-mono text-indigo-300 font-bold">{p.model}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.001"
                          value={p.input_cost_per_1m}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPricing((prev) =>
                              prev.map((item) =>
                                item.id === p.id ? { ...item, input_cost_per_1m: val } : item
                              )
                            );
                          }}
                          className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.001"
                          value={p.cached_input_cost_per_1m || 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPricing((prev) =>
                              prev.map((item) =>
                                item.id === p.id ? { ...item, cached_input_cost_per_1m: val } : item
                              )
                            );
                          }}
                          className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.001"
                          value={p.output_cost_per_1m}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPricing((prev) =>
                              prev.map((item) =>
                                item.id === p.id ? { ...item, output_cost_per_1m: val } : item
                              )
                            );
                          }}
                          className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => {
                          setPricing((prev) =>
                            prev.map((item) =>
                              item.id === p.id ? { ...item, active: !item.active } : item
                            )
                          );
                        }}
                        className="flex items-center"
                      >
                        {p.active ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 text-[10px] font-bold">
                            Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleUpdatePricing(p)}
                        disabled={savingId === p.id}
                        className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] disabled:opacity-50 inline-flex items-center gap-1 transition-all"
                      >
                        {savingId === p.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        <span>Save</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
