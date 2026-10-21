'use client';

import React from 'react';
import { HeroConfig } from '@/lib/homepage-config';
import { AIOrb } from '../ai-orb';
import { ShieldCheck, Sparkles, ArrowRight, Play, Users, BookOpen, TrendingUp, Zap, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface HeroSectionProps {
  config: HeroConfig;
  onStartFree: () => void;
  onExploreExams: () => void;
}

export function HeroSection({ config, onStartFree, onExploreExams }: HeroSectionProps) {
  return (
    <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 z-10">
      {/* Background Gradient Spotlights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-violet-500/20 via-cyan-500/15 to-purple-500/20 blur-3xl rounded-full pointer-events-none -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Column: Headline & CTA */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          
          {/* Badge */}
          {config.badgeText && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/80 text-violet-700 dark:text-violet-300 text-xs sm:text-sm font-semibold shadow-sm">
              <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
              <span>{config.badgeText}</span>
            </div>
          )}

          {/* Main Title */}
          <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.12] text-slate-900 dark:text-white">
            {config.headlinePrefix}{' '}
            <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 dark:from-violet-400 dark:via-cyan-400 dark:to-indigo-300 font-black">
              {config.headlineGradient1}
            </span>{' '}
            {config.headlineMiddle}{' '}
            <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-violet-600 to-purple-600 dark:from-cyan-300 dark:via-violet-400 dark:to-purple-300 font-black">
              {config.headlineGradient2}
            </span>
          </h1>

          {/* Subtitle */}
          {config.subtitle && (
            <p className="font-heading font-extrabold text-base sm:text-xl text-violet-600 dark:text-cyan-400 tracking-wide">
              {config.subtitle}
            </p>
          )}

          {/* Paragraph Description */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-2xl font-normal leading-relaxed">
            {config.description}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto pt-2">
            <button
              onClick={onStartFree}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-heading font-bold text-base shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-cyan-200" />
              <span>{config.primaryCtaText || 'Start Studying Free'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={onExploreExams}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-heading font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 text-violet-500 fill-violet-500" />
              <span>{config.secondaryCtaText || 'Explore Exams'}</span>
            </button>
          </div>

          {/* Trust indicators */}
          {config.trustText && (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{config.trustText}</span>
            </div>
          )}

        </div>

        {/* Right Column: Visual Element */}
        <div className="lg:col-span-5 flex items-center justify-center w-full">
          {config.heroVisualType === 'ai_orb' && (
            <div className="w-full flex justify-center py-4">
              <AIOrb />
            </div>
          )}

          {config.heroVisualType === '3d_student' && (
            <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-violet-200/50 dark:border-violet-900/50 bg-gradient-to-br from-violet-100 via-indigo-50 to-cyan-100 dark:from-slate-900 dark:to-violet-950 p-2">
              <div className="relative w-full h-full rounded-xl overflow-hidden">
                <Image
                  src={config.customImageUrl || '/assets/student-welcome-banner.png'}
                  alt="Student Studying with NeoMCQ AI"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          {config.heroVisualType === 'dashboard_preview' && (
            <div className="w-full rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-2xl text-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono text-slate-400 ml-2">neomcq.com/ai-session</span>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                  LIVE AI ENGINE
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Target Exam: USMLE Step 1</span>
                  <span className="text-cyan-400 font-bold">Accuracy: 88.4%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200">
                  <p className="font-semibold text-violet-300">AI Adaptive Question #142</p>
                  <p className="mt-1">Which mechanism explains hyperuricemia caused by thiazide diuretics?</p>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center justify-between">
                    <span>✓ Competition at organic acid transporter</span>
                    <span className="font-bold">Correct (Instant)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {config.heroVisualType === 'custom_image' && config.customImageUrl && (
            <div className="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
              <Image
                src={config.customImageUrl}
                alt="NeoMCQ Banner"
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>

      </div>

      {/* Stats Glass Bar */}
      {config.stats && config.stats.length > 0 && (
        <div className="w-full mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl">
          {config.stats.map((stat) => {
            const IconComp = stat.icon === 'Users' ? Users : stat.icon === 'BookOpen' ? BookOpen : stat.icon === 'TrendingUp' ? TrendingUp : Zap;
            return (
              <div key={stat.id} className="flex items-center gap-3 sm:gap-4 p-2">
                <div className="p-2.5 sm:p-3 rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-cyan-400 shrink-0">
                  <IconComp className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {stat.label}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {stat.subtext}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </section>
  );
}
