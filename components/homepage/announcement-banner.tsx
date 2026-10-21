'use client';

import React from 'react';
import { AnnouncementConfig } from '@/lib/homepage-config';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface AnnouncementBannerProps {
  config: AnnouncementConfig;
}

export function AnnouncementBanner({ config }: AnnouncementBannerProps) {
  if (!config.enabled || !config.text) return null;

  return (
    <div className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white text-xs sm:text-sm py-2 px-4 shadow-sm relative z-30">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2 text-center">
        {config.badge && (
          <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase text-white border border-white/30">
            <Sparkles className="w-3 h-3 text-amber-300" />
            {config.badge}
          </span>
        )}
        <span className="font-medium text-white/95">{config.text}</span>
        {config.ctaText && config.ctaLink && (
          <Link
            href={config.ctaLink}
            className="inline-flex items-center gap-1 font-bold underline hover:text-cyan-200 transition-colors ml-1 text-xs"
          >
            <span>{config.ctaText}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
