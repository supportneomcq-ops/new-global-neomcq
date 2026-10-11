'use client';

import React from 'react';
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTopicContent, PREPARATION_STEPS } from '@/lib/context/topic-content-context';
import { useSelection } from '@/lib/context/selection-context';

/**
 * Non-blocking preparation status. Learners can switch between learning tools
 * while a topic pack is being fetched/prepared in the background.
 * This intentionally does not display a fabricated percentage or ETA.
 */
export function TopicPreparationModal() {
  const { isLoading, isOrchestrating, error, currentStageIndex } = useTopicContent();
  const { selection } = useSelection();

  if (!isLoading && !isOrchestrating && !error) return null;

  const currentStep = PREPARATION_STEPS[Math.min(currentStageIndex, PREPARATION_STEPS.length - 1)];
  const preparing = isLoading || isOrchestrating;

  return (
    <div className="fixed bottom-20 right-4 z-40 w-[min(24rem,calc(100vw-2rem))] pointer-events-none">
      <div
        role={error ? 'alert' : 'status'}
        aria-live="polite"
        className="pointer-events-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-xl backdrop-blur p-4"
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-xl p-2 ${error ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'}`}>
            {error ? <AlertCircle className="h-5 w-5" /> : preparing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              {error ? 'Content needs attention' : preparing ? 'Preparing your learning content' : 'Learning content status'}
              {!error && <Sparkles className="h-4 w-4 text-indigo-500" />}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {error
                ? error
                : `${selection.topic?.name || 'Selected topic'} · ${currentStep?.label || 'Checking saved content'}`}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {error
                ? 'You can keep using content that is already available, then retry when ready.'
                : 'You can switch learning tools while preparation continues. We will reuse saved content whenever possible.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
