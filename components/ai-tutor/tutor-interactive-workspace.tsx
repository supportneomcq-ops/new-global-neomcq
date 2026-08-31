'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Award,
  Clock,
  Video,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import { CANONICAL_TUTOR_PHASES } from '@/lib/server/content-engine/tutor-types';
import type { TutorLessonSession, TutorSegment } from '@/lib/server/content-engine/tutor-types';
import { TutorWhiteboard } from './tutor-whiteboard';
import { TutorChatPanel } from './tutor-chat-panel';

interface TutorInteractiveWorkspaceProps {
  examId: string;
  subjectId: string;
  topicId: string;
  userId?: string;
  topicName?: string;
  subjectName?: string;
  examName?: string;
}

export function TutorInteractiveWorkspace({
  examId,
  subjectId,
  topicId,
  userId = 'system-user',
  topicName = 'Canonical Medical Topic',
  subjectName = 'Medical Subject',
  examName = 'Medical Board Exam',
}: TutorInteractiveWorkspaceProps) {
  const [session, setSession] = useState<TutorLessonSession | null>(null);
  const [activeSequence, setActiveSequence] = useState<number>(1);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [isGeneratingSegment, setIsGeneratingSegment] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active view tab on mobile (whiteboard vs chat)
  const [mobileTab, setMobileTab] = useState<'whiteboard' | 'chat'>('whiteboard');

  // Load or Resume Lesson Session on mount
  useEffect(() => {
    let isMounted = true;

    async function initializeLesson() {
      setIsLoadingSession(true);
      setErrorMessage(null);

      try {
        const res = await fetch('/api/ai-tutor/lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId,
            subjectId,
            topicId,
            userId,
          }),
        });

        const data = await res.json();

        if (isMounted) {
          if (data.success && data.session) {
            setSession(data.session);

            // If session already has segments, pick current sequence or 1
            const segs: TutorSegment[] = data.session.segments || [];
            if (segs.length > 0) {
              const maxSeq = Math.max(...segs.map((s) => s.sequence));
              setActiveSequence(maxSeq);
            } else {
              // Automatically request initial segment (sequence 1)
              fetchNextSegment(data.session.id, 1);
            }
          } else {
            setErrorMessage(data.error || 'Failed to initialize AI Tutor session.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(`Connection error: ${err.message}`);
        }
      } finally {
        if (isMounted) setIsLoadingSession(false);
      }
    }

    initializeLesson();

    return () => {
      isMounted = false;
    };
  }, [examId, subjectId, topicId, userId]);

  // Request segment for sequence N through Phase 5A API
  const fetchNextSegment = async (lessonId: string, targetSequence: number) => {
    setIsGeneratingSegment(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai-tutor/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          userId,
        }),
      });

      const data = await res.json();

      if (data.success && data.session) {
        setSession(data.session);
        if (data.segment) {
          setActiveSequence(data.segment.sequence);
        }
      } else {
        setErrorMessage(data.error || 'Failed to generate tutor segment.');
      }
    } catch (err: any) {
      setErrorMessage(`Failed to fetch segment: ${err.message}`);
    } finally {
      setIsGeneratingSegment(false);
    }
  };

  // Toggle Pause / Resume Lesson State
  const handleTogglePauseResume = async () => {
    if (!session) return;
    const action = session.lessonState === 'PAUSED' ? 'RESUME' : 'PAUSE';

    try {
      const res = await fetch('/api/ai-tutor/lesson', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: session.id,
          userId,
          action,
        }),
      });

      const data = await res.json();
      if (data.success && data.session) {
        setSession(data.session);
      }
    } catch (err) {
      console.warn('Failed to toggle pause/resume:', err);
    }
  };

  // Find active segment object for active sequence
  const currentSegment: TutorSegment | null = React.useMemo(() => {
    if (!session || !session.segments) return null;
    return session.segments.find((s) => s.sequence === activeSequence) || null;
  }, [session, activeSequence]);

  if (isLoadingSession) {
    return (
      <div className="max-w-7xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center min-h-[460px] space-y-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Resuming AI Tutor Lesson for {topicName}...
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Grounding interactive whiteboard in canonical curriculum notes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Workspace Header Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {examName}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {subjectName}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Video className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>{topicName} — Interactive AI Tutor</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Lesson State Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                session?.lessonState === 'COMPLETED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : session?.lessonState === 'PAUSED'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
              }`}
            >
              {session?.lessonState === 'COMPLETED' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Lesson Completed
                </>
              ) : session?.lessonState === 'PAUSED' ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Lesson Paused
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Active Teaching
                </>
              )}
            </span>

            {/* Pause / Resume Button */}
            {session && session.lessonState !== 'COMPLETED' && (
              <button
                type="button"
                onClick={handleTogglePauseResume}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
              >
                {session.lessonState === 'PAUSED' ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 7-Phase Pedagogical Stepper Progress Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
            <span>Pedagogical Sequence Progression</span>
            <span>
              Sequence {activeSequence} / {CANONICAL_TUTOR_PHASES.length}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {CANONICAL_TUTOR_PHASES.map((phase, idx) => {
              const seqNum = idx + 1;
              const isCompleted = (session?.segments || []).some((s) => s.sequence === seqNum);
              const isActive = activeSequence === seqNum;

              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() => {
                    if (isCompleted) {
                      setActiveSequence(seqNum);
                    }
                  }}
                  disabled={!isCompleted && seqNum > (session?.currentSequence || 0) + 1}
                  className={`h-2.5 rounded-full transition-all cursor-pointer relative group ${
                    isActive
                      ? 'bg-indigo-600 ring-2 ring-indigo-400/50'
                      : isCompleted
                      ? 'bg-emerald-500 hover:bg-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                  title={`Phase ${seqNum}: ${phase}`}
                />
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-semibold">
            <span>1. Introduction</span>
            <span>4. Important Details</span>
            <span>7. Recap</span>
          </div>
        </div>
      </div>

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs underline font-bold hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mobile Tab Nav Toggle */}
      <div className="flex lg:hidden rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setMobileTab('whiteboard')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            mobileTab === 'whiteboard'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Interactive Whiteboard
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            mobileTab === 'chat'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          AI Doubt Chat
        </button>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Whiteboard View */}
        <div className={`lg:col-span-8 ${mobileTab === 'chat' ? 'hidden lg:block' : 'block'} space-y-4`}>
          <TutorWhiteboard
            segment={currentSegment}
            isGenerating={isGeneratingSegment}
            examId={examId}
            subjectId={subjectId}
            topicId={topicId}
            contentVersion={session?.contentVersion}
          />

          {/* Sequence Stepper Controls */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <button
              type="button"
              disabled={activeSequence <= 1}
              onClick={() => setActiveSequence((prev) => Math.max(1, prev - 1))}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Sequence
            </button>

            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {CANONICAL_TUTOR_PHASES[activeSequence - 1] || 'Phase'}
            </span>

            <button
              type="button"
              disabled={isGeneratingSegment || (session?.lessonState === 'COMPLETED' && activeSequence >= 7)}
              onClick={() => {
                const nextSeq = activeSequence + 1;
                const existingNext = session?.segments?.find((s) => s.sequence === nextSeq);
                if (existingNext) {
                  setActiveSequence(nextSeq);
                } else if (session) {
                  fetchNextSegment(session.id, nextSeq);
                }
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
            >
              {isGeneratingSegment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : activeSequence < (session?.segments?.length || 0) ? (
                <>
                  Next Sequence <ChevronRight className="w-4 h-4" />
                </>
              ) : activeSequence >= 7 ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Lesson Complete
                </>
              ) : (
                <>
                  Next Phase ({CANONICAL_TUTOR_PHASES[activeSequence] || 'Next'}) <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Side AI Doubt Chat Panel */}
        <div className={`lg:col-span-4 ${mobileTab === 'whiteboard' ? 'hidden lg:block' : 'block'}`}>
          {session && (
            <TutorChatPanel
              lessonId={session.id}
              topicId={topicId}
              userId={userId}
              topicName={topicName}
            />
          )}
        </div>
      </div>
    </div>
  );
}
