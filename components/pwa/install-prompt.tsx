'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share, CheckCircle2, Smartphone } from 'lucide-react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [installed, setInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already running in standalone mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(standaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSPrompt(true);
    }
  };

  if (isStandalone || installed || dismissed) return null;

  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full p-4 rounded-2xl bg-[#090D1E] border border-slate-800 shadow-2xl text-white backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6D5BFF]/20 border border-[#6D5BFF]/30 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-[#00D4FF]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Install NeoMCQ App</span>
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Fast, full-screen offline MCQ practice and AI tutor companion.
            </p>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showIOSPrompt ? (
        <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
          <p className="font-semibold text-white flex items-center gap-1.5">
            <Share className="w-3.5 h-3.5 text-[#00D4FF]" /> To install on iOS Safari:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[10px] text-slate-400">
            <li>Tap the <span className="text-white font-bold">Share</span> icon in Safari toolbar</li>
            <li>Scroll down and tap <span className="text-white font-bold">Add to Home Screen</span></li>
          </ol>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white transition-all"
          >
            Not Now
          </button>
          <button
            onClick={handleInstallClick}
            className="px-4 py-1.5 rounded-lg bg-[#6D5BFF] hover:bg-[#5b49ff] text-white text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#6D5BFF]/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        </div>
      )}
    </div>
  );
}
