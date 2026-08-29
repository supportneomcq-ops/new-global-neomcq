'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Send,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Video,
  CheckCircle2,
  Clock,
} from 'lucide-react';

import { useSelection } from '@/lib/context/selection-context';
import { useTopicContent } from '@/lib/context/topic-content-context';
import { OnboardingData } from '@/components/onboarding-flow';

interface AiTutorWhiteboardViewProps {
  user: OnboardingData;
}

const DEFAULT_WHITEBOARD_PHASES = [
  {
    phase: 1,
    time: '0:00 - 3:15',
    title: '1. Mechanism & Cellular Pathophysiology',
    diagram: 'Coronary Artery Plaque Rupture → Acute Luminal Thrombosis',
    description:
      'Coronary atherosclerosis begins with chronic endothelial shear stress and subendothelial LDL deposition. Macrophages engulf oxidized LDL to form foam cells. When the fibrous cap undergoes matrix metalloproteinase degradation, the lipid core is exposed to circulating platelets, triggering immediate platelet aggregation (Gp IIb/IIIa activation) and occlusive fibrin thrombus formation.',
    badge: 'Cellular Pathology',
  },
  {
    phase: 2,
    time: '3:15 - 6:30',
    title: '2. Clinical Presentation & Hemodynamics',
    diagram: 'Substernal Pressure + Diaphoresis + S4 Gallop',
    description:
      'Acute transmural ischemia causes severe substernal crushing pain that is non-positional and unrelieved by nitroglycerin. Sympathetic activation drives diaphoresis and tachycardia. Decreased left ventricular compliance creates an audible S4 gallop at the apex.',
    badge: 'Clinical Examination',
  },
  {
    phase: 3,
    time: '6:30 - 9:45',
    title: '3. Diagnostic Triad & ECG Localization',
    diagram: 'Leads II, III, aVF ST Elevation + Reciprocal aVL Depression',
    description:
      'Transmural ischemia produces an epicardial injury current. Inferior STEMI manifests as >1 mm ST-segment elevation in leads II, III, and aVF with reciprocal ST depression in leads I and aVL. The culprit vessel is the Right Coronary Artery (RCA) in 85-90% of patients.',
    badge: 'Diagnostic Triad',
  },
  {
    phase: 4,
    time: '9:45 - 12:45',
    title: '4. First-Line Intervention & Board Traps',
    diagram: 'Primary PCI within 90 mins + DAPT + Avoid Nitrates in RV Infarct',
    description:
      'Immediate reperfusion is paramount: Primary Percutaneous Coronary Intervention (PCI) within 90 minutes door-to-balloon time. Medical therapy requires Dual Antiplatelet Therapy (Aspirin + P2Y12 inhibitor) and Heparin. Board Exam Trap: In right ventricular infarction (V4R ST elevation), nitrates cause profound hypotension by dropping preload.',
    badge: 'Board High Yield',
  },
];

export function AiTutorWhiteboardView({ user }: AiTutorWhiteboardViewProps) {
  const { selection } = useSelection();
  const { content } = useTopicContent();

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressSeconds, setProgressSeconds] = useState(45);
  const totalDurationSeconds = 765; // 12:45

  const phases =
    content?.whiteboard_phases && content.whiteboard_phases.length > 0
      ? content.whiteboard_phases.map((p, idx) => ({
          ...p,
          time: `${idx * 3}:${(idx * 15) % 60 < 10 ? '0' : ''}${(idx * 15) % 60} - ${(idx + 1) * 3}:00`,
        }))
      : DEFAULT_WHITEBOARD_PHASES;

  const activePhase = phases[currentStep] || phases[0];

  // Auto-play timer simulation for whiteboard video progression
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgressSeconds((prev) => {
          if (prev >= totalDurationSeconds) {
            setIsPlaying(false);
            return totalDurationSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  // Chat Log
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'tutor'; text: string }>>([
    {
      sender: 'tutor',
      text: `Hello ${user.firstName || 'Scholar'}! Welcome to the AI Video Lesson for ${
        selection.topic?.name || 'Coronary Artery Disease'
      }. Ask me any conceptual question regarding this whiteboard lecture!`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendPrompt = (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = `Great question! In ${
        selection.exam?.name || user.examName || 'USMLE / NEET PG'
      } question vignettes, examiners test reciprocal ECG changes. As shown at 6:30 in this video lesson, inferior STEMI produces reciprocal ST depression in lead aVL.`;

      if (text.toLowerCase().includes('trap') || text.toLowerCase().includes('wrong')) {
        reply = `Common Board Trap: As explained in Scene 4 of this lesson, avoid nitrates or diuretics in Right Ventricular Infarction because RV preload must be maintained with IV saline hydration.`;
      } else if (text.toLowerCase().includes('analogy')) {
        reply = `Visual Analogy: Think of the coronary artery as a garden hose. Plaque accumulation is mineral buildup inside the hose. Rupture causes an immediate ice block (clot), shutting off water to the grass downstream!`;
      }

      setMessages((prev) => [...prev, { sender: 'tutor', text: reply }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-amber-500" />
              <span>AI Tutor Video Lesson</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {selection.topic?.name || 'Coronary Artery Disease'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Synchronized whiteboard educational presentation with animated scene progression & narration.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>Duration: 12:45 • Updated Aug 29, 2026</span>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: AI Whiteboard Video Player */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-2xl space-y-5 relative overflow-hidden">
            {/* Whiteboard Top Navigation Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Scene {currentStep + 1} of {phases.length} • {activePhase.time}
                </span>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                {activePhase.badge}
              </span>
            </div>

            {/* Video Canvas / Whiteboard Screen */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-center space-y-4 min-h-[220px] flex flex-col justify-center items-center overflow-hidden group">
              {/* Subtle animated grid background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-25 pointer-events-none" />

              {/* Watermark */}
              <div className="absolute top-3 right-3 text-[10px] font-black uppercase text-slate-600 tracking-widest pointer-events-none">
                NeoMCQ Whiteboard OS
              </div>

              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 z-10">
                Whiteboard Visual Diagram
              </span>

              <div className="text-base sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-emerald-300 max-w-md z-10 leading-snug">
                {activePhase.diagram}
              </div>

              {/* Video Play Overlay */}
              {!isPlaying && (
                <button
                  type="button"
                  onClick={() => setIsPlaying(true)}
                  className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 hover:scale-105 text-white flex items-center justify-center shadow-xl shadow-indigo-600/40 transition-transform cursor-pointer z-20"
                >
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </button>
              )}
            </div>

            {/* Narration & Scene Script */}
            <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">{activePhase.title}</h3>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Audio Synced
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activePhase.description}
              </p>
            </div>

            {/* Video Controls Scrubber Bar */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {/* Progress Scrubber Bar */}
              <div
                className="w-full h-2 rounded-full bg-slate-800 cursor-pointer relative overflow-hidden"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = clickX / rect.width;
                  const newSecs = Math.floor(ratio * totalDurationSeconds);
                  setProgressSeconds(newSecs);
                  const stepIndex = Math.min(
                    phases.length - 1,
                    Math.floor(ratio * phases.length)
                  );
                  setCurrentStep(stepIndex);
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                  style={{ width: `${(progressSeconds / totalDurationSeconds) * 100}%` }}
                />
              </div>

              {/* Player Controls Row */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setProgressSeconds(0)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Replay from start"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                    <span>{formatTime(progressSeconds)} / {formatTime(totalDurationSeconds)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer"
                    title="Previous Scene"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-bold text-slate-300">
                    Scene {currentStep + 1}/{phases.length}
                  </span>
                  <button
                    type="button"
                    disabled={currentStep === phases.length - 1}
                    onClick={() => setCurrentStep((prev) => Math.min(phases.length - 1, prev + 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer"
                    title="Next Scene"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Interactive AI Mentor Chat */}
        <div className="lg:col-span-5 flex flex-col h-[560px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">AI Educational Assistant</h4>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Synced with Video Timestamp</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white ml-6 rounded-tr-none font-medium'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-6 rounded-tl-none border border-slate-200 dark:border-slate-700 leading-relaxed font-normal'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs flex items-center gap-1.5 w-fit">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>

          {/* High-Yield Quick Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <button
              type="button"
              onClick={() => handleSendPrompt('What are common board traps for this scene?')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              🎯 Board Traps?
            </button>
            <button
              type="button"
              onClick={() => handleSendPrompt('Give me a visual analogy for this concept.')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              💡 Visual Analogy?
            </button>
          </div>

          {/* Chat Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(inputText);
            }}
            className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question about this video lesson..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-600"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

