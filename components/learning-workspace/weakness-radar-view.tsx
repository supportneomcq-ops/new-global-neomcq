'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Zap,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useSelection } from '@/lib/context/selection-context';
import { OnboardingData } from '@/components/onboarding-flow';
import { WorkspaceTab } from './types';
import { getSupabaseClient } from '@/lib/supabase';

interface WeaknessRadarViewProps {
  user: OnboardingData;
  onSelectTab: (tab: WorkspaceTab) => void;
}

export function WeaknessRadarView({ user, onSelectTab }: WeaknessRadarViewProps) {
  const { selection, availableSubjects } = useSelection();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const effectiveUserId = authUser?.id || user.userId;

      const params = new URLSearchParams();
      if (selection.exam?.id) params.set('examId', selection.exam.id);
      if (effectiveUserId) params.set('userId', effectiveUserId);

      const res = await fetch(`/api/user/study-stats?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.stats) {
        setStats(json.stats);
      }
    } catch (err) {
      console.warn('[WeaknessRadarView] Failed to load study stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selection.exam?.id, user.userId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const examName = selection.exam?.name || user.examName || 'Board Examination';

  // Resolved Subject Mastery list
  const subjectList = (stats?.subjectMastery && stats.subjectMastery.length > 0)
    ? stats.subjectMastery
    : availableSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        score: 0,
        questionsDone: 0,
        status: 'Ready to Practice',
        color: 'bg-slate-300 dark:bg-slate-700',
      }));

  const overallAccuracy = stats?.overallAccuracy || 0;
  const questionsSolved = stats?.questionsSolved || 0;
  const readinessPercentage = stats?.readinessPercentage || 0;

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
              {examName}
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
            {overallAccuracy > 0 ? `${overallAccuracy}%` : '—'}
          </div>
          <p className="text-xs text-slate-500">
            {questionsSolved > 0 ? `Computed across ${questionsSolved} questions` : 'Solve your first drill to calculate'}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Board Readiness Index
          </span>
          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {readinessPercentage > 0 ? `${readinessPercentage}%` : 'New'}
          </div>
          <p className="text-xs text-slate-500">Target benchmark: 85%+ for {examName}</p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Questions Solved
          </span>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {questionsSolved}
          </div>
          <p className="text-xs text-slate-500">Across {availableSubjects.length || 1} core disciplines</p>
        </div>
      </div>

      {/* Subject Mastery Radar Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Curriculum Mastery by Subject</span>
            </h3>
            <p className="text-xs text-slate-500">
              Live performance breakdown for {examName}.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {subjectList.map((item: any, idx: number) => (
            <div
              key={item.id || idx}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</h4>
                  <span className="text-[11px] text-slate-500">{item.questionsDone} Questions Completed</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                    item.score >= 80
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : item.score >= 60
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : item.score > 0
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {item.status}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{item.score}% Mastery</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${item.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
