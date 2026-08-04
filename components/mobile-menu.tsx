'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ChevronRight, UserCheck, CreditCard, Cpu, HelpCircle, Mail } from 'lucide-react';
import { Logo } from './logo';
import { ModalType } from './interactive-modals';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenModal: (modal: ModalType) => void;
}

export function MobileMenu({ isOpen, onClose, onOpenModal }: MobileMenuProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [isOpen]);

  const menuItems: { label: string; modal: ModalType; badge?: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: 'Pricing Plans', modal: 'pricing', icon: CreditCard },
    { label: 'AI Features', modal: 'features', badge: 'v2.4', icon: Cpu },
    { label: 'FAQ', modal: 'faq', icon: HelpCircle },
    { label: 'Contact Support', modal: 'contact', icon: Mail },
    { label: 'Sign In Account', modal: 'signin', icon: UserCheck },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end overflow-hidden transition-all duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md cursor-pointer"
      />

      {/* 100% Viewport Height Safe-Area Aware Slide Drawer */}
      <div
        className={`relative w-[85%] max-w-sm h-dvh bg-white/95 dark:bg-[#0E1324]/95 backdrop-blur-2xl border-l border-slate-200 dark:border-[#6D5BFF]/30 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col justify-between shadow-2xl z-50 text-slate-900 dark:text-white overflow-y-auto transition-transform duration-300 transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
          {/* Header & Logo Section */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-gray-800">
              <Logo size="sm" />
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-slate-100 dark:bg-gray-800/80 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Menu List */}
            <div className="mt-6 space-y-1.5">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      onClose();
                      onOpenModal(item.modal);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl text-left font-heading font-medium text-sm sm:text-base hover:bg-slate-100 dark:hover:bg-[#6D5BFF]/15 text-slate-800 dark:text-gray-100 transition-colors group cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-gray-800/60 flex items-center justify-center text-[#6D5BFF] dark:text-[#00D4FF]">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="font-semibold">{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#6D5BFF]/15 text-[#6D5BFF] dark:text-[#00D4FF] border border-[#6D5BFF]/20">
                          {item.badge}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#6D5BFF] transition-transform group-hover:translate-x-1" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-gray-800 space-y-3">
            <button
              onClick={() => {
                onClose();
                onOpenModal('start');
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] text-white font-heading font-bold text-sm shadow-lg shadow-[#6D5BFF]/25 flex items-center justify-center gap-2 hover:opacity-95 transition-opacity cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Start Free Practice
            </button>
            <p className="text-[11px] text-center text-slate-500 dark:text-[#A6ADC8]">
              No credit card required • 180+ Country Syllabus
            </p>
          </div>
      </div>
    </div>
  );
}

