'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Globe2, Brain, Users, Sparkles } from 'lucide-react';

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
      icon: Users,
      label: '5 Million+ Active Users',
      subText: 'Students & Professionals',
      color: 'from-[#EC4899] to-[#8B5CF6]',
    },
    {
      icon: Sparkles,
      label: 'AI Powered',
      subText: 'Real-time Explanations',
      color: 'from-[#3B82F6] to-[#00D4FF]',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-5xl mx-auto pt-6">
      {statItems.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 + idx * 0.1 }}
            whileHover={{ scale: 1.03, y: -2 }}
            className="group relative p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-[#0E1324]/85 border border-slate-200 dark:border-[#6D5BFF]/30 backdrop-blur-xl shadow-md hover:shadow-xl hover:border-[#6D5BFF]/60 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md group-hover:rotate-6 transition-transform duration-300 shrink-0`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-heading font-extrabold text-xs sm:text-sm md:text-base text-slate-900 dark:text-white tracking-tight truncate">
                  {stat.label}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-[#A6ADC8] truncate">
                  {stat.subText}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
