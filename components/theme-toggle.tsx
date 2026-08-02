'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion } from 'motion/react';

const emptySubscribe = () => () => {};

function useMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="w-28 h-9 rounded-full bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300/30 dark:border-gray-700/30 animate-pulse" />
    );
  }

  const options = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <div className="relative flex items-center p-1 rounded-full bg-gray-200/60 dark:bg-[#0E1324]/80 border border-gray-300/50 dark:border-[#6D5BFF]/30 backdrop-blur-md shadow-inner">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.id;

        return (
          <button
            key={option.id}
            onClick={() => setTheme(option.id)}
            className={`relative flex items-center justify-center w-8 h-7 rounded-full text-xs font-medium transition-colors duration-200 z-10 ${
              isActive
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            title={`Switch to ${option.label} theme`}
            aria-label={`Switch to ${option.label} theme`}
          >
            <Icon className="w-4 h-4" />
            {isActive && (
              <motion.div
                layoutId="theme-active-indicator"
                className="absolute inset-0 bg-white dark:bg-[#6D5BFF] rounded-full shadow-sm -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
