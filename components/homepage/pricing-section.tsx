'use client';

import React, { useState } from 'react';
import { PricingPlan } from '@/lib/homepage-config';
import { Sparkles, Check, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface PricingSectionProps {
  plans: PricingPlan[];
  onSelectPlan?: (plan: PricingPlan) => void;
}

export function PricingSection({ plans, onSelectPlan }: PricingSectionProps) {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-10">
        <span className="px-3.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider">
          Transparent Pricing
        </span>
        <h2 className="font-heading font-black text-2xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
          Invest in Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500">Future Success</span>
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
          Simple, flexible plans with zero hidden fees. Upgrade or cancel anytime.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <span className={`text-xs sm:text-sm font-bold ${!isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="w-12 h-6 rounded-full bg-violet-600 p-1 flex items-center transition-all cursor-pointer"
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                isAnnual ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs sm:text-sm font-bold ${isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
              Annual Billing
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
              SAVE 35%
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 border transition-all duration-300 flex flex-col justify-between ${
                plan.popular
                  ? 'border-violet-500 shadow-2xl shadow-violet-500/20 ring-2 ring-violet-500/50 scale-102 z-10'
                  : 'border-slate-200/80 dark:border-slate-800 shadow-sm'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-md">
                  {plan.badge}
                </div>
              )}

              <div>
                {/* Header */}
                <div className="mb-6">
                  <h3 className="font-heading font-black text-xl text-slate-900 dark:text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="font-heading font-black text-4xl text-slate-900 dark:text-white">
                    {plan.currencySymbol}{price}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    / month {isAnnual && price > 0 ? '(billed annually)' : ''}
                  </span>
                </div>

                {/* Features Checklist */}
                <div className="space-y-3 mb-8 text-xs sm:text-sm">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
                      <div className="p-0.5 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-cyan-400 shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action CTA */}
              <div>
                <Link
                  href="/onboarding"
                  onClick={() => onSelectPlan && onSelectPlan(plan)}
                  className={`w-full py-3.5 rounded-2xl font-heading font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    plan.popular
                      ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-violet-500/25 hover:opacity-95'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-[11px] text-center text-slate-400 mt-2 font-medium">
                  Instant Access • Cancel Anytime
                </p>
              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
}
