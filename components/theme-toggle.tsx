'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';

const emptySubscribe = () => () => {};

function useMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className={`w-14 h-7 rounded-full bg-slate-200/60 dark:bg-slate-800/60 animate-pulse ${className}`} />
    );
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative flex items-center justify-between w-14 h-7 p-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${className}`}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
    >
      {/* Sun icon on left */}
      <span className={`flex items-center justify-center w-6 h-6 z-10 transition-colors ${isDark ? 'text-slate-400' : 'text-amber-500'}`}>
        <Sun className="w-3.5 h-3.5" />
      </span>

      {/* Moon icon on right */}
      <span className={`flex items-center justify-center w-6 h-6 z-10 transition-colors ${isDark ? 'text-white' : 'text-indigo-400'}`}>
        <Moon className="w-3.5 h-3.5" />
      </span>

      {/* Sliding purple thumb */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 bottom-0.5 w-6 h-6 rounded-full bg-indigo-600 shadow-sm ${
          isDark ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </button>
  );
}
