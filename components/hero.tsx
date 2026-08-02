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
  const headlineLine1 = ["World’s", "Most", "Intelligent"];
  const headlineLine2 = ["AI", "Exam", "Preparation"];
  const headlineLine3 = ["Platform"];

  const subheadlineWords = ["One", "AI.", "Every", "Exam.", "Every", "Country."];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
        delayChildren: 0.15,
      },
    },
  };

  const wordVariants: Variants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  return (
    <section className="relative min-h-[calc(100vh-80px)] py-12 sm:py-20 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 text-center overflow-hidden z-10">
      <div className="max-w-4xl mx-auto flex flex-col items-center space-y-6 sm:space-y-8 my-auto">
        
        {/* 1. Animated Top Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-[#0E1324]/90 border border-slate-300 dark:border-[#6D5BFF]/30 backdrop-blur-xl shadow-md hover:border-[#6D5BFF] transition-all cursor-pointer group"
          onClick={onExploreFeatures}
        >
          <Logo size="sm" showText={false} />
          <span className="text-xs font-semibold text-slate-800 dark:text-gray-200 flex items-center gap-1.5">
            Next-Gen Neural Q-Bank Engine
            <span className="inline-block w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
          </span>
          <span className="text-xs text-[#6D5BFF] dark:text-[#00D4FF] font-bold group-hover:translate-x-0.5 transition-transform flex items-center">
            Learn More <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </span>
        </motion.div>

        {/* 2. Main Headline with Word Animations */}
        <div className="space-y-4 max-w-4xl">
          <motion.h1
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="font-heading font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.12] text-slate-900 dark:text-white flex flex-wrap justify-center gap-x-3 sm:gap-x-4 gap-y-1"
          >
            {/* Line 1 */}
            {headlineLine1.map((word, index) => (
              <motion.span key={`h1-${index}`} variants={wordVariants} className="inline-block">
                {word}
              </motion.span>
            ))}

            <br className="hidden sm:inline w-full" />

            {/* Line 2 with Gradient */}
            {headlineLine2.map((word, index) => (
              <motion.span
                key={`h2-${index}`}
                variants={wordVariants}
                className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] drop-shadow-sm"
              >
                {word}
              </motion.span>
            ))}

            {/* Line 3 */}
            {headlineLine3.map((word, index) => (
              <motion.span key={`h3-${index}`} variants={wordVariants} className="inline-block">
                {word}
              </motion.span>
            ))}
          </motion.h1>

          {/* 3. Subheadline with Animated Words */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-slate-800 dark:text-gray-100 tracking-wide flex flex-wrap justify-center gap-x-2.5 sm:gap-x-3"
          >
            {subheadlineWords.map((word, index) => (
              <motion.span key={`sub-${index}`} variants={wordVariants} className="inline-block">
                {word}
              </motion.span>
            ))}
          </motion.div>
        </div>

        {/* 4. Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="text-base sm:text-lg text-slate-700 dark:text-[#A6ADC8] max-w-2xl font-medium leading-relaxed"
        >
          <span className="font-bold text-slate-900 dark:text-white">Prepare Smarter. Not Harder.</span> Adaptive practice questions, instant step-by-step neural reasoning, and personalized weakness analytics for 180+ global exam blueprints.
        </motion.p>

        {/* 5. CTA Button with Purple Glow & Hover Animations */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartFree}
            className="relative group w-full sm:w-auto px-9 py-4 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#5B4AEB] to-[#A855F7] text-white font-heading font-extrabold text-lg shadow-xl shadow-[#6D5BFF]/35 hover:shadow-[#6D5BFF]/60 transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden cursor-pointer"
          >
            {/* Light Ripple Wave */}
            <span className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            
            <Rocket className="w-5 h-5 text-[#00D4FF] group-hover:rotate-12 transition-transform duration-300" />
            <span>Start Free</span>
            <Sparkles className="w-4.5 h-4.5 text-amber-300 group-hover:scale-125 transition-transform" />
          </motion.button>
        </motion.div>

        {/* Micro-trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-semibold text-slate-600 dark:text-[#A6ADC8]"
        >
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> No Credit Card Required
          </span>
          <span className="hidden sm:inline">•</span>
          <span>Instant Setup</span>
          <span className="hidden sm:inline">•</span>
          <span>180+ Countries Covered</span>
        </motion.div>

        {/* 6. Animated Stats Section */}
        <Stats />

      </div>
    </section>
  );
}
