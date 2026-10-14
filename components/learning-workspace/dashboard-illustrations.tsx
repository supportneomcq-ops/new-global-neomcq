'use client';

import React from 'react';

/**
 * High-fidelity vector illustration of a friendly student at a desk with laptop,
 * books, and the playful "Small Steps Big Results!" speech bubble, matching the reference images.
 */
export function StudentBannerIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`relative select-none flex items-end justify-center md:justify-end shrink-0 ${className}`}>
      {/* Floating Speech Bubble Badge */}
      <div className="absolute -top-2.5 right-2 sm:-top-3 sm:right-4 z-20 bg-white/95 dark:bg-slate-800/95 border border-violet-100 dark:border-violet-900/60 shadow-xs px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1 backdrop-blur-xs whitespace-nowrap pointer-events-none">
        <span>Small Steps Big Results!</span>
        <span>✨</span>
      </div>

      {/* 3D Student with Laptop Image Asset */}
      <img
        src="/assets/student-welcome-banner.webp"
        alt="Student studying with laptop"
        className="w-full h-auto object-contain object-bottom max-h-[145px] sm:max-h-[160px] md:max-h-[175px] drop-shadow-xs"
        loading="eager"
      />
    </div>
  );
}

/**
 * Concentric Target with Arrow hitting bullseye and golden sparkle stars,
 * matching the "Upcoming Target" card in the reference images.
 */
export function TargetGoalIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-w-[140px] drop-shadow-md"
      >
        <defs>
          <linearGradient id="targetRing1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>

          <linearGradient id="targetRing2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          <linearGradient id="targetBullseye" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4338CA" />
          </linearGradient>

          <linearGradient id="arrowShaft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>

        {/* Golden Sparkles */}
        {/* Sparkle 1 (Top Right) */}
        <path
          d="M135 30 L138 38 L146 41 L138 44 L135 52 L132 44 L124 41 L132 38 Z"
          fill="#F59E0B"
        />
        {/* Sparkle 2 (Bottom Left) */}
        <path
          d="M24 110 L26 116 L32 118 L26 120 L24 126 L22 120 L16 118 L22 116 Z"
          fill="#FBBF24"
        />
        {/* Sparkle 3 (Top Left small) */}
        <path
          d="M35 38 L36 42 L40 43 L36 44 L35 48 L34 44 L30 43 L34 42 Z"
          fill="#FCD34D"
        />

        {/* Isometric 3D Angled Target Board */}
        <g transform="translate(80, 80) rotate(-18) scale(1, 0.95)">
          {/* Outer Ring Shadow/Depth */}
          <circle cx="0" cy="5" r="58" fill="#312E81" opacity="0.3" />

          {/* Outer Ring 1 (Purple) */}
          <circle cx="0" cy="0" r="58" fill="url(#targetRing1)" />
          {/* Ring 2 (White/Light) */}
          <circle cx="0" cy="0" r="44" fill="url(#targetRing2)" />
          {/* Ring 3 (Purple) */}
          <circle cx="0" cy="0" r="30" fill="url(#targetRing1)" />
          {/* Ring 4 (White) */}
          <circle cx="0" cy="0" r="18" fill="url(#targetRing2)" />
          {/* Center Bullseye */}
          <circle cx="0" cy="0" r="8" fill="url(#targetBullseye)" />

          {/* Bullseye Center Dot */}
          <circle cx="0" cy="0" r="3" fill="#FFFFFF" />

          {/* Arrow Hitting the Target Center */}
          <g transform="translate(0, 0) rotate(45)">
            {/* Arrow Shaft */}
            <line x1="0" y1="0" x2="0" y2="-62" stroke="url(#arrowShaft)" strokeWidth="4" strokeLinecap="round" />
            {/* Arrow Feathers/Fletching */}
            <path d="M0 -62 L-9 -75 L0 -71 L9 -75 Z" fill="#EF4444" />
            <path d="M0 -54 L-7 -64 L0 -61 L7 -64 Z" fill="#F87171" />
            {/* Arrow Point hitting center */}
            <circle cx="0" cy="0" r="4" fill="#E2E8F0" />
          </g>
        </g>
      </svg>
    </div>
  );
}
