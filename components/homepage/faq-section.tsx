'use client';

import React, { useState } from 'react';
import { FaqItem } from '@/lib/homepage-config';
import { ChevronDown, HelpCircle, Mail, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface FaqSectionProps {
  faqs: FaqItem[];
}

export function FaqSection({ faqs }: FaqSectionProps) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id || null);

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="text-center space-y-4 max-w-2xl mx-auto mb-10">
        <span className="px-3.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider">
          Got Questions?
        </span>
        <h2 className="font-heading font-black text-2xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
          Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-cyan-500">Questions</span>
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
          Everything you need to know about NeoMCQ AI engine, subscriptions, and exam coverage.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
            >
              <button
                onClick={() => toggle(faq.id)}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <span className="font-heading font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-violet-500 shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 animate-fade-in">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Support Callout */}
      <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-violet-900/20 via-indigo-900/20 to-cyan-900/20 border border-violet-500/30 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <div className="p-3 rounded-xl bg-violet-600 text-white shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white">Have more questions?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Our academic team is available 24/7 to help you.</p>
          </div>
        </div>

        <Link
          href="/contact-us"
          className="px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold text-xs hover:border-violet-500 transition-colors shrink-0"
        >
          Contact Support
        </Link>
      </div>
    </section>
  );
}
