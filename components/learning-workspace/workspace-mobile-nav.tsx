'use client';

import React from 'react';
import {
  House,
  ClipboardList,
  BookOpen,
  BarChart3,
  User,
} from 'lucide-react';
import { WorkspaceTab, StudySubTab } from './types';

interface WorkspaceMobileNavProps {
  activeTab: WorkspaceTab;
  studySubTab?: StudySubTab;
  onSelectTab: (tab: WorkspaceTab, subTab?: StudySubTab) => void;
  onOpenSettings?: () => void;
}

export function WorkspaceMobileNav({
  activeTab,
  onSelectTab,
  onOpenSettings,
}: WorkspaceMobileNavProps) {
  const items = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: House,
      action: () => onSelectTab('dashboard'),
      isActive: activeTab === 'dashboard',
    },
    {
      id: 'practice',
      label: 'Practice',
      icon: ClipboardList,
      action: () => onSelectTab('practice'),
      isActive: activeTab === 'practice',
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: BookOpen,
      action: () => onSelectTab('notes', 'notes'),
      isActive:
        activeTab === 'notes' ||
        activeTab === 'sticky' ||
        activeTab === 'blanks' ||
        activeTab === 'flashcards',
    },
    {
      id: 'radar',
      label: 'Analytics',
      icon: BarChart3,
      action: () => onSelectTab('radar'),
      isActive: activeTab === 'radar',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      action: () => onOpenSettings?.(),
      isActive: false,
    },
  ];

  return (
    <nav
      id="global-mobile-bottom-nav"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0E1324]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-lg transition-colors select-none"
      aria-label="Mobile bottom navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[11px] mt-1 tracking-tight leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
