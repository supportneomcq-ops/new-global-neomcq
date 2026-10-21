'use client';

import React, { useState } from 'react';
import { DemoQuestion } from '@/lib/homepage-config';
import { Sparkles, CheckCircle, XCircle, Lightbulb, RefreshCw, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';

interface InteractiveDemoSectionProps {
  demo: DemoQuestion;
}

export function InteractiveDemoSection({ demo }: InteractiveDemoSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSelect = (index: number) => {
    if (isSubmitted) return;
    setSelectedIndex(index);
  };

  const handleSubmit = () => {
    if (selectedIndex === null) return;
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setSelectedIndex(null);
    setIsSubmitted(false);
  };

  const isCorrect = selectedIndex === demo.correctIndex;

  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto my-6">
      <div className="relative bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 rounded-3xl p-6 sm:p-10 border border-indigo-500/30 shadow-2xl text-white overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-indigo-900/60 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-violet-500/20 text-cyan-300 text-[11px] font-bold border border-violet-500/30">
                LIVE INTERACTIVE DEMO
              </span>
              <span className="text-xs text-slate-400 font-mono">{demo.examTag}</span>
            </div>
            <h3 className="font-heading font-black text-xl sm:text-2xl text-white">
              Experience the NeoMCQ <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">Socratic AI Engine</span>
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{demo.subject}</span>
            </span>
          </div>
        </div>

        {/* Question Text */}
        <div className="bg-slate-800/60 border border-indigo-900/40 rounded-2xl p-5 mb-6 text-sm sm:text-base leading-relaxed text-slate-100 font-medium shadow-inner">
          {demo.question}
        </div>

        {/* Option Choice Buttons */}
        <div className="space-y-3 mb-6">
          {demo.options.map((option, idx) => {
            let style = 'bg-slate-800/40 border-slate-700/60 text-slate-200 hover:bg-slate-800 hover:border-violet-500/60';
            let icon = null;

            if (selectedIndex === idx) {
              style = 'bg-violet-900/50 border-violet-500 text-white font-semibold ring-2 ring-violet-500/50';
            }

            if (isSubmitted) {
              if (idx === demo.correctIndex) {
                style = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold';
                icon = <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />;
              } else if (idx === selectedIndex && !isCorrect) {
                style = 'bg-rose-950/80 border-rose-500 text-rose-200 font-bold';
                icon = <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
              } else {
                style = 'opacity-40 bg-slate-900/40 border-slate-800 text-slate-400';
              }
            }

            return (
              <button
                key={idx}
                disabled={isSubmitted}
                onClick={() => handleSelect(idx)}
                className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer ${style}`}
              >
                <span>{option}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {/* Actions Row */}
        {!isSubmitted ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Select an answer above to test AI rationale generator</span>
            <button
              onClick={handleSubmit}
              disabled={selectedIndex === null}
              className={`px-6 py-2.5 rounded-full font-heading font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                selectedIndex !== null
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/30 cursor-pointer hover:opacity-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Submit Answer</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-2 animate-fade-in">
            {/* Answer Status Box */}
            <div
              className={`p-4 rounded-2xl border ${
                isCorrect
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {isCorrect ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span>Correct Answer! +10 AI Practice XP</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <span>Incorrect Choice</span>
                  </>
                )}
              </div>
              <p className="text-xs leading-relaxed text-slate-200 mt-2">{demo.explanation}</p>
            </div>

            {/* AI Pearl Box */}
            <div className="p-4 rounded-2xl bg-violet-950/40 border border-violet-500/40 text-violet-200 text-xs leading-relaxed flex items-start gap-2.5">
              <Lightbulb className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">NeoMCQ AI High-Yield Pearl:</span>
                <p className="mt-1 text-slate-200">{demo.aiTip}</p>
              </div>
            </div>

            {/* Bottom Reset / Continue CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Demo Again</span>
              </button>

              <Link
                href="/onboarding"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 cursor-pointer hover:opacity-90"
              >
                <span>Unlock 100,000+ More AI MCQs</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
