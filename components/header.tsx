'use client';

import React from 'react';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { Menu, LogIn, Sparkles } from 'lucide-react';
import { ModalType } from './interactive-modals';

import { useRouter } from 'next/navigation';

interface HeaderProps {
  onOpenModal: (modal: ModalType) => void;
  onOpenMobileMenu: () => void;
  onStartFree?: () => void;
}

export function Header({ onOpenModal, onOpenMobileMenu, onStartFree }: HeaderProps) {
  const router = useRouter();
  return (
    <header className="w-full pt-3 sm:pt-4 px-3 sm:px-6 lg:px-8 z-40 transition-all duration-300">
      <div className="max-w-7xl mx-auto h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 rounded-full bg-white/90 dark:bg-[#050816]/85 border border-slate-200/90 dark:border-[#6D5BFF]/30 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/30">
        
        {/* Left: Logo */}
        <button
          onClick={() => onOpenModal(null)}
          className="hover:opacity-90 transition-opacity focus:outline-none shrink-0 cursor-pointer"
          aria-label="NeoMCQ Homepage"
        >
          <Logo size="sm" />
        </button>

        {/* Desktop Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs lg:text-sm font-heading font-semibold text-slate-700 dark:text-gray-300">
          <button
            onClick={() => onOpenModal('features')}
            className="hover:text-[#6D5BFF] dark:hover:text-[#00D4FF] transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => onOpenModal('exams')}
            className="hover:text-[#6D5BFF] dark:hover:text-[#00D4FF] transition-colors cursor-pointer"
          >
            Exams
          </button>
          <button
            onClick={() => onOpenModal('pricing')}
            className="hover:text-[#6D5BFF] dark:hover:text-[#00D4FF] transition-colors cursor-pointer"
          >
            Pricing
          </button>
          <button
            onClick={() => onOpenModal('why')}
            className="hover:text-[#6D5BFF] dark:hover:text-[#00D4FF] transition-colors cursor-pointer"
          >
            Why NeoMCQ
          </button>
          <button
            onClick={() => onOpenModal('about')}
            className="hover:text-[#6D5BFF] dark:hover:text-[#00D4FF] transition-colors cursor-pointer"
          >
            About
          </button>
        </nav>

        {/* Right Controls: Theme Toggle, Sign In, Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />

          {/* Desktop Sign In button */}
          <button
            onClick={() => router.push('/auth/sign-in')}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-300/80 dark:border-gray-700 hover:border-[#6D5BFF] dark:hover:border-[#00D4FF] text-xs font-heading font-bold text-slate-800 dark:text-gray-100 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-[#6D5BFF] dark:text-[#00D4FF]" />
            <span>Sign In</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-gray-800/80 dark:hover:bg-gray-700 text-slate-800 dark:text-gray-100 transition-colors shadow-sm flex items-center justify-center cursor-pointer"
            aria-label="Open side menu"
            title="Menu"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

      </div>
    </header>
  );
}
