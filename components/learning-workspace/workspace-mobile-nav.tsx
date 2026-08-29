'use client';

import React from 'react';
import {
  LayoutDashboard,
  BrainCircuit,
  BookOpen,
  Video,
  MoreHorizontal,
} from 'lucide-react';
import { WorkspaceTab } from './types';

interface WorkspaceMobileNavProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenMore?: () => void;
}

export function WorkspaceMobileNav({ activeTab, onSelectTab, onOpenMore }: WorkspaceMobileNavProps) {
  const items = [
    { id: 'dashboard' as WorkspaceTab, label: 'Home', icon: LayoutDashboard },
    { id: 'practice' as WorkspaceTab, label: 'Practice', icon: BrainCircuit },
    { id: 'notes' as WorkspaceTab, label: 'Study', icon: BookOpen },
    { id: 'tutor' as WorkspaceTab, label: 'AI Tutor', icon: Video },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-transform ${
                  isActive ? 'bg-indigo-50 dark:bg-indigo-950/80 scale-110 shadow-xs' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-bold">{item.label}</span>
            </button>
          );
        })}

        {/* More Button */}
        <button
          type="button"
          onClick={() => {
            if (onOpenMore) onOpenMore();
            else onSelectTab('radar');
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl transition-all cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium`}
        >
          <div className="p-1.5 rounded-xl">
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-bold">More</span>
        </button>
      </div>
    </nav>
  );
}

