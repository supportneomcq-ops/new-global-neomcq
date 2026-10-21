'use client';

import React from 'react';
import { WhyPillar } from '@/lib/homepage-config';
import { Target, Brain, Repeat, XCircle, CheckCircle2, Zap } from 'lucide-react';

interface WhyNeoMCQSectionProps {
  pillars: WhyPillar[];
}

export function WhyNeoMCQSection({ pillars }: WhyNeoMCQSectionProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Target':
        return <Target className="w-6 h-6 text-violet-500" />;
      case 'Brain':
        return <Brain className="w-6 h-6 text-cyan-500" />;
      case 'Repeat':
        return <Repeat className="w-6 h-6 text-emerald-500" />;
      default:
        return <Zap className="w-6 h-6 text-purple-500" />;
    }
  };

  return (
    <section id="why" className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
        <span className="px-3.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider">
          Proven Cognitive Science
        </span>
        <h2 className="font-heading font-black text-2xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
          Why Top Performers <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500">Choose NeoMCQ</span>
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
          Traditional question banks rely on static question sets and brief answer keys. NeoMCQ continuously adapts to your learning speed and retention curve.
        </p>
      </div>

      {/* Pillars Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {pillars.map((pillar) => (
          <div
            key={pillar.id}
            className="bg-white dark:bg-slate-900/90 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/80 border border-violet-200/50 dark:border-violet-800/40">
                  {getIcon(pillar.icon)}
                </div>
                <div className="text-right">
                  <span className="font-heading font-black text-2xl sm:text-3xl text-violet-600 dark:text-cyan-400">
                    {pillar.statValue}
                  </span>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {pillar.statLabel}
                  </div>
                </div>
              </div>

              <h3 className="font-heading font-bold text-lg sm:text-xl text-slate-900 dark:text-white mb-2">
                {pillar.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {pillar.description}
              </p>
            </div>

            {/* Comparison Box */}
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Old Way: </span>
                  <span>{pillar.traditionalWay}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">NeoMCQ Way: </span>
                  <span>{pillar.neoWay}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
