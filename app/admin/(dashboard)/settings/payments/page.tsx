'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, RotateCcw, CreditCard, ShieldCheck } from 'lucide-react';

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    paymentProvider: 'Razorpay',
    environment: 'TEST',
    currency: 'USD',
    checkoutEnabled: true,
    subscriptionEnabled: true,
    creditPurchaseEnabled: true,
    refundEnabled: true,
    webhookEnabled: true,
    webhookStatus: 'active',
    lastSuccessfulPayment: 'N/A',
    lastFailedPayment: 'None',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    webhookSecret: '',
  });

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings/payments');
      const json = await res.json();
      if (json.success) {
        setForm(json.settings);
      } else {
        setError(json.error || 'Failed to load payment settings');
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
      const res = await fetch('/api/admin/settings/payments', {
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
          <span>Payment settings successfully saved. Secrets remain securely stored on the server.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Gateway Credentials */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#6D5BFF]" />
            <span>Gateway Credentials</span>
          </h2>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Provider</label>
            <select
              value={form.paymentProvider}
              onChange={(e) => setForm({ ...form, paymentProvider: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Razorpay">Razorpay Gateway</option>
              <option value="Stripe">Stripe API (Disabled)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Environment</label>
              <select
                value={form.environment}
                onChange={(e) => setForm({ ...form, environment: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="TEST">TEST mode</option>
                <option value="LIVE">LIVE production</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base Currency</label>
              <input
                type="text"
                required
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Razorpay Key ID</label>
            <input
              type="text"
              required
              value={form.razorpayKeyId}
              onChange={(e) => setForm({ ...form, razorpayKeyId: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Razorpay Key Secret</label>
            <input
              type="password"
              placeholder="••••••••••••••••"
              value={form.razorpayKeySecret}
              onChange={(e) => setForm({ ...form, razorpayKeySecret: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Operational Switches & Webhooks */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Payment Control Switches
            </h2>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">Checkout Pages Enabled</div>
                  <p className="text-[10px] text-slate-500">Allow users to reach payments.</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.checkoutEnabled}
                  onChange={(e) => setForm({ ...form, checkoutEnabled: e.target.checked })}
                  className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">Pro Subscription Purchases</div>
                  <p className="text-[10px] text-slate-500">Allow buying Pro & Ultra Passes.</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.subscriptionEnabled}
                  onChange={(e) => setForm({ ...form, subscriptionEnabled: e.target.checked })}
                  className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">Credit Pack Add-ons</div>
                  <p className="text-[10px] text-slate-500">Allow topping up AI credits ($2, $5, $10, $9.99).</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.creditPurchaseEnabled}
                  onChange={(e) => setForm({ ...form, creditPurchaseEnabled: e.target.checked })}
                  className="w-5 h-5 rounded cursor-pointer accent-[#6D5BFF]"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-gray-800/80 text-[10px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300 uppercase tracking-wider text-[9px] mb-1">Live Webhook Status</div>
            <div>Webhook URL: <span className="font-mono text-[#6D5BFF]">https://neomcq.com/api/webhooks/razorpay</span></div>
            <div>Sign Verification: <span className="text-emerald-500 font-bold">Enabled</span></div>
            <div>Last Successful Event: <span className="text-slate-200">{form.lastSuccessfulPayment || 'N/A'}</span></div>
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
          <span>Reset Credentials</span>
        </button>

        <button
          type="submit"
          disabled={saving}
          className="p-2.5 px-6 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-[#6D5BFF]/10"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Payment Settings</span>
        </button>
      </div>
    </form>
  );
}
