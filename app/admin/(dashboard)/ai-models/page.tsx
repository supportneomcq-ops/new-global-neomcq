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
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Zap,
  Server,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';

interface TaskRouting {
  id?: string;
  task_type: string;
  display_name?: string;
  description?: string;
  primary_provider: 'gemini' | 'openai';
  primary_model: string;
  fallback_provider: 'gemini' | 'openai';
  fallback_model: string;
  max_input_tokens?: number;
  max_output_tokens?: number;
  credit_cost: number;
  temperature: number;
  enabled: boolean;
}

interface ModelItem {
  id: string;
  provider: 'gemini' | 'openai';
  model: string;
  display_name?: string;
  input_cost_per_1m: number;
  cached_input_cost_per_1m: number;
  output_cost_per_1m: number;
  active: boolean;
  verification_status?: 'verified' | 'unverified' | 'unavailable' | 'deprecated';
  last_verified_at?: string | null;
  latency_ms?: number | null;
  supports_text?: boolean;
  supports_image?: boolean;
  supports_reasoning?: boolean;
  supports_structured_output?: boolean;
  max_input_tokens?: number;
  max_output_tokens?: number;
  currency: string;
}

export default function AdminAIModelsPage() {
  const [activeTab, setActiveTab] = useState<'routing' | 'models'>('routing');
  const [loading, setLoading] = useState(true);
  const [routing, setRouting] = useState<TaskRouting[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-models');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load AI models and routing');

      setRouting(json.routing || []);
      setModels(json.pricing || json.models || []);
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

  const handleVerifyModels = async () => {
    setVerifying(true);
    setSuccessMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-models/verify', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Model verification failed');

      setSuccessMsg(
        `Live Verification Complete: ${data.verifiedCount} models verified online, ${data.unavailableCount} marked inactive.`
      );
      await fetchData();
    } catch (err: any) {
      setError(`Verification error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleUpdateRouting = async (item: TaskRouting) => {
    setSavingId(item.task_type);
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

  const handleUpdateModel = async (item: ModelItem) => {
    setSavingId(item.id);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_model',
          provider: item.provider,
          model: item.model,
          input_cost_per_1m: item.input_cost_per_1m,
          cached_input_cost_per_1m: item.cached_input_cost_per_1m,
          output_cost_per_1m: item.output_cost_per_1m,
          active: item.active,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update model settings');

      setSuccessMsg(`Model ${item.model} saved successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const geminiActiveModels = models.filter((m) => m.provider === 'gemini' && m.active);
  const openaiActiveModels = models.filter((m) => m.provider === 'openai' && m.active);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-[#6D5BFF]" />
            AI Task Routing & Verified Models
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Canonical task routing matrix, provider failover hierarchies, and token COGS pricing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyModels}
            disabled={verifying}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-2 text-xs font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
          >
            {verifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-200" />
            )}
            <span>{verifying ? 'Verifying Provider APIs...' : 'Discover & Verify Models'}</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-2 text-xs font-semibold"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm">
        <button
          onClick={() => setActiveTab('routing')}
          className={`pb-3 font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'routing'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Task Routing Matrix ({routing.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`pb-3 font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'models'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Model Registry & Token Pricing ({models.length})</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab 1: Task Routing Matrix */}
      {activeTab === 'routing' && !loading && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              All generative requests pass through this routing matrix. If the primary provider fails due to rate limits or transient errors, the AI Gateway automatically falls back to the configured secondary provider.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {routing.map((item, idx) => {
              const isSaving = savingId === item.task_type;

              return (
                <div
                  key={item.task_type || idx}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-white">{item.task_type}</span>
                        <button
                          onClick={() => {
                            const updated = { ...item, enabled: !item.enabled };
                            setRouting((prev) =>
                              prev.map((r) => (r.task_type === item.task_type ? updated : r))
                            );
                            handleUpdateRouting(updated);
                          }}
                          className="flex items-center cursor-pointer"
                        >
                          {item.enabled ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Enabled
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-500 border border-slate-700">
                              Disabled
                            </span>
                          )}
                        </button>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleUpdateRouting(item)}
                      disabled={isSaving}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all self-end md:self-auto cursor-pointer"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Rule</span>
                    </button>
                  </div>

                  {/* Routing Grid Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    {/* Primary Provider & Model */}
                    <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Zap className="w-3 h-3 text-indigo-400" /> Primary Provider
                      </label>
                      <select
                        value={item.primary_provider}
                        onChange={(e) => {
                          const prov = e.target.value as 'gemini' | 'openai';
                          const defaultM =
                            prov === 'gemini'
                              ? geminiActiveModels[0]?.model || 'gemini-3.5-flash'
                              : openaiActiveModels[0]?.model || 'gpt-4o-mini';
                          setRouting((prev) =>
                            prev.map((r) =>
                              r.task_type === item.task_type
                                ? { ...r, primary_provider: prov, primary_model: defaultM }
                                : r
                            )
                          );
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-medium focus:border-indigo-500"
                      >
                        <option value="gemini">Google Gemini (Primary)</option>
                        <option value="openai">OpenAI API</option>
                      </select>

                      <div className="pt-1">
                        <label className="text-[10px] text-slate-400">Primary Model</label>
                        <select
                          value={item.primary_model}
                          onChange={(e) =>
                            setRouting((prev) =>
                              prev.map((r) =>
                                r.task_type === item.task_type
                                  ? { ...r, primary_model: e.target.value }
                                  : r
                              )
                            )
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-indigo-300 font-mono font-semibold"
                        >
                          {(item.primary_provider === 'gemini'
                            ? geminiActiveModels
                            : openaiActiveModels
                          ).map((m) => (
                            <option key={m.model} value={m.model}>
                              {m.model}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Fallback Provider & Model */}
                    <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3 text-amber-400" /> Failover Fallback
                      </label>
                      <select
                        value={item.fallback_provider}
                        onChange={(e) => {
                          const prov = e.target.value as 'gemini' | 'openai';
                          const defaultM =
                            prov === 'openai'
                              ? openaiActiveModels[0]?.model || 'gpt-4o-mini'
                              : geminiActiveModels[0]?.model || 'gemini-3.5-flash';
                          setRouting((prev) =>
                            prev.map((r) =>
                              r.task_type === item.task_type
                                ? { ...r, fallback_provider: prov, fallback_model: defaultM }
                                : r
                            )
                          );
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-medium focus:border-indigo-500"
                      >
                        <option value="openai">OpenAI API (Fallback)</option>
                        <option value="gemini">Google Gemini</option>
                      </select>

                      <div className="pt-1">
                        <label className="text-[10px] text-slate-400">Fallback Model</label>
                        <select
                          value={item.fallback_model}
                          onChange={(e) =>
                            setRouting((prev) =>
                              prev.map((r) =>
                                r.task_type === item.task_type
                                  ? { ...r, fallback_model: e.target.value }
                                  : r
                              )
                            )
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-amber-300 font-mono font-semibold"
                        >
                          {(item.fallback_provider === 'gemini'
                            ? geminiActiveModels
                            : openaiActiveModels
                          ).map((m) => (
                            <option key={m.model} value={m.model}>
                              {m.model}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Credit Cost & Temperature */}
                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase">
                          Credit Cost (User Charge)
                        </label>
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={item.credit_cost}
                            onChange={(e) =>
                              setRouting((prev) =>
                                prev.map((r) =>
                                  r.task_type === item.task_type
                                    ? { ...r, credit_cost: parseFloat(e.target.value) || 0 }
                                    : r
                                )
                              )
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                          />
                          <span className="text-slate-400 font-medium">cr</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase">
                          Temperature ({item.temperature})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={item.temperature}
                          onChange={(e) =>
                            setRouting((prev) =>
                              prev.map((r) =>
                                r.task_type === item.task_type
                                  ? { ...r, temperature: parseFloat(e.target.value) || 0.7 }
                                  : r
                              )
                            )
                          }
                          className="w-full mt-1.5 accent-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Output Tokens Limit */}
                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase">
                          Max Output Tokens
                        </label>
                        <input
                          type="number"
                          step="512"
                          min="256"
                          max="16384"
                          value={item.max_output_tokens || 4096}
                          onChange={(e) =>
                            setRouting((prev) =>
                              prev.map((r) =>
                                r.task_type === item.task_type
                                  ? { ...r, max_output_tokens: parseInt(e.target.value) || 4096 }
                                  : r
                              )
                            )
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono mt-1"
                        />
                      </div>

                      <div className="pt-2">
                        <span className="text-[10px] text-slate-500">
                          Estimated COGS: ~${((item.credit_cost * 0.01) * 0.4).toFixed(4)} USD
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Model Registry & Token Pricing */}
      {activeTab === 'models' && !loading && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Standard token rates in USD per 1 Million tokens. Used for real COGS calculation, margin alerting, and financial ledgers.
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Provider / Model</th>
                  <th className="p-4">Verification</th>
                  <th className="p-4">Input Cost / 1M</th>
                  <th className="p-4">Cached Input / 1M</th>
                  <th className="p-4">Output Cost / 1M</th>
                  <th className="p-4">Capabilities</th>
                  <th className="p-4">Active</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {models.map((m) => {
                  const isSaving = savingId === m.id;
                  const isVerified = m.verification_status === 'verified';

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Model & Provider */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              m.provider === 'gemini'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {m.provider}
                          </span>
                          <div>
                            <p className="font-bold text-white text-xs">{m.model}</p>
                            {m.display_name && (
                              <p className="text-[10px] text-slate-400 font-sans">{m.display_name}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Verification Status */}
                      <td className="p-4">
                        {isVerified ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" /> {m.verification_status || 'Unverified'}
                          </span>
                        )}
                        {m.latency_ms && (
                          <span className="text-[10px] text-slate-500 block mt-1">
                            {m.latency_ms}ms ping
                          </span>
                        )}
                      </td>

                      {/* Input Cost */}
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <span>$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={m.input_cost_per_1m}
                            onChange={(e) =>
                              setModels((prev) =>
                                prev.map((item) =>
                                  item.id === m.id
                                    ? { ...item, input_cost_per_1m: parseFloat(e.target.value) || 0 }
                                    : item
                                )
                              )
                            }
                            className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                      </td>

                      {/* Cached Input Cost */}
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <span>$</span>
                          <input
                            type="number"
                            step="0.005"
                            min="0"
                            value={m.cached_input_cost_per_1m}
                            onChange={(e) =>
                              setModels((prev) =>
                                prev.map((item) =>
                                  item.id === m.id
                                    ? {
                                        ...item,
                                        cached_input_cost_per_1m:
                                          parseFloat(e.target.value) || 0,
                                      }
                                    : item
                                )
                              )
                            }
                            className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                      </td>

                      {/* Output Cost */}
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <span>$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={m.output_cost_per_1m}
                            onChange={(e) =>
                              setModels((prev) =>
                                prev.map((item) =>
                                  item.id === m.id
                                    ? { ...item, output_cost_per_1m: parseFloat(e.target.value) || 0 }
                                    : item
                                )
                              )
                            }
                            className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                      </td>

                      {/* Capabilities */}
                      <td className="p-4 font-sans">
                        <div className="flex flex-wrap gap-1">
                          {m.supports_reasoning && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold">
                              Reasoning
                            </span>
                          )}
                          {m.supports_structured_output && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-bold">
                              JSON
                            </span>
                          )}
                          {m.supports_image && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-bold">
                              Vision
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Active Toggle */}
                      <td className="p-4">
                        <button
                          onClick={() => {
                            const updated = { ...m, active: !m.active };
                            setModels((prev) =>
                              prev.map((item) => (item.id === m.id ? updated : item))
                            );
                            handleUpdateModel(updated);
                          }}
                          className="flex items-center cursor-pointer"
                        >
                          {m.active ? (
                            <ToggleRight className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleUpdateModel(m)}
                          disabled={isSaving}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] border border-slate-700 flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          <span>Save</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
