'use client';

import React from 'react';
import { Rocket, PlayCircle, ArrowRight } from 'lucide-react';
import { Logo } from './logo';

interface HeroActionsProps {
  onStartFree: () => void;
  onExploreFeatures: () => void;
}

export function HeroActions({ onStartFree, onExploreFeatures }: HeroActionsProps) {
  return (
    <div className="flex flex-col items-center lg:items-start space-y-6 w-full">
      {/* Interactive Badge */}
      <button
        onClick={onExploreFeatures}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/90 dark:bg-[#0E1324]/90 border border-slate-300/80 dark:border-[#6D5BFF]/30 backdrop-blur-xl shadow-sm hover:border-[#6D5BFF] transition-all cursor-pointer group animate-fade-in-scale text-left"
        aria-label="See next-gen AI features"
      >
        <Logo size="sm" showText={false} />
        <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-gray-200 flex items-center gap-1.5 whitespace-nowrap">
          Next-Gen Neural Q-Bank Engine
          <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#00D4FF] animate-pulse shrink-0" />
        </span>
        <span className="text-[11px] sm:text-xs text-[#6D5BFF] dark:text-[#00D4FF] font-bold group-hover:translate-x-0.5 transition-transform flex items-center ml-1">
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </span>
      </button>

      {/* CTA Button Group */}
      <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2 animate-fade-in-up">
        {/* Start Free Button */}
        <button
          onClick={onStartFree}
          className="relative group w-full sm:w-auto px-8 py-3.5 sm:px-9 sm:py-4 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#5B4AEB] to-[#A855F7] text-white font-heading font-extrabold text-sm sm:text-base shadow-xl shadow-[#6D5BFF]/30 hover:shadow-[#6D5BFF]/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 overflow-hidden cursor-pointer"
        >
          <span className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-[#00D4FF] group-hover:rotate-12 transition-transform duration-300" />
          <span>Start Free</span>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Explore Features Button */}
        <button
          onClick={onExploreFeatures}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/80 dark:bg-[#0E1324]/80 border border-slate-300 dark:border-gray-800 text-slate-800 dark:text-gray-200 font-heading font-bold text-sm hover:bg-slate-100 dark:hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md shadow-sm"
        >
          <PlayCircle className="w-4 h-4 text-[#6D5BFF] dark:text-[#00D4FF]" />
          <span>See How It Works</span>
        </button>
      </div>
    </div>
  );
}
