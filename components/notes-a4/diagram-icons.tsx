'use client';

import React from 'react';
import { HandDrawnDiagramType, BulletIconType } from '@/types/notes-a4.types';

export function HandwrittenBulletIcon({
  type = 'heart',
  color = 'red',
  className = 'w-5 h-5',
}: {
  type?: BulletIconType;
  color?: 'red' | 'purple' | 'amber' | 'emerald' | 'indigo' | 'sky' | 'rose';
  className?: string;
}) {
  switch (type) {
    case 'heart':
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${className} text-rose-600 fill-rose-500/80 stroke-rose-700 shrink-0 inline-block`}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5 2 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case 'star':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${className} text-amber-500 fill-amber-400/80 stroke-amber-600 shrink-0 inline-block`}
          strokeWidth="1.8"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case 'lightning':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${className} text-amber-500 fill-amber-300 stroke-amber-600 shrink-0 inline-block`}
          strokeWidth="1.8"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case 'target':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${className} text-rose-500 stroke-rose-600 shrink-0 inline-block`}
          fill="none"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      );
    case 'check':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${className} text-emerald-600 stroke-emerald-700 shrink-0 inline-block`}
          fill="none"
          strokeWidth="3"
        >
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

/**
 * Hand-drawn Diagrams styled after the reference medical notes
 */
export function HandDrawnDiagram({
  type,
  caption,
  sideText,
  className = '',
}: {
  type: HandDrawnDiagramType;
  caption?: string;
  sideText?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-1.5 rounded-xl select-none ${className}`}>
      {/* 1. Ice Pack Jar */}
      {type === 'ice_pack' && (
        <div className="flex items-center gap-2">
          <div className="relative w-14 h-16 sm:w-16 sm:h-18 flex items-center justify-center">
            <svg
              viewBox="0 0 100 110"
              className="w-full h-full text-slate-800 dark:text-slate-200 stroke-current fill-none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Jar lid */}
              <rect x="32" y="8" width="36" height="10" rx="3" fill="#cbd5e1" stroke="#334155" />
              {/* Jar body */}
              <path
                d="M32 18 C20 22, 14 30, 14 55 C14 85, 20 98, 50 98 C80 98, 86 85, 86 55 C86 30, 80 22, 68 18 Z"
                fill="#e0f2fe"
                fillOpacity="0.8"
                stroke="#0369a1"
              />
              {/* Snowflake inside jar */}
              <circle cx="50" cy="55" r="16" fill="#bae6fd" stroke="#0284c7" strokeWidth="1.5" />
              <path d="M50 43 L50 67 M38 55 L62 55 M42 47 L58 63 M58 47 L42 63" stroke="#0284c7" strokeWidth="2" />
            </svg>
          </div>
          <div className="font-kalam font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-tight">
            <div>ICE</div>
            <div>PACK</div>
          </div>
        </div>
      )}

      {/* 2. Purple Y-shaped Antibody */}
      {type === 'antibody' && (
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 80 80"
            className="w-14 h-14 sm:w-16 sm:h-16 text-purple-700 dark:text-purple-400 stroke-current fill-none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Antibody Stem (Fc region) */}
            <path d="M38 42 L38 72 M42 42 L42 72" />
            {/* Heavy & Light Arms (Fab regions) */}
            <path d="M38 42 L18 18 M34 46 L14 22" />
            <circle cx="16" cy="20" r="3.5" fill="#a855f7" stroke="#7e22ce" />
            <path d="M42 42 L62 18 M46 46 L66 22" />
            <circle cx="64" cy="20" r="3.5" fill="#a855f7" stroke="#7e22ce" />
            {/* Disulfide linkages */}
            <line x1="38" y1="54" x2="42" y2="54" strokeWidth="2" stroke="#a855f7" />
            <line x1="38" y1="64" x2="42" y2="64" strokeWidth="2" stroke="#a855f7" />
          </svg>
          <div className="font-kalam text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-300 leading-tight">
            <div>Anti-AChR</div>
            <div>Antibody</div>
          </div>
        </div>
      )}

      {/* 3. EMG Waveform */}
      {type === 'emg_wave' && (
        <div className="flex flex-col items-center">
          <div className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60">
            <svg
              viewBox="0 0 100 45"
              className="w-24 h-10 text-slate-800 dark:text-slate-100 stroke-current fill-none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 22 L20 22 L24 30 L28 6 L32 38 L36 14 L40 22 L55 22 L60 34 L65 4 L70 40 L75 18 L80 22 L96 22" />
            </svg>
          </div>
          <span className="font-kalam text-[11px] text-slate-700 dark:text-slate-300 font-bold mt-0.5">
            Single-Fiber EMG Jitter
          </span>
        </div>
      )}

      {/* 4. Chest / Lungs with Thymoma */}
      {type === 'chest_lungs' && (
        <div className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 90 90"
            className="w-16 h-16 text-slate-800 dark:text-slate-200 stroke-current fill-none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Trachea */}
            <path d="M45 10 L45 30 M41 16 L49 16 M41 22 L49 22" strokeWidth="2.5" />
            {/* Bronchi */}
            <path d="M45 30 L32 40 M45 30 L58 40" strokeWidth="2.5" />
            {/* Left & Right Lung lobes */}
            <path
              d="M30 35 C16 42, 12 60, 16 75 C20 82, 34 82, 38 72 C42 62, 40 45, 30 35 Z"
              fill="#ffe4e6"
              fillOpacity="0.8"
              stroke="#f43f5e"
              strokeWidth="2"
            />
            <path
              d="M60 35 C74 42, 78 60, 74 75 C70 82, 56 82, 52 72 C48 62, 50 45, 60 35 Z"
              fill="#ffe4e6"
              fillOpacity="0.8"
              stroke="#f43f5e"
              strokeWidth="2"
            />
            {/* Thymoma mass at anterior mediastinum */}
            <circle cx="45" cy="38" r="7" fill="#fb923c" stroke="#ea580c" strokeWidth="2" />
          </svg>
          <div className="font-kalam text-xs font-bold text-amber-900 dark:text-amber-300 leading-tight">
            <div>Mediastinum /</div>
            <div className="text-orange-600 dark:text-orange-400">Thymoma</div>
          </div>
        </div>
      )}

      {/* 5. IV Drip Bag + Scalpel */}
      {type === 'iv_drip' && (
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 50 70"
            className="w-10 h-14 text-sky-700 dark:text-sky-400 stroke-current fill-none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* IV Bag */}
            <path
              d="M15 10 C15 6, 35 6, 35 10 L38 18 L38 48 C38 54, 30 56, 25 56 C20 56, 12 54, 12 48 L12 18 Z"
              fill="#e0f2fe"
              stroke="#0284c7"
              strokeWidth="2"
            />
            <line x1="14" y1="30" x2="36" y2="30" strokeDasharray="3 2" stroke="#0284c7" />
            <rect x="22" y="56" width="6" height="8" rx="1" fill="#94a3b8" />
          </svg>
          {/* Scalpel Blade */}
          <svg
            viewBox="0 0 30 70"
            className="w-6 h-14 text-slate-700 dark:text-slate-300 stroke-current fill-none"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 60 L12 25 Q12 10 20 8 L20 25 Z" fill="#e2e8f0" stroke="#475569" />
            <line x1="12" y1="40" x2="12" y2="65" strokeWidth="3" stroke="#334155" />
          </svg>
        </div>
      )}

      {/* 6. Yellow Highlight Capsule: "Increases ACh at NMJ" */}
      {type === 'speech_bubble' && (
        <div className="flex items-center gap-1">
          <span className="font-kalam text-sm font-bold text-slate-600">➔</span>
          <div className="px-3 py-1 rounded-full bg-amber-200/90 dark:bg-amber-900/90 border-2 border-amber-400 dark:border-amber-600 font-kalam font-bold text-xs sm:text-sm text-amber-950 dark:text-amber-100 shadow-xs">
            {sideText || caption || 'Increases ACh at NMJ'}
          </div>
        </div>
      )}

      {/* 7. Sun / Moon Diurnal Variation */}
      {type === 'diurnal_sun_moon' && (
        <div className="flex items-center gap-2">
          {/* Sun */}
          <div className="flex flex-col items-center">
            <svg
              viewBox="0 0 40 40"
              className="w-8 h-8 text-amber-500 stroke-current fill-amber-400"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="20" cy="20" r="8" />
              <path d="M20 4 L20 8 M20 32 L20 36 M4 20 L8 20 M32 20 L36 20 M9 9 L12 12 M28 28 L31 31 M9 31 L12 28 M28 12 L31 9" />
            </svg>
            <span className="font-kalam text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Better Morning
            </span>
          </div>

          <span className="font-kalam font-bold text-slate-500 text-sm">➔</span>

          {/* Moon */}
          <div className="flex flex-col items-center">
            <svg
              viewBox="0 0 40 40"
              className="w-8 h-8 text-slate-700 dark:text-slate-300 stroke-current fill-slate-800 dark:fill-slate-200"
              strokeWidth="1.5"
            >
              <path d="M24 8 C16 8, 10 14, 10 22 C10 30, 16 36, 24 36 C18 34, 14 28, 14 22 C14 16, 18 10, 24 8 Z" />
              <circle cx="28" cy="14" r="1.5" fill="#f59e0b" />
              <circle cx="32" cy="22" r="1.5" fill="#f59e0b" />
            </svg>
            <span className="font-kalam text-[11px] sm:text-xs font-bold text-rose-700 dark:text-rose-300">
              Worse Evening
            </span>
          </div>
        </div>
      )}

      {/* 8. Thought / Speech Bubble for DTR */}
      {type === 'synapse_nmj' && (
        <div className="relative px-3 py-2 rounded-2xl bg-sky-50 dark:bg-sky-950/80 border-2 border-sky-400 dark:border-sky-600 text-sky-950 dark:text-sky-100 font-kalam font-bold text-xs sm:text-sm shadow-xs">
          DTRs are usually Normal
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-sky-50 dark:bg-sky-950 border-b-2 border-l-2 border-sky-400 dark:border-sky-600 rotate-45" />
        </div>
      )}

      {caption && (
        <span className="font-kalam text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1 text-center">
          {caption}
        </span>
      )}
    </div>
  );
}

/**
 * Top-left Pink Taped Post-it Note
 */
export function TopLeftTapedPostIt({
  text = 'High Yield',
  className = '',
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={`relative -rotate-6 select-none ${className}`}>
      {/* Blue washi tape across the top-left corner */}
      <div className="absolute -top-2.5 -left-3 w-10 h-5 bg-sky-400/80 border border-sky-500/60 rotate-[-25deg] shadow-xs backdrop-blur-xs z-20" />
      
      {/* Pink post-it note square */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 p-2 rounded-md bg-[#ffd6e0] dark:bg-rose-950 border border-rose-300 dark:border-rose-800 shadow-md flex flex-col items-center justify-center text-center font-kalam text-slate-900 dark:text-slate-100 relative z-10">
        <div className="text-xs">☆</div>
        <div className="font-bold text-xs sm:text-sm leading-tight text-rose-950 dark:text-rose-100">
          High<br />Yield
        </div>
      </div>
    </div>
  );
}

/**
 * Bottom-Right Yellow Ruled Sticky Note with Checklist
 */
export function BottomRightStickyKeyPoints({
  title = 'Key Points',
  items = ['Autoimmune', 'Fatigability', 'Fluctuating weakness', 'Normal DTR'],
  className = '',
}: {
  title?: string;
  items?: string[];
  className?: string;
}) {
  return (
    <div className={`relative rotate-2 select-none ${className}`}>
      {/* Top beige tape strip */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 h-4 bg-amber-300/80 border border-amber-400/60 shadow-xs z-20" />

      {/* Yellow sticky body */}
      <div className="w-44 sm:w-52 p-3 sm:p-4 rounded-md bg-[#fff4cc] dark:bg-amber-950 border border-amber-300 dark:border-amber-700 shadow-md font-kalam space-y-1.5 relative z-10">
        <div className="font-bold text-xs sm:text-sm text-amber-950 dark:text-amber-100 underline decoration-amber-600 decoration-1 text-center">
          {title}
        </div>
        <ul className="space-y-0.5 text-xs sm:text-sm text-amber-950 dark:text-amber-100">
          {items.map((pt, idx) => (
            <li key={idx} className="flex items-center gap-1.5">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓</span>
              <span>{pt}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
