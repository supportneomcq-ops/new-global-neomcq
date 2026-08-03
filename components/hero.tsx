'use client';

import React from 'react';
import { motion, Variants } from 'motion/react';
import { Logo } from './logo';
import { Stats } from './stats';
import { Rocket, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface HeroProps {
  onStartFree: () => void;
  onExploreFeatures: () => void;
}

export function Hero({ onStartFree, onExploreFeatures }: HeroProps) {
  const line1 = ["The", "Future", "of"];
  const line2 = ["Exam", "Preparation"];
  const line3 = ["Powered", "by"];
  const line4 = ["Artificial", "Intelligence"];

  const subWords = ["One", "AI.", "Every", "Exam.", "Every", "Country."];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const wordVariants: Variants = {
    hidden: { opacity: 0, y: 15, filter: 'blur(4px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.45,
        ease: 'easeOut',
      },
    },
  };

  return (
    <section className="relative flex-1 w-full flex flex-col justify-center items-center px-4 sm:px-6 text-center z-10 my-auto py-2">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center space-y-[clamp(0.5rem,1.8vh,1.5rem)] my-auto">
        
        {/* 1. Animated Top Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: -10 }}
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
          <span className="text-[11px] sm:text-xs text-[#6D5BFF] dark:text-[#00D4FF] font-bold group-hover:translate-x-0.5 transition-transform flex items-center">
            Learn More <ArrowRight className="w-3 h-3 ml-0.5" />
          </span>
        </motion.div>

        {/* 2. Main Headline with Fluid Clamp Typography */}
        <div className="space-y-[clamp(0.25rem,0.8vh,0.75rem)] max-w-4xl">
          <motion.h1
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="font-heading font-extrabold text-[clamp(1.75rem,4.2vh+0.8rem,4.25rem)] tracking-tight leading-[1.12] text-slate-900 dark:text-white flex flex-wrap justify-center items-center gap-x-2 sm:gap-x-3.5 gap-y-0.5"
          >
            {/* Line 1 */}
            {line1.map((word, idx) => (
              <motion.span key={`l1-${idx}`} variants={wordVariants} className="inline-block">
                {word}
              </motion.span>
            ))}

            {/* Line 2 with Shimmer Gradient */}
            {line2.map((word, idx) => (
              <motion.span
                key={`l2-${idx}`}
                variants={wordVariants}
                className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] drop-shadow-sm"
              >
                {word}
              </motion.span>
            ))}

            <br className="hidden sm:inline w-full" />

            {/* Line 3 */}
            {line3.map((word, idx) => (
              <motion.span key={`l3-${idx}`} variants={wordVariants} className="inline-block text-slate-800 dark:text-gray-200">
                {word}
              </motion.span>
            ))}

            {/* Line 4 with Shimmer Gradient */}
            {line4.map((word, idx) => (
              <motion.span
                key={`l4-${idx}`}
                variants={wordVariants}
                className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] via-[#6D5BFF] to-[#A855F7] drop-shadow-sm"
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          {/* 3. Subheadline with Word Animations */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="font-heading font-bold text-[clamp(0.95rem,1.8vh+0.4rem,1.75rem)] text-slate-800 dark:text-gray-100 tracking-wide flex flex-wrap justify-center gap-x-2 sm:gap-x-2.5"
          >
            {subWords.map((word, idx) => (
              <motion.span key={`sub-${idx}`} variants={wordVariants} className="inline-block">
                {word}
              </motion.span>
            ))}
          </motion.div>
        </div>

        {/* 4. Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="text-[clamp(0.85rem,1.2vh+0.35rem,1.1rem)] text-slate-700 dark:text-[#A6ADC8] max-w-xl font-medium leading-relaxed"
        >
          <span className="font-bold text-slate-900 dark:text-white">Prepare Smarter. Not Harder.</span> Adaptive practice questions and step-by-step AI reasoning for 180+ global exam blueprints.
        </motion.p>

        {/* 5. Apple-Quality CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.55 }}
          className="w-full sm:w-auto flex flex-col items-center justify-center gap-2"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartFree}
            className="relative group w-full sm:w-auto px-8 py-3.5 sm:px-10 sm:py-4 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#5B4AEB] to-[#A855F7] text-white font-heading font-extrabold text-base sm:text-lg shadow-xl shadow-[#6D5BFF]/35 hover:shadow-[#6D5BFF]/60 transition-all duration-300 flex items-center justify-center gap-2.5 overflow-hidden cursor-pointer"
          >
            {/* Ripple Wave */}
            <span className="absolute inset-0 w-full h-full bg-white/25 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            
            <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-[#00D4FF] group-hover:rotate-12 transition-transform duration-300" />
            <span>Start Free</span>
            <Sparkles className="w-4 h-4 text-amber-300 group-hover:scale-125 transition-transform" />
          </motion.button>

          {/* Micro-trust indicators */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-slate-500 dark:text-[#A6ADC8]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>No Credit Card Required • Instant Setup</span>
          </div>
        </motion.div>

        {/* 6. Bottom Statistics */}
        <Stats />

      </div>
    </section>
  );
}
