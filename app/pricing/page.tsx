'use client';

import React, { useState } from 'react';
import { AUTHORITATIVE_PLANS, PlanCode } from '@/lib/plans/plan-config';
import { usePlanCheckout } from '@/lib/checkout/use-plan-checkout';
import { Header } from '@/components/header';
import { MobileMenu } from '@/components/mobile-menu';
import { InteractiveModals, ModalType } from '@/components/interactive-modals';
import {
  Check,
  Zap,
  Sparkles,
  Crown,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Clock,
  Infinity as InfinityIcon,
  Layers,
  FileText,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const { checkoutPlan, isProcessing, activePlanCode, statusMessage, errorMessage, successMessage } =
    usePlanCheckout();

  const handleCheckout = (code: PlanCode) => {
    checkoutPlan(code, { preferredCurrency: currency });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070A13] text-slate-900 dark:text-slate-100 selection:bg-[#6D5BFF]/30 transition-colors">
      <Header
        onOpenModal={(modal) => setActiveModal(modal)}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-24">
        {/* Top Header & Value Proposition */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6D5BFF]/10 dark:bg-[#6D5BFF]/20 border border-[#6D5BFF]/30 text-[#6D5BFF] dark:text-[#8E7CFF] text-xs font-bold font-mono tracking-wide uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Clear, Transparent Pricing
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
            Invest in your clinical mastery.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal">
            Choose the plan that matches your study pace. From adaptive question banks to unlimited multi-exam mastery.
          </p>

          {/* Currency Switcher */}
          <div className="mt-8 inline-flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currency === 'USD'
                  ? 'bg-white dark:bg-[#6D5BFF] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('INR')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currency === 'INR'
                  ? 'bg-white dark:bg-[#6D5BFF] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              INR (₹)
            </button>
          </div>
        </div>

        {/* Global Status / Alert Banners */}
        {errorMessage && (
          <div className="max-w-xl mx-auto mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-medium text-center">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="max-w-xl mx-auto mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium text-center">
            {successMessage}
          </div>
        )}
        {isProcessing && statusMessage && (
          <div className="max-w-xl mx-auto mb-8 p-4 rounded-2xl bg-[#6D5BFF]/10 border border-[#6D5BFF]/30 text-[#6D5BFF] dark:text-[#8E7CFF] text-sm font-medium flex items-center justify-center gap-3 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            {statusMessage}
          </div>
        )}

        {/* The EXACT 3 Canonical Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-8 items-stretch mb-20">
          {/* 1. PRO PLAN */}
          <div className="relative rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Essential
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly</span>
              </div>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Pro</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                {AUTHORITATIVE_PLANS.PRO.tagline}
              </p>

              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {currency === 'USD' ? '$9.99' : '₹849'}
                </span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/ month</span>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mb-6 space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Plan Highlights</p>
                {AUTHORITATIVE_PLANS.PRO.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleCheckout('PRO')}
              disabled={isProcessing}
              className="w-full py-3 px-4 rounded-xl border-2 border-[#6D5BFF] text-[#6D5BFF] hover:bg-[#6D5BFF] hover:text-white dark:border-[#8E7CFF] dark:text-[#8E7CFF] dark:hover:bg-[#6D5BFF] dark:hover:text-white text-sm font-bold transition-all disabled:opacity-50 cursor-pointer text-center"
            >
              {isProcessing && activePlanCode === 'PRO' ? 'Processing...' : 'Subscribe to Pro'}
            </button>
          </div>

          {/* 2. MAX PLAN (Popular) */}
          <div className="relative rounded-3xl bg-white dark:bg-[#0E1324] border-2 border-[#6D5BFF] p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-[#6D5BFF]/10 transition-shadow">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#6D5BFF] text-white text-[11px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-white" /> Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 mt-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#6D5BFF]/15 text-[#6D5BFF] dark:text-[#8E7CFF]">
                  Advanced Clinical
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly</span>
              </div>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Max</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                {AUTHORITATIVE_PLANS.MAX.tagline}
              </p>

              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {currency === 'USD' ? '$19.99' : '₹1,699'}
                </span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/ month</span>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mb-6 space-y-3">
                <p className="text-[11px] font-bold text-[#6D5BFF] dark:text-[#8E7CFF] uppercase tracking-wider">
                  Everything in Pro Plus
                </p>
                {AUTHORITATIVE_PLANS.MAX.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <Check className="w-4 h-4 text-[#6D5BFF] dark:text-[#8E7CFF] shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleCheckout('MAX')}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#6D5BFF] to-[#8E7CFF] hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-[#6D5BFF]/30 transition-all disabled:opacity-50 cursor-pointer text-center"
            >
              {isProcessing && activePlanCode === 'MAX' ? 'Processing...' : 'Subscribe to Max'}
            </button>
          </div>

          {/* 3. ELITE PLAN (Unlimited 1-Year) */}
          <div className="relative rounded-3xl bg-gradient-to-b from-amber-500/10 via-white to-white dark:from-amber-500/15 dark:via-[#0E1324] dark:to-[#0E1324] border-2 border-amber-500/60 dark:border-amber-400/50 p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-amber-500/10 transition-shadow">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] font-black tracking-wider uppercase shadow-md flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 fill-white" /> 1-Year Unlimited
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 mt-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  All-Inclusive Annual
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">365 Days</span>
              </div>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                Elite
                <InfinityIcon className="w-5 h-5 text-amber-500" />
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                {AUTHORITATIVE_PLANS.ELITE.tagline}
              </p>

              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {currency === 'USD' ? '$499' : '₹41,999'}
                </span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/ 1 year</span>
              </div>
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-6">
                Zero exam switch fees • Unlimited AI compute
              </p>

              <div className="pt-4 border-t border-amber-500/20 mb-6 space-y-3">
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Elite VIP Privileges
                </p>
                {AUTHORITATIVE_PLANS.ELITE.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 font-bold" />
                    <span className={idx === 1 ? 'font-bold text-amber-700 dark:text-amber-300' : ''}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleCheckout('ELITE')}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50 cursor-pointer text-center"
            >
              {isProcessing && activePlanCode === 'ELITE' ? 'Processing...' : 'Get Elite 1-Year Unlimited'}
            </button>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 p-6 sm:p-10 mb-20 overflow-hidden shadow-sm">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
            Compare Plan Capabilities
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="pb-4 font-bold text-slate-500 dark:text-slate-400">Capability</th>
                  <th className="pb-4 font-bold text-slate-800 dark:text-slate-200 text-center">Pro ($9.99/mo)</th>
                  <th className="pb-4 font-bold text-[#6D5BFF] dark:text-[#8E7CFF] text-center">Max ($19.99/mo)</th>
                  <th className="pb-4 font-bold text-amber-600 dark:text-amber-400 text-center">Elite ($499/yr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="py-3.5 font-medium">Exam Switching Policy</td>
                  <td className="py-3.5 text-center text-slate-500">$2.00 USD per switch</td>
                  <td className="py-3.5 text-center text-slate-500">$2.00 USD per switch</td>
                  <td className="py-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    FREE Unlimited (Zero Fees)
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">Daily Question Limit</td>
                  <td className="py-3.5 text-center">100 / day</td>
                  <td className="py-3.5 text-center">350 / day</td>
                  <td className="py-3.5 text-center font-bold text-amber-600 dark:text-amber-400">
                    Unlimited
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">Interactive AI Tutor Whiteboard</td>
                  <td className="py-3.5 text-center">30 sessions / mo</td>
                  <td className="py-3.5 text-center">120 sessions / mo</td>
                  <td className="py-3.5 text-center font-bold text-amber-600 dark:text-amber-400">
                    Unlimited
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">Neural Audio (TTS) Explanations</td>
                  <td className="py-3.5 text-center text-slate-400">—</td>
                  <td className="py-3.5 text-center text-emerald-500">
                    <Check className="w-4 h-4 mx-auto" />
                  </td>
                  <td className="py-3.5 text-center font-bold text-amber-600 dark:text-amber-400">
                    <Check className="w-4 h-4 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">Priority AI Generation Queue</td>
                  <td className="py-3.5 text-center text-slate-400">—</td>
                  <td className="py-3.5 text-center text-emerald-500">
                    <Check className="w-4 h-4 mx-auto" />
                  </td>
                  <td className="py-3.5 text-center font-bold text-amber-600 dark:text-amber-400">
                    VIP Dedicated
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">180+ Country Syllabus Access</td>
                  <td className="py-3.5 text-center text-emerald-500">
                    <Check className="w-4 h-4 mx-auto" />
                  </td>
                  <td className="py-3.5 text-center text-emerald-500">
                    <Check className="w-4 h-4 mx-auto" />
                  </td>
                  <td className="py-3.5 text-center text-emerald-500">
                    <Check className="w-4 h-4 mx-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">
            Frequently Asked Questions
          </h3>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800">
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#6D5BFF]" />
                How does the Exam Switching Policy work?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                When you enroll in NeoMCQ, your account is configured to your primary curriculum (e.g. USMLE, PLAB, NCLEX, NEET-PG). Pro ($9.99/mo) and Max ($19.99/mo) members can switch their primary curriculum anytime for a one-time fee of <strong>$2.00 USD</strong>. <strong>Elite ($499/year) members enjoy unlimited FREE exam switches</strong> with zero fees.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800">
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Is payment secure?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                All transactions are processed through Razorpay with 256-bit SSL encryption and strict server-side signature validation. NeoMCQ never stores your raw credit card or banking credentials.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800">
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-500" />
                Can I cancel my subscription anytime?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Yes. You can cancel your subscription anytime in one click from your Billing Portal. Your benefits will remain active until the conclusion of your current paid billing period.
              </p>
            </div>
          </div>
        </div>
      </main>

      <InteractiveModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        onOpenModal={(modal) => setActiveModal(modal)}
      />

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onOpenModal={(modal) => setActiveModal(modal)}
      />
    </div>
  );
}
