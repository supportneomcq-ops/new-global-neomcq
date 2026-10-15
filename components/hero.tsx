'use client';

import React, { useEffect, useState } from 'react';
import { DEFAULT_HOMEPAGE_CONTENT, HomepageContent } from '@/lib/homepage-content';
import { ArrowRight, BrainCircuit, BookOpen, CheckCircle2, ClipboardList, GraduationCap, PlayCircle, Sparkles } from 'lucide-react';

interface HeroProps {
  onStartFree: () => void;
  onExploreFeatures: () => void;
}

export function Hero({ onStartFree, onExploreFeatures }: HeroProps) {
  const [homepageContent, setHomepageContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);

  useEffect(() => {
    let active = true;
    fetch('/api/homepage-content', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active && result?.content) setHomepageContent({ ...DEFAULT_HOMEPAGE_CONTENT, ...result.content });
      })
      .catch(() => {
        // Keep the bundled reference design when the settings endpoint is unavailable.
      });
    return () => { active = false; };
  }, []);

  const chips = [
    { label: 'Practice MCQs', icon: ClipboardList },
    { label: 'Smart Notes', icon: BookOpen },
    { label: 'Flashcards', icon: GraduationCap },
    { label: 'AI Tutor', icon: BrainCircuit },
    { label: 'Study Plan', icon: Sparkles },
    { label: 'Progress Analytics', icon: CheckCircle2 },
  ];

  return (
    <section className="relative isolate overflow-hidden border-b border-violet-100 bg-gradient-to-r from-sky-50 via-white to-violet-100 px-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-violet-300/40 blur-3xl" />
      <div className="relative mx-auto grid min-h-[490px] max-w-6xl items-center gap-3 py-9 sm:py-12 lg:min-h-[520px] lg:grid-cols-[.95fr_1.05fr] lg:py-8">
        <div className="relative z-10 flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-100/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-sky-700">
            <Sparkles className="h-3.5 w-3.5" /> AI-powered exam preparation
          </div>
          <h1 className="max-w-[620px] font-heading text-4xl font-black leading-[1.06] tracking-tight text-slate-950 sm:text-5xl lg:text-[48px] xl:text-[54px]">
            {homepageContent.heroHeadlineTop}<br />
            <span className="bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent">{homepageContent.heroHeadlineHighlight}</span><br />
            {homepageContent.heroHeadlineBottom}
          </h1>
          <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
            {homepageContent.heroDescription}
          </p>
          <div className="mt-4 flex max-w-xl flex-wrap justify-center gap-2 lg:justify-start">
            {chips.map(({ label, icon: Icon }) => <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/85 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 shadow-sm"><Icon className="h-3.5 w-3.5 text-violet-600" />{label}</span>)}
          </div>
          <div className="mt-6 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row lg:justify-start">
            <button onClick={onStartFree} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-500 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-300/50 transition hover:-translate-y-0.5 hover:shadow-xl">
              Start Free <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={onExploreFeatures} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
              <PlayCircle className="h-4 w-4 text-violet-600" /> See How It Works
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-semibold text-slate-500 lg:justify-start">
            <span><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-500" />No Credit Card Required</span>
            <span><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-500" />Instant Access</span>
            <span><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-500" />For Any Exam, Worldwide</span>
          </div>
        </div>

        <div className="relative mx-auto mt-3 flex min-h-[300px] w-full max-w-[610px] items-center justify-center sm:min-h-[360px] lg:mt-0 lg:min-h-[430px]">
          <div className="absolute left-[8%] top-[10%] z-20 hidden w-[42%] -rotate-6 rounded-2xl border border-violet-100 bg-white/95 p-3 shadow-xl shadow-violet-200/60 sm:block">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-700"><span>AI Generated MCQ</span><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
            <div className="mt-2 h-2 rounded-full bg-slate-100" /><div className="mt-1.5 h-2 w-4/5 rounded-full bg-slate-100" />
            <div className="mt-3 rounded-lg bg-teal-50 px-2 py-1.5 text-[9px] font-bold text-teal-700">A · Correct answer</div>
            <div className="mt-1 rounded-lg bg-slate-50 px-2 py-1.5 text-[9px] text-slate-500">B · Review option</div>
            <div className="mt-2 text-right text-[9px] font-extrabold text-violet-600">Detailed explanation ↗</div>
          </div>
          <div className="absolute bottom-[16%] left-[4%] z-20 hidden w-[43%] rotate-[-4deg] rounded-2xl border border-violet-100 bg-white/95 p-3 shadow-xl shadow-violet-200/60 sm:block">
            <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-700"><ClipboardList className="h-4 w-4 text-violet-600" /> Study Plan</div>
            {['Today’s Goals','Revise Weak Topics','Practice 50 MCQs'].map((text, i) => <div key={text} className="mt-2 flex items-center gap-2 text-[9px] text-slate-600"><span className={`flex h-3.5 w-3.5 items-center justify-center rounded ${i === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'}`}>{i === 1 ? '✓' : '•'}</span>{text}</div>)}
          </div>
          <div className="absolute right-[2%] top-[5%] z-20 hidden w-[29%] rounded-2xl border border-white bg-white/95 p-3 shadow-xl sm:block">
            <div className="text-[10px] font-extrabold text-slate-700">Your Progress</div>
            <div className="mt-2 flex items-center gap-2"><div className="flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-emerald-400 text-xs font-black text-slate-700">78%</div><div className="flex h-9 items-end gap-1">{[40,65,48,85].map((h,i)=><span key={i} className="w-2 rounded-t bg-violet-500" style={{height:`${h}%`}} />)}</div></div>
            <div className="mt-2 text-right text-[9px] font-bold text-emerald-600">Keep going! ↗</div>
          </div>
          <img src={homepageContent.heroImageUrl} alt={homepageContent.heroImageAlt} className="relative z-10 h-auto w-full max-w-[560px] object-contain drop-shadow-[0_18px_22px_rgba(91,77,173,.14)]" fetchPriority="high" />
          <div className="absolute bottom-[8%] right-[3%] z-20 hidden rotate-6 font-caveat text-xl font-bold leading-tight text-violet-600 sm:block">Small Steps<br />Big Results!<span className="block text-2xl">〰</span></div>
        </div>
      </div>
    </section>
  );
}
