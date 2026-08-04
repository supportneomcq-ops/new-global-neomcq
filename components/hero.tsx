import React from 'react';
import { Stats } from './stats';
import { AIOrb } from './ai-orb';
import { ShieldCheck } from 'lucide-react';
import { HeroActions } from './hero-actions';

interface HeroProps {
  onStartFree: () => void;
  onExploreFeatures: () => void;
}

export function Hero({ onStartFree, onExploreFeatures }: HeroProps) {
  return (
    <section className="relative flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-between items-center z-10 py-6 sm:py-8 lg:py-12">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
        
        {/* Left Column: Headline & Value Proposition */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-5 sm:space-y-6">
          
          {/* Main Title + Subtitle */}
          <div className="space-y-3 sm:space-y-4 animate-fade-in-up">
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
          </div>

          {/* Paragraph description */}
          <p className="text-xs sm:text-base md:text-lg text-slate-600 dark:text-[#A6ADC8] max-w-xl font-medium leading-relaxed animate-fade-in-up">
            Prepare smarter with adaptive practice, real-time analytics, and personalized guidance that gets you results.
          </p>

          {/* Lightweight interactive controls */}
          <HeroActions onStartFree={onStartFree} onExploreFeatures={onExploreFeatures} />

          {/* Micro-trust indicators */}
          <div className="flex items-center justify-center lg:justify-start gap-2 text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-[#A6ADC8] pt-1 animate-fade-in-up">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>No Credit Card Required • Instant AI Access</span>
          </div>

        </div>

        {/* Right Column: AI Neural Orb Platform (Desktop & Mobile) */}
        <div className="lg:col-span-5 flex items-center justify-center w-full animate-fade-in-scale">
          <AIOrb />
        </div>

      </div>

      {/* Bottom Horizontal Stats Glass Bar */}
      <div className="w-full mt-8 sm:mt-10 animate-fade-in-up">
        <Stats />
      </div>

    </section>
  );
}
