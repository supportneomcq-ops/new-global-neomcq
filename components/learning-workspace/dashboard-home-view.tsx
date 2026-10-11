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
  ShieldCheck,
  Check,
  Activity,
  AlertTriangle,
  Search,
  Loader2,
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
    availableSubtopics,
    setSubject,
    setTopic,
    targetDate,
  } = useSelection();

  const { content, cards, isOrchestrating, orchestrateTopic, isLoading: isContentLoading } = useTopicContent();

  const [searchTopicQuery, setSearchTopicQuery] = useState('');
  const [dbStats, setDbStats] = useState<UserStudyStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [studyActionError, setStudyActionError] = useState('');

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

  // Log real study time to database
  const handleLogStudyTime = async (hours: number) => {
    try {
      setIsLoggingTime(true);
      setStudyActionError('');
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Study time could not be saved.';
      setStudyActionError(message);
      console.error('[DashboardHomeView] Log time error:', err);
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
  const activeExamName = selection.exam?.name || user.examName || 'Curriculum Exam';
  const activeSubjectName = selection.subject?.name || (availableSubjects[0]?.name ?? 'Core Foundations');
  const activeTopicName = selection.topic?.name || (availableTopics[0]?.name ?? 'High-Yield Core Concepts');
  const activeSubtopicName = selection.subtopic?.name;

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
    return t.name.toLowerCase().includes(searchTopicQuery.toLowerCase());
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
        color: 'bg-slate-300 dark:bg-slate-700',
      }));

  // Real Counts for Learning Cards based on active topic content
  const mcqCount = content?.mcqs?.length ?? 0;
  const quizACount = content?.quiz_a?.length ?? 0;
  const quizBCount = content?.quiz_b?.length ?? 0;
  const flashcardCount = content?.flashcards?.length ?? 0;
  const stickyCount = content?.sticky_notes?.length ?? 0;
  const blanksCount = content?.fill_in_the_blanks?.length ?? 0;
  const tutorPhasesCount = content?.whiteboard_phases?.length ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Selection Context Bar (Exam -> Subject -> Topic -> Subtopic + SHOW) */}
      <LearningContextBar />
      {/* Personalized exam countdown: values come from the saved onboarding profile. */}
      <section aria-label="Your exam countdown and study targets" className="rounded-3xl border border-indigo-200 dark:border-indigo-900/70 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Your exam countdown</p>
            <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">{activeExamName}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Exam date: {resolvedTargetDate ? new Date(resolvedTargetDate + (resolvedTargetDate.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}
            </p>
          </div>
          <div className="rounded-2xl bg-indigo-600 px-5 py-4 text-white text-center min-w-[124px]">
            <p className="text-xs font-semibold text-indigo-100">Days left</p>
            <p className="text-4xl font-black tabular-nums">{calculatedDaysLeft}</p>
            <p className="text-xs text-indigo-100">{calculatedDaysLeft === 1 ? 'day remaining' : 'days remaining'}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Preparation mode</p>
            <p className="mt-1 font-bold">{user.learningStyle === 'Rapid Learning' ? 'Rapid Learning' : 'Regular / Balanced Study'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Daily study target</p>
            <p className="mt-1 font-bold">{Math.max(1, user.studyHours || 2)} hours/day</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Preferred study time</p>
            <p className="mt-1 font-bold">{user.studyTime || 'Flexible'}</p>
          </div>
        </div>
      </section>
      {/* ========================================================================= */}
      {/* 1. TOP COMMAND CENTER: HERO READY & EXAM STATUS */}
      {/* ========================================================================= */}
      <section className="relative rounded-3xl bg-slate-900 dark:bg-slate-950 text-white p-6 sm:p-8 lg:p-10 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Left Column: Greeting & Target Exam Focus */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5" /> High-Yield Learning OS
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                <ShieldCheck className="w-3.5 h-3.5" /> Canonical Blueprint Synced
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Welcome back, {user.firstName || 'Learner'}!
              </h1>
              <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
                Your preparation for <span className="text-white font-bold underline decoration-indigo-400 decoration-2 underline-offset-4">{activeExamName}</span> is currently active. Target exam date is <span className="text-white font-semibold">{resolvedTargetDate || 'Scheduled'}</span> ({calculatedDaysLeft} days remaining).
              </p>
            </div>

            {/* Active Topic / Subject Breadcrumb Pill */}
            <div className="pt-1 flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-slate-200 backdrop-blur-xs">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400 font-medium">Subject:</span>
                <span className="font-bold text-white truncate max-w-[180px]">{activeSubjectName}</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-slate-200 backdrop-blur-xs">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400 font-medium">Topic:</span>
                <span className="font-bold text-emerald-300 truncate max-w-[200px]">{activeTopicName}</span>
              </div>
              {activeSubtopicName && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-200 backdrop-blur-xs">
                  <span className="text-slate-300 font-medium">Subtopic:</span>
                  <span className="font-bold text-white truncate max-w-[200px]">{activeSubtopicName}</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-violet-500/15 border border-violet-400/25 text-xs text-violet-100">
                <Zap className="w-3.5 h-3.5 text-violet-300" />
                <span className="text-slate-300 font-medium">Mode:</span>
                <span className="font-bold text-white">{user.learningStyle === 'Rapid Learning' ? 'Rapid Learning' : 'Regular Study'}</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/25 text-xs text-cyan-100">
                <Clock className="w-3.5 h-3.5 text-cyan-300" />
                <span className="text-slate-300 font-medium">Daily target:</span>
                <span className="font-bold text-white">{Math.max(1, user.studyHours || 2)} hours</span>
              </div>
            </div>
          </div>

          {/* Right Column: Readiness & Key Metrics Card */}
          <div className="flex flex-row sm:flex-col lg:flex-row items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl shrink-0 backdrop-blur-md">
            {/* Days Left */}
            <div className="text-center px-3">
              <div className="text-3xl sm:text-4xl font-black text-indigo-400 tracking-tight">
                {calculatedDaysLeft}
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-400" /> Days Left
              </div>
            </div>

            <div className="h-12 w-px bg-white/15" />

            {/* Study Streak */}
            <div className="text-center px-3">
              <div className="text-3xl sm:text-4xl font-black text-amber-400 flex items-center justify-center gap-1.5 tracking-tight">
                <Flame className="w-6 h-6 fill-amber-400 text-amber-400" /> {effectiveStreak}
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                Day Streak
              </div>
            </div>

            <div className="h-12 w-px bg-white/15" />

            {/* Readiness Index */}
            <div className="text-center px-3">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                {effectiveReadiness > 0 ? `${effectiveReadiness}%` : 'New'}
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                <Award className="w-3 h-3 text-emerald-400" /> Readiness
              </div>
            </div>
          </div>
        </div>

        {/* Hero Bottom Bar: Quick Launch Action Buttons */}
        <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>High-Yield MCQs, Notes & AI Whiteboard loaded for <strong className="text-white">{activeTopicName}</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onSelectTab('practice')}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Brain className="w-4 h-4" /> Start Practice CBT <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('notes')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/15 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" /> Open Study Hub
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. "WHAT SHOULD I STUDY NOW?" — RECOMMENDED NEXT ACTIONS */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> What Should I Study Now?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              AI-curated high-yield actions based on your active topic and syllabus blueprint.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0 self-start sm:self-auto">
            Focus: {activeTopicName}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recommendation 1: Practice Sprint */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Priority 1 • CBT Sprint
                </span>
                <span className="text-xs font-semibold text-slate-400">12 Mins</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  10-Question Diagnostic Sprint
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Solve high-yield clinical vignettes on {activeTopicName} with timed exam pacing and instant explanations.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab('practice')}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" /> Launch Diagnostic Sprint <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Recommendation 2: Active Recall Flashcards */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Priority 2 • Active Recall
                </span>
                <span className="text-xs font-semibold text-slate-400">8 Mins</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Review {flashcardCount} Spaced Flashcards
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Drill high-yield definitions, core criteria, key formulas, and testable concepts.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab('flashcards')}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" /> Drill Flashcard Deck <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Recommendation 3: AI Synaptic Whiteboard */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  Priority 3 • Visual Tutor
                </span>
                <span className="text-xs font-semibold text-slate-400">10 Mins</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  AI Synaptic Whiteboard Lesson
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Step-by-step interactive diagram breakdown of pathophysiological pathways on {activeTopicName}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab('tutor')}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Launch Whiteboard <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CONTENT HUB — THE 8 CORE LEARNING CARDS (LATEST CANONICAL VERSIONS) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Content Library & Learning Cards
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Latest generated versions for <strong className="text-slate-800 dark:text-slate-200">{activeTopicName}</strong> ({activeExamName} • {activeSubjectName}).
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOrchestrating && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Live Syncing Database...
              </span>
            )}
            <button
              type="button"
              onClick={() => orchestrateTopic(true)}
              disabled={isOrchestrating}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Force regenerate fresh content for all 8 learning tools"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Regenerate Topic</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {[
            {
              featureId: 'mcq',
              title: 'MCQ Practice',
              description: 'Topic-specific MCQs with clinical vignettes, explanations, difficulty tags, and progress tracker.',
              tab: 'practice' as WorkspaceTab,
              icon: Brain,
              color: 'indigo',
              defaultQty: `${mcqCount} MCQs`,
              tags: ['Timed / Review', 'High Yield'],
            },
            {
              featureId: 'quiz_a',
              title: 'Quiz A Engine',
              description: 'First formal evaluation quiz set. Tracks score percentage, pacing, and completion status.',
              tab: 'quizzes' as WorkspaceTab,
              icon: Zap,
              color: 'blue',
              defaultQty: `${quizACount} Qs • Set A`,
              tags: ['Formal CBT', 'Diagnostic'],
            },
            {
              featureId: 'quiz_b',
              title: 'Quiz B Engine',
              description: 'Parallel diagnostic evaluation set to re-test mastery and eliminate false confidence.',
              tab: 'quizzes' as WorkspaceTab,
              icon: Target,
              color: 'cyan',
              defaultQty: `${quizBCount} Qs • Set B`,
              tags: ['Parallel Set', 'Re-Evaluation'],
            },
            {
              featureId: 'flashcards',
              title: 'Flashcard Decks',
              description: 'Active recall card decks with 3D flip animation, mastery scoring, and shuffle mode.',
              tab: 'flashcards' as WorkspaceTab,
              icon: Layers,
              color: 'violet',
              defaultQty: `${flashcardCount} Cards`,
              tags: ['Spaced Recall', '3D Flip'],
            },
            {
              featureId: 'a4_notes',
              title: 'A4 Study Notes',
              description: 'Formatted A4 sheet with pathophysiological pathways, clinical pearls, and high-yield tables.',
              tab: 'notes' as WorkspaceTab,
              subTab: 'notes' as StudySubTab,
              icon: BookOpen,
              color: 'emerald',
              defaultQty: 'A4 Document',
              tags: ['Printable', 'High-Yield'],
            },
            {
              featureId: 'sticky_notes',
              title: 'Sticky Notes Board',
              description: 'Interactive note cards with amber, rose, violet, and blue colored tiles for rapid key point scanning.',
              tab: 'notes' as WorkspaceTab,
              subTab: 'sticky' as StudySubTab,
              icon: Flame,
              color: 'amber',
              defaultQty: `${stickyCount} Sticky Notes`,
              tags: ['Visual Board', 'Quick Recall'],
            },
            {
              featureId: 'fill_in_the_blanks',
              title: 'Fill in the Blanks',
              description: 'Active recall masked text exercises testing key terms, dosages, and clinical criteria.',
              tab: 'blanks' as WorkspaceTab,
              icon: Activity,
              color: 'rose',
              defaultQty: `${blanksCount} Blanks`,
              tags: ['Cloze Deletion', 'Score Tracker'],
            },
            {
              featureId: 'ai_tutor',
              title: 'AI Tutor Whiteboard',
              description: 'Synchronized whiteboard lesson with visual diagrams, audio narration, and interactive Q&A.',
              tab: 'tutor' as WorkspaceTab,
              icon: GraduationCap,
              color: 'purple',
              defaultQty: `${tutorPhasesCount} Whiteboard Scenes`,
              tags: ['Scene Timeline', 'Audio Synced'],
            },
          ].map((cfg) => {
            const cardState = cards.find((c) => c.featureId === cfg.featureId);
            const status = cardState?.status || 'READY';
            const versionLabel = cardState?.versionLabel || 'v1 (Latest)';
            const quantityLabel = cardState?.quantityLabel || cfg.defaultQty;
            const createdAtFormatted = cardState?.createdAt
              ? new Date(cardState.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Recent';

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
                className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between group cursor-pointer ${
                  status === 'READY'
                    ? 'border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-xs hover:shadow-xl'
                    : status === 'FAILED'
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10 hover:border-rose-500'
                    : 'border-slate-200 dark:border-slate-800 opacity-95 hover:border-amber-500'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Icon + Version + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {/* Version Badge */}
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {versionLabel}
                      </span>

                      {/* Status Badge */}
                      {status === 'READY' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> READY
                        </span>
                      )}

                      {status === 'GENERATING' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin text-amber-500" /> GENERATING
                        </span>
                      )}

                      {status === 'QUEUED' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-500" /> QUEUED
                        </span>
                      )}

                      {status === 'FAILED' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-500" /> FAILED
                        </span>
                      )}

                      {status === 'EXPIRED' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-orange-500" /> EXPIRED (30d+)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                      <span>{cfg.title}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {cfg.description}
                    </p>
                  </div>

                  {/* Quantity & Date */}
                  <div className="pt-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{quantityLabel}</span>
                    <span className="text-[10px] text-slate-400">{createdAtFormatted}</span>
                  </div>

                  {/* High Yield Tags */}
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {cfg.tags.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                  {status === 'READY' && (
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center justify-between w-full">
                      <span>Open {cfg.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}

                  {status === 'FAILED' && (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center justify-between w-full">
                      <span>Retry Generation</span>
                      <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                    </span>
                  )}

                  {(status === 'GENERATING' || status === 'QUEUED') && (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center justify-between w-full">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                      </span>
                      <span className="text-[10px] text-slate-400">Auto-refreshing</span>
                    </span>
                  )}

                  {status === 'EXPIRED' && (
                    <span className="text-orange-600 dark:text-orange-400 flex items-center justify-between w-full">
                      <span>Generating New Version...</span>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. MAIN WORKSPACE 2-COLUMN SECTION: CURRICULUM + WEAKNESS RADAR & TARGET */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* LEFT 2 COLUMNS: CURRICULUM BROWSER & RECENT ACTIVITY */}
        <div className="lg:col-span-2 space-y-6">
          {/* CURRICULUM TOPIC NAVIGATOR */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Topics in {activeExamName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select any topic to synchronize MCQs, notes, and active recall decks immediately.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenAddTopic}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Topic</span>
              </button>
            </div>

            {/* Subject Dropdown & Quick Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Subject Selector */}
              <div className="relative flex-1">
                <select
                  value={selection.subject?.id || ''}
                  onChange={(e) => {
                    const target = availableSubjects.find((s) => s.id === e.target.value);
                    if (target) setSubject(target);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic Search Input */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter topics..."
                  value={searchTopicQuery}
                  onChange={(e) => setSearchTopicQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider truncate max-w-[140px]">
                          {activeSubjectName}
                        </span>
                        {isSelected ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-600 text-white flex items-center gap-1 shrink-0">
                            <Check className="w-2.5 h-2.5" /> Active Focus
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                            High Yield
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 transition-colors">
                        {topic.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-3 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 mt-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {isSelected && mcqCount > 0 ? `${mcqCount} Qs Active` : 'Syllabus Topic'}
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Study Now <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Add Topic Action Box */}
              <div
                onClick={onOpenAddTopic}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer flex flex-col items-center justify-center text-center space-y-1.5 min-h-[110px]"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  + Add Custom Topic
                </span>
                <span className="text-[10px] text-slate-400">Instant AI generation & questions</span>
              </div>
            </div>
          </div>

          {/* RECENT STUDY ACTIVITY & AUDIT TIMELINE */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Recent Study Activity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Track your completed quiz sprints, notes reviewed, and daily milestone timestamps.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {dbStats?.recentActivities && dbStats.recentActivities.length > 0 ? (
                dbStats.recentActivities.map((activity, idx) => (
                  <div
                    key={activity.id || idx}
                    onClick={() => onSelectTab('practice')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {activity.title}
                        </h5>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-medium">{activity.type}</span>
                          <span>•</span>
                          <span>{activity.time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800">
                        {activity.score}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <Brain className="w-8 h-8 text-indigo-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No study sessions recorded yet today
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Launch your first MCQ Practice sprint or Whiteboard lesson on <strong className="text-indigo-500">{activeTopicName}</strong> to record your learning metrics.
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelectTab('practice')}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" /> Start First CBT Drill
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DAILY STUDY TARGET & WEAKNESS RADAR METER */}
        <div className="space-y-6">
          {/* DAILY STUDY TARGET CARD */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Daily Study Target
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Target: {effectiveTargetHours} hrs/day ({user.studyTime || 'Morning'} schedule)
                </p>
              </div>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {effectiveCompletedHours} / {effectiveTargetHours} hrs
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                <span>{progressPercentage}% Completed</span>
                <span>{Math.max(0, +(effectiveTargetHours - effectiveCompletedHours).toFixed(1))}h Remaining</span>
              </div>
            </div>

            {/* Quick Log Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={isLoggingTime}
                onClick={() => handleLogStudyTime(0.5)}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center disabled:opacity-50"
              >
                {isLoggingTime ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : '+30m Logged'}
              </button>
              <button
                type="button"
                disabled={isLoggingTime}
                onClick={() => handleLogStudyTime(1.0)}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer text-center shadow-xs disabled:opacity-50"
              >
                {isLoggingTime ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : '+1h Logged'}
              </button>
            </div>

            {studyActionError && (
              <p role="alert" className="pt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                {studyActionError}
              </p>
            )}

            {/* 7-Day Consistency Dots */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <span>7-Day Consistency</span>
                <span className="text-amber-500 flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-amber-500" /> {effectiveStreak}d Active
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
                            ? 'bg-amber-500 text-white'
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

          {/* WEAKNESS RADAR & MASTERY PREVIEW */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" /> Subject Mastery
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Accuracy by {activeExamName} discipline
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

            {/* Subject Accuracy Meters */}
            <div className="space-y-3.5 pt-1">
              {resolvedSubjectMastery.slice(0, 4).map((item, idx) => (
                <div key={item.id || idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{item.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
                        item.score >= 80 ? 'text-emerald-600' : item.score >= 60 ? 'text-amber-600' : item.score > 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-slate-900 dark:text-white font-bold">{item.score}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* High-Yield Gap Notice */}
            {dbStats?.weaknessGap ? (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">High-Yield Gap Detected:</span>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                    {dbStats.weaknessGap.message}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Solve questions on each subject to populate your adaptive Weakness Radar.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
