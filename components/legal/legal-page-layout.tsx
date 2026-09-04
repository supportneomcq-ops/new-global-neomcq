'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MobileMenu } from '@/components/mobile-menu';
import { InteractiveModals, ModalType } from '@/components/interactive-modals';
import { LEGAL_CONFIG } from '@/lib/legal/config';
import { ShieldCheck, Calendar, ArrowLeft, BookOpen, Clock } from 'lucide-react';

interface TocItem {
  id: string;
  title: string;
}

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  categoryName?: string;
  toc?: TocItem[];
  children: React.ReactNode;
}

export function LegalPageLayout({
  title,
  subtitle,
  categoryName = 'Legal & Compliance',
  toc = [],
  children,
}: LegalPageLayoutProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050816] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-[#6D5BFF] selection:text-white">
      {/* Top Header */}
      <Header
        onOpenModal={(modal) => setActiveModal(modal)}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />

      {/* Main Content Area */}
      <main className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb & Hero Banner */}
        <div className="mb-8 p-6 sm:p-10 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-[#6D5BFF]/30 shadow-xl shadow-black/5 dark:shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 text-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-semibold text-[#6D5BFF] dark:text-[#00D4FF] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Homepage
            </Link>

            <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-full">
                <BookOpen className="w-3 h-3 text-[#6D5BFF]" />
                {categoryName}
              </span>
              <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-full">
                <Calendar className="w-3 h-3 text-emerald-500" />
                Effective: {LEGAL_CONFIG.effectiveDate}
              </span>
              <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3 text-amber-500" />
                Updated: {LEGAL_CONFIG.lastUpdated}
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            {subtitle}
          </p>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Official Policy document for <strong>{LEGAL_CONFIG.brandName}</strong> international platform services.</span>
          </div>
        </div>

        {/* Content Body with Optional Table of Contents Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents Sticky Sidebar (if TOC items provided) */}
          {toc.length > 0 && (
            <aside className="lg:col-span-1 hidden lg:block">
              <div className="sticky top-24 p-5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 shadow-sm max-h-[80vh] overflow-y-auto">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#6D5BFF]" />
                  Table of Contents
                </h3>
                <nav className="space-y-1 text-xs">
                  {toc.map((item, idx) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block py-1 px-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-[#6D5BFF] dark:hover:text-[#00D4FF] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors line-clamp-1"
                    >
                      {idx + 1}. {item.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Main Prose Text Area */}
          <div className={toc.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}>
            <div className="bg-white dark:bg-[#0E1324] p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Modals & Mobile Drawer */}
      <InteractiveModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        onOpenModal={(modal) => setActiveModal(modal)}
      />

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onOpenModal={(modal) => setActiveModal(modal)}
      />

      {/* Unified Public Footer */}
      <Footer />
    </div>
  );
}
