'use client';

import React from 'react';
import {
  Lightbulb,
  Sparkles,
  AlertTriangle,
  Calculator,
  Brain,
  Columns,
  LucideIcon,
} from 'lucide-react';
import { A4Callout } from '@/lib/types/a4-notes';

interface A4CalloutBlockProps {
  callout: A4Callout;
}

interface CalloutConfig {
  icon: LucideIcon;
  badgeLabel: string;
  containerClass: string;
  badgeClass: string;
  titleClass: string;
  contentClass: string;
}

const CALLOUT_CONFIGS: Record<A4Callout['type'], CalloutConfig> = {
  key_insight: {
    icon: Lightbulb,
    badgeLabel: 'KEY INSIGHT',
    containerClass: 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700',
    titleClass: 'text-indigo-950 dark:text-indigo-100',
    contentClass: 'text-indigo-900 dark:text-indigo-200',
  },
  high_yield_point: {
    icon: Sparkles,
    badgeLabel: 'HIGH YIELD',
    containerClass: 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700',
    titleClass: 'text-emerald-950 dark:text-emerald-100',
    contentClass: 'text-emerald-900 dark:text-emerald-200',
  },
  exam_trap: {
    icon: AlertTriangle,
    badgeLabel: 'EXAM TRAP',
    containerClass: 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-700',
    titleClass: 'text-rose-950 dark:text-rose-100',
    contentClass: 'text-rose-900 dark:text-rose-200',
  },
  formula: {
    icon: Calculator,
    badgeLabel: 'FORMULA / RULE',
    containerClass: 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-700',
    titleClass: 'text-sky-950 dark:text-sky-100',
    contentClass: 'text-sky-900 dark:text-sky-200 font-mono text-xs sm:text-sm',
  },
  memory_aid: {
    icon: Brain,
    badgeLabel: 'MEMORY AID',
    containerClass: 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-700',
    titleClass: 'text-purple-950 dark:text-purple-100',
    contentClass: 'text-purple-900 dark:text-purple-200',
  },
  comparison: {
    icon: Columns,
    badgeLabel: 'COMPARISON',
    containerClass: 'bg-slate-100/90 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700',
    badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
    titleClass: 'text-slate-900 dark:text-slate-100',
    contentClass: 'text-slate-800 dark:text-slate-200',
  },
};

export function A4CalloutBlock({ callout }: A4CalloutBlockProps) {
  const config = CALLOUT_CONFIGS[callout.type] || CALLOUT_CONFIGS.key_insight;
  const IconComponent = config.icon;

  return (
    <div
      className={`p-4 rounded-xl border-2 my-3 transition-all ${config.containerClass}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <IconComponent className="w-4 h-4 shrink-0" />
          <h5 className={`font-bold text-xs sm:text-sm ${config.titleClass}`}>
            {callout.title}
          </h5>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border shrink-0 ${config.badgeClass}`}
        >
          {config.badgeLabel}
        </span>
      </div>
      <p className={`text-xs sm:text-sm leading-relaxed ${config.contentClass}`}>
        {callout.content}
      </p>
    </div>
  );
}
