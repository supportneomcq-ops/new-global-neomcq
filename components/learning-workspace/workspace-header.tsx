'use client';

import React, { useState } from 'react';
import {
  LogOut,
  Bell,
  Calendar,
  User,
  Shield,
  CreditCard,
  Zap,
  ChevronDown,
  Menu,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { OnboardingData } from '@/components/onboarding-flow';
import { getSupabaseClient } from '@/lib/supabase';
import { WorkspaceTab } from './types';

interface WorkspaceHeaderProps {
  user: OnboardingData;
  streakDays?: number;
  completedHours?: number;
  onSignOut: () => void;
  onOpenProfile: (tab?: string) => void;
  onSelectTab?: (tab: WorkspaceTab) => void;
  onToggleSidebar?: () => void;
  onOpenExamSwitch?: () => void;
  onOpenAddTopic?: () => void;
  onOpenDiscoverExam?: () => void;
}

export function WorkspaceHeader({
  user,
  streakDays = 0,
  onSignOut,
  onOpenProfile,
  onSelectTab,
  onToggleSidebar,
  onOpenExamSwitch,
}: WorkspaceHeaderProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  const handleLogout = async () => {
    try {
      setIsSigningOut(true);
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsSigningOut(false);
      onSignOut();
    }
  };

  const menuItems = [
    { label: 'Profile & Preferences', icon: User, action: () => onOpenProfile('profile') },
    { label: 'Security & Auth', icon: Shield, action: () => onOpenProfile('security') },
    { label: 'Exam Study Plan', icon: Calendar, action: () => onSelectTab && onSelectTab('plan') },
    { label: 'Subscription & Invoices', icon: CreditCard, action: () => onOpenProfile('billing') },
    { label: 'AI Usage & Credits', icon: Zap, action: () => onOpenProfile('credits') },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#070b18]/90 backdrop-blur-xl transition-colors">
      <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Mobile Sidebar Toggle & Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
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

          <div className="flex items-center gap-3">
            <Logo size="md" />
            {user.examName && (
              <button
                type="button"
                onClick={onOpenExamSwitch}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer group"
                title="Active Exam Syllabus — Click to switch or manage"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                  {user.examName}
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline">
                  Change
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Zone 2: Fast Study Stats & Streak (Desktop) */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          {/* Streak Indicator */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-bold"
            title={`${streakDays} days consecutive study streak`}
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span className="font-mono tabular-nums">{streakDays}</span>
            <span className="font-medium text-slate-500 dark:text-slate-400">Day Streak</span>
          </div>

          {/* Exam Days Remaining */}
          {user.examDate && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-bold"
              title={`Exam Date: ${user.examDate}`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="font-mono tabular-nums">{user.daysLeft || 90}</span>
              <span className="font-medium text-slate-500 dark:text-slate-400">Days to Exam</span>
            </div>
          )}
        </div>

        {/* Zone 3: Actions (Notifications, Theme Toggle, Profile Menu) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Notifications Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotificationToast(!showNotificationToast)}
              className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="sr-only">Notifications</span>
            </button>

            {showNotificationToast && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotificationToast(false)} />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Activity Alerts</span>
                    <span className="text-[10px] text-slate-400 font-medium">All caught up</span>
                  </div>
                  <div className="py-3 text-center space-y-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Daily syllabus is up to date</p>
                    <p className="text-[11px] text-slate-400">All 8 content tools synced to your current exam blueprint.</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <ThemeToggle />

          {/* User Profile Pill & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="User Account & Profile Menu"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0">
                {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </div>
              <span className="hidden sm:inline font-bold max-w-[100px] truncate">
                {user.firstName || 'Learner'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isProfileMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                    {user.examName && (
                      <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span className="truncate">{user.examName}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            item.action();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer"
                        >
                          <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}

                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleLogout();
                        }}
                        disabled={isSigningOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors text-left cursor-pointer disabled:opacity-50"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
