'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ChevronRight } from 'lucide-react';
import { Logo } from './logo';
import { ModalType } from './interactive-modals';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenModal: (modal: ModalType) => void;
}

export function MobileMenu({ isOpen, onClose, onOpenModal }: MobileMenuProps) {
  if (!isOpen) return null;

  const menuItems: { label: string; modal: ModalType; badge?: string }[] = [
    { label: 'Pricing', modal: 'pricing' },
    { label: 'Features', modal: 'features', badge: 'AI 2.0' },
    { label: 'FAQ', modal: 'faq' },
    { label: 'Contact', modal: 'contact' },
    { label: 'Sign In', modal: 'signin' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Glassmorphism Side Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white/95 dark:bg-[#0E1324]/95 backdrop-blur-2xl border-l border-slate-200 dark:border-[#6D5BFF]/30 p-6 flex flex-col justify-between shadow-2xl z-50 text-slate-900 dark:text-white"
        >
          {/* Top Bar */}
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-gray-800">
              <Logo size="sm" />
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-slate-100 dark:bg-gray-800/80 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="mt-8 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onClose();
                    onOpenModal(item.modal);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-heading font-semibold text-base hover:bg-slate-100 dark:hover:bg-[#6D5BFF]/10 text-slate-900 dark:text-gray-100 transition-colors group"
                >
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-[#6D5BFF]/15 text-[#6D5BFF] dark:text-[#00D4FF]">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#6D5BFF] transition-transform group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Call To Action */}
          <div className="pt-6 border-t border-slate-200 dark:border-gray-800 space-y-3">
            <button
              onClick={() => {
                onClose();
                onOpenModal('start');
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] text-white font-heading font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
            >
              <Sparkles className="w-4 h-4" /> Start Free Practice
            </button>
            <p className="text-[11px] text-center text-slate-500 dark:text-[#A6ADC8]">
              No credit card required • Instant AI access
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
