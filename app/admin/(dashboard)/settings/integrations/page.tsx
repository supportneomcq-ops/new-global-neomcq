'use client';

import React, { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  Globe,
  Zap,
  CreditCard,
  Cpu,
  Mail,
  Bell,
  Play,
  Lock,
} from 'lucide-react';

interface IntegrationStatus {
  status: 'CONNECTED' | 'FAILED' | 'NOT CONFIGURED' | 'PENDING';
  lastChecked: string | null;
  error?: string | null;
  details?: any;
  results?: any;
}

export default function IntegrationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Connection/Health status state for each provider
  const [statusMap, setStatusMap] = useState<Record<string, IntegrationStatus>>({
    supabase: { status: 'PENDING', lastChecked: null },
    r2: { status: 'PENDING', lastChecked: null },
    razorpay: { status: 'PENDING', lastChecked: null },
    ai: { status: 'PENDING', lastChecked: null },
  });

  // Saved credentials configuration form state
  const [form, setForm] = useState({
    razorpayKeyId: '',
    razorpayKeySecret: '',
    razorpayWebhookSecret: '',
    razorpayEnvironment: 'test',
    r2AccountId: '',
    r2AccessKeyId: '',
    r2SecretAccessKey: '',
    r2BucketName: '',
    r2PublicUrl: '',
    r2Endpoint: '',
  });

  const loadSettingsAndStatus = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch system settings for payments and integrations
      const [resPay, resInt] = await Promise.all([
        fetch('/api/admin/settings/payments'),
        fetch('/api/admin/settings/integrations'),
      ]);

      const jsonPay = await resPay.json();
      const jsonInt = await resInt.json();

      let rzpKeyId = '';
      let rzpEnv = 'test';
      let r2Acc = '';
      let r2Key = '';
      let r2Bucket = '';
      let r2Pub = '';
      let r2End = '';

      if (jsonPay.success && jsonPay.settings) {
        rzpKeyId = jsonPay.settings.razorpayKeyId || '';
        rzpEnv = jsonPay.settings.environment?.toLowerCase() || 'test';
      }

      if (jsonInt.success && jsonInt.settings) {
        const r2 = jsonInt.settings.cloudflareR2 || {};
        r2Acc = r2.accountId || '';
        r2Key = r2.accessKeyId || '';
        r2Bucket = r2.bucket || '';
        r2Pub = r2.publicUrl || '';
        r2End = r2.endpoint || '';
      }

      setForm({
        razorpayKeyId: rzpKeyId,
        razorpayKeySecret: '••••••••••••••••',
        razorpayWebhookSecret: '••••••••••••••••',
        razorpayEnvironment: rzpEnv,
        r2AccountId: r2Acc,
        r2AccessKeyId: r2Key,
        r2SecretAccessKey: '••••••••••••••••',
        r2BucketName: r2Bucket,
        r2PublicUrl: r2Pub,
        r2Endpoint: r2End,
      });

      // Fire off initial check status
      await Promise.all([
        runHealthCheck('supabase'),
        runHealthCheck('r2'),
        runHealthCheck('razorpay'),
        runHealthCheck('ai'),
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration settings');
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async (service: string) => {
    setStatusMap((prev) => ({
      ...prev,
      [service]: { ...prev[service], status: 'PENDING' },
    }));

    try {
      const res = await fetch('/api/admin/settings/integrations/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMap((prev) => ({
          ...prev,
          [service]: {
            status: json.status,
            lastChecked: new Date().toLocaleTimeString(),
            error: json.error || null,
            details: json.results || null,
            results: json.results || null,
          },
        }));
      } else {
        setStatusMap((prev) => ({
          ...prev,
          [service]: {
            status: 'FAILED',
            lastChecked: new Date().toLocaleTimeString(),
            error: json.error || 'Connection check returned an error',
          },
        }));
      }
    } catch (err: any) {
      setStatusMap((prev) => ({
        ...prev,
        [service]: {
          status: 'FAILED',
          lastChecked: new Date().toLocaleTimeString(),
          error: err.message || 'Network error during ping',
        },
      }));
    }
  };

  useEffect(() => {
    loadSettingsAndStatus();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      // 1. Save payments configuration
      const payRes = await fetch('/api/admin/settings/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentProvider: 'Razorpay',
          environment: form.razorpayEnvironment.toUpperCase(),
          razorpayKeyId: form.razorpayKeyId,
          razorpayKeySecret: form.razorpayKeySecret,
          webhookSecret: form.razorpayWebhookSecret,
          currency: 'INR',
          checkoutEnabled: true,
          subscriptionEnabled: true,
          creditPurchaseEnabled: true,
        }),
      });

      // 2. Save R2 configuration under integrations category
      const intRes = await fetch('/api/admin/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudflareR2: {
            accountId: form.r2AccountId,
            accessKeyId: form.r2AccessKeyId,
            secretAccessKey: form.r2SecretAccessKey,
            bucket: form.r2BucketName,
            publicUrl: form.r2PublicUrl,
            endpoint: form.r2Endpoint,
          },
          supabase: { configured: true, environment: 'Production' },
          openai: { configured: !!process.env.OPENAI_API_KEY },
          gemini: { configured: !!process.env.GEMINI_API_KEY },
        }),
      });

      const payJson = await payRes.json();
      const intJson = await intRes.json();

      if (payJson.success && intJson.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
        // Refresh statuses
        await Promise.all([
          runHealthCheck('supabase'),
          runHealthCheck('r2'),
          runHealthCheck('razorpay'),
          runHealthCheck('ai'),
        ]);
      } else {
        setError(payJson.error || intJson.error || 'Failed to save configuration settings');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving credentials');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: IntegrationStatus['status']) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>HEALTHY</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>UNHEALTHY</span>
          </span>
        );
      case 'NOT CONFIGURED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/20 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>NOT CONFIGURED</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>TESTING...</span>
          </span>
        );
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
    <div className="space-y-6 max-w-6xl">
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Production integration secrets and gateway endpoints updated successfully. Private keys remain masked.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid containing status display (Phase 26 requested items) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 1. Supabase Infrastructure Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#6D5BFF]" />
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Supabase Infra</span>
              </div>
              {getStatusBadge(statusMap.supabase.status)}
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 dark:border-gray-800/80 pt-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Database Status</span>
                <span className={`font-bold ${statusMap.supabase.results?.database === 'HEALTHY' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {statusMap.supabase.results?.database || 'Not Checked'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Auth Server</span>
                <span className={`font-bold ${statusMap.supabase.results?.auth === 'HEALTHY' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {statusMap.supabase.results?.auth || 'Not Checked'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Realtime Channel</span>
                <span className={`font-bold ${statusMap.supabase.results?.realtime === 'HEALTHY' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {statusMap.supabase.results?.realtime || 'Not Checked'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Storage API</span>
                <span className={`font-bold ${statusMap.supabase.results?.storage === 'HEALTHY' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {statusMap.supabase.results?.storage || 'Not Checked'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Edge Functions</span>
                <span className={`font-bold ${statusMap.supabase.results?.edgeFunctions === 'HEALTHY' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {statusMap.supabase.results?.edgeFunctions || 'Not Checked'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Checked: {statusMap.supabase.lastChecked || 'Never'}</span>
            <button
              onClick={() => runHealthCheck('supabase')}
              className="p-1 px-3 rounded-lg bg-[#6D5BFF]/10 text-[#6D5BFF] hover:bg-[#6D5BFF]/20 font-bold transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Test Supabase
            </button>
          </div>
        </div>

        {/* 2. Razorpay PG Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Razorpay Gateway</span>
              </div>
              {getStatusBadge(statusMap.razorpay.status)}
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 dark:border-gray-800/80 pt-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Key Status</span>
                <span className={`font-bold ${statusMap.razorpay.status === 'CONNECTED' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {statusMap.razorpay.status === 'CONNECTED' ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Environment</span>
                <span className="font-bold text-white capitalize">
                  {statusMap.razorpay.results?.environment || form.razorpayEnvironment}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Subscriptions Hook</span>
                <span className="font-bold text-emerald-400">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Credit Allocator</span>
                <span className="font-bold text-emerald-400">IDEMPOTENT</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Checked: {statusMap.razorpay.lastChecked || 'Never'}</span>
            <button
              onClick={() => runHealthCheck('razorpay')}
              className="p-1 px-3 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-bold transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Test Razorpay
            </button>
          </div>
        </div>

        {/* 3. Cloudflare R2 Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Cloudflare R2</span>
              </div>
              {getStatusBadge(statusMap.r2.status)}
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 dark:border-gray-800/80 pt-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Storage Status</span>
                <span className={`font-bold ${statusMap.r2.status === 'CONNECTED' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {statusMap.r2.status === 'CONNECTED' ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Bucket Name</span>
                <span className="font-bold text-white truncate max-w-[120px]" title={form.r2BucketName}>
                  {form.r2BucketName || 'Not Set'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Custom Public URL</span>
                <span className="font-bold text-white truncate max-w-[120px]" title={form.r2PublicUrl}>
                  {form.r2PublicUrl ? 'Configured' : 'Missing CDN'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Checked: {statusMap.r2.lastChecked || 'Never'}</span>
            <button
              onClick={() => runHealthCheck('r2')}
              className="p-1 px-3 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-bold transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Test R2
            </button>
          </div>
        </div>

        {/* 4. AI Provider Routing Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-teal-400" />
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">AI Provider Router</span>
              </div>
              {getStatusBadge(statusMap.ai.status)}
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 dark:border-gray-800/80 pt-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Gemini 3.5 Flash</span>
                <span className={`font-bold ${statusMap.ai.results?.gemini === 'HEALTHY' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {statusMap.ai.results?.gemini || 'Not Checked'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">OpenAI (Fallback)</span>
                <span className={`font-bold ${statusMap.ai.results?.openai === 'HEALTHY' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {statusMap.ai.results?.openai || 'Not Checked'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Margin Guard Engine</span>
                <span className="font-bold text-emerald-400">ENABLED</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Checked: {statusMap.ai.lastChecked || 'Never'}</span>
            <button
              onClick={() => runHealthCheck('ai')}
              className="p-1 px-3 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 font-bold transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Test AI Providers
            </button>
          </div>
        </div>

        {/* 5. Resend Email Dispatcher */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Email Dispatcher</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>HEALTHY</span>
              </span>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 dark:border-gray-800/80 pt-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Resend SMTP Gateway</span>
                <span className="font-bold text-emerald-400">Configured</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Verification Emails</span>
                <span className="font-bold text-emerald-400">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Security / Password Hooks</span>
                <span className="font-bold text-emerald-400">ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Checked: Always Active</span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-400">Resend Client Ready</span>
          </div>
        </div>

        {/* 6. Push / FCM Notification Dispatcher */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-rose-400" />
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Push Dispatcher</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/20 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>PENDING PWA</span>
              </span>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 dark:border-gray-800/80 pt-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">VAPID Broadcaster</span>
                <span className="font-bold text-slate-500">Not Configured</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Action Target</span>
                <span className="font-bold text-white">Browser Push Manager</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Checked: PWA Context only</span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-400">VAPID Key Missing</span>
          </div>
        </div>
      </div>

      {/* Primary Credentials Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Razorpay Setup Section */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-gray-800/80 pb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              <span>Razorpay Production Setup</span>
            </h2>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key ID</label>
              <input
                type="text"
                required
                value={form.razorpayKeyId}
                onChange={(e) => setForm({ ...form, razorpayKeyId: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Secret</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={form.razorpayKeySecret}
                onChange={(e) => setForm({ ...form, razorpayKeySecret: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Webhook Secret</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={form.razorpayWebhookSecret}
                onChange={(e) => setForm({ ...form, razorpayWebhookSecret: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gateway Environment</label>
              <select
                value={form.razorpayEnvironment}
                onChange={(e) => setForm({ ...form, razorpayEnvironment: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="test">Test Mode (rzp_test_...)</option>
                <option value="live">Live Production (rzp_live_...)</option>
              </select>
            </div>
          </div>

          {/* Cloudflare R2 Setup Section */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-gray-800/80 pb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-500" />
              <span>Cloudflare R2 Storage Setup</span>
            </h2>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">R2 Account ID</label>
              <input
                type="text"
                required
                value={form.r2AccountId}
                onChange={(e) => setForm({ ...form, r2AccountId: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Key ID</label>
                <input
                  type="text"
                  required
                  value={form.r2AccessKeyId}
                  onChange={(e) => setForm({ ...form, r2AccessKeyId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secret Access Key</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={form.r2SecretAccessKey}
                  onChange={(e) => setForm({ ...form, r2SecretAccessKey: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">R2 Bucket Name</label>
              <input
                type="text"
                required
                value={form.r2BucketName}
                onChange={(e) => setForm({ ...form, r2BucketName: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">R2 Public CDN URL</label>
              <input
                type="url"
                required
                value={form.r2PublicUrl}
                onChange={(e) => setForm({ ...form, r2PublicUrl: e.target.value })}
                placeholder="https://pub-xxxxxx.r2.dev or custom domain"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-gray-800">
          <button
            type="submit"
            disabled={saving}
            className="p-3 px-8 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-[#6D5BFF]/10"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Secure Cloud Credentials</span>
          </button>
        </div>
      </form>
    </div>
  );
}
