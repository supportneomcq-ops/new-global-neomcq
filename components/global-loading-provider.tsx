'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Sparkles, X } from 'lucide-react';

interface GlobalLoadingContextType {
  isLoading: boolean;
  message: string;
  startLoading: (msg?: string) => void;
  stopLoading: () => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType>({
  isLoading: false,
  message: 'Loading...',
  startLoading: () => {},
  stopLoading: () => {},
});

export function useGlobalLoading() {
  return useContext(GlobalLoadingContext);
}

// Global helper functions to trigger loading from anywhere in client code
export function triggerGlobalLoading(message: string = 'Loading...') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('neomcq:loading-start', { detail: { message } }));
  }
}

export function stopGlobalLoading() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('neomcq:loading-end'));
  }
}

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Loading...');
  const [progress, setProgress] = useState(0);

  const pathname = usePathname();
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const stopLoading = useCallback(() => {
    clearTimers();
    setProgress(100);
    stopTimerRef.current = setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, 200);
  }, [clearTimers]);

  const startLoading = useCallback((msg: string = 'Loading...') => {
    clearTimers();
    setMessage(msg);
    setIsLoading(true);
    setProgress(20);

    // Safety timeout: automatically dismiss after 1.2s max so the loader can NEVER get stuck
    safetyTimerRef.current = setTimeout(() => {
      stopLoading();
    }, 1200);
  }, [clearTimers, stopLoading]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Immediately stop loading when pathname changes (Next.js route transition complete)
  useEffect(() => {
    stopLoading();
  }, [pathname, stopLoading]);

  // Stop loading on window lifecycle events (load, pageshow, popstate, visibilitychange)
  useEffect(() => {
    const handleEnd = () => stopLoading();

    window.addEventListener('load', handleEnd);
    window.addEventListener('pageshow', handleEnd);
    window.addEventListener('popstate', handleEnd);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        stopLoading();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Initial mount check
    stopLoading();

    return () => {
      window.removeEventListener('load', handleEnd);
      window.removeEventListener('pageshow', handleEnd);
      window.removeEventListener('popstate', handleEnd);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [stopLoading]);

  // Listen for custom window loading events
  useEffect(() => {
    const handleStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      startLoading(customEvent.detail?.message || 'Loading...');
    };

    const handleEnd = () => {
      stopLoading();
    };

    window.addEventListener('neomcq:loading-start', handleStart);
    window.addEventListener('neomcq:loading-end', handleEnd);

    return () => {
      window.removeEventListener('neomcq:loading-start', handleStart);
      window.removeEventListener('neomcq:loading-end', handleEnd);
    };
  }, [startLoading, stopLoading]);

  // Intercept anchor clicks for navigation loading with strict filtering
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;

      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      // Ignore buttons, role buttons, or elements opting out
      if (
        target.closest('[data-no-loading]') ||
        target.closest('[role="button"]') ||
        target.closest('[role="tab"]') ||
        target.hasAttribute('download')
      ) {
        return;
      }

      const href = target.getAttribute('href');
      if (!href) return;

      // Ignore external, javascript, hash, tel, mailto, blob, or target="_blank" links
      if (
        href.startsWith('http') ||
        href.startsWith('#') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('blob:') ||
        target.target === '_blank' ||
        target.getAttribute('rel')?.includes('external') ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if target points to the exact same pathname
      try {
        const targetUrl = new URL(href, window.location.href);
        if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) {
          // Already on this page, do not trigger loading
          return;
        }
      } catch {
        // Fallback check
        if (href === window.location.pathname) return;
      }

      // Determine navigation message
      let navMsg = 'Loading...';
      if (href.includes('/dashboard')) navMsg = 'Opening dashboard...';
      else if (href.includes('/onboarding')) navMsg = 'Preparing your workspace...';
      else if (href.includes('/exams')) navMsg = 'Loading exams...';
      else if (href.includes('/pricing')) navMsg = 'Loading plan options...';
      else if (href.includes('/auth')) navMsg = 'Preparing sign in...';

      startLoading(navMsg);
    };

    document.addEventListener('click', handleAnchorClick, true);
    return () => {
      document.removeEventListener('click', handleAnchorClick, true);
    };
  }, [startLoading]);

  // Animate top progress bar tick while loading
  useEffect(() => {
    if (!isLoading) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          return 90;
        }
        return prev + Math.random() * 14;
      });
    }, 180);

    return () => clearInterval(timer);
  }, [isLoading]);

  return (
    <GlobalLoadingContext.Provider value={{ isLoading, message, startLoading, stopLoading }}>
      {/* Top Progress Bar */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[999999] h-1 pointer-events-none select-none"
          >
            <div
              className="h-full bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] shadow-[0_0_12px_#00D4FF] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Badge Loader (self-dismissable on click) */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[999998] select-none"
          >
            <div
              onClick={() => stopLoading()}
              role="status"
              aria-live="polite"
              className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 dark:bg-[#0E1324]/95 text-white border border-[#6D5BFF]/40 backdrop-blur-xl shadow-xl shadow-black/20 text-xs font-semibold cursor-pointer hover:bg-slate-800 transition-colors group"
              title="Click to dismiss"
            >
              <div className="relative flex items-center justify-center">
                <Loader2 className="w-3.5 h-3.5 text-[#00D4FF] animate-spin" />
              </div>
              <span className="text-slate-100 font-medium tracking-wide">{message}</span>
              <Sparkles className="w-3 h-3 text-[#A855F7] animate-pulse group-hover:hidden" />
              <X className="w-3 h-3 text-slate-400 hover:text-white hidden group-hover:block transition-colors" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </GlobalLoadingContext.Provider>
  );
}

