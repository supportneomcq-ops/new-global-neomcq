'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Send,
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
    title: '1. Mechanism & Cellular Pathophysiology',
    diagram: 'Coronary Artery Plaque Rupture → Acute Luminal Thrombosis',
    description: 'Coronary atherosclerosis begins with chronic endothelial shear stress and subendothelial LDL deposition. Macrophages engulf oxidized LDL to form foam cells. When the fibrous cap undergoes matrix metalloproteinase degradation, the lipid core is exposed to circulating platelets, triggering immediate platelet aggregation (Gp IIb/IIIa activation) and occlusive fibrin thrombus formation.',
    badge: 'Cellular Pathology',
  },
  {
    phase: 2,
    title: '2. Clinical Presentation & Hemodynamics',
    diagram: 'Substernal Pressure + Diaphoresis + S4 Gallop',
    description: 'Acute transmural ischemia causes severe substernal crushing pain that is non-positional and unrelieved by nitroglycerin. Sympathetic activation drives diaphoresis and tachycardia. Decreased left ventricular compliance creates an audible S4 gallop at the apex.',
    badge: 'Clinical Examination',
  },
  {
    phase: 3,
    title: '3. Diagnostic Triad & ECG Localization',
    diagram: 'Leads II, III, aVF ST Elevation + Reciprocal aVL Depression',
    description: 'Transmural ischemia produces an epicardial injury current. Inferior STEMI manifests as >1 mm ST-segment elevation in leads II, III, and aVF with reciprocal ST depression in leads I and aVL. The culprit vessel is the Right Coronary Artery (RCA) in 85-90% of patients.',
    badge: 'Diagnostic Triad',
  },
  {
    phase: 4,
    title: '4. First-Line Intervention & Board Traps',
    diagram: 'Primary PCI within 90 mins + DAPT + Avoid Nitrates in RV Infarct',
    description: 'Immediate reperfusion is paramount: Primary Percutaneous Coronary Intervention (PCI) within 90 minutes door-to-balloon time. Medical therapy requires Dual Antiplatelet Therapy (Aspirin + P2Y12 inhibitor) and Heparin. Board Exam Trap: In right ventricular infarction (V4R ST elevation), nitrates cause profound hypotension by dropping preload.',
    badge: 'Board High Yield',
  },
];

export function AiTutorWhiteboardView({ user }: AiTutorWhiteboardViewProps) {
  const { selection } = useSelection();
  const { content } = useTopicContent();

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const phases =
    content?.whiteboard_phases && content.whiteboard_phases.length > 0
      ? content.whiteboard_phases
      : DEFAULT_WHITEBOARD_PHASES;

  const activePhase = phases[currentStep] || phases[0];

  // Chat Log
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'tutor'; text: string }>>([
    {
      sender: 'tutor',
      text: `Hello ${user.firstName || 'Scholar'}! I am your AI Board Tutor for ${selection.exam?.name || user.examName}. Ask me any conceptual doubt or clinical dilemma regarding ${selection.topic?.name || 'this topic'}!`,
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
      let reply = `Great question! In ${selection.exam?.name || user.examName} question vignettes, examiners frequently test the distinction between acute transmural ischemia and subendocardial ischemia. Always look for reciprocal changes on the 12-lead ECG, as they confirm true STEMI rather than benign repolarization.`;

      if (text.includes('wrong') || text.includes('trap')) {
        reply = `Common Board Trap: Beware of administering beta-blockers or nitrates if the patient exhibits signs of acute heart failure with pulmonary congestion, bradycardia, or right ventricular involvement. In RV infarct, preload must be preserved with aggressive intravenous isotonic fluid hydration.`;
      } else if (text.includes('analogy')) {
        reply = `Think of the coronary artery as a pressurized water pipe: Atherosclerosis is the rust inside. Plaque rupture is like the rust breaking loose and forming an instant plug. The heart muscle downstream is like a lawn drying up—every minute without water causes irreversible cell death!`;
      }

      setMessages((prev) => [...prev, { sender: 'tutor', text: reply }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Synaptic Whiteboard & AI Mentor</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {selection.topic?.name || 'Coronary Artery Disease'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Step-by-step visual concept breakdown and interactive clinical reasoning dialogue.
          </p>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Synaptic Whiteboard */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
            {/* Whiteboard Top Navigation */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Synaptic Canvas • Step {currentStep + 1} of {phases.length}
                </span>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                {activePhase.badge}
              </span>
            </div>

            {/* Visual Canvas Box */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-3 min-h-[160px] flex flex-col justify-center items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Visual Concept Diagram
              </span>
              <div className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-emerald-300 max-w-md">
                {activePhase.diagram}
              </div>
            </div>

            {/* Phase Description */}
            <div className="space-y-2">
              <h3 className="font-bold text-base text-white">{activePhase.title}</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {activePhase.description}
              </p>
            </div>

            {/* Stepper Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Phase
              </button>

              {/* Step indicator dots */}
              <div className="flex items-center gap-2">
                {phases.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                      currentStep === idx ? 'bg-indigo-400 scale-125' : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                    title={`Go to Phase ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                disabled={currentStep === phases.length - 1}
                onClick={() => setCurrentStep((prev) => Math.min(phases.length - 1, prev + 1))}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                Next Phase <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Clinical Dialogue Chat */}
        <div className="lg:col-span-5 flex flex-col h-[520px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">AI Clinical Mentor</h4>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Online & Ready</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white ml-6 rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-6 rounded-tl-none border border-slate-200 dark:border-slate-700 leading-relaxed'
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

          {/* High-Yield Doubt Quick Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <button
              type="button"
              onClick={() => handleSendPrompt('What are the common board traps for this topic?')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              🎯 Board Traps?
            </button>
            <button
              type="button"
              onClick={() => handleSendPrompt('Explain this concept with an easy clinical analogy.')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              💡 Analogy?
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
              placeholder="Ask a doubt or clinical reasoning question..."
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
