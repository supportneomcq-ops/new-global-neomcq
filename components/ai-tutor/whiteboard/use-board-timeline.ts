'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TutorScene, BoardAction, TutorVoiceMetadata } from '@/lib/types/ai-tutor-architecture';

export type PresenterState =
  | 'idle'
  | 'speaking'
  | 'pointing'
  | 'writing'
  | 'emphasizing'
  | 'thinking'
  | 'celebrating';

interface UseBoardTimelineOptions {
  scene: TutorScene | null;
  voiceMetadata?: TutorVoiceMetadata[];
  isPlaying: boolean;
  playbackRate?: number;
  isMuted?: boolean;
  onSceneEnd?: () => void;
}

export function useBoardTimeline({
  scene,
  voiceMetadata = [],
  isPlaying,
  playbackRate = 1.0,
  isMuted = false,
  onSceneEnd,
}: UseBoardTimelineOptions) {
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
  const [audioProvider, setAudioProvider] = useState<string>('Initializing');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCache = useRef<Map<string, string>>(new Map());

  // Detect user prefers-reduced-motion setting
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setIsReducedMotion(e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  const totalDurationMs = (scene?.durationSeconds || 30) * 1000;

  // Cleanup audio instance
  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.replaceWith(audioRef.current.cloneNode());
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Fetch or load audio for the current scene
  useEffect(() => {
    if (!scene) return;

    setElapsedTimeMs(0);
    cleanupAudio();

    // 1. Check if canonical voiceMetadata has an audioUrl for this scene
    const matchingVoice = voiceMetadata.find((v) => v.sceneId === scene.id);
    let resolvedUrl = matchingVoice?.audioUrl || audioCache.current.get(scene.id) || null;

    if (resolvedUrl) {
      setAudioProvider('Canonical Neural Audio');
      setVoiceNotice(null);
      setupAudioElement(resolvedUrl);
      return;
    }

    // 2. Fetch server TTS from /api/ai-tutor/tts endpoint
    if (scene.narrationScript && scene.narrationScript.trim()) {
      setIsAudioLoading(true);
      setVoiceNotice('Voice narration is being prepared...');

      fetch('/api/ai-tutor/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scene.narrationScript,
          voice: 'alloy',
          speed: playbackRate,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setIsAudioLoading(false);
          if (data.success && data.audioUrl) {
            audioCache.current.set(scene.id, data.audioUrl);
            setAudioProvider(data.provider || 'AI Natural Voice (Server)');
            setVoiceNotice(null);
            setupAudioElement(data.audioUrl);
          } else if (data.fallbackToWebSpeech) {
            setAudioProvider('Web Speech Synthesis');
            setVoiceNotice(null);
          } else {
            setAudioProvider('Board Animation Clock');
            setVoiceNotice('Voice narration is being prepared.');
          }
        })
        .catch(() => {
          setIsAudioLoading(false);
          setAudioProvider('Board Animation Clock');
          setVoiceNotice('Voice narration is being prepared.');
        });
    }

    function setupAudioElement(url: string) {
      try {
        const audio = new Audio(url);
        audio.playbackRate = playbackRate;
        audio.muted = isMuted;
        audioRef.current = audio;

        audio.ontimeupdate = () => {
          if (audioRef.current) {
            setElapsedTimeMs(Math.floor(audioRef.current.currentTime * 1000));
          }
        };

        audio.onended = () => {
          if (onSceneEnd) onSceneEnd();
        };

        audio.onerror = () => {
          setAudioProvider('Board Animation Clock');
          setVoiceNotice('Voice narration is being prepared.');
          audioRef.current = null;
        };

        if (isPlaying) {
          audio.play().catch(() => {
            // Autoplay restriction or gesture error fallback
          });
        }
      } catch {
        audioRef.current = null;
      }
    }

    return () => {
      cleanupAudio();
    };
  }, [scene?.id, scene?.sequenceNumber]);

  // Handle Play/Pause and PlaybackRate changes on Audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.muted = isMuted;

      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    } else if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (isPlaying && scene?.narrationScript && audioProvider.includes('Web Speech')) {
        if (!window.speechSynthesis.speaking) {
          const utterance = new SpeechSynthesisUtterance(scene.narrationScript);
          utterance.rate = playbackRate;
          utterance.volume = isMuted ? 0 : 1;
          utterance.onend = () => {
            if (onSceneEnd) onSceneEnd();
          };
          window.speechSynthesis.speak(utterance);
        } else if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } else if (!isPlaying) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
        }
      }
    }
  }, [isPlaying, playbackRate, isMuted, scene?.narrationScript, audioProvider, onSceneEnd]);

  // Main fallback tick loop when audio element is not active
  useEffect(() => {
    if (!isPlaying || !scene || audioRef.current) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const TICK_INTERVAL = 50; // 50ms tick for smooth progress
    const stepMs = TICK_INTERVAL * playbackRate;

    timerRef.current = setInterval(() => {
      setElapsedTimeMs((prev) => {
        const next = prev + stepMs;
        if (next >= totalDurationMs) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (onSceneEnd) onSceneEnd();
          return totalDurationMs;
        }
        return next;
      });
    }, TICK_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, scene, totalDurationMs, playbackRate, onSceneEnd]);

  // Filter actions that should be active/visible up to elapsedTimeMs
  const allActions: BoardAction[] = scene?.boardActions || [];

  const visibleActions = allActions.filter((act) => {
    if (isReducedMotion) return true; // Show all immediately for reduced motion
    return act.timeOffsetMs <= elapsedTimeMs;
  });

  // Calculate current active cue text from narration script or timed Cues
  const timedCues = scene?.timedCues || [];
  const currentCueObj = timedCues
    .slice()
    .reverse()
    .find((cue) => cue.timeOffsetMs <= elapsedTimeMs);

  const activeCue = currentCueObj ? currentCueObj.text : scene?.narrationScript || null;

  // Derive Presenter State dynamically from active actions & timeline
  const getPresenterState = (): PresenterState => {
    if (!isPlaying) return 'idle';

    if (scene?.phase === 'RECAP' && elapsedTimeMs > totalDurationMs * 0.8) {
      return 'celebrating';
    }

    const latestAction = visibleActions[visibleActions.length - 1];
    if (latestAction) {
      const actionAge = elapsedTimeMs - latestAction.timeOffsetMs;
      if (actionAge < 2500) {
        if (latestAction.type === 'WRITE' || latestAction.type === 'DRAW') {
          return 'writing';
        }
        if (latestAction.type === 'HIGHLIGHT' || latestAction.type === 'CIRCLE' || latestAction.type === 'ARROW') {
          return 'pointing';
        }
        if (latestAction.type === 'SHOW_IMAGE' || latestAction.type === 'SHOW_TABLE') {
          return 'emphasizing';
        }
      }
    }

    if (activeCue) return 'speaking';
    return 'thinking';
  };

  const seekToPercent = useCallback(
    (percent: number) => {
      const targetMs = Math.max(0, Math.min(totalDurationMs, (percent / 100) * totalDurationMs));
      setElapsedTimeMs(targetMs);
      if (audioRef.current) {
        audioRef.current.currentTime = targetMs / 1000;
      }
    },
    [totalDurationMs]
  );

  const replayScene = useCallback(() => {
    setElapsedTimeMs(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [isPlaying]);

  const progressPercent = totalDurationMs > 0 ? Math.min(100, (elapsedTimeMs / totalDurationMs) * 100) : 0;

  return {
    elapsedTimeMs,
    totalDurationMs,
    progressPercent,
    visibleActions,
    activeCue,
    presenterState: getPresenterState(),
    isReducedMotion,
    isAudioLoading,
    audioProvider,
    voiceNotice,
    seekToPercent,
    replayScene,
  };
}

