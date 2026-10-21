'use client';

import React from 'react';
import { FeatureItem } from '@/lib/homepage-config';
import { Sparkles, CheckCircle2, BarChart3, Clock, BrainCircuit, Database, Zap } from 'lucide-react';

interface FeaturesSectionProps {
  features: FeatureItem[];
}

export function FeaturesSection({ features }: FeaturesSectionProps) {
  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-violet-500" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="w-6 h-6 text-cyan-500" />;
      case 'BarChart3':
        return <BarChart3 className="w-6 h-6 text-emerald-500" />;
      case 'Clock':
        return <Clock className="w-6 h-6 text-amber-500" />;
      case 'BrainCircuit':
        return <BrainCircuit className="w-6 h-6 text-pink-500" />;
      case 'Database':
        return <Database className="w-6 h-6 text-purple-500" />;
      default:
        return <Zap className="w-6 h-6 text-indigo-500" />;
    }
  };

  return (
    <section id="features" className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
        <span className="px-3.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider">
          Next-Generation Technology
        </span>
        <h2 className="font-heading font-black text-2xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
          Engineered for <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-cyan-500 to-indigo-600">Peak Exam Performance</span>
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
          NeoMCQ replaces static textbooks and passive memory with active recall, AI explanation breakdowns, and predictive score analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {features.map((feature) => (
          <div
            key={feature.id}
            className="group relative bg-white dark:bg-slate-900/80 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 shadow-sm">
                  {getFeatureIcon(feature.icon)}
                </div>
                {feature.badge && (
                  <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-[11px] font-bold">
                    {feature.badge}
                  </span>
                )}
              </div>

              <h3 className="font-heading font-bold text-lg sm:text-xl text-slate-900 dark:text-white mb-2 group-hover:text-violet-600 dark:group-hover:text-cyan-400 transition-colors">
                {feature.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {feature.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-cyan-400">
              <span>Learn more</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
