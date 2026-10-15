'use client';

import React, { useState, useEffect } from 'react';
import { Header } from './header';
import { Footer } from './footer';
import { Hero } from './hero';
import { HomepageSections } from './homepage-sections';
import { MobileMenu } from './mobile-menu';
import { InteractiveModals, ModalType } from './interactive-modals';
import { OnboardingFlow, OnboardingData } from './onboarding-flow';
import { DashboardView } from './dashboard-view';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

const STORAGE_KEY = 'neomcq_user_session';

export function HomeInteractionManager() {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Never treat editable localStorage data as an authenticated session.
  const [currentUser, setCurrentUser] = useState<OnboardingData | null>(null);

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', user.id);
          const roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
          if (roleNames.includes('admin') || roleNames.includes('super_admin')) router.push('/admin');
          else if (roleNames.includes('support')) router.push('/support');
          else router.push('/dashboard');
        }
      } catch (err) {
        console.error('Error verifying active session on landing page:', err);
      }
    };
    checkRedirect();
  }, [router]);

  const handleStartOnboarding = () => {
    setActiveModal(null);
    setIsMobileMenuOpen(false);
    router.push('/onboarding');
  };

  const handleSignIn = () => {
    setActiveModal(null);
    setIsMobileMenuOpen(false);
    router.push('/auth/sign-in');
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    setCurrentUser(data);
    setIsOnboardingOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage write error.
    }
    router.push('/dashboard');
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage remove error.
    }
  };

  const isAnyModalActive = isOnboardingOpen || activeModal !== null || isMobileMenuOpen;

  if (currentUser) {
    return <DashboardView user={currentUser} onSignOut={handleSignOut} onOpenPractice={() => setActiveModal('start')} />;
  }

  return (
    <div className={`relative min-h-svh w-full max-w-full overflow-x-hidden bg-background text-foreground ${isAnyModalActive ? 'h-screen max-h-screen overflow-hidden' : ''}`}>
      <Header
        onOpenModal={(modal) => {
          if (modal === 'signin') handleSignIn();
          else if (modal === 'start') handleStartOnboarding();
          else setActiveModal(modal);
        }}
        onStartFree={handleStartOnboarding}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />
      <Hero onStartFree={handleStartOnboarding} onExploreFeatures={() => {
        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }} />
      <HomepageSections onStartFree={handleStartOnboarding} />
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenModal={(modal) => {
          if (modal === 'signin') handleSignIn();
          else if (modal === 'start') handleStartOnboarding();
          else setActiveModal(modal);
        }}
      />
      <InteractiveModals activeModal={activeModal} onClose={() => setActiveModal(null)} />
      <OnboardingFlow isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} onComplete={handleOnboardingComplete} />
      <Footer />
    </div>
  );
}
