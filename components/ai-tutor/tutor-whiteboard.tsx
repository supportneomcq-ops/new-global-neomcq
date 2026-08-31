'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Maximize2,
  X,
} from 'lucide-react';
import type { TutorSegment } from '@/lib/server/content-engine/tutor-types';
import type { EducationalMediaItem } from '@/lib/server/content-engine/types';

interface TutorWhiteboardProps {
  segment: TutorSegment | null;
  canonicalMedia?: EducationalMediaItem[];
  isGenerating?: boolean;
  onSegmentComplete?: () => void;
  examId?: string;
  subjectId?: string;
  topicId?: string;
  contentVersion?: number;
}

export function TutorWhiteboard({
  segment,
  canonicalMedia = [],
  isGenerating = false,
  onSegmentComplete,
  examId,
  subjectId,
  topicId,
  contentVersion = 1,
}: TutorWhiteboardProps) {
  // Typing animation state
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState<number>(30); // ms per character
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio / TTS state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<string>('Initializing');
  const [selectedImageModal, setSelectedImageModal] = useState<EducationalMediaItem | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const fullText = segment?.teachingText || '';

  // Filter media attached to this segment or canonical topic
  const attachedMedia = React.useMemo(() => {
    if (!segment) return [];
    if (segment.mediaReferenceIds && segment.mediaReferenceIds.length > 0) {
      const matched = canonicalMedia.filter((m) => segment.mediaReferenceIds?.includes(m.id));
      if (matched.length > 0) return matched;
    }
    // Fallback: match by segment index or title
    return canonicalMedia.slice(0, 2);
  }, [segment, canonicalMedia]);

  const activeImage = attachedMedia.find((m) => m.mediaType === 'image');
  const activeVideo = attachedMedia.find((m) => m.mediaType === 'video');

  // Stop previous speech/audio playback cleanly
  const stopAllPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  // Synchronized typing + TTS playback whenever segment changes
  useEffect(() => {
    stopAllPlayback();
    setDisplayedText('');

    if (!segment || !fullText) return;

    // Start progressive typing
    setIsTyping(true);
    let charIndex = 0;

    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    typingTimerRef.current = setInterval(() => {
      charIndex++;
      setDisplayedText(fullText.slice(0, charIndex));

      if (charIndex >= fullText.length) {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        setIsTyping(false);
        if (onSegmentComplete) onSegmentComplete();
      }
    }, typingSpeed);

    // Request server TTS audio
    fetchTtsAudio(fullText);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      stopAllPlayback();
    };
  }, [segment?.sequence, segment?.phase, fullText]);

  // Request server TTS audio or fallback to Web Speech API
  const fetchTtsAudio = async (textToSpeak: string) => {
    try {
      const res = await fetch('/api/ai-tutor/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          examId,
          subjectId,
          topicId,
          contentVersion,
        }),
      });

      const data = await res.json();
      setTtsProvider(data.provider || 'Server TTS');

      if (data.success && data.audioUrl && !data.fallbackToWebSpeech) {
        // Play server audio
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        audio.muted = isMuted;

        audio.onended = () => {
          setIsPlayingAudio(false);
        };
        audio.onerror = () => {
          fallbackWebSpeech(textToSpeak);
        };

        audio.play().then(() => setIsPlayingAudio(true)).catch(() => {
          fallbackWebSpeech(textToSpeak);
        });
      } else {
        // Fallback to Web Speech API synthesis
        fallbackWebSpeech(textToSpeak);
      }
    } catch {
      fallbackWebSpeech(textToSpeak);
    }
  };

  const fallbackWebSpeech = (textToSpeak: string) => {
    setTtsProvider('Web Speech API (Browser Fallback)');
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    speechSynthRef.current = utterance;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    if (!isMuted) {
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  // Toggle Play / Pause Audio & Typing
  const handleTogglePlayPause = () => {
    if (isPlayingAudio) {
      stopAllPlayback();
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setIsTyping(false);
    } else {
      // Resume typing if incomplete
      if (displayedText.length < fullText.length) {
        setIsTyping(true);
        let charIndex = displayedText.length;
        typingTimerRef.current = setInterval(() => {
          charIndex++;
          setDisplayedText(fullText.slice(0, charIndex));
          if (charIndex >= fullText.length) {
            if (typingTimerRef.current) clearInterval(typingTimerRef.current);
            setIsTyping(false);
          }
        }, typingSpeed);
      }
      // Speak text
      fetchTtsAudio(fullText.slice(displayedText.length || 0));
    }
  };

  // Toggle Mute / Unmute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioRef.current) {
      audioRef.current.muted = nextMute;
    }
    if (nextMute && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
    } else if (!nextMute && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  };

  // Skip typing animation to show complete text instantly
  const handleSkipTyping = () => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setDisplayedText(fullText);
    setIsTyping(false);
  };

  // Replay segment from start
  const handleReplay = () => {
    stopAllPlayback();
    setDisplayedText('');
    setIsTyping(true);
    let charIndex = 0;
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    typingTimerRef.current = setInterval(() => {
      charIndex++;
      setDisplayedText(fullText.slice(0, charIndex));
      if (charIndex >= fullText.length) {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        setIsTyping(false);
      }
    }, typingSpeed);

    fetchTtsAudio(fullText);
  };

  if (isGenerating) {
    return (
      <div className="p-8 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-2xl space-y-6 min-h-[420px] flex flex-col justify-center items-center text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <Sparkles className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">Generating AI Tutor Sequence...</h3>
          <p className="text-xs text-slate-400 max-w-md">
            Synthesizing teaching segment grounded strictly in canonical notes context with zero duplicate content.
          </p>
        </div>
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="p-8 rounded-3xl bg-slate-950 text-white border border-slate-800 min-h-[380px] flex flex-col justify-center items-center text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-600" />
        <p className="text-sm text-slate-400">No active tutor segment available. Click Start to begin.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5 relative overflow-hidden">
      {/* Subtle Grid Watermark */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20 pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${isTyping || isPlayingAudio ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'}`} />
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
            Sequence {segment.sequence} • {segment.phase}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
            {segment.title}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
            {ttsProvider}
          </span>
        </div>
      </div>

      {/* Main Whiteboard Display Area (Auto-wrapping text & media layout) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[280px]">
        {/* Teaching Text Canvas (Auto-wrapping, progressive typing) */}
        <div className={`${activeImage || activeVideo ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xs min-h-[220px] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>{segment.title}</span>
                {isTyping && (
                  <span className="text-[11px] text-amber-400 font-normal animate-pulse flex items-center gap-1">
                    Writing...
                  </span>
                )}
              </h3>

              {/* Progressively Typed Teaching Text (Auto-wrapped, no overflow) */}
              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap break-words max-h-[360px] overflow-y-auto pr-2">
                {displayedText}
                {isTyping && <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />}
              </div>
            </div>

            {/* Key Points Badges */}
            {segment.keyPoints && segment.keyPoints.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                {segment.keyPoints.map((kp, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 text-[11px] font-medium"
                  >
                    • {kp}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Existing Educational Media Side Panel (Images & Videos) */}
        {(activeImage || activeVideo) && (
          <div className="lg:col-span-5 space-y-3">
            {/* Active Educational Image */}
            {activeImage && (
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 relative group">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <ImageIcon className="w-3.5 h-3.5" /> Canonical Reference Plate
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedImageModal(activeImage)}
                    className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                    title="Expand image"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 max-h-[160px] flex items-center justify-center">
                  <img
                    src={activeImage.previewUrl || activeImage.sourceUrl}
                    alt={activeImage.title}
                    className="object-cover w-full h-full max-h-[160px]"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <p className="text-[11px] font-semibold text-slate-200 line-clamp-1">{activeImage.title}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2">{activeImage.attribution}</p>
              </div>
            )}

            {/* Active Educational Video Reference (Browser Controls, No Autoplay Sound) */}
            {activeVideo && (
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <VideoIcon className="w-3.5 h-3.5" /> Educational Video Reference
                  </span>
                  <span className="text-[10px] text-slate-400">{activeVideo.duration || 'Lecture'}</span>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video border border-slate-800">
                  {activeVideo.embedUrl ? (
                    <iframe
                      src={`${activeVideo.embedUrl}?autoplay=0&mute=1&controls=1`}
                      title={activeVideo.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <a
                      href={activeVideo.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-full flex flex-col items-center justify-center p-4 text-center hover:bg-slate-900 transition-colors"
                    >
                      <ExternalLink className="w-6 h-6 text-indigo-400 mb-1" />
                      <span className="text-xs font-bold text-slate-200">Watch Lecture Reference</span>
                    </a>
                  )}
                </div>

                <p className="text-[11px] font-semibold text-slate-200 line-clamp-1">{activeVideo.title}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clinical Correlation / Exam Relevance Bar */}
      {(segment.examRelevance || segment.clinicalCorrelation) && (
        <div className="relative z-10 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          {segment.examRelevance && (
            <div className="flex items-center gap-2 text-indigo-200">
              <span className="px-2 py-0.5 rounded bg-indigo-900/80 font-bold text-[10px] uppercase tracking-wider text-indigo-300">
                Exam Focus
              </span>
              <span>{segment.examRelevance}</span>
            </div>
          )}
          {segment.clinicalCorrelation && (
            <div className="flex items-center gap-2 text-emerald-200">
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 font-bold text-[10px] uppercase tracking-wider text-emerald-300">
                Clinical Correlation
              </span>
              <span>{segment.clinicalCorrelation}</span>
            </div>
          )}
        </div>
      )}

      {/* Synchronized Player Controls Scrubber Bar */}
      <div className="relative z-10 space-y-3 pt-3 border-t border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main Playback Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlayPause}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-md shadow-indigo-600/30"
            >
              {isPlayingAudio || isTyping ? (
                <>
                  <Pause className="w-4 h-4 fill-white" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" /> Speak & Write
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReplay}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Replay segment"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute TTS' : 'Mute TTS'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
            </button>

            {isTyping && (
              <button
                type="button"
                onClick={handleSkipTyping}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <FastForward className="w-3.5 h-3.5" /> Skip Typing
              </button>
            )}
          </div>

          {/* Typing Speed Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-[11px]">Speed:</span>
            {[
              { label: '1x', speed: 30 },
              { label: '1.5x', speed: 20 },
              { label: '2x', speed: 10 },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setTypingSpeed(s.speed)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  typingSpeed === s.speed
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Image Modal Preview */}
      {selectedImageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-4 relative">
            <button
              type="button"
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white pr-8">{selectedImageModal.title}</h3>
            <div className="max-h-[60vh] overflow-hidden rounded-2xl bg-black flex items-center justify-center">
              <img
                src={selectedImageModal.sourceUrl}
                alt={selectedImageModal.title}
                className="max-h-[60vh] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-xs text-slate-300">{selectedImageModal.description}</p>
            <p className="text-[11px] text-slate-400">{selectedImageModal.attribution}</p>
          </div>
        </div>
      )}
    </div>
  );
}
