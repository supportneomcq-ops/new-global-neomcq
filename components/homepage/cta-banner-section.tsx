'use client';

import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface CtaBannerSectionProps {
  onStartFree?: () => void;
}

export function CtaBannerSection({ onStartFree }: CtaBannerSectionProps) {
  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto my-8">
      <div className="relative rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 p-8 sm:p-12 lg:p-16 text-white text-center shadow-2xl overflow-hidden">
        {/* Background glow circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-300/20 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/30">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Join 50,000+ Students Today</span>
          </span>

          <h2 className="font-heading font-black text-3xl sm:text-5xl tracking-tight leading-tight">
            Ready to Ace Your Next Examination?
          </h2>

          <p className="text-sm sm:text-base text-cyan-50 max-w-2xl mx-auto font-normal leading-relaxed">
            Start practice with instant Socratic AI rationales, automated spaced repetition flashcards, and weak spot tracking in under 60 seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onStartFree}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-violet-900 font-heading font-black text-base shadow-xl hover:bg-cyan-50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-violet-600" />
              <span>Start Studying Free</span>
              <ArrowRight className="w-5 h-5 text-violet-600" />
            </button>

            <Link
              href="#exams"
              className="w-full sm:w-auto px-7 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/30 font-heading font-bold text-base transition-all flex items-center justify-center gap-2"
            >
              <span>View All 100,000+ MCQs</span>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-cyan-100 font-medium pt-2">
            <ShieldCheck className="w-4 h-4 text-cyan-300" />
            <span>Free Forever Tier • No Credit Card Required • Works on Mobile & Desktop</span>
          </div>
        </div>
      </div>
    </section>
  );
}
