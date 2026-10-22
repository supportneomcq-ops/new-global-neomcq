'use client';

import React, { useState, useEffect } from 'react';
import { AUTHORITATIVE_PLANS, PlanCode, getFormattedPlanPrice } from '@/lib/plans/plan-config';
import { usePlanCheckout } from '@/lib/checkout/use-plan-checkout';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
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

  useEffect(() => {
    fetch('/api/geo/country')
      .then((res) => res.json())
      .then((data) => {
        if (data.currency === 'INR' || data.currency === 'USD') {
          setCurrency(data.currency);
        }
      })
      .catch(() => null);
  }, []);

  const handleCheckout = (code: PlanCode) => {
    checkoutPlan(code, { preferredCurrency: currency });
  };

  const proPrice = getFormattedPlanPrice('PRO', currency);
  const maxPrice = getFormattedPlanPrice('MAX', currency);
  const elitePrice = getFormattedPlanPrice('ELITE', currency);

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
            Find the right plan for your exam goals.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal">
            Compare real usage limits, AI study tools, and exam-switching costs. Choose the level of support that fits your preparation routine.
          </p>
        </div>

        {/* Currency is detected automatically from the visitor's country. */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 -mt-6 mb-10">Prices shown in {currency === 'INR' ? 'INR (₹)' : 'USD ($)'}</p>

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
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                {AUTHORITATIVE_PLANS.PRO.tagline}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">
                Best for: steady practice and revision
              </p>

              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {proPrice.displayPrice}
                </span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{proPrice.period}</span>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mb-6 space-y-3">
                <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                    500
                  </div>
                  <div>
                    <p className="text-xs font-black text-indigo-950 dark:text-indigo-200">Credits Included / mo</p>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">~15 full AI topic generation packs</p>
                  </div>
                </div>

                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-2">Plan Highlights</p>
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
              {isProcessing && activePlanCode === 'PRO' ? 'Processing...' : `Subscribe to Pro (${proPrice.displayPrice}${proPrice.periodShort})`}
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
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                {AUTHORITATIVE_PLANS.MAX.tagline}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">
                Best for: higher daily limits and deeper AI support
              </p>

              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {maxPrice.displayPrice}
                </span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{maxPrice.period}</span>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mb-6 space-y-3">
                <div className="p-3 rounded-2xl bg-violet-50/70 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                    1.5K
                  </div>
                  <div>
                    <p className="text-xs font-black text-violet-950 dark:text-violet-200">Credits Included / mo</p>
                    <p className="text-[11px] text-violet-700 dark:text-violet-300 font-medium">~45 full AI topic generation packs</p>
                  </div>
                </div>

                <p className="text-[11px] font-bold text-[#6D5BFF] dark:text-[#8E7CFF] uppercase tracking-wider pt-2">
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
              {isProcessing && activePlanCode === 'MAX' ? 'Processing...' : `Subscribe to Max (${maxPrice.displayPrice}${maxPrice.periodShort})`}
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
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                {AUTHORITATIVE_PLANS.ELITE.tagline}
              </p>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-6">
                Best for: annual access with the highest configured limits
              </p>

              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {elitePrice.displayPrice}
                </span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{elitePrice.period}</span>
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

        {/* Pre-Checkout Legal & Billing Disclosures */}
        <div className="max-w-4xl mx-auto mb-16 p-5 rounded-2xl bg-white/80 dark:bg-[#0E1324]/80 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Payment & Subscription Terms Disclosures:
          </p>
          <p className="leading-relaxed max-w-3xl mx-auto">
            All subscriptions are processed via Razorpay 256-bit SSL encrypted payment processing in {currency === 'INR' ? 'Indian Rupees (INR ₹)' : 'US Dollars (USD $)' }. By completing a transaction, you agree to NeoMCQ’s{' '}
            <Link href="/terms-and-conditions" className="text-[#6D5BFF] dark:text-[#00D4FF] underline font-medium">Terms & Conditions</Link>,{' '}
            <Link href="/privacy-policy" className="text-[#6D5BFF] dark:text-[#00D4FF] underline font-medium">Privacy Policy</Link>,{' '}
            <Link href="/refund-and-cancellation-policy" className="text-[#6D5BFF] dark:text-[#00D4FF] underline font-medium">Refund & Cancellation Policy</Link>, and{' '}
            <Link href="/shipping-and-delivery-policy" className="text-[#6D5BFF] dark:text-[#00D4FF] underline font-medium">Digital Delivery Policy</Link>.
          </p>
          <p className="text-[11px] text-slate-400">
            Pro ({proPrice.displayPrice}{proPrice.periodShort}) and Max ({maxPrice.displayPrice}{maxPrice.periodShort}) plans include a nominal curriculum switching fee per switch ({proPrice.switchFee}). Elite ({elitePrice.displayPrice}{elitePrice.periodShort}) subscribers enjoy unlimited zero-fee curriculum switches. Subscriptions can be canceled anytime from your Billing Portal.
          </p>
        </div>

        {/* Feature Comparison Table */}
        <section aria-labelledby="plan-comparison-heading" className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-7">
            <h3 id="plan-comparison-heading" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Compare Plan Capabilities
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Compare the current plan limits and included learning tools before you choose.
            </p>
          </div>

          <div className="rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 p-4 sm:p-8 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs sm:text-sm">
                <caption className="sr-only">Feature and usage-limit comparison for Pro, Max, and Elite subscriptions</caption>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th scope="col" className="pb-4 pr-4 font-bold text-slate-500 dark:text-slate-400">Capability</th>
                    <th scope="col" className="pb-4 px-3 font-bold text-slate-800 dark:text-slate-200 text-center">Pro <span className="block mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{proPrice.displayPrice}{proPrice.periodShort}</span></th>
                    <th scope="col" className="pb-4 px-3 font-bold text-[#6D5BFF] dark:text-[#A99CFF] text-center">Max <span className="block mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{maxPrice.displayPrice}{maxPrice.periodShort}</span></th>
                    <th scope="col" className="pb-4 pl-3 font-bold text-amber-600 dark:text-amber-400 text-center">Elite <span className="block mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{elitePrice.displayPrice}{elitePrice.periodShort}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th scope="row" className="py-4 pr-4 font-semibold">Daily AI question limit</th>
                    <td className="py-4 px-3 text-center">100 / day</td>
                    <td className="py-4 px-3 text-center">350 / day</td>
                    <td className="py-4 pl-3 text-center font-bold text-amber-600 dark:text-amber-400">Unlimited*</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-4 pr-4 font-semibold">AI Tutor sessions</th>
                    <td className="py-4 px-3 text-center">30 / month</td>
                    <td className="py-4 px-3 text-center">120 / month</td>
                    <td className="py-4 pl-3 text-center font-bold text-amber-600 dark:text-amber-400">Unlimited*</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-4 pr-4 font-semibold">Neural audio explanations (TTS)</th>
                    <td className="py-4 px-3 text-center">Up to 15 / day</td>
                    <td className="py-4 px-3 text-center">Up to 50 / day</td>
                    <td className="py-4 pl-3 text-center font-bold text-amber-600 dark:text-amber-400">Unlimited*</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-4 pr-4 font-semibold">Interactive AI Tutor whiteboard</th>
                    <td className="py-4 px-3 text-center text-slate-400">—</td>
                    <td className="py-4 px-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                    <td className="py-4 pl-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-4 pr-4 font-semibold">AI content generation queue</th>
                    <td className="py-4 px-3 text-center">Standard</td>
                    <td className="py-4 px-3 text-center font-semibold text-[#6D5BFF] dark:text-[#A99CFF]">Priority fast-track</td>
                    <td className="py-4 pl-3 text-center font-semibold text-amber-600 dark:text-amber-400">Dedicated tier*</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-4 pr-4 font-semibold">MCQ practice and mock exams</th>
                    <td className="py-4 px-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                    <td className="py-4 px-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                    <td className="py-4 pl-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-4 pr-4 font-semibold">Study notes and revision sheets</th>
                    <td className="py-4 px-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                    <td className="py-4 px-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                    <td className="py-4 pl-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-4 pr-4 font-semibold">Flashcards and active recall</th>
                    <td className="py-4 px-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                    <td className="py-4 px-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                    <td className="py-4 pl-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-4 pr-4 font-semibold">Exam curriculum switching</th>
                    <td className="py-4 px-3 text-center">{proPrice.switchFee} / switch</td>
                    <td className="py-4 px-3 text-center">{maxPrice.switchFee} / switch</td>
                    <td className="py-4 pl-3 text-center font-bold text-emerald-600 dark:text-emerald-400">No switching fee</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-4 pr-4 font-semibold">Curriculum and exam blueprints</th>
                    <td className="py-4 px-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                    <td className="py-4 px-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                    <td className="py-4 pl-3 text-center"><Check aria-label="Included" className="w-4 h-4 mx-auto text-emerald-500" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              *Unlimited usage and priority processing follow the published plan configuration and service availability. Audio limits and plan entitlements are based on NeoMCQ’s current plan settings. Review the applicable policies before checkout.
            </p>
          </div>
        </section>

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
                Your account is configured to a primary exam curriculum. Pro and Max members pay {proPrice.switchFee} per curriculum switch; Elite includes curriculum switching with no switching fee. The plan price and billing period are shown above in your selected currency.
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
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800">
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#6D5BFF]" />
                Which plan should I choose?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Choose Pro for regular practice and revision, Max if you need higher daily question limits and more AI Tutor sessions, or Elite if you prefer annual access with the highest configured limits and no exam-switching fee. Compare the limits above before subscribing.
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

      <Footer />
    </div>
  );
}
