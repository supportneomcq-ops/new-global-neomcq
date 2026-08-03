'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Globe2, Brain, Zap } from 'lucide-react';

export function Stats() {
  const statItems = [
    {
      icon: Globe2,
      label: '180+ Countries',
      subText: 'Global Exam Syllabi',
      color: 'from-[#00D4FF] to-[#3B82F6]',
    },
    {
      icon: Brain,
      label: 'Millions of Questions',
      subText: 'High-Yield AI Q-Banks',
      color: 'from-[#6D5BFF] to-[#A855F7]',
    },
    {
      icon: Zap,
      label: 'AI Powered',
      subText: 'Real-time Reasoning',
      color: 'from-[#EC4899] to-[#8B5CF6]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 w-full max-w-3xl mx-auto pt-1 sm:pt-2">
      {statItems.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.65 + idx * 0.08 }}
            whileHover={{ scale: 1.02, y: -1 }}
            className="group relative p-2.5 sm:p-3 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-[#0E1324]/85 border border-slate-200/90 dark:border-[#6D5BFF]/30 backdrop-blur-xl shadow-sm hover:shadow-md hover:border-[#6D5BFF]/60 transition-all duration-300 text-left flex items-center gap-3"
          >
            <div className={`p-2 rounded-lg sm:rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-sm group-hover:rotate-6 transition-transform duration-300 shrink-0`}>
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-heading font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight truncate">
                {stat.label}
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-[#A6ADC8] truncate">
                {stat.subText}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
