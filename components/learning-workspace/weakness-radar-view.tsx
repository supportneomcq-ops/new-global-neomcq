'use client';

import React from 'react';
import {
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useSelection } from '@/lib/context/selection-context';
import { OnboardingData } from '@/components/onboarding-flow';
import { WorkspaceTab } from './types';

interface WeaknessRadarViewProps {
  user: OnboardingData;
  onSelectTab: (tab: WorkspaceTab) => void;
}

const SUBJECT_PERFORMANCE = [
  {
    subject: 'Cardiovascular System',
    mastery: 88,
    accuracy: 91,
    questionsDone: 142,
    status: 'Strong',
    color: 'bg-emerald-500',
  },
  {
    subject: 'Clinical Pharmacology & Pharmacokinetics',
    mastery: 62,
    accuracy: 65,
    questionsDone: 88,
    status: 'Needs Revision',
    color: 'bg-amber-500',
  },
  {
    subject: 'Respiratory & Pulmonology',
    mastery: 79,
    accuracy: 82,
    questionsDone: 110,
    status: 'Good',
    color: 'bg-indigo-500',
  },
  {
    subject: 'Gastroenterology & Hepatology',
    mastery: 54,
    accuracy: 58,
    questionsDone: 64,
    status: 'High Priority Focus',
    color: 'bg-rose-500',
  },
  {
    subject: 'Renal & Acid-Base Physiology',
    mastery: 83,
    accuracy: 85,
    questionsDone: 96,
    status: 'Strong',
    color: 'bg-emerald-500',
  },
];

export function WeaknessRadarView({ user, onSelectTab }: WeaknessRadarViewProps) {
  const { selection } = useSelection();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Knowledge Weakness Radar & Analytics</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {selection.exam?.name || user.examName}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time mastery metrics, accuracy velocity, and targeted weak-spot remediation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSelectTab('practice')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Zap className="w-3.5 h-3.5" /> Launch Targeted Practice
        </button>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Overall Accuracy
          </span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            78.4%
          </div>
          <p className="text-xs text-slate-500">+4.2% improvement over last 100 questions</p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Average Speed
          </span>
          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
            52s <span className="text-xs font-bold text-slate-400">/ question</span>
          </div>
          <p className="text-xs text-slate-500">Benchmark: 65s for {selection.exam?.name || user.examName}</p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Questions Answered
          </span>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            500+
          </div>
          <p className="text-xs text-slate-500">Across 14 core board subjects</p>
        </div>
      </div>

      {/* Subject Mastery Radar Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Curriculum Mastery by Subject
            </h3>
            <p className="text-xs text-slate-500">
              Identify weak subject areas and launch targeted high-yield drills.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {SUBJECT_PERFORMANCE.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.subject}</h4>
                  <span className="text-[11px] text-slate-500">{item.questionsDone} Questions Completed</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                    item.status === 'Strong'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : item.status === 'Needs Revision'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {item.status}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{item.mastery}% Mastery</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.mastery}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
