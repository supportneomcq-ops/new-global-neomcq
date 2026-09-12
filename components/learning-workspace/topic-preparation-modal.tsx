'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, CircleDashed, Sparkles, BookOpen, Layers, X } from 'lucide-react';
import { useTopicContent, PREPARATION_STEPS } from '@/lib/context/topic-content-context';
import { useSelection } from '@/lib/context/selection-context';

export function TopicPreparationModal() {
  const { isLoading, currentStageIndex } = useTopicContent();
  const { selection } = useSelection();

  if (!isLoading) return null;

  const currentStep = PREPARATION_STEPS[Math.min(currentStageIndex, PREPARATION_STEPS.length - 1)];
  const progressPercent = Math.min(100, Math.round(((currentStageIndex + 1) / PREPARATION_STEPS.length) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 border border-white/20 text-white flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-200" />
                Adaptive Learning Engine
              </span>
              <span className="text-xs text-emerald-100 font-medium ml-auto">
                {progressPercent}% Complete
              </span>
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Preparing Your Learning Library
            </h3>
            <p className="text-sm text-emerald-100 mt-1 line-clamp-1">
              {selection.topic?.name || 'Topic Knowledge Pack'} • {selection.exam?.name || 'Selected Exam'}
            </p>

            {/* Top Progress Bar */}
            <div className="w-full bg-emerald-950/40 rounded-full h-1.5 mt-4 overflow-hidden">
              <motion.div
                className="h-full bg-emerald-300 rounded-full"
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Step-by-Step Educational Stepper */}
          <div className="p-6 overflow-y-auto max-h-96 space-y-3.5 divide-y divide-slate-100">
            {PREPARATION_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isUpcoming = idx > currentStageIndex;

              return (
                <div
                  key={step.id}
                  className={`pt-3.5 first:pt-0 flex items-start gap-3 transition-opacity ${
                    isUpcoming ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isCurrent ? (
                      <CircleDashed className="w-5 h-5 text-teal-600 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm font-semibold ${
                          isCompleted
                            ? 'text-slate-800'
                            : isCurrent
                            ? 'text-teal-700 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Layers className="w-4 h-4 text-emerald-600" />
              Generating 40 MCQs, A4 Notes & Spaced Flashcards
            </span>
            <span className="font-medium text-slate-600">{currentStep.label}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
