'use client';

import React, { useState, useEffect } from 'react';
import { FuturisticLoader } from './futuristic-loader';
import { Header } from './header';
import { Hero } from './hero';
import { MobileMenu } from './mobile-menu';
import { InteractiveModals, ModalType } from './interactive-modals';
import { OnboardingFlow, OnboardingData } from './onboarding-flow';
import { DashboardView } from './dashboard-view';
import { AdminPanel } from './admin-panel';
import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

const STORAGE_KEY = 'neomcq_user_session';

interface HomeInteractionManagerProps {
  marquee: React.ReactNode;
}

export function HomeInteractionManager({ marquee }: HomeInteractionManagerProps) {
  const router = useRouter();
  const [isBooting, setIsBooting] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // Lazy initialize state from localStorage
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
          if (roleNames.includes('admin') || roleNames.includes('super_admin')) {
            router.push('/admin');
          } else if (roleNames.includes('support')) {
            router.push('/support');
          } else {
            router.push('/dashboard');
          }
        } else if (currentUser) {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Error verifying active session on landing page:', err);
      }
    };
    checkRedirect();
  }, [router, currentUser]);

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
    router.push('/dashboard');
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage remove error
    }
  };

  const isAnyModalActive = isBooting || isOnboardingOpen || activeModal !== null || isAdminOpen || isMobileMenuOpen;

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
    <>
      {/* Futuristic AI Initializing Bootloader */}
      <FuturisticLoader onComplete={() => setIsBooting(false)} />

      <div
        className={`relative min-h-svh w-screen max-w-full flex flex-col justify-between bg-slate-50 dark:bg-[#050816] transition-opacity duration-500 ${
          isBooting
            ? 'fixed inset-0 h-screen overflow-hidden opacity-0 pointer-events-none'
            : isAnyModalActive
            ? 'h-screen max-h-screen overflow-hidden opacity-100'
            : 'overflow-x-hidden opacity-100'
        }`}
      >
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

        {/* Pre-rendered Scrolling Marquee passed from Server side */}
        {marquee}

        {/* Admin Panel Floating Launch Trigger Button */}
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setIsAdminOpen(true)}
            className="px-3.5 py-2 rounded-full bg-slate-900/90 dark:bg-[#0E1324]/90 hover:bg-slate-800 border border-slate-700/80 dark:border-[#6D5BFF]/40 text-white text-xs font-heading font-extrabold shadow-xl backdrop-blur-md flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
            title="Open Production Admin Control Center"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span>Admin Portal</span>
          </button>
        </div>

        {/* Pre-rendered Mobile Drawer */}
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

        {/* Pre-rendered Interative Modals */}
        <InteractiveModals
          activeModal={activeModal}
          onClose={() => setActiveModal(null)}
        />

        {/* Pre-rendered Onboarding Flow */}
        <OnboardingFlow
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onComplete={handleOnboardingComplete}
        />

        {/* Pre-rendered Admin Operations Operations Center */}
        <AdminPanel
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
        />
      </div>
    </>
  );
}
