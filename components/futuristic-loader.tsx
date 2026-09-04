'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Zap, ShieldCheck } from 'lucide-react';
import { Logo } from './logo';

interface FuturisticLoaderProps {
  onComplete?: () => void;
}

export function FuturisticLoader({ onComplete }: FuturisticLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING NEURAL ENGINE');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Completely lock HTML & Body scroll during 5-second loader execution
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyPos = document.body.style.position;
    const originalBodyWidth = document.body.style.width;

    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');

    // Smooth 5.0-second boot sequence (50 ticks @ 90ms = 4.5s + 0.5s finish buffer = 5.0s)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsDone(true);
            document.body.classList.remove('modal-open');
            document.documentElement.classList.remove('modal-open');
            onComplete?.();
          }, 500);
          return 100;
        }

        const next = prev + 2; // Exact 2% increment per tick

        if (next > 20 && next <= 50) {
          setStatusText('CONNECTING GLOBAL EXAM KNOWLEDGE GRAPH...');
        } else if (next > 50 && next <= 80) {
          setStatusText('OPTIMIZING ADAPTIVE MCQ ALGORITHMS...');
        } else if (next > 80) {
          setStatusText('NEOMCQ READY • HIGH PERFORMANCE ENGAGED');
        }
        return next > 100 ? 100 : next;
      });
    }, 90);

    return () => {
      clearInterval(interval);
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-0 left-0 right-0 bottom-0 inset-0 z-[999999] w-screen h-screen h-[100dvh] flex flex-col items-center justify-center bg-[#030612] text-white overflow-hidden touch-none select-none p-4 m-0"
        >
          {/* Futuristic Background Mesh & Ambient Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(109,91,255,0.28),transparent_65%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(0,212,255,0.20),transparent_55%)] pointer-events-none" />

          {/* Holographic Cyber Orbit Core with Centered NeoMCQ Logo */}
          <div className="relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64 mb-6">
            {/* Outer Spinning Orbit */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-dashed border-[#6D5BFF]/70 shadow-[0_0_35px_rgba(109,91,255,0.5)]"
            />

            {/* Inner Counter-Spinning Cyber Ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
              className="absolute inset-4 rounded-full border-2 border-t-[#00D4FF] border-r-transparent border-b-[#A855F7] border-l-transparent"
            />

            {/* Satellite Node Orbit */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
              className="absolute inset-0 flex items-start justify-center"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-[#00D4FF] shadow-[0_0_18px_#00D4FF]" />
            </motion.div>

            {/* Centered NeoMCQ Logo Card */}
            <motion.div
              animate={{ scale: [0.96, 1.04, 0.96], opacity: [0.9, 1, 0.9] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              className="relative z-10 p-4 sm:p-5 rounded-3xl bg-[#090D1E]/95 border border-[#6D5BFF]/60 backdrop-blur-xl shadow-[0_0_60px_rgba(109,91,255,0.6)] flex items-center justify-center"
            >
              <Logo size="lg" showText={true} />
            </motion.div>
          </div>

          {/* Telemetry Tag */}
          <div className="flex items-center gap-2 mb-2 text-[#00D4FF] font-mono text-xs tracking-widest uppercase">
            <Zap className="w-4 h-4 text-[#00D4FF] animate-bounce" />
            <span>NEOMCQ AI ENGINE v3.5</span>
            <Sparkles className="w-4 h-4 text-[#A855F7]" />
          </div>

          <p className="text-xs sm:text-sm text-slate-300 font-mono mb-6 text-center max-w-xs sm:max-w-sm px-2">
            Initializing 180+ Country Global Exam Knowledge Graph
          </p>

          {/* Progress Bar Container */}
          <div className="w-72 sm:w-96 px-2">
            <div className="flex justify-between items-center text-xs font-mono text-slate-200 mb-2">
              <span className="truncate pr-2 text-[#00D4FF] font-semibold">{statusText}</span>
              <span className="font-bold text-white">{progress}%</span>
            </div>

            <div className="relative w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-[1px]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] shadow-[0_0_20px_#00D4FF]"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.1 }}
              />
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-8 flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span>NEOMCQ SECURE ENGINE • 256-BIT ENCRYPTED</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
