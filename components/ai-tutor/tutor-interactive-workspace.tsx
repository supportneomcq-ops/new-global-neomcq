'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  BookOpen,
  Layers,
  HelpCircle,
  RotateCw,
  Clock,
  CheckCircle2,
  ListOrdered,
  Lightbulb,
  FileText,
  Loader2,
  AlertCircle,
  Play,
  Award,
} from 'lucide-react';
import { useSelection } from '@/lib/context/selection-context';
import type { TutorLessonSession, TutorScene } from '@/lib/server/content-engine/tutor-types';
import { TutorVideoPlayer } from './tutor-video-player';
import { TutorChatPanel } from './tutor-chat-panel';

interface TutorInteractiveWorkspaceProps {
  userId?: string;
  examId?: string;
  subjectId?: string;
  topicId?: string;
  topicName?: string;
  subjectName?: string;
  examName?: string;
}

export function TutorInteractiveWorkspace({
  userId = 'system-user',
  examId: propExamId,
  subjectId: propSubjectId,
  topicId: propTopicId,
  topicName: propTopicName,
  subjectName: propSubjectName,
  examName: propExamName,
}: TutorInteractiveWorkspaceProps) {
  const { selection } = useSelection();

  const examId = propExamId || selection.exam?.id || 'exam-default';
  const subjectId = propSubjectId || selection.subject?.id || 'subj-default';
  const topicId = propTopicId || selection.topic?.id || 'topic-default';
  const subtopicId = selection.subtopic?.id;

  const examName = propExamName || selection.exam?.name || 'Medical Boards';
  const subjectName = propSubjectName || selection.subject?.name || 'Clinical Medicine';
  const topicName = propTopicName || selection.topic?.name || 'High-Yield Topic';

  // Workspace States
  const [session, setSession] = useState<TutorLessonSession | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'scenes' | 'doubts' | 'pearls'>('scenes');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('Curating high-yield syllabus...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load or Create Video Lesson Session
  useEffect(() => {
    let isMounted = true;

    async function loadOrCreateSession() {
      if (!topicId) return;

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetch('/api/ai-tutor/lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId,
            subjectId,
            topicId,
            subtopicId,
            userId,
          }),
        });

        const data = await res.json();

        if (isMounted) {
          if (data.success && data.session) {
            setSession(data.session);
            setActiveSceneIndex(0);
          } else {
            setErrorMessage(data.error || 'Failed to initialize AI Tutor video session.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || 'Network error while loading Tutor session.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadOrCreateSession();

    return () => {
      isMounted = false;
    };
  }, [examId, subjectId, topicId, subtopicId, userId]);

  // Handle Regenerating or Forcing New Video Lesson
  const handleRegenerateLesson = async () => {
    setIsGenerating(true);
    setGenerationStep('Analyzing canonical high-yield syllabus...');

    const timer1 = setTimeout(() => setGenerationStep('Designing visual board scenes & flowcharts...'), 1200);
    const timer2 = setTimeout(() => setGenerationStep('Scripting teacher dialogue & voice timing...'), 2400);
    const timer3 = setTimeout(() => setGenerationStep('Compiling whiteboard engine & checkpoints...'), 3600);

    try {
      const res = await fetch('/api/ai-tutor/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          subjectId,
          topicId,
          subtopicId,
          userId,
          forceNew: true,
        }),
      });

      const data = await res.json();

      if (data.success && data.session) {
        setSession(data.session);
        setActiveSceneIndex(0);
      }
    } catch (err: any) {
      console.warn('Regeneration note:', err);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsGenerating(false);
    }
  };

  const handleAskDoubtAboutScene = (scene: TutorScene, timestamp: number) => {
    setActiveSidebarTab('doubts');
  };

  const scenes = session?.scenes || [];
  const currentScene = scenes[activeSceneIndex] || scenes[0];

  return (
    <div className="space-y-6">
      {/* 1. Top Hierarchy Status & Master Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                AI Visual Professor Masterclass
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono font-semibold border border-emerald-200 dark:border-emerald-800">
                100% Board Aligned
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {topicName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {examName} • {subjectName} {selection.subtopic?.name ? `• ${selection.subtopic.name}` : ''}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerateLesson}
            disabled={isGenerating || isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating Video...' : 'Regenerate Lecture'}</span>
          </button>
        </div>
      </div>

      {/* 2. Loading / Generation State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Initializing AI Master Tutor Video Session...
          </p>
          <p className="text-xs text-slate-500">Grounded in canonical high-yield board syllabus</p>
        </div>
      ) : isGenerating ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 animate-pulse">
              <Sparkles className="w-7 h-7" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {generationStep}
            </p>
            <p className="text-xs text-slate-500">
              Building interactive blackboard animations, clinical flowcharts, and checkpoints...
            </p>
          </div>
        </div>
      ) : errorMessage ? (
        <div className="p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-rose-900 dark:text-rose-200">{errorMessage}</p>
          <button
            onClick={() => handleRegenerateLesson()}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : session ? (
        /* 3. Main Workspace Grid: Video Player (Left) + Multi-Tab Panel (Right) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Video Canvas Player Column (7-8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-4">
            <TutorVideoPlayer
              session={session}
              activeSceneIndex={activeSceneIndex}
              onSceneChange={(idx) => setActiveSceneIndex(idx)}
              onAskDoubtAboutScene={handleAskDoubtAboutScene}
            />

            {/* Current Scene Overview Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {currentScene?.title}
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Duration: {currentScene?.durationSeconds}s
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {currentScene?.narrationScript}
                </p>

                {currentScene?.examRelevance && (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span><strong>Exam Relevance:</strong> {currentScene.examRelevance}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side Panel: Scene Playlist / Doubt Mentor / High-Yield Pearls */}
          <div className="lg:col-span-4 space-y-4">
            {/* Tab Selector Header */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveSidebarTab('scenes')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSidebarTab === 'scenes'
                    ? 'bg-white dark:bg-[#0B0F19] text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Scenes ({scenes.length})</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('doubts')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSidebarTab === 'doubts'
                    ? 'bg-white dark:bg-[#0B0F19] text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Doubt Mentor</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('pearls')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSidebarTab === 'pearls'
                    ? 'bg-white dark:bg-[#0B0F19] text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Key Pearls</span>
              </button>
            </div>

            {/* TAB 1: SCENE PLAYLIST */}
            {activeSidebarTab === 'scenes' && (
              <div className="p-4 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 max-h-[560px] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Lecture Chapter Playlist
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">
                    {scenes.length} Video Chapters
                  </span>
                </div>

                {scenes.map((scene, idx) => {
                  const isActive = idx === activeSceneIndex;
                  return (
                    <button
                      key={scene.id || idx}
                      onClick={() => setActiveSceneIndex(idx)}
                      className={`w-full p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-start gap-2.5 ${
                        isActive
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-xs'
                          : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                              isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                            }`}
                          >
                            {scene.phase?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {scene.durationSeconds}s
                          </span>
                        </div>
                        <p
                          className={`text-xs font-bold truncate mt-0.5 ${
                            isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {scene.title}
                        </p>
                      </div>

                      {isActive && <Play className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 2: AI DOUBT MENTOR PANEL */}
            {activeSidebarTab === 'doubts' && (
              <TutorChatPanel
                lessonId={session.id}
                topicId={session.topicId}
                userId={userId}
                topicName={topicName}
              />
            )}

            {/* TAB 3: HIGH-YIELD CLINICAL PEARLS & CHECKPOINTS */}
            {activeSidebarTab === 'pearls' && (
              <div className="p-4 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 max-h-[560px] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> High-Yield Board Pearls
                  </h4>
                </div>

                {scenes.flatMap((s) => s.clinicalPearls || []).length > 0 ? (
                  scenes
                    .flatMap((s) => s.clinicalPearls || [])
                    .map((pearl, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1"
                      >
                        <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                          Board Pearl #{idx + 1}
                        </span>
                        <p className="leading-snug">{pearl}</p>
                      </div>
                    ))
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 text-center">
                    All board pearls are integrated directly into the video lecture timeline.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
