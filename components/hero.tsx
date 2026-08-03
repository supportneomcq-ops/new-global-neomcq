'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Stats } from './stats';
import { AIOrb } from './ai-orb';
import { Rocket, Sparkles, ShieldCheck, PlayCircle, ArrowRight } from 'lucide-react';
import { Logo } from './logo';

interface HeroProps {
  onStartFree: () => void;
  onExploreFeatures: () => void;
}

export function Hero({ onStartFree, onExploreFeatures }: HeroProps) {
  return (
    <section className="relative flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-between items-center z-10 py-6 sm:py-8 lg:py-12">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
        
        {/* Left Column: Headline & Value Proposition */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-4 sm:space-y-6">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/90 dark:bg-[#0E1324]/90 border border-slate-300/80 dark:border-[#6D5BFF]/30 backdrop-blur-xl shadow-sm hover:border-[#6D5BFF] transition-all cursor-pointer group"
            onClick={onExploreFeatures}
          >
            <Logo size="sm" showText={false} />
            <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-gray-200 flex items-center gap-1.5">
              Next-Gen Neural Q-Bank Engine
              <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#00D4FF] animate-pulse" />
            </span>
            <span className="text-[11px] sm:text-xs text-[#6D5BFF] dark:text-[#00D4FF] font-bold group-hover:translate-x-0.5 transition-transform flex items-center ml-1">
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </motion.div>

          {/* Main Title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="space-y-3 sm:space-y-4"
          >
            <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.12] text-slate-900 dark:text-white">
              The Future of{' '}
              <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] font-black drop-shadow-sm py-0.5">
                Exam Preparation
              </span>{' '}
              Powered by{' '}
              <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] via-[#6D5BFF] to-[#A855F7] font-black drop-shadow-sm py-0.5">
                Artificial Intelligence.
              </span>
            </h1>

            {/* Subtitle */}
            <div className="font-heading font-extrabold text-base sm:text-xl md:text-2xl text-[#6D5BFF] dark:text-[#00D4FF] tracking-wide pt-1">
              One AI. Every Exam. Every Country.
            </div>
          </motion.div>

          {/* Paragraph */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-xs sm:text-base md:text-lg text-slate-600 dark:text-[#A6ADC8] max-w-xl font-medium leading-relaxed"
          >
            Prepare smarter with adaptive practice, real-time analytics, and personalized guidance that gets you results.
          </motion.p>

          {/* CTA Button Group */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.25 }}
            className="w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartFree}
              className="relative group w-full sm:w-auto px-8 py-3.5 sm:px-9 sm:py-4 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#5B4AEB] to-[#A855F7] text-white font-heading font-extrabold text-sm sm:text-base shadow-xl shadow-[#6D5BFF]/30 hover:shadow-[#6D5BFF]/50 transition-all duration-300 flex items-center justify-center gap-2.5 overflow-hidden cursor-pointer"
            >
              <span className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-[#00D4FF] group-hover:rotate-12 transition-transform duration-300" />
              <span>Start Free</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onExploreFeatures}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/80 dark:bg-[#0E1324]/80 border border-slate-300 dark:border-gray-800 text-slate-800 dark:text-gray-200 font-heading font-bold text-sm hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md shadow-sm"
            >
              <PlayCircle className="w-4 h-4 text-[#6D5BFF] dark:text-[#00D4FF]" />
              <span>See How It Works</span>
            </motion.button>
          </motion.div>

          {/* Micro-trust indicators */}
          <div className="flex items-center justify-center lg:justify-start gap-2 text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-[#A6ADC8] pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>No Credit Card Required • Instant AI Access</span>
          </div>

        </div>

        {/* Right Column: AI Neural Orb Platform (Desktop & Mobile) */}
        <div className="lg:col-span-5 flex items-center justify-center w-full">
          <AIOrb />
        </div>

      </div>

      {/* Bottom Horizontal Stats Glass Bar */}
      <div className="w-full mt-8 sm:mt-10">
        <Stats />
      </div>

    </section>
  );
}
