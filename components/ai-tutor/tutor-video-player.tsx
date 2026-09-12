'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  HelpCircle,
  Sparkles,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Activity,
  Layers,
  Award,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Radio,
  FileQuestion,
  GraduationCap,
} from 'lucide-react';
import type {
  TutorLessonSession,
  TutorScene,
  FlowchartNode,
  FlowchartArrow,
  ComparisonRow,
} from '@/lib/server/content-engine/tutor-types';

interface TutorVideoPlayerProps {
  session: TutorLessonSession;
  activeSceneIndex: number;
  onSceneChange: (sceneIndex: number) => void;
  onAskDoubtAboutScene?: (scene: TutorScene, timestamp: number) => void;
}

export function TutorVideoPlayer({
  session,
  activeSceneIndex,
  onSceneChange,
  onAskDoubtAboutScene,
}: TutorVideoPlayerProps) {
  const scenes = useMemo(() => session?.scenes || [], [session]);
  const currentScene: TutorScene | undefined = scenes[activeSceneIndex] || scenes[0];

  // Playback States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [userCheckpointAnswer, setUserCheckpointAnswer] = useState<number | null>(null);
  const [checkpointSubmitted, setCheckpointSubmitted] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const sceneDuration = currentScene?.durationSeconds || 30;

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset local state when active scene changes
  useEffect(() => {
    setCurrentTime(0);
    setUserCheckpointAnswer(null);
    setCheckpointSubmitted(false);

    // If speech synthesis is active, cancel previous speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (isPlaying) {
      startSpeechForCurrentScene();
    }
  }, [activeSceneIndex]);

  // Handle Text-to-Speech narration
  const startSpeechForCurrentScene = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || isMuted) return;

    window.speechSynthesis.cancel();
    if (!currentScene?.narrationScript) return;

    const utterance = new SpeechSynthesisUtterance(currentScene.narrationScript);
    utterance.rate = playbackRate;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      // If reached end of scene, auto-advance or pause
      if (activeSceneIndex < scenes.length - 1) {
        onSceneChange(activeSceneIndex + 1);
      } else {
        setIsPlaying(false);
      }
    };

    utterance.onerror = () => {
      // Speech error handled gracefully
    };

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [currentScene, playbackRate, isMuted, activeSceneIndex, scenes.length, onSceneChange]);

  // Main playback timer loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = 100 / playbackRate;
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1;
          if (next >= sceneDuration) {
            if (activeSceneIndex < scenes.length - 1) {
              onSceneChange(activeSceneIndex + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return sceneDuration;
            }
          }
          return next;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackRate, sceneDuration, activeSceneIndex, scenes.length, onSceneChange]);

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          startSpeechForCurrentScene();
        }
      }
    } else {
      setIsPlaying(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      } else if (!next && isPlaying) {
        startSpeechForCurrentScene();
      }
      return next;
    });
  };

  // Replay Scene
  const handleReplay = () => {
    setCurrentTime(0);
    setUserCheckpointAnswer(null);
    setCheckpointSubmitted(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (isPlaying) {
      startSpeechForCurrentScene();
    }
  };

  // Speed change cycle
  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    setPlaybackRate(rates[nextIdx]);
    if (isPlaying && speechSynthRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      startSpeechForCurrentScene();
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (activeSceneIndex < scenes.length - 1) {
          onSceneChange(activeSceneIndex + 1);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (activeSceneIndex > 0) {
          onSceneChange(activeSceneIndex - 1);
        }
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSceneIndex, scenes.length, isPlaying]);

  // Current active cue based on timestamp
  const activeCue = useMemo(() => {
    if (!currentScene?.timedCues || currentScene.timedCues.length === 0) return null;
    const pastCues = currentScene.timedCues.filter((c) => c.timeOffset <= currentTime);
    return pastCues.length > 0 ? pastCues[pastCues.length - 1] : currentScene.timedCues[0];
  }, [currentScene, currentTime]);

  const progressPercent = Math.min(100, Math.max(0, (currentTime / (sceneDuration || 1)) * 100));

  // Accent color mappings
  const accentColor = currentScene?.accentColor || 'indigo';
  const accentBgClass = {
    indigo: 'bg-indigo-600',
    cyan: 'bg-cyan-600',
    amber: 'bg-amber-500',
    rose: 'bg-rose-600',
    emerald: 'bg-emerald-600',
    purple: 'bg-purple-600',
  }[accentColor];

  const accentBorderClass = {
    indigo: 'border-indigo-500/40',
    cyan: 'border-cyan-500/40',
    amber: 'border-amber-500/40',
    rose: 'border-rose-500/40',
    emerald: 'border-emerald-500/40',
    purple: 'border-purple-500/40',
  }[accentColor];

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-3xl overflow-hidden bg-[#0A0D18] border border-slate-800 shadow-2xl transition-all ${
        isFullscreen ? 'h-screen w-screen rounded-none border-none' : 'w-full'
      }`}
    >
      {/* Top Video Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#0F1424]/90 backdrop-blur-md border-b border-slate-800/80 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Scene {activeSceneIndex + 1}/{scenes.length || 1}</span>
          </div>
          <span className="text-xs font-bold text-slate-300 truncate max-w-[200px] sm:max-w-md">
            {currentScene?.title || 'Interactive AI Masterclass'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onAskDoubtAboutScene && currentScene && (
            <button
              onClick={() => onAskDoubtAboutScene(currentScene, currentTime)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold border border-indigo-500/30 transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI Tutor</span>
            </button>
          )}

          <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 text-[11px] font-mono text-slate-400 border border-slate-800">
            {formatTime(currentTime)} / {formatTime(sceneDuration)}
          </div>
        </div>
      </div>

      {/* Main Blackboard Canvas Area */}
      <div className="relative min-h-[380px] sm:min-h-[460px] p-6 sm:p-8 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#0A0D18] via-[#0F1426] to-[#0A0D18]">
        {/* Subtle Background Grid & Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        <div className={`absolute top-0 right-1/4 w-96 h-96 ${accentBgClass} opacity-10 blur-3xl pointer-events-none`} />

        {/* Scene Badge & Phase Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-indigo-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {currentScene?.phase?.replace(/_/g, ' ') || 'CLINICAL LECTURE'}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[10px] font-mono font-bold">
              HIGH YIELD
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <span>{currentScene?.type?.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* Dynamic Scene Content Renderers */}
        <div className="relative z-10 my-4 flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene?.id || activeSceneIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              {/* 1. FLOWCHART SCENE */}
              {currentScene?.type === 'CORE_MECHANISM_FLOWCHART' && currentScene.flowchart && (
                <div className="space-y-4">
                  <h4 className="text-center font-black text-sm sm:text-base text-cyan-300 tracking-wide">
                    {currentScene.flowchart.title}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {currentScene.flowchart.nodes.map((node: FlowchartNode, idx: number) => (
                      <div
                        key={node.id || idx}
                        className={`p-4 rounded-2xl bg-slate-900/90 border ${accentBorderClass} text-center space-y-1 shadow-lg backdrop-blur-sm transition-all hover:scale-[1.02]`}
                      >
                        <div className="w-6 h-6 mx-auto rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <div className="font-bold text-xs sm:text-sm text-slate-100">{node.label}</div>
                        {node.sublabel && (
                          <div className="text-[11px] text-slate-400 leading-tight">{node.sublabel}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {currentScene.flowchart.notes && (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 text-center font-medium">
                      💡 {currentScene.flowchart.notes}
                    </div>
                  )}
                </div>
              )}

              {/* 2. COMPARISON TABLE SCENE */}
              {currentScene?.type === 'CLINICAL_VIGNETTE_COMPARISON' && currentScene.comparison && (
                <div className="space-y-3">
                  <h4 className="text-center font-black text-sm sm:text-base text-amber-300 tracking-wide">
                    {currentScene.comparison.title}
                  </h4>
                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Feature</th>
                          <th className="p-3 text-indigo-300">{currentScene.comparison.entityAName}</th>
                          <th className="p-3 text-amber-300">{currentScene.comparison.entityBName}</th>
                          <th className="p-3 text-emerald-300">Board Differentiator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-200">
                        {currentScene.comparison.rows.map((row: ComparisonRow, rIdx: number) => (
                          <tr key={rIdx} className="hover:bg-slate-800/30">
                            <td className="p-3 font-semibold text-slate-400">{row.parameter}</td>
                            <td className="p-3">{row.entityA}</td>
                            <td className="p-3">{row.entityB}</td>
                            <td className="p-3 font-bold text-emerald-400">{row.highYieldDifferentiator}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. INTERACTIVE CHECKPOINT SCENE */}
              {currentScene?.type === 'INTERACTIVE_CHECKPOINT' && currentScene.checkpoint && (
                <div className="max-w-xl mx-auto space-y-4 p-5 rounded-3xl bg-slate-900/95 border border-indigo-500/40 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                    <FileQuestion className="w-4 h-4" />
                    <span>Quick Knowledge Checkpoint</span>
                  </div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-100 leading-snug">
                    {currentScene.checkpoint.question}
                  </h4>
                  <div className="space-y-2">
                    {currentScene.checkpoint.options.map((opt: string, optIdx: number) => {
                      const isSelected = userCheckpointAnswer === optIdx;
                      const isCorrect = optIdx === currentScene.checkpoint?.correctIndex;
                      let btnStyle = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700/80';

                      if (checkpointSubmitted) {
                        if (isCorrect) {
                          btnStyle = 'bg-emerald-950 border-emerald-600 text-emerald-200 font-bold';
                        } else if (isSelected && !isCorrect) {
                          btnStyle = 'bg-rose-950 border-rose-600 text-rose-200 line-through';
                        } else {
                          btnStyle = 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60';
                        }
                      } else if (isSelected) {
                        btnStyle = 'bg-indigo-600 border-indigo-400 text-white font-bold';
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={checkpointSubmitted}
                          onClick={() => setUserCheckpointAnswer(optIdx)}
                          className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {checkpointSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {!checkpointSubmitted && userCheckpointAnswer !== null && (
                    <button
                      onClick={() => setCheckpointSubmitted(true)}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                    >
                      Submit Answer
                    </button>
                  )}

                  {checkpointSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Explanation:</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{currentScene.checkpoint.explanation}</p>
                      {currentScene.checkpoint.pearl && (
                        <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-amber-300 font-semibold">
                          💡 {currentScene.checkpoint.pearl}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* 4. DEFAULT ROADMAP / ANATOMY / BOARD TRAPS / RECAP SCENES */}
              {currentScene?.type !== 'CORE_MECHANISM_FLOWCHART' &&
                currentScene?.type !== 'CLINICAL_VIGNETTE_COMPARISON' &&
                currentScene?.type !== 'INTERACTIVE_CHECKPOINT' && (
                  <div className="space-y-4 max-w-2xl mx-auto">
                    {/* Key High-Yield Bullets */}
                    <div className="space-y-2.5">
                      {currentScene?.keyBullets?.map((bullet: string, bIdx: number) => (
                        <motion.div
                          key={bIdx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: bIdx * 0.1 }}
                          className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-200 backdrop-blur-sm"
                        >
                          <div className={`w-5 h-5 rounded-full ${accentBgClass} text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                            {bIdx + 1}
                          </div>
                          <span className="leading-relaxed">{bullet}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* High-Yield Pearls or Exam Relevance Footer */}
                    {currentScene?.clinicalPearls && currentScene.clinicalPearls.length > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 font-medium space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-300">
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>High-Yield Exam Pearl</span>
                        </div>
                        <p>{currentScene.clinicalPearls[0]}</p>
                      </div>
                    )}
                  </div>
                )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Live Closed Caption / Speech Script Bar */}
        <div className="relative z-10 p-3.5 rounded-2xl bg-black/60 backdrop-blur-md border border-slate-800/80 text-xs text-slate-300 flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="flex-1 truncate">
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 block font-bold">
              AI Professor Narration
            </span>
            <p className="text-xs text-slate-200 line-clamp-1 italic font-serif">
              &quot;{activeCue?.text || currentScene?.narrationScript || 'Analyzing canonical medical board principles...'}&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Scrubbable Timeline Progress Bar */}
      <div className="relative w-full h-2 bg-slate-900 cursor-pointer group" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newPct = clickX / rect.width;
        setCurrentTime(newPct * sceneDuration);
      }}>
        <div
          className={`h-full ${accentBgClass} transition-all relative`}
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md scale-0 group-hover:scale-100 transition-transform" />
        </div>

        {/* Scene Jump Markers */}
        <div className="absolute inset-0 flex justify-between pointer-events-none px-1">
          {scenes.map((_, sIdx) => (
            <div
              key={sIdx}
              className={`w-0.5 h-full ${sIdx <= activeSceneIndex ? 'bg-white/40' : 'bg-slate-700/60'}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Master Playback Control Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0F1424] border-t border-slate-800 z-20">
        {/* Left: Previous / Play / Next Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => activeSceneIndex > 0 && onSceneChange(activeSceneIndex - 1)}
            disabled={activeSceneIndex === 0}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-all cursor-pointer"
            title="Previous Scene (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
          </button>

          <button
            onClick={() => activeSceneIndex < scenes.length - 1 && onSceneChange(activeSceneIndex + 1)}
            disabled={activeSceneIndex >= scenes.length - 1}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-all cursor-pointer"
            title="Next Scene (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleReplay}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            title="Replay Scene"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Scene Quick Picker Pills (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-1.5 max-w-sm overflow-x-auto scrollbar-none">
          {scenes.map((s, idx) => (
            <button
              key={s.id || idx}
              onClick={() => onSceneChange(idx)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                idx === activeSceneIndex
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Right: Audio, Speed & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            title={isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={cyclePlaybackRate}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-all cursor-pointer"
            title="Change Playback Speed"
          >
            {playbackRate}x
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
