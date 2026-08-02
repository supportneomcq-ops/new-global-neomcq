'use client';

import React, { useState } from 'react';
import { AnimatedBackground } from '@/components/animated-background';
import { Header } from '@/components/header';
import { Hero } from '@/components/hero';
import { MobileMenu } from '@/components/mobile-menu';
import { InteractiveModals, ModalType } from '@/components/interactive-modals';

export default function HomePage() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#050816] transition-colors duration-300">
      {/* Dynamic AI Canvas Background */}
      <AnimatedBackground />

      {/* Navigation Header */}
      <Header
        onOpenModal={(modal) => setActiveModal(modal)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Hero Content Section */}
      <Hero
        onStartFree={() => setActiveModal('start')}
        onExploreFeatures={() => setActiveModal('features')}
      />

      {/* Mobile Menu Glassmorphism Drawer */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenModal={(modal) => setActiveModal(modal)}
      />

      {/* Interactive Feature Modals & Dialog Previews */}
      <InteractiveModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </main>
  );
}
