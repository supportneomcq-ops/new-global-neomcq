'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Brain, BookOpen, BarChart3, Target, GraduationCap, Sparkles } from 'lucide-react';

export function AIOrb() {
  const nodeIcons = [
    { icon: Brain, label: 'Adaptive AI', angle: 0, radius: 110, color: 'from-purple-500 to-indigo-600' },
    { icon: BookOpen, label: 'Q-Banks', angle: 72, radius: 125, color: 'from-blue-500 to-cyan-400' },
    { icon: BarChart3, label: 'Analytics', angle: 144, radius: 115, color: 'from-emerald-400 to-teal-500' },
    { icon: Target, label: 'Precision', angle: 216, radius: 120, color: 'from-rose-500 to-pink-500' },
    { icon: GraduationCap, label: 'Syllabi', angle: 288, radius: 110, color: 'from-amber-400 to-orange-500' },
  ];

  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[440px] lg:max-w-[480px] aspect-square mx-auto flex items-center justify-center select-none pointer-events-none">
      {/* 1. Ambient Background Multi-Layer Radial Glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#6D5BFF]/30 via-[#00D4FF]/20 to-[#A855F7]/30 blur-3xl opacity-75 animate-pulse" />
      <div className="absolute w-3/4 h-3/4 rounded-full bg-[#6D5BFF]/20 blur-2xl opacity-60" />

      {/* 2. Platform Hologram Base */}
      <div className="absolute bottom-4 sm:bottom-8 w-4/5 h-20 sm:h-28 rounded-full border border-[#6D5BFF]/30 dark:border-[#00D4FF]/20 bg-gradient-to-b from-transparent via-[#6D5BFF]/10 to-transparent blur-sm transform rotate-X-60" />
      <div className="absolute bottom-6 sm:bottom-10 w-2/3 h-12 sm:h-16 rounded-full border border-[#00D4FF]/40 bg-[#00D4FF]/5 blur-xs transform rotate-X-60" />

      {/* 3. Outer Rotating Holographic Grid Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        className="absolute w-full h-full rounded-full border border-dashed border-[#6D5BFF]/25 dark:border-[#00D4FF]/20"
      />

      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        className="absolute w-5/6 h-5/6 rounded-full border border-dotted border-[#00D4FF]/30"
      />

      {/* 4. Central Glowing Sphere Container */}
      <motion.div
        animate={{ y: [-8, 8, -8] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full flex items-center justify-center"
      >
        {/* Glass Orb Shell */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-[#6D5BFF]/15 to-black/20 dark:from-white/10 dark:via-[#6D5BFF]/20 dark:to-black/60 border border-white/40 dark:border-white/15 backdrop-blur-md shadow-2xl shadow-[#6D5BFF]/30 overflow-hidden">
          {/* Inner Glowing Star Core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] opacity-80 blur-lg animate-pulse" />
          </div>

          {/* SVG 4-Point Neural Diamond Star */}
          <svg className="w-full h-full p-8 sm:p-10 relative z-10" viewBox="0 0 100 100" fill="none">
            <defs>
              <linearGradient id="orbCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00D4FF" />
                <stop offset="50%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
            </defs>

            {/* Neural Connections */}
            <circle cx="50" cy="50" r="38" stroke="url(#orbCoreGrad)" strokeWidth="1" strokeDasharray="3 6" opacity="0.6" />
            <line x1="50" y1="12" x2="50" y2="88" stroke="#00D4FF" strokeWidth="0.8" opacity="0.4" />
            <line x1="12" y1="50" x2="88" y2="50" stroke="#00D4FF" strokeWidth="0.8" opacity="0.4" />

            {/* Core Neural Star */}
            <motion.path
              d="M50 15 Q50 50 85 50 Q50 50 50 85 Q50 50 15 50 Q50 50 50 15 Z"
              fill="url(#orbCoreGrad)"
              animate={{ scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '50px 50px' }}
            />

            {/* Center Pulsing Dot */}
            <circle cx="50" cy="50" r="4" fill="#FFFFFF" />
          </svg>
        </div>

        {/* 5. Orbiting Floating Satellite Badges */}
        {nodeIcons.map((node, idx) => {
          const Icon = node.icon;
          return (
            <motion.div
              key={node.label}
              animate={{
                y: [Number((Math.sin(idx) * 6).toFixed(2)), Number((Math.cos(idx) * -6).toFixed(2)), Number((Math.sin(idx) * 6).toFixed(2))],
                x: [Number((Math.cos(idx) * 4).toFixed(2)), Number((Math.sin(idx) * -4).toFixed(2)), Number((Math.cos(idx) * 4).toFixed(2))],
              }}
              transition={{
                duration: 4 + idx,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute pointer-events-auto"
              style={{
                top: `${(50 + Math.sin((node.angle * Math.PI) / 180) * 42).toFixed(2)}%`,
                left: `${(50 + Math.cos((node.angle * Math.PI) / 180) * 42).toFixed(2)}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="flex items-center gap-1.5 p-2 sm:p-2.5 rounded-2xl bg-white/90 dark:bg-[#0E1324]/90 border border-slate-200 dark:border-[#6D5BFF]/40 backdrop-blur-xl shadow-lg hover:scale-110 transition-transform cursor-pointer group">
                <div className={`p-1.5 rounded-xl bg-gradient-to-br ${node.color} text-white shadow-sm`}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[10px] sm:text-xs font-heading font-extrabold text-slate-800 dark:text-gray-100 hidden xs:inline sm:inline">
                  {node.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
