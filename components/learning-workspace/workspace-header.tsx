'use client';

import React from 'react';
import {
  Flame,
  Lock,
  Plus,
  LogOut,
  ChevronRight,
  BookOpen,
  Layers,
  Clock,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSelection } from '@/lib/context/selection-context';
import { OnboardingData } from '@/components/onboarding-flow';

interface WorkspaceHeaderProps {
  user: OnboardingData;
  streakDays: number;
  completedHours: number;
  onSignOut: () => void;
  onOpenProfile: () => void;
  onOpenExamSwitch: () => void;
  onOpenAddTopic: () => void;
  onOpenDiscoverExam: () => void;
}

export function WorkspaceHeader({
  user,
  streakDays,
  completedHours,
  onSignOut,
  onOpenProfile,
  onOpenExamSwitch,
  onOpenAddTopic,
  onOpenDiscoverExam,
}: WorkspaceHeaderProps) {
  const {
    selection,
    setSubject,
    setTopic,
    availableSubjects,
    availableTopics,
    isExamLocked,
  } = useSelection();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Logo & Active Exam Pill */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Logo size="md" />

          {/* Active Exam Pill (Desktop/Tablet) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Exam:</span>
            <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 max-w-[200px] truncate">
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">{selection.exam?.name || user.examName}</span>
            </div>
            <button
              type="button"
              onClick={onOpenExamSwitch}
              className="text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-bold underline cursor-pointer ml-1"
              title="Switch Exam ($2 USD)"
            >
              Switch
            </button>
            <button
              type="button"
              onClick={onOpenDiscoverExam}
              className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Discover exams worldwide"
            >
              <Plus className="w-3 h-3" />
              <span>Discover</span>
            </button>
          </div>
        </div>

        {/* Center: Hierarchy Breadcrumb Selector (Subject & Topic) */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          {/* Subject Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <select
              value={selection.subject?.id || ''}
              onChange={(e) => {
                const target = availableSubjects.find((s) => s.id === e.target.value);
                if (target) setSubject(target);
              }}
              className="bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              {availableSubjects.length > 0 ? (
                availableSubjects.map((s) => (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {s.name}
                  </option>
                ))
              ) : (
                <option value={selection.subject?.id || ''} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {selection.subject?.name || 'Select Subject'}
                </option>
              )}
            </select>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          {/* Topic Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <select
              value={selection.topic?.id || ''}
              onChange={(e) => {
                const target = availableTopics.find((t) => t.id === e.target.value);
                if (target) setTopic(target);
              }}
              className="bg-transparent text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              {availableTopics.length > 0 ? (
                availableTopics.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {t.name}
                  </option>
                ))
              ) : (
                <option value={selection.topic?.id || ''} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {selection.topic?.name || 'Select Topic'}
                </option>
              )}
            </select>
          </div>

          {/* + Add Topic Quick Button */}
          <button
            type="button"
            onClick={onOpenAddTopic}
            className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
            title="Add new topic"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Streak, Study Hours, Theme Toggle & User Menu */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Day Streak Pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 text-xs font-bold"
            title={`${streakDays} Day Study Streak`}
          >
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>{streakDays}d</span>
          </div>

          {/* Exam Countdown Pill */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            title={`Target: ${user.examDate}`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{user.daysLeft}d left</span>
          </div>

          <ThemeToggle />

          {/* User Profile Button */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            title="Profile & Preferences"
          >
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
              {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:inline font-semibold">{user.firstName}</span>
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={onSignOut}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
