'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ShieldCheck,
  RefreshCw,
  Zap,
  Key,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Server,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

interface ProviderKey {
  id: string;
  provider: string;
  label: string;
  maskedKey: string;
  status: string;
  health: string;
}

interface AIProvider {
  id: 'gemini' | 'openai';
  name: string;
  isPrimary: boolean;
  defaultModel: string;
  supportedModels: string[];
  activeModelsCount: number;
  totalModelsCount: number;
  keysCount: number;
  activeKeysCount: number;
  health: 'Healthy' | 'Degraded' | 'Unavailable' | 'Not Configured';
  configuredStatus: 'Configured' | 'Not Configured';
  maskedKey: string | null;
  latencyMs: number | null;
  lastHealthCheck: string | null;
  keys: ProviderKey[];
}

interface TestResult {
  provider: string;
  success: boolean;
  latencyMs?: number | null;
  message: string;
  health: string;
  modelTested?: string;
  testedAt?: string;
}

export default function AdminAIProvidersPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-providers');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch AI providers');

      setProviders(json.providers || []);
    } catch (err: any) {
      console.error('Error loading AI providers:', err);
      setError(err.message || 'Failed to load AI providers');
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
      const res = await fetch('/api/admin/ai-providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });
      const data = await res.json();

      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          provider: providerId,
          success: data.success && data.connected,
          latencyMs: data.latencyMs,
          message: data.connected
            ? `Connected to ${providerId.toUpperCase()} in ${data.latencyMs}ms (${data.modelTested || 'default model'})`
            : data.errorMessage || data.error || 'Connection failed',
          health: data.health || (data.connected ? 'HEALTHY' : 'UNAVAILABLE'),
          modelTested: data.modelTested,
          testedAt: data.testedAt || new Date().toISOString(),
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          provider: providerId,
          success: false,
          message: err.message || 'Network error during ping',
          health: 'UNAVAILABLE',
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleVerifyAllModels = async () => {
    setVerifyingAll(true);
    setVerifyMessage(null);
    try {
      const res = await fetch('/api/admin/ai-models/verify', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Model verification failed');

      setVerifyMessage(
        `Discovered & Verified: ${data.verifiedCount} active models. (${data.unavailableCount} unavailable/offline).`
      );
      await fetchProviders();
    } catch (err: any) {
      setVerifyMessage(`Verification error: ${err.message}`);
    } finally {
      setVerifyingAll(false);
    }
  };

  const configuredCount = providers.filter((p) => p.configuredStatus === 'Configured').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Cpu className="w-7 h-7 text-[#6D5BFF]" />
            AI Providers & Live Connectivity
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Production server-side AI provider integrations (Google Gemini & OpenAI).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyAllModels}
            disabled={verifyingAll}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-2 text-xs font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
          >
            {verifyingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-200" />
            )}
            <span>{verifyingAll ? 'Verifying Models...' : 'Discover & Verify Models'}</span>
          </button>

          <button
            onClick={fetchProviders}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-2 text-xs font-semibold"
            title="Refresh Provider Status"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Verification Feedback Banner */}
      {verifyMessage && (
        <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>{verifyMessage}</span>
          </div>
          <button
            onClick={() => setVerifyMessage(null)}
            className="text-xs text-indigo-400 hover:text-white underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Architecture & Security Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Strict Server-Side Secret Management</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Provider credentials (<code className="text-indigo-300 font-mono">GEMINI_API_KEY</code>,{' '}
              <code className="text-indigo-300 font-mono">OPENAI_API_KEY</code>) are securely read from server environment variables. Plaintext secrets are never stored in the database or rendered to the client.
            </p>
          </div>
        </div>

        <Link
          href="/admin/ai-models"
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all"
        >
          <span>Task Routing Matrix</span>
          <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
          <span className="text-xs font-medium text-slate-400">Active Providers</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-white">{configuredCount}</span>
            <span className="text-xs font-medium text-slate-400">/ 2 Production Providers</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
          <span className="text-xs font-medium text-slate-400">Primary Provider</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-base font-black text-emerald-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Google Gemini
            </span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
          <span className="text-xs font-medium text-slate-400">Failover Redundancy</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-base font-black text-indigo-400 flex items-center gap-1.5">
              <Server className="w-4 h-4" /> OpenAI API
            </span>
          </div>
        </div>
      </div>

      {/* Loading & Error State */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-2xl border border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-[#6D5BFF]" />
          <p className="text-sm text-slate-400 mt-2">Checking provider integrations...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Providers Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {providers.map((p) => {
            const test = testResults[p.id];
            const isConfigured = p.configuredStatus === 'Configured';

            return (
              <div
                key={p.id}
                className={`bg-slate-900/90 border rounded-2xl p-6 space-y-5 relative flex flex-col justify-between ${
                  p.isPrimary
                    ? 'border-indigo-500/60 shadow-lg shadow-indigo-500/10'
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
                        Automated Fallback
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-white">{p.name}</h3>

                  {/* Properties List */}
                  <div className="mt-4 space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400">Default Workhorse Model</span>
                      <span className="font-mono font-bold text-indigo-300">{p.defaultModel}</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400">Verified Active Models</span>
                      <span className="font-bold text-white">
                        {p.activeModelsCount ?? p.supportedModels.length} models active
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400">Candidate Supported Models</span>
                      <span className="font-mono text-slate-300 text-right text-[11px] max-w-[260px] truncate">
                        {p.supportedModels.join(', ')}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-400">Server Environment Credential</span>
                      <span className="font-mono text-xs text-slate-300 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        {p.maskedKey ? (
                          <span className="text-indigo-300 font-semibold">{p.maskedKey}</span>
                        ) : (
                          <span className="text-slate-500">Not set in process.env</span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">Provider Health</span>
                      <span
                        className={`font-bold flex items-center gap-1 ${
                          isConfigured ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {isConfigured ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                        )}
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
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{test.message}</p>
                      {test.latencyMs && (
                        <span className="font-mono text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
                          {test.latencyMs}ms
                        </span>
                      )}
                    </div>
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
                        : `Run Live Benchmark Ping (${p.id.toUpperCase()})`}
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
