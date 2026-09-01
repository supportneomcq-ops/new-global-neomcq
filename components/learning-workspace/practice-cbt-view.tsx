'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Award,
  RotateCcw,
  Eye,
  Strikethrough,
  Flag,
  ArrowLeft,
  Play,
  Calendar,
  Database,
  History,
  TrendingUp,
  Clock,
  BookOpen,
} from 'lucide-react';
import { useSelection } from '@/lib/context/selection-context';
import { useTopicContent } from '@/lib/context/topic-content-context';
import { getSupabaseClient } from '@/lib/supabase';
import { OnboardingData } from '@/components/onboarding-flow';

interface PracticeCbtViewProps {
  user: OnboardingData;
  topicId?: string;
  topicName?: string;
  isQuizMode?: boolean;
}

interface DBMCQ {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  clinical_pearl?: string;
  difficulty?: string;
  high_yield_tag?: string;
  version: number;
}

interface ContentVersionRecord {
  id: string;
  version: number;
  created_at: string;
  quality_score: number;
  content_count: number;
  change_summary?: string;
  generation_reason?: string;
  snapshot: any;
}

interface UserAttempt {
  mcq_id: string;
  selected_index: number;
  is_correct: boolean;
  created_at: string;
}

export function PracticeCbtView({
  user,
  topicId: propTopicId,
  topicName: propTopicName,
  isQuizMode = false,
}: PracticeCbtViewProps) {
  const { selection } = useSelection();
  const { refreshTopicContent, isLoading: isContextGenerating } = useTopicContent();

  const supabase = getSupabaseClient();

  // Resolved Hierarchy IDs
  const activeExamId = selection.exam?.id;
  const activeSubjectId = selection.subject?.id;
  const activeTopicId = propTopicId || selection.topic?.id;
  const activeSubtopicId = selection.subtopic?.id;

  // Real Database States
  const [versions, setVersions] = useState<ContentVersionRecord[]>([]);
  const [dbMcqs, setDbMcqs] = useState<DBMCQ[]>([]);
  const [userAttempts, setUserAttempts] = useState<Record<string, UserAttempt[]>>({});
  const [dbLoading, setDbLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Practice Player State (STATE B)
  const [gameState, setGameState] = useState<'library' | 'playing' | 'completed'>('library');
  const [activeBatch, setActiveBatch] = useState<ContentVersionRecord | null>(null);
  const [activeActivity, setActiveActivity] = useState<'all' | 'A' | 'B'>('all');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // In-Game Session State (State B)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<string, boolean>>({}); // key: `${currentIndex}_${optionIdx}`
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [totalSessionTimeSpent, setTotalSessionTimeSpent] = useState<number>(0);

  // Load active authenticated user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setCurrentUser(authUser);
    };
    fetchUser();
  }, [supabase]);

  // Main Data Orchestrator: Fetch Versions, Questions, and Attempts from Supabase
  const loadDatabaseRecords = async () => {
    if (!activeTopicId) return;
    setDbLoading(true);
    try {
      // 1. Fetch content versions associated with topic
      const { data: vData, error: vErr } = await supabase
        .from('content_versions')
        .select('id, version, created_at, quality_score, content_count, snapshot, change_summary, generation_reason')
        .eq('asset_id', activeTopicId)
        .eq('asset_type', 'topic')
        .order('version', { ascending: false });

      if (vErr) throw vErr;
      const parsedVersions: ContentVersionRecord[] = (vData || []).map((v) => ({
        id: v.id,
        version: v.version,
        created_at: v.created_at,
        quality_score: Number(v.quality_score || 95),
        content_count: Number(v.content_count || 40),
        change_summary: v.change_summary,
        generation_reason: v.generation_reason,
        snapshot: v.snapshot || {},
      }));
      setVersions(parsedVersions);

      // 2. Fetch specific questions associated with topic from real `mcqs` table
      const { data: qData, error: qErr } = await supabase
        .from('mcqs')
        .select('id, question, options, correct_answer, explanation, clinical_pearl, difficulty, high_yield_tag, version')
        .eq('topic_id', activeTopicId)
        .order('id', { ascending: true });

      if (qErr) throw qErr;
      const parsedMcqs: DBMCQ[] = (qData || []).map((q) => ({
        id: q.id,
        question: q.question,
        options: Array.isArray(q.options) ? q.options : [],
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        clinical_pearl: q.clinical_pearl || undefined,
        difficulty: q.difficulty || undefined,
        high_yield_tag: q.high_yield_tag || undefined,
        version: q.version || 1,
      }));
      setDbMcqs(parsedMcqs);

      // 3. Fetch user attempts
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: attData, error: attErr } = await supabase
          .from('mcq_attempts')
          .select('mcq_id, selected_index, is_correct, created_at')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: true });

        if (!attErr && attData) {
          const attemptsMap: Record<string, UserAttempt[]> = {};
          attData.forEach((att) => {
            if (!attemptsMap[att.mcq_id]) {
              attemptsMap[att.mcq_id] = [];
            }
            attemptsMap[att.mcq_id].push({
              mcq_id: att.mcq_id,
              selected_index: att.selected_index,
              is_correct: att.is_correct,
              created_at: att.created_at,
            });
          });
          setUserAttempts(attemptsMap);
        }
      }
    } catch (err) {
      console.error('[PracticeCbtView] Error fetching Supabase records:', err);
    } finally {
      setDbLoading(false);
    }
  };

  // Re-load whenever selected topic or generation status changes
  useEffect(() => {
    loadDatabaseRecords();
  }, [activeTopicId, isContextGenerating]);

  // Synthesize New Practice Q-Bank Batch
  const handleSynthesizeBatch = async () => {
    if (!activeTopicId) return;
    try {
      await refreshTopicContent(true); // Triggers loading stepper automatically
      await loadDatabaseRecords();
    } catch (err) {
      console.error('[PracticeCbtView] Error generating batch:', err);
    }
  };

  // Compute stats of an activity inside a version (using real SQL attempts and questions)
  const getActivityStats = (version: ContentVersionRecord, activity: 'all' | 'A' | 'B') => {
    // 1. Resolve questions for this version
    const versionQuestions = dbMcqs.length > 0
      ? dbMcqs.filter((q) => q.version === version.version)
      : (version.snapshot?.mcqs || []);

    let activeSet: any[] = [];
    if (activity === 'all') {
      activeSet = versionQuestions;
    } else if (activity === 'A') {
      activeSet = version.snapshot?.quiz_a && version.snapshot.quiz_a.length > 0
        ? version.snapshot.quiz_a
        : versionQuestions.slice(0, Math.min(20, Math.ceil(versionQuestions.length / 2)));
    } else {
      activeSet = version.snapshot?.quiz_b && version.snapshot.quiz_b.length > 0
        ? version.snapshot.quiz_b
        : versionQuestions.slice(Math.min(20, Math.ceil(versionQuestions.length / 2)));
    }

    const N = activeSet.length;
    if (N === 0) return { status: 'Not Started', answered: 0, total: 0, accuracy: 0 };

    // 2. Count attempted questions
    let answeredCount = 0;
    let correctCount = 0;

    activeSet.forEach((q) => {
      // Find attempts matching this question ID
      const attempts = q.id ? userAttempts[q.id] : null;
      if (attempts && attempts.length > 0) {
        answeredCount++;
        // Check latest attempt correctness
        const latest = attempts[attempts.length - 1];
        if (latest.is_correct) {
          correctCount++;
        }
      }
    });

    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

    let status: 'Not Started' | 'In Progress' | 'Completed' = 'Not Started';
    if (answeredCount === N) {
      status = 'Completed';
    } else if (answeredCount > 0) {
      status = 'In Progress';
    }

    return {
      status,
      answered: answeredCount,
      total: N,
      accuracy,
    };
  };

  // Launch Practice Game Session (State B)
  const handleStartPractice = (version: ContentVersionRecord, activity: 'all' | 'A' | 'B') => {
    // 1. Resolve questions for this batch
    const versionQuestions = dbMcqs.length > 0
      ? dbMcqs.filter((q) => q.version === version.version)
      : (version.snapshot?.mcqs || []);

    let activeSet: any[] = [];
    if (activity === 'all') {
      activeSet = versionQuestions;
    } else if (activity === 'A') {
      activeSet = version.snapshot?.quiz_a && version.snapshot.quiz_a.length > 0
        ? version.snapshot.quiz_a
        : versionQuestions.slice(0, Math.min(20, Math.ceil(versionQuestions.length / 2)));
    } else {
      activeSet = version.snapshot?.quiz_b && version.snapshot.quiz_b.length > 0
        ? version.snapshot.quiz_b
        : versionQuestions.slice(Math.min(20, Math.ceil(versionQuestions.length / 2)));
    }

    if (activeSet.length === 0) return;

    // Save playing descriptors
    setActiveBatch(version);
    setActiveActivity(activity);
    setQuestions(activeSet);
    setGameState('playing');

    // 2. Restore from localStorage if in-progress session exists
    const sessionKey = `neomcq_session_${activeTopicId}_v${version.version}_${activity}`;
    const saved = localStorage.getItem(sessionKey);
    let startIdx = 0;
    let answers: Record<number, number> = {};
    let flags: Record<number, boolean> = {};
    let strikethroughs: Record<string, boolean> = {};

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          startIdx = parsed.currentIndex || 0;
          answers = parsed.selectedAnswers || {};
          flags = parsed.flaggedQuestions || {};
          strikethroughs = parsed.eliminatedOptions || {};
        }
      } catch {}
    }

    setCurrentIndex(startIdx);
    setSelectedAnswers(answers);
    setFlaggedQuestions(flags);
    setEliminatedOptions(strikethroughs);

    setSessionStartTime(Date.now());
    setQuestionStartTime(Date.now());
  };

  // Log active state changes back to localStorage
  useEffect(() => {
    if (gameState !== 'playing' || !activeBatch) return;
    const sessionKey = `neomcq_session_${activeTopicId}_v${activeBatch.version}_${activeActivity}`;
    localStorage.setItem(
      sessionKey,
      JSON.stringify({
        currentIndex,
        selectedAnswers,
        flaggedQuestions,
        eliminatedOptions,
      })
    );
  }, [currentIndex, selectedAnswers, flaggedQuestions, eliminatedOptions, gameState, activeBatch, activeActivity, activeTopicId]);

  // Dynamic correct answer checker
  const isQuestionCorrect = (q: any, selectedIdx: number) => {
    if (typeof q.correct_index === 'number') {
      return selectedIdx === q.correct_index;
    }
    // For database records, match string options
    const correctOpt = q.correct_answer;
    const selectedOpt = q.options[selectedIdx];
    return correctOpt === selectedOpt;
  };

  const getCorrectIndex = (q: any) => {
    if (typeof q.correct_index === 'number') return q.correct_index;
    return q.options.indexOf(q.correct_answer);
  };

  // Option submission event
  const handleSelectOption = async (optIdx: number) => {
    if (selectedAnswers[currentIndex] !== undefined) return; // Answered already

    const q = questions[currentIndex];
    const isCorrect = isQuestionCorrect(q, optIdx);

    // Save to local playing state
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optIdx,
    }));

    // Perform direct insert to Supabase mcq_attempts table (RLS authorized)
    if (q.id) {
      try {
        const timeSpent = Date.now() - questionStartTime;
        const attemptRow = {
          user_id: currentUser?.id || null,
          mcq_id: q.id,
          selected_option: q.options[optIdx],
          selected_index: optIdx,
          is_correct: isCorrect,
          response_time_ms: Math.min(120000, timeSpent), // limit extreme caps
        };
        await supabase.from('mcq_attempts').insert(attemptRow);

        // Update cache of attempts locally
        setUserAttempts((prev) => {
          const existing = prev[q.id!] || [];
          const updated = [...existing, {
            mcq_id: q.id!,
            selected_index: optIdx,
            is_correct: isCorrect,
            created_at: new Date().toISOString(),
          }];
          return { ...prev, [q.id!]: updated };
        });
      } catch (err) {
        console.warn('[PracticeCbtView] Silent error persisting attempt:', err);
      }
    }
  };

  // Flag and elimination tools
  const handleToggleFlag = () => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex],
    }));
  };

  const handleToggleEliminate = (optIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${currentIndex}_${optIdx}`;
    setEliminatedOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Navigate Questions
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setQuestionStartTime(Date.now());
    }
  };

  // Complete Game Practice Session
  const handleFinishSession = () => {
    const elapsedSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
    setTotalSessionTimeSpent(elapsedSeconds);

    // Clear active session in local storage on finish
    if (activeBatch) {
      const sessionKey = `neomcq_session_${activeTopicId}_v${activeBatch.version}_${activeActivity}`;
      localStorage.removeItem(sessionKey);
    }

    setGameState('completed');
  };

  // Restart active session
  const handleRestartSession = () => {
    setSelectedAnswers({});
    setFlaggedQuestions({});
    setEliminatedOptions({});
    setCurrentIndex(0);
    setSessionStartTime(Date.now());
    setQuestionStartTime(Date.now());
    setGameState('playing');
  };

  // Helper time formatter
  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // Breadcrumbs Header Component
  const renderBreadcrumbHeader = () => {
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium pb-2 border-b border-slate-100 dark:border-slate-800">
        <span className="font-bold text-slate-700 dark:text-slate-300">MCQ Practice</span>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
          {selection.exam?.name || 'Curriculum'}
        </span>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          {selection.subject?.name || 'Subject'}
        </span>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          {selection.topic?.name || propTopicName || 'Topic'}
        </span>
        {selection.subtopic && (
          <>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
              {selection.subtopic.name}
            </span>
          </>
        )}
      </div>
    );
  };

  // --- STATE 1: TOPIC BATCH SELECTION LIBRARY ---
  if (gameState === 'library') {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Breadcrumb Context Layer */}
        {renderBreadcrumbHeader()}

        {/* Dynamic Context Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all">
          <div className="space-y-1">
            <h2 id="mcq-practice-heading" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>{isQuizMode ? 'High-Yield Sprint Quizzes' : 'Core Practice Q-Bank'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              {isQuizMode
                ? 'Practice non-overlapping clinical assessment challenges designed to identify knowledge gaps.'
                : 'Master guideline-directed clinical diagnosis and medical decision tree rationale step-by-step.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSynthesizeBatch}
            disabled={dbLoading || isContextGenerating}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Synthesize New Q-Bank Batch</span>
          </button>
        </div>

        {/* Dynamic List Render */}
        {dbLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Retrieving real Supabase records...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-5">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 rounded-full flex items-center justify-center mx-auto">
              <Database className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">No Learning Batches Synthesized</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                We couldn&#39;t find any active MCQ questions stored in the database for <strong>{selection.topic?.name || 'this topic'}</strong>. Click synthesize below to generate your high-yield curriculum layer.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSynthesizeBatch}
              disabled={isContextGenerating}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2.5 transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Synthesize First Q-Bank Batch</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <span>Available Practice Batches ({versions.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {versions.map((v) => {
                // Determine activities appropriate to selected tab
                const statsMain = getActivityStats(v, 'all');
                const statsA = getActivityStats(v, 'A');
                const statsB = getActivityStats(v, 'B');

                return (
                  <div
                    key={v.id}
                    className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col justify-between hover:shadow-md transition-shadow relative"
                  >
                    {/* Top Meta Bar */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 text-[10px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg border border-indigo-100 dark:border-indigo-800 white-space:nowrap">
                          BATCH v{v.version}.0
                        </span>

                        <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-semibold">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(v.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                          {v.change_summary || `Learning Package v${v.version}.0`}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold border border-emerald-100 dark:border-emerald-800">
                            {v.quality_score}% Quality Match
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-xs text-slate-400 font-semibold">
                            {v.content_count} High-Yield MCQs
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Practice Activities Block */}
                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Practice Activities
                      </p>

                      {!isQuizMode ? (
                        /* Standard Practice Set (40 Qs) */
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Core MCQ Practice Q-Bank
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-semibold text-slate-400">
                                40 Clinical Vignettes
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span
                                className={`text-[10px] font-bold ${
                                  statsMain.status === 'Completed'
                                    ? 'text-emerald-600'
                                    : statsMain.status === 'In Progress'
                                    ? 'text-indigo-600'
                                    : 'text-slate-400'
                                }`}
                              >
                                {statsMain.status === 'Completed'
                                  ? `Completed (${statsMain.accuracy}% Accuracy)`
                                  : statsMain.status === 'In Progress'
                                  ? `In Progress (${statsMain.answered}/40)`
                                  : 'Not Started'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStartPractice(v, 'all')}
                            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{statsMain.status === 'In Progress' ? 'Resume' : 'Start'}</span>
                          </button>
                        </div>
                      ) : (
                        /* Sprint Quizzes A & B (20 Qs each) */
                        <div className="space-y-2.5">
                          {/* Quiz A */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Sprint Challenge Quiz A
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-semibold text-slate-400">
                                  20 Sprint Questions
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <span
                                  className={`text-[10px] font-bold ${
                                    statsA.status === 'Completed'
                                      ? 'text-emerald-600'
                                      : statsA.status === 'In Progress'
                                      ? 'text-indigo-600'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {statsA.status === 'Completed'
                                    ? `Completed (${statsA.accuracy}% Acc)`
                                    : statsA.status === 'In Progress'
                                    ? `In Progress (${statsA.answered}/20)`
                                    : 'Not Started'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleStartPractice(v, 'A')}
                              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{statsA.status === 'In Progress' ? 'Resume' : 'Start'}</span>
                            </button>
                          </div>

                          {/* Quiz B */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Sprint Challenge Quiz B
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-semibold text-slate-400">
                                  20 Sprint Questions
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <span
                                  className={`text-[10px] font-bold ${
                                    statsB.status === 'Completed'
                                      ? 'text-emerald-600'
                                      : statsB.status === 'In Progress'
                                      ? 'text-indigo-600'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {statsB.status === 'Completed'
                                    ? `Completed (${statsB.accuracy}% Acc)`
                                    : statsB.status === 'In Progress'
                                    ? `In Progress (${statsB.answered}/20)`
                                    : 'Not Started'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleStartPractice(v, 'B')}
                              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{statsB.status === 'In Progress' ? 'Resume' : 'Start'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- STATE 2: ACTIVE PRACTICE GAME SESSION ---
  const currentQ = questions[currentIndex];
  const isCurrentAnswered = selectedAnswers[currentIndex] !== undefined;
  const selectedIdx = selectedAnswers[currentIndex];
  const isCorrect = isCurrentAnswered && isQuestionCorrect(currentQ, selectedIdx);

  // Stats calculation inside active set
  const answeredCount = Object.keys(selectedAnswers).length;
  let runningCorrectCount = 0;
  questions.forEach((q, idx) => {
    if (selectedAnswers[idx] !== undefined && isQuestionCorrect(q, selectedAnswers[idx])) {
      runningCorrectCount++;
    }
  });

  const accuracyPercent = answeredCount > 0 ? Math.round((runningCorrectCount / answeredCount) * 100) : 0;

  if (gameState === 'playing' && currentQ) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        {/* Game Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setGameState('library')}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Q-Bank Batches</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg border border-indigo-100 dark:border-indigo-800 white-space:nowrap">
              Active v{activeBatch?.version}.0 • {activeActivity === 'all' ? 'Core' : `Quiz ${activeActivity}`}
            </span>
          </div>
        </div>

        {/* Header Breadcrumbs */}
        {renderBreadcrumbHeader()}

        {/* Split Screen Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Stem Section */}
          <div className="lg:col-span-3 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              {/* Question Metadata Row */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-800 dark:text-white text-sm">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  {currentQ.high_yield_tag && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                      {currentQ.high_yield_tag}
                    </span>
                  )}
                  {currentQ.difficulty && (
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold border border-indigo-100 dark:border-indigo-800">
                      {currentQ.difficulty}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleFlag}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                      flaggedQuestions[currentIndex]
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${flaggedQuestions[currentIndex] ? 'fill-amber-500 text-amber-500' : ''}`} />
                    <span>{flaggedQuestions[currentIndex] ? 'Flagged' : 'Flag'}</span>
                  </button>
                </div>
              </div>

              {/* Question Stem Body */}
              <div className="text-sm sm:text-base text-slate-800 dark:text-slate-100 font-semibold leading-relaxed">
                {currentQ.question}
              </div>

              {/* Options */}
              <div className="space-y-3 pt-2">
                {currentQ.options.map((option: string, optIdx: number) => {
                  const isSelected = selectedIdx === optIdx;
                  const isCorrectAnswerIdx = getCorrectIndex(currentQ) === optIdx;
                  const isEliminated = eliminatedOptions[`${currentIndex}_${optIdx}`];

                  let borderStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40';

                  if (isCurrentAnswered) {
                    if (isCorrectAnswerIdx) {
                      borderStyle = 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100';
                    } else if (isSelected && !isCorrectAnswerIdx) {
                      borderStyle = 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100';
                    }
                  } else if (isSelected) {
                    borderStyle = 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-100';
                  }

                  const letter = String.fromCharCode(65 + optIdx);

                  return (
                    <div
                      key={optIdx}
                      onClick={() => !isEliminated && handleSelectOption(optIdx)}
                      className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 group ${borderStyle} ${
                        isEliminated ? 'opacity-30 line-through bg-slate-100 dark:bg-slate-900' : ''
                      }`}
                    >
                      {/* Circle Letter */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          isCurrentAnswered && isCorrectAnswerIdx
                            ? 'bg-emerald-600 text-white'
                            : isCurrentAnswered && isSelected && !isCorrectAnswerIdx
                            ? 'bg-rose-600 text-white'
                            : isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950 group-hover:text-indigo-700 dark:group-hover:text-indigo-400'
                        }`}
                      >
                        {isCurrentAnswered && isCorrectAnswerIdx ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          letter
                        )}
                      </div>

                      {/* Content option */}
                      <div className="flex-1 text-xs sm:text-sm font-semibold leading-normal pt-0.5 text-slate-700 dark:text-slate-200">
                        {option}
                      </div>

                      {/* Strikethrough Elim Tool */}
                      {!isCurrentAnswered && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleEliminate(optIdx, e)}
                          className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer shrink-0 ${
                            isEliminated ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/30' : ''
                          }`}
                          title="Eliminate Option"
                        >
                          <Strikethrough className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Instant Evaluation Feedback & Rationale */}
              {isCurrentAnswered && (
                <div className="space-y-4 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <div
                    className={`p-4 rounded-2xl flex items-start gap-3.5 ${
                      isCorrect
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                        : 'bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm">
                        {isCorrect ? 'Correct! High Yield Integration Success.' : 'Incorrect Option Selected.'}
                      </h4>
                      <p className="text-xs leading-relaxed font-medium">
                        {currentQ.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Clinical Pearl Box */}
                  {currentQ.clinical_pearl && (
                    <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                        <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>Clinical Pearl & Board Exam Concept</span>
                      </div>
                      <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-semibold">
                        {currentQ.clinical_pearl}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Nav Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    Next Question <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishSession}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Award className="w-4 h-4" /> Finish Practice ({answeredCount}/{questions.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar Question Navigator Map */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Question Navigator</h3>

              {/* Grid map */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isCurrent = currentIndex === idx;
                  const isAnswered = selectedAnswers[idx] !== undefined;
                  const isFlagged = flaggedQuestions[idx];

                  let cellStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
                  if (isCurrent) {
                    cellStyle = 'ring-2 ring-indigo-600 bg-indigo-50 dark:bg-indigo-950 font-black text-indigo-600 dark:text-indigo-400';
                  } else if (isAnswered) {
                    // check correctness of answer
                    const ans = selectedAnswers[idx];
                    const isCorrectCell = isQuestionCorrect(q, ans);
                    cellStyle = isCorrectCell
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'bg-rose-500 text-white font-bold';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCurrentIndex(idx);
                        setQuestionStartTime(Date.now());
                      }}
                      className={`relative h-9 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer ${cellStyle}`}
                    >
                      <span>{idx + 1}</span>
                      {isFlagged && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Session Live Status Card */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Session Metrics
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-400">Answered:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {answeredCount} / {questions.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-400">Accuracy:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {accuracyPercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend bar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-500" />
                  <span>Correct Answer ({runningCorrectCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-rose-500" />
                  <span>Incorrect Answer ({answeredCount - runningCorrectCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
                  <span>Unanswered ({questions.length - answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-amber-400" />
                  <span>Flagged for Review</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- STATE 3: POST-GAME PERFORMANCE REPORT ---
  if (gameState === 'completed') {
    return (
      <div className="max-w-3xl mx-auto p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 text-center pb-12 mt-6">
        <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
          <Award className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Practice Session Completed!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Review your high-yield performance analytics and rationales to seal your clinical integration.
          </p>
        </div>

        {/* Highlight Scorecard Grid */}
        <div className="grid grid-cols-3 gap-4 py-5 border-y border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {accuracyPercent}%
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Accuracy Score
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {runningCorrectCount} / {questions.length}
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Correct Qs
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200">
              {formatSeconds(totalSessionTimeSpent)}
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Time Elapsed
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <button
            type="button"
            onClick={handleRestartSession}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Practice Set</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setGameState('playing');
              setCurrentIndex(0);
            }}
            className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Review Explanations</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setGameState('library');
              loadDatabaseRecords(); // reload attempts
            }}
            className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Batches</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
