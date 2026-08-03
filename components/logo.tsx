'use client';

import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className = '', size = 'md', showText = true }: LogoProps) {
  const sizeDimensions = {
    sm: { box: 30, text: 'text-base sm:text-lg' },
    md: { box: 38, text: 'text-lg sm:text-xl' },
    lg: { box: 48, text: 'text-xl sm:text-2xl' },
  }[size];

  const dim = sizeDimensions.box;

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
        {/* Soft Background Radial Glow */}
        <div 
          className="absolute inset-0 rounded-full blur-md opacity-70 transition-opacity duration-300 group-hover:opacity-100"
          style={{ backgroundColor: '#6D5BFF45' }}
        />

        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 overflow-visible"
        >
          <defs>
            <linearGradient id="neoMainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D4FF" />
              <stop offset="45%" stopColor="#6D5BFF" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>

            <linearGradient id="neoAccentGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>

            <filter id="neoCoreGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Outer Precision Orbital Ring (Slow rotation) */}
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            stroke="url(#neoMainGrad)"
            strokeWidth="2"
            strokeDasharray="6 14 18 10"
            opacity="0.85"
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '50px 50px' }}
          />

          {/* 2. Secondary Reverse Orbit Ring */}
          <motion.circle
            cx="50"
            cy="50"
            r="32"
            stroke="#00D4FF"
            strokeWidth="1.2"
            strokeDasharray="4 20"
            opacity="0.6"
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '50px 50px' }}
          />

          {/* 3. Orbiting Micro-Satellite Node */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '50px 50px' }}
          >
            <circle cx="50" cy="10" r="3.5" fill="#00D4FF" filter="url(#neoCoreGlow)" />
            <circle cx="50" cy="90" r="2.5" fill="#A855F7" opacity="0.8" />
          </motion.g>

          {/* 4. Breathing Precision Geometric Core */}
          <motion.g
            animate={{ scale: [0.92, 1.06, 0.92], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '50px 50px' }}
          >
            {/* Outer Diamond */}
            <path
              d="M50 18 L78 50 L50 82 L22 50 Z"
              stroke="url(#neoMainGrad)"
              strokeWidth="2.5"
              fill="none"
              opacity="0.9"
            />

            {/* Inner Precision Cross Prism */}
            <path
              d="M50 28 L68 50 L50 72 L32 50 Z"
              fill="url(#neoAccentGrad)"
              opacity="0.45"
            />

            {/* Core Neural Light Beam Axis */}
            <line x1="50" y1="22" x2="50" y2="78" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7" />
            <line x1="22" y1="50" x2="78" y2="50" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7" />

            {/* Center Pulsing Light Prism */}
            <circle cx="50" cy="50" r="6" fill="url(#neoMainGrad)" filter="url(#neoCoreGlow)" />
            <circle cx="50" cy="50" r="2.5" fill="#FFFFFF" />
          </motion.g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-heading font-extrabold tracking-tight ${sizeDimensions.text} text-slate-900 dark:text-white flex items-center`}>
            Neo<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7]">MCQ</span>
            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#6D5BFF]/10 dark:bg-[#6D5BFF]/20 text-[#6D5BFF] dark:text-[#00D4FF] rounded-md border border-[#6D5BFF]/25">
              AI
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
