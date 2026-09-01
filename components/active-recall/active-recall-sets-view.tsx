'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Play,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  Zap,
  RotateCw,
  PlusCircle,
  Brain,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { ActiveRecallSet } from '@/lib/types/active-recall';

interface ActiveRecallSetsViewProps {
  sets: ActiveRecallSet[];
  topicName: string;
  subjectName: string;
  examName: string;
  subtopicName?: string;
  isGenerating: boolean;
  generationStage: string;
  onSelectSet: (set: ActiveRecallSet) => void;
  onGenerateNewSet: () => void;
}

export function ActiveRecallSetsView({
  sets,
  topicName,
  subjectName,
  examName,
  subtopicName,
  isGenerating,
  generationStage,
  onSelectSet,
  onGenerateNewSet,
}: ActiveRecallSetsViewProps) {
  // Generation in progress overlay / state
  if (isGenerating) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#0B0F19] border border-indigo-100 dark:border-indigo-900/50 shadow-md text-center space-y-6">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900 animate-ping opacity-25" />
          <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto shadow-inner">
            <Brain className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            AI Content Intelligence
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Constructing Active Recall Batch
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {examName} • {subjectName} • {topicName}
          </p>
        </div>

        {/* Dynamic Multi-Stage Tracker */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-left space-y-2.5">
          {[
            { label: 'Analyzing exam syllabus & high-yield blueprints', active: true },
            { label: 'Selecting high-yield recall targets & clinical concepts', active: true },
            { label: 'Synthesizing cloze sentences & integrated blanks', active: true },
            { label: 'Validating accepted medical synonyms & abbreviations', active: true },
            { label: 'Finalizing active recall workspace', active: true },
          ].map((stage, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs">
              <RotateCw className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {stage.label}
              </span>
            </div>
          ))}
        </div>

        <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">
          {generationStage || 'Processing high-yield active recall targets...'}
        </div>
      </div>
    );
  }

  // Empty state if no sets exist
  if (!sets || sets.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto">
          <Brain className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Active Recall Engine
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            No Recall Batch Found
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Generate an exam-aligned active recall batch for{' '}
            <strong className="text-slate-800 dark:text-slate-200">{topicName}</strong>
            {subtopicName ? ` (${subtopicName})` : ''} with integrated blank slots and medical-grade answer evaluation.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 text-left space-y-2 max-w-md mx-auto">
          <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Strictly isolated to {topicName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200 font-medium">
            <FileCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Accepted clinical synonyms &amp; board exam traps</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onGenerateNewSet}
          className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold tracking-wide transition-all shadow-md hover:shadow-indigo-500/20 cursor-pointer inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Active Recall Set</span>
        </button>
      </div>
    );
  }

  // Active recall sets listing
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200/80 dark:border-indigo-800">
              Active Recall Sets
            </span>
            <span className="text-xs font-mono text-slate-400">
              {sets.length} {sets.length === 1 ? 'Batch' : 'Batches'} Available
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {topicName}
          </h2>
          {subtopicName && (
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Subtopic: {subtopicName}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onGenerateNewSet}
          className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 self-start sm:self-center shrink-0 border border-slate-200 dark:border-slate-700"
        >
          <PlusCircle className="w-4 h-4 text-indigo-500" />
          <span>Generate New Batch</span>
        </button>
      </div>

      {/* SET CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sets.map((set, idx) => {
          const isLatest = idx === 0;
          const completion = set.completionPercentage || 0;

          return (
            <motion.div
              key={set.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-6 rounded-3xl bg-white dark:bg-[#0B0F19] border transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-800 shadow-xs flex flex-col justify-between space-y-5 ${
                isLatest
                  ? 'border-indigo-200 dark:border-indigo-900/60 ring-1 ring-indigo-500/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                    {set.batch}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isLatest && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Latest
                      </span>
                    )}
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {set.difficulty || 'High-Yield'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {set.itemsCount} High-Yield Recall Targets
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      v{set.version}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(set.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">Mastery Progress</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {completion}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onSelectSet(set)}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold tracking-wide transition-all shadow-sm hover:shadow-indigo-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{completion > 0 ? 'Continue Recall' : 'Start Active Recall'}</span>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
