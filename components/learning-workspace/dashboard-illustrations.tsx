'use client';

import React from 'react';

/**
 * High-fidelity vector illustration of a friendly student at a desk with laptop,
 * books, and the playful "Small Steps Big Results!" speech bubble, matching the reference images.
 */
export function StudentBannerIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`relative select-none flex items-end justify-center ${className}`}>
      {/* Speech bubble: "Small Steps Big Results!" */}
      <div className="absolute -top-3 sm:-top-5 right-2 sm:right-6 z-20 animate-bounce-subtle pointer-events-none">
        <div className="relative bg-white/95 dark:bg-slate-800/95 shadow-md border border-indigo-100 dark:border-indigo-900/60 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 transform rotate-2">
          <span className="font-heading font-extrabold text-[11px] sm:text-xs text-indigo-700 dark:text-indigo-300 tracking-tight block leading-tight">
            Small Steps
          </span>
          <span className="font-heading font-black text-xs sm:text-sm text-indigo-900 dark:text-white tracking-tight block leading-tight">
            Big Results! ✨
          </span>
          {/* Speech bubble tail pointer */}
          <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white/95 dark:bg-slate-800/95 border-b border-r border-indigo-100 dark:border-indigo-900/60 transform rotate-45" />
        </div>
      </div>

      <svg
        viewBox="0 0 320 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[220px] drop-shadow-lg"
      >
        <defs>
          <linearGradient id="hoodieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="60%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>

          <linearGradient id="laptopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FBD5B5" />
            <stop offset="100%" stopColor="#F5B98A" />
          </linearGradient>

          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#37271E" />
            <stop offset="100%" stopColor="#1E1713" />
          </linearGradient>

          <linearGradient id="deskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#CBD5E1" />
            <stop offset="50%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>

          <linearGradient id="book1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>

          <linearGradient id="book2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          <linearGradient id="plantGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Back Glow */}
        <circle cx="190" cy="120" r="85" fill="#6366F1" opacity="0.14" filter="url(#softGlow)" />

        {/* Study Desk surface */}
        <rect x="20" y="220" width="280" height="14" rx="7" fill="url(#deskGrad)" />
        <rect x="25" y="234" width="270" height="4" rx="2" fill="#94A3B8" opacity="0.4" />

        {/* Stack of Books on Desk (Right side) */}
        <g transform="translate(225, 175)">
          {/* Bottom Book */}
          <rect x="0" y="32" width="60" height="12" rx="3" fill="url(#book1Grad)" />
          <rect x="4" y="35" width="52" height="6" rx="1.5" fill="#FEE2E2" />
          {/* Middle Book */}
          <rect x="4" y="20" width="54" height="11" rx="3" fill="url(#book2Grad)" />
          <rect x="8" y="23" width="46" height="5" rx="1.5" fill="#DBEAFE" />
          {/* Top Book (open/angled) */}
          <rect x="8" y="9" width="48" height="10" rx="3" fill="#10B981" />
          <rect x="12" y="12" width="40" height="4" rx="1" fill="#D1FAE5" />
        </g>

        {/* Potted Plant behind books */}
        <g transform="translate(270, 140)">
          {/* Pot */}
          <path d="M6 35 L24 35 L21 54 L9 54 Z" fill="#F97316" />
          <rect x="4" y="32" width="22" height="4" rx="2" fill="#EA580C" />
          {/* Plant Leaves */}
          <path d="M15 32 C12 22 2 24 6 12 C14 16 16 26 15 32 Z" fill="url(#plantGrad)" />
          <path d="M15 32 C18 20 28 22 24 10 C16 14 14 24 15 32 Z" fill="#34D399" />
          <path d="M15 32 C15 16 10 8 15 2 C20 8 16 18 15 32 Z" fill="url(#plantGrad)" />
        </g>

        {/* Student Body (Purple Hoodie) */}
        <g transform="translate(100, 70)">
          {/* Torso & Shoulders */}
          <path
            d="M20 150 C20 115 42 100 80 100 C118 100 140 115 140 150 Z"
            fill="url(#hoodieGrad)"
          />

          {/* Hoodie Collar & Drawstrings */}
          <path
            d="M58 100 C68 118 92 118 102 100 Z"
            fill="#4338CA"
          />
          <line x1="72" y1="108" x2="70" y2="128" stroke="#E0E7FF" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="88" y1="108" x2="90" y2="128" stroke="#E0E7FF" strokeWidth="2.5" strokeLinecap="round" />

          {/* Neck */}
          <rect x="68" y="82" width="24" height="24" rx="6" fill="url(#skinGrad)" />

          {/* Head & Face */}
          <rect x="52" y="30" width="56" height="62" rx="28" fill="url(#skinGrad)" />

          {/* Ears */}
          <circle cx="49" cy="62" r="7" fill="url(#skinGrad)" />
          <circle cx="111" cy="62" r="7" fill="url(#skinGrad)" />

          {/* Hair (Modern styled brown hair) */}
          <path
            d="M48 46 C48 20 70 12 90 14 C106 16 114 26 114 42 C114 46 108 42 100 40 C85 36 68 44 48 46 Z"
            fill="url(#hairGrad)"
          />
          <path
            d="M48 46 C46 54 48 60 52 64 C53 54 55 48 60 44 Z"
            fill="url(#hairGrad)"
          />

          {/* Eyes (Happy, engaged) */}
          <ellipse cx="68" cy="58" rx="4" ry="4.5" fill="#1E293B" />
          <ellipse cx="92" cy="58" rx="4" ry="4.5" fill="#1E293B" />
          <circle cx="70" cy="56" r="1.5" fill="#FFFFFF" />
          <circle cx="94" cy="56" r="1.5" fill="#FFFFFF" />

          {/* Eyebrows */}
          <path d="M63 50 Q69 47 75 50" stroke="#37271E" strokeWidth="2" strokeLinecap="round" />
          <path d="M85 50 Q91 47 97 50" stroke="#37271E" strokeWidth="2" strokeLinecap="round" />

          {/* Cheerful Smile */}
          <path d="M72 70 Q80 77 88 70" stroke="#C2410C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Subtle blush */}
          <circle cx="62" cy="66" r="4.5" fill="#FDA4AF" opacity="0.5" />
          <circle cx="98" cy="66" r="4.5" fill="#FDA4AF" opacity="0.5" />

          {/* Left Arm on Laptop keyboard */}
          <path
            d="M30 140 C35 155 45 165 70 162"
            stroke="url(#hoodieGrad)"
            strokeWidth="20"
            strokeLinecap="round"
          />
          {/* Right Arm */}
          <path
            d="M130 140 C125 155 115 165 95 162"
            stroke="url(#hoodieGrad)"
            strokeWidth="20"
            strokeLinecap="round"
          />
        </g>

        {/* Laptop on Desk */}
        <g transform="translate(60, 160)">
          {/* Laptop Screen (Back view angled toward student) */}
          <path
            d="M35 10 L105 10 L115 65 L25 65 Z"
            fill="url(#laptopGrad)"
            stroke="#64748B"
            strokeWidth="1.5"
          />
          {/* Glowing NeoMCQ Logo on back of Laptop Screen */}
          <circle cx="70" cy="38" r="8" fill="#6366F1" opacity="0.9" />
          <circle cx="70" cy="38" r="4" fill="#FFFFFF" />

          {/* Laptop Base/Keyboard resting on desk */}
          <path
            d="M15 65 L125 65 L135 74 L5 74 Z"
            fill="#CBD5E1"
            stroke="#64748B"
            strokeWidth="1"
          />
          {/* Trackpad area */}
          <rect x="58" y="67" width="24" height="5" rx="1.5" fill="#94A3B8" opacity="0.6" />
        </g>
      </svg>
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
