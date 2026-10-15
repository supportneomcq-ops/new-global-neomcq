'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Target,
  Sun,
  Flame,
  MessageSquare,
  BarChart2,
  ChevronRight,
  ArrowRight,
  FileQuestion,
  BookOpen,
  Layers,
  Sparkles,
  Trophy,
  FileText,
  StickyNote,
  Puzzle,
  Lightbulb,
  Check,
  CheckCircle2,
  Server,
  Shield,
  Database,
  Award,
} from 'lucide-react';
import { WorkspaceTab, StudySubTab } from './types';
import { useSelection } from '@/lib/context/selection-context';
import { OnboardingData } from '@/components/onboarding-flow';
import { getSupabaseClient } from '@/lib/supabase';
import { StudentBannerIllustration, TargetGoalIllustration } from './dashboard-illustrations';

interface DashboardHomeViewProps {
  user: OnboardingData;
  streakDays: number;
  completedHours: number;
  onLogStudyTime: (hours: number) => void;
  onSelectTab: (tab: WorkspaceTab, subTab?: StudySubTab) => void;
  onOpenAddTopic: () => void;
  onOpenExamSwitch: () => void;
}

interface UserStudyStats {
  streakDays: number;
  completedHoursToday: number;
  targetHours: number;
  readinessPercentage: number;
  questionsSolved: number;
  correctAnswers: number;
  overallAccuracy: number;
  recentActivities: Array<{
    id: string;
    title: string;
    type: string;
    score: string;
    time: string;
  }>;
  subjectMastery: Array<{
    id: string;
    name: string;
    score: number;
    questionsDone: number;
    status: string;
    color: string;
  }>;
}

export function DashboardHomeView({
  user,
  streakDays: propStreakDays,
  completedHours: propCompletedHours,
  onLogStudyTime,
  onSelectTab,
  onOpenExamSwitch,
}: DashboardHomeViewProps) {
  const {
    selection,
    availableSubjects,
    availableTopics,
    setSubject,
    setTopic,
  } = useSelection();

  const [dbStats, setDbStats] = useState<UserStudyStats | null>(null);
  const [completedHoursToday, setCompletedHoursToday] = useState<number>(propCompletedHours || 0);
  const [targetChecklist, setTargetChecklist] = useState({
    studyHours: false,
    solveMcqs: false,
    reviewWeak: false,
  });

  // Calculate greeting by time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Format current date e.g. "MONDAY, 12 JUL 2027"
  const getFormattedDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).toUpperCase();
  };

  // Fetch real study stats from backend
  const loadUserStats = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const effectiveUserId = authUser?.id || user.userId;

      const examId = selection.exam?.id;
      const params = new URLSearchParams();
      if (examId) params.set('examId', examId);
      if (effectiveUserId) params.set('userId', effectiveUserId);

      const res = await fetch(`/api/user/study-stats?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success && json.stats) {
        setDbStats(json.stats);
        if (json.stats.completedHoursToday) {
          setCompletedHoursToday(json.stats.completedHoursToday);
        }
      }
    } catch (err) {
      console.warn('[DashboardHomeView] Failed to load study stats:', err);
    }
  }, [selection.exam?.id, user.userId]);

  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  // Handle "Start Studying" action
  const handleStartStudying = () => {
    const newHours = Math.min(targetHours, +(completedHoursToday + 0.5).toFixed(1));
    setCompletedHoursToday(newHours);
    onLogStudyTime(0.5);
    setTargetChecklist((prev) => ({
      ...prev,
      studyHours: newHours >= targetHours,
    }));
    onSelectTab('practice');
  };

  const displayName = user.firstName || 'there';
  const examTitle = selection.exam?.name || user.examName || 'No exam selected';
  const targetHours = user.studyHours || dbStats?.targetHours || 2;
  const examDateValue = user.examDate ? new Date(user.examDate) : null;
  const hasValidExamDate = !!examDateValue && !Number.isNaN(examDateValue.getTime());
  const examDateFormatted = hasValidExamDate
    ? examDateValue!.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Not set';
  const daysLeft = hasValidExamDate ? Math.max(0, Math.ceil((examDateValue!.getTime() - Date.now()) / 86400000)) : null;
  const studyTimePreference = user.studyTime || 'Not set';

  const questionsCount = dbStats?.questionsSolved ?? 0;
  const accuracyRate = dbStats?.overallAccuracy ?? 0;
  const streakCount = dbStats?.streakDays ?? propStreakDays ?? 0;

  const goalProgressPercentage = Math.min(100, Math.round((completedHoursToday / targetHours) * 100));

  // Active topic for "Continue from where you left"
  const currentTopicName = selection.topic?.name || availableTopics[0]?.name || 'Select a topic';
  const currentSubjectName = selection.subject?.name || availableSubjects[0]?.name || 'Select a subject';

  // Display only subjects loaded from the selected exam's canonical curriculum.
  const subjectsToDisplay = availableSubjects.slice(0, 3);

  return (
    <div className="space-y-6 sm:space-y-8 select-none">
      
      {/* 1. Welcome Banner Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#EFF6FF] via-[#EEF2FF] to-[#F5F3FF] dark:from-[#0F172A] dark:via-[#1E1B4B]/50 dark:to-[#111827] border border-indigo-100/70 dark:border-indigo-900/40 px-4 py-3.5 sm:px-6 sm:py-4.5 lg:px-7 lg:py-4.5 shadow-xs">
        {/* Exact uploaded wide 3D student artwork; keep text as live HTML over the left side. */}
        <img
          src="/assets/student-welcome-banner.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 z-0 hidden lg:block h-full w-auto max-w-[42%] object-contain object-right-bottom select-none"
          draggable={false}
        />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6 relative z-10">
          
          {/* Left Text & Chips */}
          <div className="flex flex-col justify-center space-y-2 sm:space-y-2.5 max-w-xl lg:max-w-[58%] py-0.5">
            {/* Uppercase Date */}
            <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-violet-600 dark:text-violet-400 uppercase leading-none">
              {getFormattedDate()}
            </p>

            {/* Headline & Subhead */}
            <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl lg:text-[25px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                {getGreeting()}, {displayName}! 👋
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 font-medium leading-tight">
                Let&apos;s make today&apos;s study session count.
              </p>
            </div>

            {/* Selected Exam Pill / Action */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={onOpenExamSwitch}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border border-violet-100 dark:border-violet-900/50 shadow-2xs text-xs font-semibold text-slate-800 dark:text-slate-100 transition-all cursor-pointer group w-fit max-w-full"
                title="Click to switch or manage active exam"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Award className="w-3.5 h-3.5" />
                </span>
                <span className="truncate max-w-[200px] sm:max-w-sm md:max-w-md">{examTitle}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>

            {/* 3 Meta Chips in Row */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5">
              {/* Chip 1: Exam Date */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/85 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 shadow-2xs whitespace-nowrap">
                <CalendarIcon className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <span>Exam Date: <strong className="text-slate-900 dark:text-white font-semibold">{examDateFormatted}{daysLeft !== null ? ` (${daysLeft} days left)` : ''}</strong></span>
              </div>

              {/* Chip 2: Daily Goal */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/85 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 shadow-2xs whitespace-nowrap">
                <Target className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <span>Daily Goal: <strong className="text-slate-900 dark:text-white font-semibold">{targetHours} hrs</strong></span>
              </div>

              {/* Chip 3: Study Time */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/85 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 shadow-2xs whitespace-nowrap">
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Study Time: <strong className="text-slate-900 dark:text-white font-semibold">{studyTimePreference}</strong></span>
              </div>
            </div>

          </div>

          {/* Mobile uses the same uploaded artwork as a compact illustration below the details. */}
          <div className="lg:hidden w-full flex justify-end pt-1">
            <StudentBannerIllustration className="w-full max-w-[250px]" />
          </div>

        </div>
      </div>

      {/* 2. Today's Study Goal Card */}
      <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
        
        {/* Top Row: Icon, Title & Start Studying Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Today&apos;s Study Goal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {completedHoursToday} of {targetHours} hours completed
              </p>
            </div>
          </div>

          {/* Prominent Start Studying Button (Desktop/Tablet) */}
          <div className="hidden sm:block">
            <button
              type="button"
              onClick={handleStartStudying}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer hover:gap-3"
            >
              <span>Start Studying</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${goalProgressPercentage}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
            {goalProgressPercentage}%
          </span>
        </div>

        {/* 3 Compact Statistics */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1">
          {/* Questions Today */}
          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {questionsCount}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                Questions Today
              </p>
            </div>
          </div>

          {/* Accuracy Today */}
          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shrink-0">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {accuracyRate}%
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                Accuracy Today
              </p>
            </div>
          </div>

          {/* Day Streak */}
          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {streakCount}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                Day Streak
              </p>
            </div>
          </div>
        </div>

        {/* Start Studying Button (Mobile Only - Full Width) */}
        <div className="block sm:hidden pt-2">
          <button
            type="button"
            onClick={handleStartStudying}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Start Studying</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* 3. What do you want to study? Section (4 Primary Learning Cards) */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              What do you want to study?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose an activity and continue your preparation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('plan')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">View Study Plan</span>
            <span className="sm:hidden">See All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Primary Learning Cards Grid (Desktop: 4 cols, Tablet/Mobile: 2x2 grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Practice MCQs */}
          <div className="rounded-2xl p-4 sm:p-5 bg-[#F5F3FF] dark:bg-indigo-950/20 border border-indigo-100/90 dark:border-indigo-900/40 flex flex-col justify-between space-y-4 transition-all hover:shadow-xs">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  Practice MCQs
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                  Topic-wise questions with detailed explanations.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('practice')}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span>Start Practice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Study Notes */}
          <div className="rounded-2xl p-4 sm:p-5 bg-[#ECFDF5] dark:bg-emerald-950/20 border border-emerald-100/90 dark:border-emerald-900/40 flex flex-col justify-between space-y-4 transition-all hover:shadow-xs">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  Study Notes
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                  AI-generated notes for quick learning.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('notes', 'notes')}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span>Open Notes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Flashcards */}
          <div className="rounded-2xl p-4 sm:p-5 bg-[#FFFBEB] dark:bg-amber-950/20 border border-amber-100/90 dark:border-amber-900/40 flex flex-col justify-between space-y-4 transition-all hover:shadow-xs">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-400 flex items-center justify-center shadow-2xs">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  Flashcards
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                  Revise with active recall flashcards.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('flashcards', 'flashcards')}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span>Start Revision</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: AI Tutor */}
          <div className="rounded-2xl p-4 sm:p-5 bg-[#FDF2F8] dark:bg-pink-950/20 border border-pink-100/90 dark:border-pink-900/40 flex flex-col justify-between space-y-4 transition-all hover:shadow-xs">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-900/60 dark:text-pink-400 flex items-center justify-center shadow-2xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  AI Tutor
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                  Ask questions, get instant explanations.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('tutor')}
              className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span>Chat with AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* 4. Continue from where you left Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Continue from where you left
          </h2>
          <button
            type="button"
            onClick={() => onSelectTab('practice')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">View All</span>
            <span className="sm:hidden">See All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Continue Card */}
        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Left: Icon, Badge, Title & Breadcrumb */}
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shrink-0">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  Last Studied
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  {currentTopicName}
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-400">
                  {currentSubjectName} &gt; {currentTopicName.split(' ')[0]}
                </p>
              </div>
            </div>

            {/* Desktop Center/Right: Continue button and circular/pill progress */}
            <div className="hidden sm:flex items-center gap-5">
              <button
                type="button"
                onClick={() => onSelectTab('practice')}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-3 pl-4 border-l border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-600 flex items-center justify-center text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                  40%
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    Topic Progress
                  </p>
                  <p className="text-[10px] text-slate-400">
                    8 / 20 completed
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile View: Progress bar + Full-width Continue button */}
            <div className="block sm:hidden space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Topic Progress</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">40%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="w-[40%] h-full bg-indigo-600 rounded-full" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab('practice')}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 5. Your Subjects Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Your Subjects
          </h2>
          <button
            type="button"
            onClick={onOpenExamSwitch}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">Manage Subjects</span>
            <span className="sm:hidden">Manage</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Subject Cards Grid (Desktop: 3 cols, Tablet: 2/3 cols, Mobile: stacked) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {subjectsToDisplay.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">No subjects loaded yet</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Choose or set up an exam to load its real curriculum. NeoMCQ will not show unrelated sample subjects.</p>
              <button type="button" onClick={onOpenExamSwitch} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700">Manage Exam</button>
            </div>
          ) : (
            subjectsToDisplay.map((sub: any, idx: number) => {
              const IconComponent = sub.icon || (idx === 0 ? Server : idx === 1 ? Shield : Database);
              const colorConfig = [
                { bg: 'bg-[#F5F3FF] dark:bg-indigo-950/20', iconBg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400' },
                { bg: 'bg-[#ECFDF5] dark:bg-emerald-950/20', iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400' },
                { bg: 'bg-[#FDF2F8] dark:bg-pink-950/20', iconBg: 'bg-pink-100 text-pink-600 dark:bg-pink-900/60 dark:text-pink-400' },
              ][idx % 3];

              return (
                <button
                  type="button"
                  key={sub.id || idx}
                  onClick={() => {
                    if (sub.id && availableSubjects.some((subject) => subject.id === sub.id)) {
                      setSubject(sub);
                    }
                    onSelectTab('practice');
                  }}
                  className={`w-full rounded-2xl ${colorConfig.bg} border border-slate-200/70 p-4 text-left space-y-3 transition-all hover:shadow-sm dark:border-slate-800`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colorConfig.iconBg}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="line-clamp-1 text-xs font-bold text-slate-900 dark:text-white sm:text-sm">{sub.name}</h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">Explore topics for this subject</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Quick Tools Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Quick Tools
            </h2>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              More ways to learn and revise.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('quizzes')}
            className="sm:hidden text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
          >
            <span>See All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Compact Cards (Desktop: 4 cols, Tablet/Mobile: 2x2 grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Tool 1: Quizzes */}
          <div
            onClick={() => onSelectTab('quizzes')}
            className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5 cursor-pointer hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                  Quizzes
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Test your knowledge
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>

          {/* Tool 2: Fill in the Blanks */}
          <div
            onClick={() => onSelectTab('blanks')}
            className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5 cursor-pointer hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Puzzle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                  Fill in the Blanks
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Active recall practice
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>

          {/* Tool 3: Sticky Notes */}
          <div
            onClick={() => onSelectTab('sticky', 'sticky')}
            className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5 cursor-pointer hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400 flex items-center justify-center shrink-0">
                <StickyNote className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                  Sticky Notes
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Create quick notes
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>

          {/* Tool 4: Analytics */}
          <div
            onClick={() => onSelectTab('radar')}
            className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5 cursor-pointer hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                  Analytics
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Track your performance
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>

        </div>
      </div>

      {/* 7. Bottom Split: "Your Next Best Step" & "Upcoming Target" */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Left: Your Next Best Step */}
        <div className="rounded-3xl bg-[#EFF6FF] dark:bg-blue-950/20 border border-blue-100/90 dark:border-blue-900/40 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Lightbulb className="w-5 h-5" />
            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
              Your Next Best Step
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Based on your progress, we recommend:
          </p>

          {/* Recommended Action Card */}
          <div
            onClick={() => onSelectTab('practice')}
            className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                Review 10 questions on <span className="text-indigo-600 dark:text-indigo-400 font-bold">{currentTopicName}</span>
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </div>

        {/* Right: Upcoming Target with Interactive Checklist & Target Illustration */}
        <div className="rounded-3xl bg-[#FFFBEB] dark:bg-amber-950/20 border border-amber-100/90 dark:border-amber-900/40 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <CalendarIcon className="w-5 h-5" />
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Upcoming Target
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('plan')}
              className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Set New Goal &gt;
            </button>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Keep your momentum going!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            {/* Checklist */}
            <div className="space-y-2.5 w-full sm:w-auto">
              {[
                { key: 'studyHours', label: `Complete ${targetHours} hrs of study`, checked: targetChecklist.studyHours || completedHoursToday >= targetHours },
                { key: 'solveMcqs', label: 'Solve 50 MCQs', checked: targetChecklist.solveMcqs || questionsCount >= 50 },
                { key: 'reviewWeak', label: 'Review weak topics', checked: targetChecklist.reviewWeak },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() =>
                      setTargetChecklist((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key as keyof typeof prev],
                      }))
                    }
                    className="w-4 h-4 rounded border-amber-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  />
                  <span className={item.checked ? 'line-through text-slate-400 dark:text-slate-400' : ''}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Target Illustration */}
            <div className="shrink-0 flex justify-center w-full sm:w-auto">
              <TargetGoalIllustration className="w-28 sm:w-32" />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
