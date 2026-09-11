'use client';

import React, { useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Subtitles,
  FastForward,
} from 'lucide-react';

interface TutorBoardControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentSceneIndex: number;
  totalScenes: number;
  onPreviousScene: () => void;
  onNextScene: () => void;
  progressPercent: number;
  onSeek: (percent: number) => void;
  playbackRate: number;
  onRateChange: (rate: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onReplayScene: () => void;
  showCaptions: boolean;
  onToggleCaptions: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  activeCue?: string | null;
}

export function TutorBoardControls({
  isPlaying,
  onTogglePlay,
  currentSceneIndex,
  totalScenes,
  onPreviousScene,
  onNextScene,
  progressPercent,
  onSeek,
  playbackRate,
  onRateChange,
  isMuted,
  onToggleMute,
  onReplayScene,
  showCaptions,
  onToggleCaptions,
  isFullscreen,
  onToggleFullscreen,
  activeCue,
}: TutorBoardControlsProps) {
  // Keyboard Shortcut Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing in inputs/textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPreviousScene();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNextScene();
      } else if (e.key === 'm') {
        e.preventDefault();
        onToggleMute();
      } else if (e.key === 'f') {
        e.preventDefault();
        onToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlay, onPreviousScene, onNextScene, onToggleMute, onToggleFullscreen]);

  const rates = [1.0, 1.25, 1.5, 2.0];

  return (
    <div className="w-full flex flex-col gap-2 p-3 sm:p-4 rounded-3xl bg-slate-900 dark:bg-[#0B0F19] text-white border border-slate-800 shadow-xl select-none">
      {/* 1. Live Caption Bar (if enabled) */}
      {showCaptions && activeCue && (
        <div className="px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs sm:text-sm font-medium text-center italic tracking-wide transition-all min-h-[42px] flex items-center justify-center">
          <span>"{activeCue}"</span>
        </div>
      )}

      {/* 2. Interactive Timeline Progress Bar */}
      <div className="relative w-full h-3 flex items-center group cursor-pointer my-1">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progressPercent}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          aria-label="Seek timeline position"
          className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
        />
        {/* Rail background */}
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {/* Thumb handle */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-indigo-600 transition-transform group-hover:scale-125 pointer-events-none"
          style={{ left: `calc(${progressPercent}% - 7px)` }}
        />
      </div>

      {/* 3. Main Control Buttons Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        {/* Left: Play/Pause, Replay, Scene Steppers */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Play / Pause */}
          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause lesson' : 'Play lesson'}
            className="w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center transition-all shadow-md focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Replay Scene */}
          <button
            onClick={onReplayScene}
            aria-label="Replay current scene"
            title="Replay Scene"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all focus:outline-hidden focus:ring-2 focus:ring-slate-500"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Previous Scene */}
          <button
            onClick={onPreviousScene}
            disabled={currentSceneIndex <= 0}
            aria-label="Previous scene"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-slate-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Scene Indicator */}
          <span className="text-xs font-mono font-bold text-slate-300 px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-700">
            Scene {currentSceneIndex + 1} / {totalScenes}
          </span>

          {/* Next Scene */}
          <button
            onClick={onNextScene}
            disabled={currentSceneIndex >= totalScenes - 1}
            aria-label="Next scene"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-slate-500"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Mute, Speed, Captions, Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Speed Selector */}
          <div className="flex items-center rounded-xl bg-slate-800 p-0.5 border border-slate-700">
            {rates.map((rate) => (
              <button
                key={rate}
                onClick={() => onRateChange(rate)}
                aria-label={`Set speed to ${rate}x`}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                  playbackRate === rate
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Mute / Unmute */}
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute narration' : 'Mute narration'}
            title={isMuted ? 'Unmute' : 'Mute'}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all focus:outline-hidden focus:ring-2 focus:ring-slate-500"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Toggle Captions */}
          <button
            onClick={onToggleCaptions}
            aria-label="Toggle transcript captions"
            title="Toggle Captions"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-400 ${
              showCaptions ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Subtitles className="w-4 h-4" />
          </button>

          {/* Toggle Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all focus:outline-hidden focus:ring-2 focus:ring-slate-500"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
