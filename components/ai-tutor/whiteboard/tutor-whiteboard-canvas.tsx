'use client';

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Award,
  Layers,
  HelpCircle,
  PenTool,
  Volume2,
  Mic,
} from 'lucide-react';
import {
  TutorLessonSchema,
  TutorSceneSchema,
  type TutorLesson,
  type TutorScene,
  type TutorAsset,
  type TutorVoiceMetadata,
} from '@/lib/types/ai-tutor-architecture';
import { useBoardTimeline } from './use-board-timeline';
import { TutorPresenterAvatar } from './tutor-presenter-avatar';
import { ActionRenderer } from './action-renderer';
import { AssetRenderer } from './asset-renderer';
import { TutorBoardControls } from './tutor-board-controls';
import { trackTutorEvent } from '@/lib/client/tutor-analytics';

interface TutorWhiteboardCanvasProps {
  userId?: string;
  lesson: TutorLesson | any;
  scenes?: TutorScene[];
  assets?: TutorAsset[];
  voiceMetadata?: TutorVoiceMetadata[];
  initialSceneIndex?: number;
  onSceneChange?: (sceneIndex: number) => void;
  onAskDoubtAboutScene?: (scene: TutorScene, timestampMs: number) => void;
  className?: string;
}

export function TutorWhiteboardCanvas({
  userId = 'system-user',
  lesson: rawLesson,
  scenes: rawScenes = [],
  assets: rawAssets = [],
  voiceMetadata: rawVoiceMetadata = [],
  initialSceneIndex = 0,
  onSceneChange,
  onAskDoubtAboutScene,
  className = '',
}: TutorWhiteboardCanvasProps) {
  // 1. Zod Data Validation & Graceful Fallback
  const parsedLesson = useMemo(() => {
    try {
      if (!rawLesson) return null;
      const res = TutorLessonSchema.safeParse(rawLesson);
      return res.success ? res.data : rawLesson;
    } catch {
      return rawLesson;
    }
  }, [rawLesson]);

  const scenesList: TutorScene[] = useMemo(() => {
    if (rawScenes && rawScenes.length > 0) return rawScenes;
    if (parsedLesson && Array.isArray((parsedLesson as any).scenes)) {
      return (parsedLesson as any).scenes;
    }
    return [];
  }, [rawScenes, parsedLesson]);

  const voiceMetadataList: TutorVoiceMetadata[] = useMemo(() => {
    if (rawVoiceMetadata && rawVoiceMetadata.length > 0) return rawVoiceMetadata;
    if (parsedLesson && Array.isArray((parsedLesson as any).voiceMetadata)) {
      return (parsedLesson as any).voiceMetadata;
    }
    return [];
  }, [rawVoiceMetadata, parsedLesson]);

  // Player State
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(initialSceneIndex);

  React.useEffect(() => {
    if (initialSceneIndex !== undefined && initialSceneIndex !== activeSceneIndex) {
      setActiveSceneIndex(initialSceneIndex);
    }
  }, [initialSceneIndex]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentScene: TutorScene | null = scenesList[activeSceneIndex] || scenesList[0] || null;

  // Analytics Scope & Tracking Refs
  const lessonId = parsedLesson?.id || rawLesson?.id;
  const examId = parsedLesson?.examId || rawLesson?.examId || 'exam-default';
  const subjectId = parsedLesson?.subjectId || rawLesson?.subjectId || 'subj-default';
  const topicId = parsedLesson?.topicId || rawLesson?.topicId || 'topic-default';
  const subtopicId = parsedLesson?.subtopicId || rawLesson?.subtopicId;

  const hasStartedLoggedRef = useRef<string | null>(null);
  const lastLoggedSceneKeyRef = useRef<string | null>(null);
  const hasCompletedLoggedRef = useRef<string | null>(null);
  const wasPlayingRef = useRef<boolean>(false);

  // Track scene_started
  React.useEffect(() => {
    if (lessonId && currentScene && userId) {
      const sceneKey = `${lessonId}-${activeSceneIndex}`;
      if (lastLoggedSceneKeyRef.current !== sceneKey) {
        lastLoggedSceneKeyRef.current = sceneKey;
        trackTutorEvent({
          userId,
          eventType: 'scene_started',
          examId,
          subjectId,
          topicId,
          subtopicId,
          lessonId,
          sceneId: currentScene.id,
          metadata: { sequenceNumber: currentScene.sequenceNumber || activeSceneIndex + 1 },
        });
      }
    }
  }, [lessonId, currentScene?.id, activeSceneIndex, userId, examId, subjectId, topicId, subtopicId]);

  // Track tutor_started, tutor_paused, tutor_resumed
  React.useEffect(() => {
    if (!lessonId || !userId) return;

    if (isPlaying) {
      if (hasStartedLoggedRef.current !== lessonId) {
        hasStartedLoggedRef.current = lessonId;
        trackTutorEvent({
          userId,
          eventType: 'tutor_started',
          examId,
          subjectId,
          topicId,
          subtopicId,
          lessonId,
          sceneId: currentScene?.id || null,
        });
      } else if (!wasPlayingRef.current) {
        trackTutorEvent({
          userId,
          eventType: 'tutor_resumed',
          examId,
          subjectId,
          topicId,
          subtopicId,
          lessonId,
          sceneId: currentScene?.id || null,
        });
      }
      wasPlayingRef.current = true;
    } else {
      if (wasPlayingRef.current && hasStartedLoggedRef.current === lessonId) {
        trackTutorEvent({
          userId,
          eventType: 'tutor_paused',
          examId,
          subjectId,
          topicId,
          subtopicId,
          lessonId,
          sceneId: currentScene?.id || null,
        });
      }
      wasPlayingRef.current = false;
    }
  }, [isPlaying, lessonId, userId, examId, subjectId, topicId, subtopicId, currentScene?.id]);

  // Handle Scene Completion & Tutor Completion
  const handleSceneEnd = () => {
    if (userId && lessonId) {
      trackTutorEvent({
        userId,
        eventType: 'scene_completed',
        examId,
        subjectId,
        topicId,
        subtopicId,
        lessonId,
        sceneId: currentScene?.id || null,
        metadata: { sequenceNumber: activeSceneIndex + 1 },
      });
    }

    if (activeSceneIndex < scenesList.length - 1) {
      const nextIdx = activeSceneIndex + 1;
      setActiveSceneIndex(nextIdx);
      if (onSceneChange) onSceneChange(nextIdx);
    } else {
      setIsPlaying(false);
      if (userId && lessonId && hasCompletedLoggedRef.current !== lessonId) {
        hasCompletedLoggedRef.current = lessonId;
        trackTutorEvent({
          userId,
          eventType: 'tutor_completed',
          examId,
          subjectId,
          topicId,
          subtopicId,
          lessonId,
        });
      }
    }
  };

  // 2. Custom Board Timeline Hook with Audio Sync
  const {
    elapsedTimeMs,
    totalDurationMs,
    progressPercent,
    visibleActions,
    activeCue,
    presenterState,
    isReducedMotion,
    isAudioLoading,
    audioProvider,
    voiceNotice,
    seekToPercent,
    replayScene,
  } = useBoardTimeline({
    scene: currentScene,
    voiceMetadata: voiceMetadataList,
    isPlaying,
    playbackRate,
    isMuted,
    onSceneEnd: handleSceneEnd,
  });

  const handleSeek = (percent: number) => {
    seekToPercent(percent);
    if (userId && lessonId) {
      trackTutorEvent({
        userId,
        eventType: 'tutor_seeked',
        examId,
        subjectId,
        topicId,
        subtopicId,
        lessonId,
        sceneId: currentScene?.id || null,
        metadata: { seekPercent: percent },
      });
    }
  };

  // Navigation handlers
  const handlePreviousScene = () => {
    if (activeSceneIndex > 0) {
      const prevIdx = activeSceneIndex - 1;
      setActiveSceneIndex(prevIdx);
      if (onSceneChange) onSceneChange(prevIdx);
    }
  };

  const handleNextScene = () => {
    if (activeSceneIndex < scenesList.length - 1) {
      const nextIdx = activeSceneIndex + 1;
      setActiveSceneIndex(nextIdx);
      if (onSceneChange) onSceneChange(nextIdx);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Safe Asset Lookup
  const sceneAssets = useMemo(() => {
    if (!currentScene) return [];
    return rawAssets.filter((a) => a.sceneId === currentScene.id || !a.sceneId);
  }, [rawAssets, currentScene]);

  // Graceful Error State if lesson data is invalid
  if (!parsedLesson && scenesList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white border border-slate-200 text-slate-700 shadow-sm my-4">
        <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
        <p className="text-sm font-bold text-slate-800">Preparing whiteboard lesson…</p>
        <p className="text-xs text-slate-500 mt-1 text-center">Checking canonical curriculum resources</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col gap-4 p-2 sm:p-4 lg:p-6 rounded-3xl bg-slate-100 dark:bg-[#080B11] border border-slate-200 dark:border-slate-800 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none p-4 overflow-y-auto bg-slate-900' : ''
      } ${className}`}
    >
      {/* 1. Whiteboard Canvas Header (Metadata & Phase Pill & Voice Status) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {currentScene?.phase || 'TEACHING SESSION'}
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-xs sm:max-w-md">
            {parsedLesson?.title || 'Interactive AI Tutor Lesson'}
          </span>
          {/* Natural Voice Status Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800/80 text-[10px] font-medium text-slate-600 dark:text-slate-300">
            <Volume2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>{voiceNotice || audioProvider}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Scene {activeSceneIndex + 1} of {scenesList.length}</span>
        </div>
      </div>

      {/* 2. Responsive Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* ============================================================
            CANVAS SURFACE: MUST ALWAYS REMAIN 100% WHITE (#ffffff)
            Regardless of light/dark/system mode.
           ============================================================ */}
        <div className="lg:col-span-3 flex flex-col rounded-3xl bg-white border-4 border-slate-200 shadow-xl overflow-hidden relative min-h-[420px] sm:min-h-[480px]">
          {/* Subtle Whiteboard Top Pen Tray Marker Accent */}
          <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 opacity-80" />

          {/* Whiteboard Surface Area */}
          <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-between relative bg-white bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
            {/* Safe Inner Margin Container */}
            <div className="space-y-4 max-w-full overflow-x-hidden">
              {/* Scene Title in Marker Style */}
              <div className="border-b border-slate-200/80 pb-3">
                <h3
                  className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
                  style={{
                    fontFamily: "'Caveat', 'Kalam', 'Patrick Hand', 'Comic Sans MS', cursive, sans-serif",
                  }}
                >
                  {currentScene?.title || `Scene ${activeSceneIndex + 1}`}
                </h3>
                {currentScene?.examRelevance && (
                  <span className="inline-block mt-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                    ★ {currentScene.examRelevance}
                  </span>
                )}
              </div>

              {/* High-Yield Key Bullets (Marker Style) */}
              {currentScene?.keyBullets && currentScene.keyBullets.length > 0 && (
                <div className="space-y-2 my-3">
                  {currentScene.keyBullets.map((bullet, bIdx) => (
                    <motion.div
                      key={bIdx}
                      initial={isReducedMotion ? { opacity: 1 } : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: bIdx * 0.15, duration: 0.3 }}
                      className="flex items-start gap-2.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-indigo-600 mt-2 shrink-0" />
                      <span
                        className="text-base sm:text-lg font-bold text-slate-800"
                        style={{
                          fontFamily: "'Caveat', 'Kalam', 'Patrick Hand', 'Comic Sans MS', cursive, sans-serif",
                        }}
                      >
                        {bullet}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Dynamic Board Actions Revealed over Timeline */}
              <div className="space-y-2 my-4">
                <AnimatePresence>
                  {visibleActions.map((action) => (
                    <ActionRenderer key={action.id} action={action} isReducedMotion={isReducedMotion} />
                  ))}
                </AnimatePresence>
              </div>

              {/* Visual Assets (Diagrams / Tables / Images) */}
              {sceneAssets.length > 0 && (
                <div className="my-4">
                  {sceneAssets.map((asset) => (
                    <AssetRenderer key={asset.id || asset.sourceUrl} asset={asset} />
                  ))}
                </div>
              )}

              {/* Clinical / High-Yield Pearls Box */}
              {currentScene?.clinicalPearls && currentScene.clinicalPearls.length > 0 && (
                <div className="p-3 sm:p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-amber-950 shadow-2xs my-4">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-800 mb-1">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>High-Yield Exam Pearl</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm font-semibold">
                    {currentScene.clinicalPearls.map((pearl, pIdx) => (
                      <li key={pIdx}>{pearl}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom Whiteboard Marker Shelf Branding */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 select-none">
              <span>NEOMCQ AI TUTOR WHITEBOARD ENGINE</span>
              <span className="text-indigo-600 font-semibold">100% BOARD ALIGNED</span>
            </div>
          </div>
        </div>

        {/* ============================================================
            SIDEBAR / PRESENTER AREA (Desktop: Side, Mobile: Compact Bar)
           ============================================================ */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          {/* Fictional Presenter Vector Avatar */}
          <TutorPresenterAvatar
            state={presenterState}
            compact={false}
            className="w-full"
          />

          {/* Scene Roadmap List */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-100 dark:border-slate-800">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Lesson Roadmap</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {scenesList.map((sc, idx) => (
                <button
                  key={sc.id || idx}
                  onClick={() => {
                    setActiveSceneIndex(idx);
                    if (onSceneChange) onSceneChange(idx);
                  }}
                  className={`w-full text-left p-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                    activeSceneIndex === idx
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="truncate pr-2">{sc.title || `Scene ${idx + 1}`}</span>
                  {activeSceneIndex === idx && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Whiteboard Player Controls */}
      <TutorBoardControls
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        currentSceneIndex={activeSceneIndex}
        totalScenes={scenesList.length}
        onPreviousScene={handlePreviousScene}
        onNextScene={handleNextScene}
        progressPercent={progressPercent}
        onSeek={handleSeek}
        playbackRate={playbackRate}
        onRateChange={setPlaybackRate}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        onReplayScene={replayScene}
        showCaptions={showCaptions}
        onToggleCaptions={() => setShowCaptions(!showCaptions)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        activeCue={activeCue}
      />
    </div>
  );
}
