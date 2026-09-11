'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import type { TutorAsset } from '@/lib/types/ai-tutor-architecture';

interface AssetRendererProps {
  asset: TutorAsset | any;
  className?: string;
  maxHeightPx?: number;
}

export function AssetRenderer({ asset, className = '', maxHeightPx = 280 }: AssetRendererProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!asset) return null;

  const altText = asset.altText || 'Educational visual diagram';
  const caption = asset.caption || null;
  const src = asset.sourceUrl || '';

  // Fallback Placeholder Card
  if (hasError || !src) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 text-slate-500 my-4 max-w-full ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
          <ImageIcon className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold text-slate-600">Visual explanation unavailable</p>
        <p className="text-[11px] text-slate-400 mt-0.5 text-center">Refer to key bullet points and narration</p>
      </div>
    );
  }

  return (
    <figure className={`flex flex-col items-center my-4 max-w-full overflow-hidden ${className}`}>
      <div
        className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center w-full"
        style={{ maxHeight: `${maxHeightPx}px` }}
      >
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        )}

        {/* Safe Image Element */}
        <img
          src={src}
          alt={altText}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={`w-auto h-auto max-w-full max-h-[${maxHeightPx}px] object-contain transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ maxHeight: `${maxHeightPx}px` }}
        />
      </div>

      {/* Caption */}
      {caption && (
        <figcaption className="mt-2 text-center text-xs font-semibold text-slate-600 tracking-tight italic max-w-md">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
