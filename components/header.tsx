'use client';

import React from 'react';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { Menu, LogIn, Sparkles, ArrowRight } from 'lucide-react';
import { ModalType } from './interactive-modals';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onOpenModal: (modal: ModalType) => void;
  onOpenMobileMenu: () => void;
  onStartFree?: () => void;
}

export function Header({ onOpenModal, onOpenMobileMenu, onStartFree }: HeaderProps) {
  const router = useRouter();
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const startFree = onStartFree || (() => router.push('/onboarding'));

  return (
    <header className="sticky top-0 z-40 w-full px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-slate-200/90 bg-white/95 px-4 shadow-[0_6px_22px_rgba(15,23,42,.07)] backdrop-blur-xl sm:h-16 sm:px-6">
        <button onClick={() => router.push('/')} className="shrink-0 cursor-pointer transition-opacity hover:opacity-85" aria-label="NeoMCQ Homepage">
          <Logo size="sm" />
        </button>

        <nav className="hidden items-center gap-5 text-xs font-bold text-slate-700 lg:flex xl:gap-7">
          <button onClick={() => scrollTo('features')} className="transition-colors hover:text-violet-600">Features</button>
          <button onClick={() => scrollTo('exams')} className="transition-colors hover:text-violet-600">Exams</button>
          <button onClick={() => router.push('/pricing')} className="transition-colors hover:text-violet-600">Pricing</button>
          <button onClick={() => scrollTo('why-neomcq')} className="transition-colors hover:text-violet-600">Why NeoMCQ</button>
          <button onClick={() => scrollTo('site-footer')} className="transition-colors hover:text-violet-600">About</button>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle className="scale-90 sm:scale-100" />
          <button onClick={() => router.push('/auth/sign-in')} className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 sm:inline-flex sm:px-4">
            <LogIn className="h-3.5 w-3.5 text-violet-600" /> Sign In
          </button>
          <button onClick={startFree} className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-lg sm:inline-flex">
            Start Free <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button onClick={onOpenMobileMenu} className="flex items-center justify-center rounded-full bg-violet-50 p-2 text-violet-700 transition hover:bg-violet-100 lg:hidden" aria-label="Open side menu" title="Menu"><Menu className="h-4 w-4 sm:h-5 sm:w-5" /></button>
        </div>
      </div>
    </header>
  );
}
