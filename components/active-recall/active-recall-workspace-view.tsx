'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Layers,
  ArrowLeft,
  Flame,
  Target,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { useSelection } from '@/lib/context/selection-context';
import {
  ActiveRecallSet,
  ActiveRecallItem,
  ActiveRecallSessionStats,
} from '@/lib/types/active-recall';
import { ActiveRecallSetsView } from './active-recall-sets-view';
import { ActiveRecallCard } from './active-recall-card';
import { ActiveRecallCompletion } from './active-recall-completion';
import { OnboardingData } from '@/components/onboarding-flow';

interface ActiveRecallWorkspaceViewProps {
  user?: OnboardingData;
}

export function ActiveRecallWorkspaceView({ user }: ActiveRecallWorkspaceViewProps) {
  const { selection } = useSelection();
  const activeExam = selection.exam;
  const activeSubject = selection.subject;
  const activeTopic = selection.topic;
  const activeSubtopic = selection.subtopic;

  // View state: 'sets' | 'session' | 'completion'
  const [currentView, setCurrentView] = useState<'sets' | 'session' | 'completion'>('sets');

  // Loaded sets for the currently selected topic
  const [sets, setSets] = useState<ActiveRecallSet[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);

  // Active Session state
  const [activeSet, setActiveSet] = useState<ActiveRecallSet | null>(null);
  const [sessionItems, setSessionItems] = useState<ActiveRecallItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>('');
  const [savedAnswers, setSavedAnswers] = useState<
    Record<
      string,
      {
        userAnswer: string;
        isCorrect: boolean;
        isRevealed: boolean;
        evaluated: boolean;
        feedback?: { answer: string; acceptedAnswers: string[]; explanation: string; highYieldPoint?: string; memoryHook?: string; examTip?: string };
      }
    >
  >({});

  // Session Metrics & Streaks
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [reviewedCount, setReviewedCount] = useState<number>(0);

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStage, setGenerationStage] = useState<string>('');

  // Fetch Sets whenever hierarchy selection changes
  const loadSetsForTopic = useCallback(async () => {
    if (!activeTopic?.id) {
      setSets([]);
      setIsLoadingSets(false);
      return;
    }

    setIsLoadingSets(true);
    setFetchError(null);

    try {
      const res = await fetch('/api/active-recall/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: activeExam?.id,
          subjectId: activeSubject?.id,
          topicId: activeTopic.id,
          subtopicId: activeSubtopic?.id,
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.sets)) {
        setSets(data.sets);
        setGenerationMessage(data.generation_message || null);
      } else {
        setSets([]);
        setGenerationMessage(null);
        if (data.error) setFetchError(data.error);
      }
    } catch (err: any) {
      console.error('Failed to load active recall sets:', err);
      setFetchError('Failed to connect to active recall database.');
      setSets([]);
    } finally {
      setIsLoadingSets(false);
    }
  }, [activeExam?.id, activeSubject?.id, activeTopic?.id, activeSubtopic?.id, user?.id]);

  // Immediately invalidate session and reload if hierarchy selection changes
  useEffect(() => {
    setCurrentView('sets');
    setActiveSet(null);
    setSessionItems([]);
    setCurrentIndex(0);
    setSavedAnswers({});
    setCurrentStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setRevealedCount(0);
    setReviewedCount(0);

    loadSetsForTopic();
  }, [activeExam?.id, activeSubject?.id, activeTopic?.id, activeSubtopic?.id, loadSetsForTopic]);

  // Start an Active Recall Session
  const handleStartSession = async (set: ActiveRecallSet, customItems?: ActiveRecallItem[]) => {
    const items = customItems || set.items;
    if (!items || items.length === 0) return;
    const newSessionId = `ars_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      const response = await fetch('/api/active-recall/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: newSessionId, examId: activeExam?.id, subjectId: activeSubject?.id,
          topicId: activeTopic?.id, subtopicId: activeSubtopic?.id, versionId: set.id,
          totalItems: items.length, correctCount: 0, revealedCount: 0, reviewedCount: 0, status: 'in_progress' }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to start recall session.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to start recall session.');
      return;
    }
    setActiveSet(set); setSessionItems(items); setCurrentIndex(0); setSessionId(newSessionId);
    setSavedAnswers({}); setCurrentStreak(0); setBestStreak(0); setCorrectCount(0);
    setRevealedCount(0); setReviewedCount(0); setCurrentView('session');
  };

  const handleAnswerSubmit = async (answer: string, isRevealed: boolean, responseTimeMs: number) => {
    const currentItem = sessionItems[currentIndex];
    if (!currentItem || !activeSet) throw new Error('Recall session is not ready.');
    const response = await fetch('/api/active-recall/attempt', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId: activeExam?.id, subjectId: activeSubject?.id, topicId: activeTopic?.id,
        subtopicId: activeSubtopic?.id, recallItemId: currentItem.id, sessionId, versionId: activeSet.id,
        userAnswer: answer, isRevealed, responseTimeMs }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save your answer.');
    const isCorrect = Boolean(data.isCorrect) && !isRevealed;
    if (isCorrect) {
      const nextStreak = currentStreak + 1; setCurrentStreak(nextStreak);
      if (nextStreak > bestStreak) setBestStreak(nextStreak);
      setCorrectCount((prev) => prev + 1);
    } else {
      setCurrentStreak(0);
      if (isRevealed) setRevealedCount((prev) => prev + 1);
      else setReviewedCount((prev) => prev + 1);
    }
    setSavedAnswers((prev) => ({ ...prev, [currentItem.id]: {
      userAnswer: isRevealed ? data.feedback.answer : answer, isCorrect, isRevealed, evaluated: true,
      feedback: data.feedback,
    } }));
    return { isCorrect, feedback: data.feedback };
  };

  // Navigate to Next
  const handleNext = () => {
    if (currentIndex < sessionItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Complete Session
      handleCompleteSession();
    }
  };

  // Navigate to Previous
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Complete Active Recall Session
  const handleCompleteSession = async () => {
    try {
      const response = await fetch('/api/active-recall/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, examId: activeExam?.id, subjectId: activeSubject?.id,
          topicId: activeTopic?.id, subtopicId: activeSubtopic?.id, versionId: activeSet?.id,
          totalItems: sessionItems.length, correctCount, revealedCount, reviewedCount, status: 'completed' }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save session summary.');
      setCurrentView('completion');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to complete recall session.');
    }
  };

  // Repeat full session
  const handleRepeatSession = () => {
    if (!activeSet) return;
    handleStartSession(activeSet);
  };

  // Review only missed items
  const handleReviewMissed = () => {
    if (!activeSet) return;
    const missed = sessionItems.filter((it) => {
      const ans = savedAnswers[it.id];
      return !ans || !ans.isCorrect || ans.isRevealed;
    });

    if (missed.length > 0) {
      handleStartSession(activeSet, missed);
    }
  };

  // Active Recall loads the shared canonical topic pack; it does not launch a student-specific AI job.
  const handleGenerateNewSet = async () => {
    if (!activeTopic?.id) return;

    setIsGenerating(true);
    setGenerationMessage(null);
    setGenerationStage('Checking shared exam-specific topic content...');

    const requestBody = {
      examId: activeExam?.id,
      subjectId: activeSubject?.id,
      topicId: activeTopic.id,
      subtopicId: activeSubtopic?.id,
    };

    try {
      const response = await fetch('/api/active-recall/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const result = await response.json();

      if (result.success && result.set) {
        setSets((prev) => [result.set, ...prev.filter((item) => item.id !== result.set.id)]);
        setGenerationMessage(null);
        await handleStartSession(result.set);
        return;
      }

      if (['awaiting_exam_verification', 'awaiting_curriculum_validation'].includes(result.status)) {
        setGenerationMessage(result.error || 'Official exam and curriculum verification is still pending.');
        return;
      }

      if (!response.ok && response.status !== 202) {
        setGenerationMessage(result.error || 'Unable to request the shared topic pack.');
        return;
      }

      setGenerationStage(result.message || 'The shared topic pack is queued...');
      // The canonical worker runs independently. Poll the saved shared set, not another AI endpoint.
      for (let attempt = 0; attempt < 24; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const refreshResponse = await fetch('/api/active-recall/sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        const refreshData = await refreshResponse.json();

        if (refreshData.success && Array.isArray(refreshData.sets) && refreshData.sets.length > 0) {
          setSets(refreshData.sets);
          setGenerationMessage(null);
          await handleStartSession(refreshData.sets[0]);
          return;
        }

        if (refreshData.generation_status === 'failed' || refreshData.generation_status === 'cancelled') {
          setGenerationMessage(refreshData.generation_message || 'The shared content job failed and needs an administrator retry.');
          return;
        }

        setGenerationStage(refreshData.generation_message || result.message || 'Waiting for the shared content worker...');
      }

      setGenerationMessage(result.message || 'The shared topic pack is queued. Reopen Active Recall to check for the saved batch.');
    } catch (err: any) {
      console.error('Shared Active Recall lookup error:', err);
      setGenerationMessage('Unable to check shared Active Recall content. Please retry.');
    } finally {
      setIsGenerating(false);
      setGenerationStage('');
    }
  };

  // Auto-generate high-yield active recall set just-in-time if none exists for this topic
  const autoGeneratedTopicRef = useRef<string | null>(null);

  useEffect(() => {
    const scopeKey = `${activeTopic?.id || ''}_${activeSubtopic?.id || 'main'}`;
    if (
      !isLoadingSets &&
      sets.length === 0 &&
      !isGenerating &&
      !fetchError &&
      activeTopic?.id &&
      autoGeneratedTopicRef.current !== scopeKey
    ) {
      autoGeneratedTopicRef.current = scopeKey;
      handleGenerateNewSet();
    }
  }, [isLoadingSets, sets.length, isGenerating, fetchError, activeTopic?.id, activeSubtopic?.id]);

  // Calculate live session accuracy
  const totalRecalled = correctCount + reviewedCount + revealedCount;
  const liveAccuracy = totalRecalled > 0 ? Math.round((correctCount / totalRecalled) * 100) : 0;

  const currentItem = sessionItems[currentIndex];
  const currentSavedAnswer = currentItem ? savedAnswers[currentItem.id] : undefined;

  const stats: ActiveRecallSessionStats = {
    totalItems: sessionItems.length,
    recalledCount: totalRecalled,
    correctCount,
    reviewedCount,
    revealedCount,
    accuracy: liveAccuracy,
    currentStreak,
    bestStreak,
    strongAreas: sessionItems
      .filter((it) => savedAnswers[it.id]?.isCorrect && !savedAnswers[it.id]?.isRevealed)
      .map((it) => it.concept),
    needsReview: sessionItems
      .filter((it) => {
        const ans = savedAnswers[it.id];
        return ans && (!ans.isCorrect || ans.isRevealed);
      })
      .map((it) => it.concept),
  };

  return (
    <div className="w-full min-h-[calc(100vh-140px)] flex flex-col space-y-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-8">

      {/* TOP HEADER CONTEXT BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          {currentView !== 'sets' && (
            <button
              type="button"
              onClick={() => setCurrentView('sets')}
              className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Return to Sets"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1">
                <Brain className="w-3 h-3" /> Active Recall
              </span>
              <span className="text-xs text-slate-400 font-mono hidden md:inline">
                {activeExam?.name || 'No exam selected'} • {activeSubject?.name || 'No subject selected'}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {activeTopic?.name || 'Select a Topic'}
              {activeSubtopic?.name ? ` — ${activeSubtopic.name}` : ''}
            </h1>
          </div>
        </div>

        {/* Live Session Metrics (shown only in active session) */}
        {currentView === 'session' && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* Streak */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-mono font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{currentStreak} Streak</span>
            </div>

            {/* Live Accuracy */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 text-xs font-mono font-bold">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              <span>{liveAccuracy}%</span>
            </div>

            {/* Progress */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
              {currentIndex + 1} / {sessionItems.length}
            </div>
          </div>
        )}
      </div>

      {/* BODY VIEW DISPATCHER */}
      {isLoadingSets ? (
        <div className="w-full max-w-xl mx-auto py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-500">Loading active recall curriculum...</p>
        </div>
      ) : currentView === 'sets' ? (
        <ActiveRecallSetsView
          sets={sets}
          topicName={activeTopic?.name || 'Topic'}
          subjectName={activeSubject?.name || ''}
          examName={activeExam?.name || ''}
          subtopicName={activeSubtopic?.name}
          isGenerating={isGenerating}
          generationStage={generationStage}
          generationMessage={generationMessage}
          onSelectSet={(set) => handleStartSession(set)}
          onGenerateNewSet={handleGenerateNewSet}
        />
      ) : currentView === 'session' && currentItem ? (
        <ActiveRecallCard
          key={currentItem.id}
          item={currentItem}
          currentIndex={currentIndex}
          totalItems={sessionItems.length}
          onAnswerSubmit={handleAnswerSubmit}
          onNext={handleNext}
          onPrevious={handlePrevious}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < sessionItems.length - 1}
          savedAnswer={currentSavedAnswer}
        />
      ) : currentView === 'completion' ? (
        <ActiveRecallCompletion
          stats={stats}
          items={sessionItems}
          savedAnswers={savedAnswers}
          topicName={activeTopic?.name || 'Topic'}
          subtopicName={activeSubtopic?.name}
          onReviewMissed={handleReviewMissed}
          onRepeatSession={handleRepeatSession}
          onBackToSets={() => setCurrentView('sets')}
        />
      ) : null}
    </div>
  );
}
