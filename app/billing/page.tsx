'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AUTHORITATIVE_PLANS, PlanCode, PlanDefinition } from '@/lib/plans/plan-config';
import { UserEntitlements, DEFAULT_FREE_ENTITLEMENTS } from '@/lib/entitlements/entitlements';
import { usePlanCheckout } from '@/lib/checkout/use-plan-checkout';
import {
  CreditCard,
  Crown,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  ChevronLeft,
  Infinity as InfinityIcon,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [entitlements, setEntitlements] = useState<UserEntitlements>(DEFAULT_FREE_ENTITLEMENTS());
  const [payments, setPayments] = useState<any[]>([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { checkoutPlan, isProcessing, activePlanCode, statusMessage, errorMessage } = usePlanCheckout();

  const fetchBillingData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subscriptions/me');
      if (res.status === 401) {
        router.push('/auth/sign-in?redirect=/billing');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSubscription(data.subscription);
        if (data.entitlements) setEntitlements(data.entitlements);
        if (data.payments) setPayments(data.payments);
      }
    } catch (err) {
      console.error('Error loading billing:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleCancelSubscription = async () => {
    setCancelling(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/subscriptions/cancel', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({
          type: 'success',
          text: 'Subscription scheduled to cancel at the end of the billing period.',
        });
        setCancelModalOpen(false);
        fetchBillingData();
      } else {
        throw new Error(data.error || 'Failed to cancel subscription.');
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Error cancelling subscription.' });
    } finally {
      setCancelling(false);
    }
  };

  const handleUpgrade = (code: PlanCode) => {
    checkoutPlan(code, {
      onSuccess: () => {
        setActionMessage({ type: 'success', text: `Successfully upgraded to ${code} plan!` });
        fetchBillingData();
      },
    });
  };

  const currentPlanCode = entitlements.planCode;
  const isPaid = entitlements.isPaid && entitlements.isActive;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070A13] text-slate-900 dark:text-slate-100 selection:bg-[#6D5BFF]/30">
      {/* Top Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0E1324]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#6D5BFF]" />
              <h1 className="font-heading font-black text-lg text-slate-900 dark:text-white">
                Billing & Membership
              </h1>
            </div>
          </div>

          <Link
            href="/"
            className="text-xs font-bold text-[#6D5BFF] dark:text-[#8E7CFF] hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Action Messages */}
        {actionMessage && (
          <div
            className={`p-4 rounded-2xl text-sm font-medium text-center ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-medium text-center">
            {errorMessage}
          </div>
        )}

        {isProcessing && statusMessage && (
          <div className="p-4 rounded-2xl bg-[#6D5BFF]/10 border border-[#6D5BFF]/30 text-[#6D5BFF] dark:text-[#8E7CFF] text-sm font-medium flex items-center justify-center gap-3 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            {statusMessage}
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-[#6D5BFF] mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-500">Loading your subscription details...</p>
          </div>
        ) : (
          <>
            {/* Current Active Plan Status Card */}
            <div className="rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Plan</span>
                    <span
                      className={`px-3 py-0.5 rounded-full text-xs font-extrabold ${
                        currentPlanCode === 'ELITE'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : currentPlanCode === 'MAX'
                          ? 'bg-[#6D5BFF]/20 text-[#6D5BFF] dark:text-[#8E7CFF] border border-[#6D5BFF]/30'
                          : currentPlanCode === 'PRO'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {entitlements.planName}
                    </span>
                    {isPaid && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {currentPlanCode === 'ELITE' && <Crown className="w-7 h-7 text-amber-500" />}
                    {currentPlanCode === 'MAX' && <Zap className="w-6 h-6 text-[#6D5BFF]" />}
                    {entitlements.planName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentPlanCode === 'ELITE'
                      ? '$499.00 USD / Year • Truly Unlimited Platform Access & Free Exam Switches'
                      : currentPlanCode === 'MAX'
                      ? '$19.99 USD / Month • Clinical Reasoning & Audio Explanations'
                      : currentPlanCode === 'PRO'
                      ? '$9.99 USD / Month • Essential MCQ Practice & High-Yield Notes'
                      : 'Free Trial • Upgrade to unlock high-yield clinical question banks and AI tutoring.'}
                  </p>
                </div>

                {isPaid && (
                  <div className="text-right sm:text-right space-y-1">
                    <p className="text-xs text-slate-400">
                      {subscription?.cancel_at_period_end ? 'Access Expires On' : 'Next Billing Date'}
                    </p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {entitlements.currentPeriodEnd
                        ? new Date(entitlements.currentPeriodEnd).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'Active'}
                    </p>
                    {subscription?.cancel_at_period_end && (
                      <p className="text-[11px] font-bold text-rose-500">Cancels at period end</p>
                    )}
                  </div>
                )}
              </div>

              {/* Entitlement Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Exam Switching Fee
                  </span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {currentPlanCode === 'ELITE' ? (
                      <span className="text-emerald-500 font-black">FREE ($0.00)</span>
                    ) : (
                      '$2.00 USD per switch'
                    )}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    AI Compute Quota
                  </span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {currentPlanCode === 'ELITE' ? (
                      <span className="text-amber-500 font-black flex items-center gap-1">
                        <InfinityIcon className="w-4 h-4" /> Truly Unlimited
                      </span>
                    ) : currentPlanCode === 'MAX' ? (
                      '350 questions / day'
                    ) : currentPlanCode === 'PRO' ? (
                      '100 questions / day'
                    ) : (
                      '50 questions / day'
                    )}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Audio (TTS) Explanations
                  </span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {entitlements.canAccessTtsAudio ? (
                      <span className="text-emerald-500 font-bold">Enabled</span>
                    ) : (
                      <span className="text-slate-400">Available on Max & Elite</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Actions: Cancel or Upgrade */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <Link
                  href="/pricing"
                  className="text-xs font-bold text-[#6D5BFF] dark:text-[#8E7CFF] flex items-center gap-1 hover:underline"
                >
                  View all plan features & comparisons <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                {isPaid && !subscription?.cancel_at_period_end && (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>

            {/* Upgrade Options (If not Elite) */}
            {currentPlanCode !== 'ELITE' && (
              <div className="space-y-4">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Available Upgrades
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentPlanCode !== 'MAX' && (
                    <div className="rounded-3xl bg-white dark:bg-[#0E1324] border border-[#6D5BFF]/40 p-6 flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#6D5BFF] uppercase tracking-wider">
                            Upgrade to Max
                          </span>
                          <span className="text-lg font-black text-slate-900 dark:text-white">$19.99 / mo</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                          Unlock audio explanations, advanced clinical diagnostic reasoning, and 350 questions/day.
                        </p>
                      </div>
                      <button
                        onClick={() => handleUpgrade('MAX')}
                        disabled={isProcessing}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#6D5BFF] hover:bg-[#5B4AE0] text-white text-xs font-bold transition-colors cursor-pointer text-center"
                      >
                        {isProcessing && activePlanCode === 'MAX' ? 'Processing...' : 'Upgrade to Max ($19.99/mo)'}
                      </button>
                    </div>
                  )}

                  <div className="rounded-3xl bg-gradient-to-b from-amber-500/10 to-transparent bg-white dark:bg-[#0E1324] border-2 border-amber-500/50 p-6 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" /> Upgrade to Elite (1-Year)
                        </span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">$499.00 / yr</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                        Truly unlimited platform access for 365 days with <strong>FREE exam curriculum switching</strong> and zero credit caps.
                      </p>
                    </div>
                    <button
                      onClick={() => handleUpgrade('ELITE')}
                      disabled={isProcessing}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 text-white text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer text-center"
                    >
                      {isProcessing && activePlanCode === 'ELITE' ? 'Processing...' : 'Upgrade to Elite ($499/yr)'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment History */}
            <div className="rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Payment History</h3>

              {payments.length === 0 ? (
                <p className="text-xs text-slate-500">No payment transactions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                        <th className="pb-3">Transaction ID</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 font-mono text-[11px] text-slate-500">
                            {p.razorpay_payment_id || p.id}
                          </td>
                          <td className="py-3">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 font-bold">
                            {p.currency || 'USD'} ${Number(p.amount).toFixed(2)}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === 'captured'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Cancellation Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cancel Subscription?</h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Your subscription will remain active until{' '}
              <strong>
                {entitlements.currentPeriodEnd
                  ? new Date(entitlements.currentPeriodEnd).toLocaleDateString()
                  : 'the end of your current billing cycle'}
              </strong>
              . After this date, you will lose access to premium AI features and will not be charged again.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
