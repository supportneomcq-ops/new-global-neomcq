'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Zap,
  Clock,
  Flame,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Plus,
  Target,
  Sparkles,
  Layers,
  ArrowRight,
  GraduationCap,
  Award,
  Calendar,
  Compass,
  Check,
  Activity,
  AlertTriangle,
  Search,
  Loader2,
  TrendingUp,
  FileText,
  StickyNote,
  Puzzle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { WorkspaceTab, StudySubTab } from './types';
import { useSelection } from '@/lib/context/selection-context';
import { useTopicContent } from '@/lib/context/topic-content-context';
import { OnboardingData } from '@/components/onboarding-flow';
import { getSupabaseClient } from '@/lib/supabase';
import { LearningContextBar } from './learning-context-bar';

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
  weaknessGap: {
    subjectName: string;
    score: number;
    message: string;
  } | null;
  sevenDayConsistency: boolean[];
}

export function DashboardHomeView({
  user,
  streakDays: propStreakDays,
  completedHours: propCompletedHours,
  onLogStudyTime: propOnLogStudyTime,
  onSelectTab,
  onOpenAddTopic,
  onOpenExamSwitch,
}: DashboardHomeViewProps) {
  const {
    selection,
    availableSubjects,
    availableTopics,
    setSubject,
    setTopic,
    targetDate,
  } = useSelection();

  const { content, cards, isOrchestrating, orchestrateTopic } = useTopicContent();

  const [searchTopicQuery, setSearchTopicQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [dbStats, setDbStats] = useState<UserStudyStats | null>(null);
  const [, setIsLoadingStats] = useState(false);
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [studyActionError, setStudyActionError] = useState('');
  const [justLoggedHours, setJustLoggedHours] = useState<number | null>(null);

  // Fetch real user study statistics
  const loadUserStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const effectiveUserId = authUser?.id || user.userId;

      const examId = selection.exam?.id;
      const params = new URLSearchParams();
      if (examId) params.set('examId', examId);
      if (effectiveUserId) params.set('userId', effectiveUserId);

      const res = await fetch(`/api/user/study-stats?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success || !json.stats) {
        throw new Error(json.error || 'Study statistics are temporarily unavailable.');
      }
      setDbStats(json.stats);
    } catch (err) {
      console.warn('[DashboardHomeView] Failed to load study stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [selection.exam?.id, user.userId]);

  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  // Log real study time to database with optimistic update
  const handleLogStudyTime = async (hours: number) => {
    try {
      setIsLoggingTime(true);
      setStudyActionError('');
      setJustLoggedHours(hours);

      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const effectiveUserId = authUser?.id || user.userId;
      if (!effectiveUserId) throw new Error('Please sign in again before logging study time.');

      const res = await fetch('/api/user/study-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          examId: selection.exam?.id,
          subjectId: selection.subject?.id,
          topicId: selection.topic?.id,
          hours,
          durationMins: Math.round(hours * 60),
          mode: 'self_study',
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Study time could not be saved. Please try again.');
      }
      propOnLogStudyTime(hours);
      await loadUserStats();
      setTimeout(() => setJustLoggedHours(null), 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Study time could not be saved.';
      setStudyActionError(message);
      console.error('[DashboardHomeView] Log time error:', err);
      setJustLoggedHours(null);
    } finally {
      setIsLoggingTime(false);
    }
  };

  // Resolved dynamic values
  const effectiveStreak = dbStats?.streakDays ?? propStreakDays ?? 0;
  const effectiveCompletedHours = dbStats?.completedHoursToday ?? propCompletedHours ?? 0;
  const effectiveTargetHours = dbStats?.targetHours ?? Math.max(1, user.studyHours || 2);
  const effectiveReadiness = dbStats?.readinessPercentage ?? 0;
  const progressPercentage = Math.min(100, Math.round((effectiveCompletedHours / effectiveTargetHours) * 100));

  // Current focus labels
  const activeExamName = selection.exam?.name || user.examName || 'Exam Syllabus';
  const activeSubjectName = selection.subject?.name || (availableSubjects[0]?.name ?? 'Core Foundations');
  const activeTopicName = selection.topic?.name || (availableTopics[0]?.name ?? 'High-Yield Core Concepts');

  // Exact target date & days left computation
  const resolvedTargetDate = targetDate || user.examDate;
  const calculatedDaysLeft = (() => {
    if (!resolvedTargetDate) return user.daysLeft || 90;
    const target = new Date(resolvedTargetDate).getTime();
    const now = new Date().getTime();
    const diff = target - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  // Filter topics
  const filteredTopics = availableTopics.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTopicQuery.toLowerCase());
    const matchesSubject = selectedSubjectFilter === 'all' || selection.subject?.id === selectedSubjectFilter;
    return matchesSearch && matchesSubject;
  });

  // Resolved Subject Mastery list for the active exam
  const resolvedSubjectMastery = (dbStats?.subjectMastery && dbStats.subjectMastery.length > 0)
    ? dbStats.subjectMastery
    : availableSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        score: 0,
        questionsDone: 0,
        status: 'Ready to Practice',
        color: 'bg-indigo-500',
      }));

  // Real Counts for Learning Cards based on active topic content
  const mcqCount = content?.mcqs?.length ?? 0;
  const quizACount = content?.quiz_a?.length ?? 0;
  const quizBCount = content?.quiz_b?.length ?? 0;
  const flashcardCount = content?.flashcards?.length ?? 0;
  const stickyCount = content?.sticky_notes?.length ?? 0;
  const blanksCount = content?.fill_in_the_blanks?.length ?? 0;
  const tutorPhasesCount = content?.whiteboard_phases?.length ?? 0;

  // The 8 Core Learning Modalities
  const learningModalities = [
    {
      featureId: 'mcq',
      title: 'MCQ Practice Engine',
      kicker: 'Clinical Vignettes & Timed Drill',
      description: 'Exam-paced questions with detailed rationales, clinical pearls, and distractor breakdowns.',
      tab: 'practice' as WorkspaceTab,
      icon: Brain,
      themeClass: 'neo-modality-indigo',
      borderHover: 'hover:border-indigo-500',
      accentColor: 'text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      defaultQty: `${mcqCount > 0 ? mcqCount : '30'} Questions`,
      ctaLabel: 'Launch CBT Practice',
    },
    {
      featureId: 'quiz_a',
      title: 'Quiz Set A (Baseline)',
      kicker: 'Diagnostic Evaluation',
      description: 'Formal diagnostic assessment measuring baseline comprehension on this topic.',
      tab: 'quizzes' as WorkspaceTab,
      icon: Zap,
      themeClass: 'neo-modality-sky',
      borderHover: 'hover:border-sky-500',
      accentColor: 'text-sky-600 dark:text-sky-400',
      badgeBg: 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      defaultQty: `${quizACount > 0 ? quizACount : '15'} Questions`,
      ctaLabel: 'Start Evaluation',
    },
    {
      featureId: 'quiz_b',
      title: 'Quiz Set B (Mastery)',
      kicker: 'Parallel Verification',
      description: 'Secondary evaluation set designed to confirm true mastery and eliminate false confidence.',
      tab: 'quizzes' as WorkspaceTab,
      icon: Target,
      themeClass: 'neo-modality-sky',
      borderHover: 'hover:border-cyan-500',
      accentColor: 'text-cyan-600 dark:text-cyan-400',
      badgeBg: 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      defaultQty: `${quizBCount > 0 ? quizBCount : '15'} Questions`,
      ctaLabel: 'Verify Mastery',
    },
    {
      featureId: 'flashcards',
      title: 'Spaced Flashcards',
      kicker: 'Active Recall Deck',
      description: 'Curated definition and concept cards with 3D flip animation and spaced repetition scoring.',
      tab: 'flashcards' as WorkspaceTab,
      icon: Layers,
      themeClass: 'neo-modality-emerald',
      borderHover: 'hover:border-emerald-500',
      accentColor: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      defaultQty: `${flashcardCount > 0 ? flashcardCount : '24'} Cards`,
      ctaLabel: 'Drill Flashcards',
    },
    {
      featureId: 'a4_notes',
      title: 'A4 High-Yield Notes',
      kicker: 'Printable Sheet',
      description: 'Comprehensive study sheet with pathophysiology pathways, key diagnostic algorithms, and tables.',
      tab: 'notes' as WorkspaceTab,
      subTab: 'notes' as StudySubTab,
      icon: FileText,
      themeClass: 'neo-modality-amber',
      borderHover: 'hover:border-amber-500',
      accentColor: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      defaultQty: 'A4 Summary Sheet',
      ctaLabel: 'Read Notes',
    },
    {
      featureId: 'sticky_notes',
      title: 'Sticky Idea Board',
      kicker: 'Rapid Visual Scan',
      description: 'Bite-sized sticky tiles highlighting formulas, high-probability test traps, and mnemonics.',
      tab: 'notes' as WorkspaceTab,
      subTab: 'sticky' as StudySubTab,
      icon: StickyNote,
      themeClass: 'neo-modality-amber',
      borderHover: 'hover:border-orange-500',
      accentColor: 'text-orange-600 dark:text-orange-400',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      defaultQty: `${stickyCount > 0 ? stickyCount : '12'} Key Points`,
      ctaLabel: 'Open Canvas',
    },
    {
      featureId: 'fill_in_the_blanks',
      title: 'Cloze Deletion Blanks',
      kicker: 'Precision Recall',
      description: 'Fill-in-the-blank clinical statements targeting key pharmacological agents and criteria.',
      tab: 'blanks' as WorkspaceTab,
      icon: Puzzle,
      themeClass: 'neo-modality-rose',
      borderHover: 'hover:border-rose-500',
      accentColor: 'text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      defaultQty: `${blanksCount > 0 ? blanksCount : '10'} Cloze Exercises`,
      ctaLabel: 'Complete Blanks',
    },
    {
      featureId: 'ai_tutor',
      title: 'AI Tutor Whiteboard',
      kicker: 'Synchronized Visual Tutor',
      description: 'Step-by-step whiteboard animation illustrating complex mechanisms with synchronized narration.',
      tab: 'tutor' as WorkspaceTab,
      icon: GraduationCap,
      themeClass: 'neo-modality-purple',
      borderHover: 'hover:border-purple-500',
      accentColor: 'text-purple-600 dark:text-purple-400',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      defaultQty: `${tutorPhasesCount > 0 ? tutorPhasesCount : '6'} Whiteboard Scenes`,
      ctaLabel: 'Launch Whiteboard',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* 1. Context Navigator (Exam > Subject > Topic > Subtopic) */}
      <LearningContextBar />

      {/* ========================================================================= */}
      {/* 2. COMMAND CENTER HERO DECK: HIGH VELOCITY & EXAM MISSION                  */}
      {/* ========================================================================= */}
      <section className="relative rounded-3xl bg-gradient-to-br from-white via-indigo-50/50 to-sky-50/40 dark:from-[#0d1326] dark:via-[#090d1c] dark:to-[#060914] border border-slate-200/90 dark:border-white/10 shadow-xl shadow-indigo-950/5 dark:shadow-black/40 p-5 sm:p-7 lg:p-8 overflow-hidden transition-all">
        {/* Ambient atmospheric gradients */}
        <div className="absolute -top-28 -right-28 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -left-28 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Left Column: Greeting, Exam Blueprint, Clean Metadata */}
          <div className="space-y-3.5 max-w-2xl">
            {/* Clean unboxed status row (Zero-Pill compliant) */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> High-Yield Engine
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span>Canonical Blueprint Synced</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Target Exam: {activeExamName}</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Welcome back, {user.firstName || 'Learner'}!
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                Your preparation for <strong className="text-slate-900 dark:text-white font-bold">{activeExamName}</strong> is active. Target date is <span className="text-slate-900 dark:text-white font-semibold">{resolvedTargetDate || 'Scheduled'}</span> ({calculatedDaysLeft} days remaining).
              </p>
            </div>

            {/* Clean unboxed metadata strip with subtle separators */}
            <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="text-slate-400 dark:text-slate-500">Subject:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold truncate max-w-[160px]">{activeSubjectName}</span>
              </div>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <div className="flex items-center gap-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-slate-400 dark:text-slate-500">Focus:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[180px]">{activeTopicName}</span>
              </div>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-slate-400 dark:text-slate-500">Target:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold">{effectiveTargetHours}h / day</span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Impact 3-Metric Cockpit Matrix */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shrink-0 backdrop-blur-md shadow-xs">
            {/* Metric 1: Days to Exam */}
            <div className="text-center px-2 py-1 space-y-0.5">
              <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums tracking-tight">
                {calculatedDaysLeft}
              </div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-500" /> Days Left
              </div>
            </div>

            {/* Metric 2: Study Streak */}
            <div className="text-center px-2 py-1 space-y-0.5 border-x border-slate-200/80 dark:border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-amber-500 font-mono tabular-nums tracking-tight flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
                {effectiveStreak}
              </div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                Day Streak
              </div>
            </div>

            {/* Metric 3: Readiness Score */}
            <div className="text-center px-2 py-1 space-y-0.5">
              <div className="text-2xl sm:text-3xl font-black text-emerald-500 font-mono tabular-nums tracking-tight">
                {effectiveReadiness > 0 ? `${effectiveReadiness}%` : 'Ready'}
              </div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                <Award className="w-3 h-3 text-emerald-500" /> Readiness
              </div>
            </div>
          </div>
        </div>

        {/* Hero Bottom Bar: Fast Session Starters */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-200/70 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Active syllabus: <strong className="text-slate-900 dark:text-white font-bold">{activeTopicName}</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onSelectTab('practice')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start CBT Practice</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('notes')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-white/15 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Study Notes (A4)</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('tutor')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>AI Tutor</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. "WHAT SHOULD I STUDY NOW?" — HIGH-VELOCITY SMART NEXT STEPS             */}
      {/* ========================================================================= */}
      <section className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> What Should I Study Now?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Intelligent sequence generated from your syllabus blueprint and performance gaps.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Current Focus: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{activeTopicName}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Diagnostic CBT Sprint */}
          <div className="p-5 rounded-2xl neo-glass-card neo-glass-card-hover flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
                  01. Priority · Timed Sprint
                </span>
                <span className="text-xs font-medium text-slate-400 font-mono tabular-nums flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> 12 Mins
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  10-Question Diagnostic Sprint
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Solve timed exam vignettes on {activeTopicName} with high-yield clinical pearls and instant rationales.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab('practice')}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm group-hover:shadow-md"
            >
              <Zap className="w-3.5 h-3.5" /> Launch CBT Sprint <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Spaced Recall Flashcards */}
          <div className="p-5 rounded-2xl neo-glass-card neo-glass-card-hover flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  02. Priority · Active Recall
                </span>
                <span className="text-xs font-medium text-slate-400 font-mono tabular-nums flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> 8 Mins
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Review Spaced Flashcard Deck
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Drill high-probability test criteria, core formulas, and key diagnostic thresholds on {activeTopicName}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab('flashcards')}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" /> Drill Flashcards ({flashcardCount > 0 ? flashcardCount : 24}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: AI Synaptic Whiteboard */}
          <div className="p-5 rounded-2xl neo-glass-card neo-glass-card-hover flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 tracking-tight">
                  03. Priority · Visual Tutor
                </span>
                <span className="text-xs font-medium text-slate-400 font-mono tabular-nums flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> 10 Mins
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  AI Whiteboard Pathway Lesson
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Interactive multi-phase visual diagram explaining the core mechanisms and pitfalls of {activeTopicName}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab('tutor')}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Launch Whiteboard <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CONTENT LIBRARY & THE 8 LEARNING MODALITIES (BENTO GRID)                */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> High-Yield Modality Suite
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Eight synchronized learning engines loaded for <strong className="text-slate-800 dark:text-slate-200">{activeTopicName}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOrchestrating && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Live Syncing...
              </span>
            )}
            <button
              type="button"
              onClick={() => orchestrateTopic(true)}
              disabled={isOrchestrating}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Force regenerate content for all 8 learning engines"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Regenerate Topic</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {learningModalities.map((cfg) => {
            const cardState = cards.find((c) => c.featureId === cfg.featureId);
            const status = cardState?.status || 'READY';
            const versionLabel = cardState?.versionLabel || 'v1 Latest';
            const quantityLabel = cardState?.quantityLabel || cfg.defaultQty;
            const IconComp = cfg.icon;

            return (
              <div
                key={cfg.featureId}
                onClick={() => {
                  if (status === 'FAILED') {
                    orchestrateTopic(true);
                  }
                  onSelectTab(cfg.tab, cfg.subTab);
                }}
                className={`p-5 rounded-2xl neo-glass-card neo-glass-card-hover ${cfg.themeClass} ${cfg.borderHover} flex flex-col justify-between group cursor-pointer`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Icon + Version + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      <IconComp className={`w-5 h-5 ${cfg.accentColor}`} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold font-mono text-slate-500 dark:text-slate-400">
                        {versionLabel}
                      </span>
                      {status === 'READY' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ready" />
                      )}
                      {status === 'GENERATING' && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" title="Generating" />
                      )}
                      {status === 'FAILED' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" title="Generation Failed" />
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {cfg.kicker}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mt-0.5">
                      {cfg.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {cfg.description}
                    </p>
                  </div>

                  {/* Unboxed Count (Zero-Pill compliant) */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span className="font-mono tabular-nums text-slate-900 dark:text-slate-200 font-bold">
                      {quantityLabel}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Syllabus Synced</span>
                  </div>
                </div>

                {/* Bottom Action Link */}
                <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold">
                  <span className={`${cfg.accentColor} flex items-center justify-between w-full group-hover:underline`}>
                    <span>{cfg.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. TWO-COLUMN MAIN CANVAS: CURRICULUM + RECENT SESSIONS + METRICS HUD       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* LEFT 2 COLUMNS: SYLLABUS TOPIC BROWSER & AUDIT LOG */}
        <div className="lg:col-span-2 space-y-6">
          {/* CURRICULUM TOPIC NAVIGATOR */}
          <div className="p-5 sm:p-6 rounded-2xl neo-glass-card space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                  <Layers className="w-4 h-4 text-emerald-500" /> Syllabus Topics · {activeExamName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click any topic to synchronize questions, notes, and flashcard decks instantly.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenAddTopic}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Topic</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenExamSwitch}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  Switch Exam
                </button>
              </div>
            </div>

            {/* Subject Selector Tabs & Topic Search */}
            <div className="space-y-2.5">
              {/* Interactive Subject Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 neo-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedSubjectFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedSubjectFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Subjects ({availableTopics.length})
                </button>
                {availableSubjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubjectFilter(s.id);
                      setSubject(s);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      selection.subject?.id === s.id && selectedSubjectFilter === s.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              {/* Topic Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter topics by keyword..."
                  value={searchTopicQuery}
                  onChange={(e) => setSearchTopicQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Topic Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {filteredTopics.slice(0, 6).map((topic, index) => {
                const isSelected = selection.topic?.id === topic.id;
                return (
                  <div
                    key={topic.id || index}
                    onClick={() => {
                      setTopic(topic);
                      onSelectTab('notes');
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider truncate max-w-[140px]">
                          {activeSubjectName}
                        </span>
                        {isSelected ? (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" /> Active Focus
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            High Yield
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 transition-colors">
                        {topic.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 mt-2.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {isSelected && mcqCount > 0 ? `${mcqCount} Qs Active` : 'Syllabus Topic'}
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Study Now <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Add Custom Topic Box */}
              <div
                onClick={onOpenAddTopic}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer flex flex-col items-center justify-center text-center space-y-1.5 min-h-[100px]"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  + Add Custom Topic
                </span>
                <span className="text-[10px] text-slate-400">AI builds MCQs & Notes in seconds</span>
              </div>
            </div>
          </div>

          {/* RECENT STUDY SESSIONS TIMELINE */}
          <div className="p-5 sm:p-6 rounded-2xl neo-glass-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                  <Activity className="w-4 h-4 text-indigo-500" /> Recent Study History
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Audit log of completed quizzes, diagnostic sprints, and active recall sessions.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {dbStats?.recentActivities && dbStats.recentActivities.length > 0 ? (
                dbStats.recentActivities.map((activity, idx) => (
                  <div
                    key={activity.id || idx}
                    onClick={() => onSelectTab('practice')}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {activity.title}
                        </h5>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-medium">{activity.type}</span>
                          <span aria-hidden="true">·</span>
                          <span>{activity.time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                        {activity.score}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <Brain className="w-8 h-8 text-indigo-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No sessions logged yet today
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Start a diagnostic CBT sprint or review flashcards on <strong className="text-indigo-500">{activeTopicName}</strong> to record your milestones.
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelectTab('practice')}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Start First CBT Drill</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DAILY STUDY TARGET & WEAKNESS RADAR */}
        <div className="space-y-6">
          {/* DAILY STUDY TARGET CARD */}
          <div className="p-5 sm:p-6 rounded-2xl neo-glass-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                  <Clock className="w-4 h-4 text-indigo-500" /> Daily Study Target
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Target: {effectiveTargetHours} hrs / day ({user.studyTime || 'Morning'} pace)
                </p>
              </div>
              <span className="text-xs font-black font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                {effectiveCompletedHours} / {effectiveTargetHours}h
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-semibold font-mono tabular-nums">
                <span>{progressPercentage}% Completed</span>
                <span>{Math.max(0, +(effectiveTargetHours - effectiveCompletedHours).toFixed(1))}h Remaining</span>
              </div>
            </div>

            {/* Quick 1-Click Time Loggers */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                disabled={isLoggingTime}
                onClick={() => handleLogStudyTime(0.25)}
                className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center disabled:opacity-50"
              >
                +15m
              </button>
              <button
                type="button"
                disabled={isLoggingTime}
                onClick={() => handleLogStudyTime(0.5)}
                className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center disabled:opacity-50"
              >
                +30m
              </button>
              <button
                type="button"
                disabled={isLoggingTime}
                onClick={() => handleLogStudyTime(1.0)}
                className="px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer text-center shadow-xs disabled:opacity-50"
              >
                {isLoggingTime ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : '+1h Done'}
              </button>
            </div>

            {justLoggedHours && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Added +{justLoggedHours >= 1 ? `${justLoggedHours}h` : `${justLoggedHours * 60}m`} to today&apos;s log!
              </p>
            )}

            {studyActionError && (
              <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {studyActionError}
              </p>
            )}

            {/* 7-Day Consistency Heatmap */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>7-Day Consistency</span>
                <span className="text-amber-500 flex items-center gap-1 font-mono tabular-nums">
                  <Flame className="w-3.5 h-3.5 fill-amber-500" /> {effectiveStreak}d Active
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                  const isDone = dbStats?.sevenDayConsistency ? dbStats.sevenDayConsistency[idx] : idx === 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div
                        className={`h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isDone
                            ? 'bg-amber-500 text-white font-mono'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isDone ? '✓' : day}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SUBJECT MASTERY & WEAKNESS RADAR */}
          <div className="p-5 sm:p-6 rounded-2xl neo-glass-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Subject Mastery
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Accuracy across {activeExamName} disciplines
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab('radar')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Full Radar →
              </button>
            </div>

            {/* Subject Accuracy Gauges */}
            <div className="space-y-3.5 pt-1">
              {resolvedSubjectMastery.slice(0, 4).map((item, idx) => (
                <div key={item.id || idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-slate-200 truncate max-w-[170px]">{item.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-900 dark:text-white font-bold font-mono tabular-nums">{item.score}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${item.score >= 80 ? 'bg-emerald-500' : item.score >= 60 ? 'bg-amber-500' : 'bg-indigo-500'} rounded-full transition-all duration-300`}
                      style={{ width: `${Math.max(5, item.score)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* High-Yield Gap Notice */}
            {dbStats?.weaknessGap ? (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">High-Yield Gap Detected:</span>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                    {dbStats.weaknessGap.message}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Complete question sets to calculate your adaptive diagnostic radar.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
