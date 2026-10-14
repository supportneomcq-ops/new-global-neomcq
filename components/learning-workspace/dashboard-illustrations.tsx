'use client';

import React from 'react';

/**
 * High-fidelity vector illustration of a friendly student at a desk with laptop,
 * books, and the playful "Small Steps Big Results!" speech bubble, matching the reference images.
 */
export function StudentBannerIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`relative select-none flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 270 145"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[140px] drop-shadow-sm select-none"
      >
        <defs>
          <linearGradient id="hoodieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>

          <linearGradient id="laptopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="60%" stopColor="#FDBA74" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3E2723" />
            <stop offset="100%" stopColor="#1E1713" />
          </linearGradient>

          <linearGradient id="deskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="50%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          <linearGradient id="book1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>

          <linearGradient id="book2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          <linearGradient id="book3Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <linearGradient id="plantGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <filter id="softAmbient" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="bubbleDrop" x="-15%" y="-20%" width="130%" height="150%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#312E81" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Ambient Back Glow for depth */}
        <circle cx="140" cy="78" r="54" fill="#818CF8" opacity="0.16" filter="url(#softAmbient)" />

        {/* Study Desk surface */}
        <rect x="10" y="128" width="250" height="9" rx="4.5" fill="url(#deskGrad)" stroke="#CBD5E1" strokeWidth="0.8" />
        <rect x="18" y="137" width="234" height="2.5" rx="1.25" fill="#94A3B8" opacity="0.3" />

        {/* Stack of 3 Books on Desk (Right side) */}
        <g transform="translate(176, 96)">
          {/* Bottom Book (Rose) */}
          <rect x="0" y="21" width="46" height="10" rx="2" fill="url(#book1Grad)" />
          <rect x="3" y="23" width="40" height="6" rx="1" fill="#FFE4E6" />
          {/* Middle Book (Blue) */}
          <rect x="3" y="11" width="42" height="9" rx="2" fill="url(#book2Grad)" />
          <rect x="6" y="13" width="36" height="5" rx="1" fill="#DBEAFE" />
          {/* Top Book (Emerald) */}
          <rect x="6" y="2" width="38" height="8.5" rx="1.5" fill="url(#book3Grad)" />
          <rect x="9" y="4" width="32" height="4.5" rx="0.8" fill="#D1FAE5" />
        </g>

        {/* Small Potted Plant next to books */}
        <g transform="translate(228, 92)">
          {/* Terracotta Pot */}
          <path d="M4 22 L20 22 L18 36 L6 36 Z" fill="#F97316" />
          <rect x="2" y="20" width="20" height="3" rx="1.2" fill="#EA580C" />
          {/* Fresh Green Succulent Leaves */}
          <path d="M12 20 C9 13 1 15 4 6 C10 9 12 16 12 20 Z" fill="url(#plantGrad)" />
          <path d="M12 20 C15 12 23 14 20 5 C14 8 12 15 12 20 Z" fill="#34D399" />
          <path d="M12 20 C12 8 8 3 12 0 C16 3 13 9 12 20 Z" fill="url(#plantGrad)" />
        </g>

        {/* Student Body (Purple Hoodie) */}
        <g transform="translate(90, 36)">
          {/* Torso & Shoulders */}
          <path
            d="M8 92 C8 62 26 48 50 48 C74 48 92 62 92 92 Z"
            fill="url(#hoodieGrad)"
          />

          {/* Hoodie Cowl / Collar */}
          <path
            d="M34 50 C40 64 60 64 66 50 Z"
            fill="#5B21B6"
          />
          {/* White Drawstrings */}
          <line x1="43" y1="54" x2="41" y2="70" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="57" y1="54" x2="59" y2="70" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />

          {/* Neck */}
          <rect x="42" y="38" width="16" height="15" rx="4" fill="url(#skinGrad)" />

          {/* Head & Face */}
          <rect x="31" y="4" width="38" height="42" rx="19" fill="url(#skinGrad)" />

          {/* Ears */}
          <circle cx="29" cy="25" r="4.5" fill="url(#skinGrad)" />
          <circle cx="71" cy="25" r="4.5" fill="url(#skinGrad)" />

          {/* Modern Styled Hair */}
          <path
            d="M28 17 C28 4 44 -1 58 1 C70 3 74 10 74 20 C74 23 69 19 63 18 C52 16 41 20 28 17 Z"
            fill="url(#hairGrad)"
          />
          <path
            d="M28 17 C26 23 27 28 30 31 C31 24 33 20 37 17 Z"
            fill="url(#hairGrad)"
          />

          {/* Eyes (Friendly curved smile eyes) */}
          <path d="M38 23 Q42 19 46 23" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M54 23 Q58 19 62 23" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {/* Cheerful Smile */}
          <path d="M45 32 Q50 37 55 32" stroke="#BE185D" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          {/* Subtle blush */}
          <circle cx="37" cy="28" r="3" fill="#FDA4AF" opacity="0.6" />
          <circle cx="63" cy="28" r="3" fill="#FDA4AF" opacity="0.6" />

          {/* Left Arm to Laptop */}
          <path
            d="M14 85 C18 96 26 99 41 97"
            stroke="url(#hoodieGrad)"
            strokeWidth="13"
            strokeLinecap="round"
          />
          {/* Right Arm */}
          <path
            d="M86 85 C82 96 74 99 59 97"
            stroke="url(#hoodieGrad)"
            strokeWidth="13"
            strokeLinecap="round"
          />
          {/* Hands */}
          <circle cx="35" cy="94" r="4" fill="url(#skinGrad)" />
          <circle cx="65" cy="94" r="4" fill="url(#skinGrad)" />
        </g>

        {/* Laptop on Desk (in front of student) */}
        <g transform="translate(56, 78)">
          {/* Laptop Screen Lid (Angled towards student) */}
          <path
            d="M22 6 L68 6 L75 48 L15 48 Z"
            fill="url(#laptopGrad)"
            stroke="#64748B"
            strokeWidth="1"
          />
          {/* Glowing NeoMCQ Logo on back of Laptop Screen */}
          <circle cx="45" cy="26" r="5.5" fill="#7C3AED" opacity="0.95" />
          <circle cx="45" cy="26" r="2.5" fill="#FFFFFF" />

          {/* Laptop Base / Keyboard on desk */}
          <path
            d="M8 48 L82 48 L88 54 L2 54 Z"
            fill="#CBD5E1"
            stroke="#64748B"
            strokeWidth="0.8"
          />
          {/* Trackpad area */}
          <rect x="38" y="49" width="16" height="3" rx="1" fill="#94A3B8" opacity="0.7" />
        </g>

        {/* Cohesive Floating Speech Bubble: "Small Steps Big Results! ✨" */}
        <g transform="translate(62, 5)" filter="url(#bubbleDrop)">
          {/* Bubble Pill Container */}
          <rect
            x="0"
            y="0"
            width="156"
            height="23"
            rx="11.5"
            fill="#FFFFFF"
            stroke="#E0E7FF"
            strokeWidth="1"
            className="dark:fill-slate-800 dark:stroke-indigo-900/60"
          />
          {/* Speech bubble tail pointing towards student's head */}
          <path
            d="M74 22 L78 28 L82 22 Z"
            fill="#FFFFFF"
            className="dark:fill-slate-800"
          />
          <path
            d="M74 22 L78 28 L82 22"
            stroke="#E0E7FF"
            strokeWidth="1"
            strokeLinecap="round"
            className="dark:stroke-indigo-900/60"
          />
          <line
            x1="74.5"
            y1="22"
            x2="81.5"
            y2="22"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            className="dark:stroke-slate-800"
          />

          {/* Text inside bubble */}
          <text
            x="78"
            y="15"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="9.5"
            fontWeight="700"
            fill="#4338CA"
            className="dark:fill-indigo-300"
            letterSpacing="-0.2px"
          >
            Small Steps Big Results! ✨
          </text>
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
