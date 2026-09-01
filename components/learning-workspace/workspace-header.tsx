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
  Settings,
  ChevronDown,
  X,
  Menu,
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
  onSignOut,
  onOpenProfile,
  onSelectTab,
  onToggleSidebar,
}: WorkspaceHeaderProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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
    { label: 'Profile', icon: User, action: () => onOpenProfile('profile') },
    { label: 'Account', icon: Shield, action: () => onOpenProfile('security') },
    { label: 'Study Plan', icon: Calendar, action: () => onSelectTab && onSelectTab('plan') },
    { label: 'Subscription', icon: CreditCard, action: () => onOpenProfile('subscription') },
    { label: 'Credits / AI Usage', icon: Zap, action: () => onOpenProfile('credits') },
    { label: 'Settings', icon: Settings, action: () => onOpenProfile('settings') },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Sidebar Toggle & NeoMCQ Logo */}
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

        {/* Right: Exam Days Left, Notifications, Theme Toggle & Profile Sheet Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Exam Target Days Remaining */}
          {user.examDate && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-xs"
              title={`Target Exam Date: ${user.examDate}`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{user.daysLeft || 90}d left</span>
            </div>
          )}

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

          {/* User Avatar & Menu Dropdown Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              title="User Account & Profile Menu"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0">
                {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </div>
              <span className="hidden sm:inline font-bold max-w-[100px] truncate">
                {user.firstName || 'Student'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Desktop / Mobile Dropdown Menu */}
            {isProfileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                    {user.examName && (
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                        🎯 {user.examName}
                      </p>
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
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>{isSigningOut ? 'Signing out...' : 'Logout'}</span>
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
