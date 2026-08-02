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
    sm: { box: 32, text: 'text-lg' },
    md: { box: 40, text: 'text-xl' },
    lg: { box: 52, text: 'text-2xl' },
  }[size];

  const dim = sizeDimensions.box;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
        {/* Glow backdrop */}
        <div 
          className="absolute inset-0 rounded-full blur-md opacity-60 transition-opacity duration-300 group-hover:opacity-100"
          style={{ backgroundColor: '#6D5BFF55' }}
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
            <linearGradient id="neoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D4FF" />
              <stop offset="50%" stopColor="#6D5BFF" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Connection Lines */}
          <motion.g
            initial={{ opacity: 0.6, scale: 0.95 }}
            animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.02, 0.95] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Top to Center */}
            <line x1="50" y1="12" x2="50" y2="50" stroke="#6D5BFF" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.8" />
            {/* Bottom to Center */}
            <line x1="50" y1="88" x2="50" y2="50" stroke="#6D5BFF" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.8" />
            {/* Left to Center */}
            <line x1="12" y1="50" x2="50" y2="50" stroke="#6D5BFF" strokeWidth="2.5" opacity="0.8" />
            {/* Right to Center */}
            <line x1="88" y1="50" x2="50" y2="50" stroke="#6D5BFF" strokeWidth="2.5" opacity="0.8" />

            {/* Diagonal diamond edges */}
            <line x1="50" y1="12" x2="88" y2="50" stroke="url(#neoGradient)" strokeWidth="2" opacity="0.9" />
            <line x1="88" y1="50" x2="50" y2="88" stroke="url(#neoGradient)" strokeWidth="2" opacity="0.9" />
            <line x1="50" y1="88" x2="12" y2="50" stroke="url(#neoGradient)" strokeWidth="2" opacity="0.9" />
            <line x1="12" y1="50" x2="50" y2="12" stroke="url(#neoGradient)" strokeWidth="2" opacity="0.9" />

            {/* Outer neural connections */}
            <line x1="30" y1="30" x2="70" y2="70" stroke="#00D4FF" strokeWidth="1.5" opacity="0.5" />
            <line x1="70" y1="30" x2="30" y2="70" stroke="#00D4FF" strokeWidth="1.5" opacity="0.5" />
          </motion.g>

          {/* Outer Nodes (Top, Right, Bottom, Left) */}
          <circle cx="50" cy="12" r="5" fill="#00D4FF" filter="url(#glow)" />
          <circle cx="88" cy="50" r="5" fill="#6D5BFF" filter="url(#glow)" />
          <circle cx="50" cy="88" r="5" fill="#A855F7" filter="url(#glow)" />
          <circle cx="12" cy="50" r="5" fill="#00D4FF" filter="url(#glow)" />

          {/* Corner Auxiliary Nodes */}
          <circle cx="30" cy="30" r="3" fill="#6D5BFF" opacity="0.8" />
          <circle cx="70" cy="30" r="3" fill="#00D4FF" opacity="0.8" />
          <circle cx="70" cy="70" r="3" fill="#A855F7" opacity="0.8" />
          <circle cx="30" cy="70" r="3" fill="#6D5BFF" opacity="0.8" />

          {/* Center AI Core Diamond */}
          <motion.path
            d="M50 36 L64 50 L50 64 L36 50 Z"
            fill="url(#neoGradient)"
            filter="url(#glow)"
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: '50px 50px' }}
          />

          {/* Core Pulsing Point */}
          <motion.circle
            cx="50"
            cy="50"
            r="4"
            fill="#FFFFFF"
            animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-heading font-extrabold tracking-tight ${sizeDimensions.text} text-gray-900 dark:text-white flex items-center`}>
            Neo<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7]">MCQ</span>
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#6D5BFF]/10 dark:bg-[#6D5BFF]/20 text-[#6D5BFF] dark:text-[#00D4FF] rounded-md border border-[#6D5BFF]/20">
              AI
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
