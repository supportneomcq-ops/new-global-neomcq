'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  Activity,
  RefreshCw,
  Lock,
  Loader2,
  Key,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface ProviderKey {
  id: string;
  provider: string;
  label: string;
  maskedKey: string;
  source: string;
  status: string;
  health: string;
}

interface Provider {
  id: 'gemini' | 'openai';
  name: string;
  isPrimary: boolean;
  defaultModel: string;
  supportedModels: string[];
  keysCount: number;
  activeKeysCount: number;
  health: 'Healthy' | 'Degraded' | 'Unavailable' | 'Not Configured';
  configuredStatus: 'Configured' | 'Not Configured';
  keys: ProviderKey[];
}

export default function AdminAIProvidersPage() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-providers');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load AI providers');

      setProviders(json.providers || []);
    } catch (err: any) {
      console.error('Error fetching providers:', err);
      setError(err.message || 'Failed to fetch AI provider settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleTestConnection = async (providerId: string) => {
    setTestingId(providerId);
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_provider', providerId }),
      });
      const json = await res.json();

      setTestResults((prev) => ({
        ...prev,
        [providerId]: json,
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: { success: false, message: `Benchmark test failed: ${err.message}` },
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Sliders className="w-7 h-7 text-[#6D5BFF]" />
            AI Providers Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Production AI Provider Gateway (Google Gemini & OpenAI) with multi-key rotation and live latency benchmarks.
          </p>
        </div>

        <button
          onClick={fetchProviders}
          className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Security Credentials Vault Info */}
      <div className="bg-slate-900 border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <p>
            <strong className="text-white">Server-Side Multi-Key Vault:</strong> Provider API credentials are held strictly in server-side memory and Cloud Run secrets. Raw keys are never serialized or sent to the browser.
          </p>
        </div>
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase text-[10px] flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secured
        </span>
      </div>

      {/* Providers Grid */}
      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#6D5BFF]">
            Inspecting Provider Key Vault & Health...
          </span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 space-y-2 bg-slate-900/60 border border-rose-500/20 rounded-xl">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {providers.map((p) => {
            const test = testResults[p.id];
            const isConfigured = p.configuredStatus === 'Configured';

            return (
              <div
                key={p.id}
                className={`bg-slate-900/90 border rounded-2xl p-6 space-y-5 relative flex flex-col justify-between ${
                  p.isPrimary
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-800'
                }`}
              >
                <div>
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isConfigured
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {p.configuredStatus}
                    </span>

                    {p.isPrimary ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-indigo-400" />
                        Primary Provider
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                        Secondary Fallback
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-white">{p.name}</h3>

                  {/* Properties List */}
                  <div className="mt-4 space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400">Default Model</span>
                      <span className="font-mono font-bold text-indigo-300">{p.defaultModel}</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400">Supported Models</span>
                      <span className="font-mono text-slate-300 text-right">
                        {p.supportedModels.join(', ')}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400">Configured API Keys</span>
                      <span className="font-bold text-white flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        {p.keysCount} Active Key{p.keysCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Masked Key List */}
                    {p.keys.length > 0 && (
                      <div className="border-b border-slate-800/60 pb-2 space-y-1">
                        <span className="text-[11px] text-slate-400">Key Identifiers:</span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {p.keys.map((k) => (
                            <span
                              key={k.id}
                              className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-indigo-300"
                            >
                              {k.maskedKey}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">Provider Health Status</span>
                      <span
                        className={`font-bold flex items-center gap-1 ${
                          p.health === 'Healthy'
                            ? 'text-emerald-400'
                            : p.health === 'Degraded'
                            ? 'text-amber-400'
                            : p.health === 'Not Configured'
                            ? 'text-slate-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {p.health === 'Healthy' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {p.health === 'Not Configured' && <AlertCircle className="w-3.5 h-3.5" />}
                        {p.health}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Test Connection Output */}
                {test && (
                  <div
                    className={`p-3 rounded-lg border text-xs mt-3 ${
                      test.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <p className="font-semibold">{test.message}</p>
                    {test.latencyMs && (
                      <p className="text-[11px] mt-1 opacity-80 font-mono">
                        Measured latency: {test.latencyMs}ms | Health: {test.health}
                      </p>
                    )}
                  </div>
                )}

                {/* Test Action Button */}
                <div className="pt-4 border-t border-slate-800/80 mt-4">
                  <button
                    onClick={() => handleTestConnection(p.id)}
                    disabled={testingId === p.id || !isConfigured}
                    className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {testingId === p.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    ) : (
                      <Activity className="w-4 h-4 text-indigo-400" />
                    )}
                    <span>
                      {!isConfigured
                        ? 'Key Not Configured in Environment'
                        : 'Run Live Connectivity & Benchmark Ping'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
