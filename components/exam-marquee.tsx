'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe2, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ExamItem } from '@/app/api/exams/route';

const FALLBACK_FEATURED_EXAMS: ExamItem[] = [
  { id: '1', name: 'USMLE Step 1 & 2 CK', category: 'Medical Licensing Exam', country: 'United States', flag: '🇺🇸', description: 'United States Medical Licensing Examination for physicians.', code: 'USMLE', is_featured: true },
  { id: '2', name: 'NEET PG / INI-CET', category: 'Medical Entrance', country: 'India', flag: '🇮🇳', description: 'National Eligibility cum Entrance Test for postgraduate medicine.', code: 'NEETPG', is_featured: true },
  { id: '3', name: 'PLAB 1 / UKMLA', category: 'Medical Licensing Exam', country: 'United Kingdom', flag: '🇬🇧', description: 'GMC licensing test for international medical graduates in the UK.', code: 'PLAB', is_featured: true },
  { id: '4', name: 'NCLEX-RN Nursing', category: 'Nursing Board Exam', country: 'United States & Canada', flag: '🇺🇸', description: 'National Council Licensure Examination for Registered Nurses.', code: 'NCLEX', is_featured: true },
  { id: '5', name: 'FMGE Medical Licensing', category: 'Foreign Medical Graduate Exam', country: 'India', flag: '🇮🇳', description: 'NBE Screening Test for foreign medical graduates in India.', code: 'FMGE', is_featured: true },
  { id: '6', name: 'AMC MCQ Exam', category: 'Medical Council Exam', country: 'Australia', flag: '🇦🇺', description: 'Australian Medical Council computer adaptive exam.', code: 'AMC', is_featured: true },
  { id: '7', name: 'UPSC Civil Services', category: 'Civil Services Exam', country: 'India', flag: '🇮🇳', description: 'Premier civil service examination for IAS, IPS & IFS officer cadres.', code: 'UPSC', is_featured: true },
  { id: '8', name: 'SAT College Entrance', category: 'College Board Entrance', country: 'Global (180+ Countries)', flag: '🎓', description: 'Scholastic Assessment Test for undergraduate admissions.', code: 'SAT', is_featured: true },
  { id: '9', name: 'GRE General Test', category: 'Graduate Admissions', country: 'Global (180+ Countries)', flag: '🌍', description: 'Graduate Record Examination for MS & PhD admissions.', code: 'GRE', is_featured: true },
  { id: '10', name: 'CFA Level I / II / III', category: 'Financial Analyst', country: 'Global (180+ Countries)', flag: '🌍', description: 'Global charter for investment and financial analysts.', code: 'CFA', is_featured: true },
];

export function ExamMarquee() {
  const [exams, setExams] = useState<ExamItem[]>(FALLBACK_FEATURED_EXAMS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    async function loadExams() {
      try {
        const res = await fetch('/api/exams?featured=true');
        const data = await res.json();
        if (data?.exams && Array.isArray(data.exams) && data.exams.length > 0) {
          setExams(data.exams);
        }
      } catch (err) {
        console.warn('Using fallback spotlight exams list:', err);
      }
    }
    loadExams();
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % exams.length);
  }, [exams.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + exams.length) % exams.length);
  }, [exams.length]);

  // Automatic slide transition every 3.5 seconds when not hovered
  useEffect(() => {
    if (isHovered || exams.length <= 1) return;

    const timer = setInterval(() => {
      handleNext();
    }, 3500);

    return () => clearInterval(timer);
  }, [isHovered, exams.length, handleNext]);

  return (
    <section className="w-full py-10 sm:py-16 bg-slate-50/70 dark:bg-[#050816]/70 border-y border-slate-200/80 dark:border-gray-800/80 select-none overflow-hidden relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
        
        {/* Section Header with Globe Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-2 mb-6 sm:mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-[#0E1324]/90 border border-slate-200 dark:border-[#6D5BFF]/30 shadow-sm text-xs font-heading font-extrabold text-[#6D5BFF] dark:text-[#00D4FF]">
            <Globe2 className="w-3.5 h-3.5 animate-spin-slow" />
            <span>🌍 Trusted by Students & Professionals Worldwide across 180+ Countries</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
            Trusted by learners in <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7]">180+ Countries</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A6ADC8] font-medium max-w-lg mx-auto">
            Dynamic AI practice questions customized for national medical, licensing, and professional exam boards.
          </p>
        </motion.div>

        {/* 3D Coverflow Stage Container */}
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative w-full max-w-5xl h-[240px] sm:h-[260px] flex items-center justify-center my-2"
        >
          {/* Navigation Arrow - Left */}
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 p-2.5 sm:p-3 rounded-full bg-white/90 dark:bg-[#0E1324]/90 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-200 shadow-xl hover:scale-110 hover:border-[#6D5BFF] transition-all cursor-pointer backdrop-blur-md"
            aria-label="Previous Featured Exam"
            title="Previous Exam"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Navigation Arrow - Right */}
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 p-2.5 sm:p-3 rounded-full bg-white/90 dark:bg-[#0E1324]/90 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-200 shadow-xl hover:scale-110 hover:border-[#6D5BFF] transition-all cursor-pointer backdrop-blur-md"
            aria-label="Next Featured Exam"
            title="Next Exam"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Render Deck of Cards */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden sm:overflow-visible">
            {exams.map((exam, idx) => {
              // Calculate relative position (-1 = left, 0 = active center, 1 = right)
              let offset = (idx - currentIndex + exams.length) % exams.length;
              if (offset > exams.length / 2) {
                offset -= exams.length;
              }

              const isCenter = offset === 0;
              const isLeft = offset === -1;
              const isRight = offset === 1;

              // Hide all cards that are not center, left, or right
              if (!isCenter && !isLeft && !isRight) return null;

              return (
                <motion.div
                  key={exam.id || exam.name}
                  layout
                  initial={false}
                  animate={{
                    x: isCenter ? '0%' : isLeft ? '-65%' : '65%',
                    scale: isCenter ? 1 : 0.84,
                    opacity: isCenter ? 1 : 0.45,
                    filter: isCenter ? 'blur(0px)' : 'blur(4px)',
                    zIndex: isCenter ? 30 : 10,
                  }}
                  transition={{
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  onClick={() => {
                    if (isLeft) handlePrev();
                    if (isRight) handleNext();
                  }}
                  className={`absolute w-[290px] sm:w-[420px] md:w-[480px] p-5 sm:p-7 rounded-3xl bg-white/95 dark:bg-[#0E1324]/95 text-left transition-shadow duration-300 backdrop-blur-2xl overflow-hidden ${
                    isCenter
                      ? 'border-2 border-[#6D5BFF] shadow-2xl dark:shadow-[#6D5BFF]/20 cursor-default'
                      : 'border border-slate-200 dark:border-gray-800 shadow-md hover:opacity-75 cursor-pointer pointer-events-auto'
                  }`}
                >
                  {/* Card Background Ambient Glow */}
                  {isCenter && (
                    <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-[#6D5BFF]/20 via-[#00D4FF]/15 to-transparent blur-2xl rounded-full pointer-events-none" />
                  )}

                  {/* Card Header: Flag + Name + Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl sm:text-4xl filter drop-shadow-sm select-none">
                        {exam.flag || '🌍'}
                      </span>
                      <div>
                        <div className="text-[10px] sm:text-[11px] font-heading font-extrabold uppercase tracking-wider text-[#6D5BFF] dark:text-[#00D4FF]">
                          {exam.country}
                        </div>
                        <h3 className="font-heading font-black text-lg sm:text-2xl text-slate-900 dark:text-white leading-tight">
                          {exam.name}
                        </h3>
                      </div>
                    </div>

                    <span className="px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] sm:text-[10px] font-bold shrink-0 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{isLeft ? 'Previous' : isRight ? 'Upcoming' : 'Active Syllabus'}</span>
                    </span>
                  </div>

                  {/* Card Details */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-gray-800/80">
                    <div className="text-xs font-semibold text-slate-600 dark:text-gray-300">
                      Category: <strong className="text-slate-900 dark:text-white">{exam.category}</strong>
                    </div>
                    {exam.description && (
                      <div className="text-xs text-slate-500 dark:text-[#A6ADC8] mt-1 leading-relaxed line-clamp-2">
                        {exam.description}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Indicator Progress Dots (● ○ ○ ○ ○) & Fast Selector */}
        <div className="flex items-center justify-center gap-2 mt-6 sm:mt-8 flex-wrap">
          {exams.map((exam, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={exam.id || exam.name}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'w-7 h-2.5 rounded-full bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] shadow-sm'
                    : 'w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-gray-700 hover:bg-slate-400 dark:hover:bg-gray-600'
                }`}
                title={`View ${exam.name} (${exam.country})`}
                aria-label={`Jump to ${exam.name}`}
              />
            );
          })}
        </div>

        {/* Quick Exam Country Indicator Chips */}
        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap text-xs">
          {exams.slice(0, 6).map((e, i) => (
            <button
              key={e.id || e.name}
              onClick={() => setCurrentIndex(i)}
              className={`px-3 py-1 rounded-full text-[11px] font-heading font-semibold transition-all cursor-pointer ${
                i === currentIndex
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm scale-105'
                  : 'bg-white/80 dark:bg-[#0E1324]/80 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-800 hover:border-[#6D5BFF]'
              }`}
            >
              <span>{e.flag || '🌍'} {e.code || e.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}

