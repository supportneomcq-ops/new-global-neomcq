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
  Sparkles,
} from 'lucide-react';
import { WorkspaceTab } from './types';

interface WorkspaceSidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  questionCount?: number;
  quizCount?: number;
  flashcardCount?: number;
}

interface NavSection {
  label: string;
  items: Array<{
    id: WorkspaceTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number | null;
    badgeStyle?: string;
  }>;
}

export function WorkspaceSidebar({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  questionCount,
  quizCount,
  flashcardCount,
}: WorkspaceSidebarProps) {
  const sections: NavSection[] = [
    {
      label: 'Core Workspace',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'practice',
          label: 'MCQ Practice',
          icon: BrainCircuit,
          badge: questionCount && questionCount > 0 ? questionCount : null,
          badgeStyle: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        },
        {
          id: 'quizzes',
          label: 'Formal Quizzes',
          icon: Target,
          badge: quizCount && quizCount > 0 ? quizCount : null,
          badgeStyle: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
        },
      ],
    },
    {
      label: 'Active Recall & Notes',
      items: [
        {
          id: 'flashcards',
          label: 'Flashcards',
          icon: Layers,
          badge: flashcardCount && flashcardCount > 0 ? flashcardCount : null,
          badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        },
        {
          id: 'notes',
          label: 'Notes (A4)',
          icon: FileText,
          badge: null,
        },
        {
          id: 'sticky',
          label: 'Sticky Board',
          icon: StickyNote,
          badge: null,
        },
        {
          id: 'blanks',
          label: 'Fill in Blanks',
          icon: Puzzle,
          badge: null,
        },
      ],
    },
    {
      label: 'Performance & Plan',
      items: [
        {
          id: 'tutor',
          label: 'AI Tutor',
          icon: Video,
          badge: 'Interactive',
          badgeStyle: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 font-extrabold',
        },
        {
          id: 'radar',
          label: 'Weakness Radar',
          icon: TrendingUp,
          badge: null,
        },
        {
          id: 'plan',
          label: 'Study Plan',
          icon: Calendar,
          badge: null,
        },
        {
          id: 'saved',
          label: 'Saved Bookmarks',
          icon: Bookmark,
          badge: null,
        },
      ],
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#070b18] transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto neo-scrollbar`}
    >
      {/* Top Nav List */}
      <div className="p-3 space-y-5">
        {/* Collapse toggle row */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2 py-1`}>
          {!isCollapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Workspace
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

        {/* Navigation Sections */}
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative group ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                          isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate font-semibold tracking-tight">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badgeStyle || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer info in sidebar */}
      {!isCollapsed && (
        <div className="p-3.5 m-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900/90 dark:to-indigo-950/30 border border-slate-200/80 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Yield Engine</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
            Adaptive active recall with syllabus-synced blueprint.
          </p>
        </div>
      )}
    </aside>
  );
}
