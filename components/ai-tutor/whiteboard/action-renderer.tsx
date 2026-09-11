'use client';

import React from 'react';
import { motion } from 'motion/react';
import type { BoardAction } from '@/lib/types/ai-tutor-architecture';

interface ActionRendererProps {
  action: BoardAction;
  isReducedMotion?: boolean;
}

export function ActionRenderer({ action, isReducedMotion = false }: ActionRendererProps) {
  const { type, text, color = '#0284c7', style } = action;

  // Resolve color token to hex/CSS color
  const resolveColor = (c?: string) => {
    if (!c) return '#0284c7';
    if (c.startsWith('#') || c.startsWith('rgb')) return c;
    switch (c.toLowerCase()) {
      case 'emerald':
      case 'green':
        return '#10b981';
      case 'indigo':
      case 'blue':
        return '#4f46e5';
      case 'cyan':
      case 'sky':
        return '#0284c7';
      case 'rose':
      case 'red':
        return '#e11d48';
      case 'amber':
      case 'yellow':
        return '#d97706';
      case 'purple':
        return '#7c3aed';
      default:
        return '#0284c7';
    }
  };

  const markerColor = resolveColor(color);

  // Handwritten font styling
  const handwrittenStyle: React.CSSProperties = {
    fontFamily: "'Caveat', 'Kalam', 'Patrick Hand', 'Comic Sans MS', cursive, sans-serif",
    fontSize: style?.fontSize ? `${style.fontSize}px` : '1.25rem',
    fontWeight: style?.fontWeight || '700',
    color: markerColor,
    lineHeight: 1.4,
  };

  switch (type) {
    case 'WRITE':
      return (
        <motion.div
          initial={isReducedMotion ? { opacity: 1 } : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: isReducedMotion ? 0.01 : 0.4 }}
          className="my-1.5 flex items-center gap-2"
        >
          {/* Handwritten text */}
          <span style={handwrittenStyle} className="tracking-wide select-none drop-shadow-xs">
            {text}
          </span>
        </motion.div>
      );

    case 'HIGHLIGHT':
      return (
        <span className="relative inline-block my-1 px-1">
          {/* Marker Highlight background strip */}
          <motion.span
            initial={isReducedMotion ? { width: '100%' } : { width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: isReducedMotion ? 0.01 : 0.5, ease: 'easeOut' }}
            className="absolute inset-0 rounded-sm -z-0 opacity-70"
            style={{ backgroundColor: `${markerColor}33` }}
          />
          <span style={handwrittenStyle} className="relative z-10">
            {text}
          </span>
        </span>
      );

    case 'UNDERLINE':
      return (
        <div className="relative inline-block my-1">
          <span style={handwrittenStyle}>{text}</span>
          {/* Animated Hand-drawn underline SVG */}
          <svg className="absolute left-0 -bottom-1.5 w-full h-3 overflow-visible pointer-events-none" viewBox="0 0 100 12" preserveAspectRatio="none">
            <motion.path
              d="M 2 6 Q 25 10 50 5 T 98 6"
              fill="none"
              stroke={markerColor}
              strokeWidth="3"
              strokeLinecap="round"
              initial={isReducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: isReducedMotion ? 0.01 : 0.6, ease: 'easeInOut' }}
            />
          </svg>
        </div>
      );

    case 'CIRCLE':
      return (
        <div className="relative inline-block p-2 my-1">
          <span style={handwrittenStyle}>{text}</span>
          {/* Hand-drawn Oval Circle SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            <motion.ellipse
              cx="50"
              cy="50"
              rx="46"
              ry="42"
              fill="none"
              stroke={markerColor}
              strokeWidth="2.5"
              strokeDasharray="4 2"
              initial={isReducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: isReducedMotion ? 0.01 : 0.7 }}
            />
          </svg>
        </div>
      );

    case 'ARROW':
      return (
        <div className="flex items-center gap-2 my-2 text-slate-800">
          <svg className="w-8 h-6 shrink-0" viewBox="0 0 40 20">
            <motion.path
              d="M 2 10 L 30 10 M 22 4 L 32 10 L 22 16"
              fill="none"
              stroke={markerColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={isReducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: isReducedMotion ? 0.01 : 0.5 }}
            />
          </svg>
          <span style={handwrittenStyle}>{text}</span>
        </div>
      );

    case 'DRAW':
      return (
        <motion.div
          initial={isReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: isReducedMotion ? 0.01 : 0.4 }}
          className="p-3 my-2 rounded-2xl border-2 border-dashed bg-slate-50/80 shadow-xs"
          style={{ borderColor: markerColor }}
        >
          <p style={handwrittenStyle} className="text-sm font-bold">
            {text}
          </p>
        </motion.div>
      );

    case 'SHOW_TABLE':
      return (
        <motion.div
          initial={isReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: isReducedMotion ? 0.01 : 0.5 }}
          className="my-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs max-w-full"
        >
          <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span>{text || 'High-Yield Comparison Table'}</span>
            <span className="text-[10px] text-slate-400 font-mono">NEOMCQ BOARD SUMMARY</span>
          </div>
        </motion.div>
      );

    case 'ERASE':
      return null;

    default:
      return (
        <div className="my-1">
          <span style={handwrittenStyle}>{text}</span>
        </div>
      );
  }
}
