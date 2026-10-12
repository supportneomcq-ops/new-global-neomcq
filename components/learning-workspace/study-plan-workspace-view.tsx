'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Layers,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Target,
  BookOpen,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { OnboardingData } from '@/components/onboarding-flow';
import { useSelection } from '@/lib/context/selection-context';
import { WorkspaceTab } from './types';

interface StudyPlanWorkspaceViewProps {
  user: OnboardingData;
  onSelectTab: (tab: WorkspaceTab) => void;
}

export function StudyPlanWorkspaceView({ user, onSelectTab }: StudyPlanWorkspaceViewProps) {
  const { selection } = useSelection();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [updatingDay, setUpdatingDay] = useState<number | null>(null);
  const [planError, setPlanError] = useState('');

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setPlanError('');
      const res = await fetch('/api/study-plans/current');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Study plan could not be loaded. Please retry.');
      setPlan(data.plan || null);
      if (!data.plan) setPlanError(data.message || 'No active exam is linked to this account yet. Select your exam to create a study plan.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Study plan could not be loaded.';
      setPlanError(message);
      setPlan(null);
      console.error('Error loading study plan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [selection.exam?.id]);

  const toggleDayCompletion = async (dayNumber: number, currentCompleted: boolean) => {
    if (!plan?.id || updatingDay !== null) return;
    const previousPlan = plan;
    const nextCompleted = !currentCompleted;
    try {
      setUpdatingDay(dayNumber);
      setPlanError('');
      setPlan((prev: any) => {
        if (!prev) return prev;
        const newPlanData = { ...prev.plan_data };
        newPlanData.schedule = newPlanData.schedule?.map((w: any) => ({
          ...w,
          days: w.days?.map((d: any) => d.day === dayNumber ? { ...d, completed: nextCompleted } : d),
        }));
        return { ...prev, plan_data: newPlanData };
      });

      const res = await fetch('/api/study-plans/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, dayNumber, isCompletedDay: nextCompleted }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) throw new Error(result.error || 'Progress could not be saved. Please try again.');
      if (result.plan_data) setPlan((current: any) => current ? { ...current, plan_data: result.plan_data } : current);
    } catch (err) {
      setPlan(previousPlan);
      const message = err instanceof Error ? err.message : 'Progress could not be saved.';
      setPlanError(message);
      console.error('Failed to toggle day completion:', err);
    } finally {
      setUpdatingDay(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Generating Canonical Study Plan...</h3>
        <p className="text-sm text-slate-500">Aligning blueprint curriculum, 5-day lockout buffer, and daily target quotas.</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          <CalendarIcon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your study plan</h3>
        <p role="status" className="mx-auto max-w-xl text-sm text-slate-500 dark:text-slate-400">{planError || 'Your study plan is not available yet.'}</p>
        <button type="button" onClick={fetchPlan} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const planData = plan?.plan_data || {};
  const schedule = planData.schedule || [];
  const totalDays = planData.totalDays || 90;
  const learningDays = planData.learningDays || (totalDays - 5);
  const targetHours = planData.dailyHours || user.studyHours || 2.5;

  let totalCompletedDays = 0;
  let totalScheduledDays = 0;
  schedule.forEach((w: any) => {
    w.days?.forEach((d: any) => {
      totalScheduledDays++;
      if (d.completed) totalCompletedDays++;
    });
  });

  const completionRate = totalScheduledDays > 0 ? Math.round((totalCompletedDays / totalScheduledDays) * 100) : 0;
  const currentWeekObj = schedule.find((w: any) => w.week === activeWeek) || schedule[0];

  return (
    <div className="space-y-8 pb-16">
      {planError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {planError}
        </p>
      )}
      {/* 1. Header Hero Card */}
      <section className="relative rounded-3xl bg-slate-900 dark:bg-slate-950 text-white p-6 sm:p-8 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <CalendarIcon className="w-3.5 h-3.5" /> High-Yield Study Architecture
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <ShieldAlert className="w-3.5 h-3.5" /> 5-Day Lockout Phase Protected
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {planData.examName || selection.exam?.name || 'Target Examination'} Roadmap
            </h1>
            <p className="text-sm text-slate-300">
              Personalized timeline calibrated for <span className="text-indigo-300 font-bold">{targetHours} hrs/day</span> using <span className="text-violet-300 font-bold">{user.learningStyle === 'Rapid Learning' ? 'Rapid Learning' : 'Regular Study'}</span> mode.
              Target Exam Date: <span className="font-bold text-white">{planData.targetDate || user.examDate || 'Scheduled'}</span> ({totalDays} total days).
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 text-center">
              <span className="text-xs text-slate-400 block font-medium">Days Scheduled</span>
              <span className="text-xl font-extrabold text-white">{totalDays}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 text-center">
              <span className="text-xs text-slate-400 block font-medium">Daily Target</span>
              <span className="text-xl font-extrabold text-indigo-300">{targetHours}h</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 text-center col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-400 block font-medium">Progress</span>
              <span className="text-xl font-extrabold text-emerald-400">{completionRate}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Phase Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phase 1: Core Curriculum Learning */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                1
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Phase 1: Deep Curriculum Mastery</h3>
                <span className="text-xs text-slate-500">Days 1 to {learningDays}</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Active Phase
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Systematic coverage of all high-yield subjects and topics. Daily CBT practice, A4 structured notes, and active spaced repetition flashcards.
          </p>
        </div>

        {/* Phase 2: 5-Day Lockout & Revision Buffer */}
        <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-sm">
                2
              </span>
              <div>
                <h3 className="font-bold text-amber-950 dark:text-amber-200">Phase 2: 5-Day Exam Lockout Buffer</h3>
                <span className="text-xs text-amber-700/80 dark:text-amber-400">Final 5 Days Before Exam</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
              High Yield Drill
            </span>
          </div>
          <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
            Curriculum content editing is locked to prevent panic. Exclusively dedicated to full-length timed mock exams, weak topic reinforcement, and high-yield sticky pearls.
          </p>
        </div>
      </div>

      {/* 3. Week Selector Tab Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {schedule.map((w: any) => {
          const isSelected = w.week === activeWeek;
          const weekDoneCount = w.days?.filter((d: any) => d.completed).length || 0;
          const weekTotal = w.days?.length || 7;

          return (
            <button
              key={w.week}
              onClick={() => setActiveWeek(w.week)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
              }`}
            >
              <span>Week {w.week}</span>
              {w.isLockoutBuffer && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-500 text-white font-black">
                  LOCKOUT
                </span>
              )}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {weekDoneCount}/{weekTotal}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Active Week Schedule Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Week {currentWeekObj?.week}: {currentWeekObj?.focus}
            </h2>
            {currentWeekObj?.isLockoutBuffer && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Final Lockout Revision
              </span>
            )}
          </div>
          <button
            onClick={() => onSelectTab('practice')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            Launch CBT Practice <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentWeekObj?.days?.map((d: any) => {
            const isDone = d.completed;
            const isUpdating = updatingDay === d.day;
            const isLockoutDay = d.phase === 'REVISION_LOCKOUT';

            return (
              <div
                key={d.day}
                className={`p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                  isDone
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : isLockoutDay
                    ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-xl ${
                      isDone
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                        : isLockoutDay
                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                        : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    }`}>
                      Day {d.day}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {d.targetHours || targetHours}h
                    </span>
                  </div>

                  <h3 className={`font-bold text-sm leading-snug ${
                    isDone ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {d.title}
                  </h3>

                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {d.tasks?.map((task: string, tIdx: number) => (
                      <li key={tIdx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                        <span className={isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''}>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => toggleDayCompletion(d.day, isDone)}
                    disabled={isUpdating}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600'
                    }`}
                  >
                    {isDone ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Completed
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 text-slate-400" /> Mark Complete
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onSelectTab('notes')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Open Notes →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
