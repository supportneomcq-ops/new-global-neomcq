'use client';

import React, { useState } from 'react';
import { AnimatedBackground } from '@/components/animated-background';
import { Header } from '@/components/header';
import { Hero } from '@/components/hero';
import { MobileMenu } from '@/components/mobile-menu';
import { InteractiveModals, ModalType } from '@/components/interactive-modals';
import { OnboardingFlow, OnboardingData } from '@/components/onboarding-flow';
import { DashboardView } from '@/components/dashboard-view';

const STORAGE_KEY = 'neomcq_user_session';

export default function HomePage() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  
  // Lazy initialize state from localStorage to avoid set-state-in-effect warning
  const [currentUser, setCurrentUser] = useState<OnboardingData | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage read error
    }
    return null;
  });

  const handleStartOnboarding = () => {
    setActiveModal(null);
    setIsMobileMenuOpen(false);
    setIsOnboardingOpen(true);
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    setCurrentUser(data);
    setIsOnboardingOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage write error
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage remove error
    }
  };

  // If user is authenticated & onboarded, display DashboardView
  if (currentUser) {
    return (
      <DashboardView
        user={currentUser}
        onSignOut={handleSignOut}
        onOpenPractice={() => setActiveModal('start')}
      />
    );
  }

  return (
    <main className="relative min-h-svh w-screen max-w-full overflow-hidden flex flex-col justify-between bg-slate-50 dark:bg-[#050816] transition-colors duration-300">
      {/* Dynamic AI Canvas Background */}
      <AnimatedBackground />

      {/* Navigation Header */}
      <Header
        onOpenModal={(modal) => {
          if (modal === 'start' || modal === 'signin') {
            handleStartOnboarding();
          } else {
            setActiveModal(modal);
          }
        }}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Hero Content Section */}
      <Hero
        onStartFree={handleStartOnboarding}
        onExploreFeatures={() => setActiveModal('features')}
      />

      {/* Mobile Menu Glassmorphism Drawer */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenModal={(modal) => {
          if (modal === 'start' || modal === 'signin') {
            handleStartOnboarding();
          } else {
            setActiveModal(modal);
          }
        }}
      />

      {/* Interactive Feature Modals & Dialog Previews */}
      <InteractiveModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
      />

      {/* Production Multi-Step Onboarding & Signup Flow */}
      <OnboardingFlow
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />
    </main>
  );
}
