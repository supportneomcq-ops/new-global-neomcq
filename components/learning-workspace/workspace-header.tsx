'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut,
  Bell,
  Search,
  User,
  Shield,
  CreditCard,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  Layers,
  BookOpen,
  StickyNote,
  Puzzle,
  TrendingUp,
  Calendar,
  Bookmark,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { OnboardingData } from '@/components/onboarding-flow';
import { getSupabaseClient } from '@/lib/supabase';
import { WorkspaceTab, StudySubTab } from './types';
import { useSelection } from '@/lib/context/selection-context';

interface WorkspaceHeaderProps {
  user: OnboardingData;
  activeTab?: WorkspaceTab;
  streakDays?: number;
  completedHours?: number;
  onSignOut: () => void;
  onOpenProfile: (tab?: string) => void;
  onSelectTab?: (tab: WorkspaceTab, subTab?: StudySubTab) => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onOpenExamSwitch?: () => void;
  onOpenAddTopic?: () => void;
  onOpenDiscoverExam?: () => void;
}

export function WorkspaceHeader({
  user,
  activeTab = 'dashboard',
  onSignOut,
  onOpenProfile,
  onSelectTab,
  onToggleSidebar,
  onOpenExamSwitch,
}: WorkspaceHeaderProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(2);

  const { selection, availableSubjects, availableTopics, setSubject, setTopic } = useSelection();

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        searchInput?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      onSignOut();
    }
  };

  const displayName = user.firstName || 'Inus';
  const examTitle = selection.exam?.name || user.examName || 'AWS Certified Solutions Architect Associate';

  // Quick search filtering across subjects and topics
  const filteredTopics = searchQuery.trim()
    ? availableTopics.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];
  const filteredSubjects = searchQuery.trim()
    ? availableSubjects.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3)
    : [];

  const handleSelectSearchedTopic = (top: any) => {
    setTopic(top);
    const parentSub = availableSubjects.find((s) => s.id === top.subject_id);
    if (parentSub) setSubject(parentSub);
    setSearchQuery('');
    setIsSearchFocused(false);
    onSelectTab?.('practice');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#0E1324] border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="w-full max-w-[1536px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left Zone: Hamburger + Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Hamburger button (Toggles desktop sidebar or opens mobile drawer) */}
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileDrawerOpen(true);
                } else if (onToggleSidebar) {
                  onToggleSidebar();
                }
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Toggle Menu"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* NeoMCQ Logo with AI badge */}
            <div
              className="cursor-pointer"
              onClick={() => onSelectTab?.('dashboard')}
              title="NeoMCQ Dashboard"
            >
              <Logo size="md" showText={true} />
            </div>
          </div>

          {/* Center Zone: Global Search (Desktop & Tablet) */}
          <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-xl mx-2 sm:mx-6 relative">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search topics, subjects or ask AI..."
                className="w-full pl-10 pr-16 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                  Ctrl K
                </kbd>
              </div>
            </div>

            {/* Search Dropdown Results */}
            {isSearchFocused && (searchQuery.trim().length > 0) && (
              <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl overflow-hidden p-2">
                {filteredSubjects.length === 0 && filteredTopics.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No matching subjects or topics found for &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-1 text-xs">
                    {filteredSubjects.length > 0 && (
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Subjects
                      </div>
                    )}
                    {filteredSubjects.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setSubject(sub);
                          setSearchQuery('');
                          setIsSearchFocused(false);
                          onSelectTab?.('dashboard');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 font-medium flex items-center justify-between"
                      >
                        <span>{sub.name}</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400">Subject</span>
                      </button>
                    ))}

                    {filteredTopics.length > 0 && (
                      <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Topics
                      </div>
                    )}
                    {filteredTopics.map((top) => (
                      <button
                        key={top.id}
                        type="button"
                        onClick={() => handleSelectSearchedTopic(top)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 font-medium flex items-center justify-between"
                      >
                        <span className="truncate">{top.name}</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400">Practice</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Zone: Theme Toggle + Notifications + User Avatar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Theme Toggle (Sun/Moon pill) */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* Notification Bell */}
            <div ref={notifMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsNotificationOpen(!isNotificationOpen);
                  setUnreadNotifications(0);
                }}
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0E1324]" />
                )}
              </button>

              {/* Notifications Popover */}
              {isNotificationOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-heading font-bold text-xs text-slate-900 dark:text-white">
                      Notifications
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer">
                      Mark all read
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                      <p className="font-semibold text-indigo-900 dark:text-indigo-200">
                        🔥 Daily Goal Ready
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        Your 2-hour daily study target is set. Complete today&apos;s session to keep your streak!
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        ⚡ Syllabus Updated
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {examTitle} high-yield clinical pearls have been refreshed.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar with Name & Dropdown */}
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 p-1 pl-1 sm:pr-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
                aria-label="User account menu"
                aria-expanded={isProfileMenuOpen}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-400 flex items-center justify-center text-white font-bold text-xs ring-2 ring-indigo-500/20 overflow-hidden">
                  <span className="tracking-tight">{displayName.charAt(0).toUpperCase()}</span>
                </div>

                {/* Name & Chevron (Desktop) */}
                <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <span>Hi, {displayName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-1.5 space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {displayName} {user.lastName || ''}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenProfile('profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Profile & Preferences</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenProfile('security');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>Security & Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenProfile('billing');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Subscription & Plans</span>
                  </button>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Mobile & Tablet Slide-out Drawer Menu */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-[#0E1324] border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between p-4 z-50 overflow-y-auto">
            <div className="space-y-4">
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <Logo size="sm" showText={true} />
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Theme toggle on mobile */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Theme</span>
                <ThemeToggle />
              </div>

              {/* Nav links matching sidebar */}
              <div className="space-y-1">
                {[
                  { id: 'dashboard' as WorkspaceTab, label: 'Dashboard', icon: Layers },
                  { id: 'practice' as WorkspaceTab, label: 'Practice MCQs', icon: FileQuestion },
                  { id: 'quizzes' as WorkspaceTab, label: 'Quizzes', icon: CheckCircle2 },
                  { id: 'flashcards' as WorkspaceTab, label: 'Flashcards', icon: BookOpen },
                  { id: 'notes' as WorkspaceTab, label: 'Study Notes', icon: BookOpen },
                  { id: 'sticky' as WorkspaceTab, label: 'Sticky Notes', icon: StickyNote },
                  { id: 'blanks' as WorkspaceTab, label: 'Fill in the Blanks', icon: Puzzle },
                  { id: 'tutor' as WorkspaceTab, label: 'AI Tutor', icon: Sparkles, hasAiBadge: true },
                  { id: 'plan' as WorkspaceTab, label: 'Study Plan', icon: Calendar },
                  { id: 'radar' as WorkspaceTab, label: 'Analytics', icon: TrendingUp },
                  { id: 'saved' as WorkspaceTab, label: 'Bookmarks', icon: Bookmark },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        onSelectTab?.(item.id);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.hasAiBadge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${isActive ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'}`}>
                          AI
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom My Exam Card inside drawer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  My Exam
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                  {examTitle}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenExamSwitch?.();
                  }}
                  className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition-colors"
                >
                  Change
                </button>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
