'use client';

import React from 'react';
import {
  Flame,
  LogOut,
  Bell,
  Sparkles,
  Calendar,
  Menu,
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
  onOpenExamSwitch?: () => void;
  onOpenAddTopic?: () => void;
  onOpenDiscoverExam?: () => void;
  onToggleSidebar?: () => void;
}

export function WorkspaceHeader({
  user,
  streakDays,
  onSignOut,
  onOpenProfile,
  onToggleSidebar,
}: WorkspaceHeaderProps) {
  const { selection } = useSelection();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile menu toggle + Logo */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Logo size="md" />
        </div>

        {/* Right: Quick Stats, Notifications, Theme Toggle & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Day Streak Pill */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-xs"
            title={`${streakDays} Day Study Streak`}
          >
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
            <span>{streakDays}d Streak</span>
          </div>

          {/* Exam Target Days Remaining */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-xs"
            title={`Target: ${user.examDate || 'Upcoming Exam'}`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>{user.daysLeft || 90}d left</span>
          </div>

          {/* Notifications Bell */}
          <button
            type="button"
            className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          </button>

          <ThemeToggle />

          {/* User Profile Menu Button */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            title="Profile & Settings"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-xs font-black shadow-xs">
              {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:inline font-bold">{user.firstName || 'Student'}</span>
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

