import React from 'react';
import { Globe2, Brain, Zap } from 'lucide-react';

export function Stats() {
  const statItems = [
    {
      icon: Globe2,
      value: '180+',
      label: 'Countries',
      subText: 'Global Syllabi',
      color: 'from-[#00D4FF] to-[#3B82F6]',
    },
    {
      icon: Brain,
      value: '10M+',
      label: 'Questions',
      subText: 'High-Yield Q-Bank',
      color: 'from-[#6D5BFF] to-[#A855F7]',
    },
    {
      icon: Zap,
      value: 'Real-Time',
      label: 'AI Tutor',
      subText: 'Step-by-Step',
      color: 'from-[#EC4899] to-[#8B5CF6]',
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto pt-1">
      <div className="relative p-1.5 sm:p-2 rounded-2xl sm:rounded-full bg-white/95 dark:bg-[#0E1324]/90 border border-slate-200/90 dark:border-[#6D5BFF]/30 backdrop-blur-2xl shadow-lg shadow-black/5 dark:shadow-[#6D5BFF]/10 grid grid-cols-3 gap-1 sm:gap-2 items-center">
        {statItems.map((stat, idx) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-3 p-1.5 sm:p-2 px-1 sm:px-3 rounded-xl sm:rounded-full hover:bg-slate-100/80 dark:hover:bg-white/5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group min-w-0"
            >
              {/* Icon Container */}
              <div
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-sm group-hover:scale-105 transition-transform shrink-0 flex items-center justify-center`}
              >
                <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>

              {/* Text Content */}
              <div className="text-left min-w-0 flex-1">
                <div className="flex items-baseline gap-1 flex-wrap sm:flex-nowrap">
                  <span className={`font-heading font-black text-[11px] sm:text-xs md:text-sm text-transparent bg-clip-text bg-gradient-to-r ${stat.color} shrink-0`}>
                    {stat.value}
                  </span>
                  <span className="font-heading font-bold text-[10px] sm:text-xs text-slate-800 dark:text-gray-100 truncate">
                    {stat.label}
                  </span>
                </div>
                <div className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-[#A6ADC8] truncate hidden xs:block sm:block">
                  {stat.subText}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
