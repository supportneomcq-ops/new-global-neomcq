'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Lightbulb,
  HelpCircle,
  Award,
  PenTool,
  Volume2,
  CheckCircle2,
  Bot,
} from 'lucide-react';
import type { PresenterState } from './use-board-timeline';

interface TutorPresenterAvatarProps {
  state: PresenterState;
  compact?: boolean;
  className?: string;
  presenterName?: string;
}

export function TutorPresenterAvatar({
  state,
  compact = false,
  className = '',
  presenterName = 'Prof. Neo (AI)',
}: TutorPresenterAvatarProps) {
  // Label and badge mapping per state
  const stateBadgeInfo: Record<PresenterState, { label: string; color: string; icon: React.ReactNode }> = {
    idle: { label: 'Ready', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <Bot className="w-3 h-3" /> },
    speaking: { label: 'Explaining', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <Volume2 className="w-3 h-3 animate-pulse" /> },
    pointing: { label: 'Pointing', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: <Sparkles className="w-3 h-3" /> },
    writing: { label: 'Writing', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <PenTool className="w-3 h-3 animate-bounce" /> },
    emphasizing: { label: 'High Yield', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Lightbulb className="w-3 h-3" /> },
    thinking: { label: 'Analyzing', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <HelpCircle className="w-3 h-3" /> },
    celebrating: { label: 'Key Mastery', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: <Award className="w-3 h-3" /> },
  };

  const badge = stateBadgeInfo[state] || stateBadgeInfo.idle;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-2xl bg-white/90 border border-slate-200 shadow-sm backdrop-blur-sm ${className}`}>
        {/* Compact Vector Icon Avatar */}
        <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Bot className="w-5 h-5" />
          <motion.div
            animate={{
              scale: state === 'speaking' ? [1, 1.2, 1] : 1,
            }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-slate-800 truncate">{presenterName}</div>
          <div className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${badge.color}`}>
            {badge.icon}
            <span>{badge.label}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-3xl bg-slate-50/80 border border-slate-200/80 shadow-sm relative overflow-hidden ${className}`}>
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/40 via-white/20 to-transparent pointer-events-none" />

      {/* State Badge Pill */}
      <div className="z-10 mb-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs transition-all ${badge.color}`}>
          {badge.icon}
          <span>{badge.label}</span>
        </span>
      </div>

      {/* Vector AI Tutor Graphic Canvas */}
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center my-1">
        <motion.div
          animate={{
            y: state === 'speaking' ? [0, -3, 0] : [0, -5, 0],
            rotate: state === 'pointing' ? [0, 2, 0] : [0, -1, 0],
          }}
          transition={{ repeat: Infinity, duration: state === 'speaking' ? 0.6 : 3, ease: 'easeInOut' }}
          className="relative w-full h-full flex items-center justify-center"
        >
          {/* Vector Presenter Character SVG */}
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#3730a3" />
              </linearGradient>
              <linearGradient id="headGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f1f5f9" />
              </linearGradient>
              <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Aura Shadow */}
            <ellipse cx="100" cy="180" rx="45" ry="10" fill="#cbd5e1" opacity="0.6" />

            {/* Academic Graduation Cap */}
            <path d="M 100 25 L 145 42 L 100 58 L 55 42 Z" fill="#1e1b4b" />
            <polygon points="100,28 140,42 100,55 60,42" fill="#312e81" />
            <path d="M 140 42 L 140 62" stroke="#f59e0b" strokeWidth="2.5" />
            <circle cx="140" cy="64" r="3.5" fill="#f59e0b" />

            {/* Head Contour */}
            <rect x="62" y="52" width="76" height="64" rx="28" fill="url(#headGrad)" stroke="#cbd5e1" strokeWidth="3" />

            {/* Digital Visor / Eye Display */}
            <rect x="70" y="66" width="60" height="32" rx="14" fill="url(#visorGrad)" stroke="#0284c7" strokeWidth="2" />

            {/* Eyes Animation based on state */}
            {state === 'thinking' ? (
              <g fill="#38bdf8" filter="url(#glow)">
                <circle cx="86" cy="80" r="4" />
                <circle cx="114" cy="80" r="4" />
                <path d="M 80 74 Q 86 70 92 74" stroke="#38bdf8" strokeWidth="2" fill="none" />
              </g>
            ) : state === 'celebrating' ? (
              <g stroke="#38bdf8" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#glow)">
                <path d="M 80 84 Q 86 76 92 84" />
                <path d="M 108 84 Q 114 76 120 84" />
              </g>
            ) : (
              <g fill="#38bdf8" filter="url(#glow)">
                <ellipse cx="86" cy="82" rx="4" ry="5" />
                <ellipse cx="114" cy="82" rx="4" ry="5" />
                <circle cx="88" cy="80" r="1.5" fill="#ffffff" />
                <circle cx="116" cy="80" r="1.5" fill="#ffffff" />
              </g>
            )}

            {/* Mouth Animation */}
            {state === 'speaking' ? (
              <path d="M 92 92 Q 100 100 108 92 Z" fill="#38bdf8" />
            ) : state === 'celebrating' ? (
              <path d="M 90 90 Q 100 102 110 90" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M 94 92 L 106 92" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
            )}

            {/* Torso / Lab Coat */}
            <path d="M 60 120 Q 100 114 140 120 L 150 175 L 50 175 Z" fill="url(#bodyGrad)" />
            {/* White Lapel */}
            <path d="M 82 120 L 100 150 L 118 120 Z" fill="#ffffff" />
            <path d="M 100 150 L 100 175" stroke="#cbd5e1" strokeWidth="2" />

            {/* NeoMCQ Badge */}
            <rect x="72" y="136" width="16" height="10" rx="2" fill="#0284c7" />
            <circle cx="80" cy="141" r="2" fill="#ffffff" />

            {/* Arm States (Pointing, Writing, Emphasizing, Celebrating) */}
            {state === 'pointing' && (
              <g stroke="#4f46e5" strokeWidth="8" strokeLinecap="round">
                <path d="M 140 135 Q 165 110 180 90" stroke="#4f46e5" />
                <circle cx="182" cy="88" r="5" fill="#0284c7" />
              </g>
            )}

            {state === 'writing' && (
              <g>
                <path d="M 140 135 L 170 120" stroke="#4f46e5" strokeWidth="8" strokeLinecap="round" />
                <rect x="168" y="112" width="16" height="6" rx="1" fill="#10b981" transform="rotate(-20 168 112)" />
              </g>
            )}

            {state === 'celebrating' && (
              <g stroke="#4f46e5" strokeWidth="8" strokeLinecap="round">
                <path d="M 58 135 L 35 95" />
                <path d="M 142 135 L 165 95" />
              </g>
            )}
          </svg>
        </motion.div>

        {/* Floating Accents per State */}
        <AnimatePresence>
          {state === 'writing' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-emerald-500 text-white shadow-md"
            >
              <PenTool className="w-4 h-4" />
            </motion.div>
          )}

          {state === 'emphasizing' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: -5 }}
              exit={{ opacity: 0 }}
              className="absolute -top-1 p-2 rounded-full bg-amber-400 text-amber-950 shadow-lg border-2 border-white"
            >
              <Lightbulb className="w-5 h-5 animate-pulse" />
            </motion.div>
          )}

          {state === 'celebrating' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: 1, scale: 1.1 }}
              exit={{ opacity: 0 }}
              className="absolute -top-2 p-2 rounded-full bg-rose-500 text-white shadow-lg border-2 border-white"
            >
              <Award className="w-5 h-5 animate-bounce" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Presenter Name & Role */}
      <div className="text-center z-10 mt-1">
        <p className="text-xs font-black text-slate-800 tracking-tight">{presenterName}</p>
        <p className="text-[10px] font-semibold text-slate-500">Board Exam Specialist</p>
      </div>
    </div>
  );
}
