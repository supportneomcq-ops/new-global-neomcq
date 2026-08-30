'use client';

import React, { useState } from 'react';
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
  TrendingUp,
  Search,
} from 'lucide-react';
import { WorkspaceTab, StudySubTab } from './types';

import { useSelection } from '@/lib/context/selection-context';
import { OnboardingData } from '@/components/onboarding-flow';

interface DashboardHomeViewProps {
  user: OnboardingData;
  streakDays: number;
  completedHours: number;
  onLogStudyTime: (hours: number) => void;
  onSelectTab: (tab: WorkspaceTab, subTab?: StudySubTab) => void;
  onOpenAddTopic: () => void;
  onOpenExamSwitch: () => void;
}

export function DashboardHomeView({
  user,
  streakDays,
  completedHours,
  onLogStudyTime,
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
  } = useSelection();

  const [searchTopicQuery, setSearchTopicQuery] = useState('');
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>('all');

  const targetHours = Math.max(1, user.studyHours || 2);
  const progressPercentage = Math.min(100, Math.round((completedHours / targetHours) * 100));

  // Current focus labels
  const activeExamName = selection.exam?.name || user.examName || 'USMLE Step 1';
  const activeSubjectName = selection.subject?.name || (availableSubjects[0]?.name ?? 'Cardiovascular System');
  const activeTopicName = selection.topic?.name || (availableTopics[0]?.name ?? 'Coronary Artery Disease & Acute Coronary Syndromes');

  // Filter topics
  const filteredTopics = availableTopics.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTopicQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-8 pb-16">
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
                <ShieldCheck className="w-3.5 h-3.5" /> Adaptive Blueprint Synced
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Welcome back, {user.firstName || 'Doctor'}!
              </h1>
              <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
                Your preparation for <span className="text-white font-bold underline decoration-indigo-400 decoration-2 underline-offset-4">{activeExamName}</span> is currently active. Target exam date is <span className="text-white font-semibold">{user.examDate || 'in 90 days'}</span> ({user.daysLeft} days remaining).
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
                <span className="text-slate-400 font-medium">Topic Focus:</span>
                <span className="font-bold text-emerald-300 truncate max-w-[220px]">{activeTopicName}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Readiness & Key Metrics Card */}
          <div className="flex flex-row sm:flex-col lg:flex-row items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl shrink-0 backdrop-blur-md">
            {/* Days Left */}
            <div className="text-center px-3">
              <div className="text-3xl sm:text-4xl font-black text-indigo-400 tracking-tight">
                {user.daysLeft}
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-400" /> Days Left
              </div>
            </div>

            <div className="h-12 w-px bg-white/15" />

            {/* Study Streak */}
            <div className="text-center px-3">
              <div className="text-3xl sm:text-4xl font-black text-amber-400 flex items-center justify-center gap-1.5 tracking-tight">
                <Flame className="w-6 h-6 fill-amber-400 text-amber-400" /> {streakDays}
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                Day Streak
              </div>
            </div>

            <div className="h-12 w-px bg-white/15" />

            {/* Readiness Index */}
            <div className="text-center px-3">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                78%
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
              AI-curated next high-yield actions based on your active topic and exam readiness index.
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
                  Review 15 Clinical Pearls
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Drill high-yield diagnostic criteria, triad associations, and first-line pharmacotherapy flashcards.
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
                  AI Synaptic Whiteboard Case
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Step-by-step interactive diagram breakdown of pathophysiological pathways and clinical algorithms.
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
      {/* 3. CONTENT HUB — THE 8 CORE LEARNING CARDS */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Content Hub & Learning Tools
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Targeted study assets dynamically generated for <strong className="text-slate-800 dark:text-slate-200">{activeTopicName}</strong>.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">8 High-Yield Assets Available</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* CARD 1: MCQ PRACTICE */}
          <div
            onClick={() => onSelectTab('practice')}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Brain className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  40 MCQs Ready
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  MCQ Practice
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  40 topic-specific MCQs with clinical vignettes, explanations, difficulty tags, and progress tracker.
                </p>
              </div>

              <div className="pt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Timed / Review</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">High Yield</span>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>Practice MCQs</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 2: QUIZ A ENGINE */}
          <div
            onClick={() => onSelectTab('quizzes')}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  20 Qs • Max 3 Attempts
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Quiz A Engine
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  First formal evaluation quiz set. Tracks best score, time per question, and completion status.
                </p>
              </div>

              <div className="pt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Attempt 1/3</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Best: 85%</span>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Start Quiz A</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 3: QUIZ B ENGINE */}
          <div
            onClick={() => onSelectTab('quizzes')}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-500 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                  20 Qs • Separate Set
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Quiz B Engine
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  Parallel diagnostic evaluation set to re-test mastery and eliminate false confidence.
                </p>
              </div>

              <div className="pt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Attempt 0/3</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Unattempted</span>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-cyan-600 dark:text-cyan-400">
              <span>Start Quiz B</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 4: FLASHCARDS DECK */}
          <div
            onClick={() => onSelectTab('flashcards')}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-500 dark:hover:border-violet-500 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                  Spaced Repetition
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  Flashcard Decks
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  Active recall card decks with 3D flip animation preview, mastery scoring, and shuffle mode.
                </p>
              </div>

              <div className="pt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">18 Cards Due</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Mastered: 12</span>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-violet-600 dark:text-violet-400">
              <span>Review Flashcards</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 5: A4 CLINICAL NOTES */}
          <div
            onClick={() => onSelectTab('notes')}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  A4 Paper View
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  A4 Study Notes
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  Formatted A4 sheet preview with pathophysiological pathways, clinical pearls, and blue annotations.
                </p>
              </div>

              <div className="pt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Printable</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">High-Yield Tables</span>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Study Notes</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 6: STICKY BOARD */}
          <div
            onClick={() => onSelectTab('sticky')}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Flame className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  Sticky Board
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Sticky Notes Board
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  Physical note cards preview with amber, rose, violet, and blue colored tiles for rapid key point scanning.
                </p>
              </div>

              <div className="pt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Amber / Rose</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Quick Recall</span>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
              <span>Open Sticky Board</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 7: FILL IN THE BLANKS / ACTIVE RECALL */}
          <div
            onClick={() => onSelectTab('blanks')}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-500 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  Cloze Deletion
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Fill in the Blanks
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  Active recall masked text exercises testing key terms, dosages, and clinical criteria.
                </p>
              </div>

              <div className="pt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Mask & Reveal</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Score Tracker</span>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
              <span>Start Recall</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 8: AI TUTOR VIDEO */}
          <div
            onClick={() => onSelectTab('tutor')}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  12:45 • Whiteboard Lesson
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  AI Tutor Video
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  Synchronized educational video lesson player with interactive scene timeline, narration, and Q&A assistant.
                </p>
              </div>

              <div className="pt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Scene Timeline</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Audio Synced</span>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
              <span>Watch Lesson</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
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
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {activeSubjectName}
                        </span>
                        {isSelected ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-600 text-white flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Active Focus
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">
                            High Yield
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 transition-colors">
                        {topic.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-3 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 mt-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">20+ Questions</span>
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
              {[
                {
                  title: '10-Q Sprint: Coronary Artery Disease',
                  type: 'CBT Practice',
                  score: '80% Correct (8/10)',
                  time: 'Today, 2:45 PM',
                  statusColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
                  action: () => onSelectTab('practice'),
                },
                {
                  title: 'Spaced Flashcards: Cardiopulmonary Triads',
                  type: 'Active Recall',
                  score: '15 Cards Mastered',
                  time: 'Today, 11:20 AM',
                  statusColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
                  action: () => onSelectTab('flashcards'),
                },
                {
                  title: 'Clinical Notes: Heart Failure Pathophysiology',
                  type: 'Notes Review',
                  score: 'High Yield Read',
                  time: 'Yesterday, 8:15 PM',
                  statusColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
                  action: () => onSelectTab('notes'),
                },
              ].map((activity, idx) => (
                <div
                  key={idx}
                  onClick={activity.action}
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
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${activity.statusColor}`}>
                      {activity.score}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
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
                  Target: {targetHours} hrs/day ({user.studyTime || 'Morning'} schedule)
                </p>
              </div>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {completedHours} / {targetHours} hrs
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
                <span>{Math.max(0, +(targetHours - completedHours).toFixed(1))}h Remaining</span>
              </div>
            </div>

            {/* Quick Log Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onLogStudyTime(0.5)}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center"
              >
                +30m Logged
              </button>
              <button
                type="button"
                onClick={() => onLogStudyTime(1.0)}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer text-center shadow-xs"
              >
                +1h Logged
              </button>
            </div>

            {/* 7-Day Streak Dots */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <span>7-Day Consistency</span>
                <span className="text-amber-500 flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-amber-500" /> {streakDays}d Active
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                  const isDone = idx < 5; // 5 days completed
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
                  High-yield accuracy by discipline
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
              {[
                { name: 'Cardiovascular System', score: 84, color: 'bg-emerald-500', status: 'Strong' },
                { name: 'Respiratory Medicine', score: 88, color: 'bg-emerald-500', status: 'Strong' },
                { name: 'Renal & Acid-Base Physiology', score: 62, color: 'bg-amber-500', status: 'Reinforce' },
                { name: 'Autonomic Pharmacology', score: 54, color: 'bg-rose-500', status: 'High Yield Gap' },
              ].map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{item.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
                        item.score >= 80 ? 'text-emerald-600' : item.score >= 60 ? 'text-amber-600' : 'text-rose-600'
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
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">High-Yield Gap Detected:</span>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  Autonomic Pharmacology is under 60% accuracy. Complete a 10-Q focused sprint to boost readiness.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
