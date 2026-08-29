'use client';

import React from 'react';
import {
  LayoutDashboard,
  BrainCircuit,
  Target,
  Layers,
  FileText,
  StickyNote,
  Puzzle,
  Video,
  TrendingUp,
  Calendar,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { WorkspaceTab } from './types';

interface WorkspaceSidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  questionCount?: number;
}

export function WorkspaceSidebar({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  questionCount = 40,
}: WorkspaceSidebarProps) {
  const navItems = [
    {
      id: 'dashboard' as WorkspaceTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'practice' as WorkspaceTab,
      label: 'MCQ Practice',
      icon: BrainCircuit,
      badge: `${questionCount} Qs`,
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
    },
    {
      id: 'quizzes' as WorkspaceTab,
      label: 'Quizzes',
      icon: Target,
      badge: '20 Qs',
      badgeColor: 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
    },
    {
      id: 'flashcards' as WorkspaceTab,
      label: 'Flashcards',
      icon: Layers,
      badge: null,
    },
    {
      id: 'notes' as WorkspaceTab,
      label: 'Notes (A4)',
      icon: FileText,
      badge: null,
    },
    {
      id: 'sticky' as WorkspaceTab,
      label: 'Sticky Notes',
      icon: StickyNote,
      badge: null,
    },
    {
      id: 'blanks' as WorkspaceTab,
      label: 'Fill in Blanks',
      icon: Puzzle,
      badge: null,
    },
    {
      id: 'tutor' as WorkspaceTab,
      label: 'AI Tutor (Video)',
      icon: Video,
      badge: 'Video',
      badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    },
    {
      id: 'radar' as WorkspaceTab,
      label: 'Analytics',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'plan' as WorkspaceTab,
      label: 'Study Plan',
      icon: Calendar,
      badge: null,
    },
    {
      id: 'saved' as WorkspaceTab,
      label: 'Bookmarks',
      icon: Bookmark,
      badge: null,
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto`}
    >
      {/* Top Nav List */}
      <div className="p-3 space-y-1">
        {/* Header & Collapse toggle */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2 py-2 mb-2`}>
          {!isCollapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Workspace Nav
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation buttons */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
              } py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                {!isCollapsed && <span className="truncate font-semibold">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold shrink-0 ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer info in sidebar */}
      {!isCollapsed && (
        <div className="p-4 m-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200">High-Yield Medical OS</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Canonical asset engine active.</p>
        </div>
      )}
    </aside>
  );
}

