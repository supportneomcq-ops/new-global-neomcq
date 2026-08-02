'use client';

import React from 'react';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { Menu } from 'lucide-react';
import { ModalType } from './interactive-modals';

interface HeaderProps {
  onOpenModal: (modal: ModalType) => void;
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenModal, onOpenMobileMenu }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-8 py-3.5 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-2.5 sm:p-3 px-4 sm:px-6 rounded-full bg-white/85 dark:bg-[#050816]/80 border border-slate-200/90 dark:border-[#6D5BFF]/30 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/30">
        {/* Left: Logo */}
        <button
          onClick={() => onOpenModal(null)}
          className="hover:opacity-90 transition-opacity focus:outline-none"
          aria-label="NeoMCQ Homepage"
        >
          <Logo size="md" />
        </button>

        {/* Right Controls: Theme Toggle and 3-Line Side Menu Button ONLY */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          <button
            onClick={onOpenMobileMenu}
            className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-gray-800/80 dark:hover:bg-gray-700 text-slate-800 dark:text-gray-100 transition-colors shadow-sm flex items-center justify-center"
            aria-label="Open side menu"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
