'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  ArrowLeft,
  Flame,
  Target,
  Sparkles,
  Award,
} from 'lucide-react';
import { ActiveRecallItem, ActiveRecallSessionStats } from '@/lib/types/active-recall';

interface ActiveRecallCompletionProps {
  stats: ActiveRecallSessionStats;
  items: ActiveRecallItem[];
  savedAnswers: Record<string, { userAnswer: string; isCorrect: boolean; isRevealed: boolean }>;
  topicName: string;
  subtopicName?: string;
  onReviewMissed: () => void;
  onRepeatSession: () => void;
  onBackToSets: () => void;
}

export function ActiveRecallCompletion({
  stats,
  items,
  savedAnswers,
  topicName,
  subtopicName,
  onReviewMissed,
  onRepeatSession,
  onBackToSets,
}: ActiveRecallCompletionProps) {
  const missedItems = items.filter((it) => {
    const ans = savedAnswers[it.id];
    return !ans || !ans.isCorrect || ans.isRevealed;
  });

  const hasMissed = missedItems.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-3xl mx-auto space-y-6"
    >
      {/* HEADER CARD */}
      <div className="p-8 rounded-3xl bg-linear-to-b from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-[#0B0F19] dark:to-[#0B0F19] border border-indigo-100 dark:border-indigo-900/50 text-center space-y-4 shadow-sm relative overflow-hidden">
        <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto shadow-inner">
          <Trophy className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Active Recall Complete
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {topicName}
          </h2>
          {subtopicName && (
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Subtopic: {subtopicName}
            </p>
          )}
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
            <div className="text-2xl font-mono font-black text-slate-900 dark:text-white">
              {stats.accuracy}%
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
              <Target className="w-3.5 h-3.5 text-indigo-500" /> Accuracy
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
            <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
              {stats.correctCount} / {stats.totalItems}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Mastered
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
            <div className="text-2xl font-mono font-black text-rose-600 dark:text-rose-400">
              {stats.reviewedCount + stats.revealedCount}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Review
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
            <div className="text-2xl font-mono font-black text-amber-500 flex items-center justify-center gap-1">
              <span>{stats.bestStreak}</span>
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> Best Streak
            </div>
          </div>
        </div>
      </div>

      {/* PERFORMANCE BREAKDOWN: STRONG VS NEEDS REVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strong Areas */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Strong Recalls ({stats.correctCount})
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400">High Retention</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {items
              .filter((it) => savedAnswers[it.id]?.isCorrect && !savedAnswers[it.id]?.isRevealed)
              .map((it) => (
                <div
                  key={it.id}
                  className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-start gap-2 text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{it.concept}</span>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
                      Answer: {it.blank}
                    </p>
                  </div>
                </div>
              ))}

            {stats.correctCount === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No successful recalls in this run.</p>
            )}
          </div>
        </div>

        {/* Needs Review */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Needs Review ({missedItems.length})
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400">Spaced Queue</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {missedItems.map((it) => (
              <div
                key={it.id}
                className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex items-start gap-2 text-xs"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{it.concept}</span>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 font-mono">
                    Correct Target: {it.blank}
                  </p>
                </div>
              </div>
            ))}

            {missedItems.length === 0 && (
              <div className="py-6 text-center space-y-1">
                <Award className="w-6 h-6 text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-slate-900 dark:text-white">Flawless 100% Recall!</p>
                <p className="text-[11px] text-slate-400">All targets recalled correctly without reveals.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ACTION CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBackToSets}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Recall Sets</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {hasMissed && (
            <button
              type="button"
              onClick={onReviewMissed}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-rose-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Review Missed ({missedItems.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRepeatSession}
            className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-indigo-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Repeat Full Session</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
