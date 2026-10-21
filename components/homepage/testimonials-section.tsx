'use client';

import React from 'react';
import { TestimonialItem } from '@/lib/homepage-config';
import { Star, ShieldCheck, Quote } from 'lucide-react';
import Image from 'next/image';

interface TestimonialsSectionProps {
  testimonials: TestimonialItem[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
        <span className="px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
          Student Success Stories
        </span>
        <h2 className="font-heading font-black text-2xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
          Trusted by <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500">50,000+ High Achievers</span>
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
          Read how students worldwide used NeoMCQ AI practice to ace their licensing and entrance examinations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {testimonials.map((t) => (
          <div
            key={t.id}
            className="bg-white dark:bg-slate-900/90 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden"
          >
            <Quote className="w-12 h-12 text-violet-500/10 dark:text-violet-400/10 absolute top-4 right-4 pointer-events-none" />

            <div>
              {/* Rating stars & score badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: t.rating || 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-cyan-300 text-xs font-bold">
                  {t.score}
                </span>
              </div>

              {/* Quote */}
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>
            </div>

            {/* Author details */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-violet-500/40 shrink-0">
                <Image
                  src={t.avatarUrl}
                  alt={t.name}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1">
                  <span>{t.name}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {t.role}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
