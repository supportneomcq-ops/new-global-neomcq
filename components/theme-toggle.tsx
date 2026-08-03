'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Sparkles, LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

const emptySubscribe = () => () => {};

function useMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

interface ThemeOption {
  id: 'light' | 'dark' | 'system';
  label: string;
  icon: LucideIcon;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="w-24 h-8 rounded-full bg-slate-200/50 dark:bg-gray-800/50 border border-slate-300/40 dark:border-gray-700/40 animate-pulse" />
    );
  }

  const options: ThemeOption[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'Auto', icon: Sparkles },
  ];

  return (
    <div className="relative flex items-center p-1 rounded-full bg-slate-200/80 dark:bg-[#0E1324]/90 border border-slate-300/80 dark:border-[#6D5BFF]/30 backdrop-blur-md shadow-inner">
      {options.map((option) => {
        const isActive = theme === option.id;
        const Icon = option.icon;

        return (
          <button
            key={option.id}
            onClick={() => setTheme(option.id)}
            className={`relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-colors duration-200 z-10 cursor-pointer ${
              isActive
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            title={`Switch to ${option.label} theme`}
            aria-label={`Switch to ${option.label} theme`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />

            {isActive && (
              <motion.div
                layoutId="theme-active-indicator"
                className="absolute inset-0 bg-white dark:bg-[#6D5BFF] rounded-full shadow-md -z-10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

