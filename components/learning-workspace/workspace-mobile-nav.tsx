'use client';

import React from 'react';
import {
  LayoutDashboard,
  BrainCircuit,
  BookOpen,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';
import { WorkspaceTab } from './types';

interface WorkspaceMobileNavProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
}

export function WorkspaceMobileNav({ activeTab, onSelectTab }: WorkspaceMobileNavProps) {
  const items = [
    { id: 'dashboard' as WorkspaceTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'practice' as WorkspaceTab, label: 'Practice', icon: BrainCircuit },
    { id: 'study' as WorkspaceTab, label: 'Study', icon: BookOpen },
    { id: 'tutor' as WorkspaceTab, label: 'AI Tutor', icon: GraduationCap },
    { id: 'radar' as WorkspaceTab, label: 'Radar', icon: TrendingUp },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 pb-safe shadow-lg">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-transform ${
                  isActive ? 'bg-indigo-50 dark:bg-indigo-950/80 scale-110' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
