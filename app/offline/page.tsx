import React from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#090D1E] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="space-y-6 max-w-md bg-slate-900/80 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
        <div className="flex justify-center">
          <Logo size="lg" showText={true} />
        </div>

        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 w-16 h-16 mx-auto flex items-center justify-center">
          <WifiOff className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">You are Offline</h1>
          <p className="text-sm text-slate-400">
            NeoMCQ requires an active internet connection to synchronize AI questions, flashcards, and study sessions.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="w-full py-3 px-6 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#6D5BFF]/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Check Connection &amp; Retry</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
