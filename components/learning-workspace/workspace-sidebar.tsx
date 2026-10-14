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
  TrendingUp,
  Calendar,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { WorkspaceTab, StudySubTab } from './types';
import { useSelection } from '@/lib/context/selection-context';
import { OnboardingData } from '@/components/onboarding-flow';

interface WorkspaceSidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab, subTab?: StudySubTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  questionCount?: number;
  quizCount?: number;
  flashcardCount?: number;
  user?: OnboardingData;
  onOpenExamSwitch?: () => void;
}

export function WorkspaceSidebar({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  user,
  onOpenExamSwitch,
}: WorkspaceSidebarProps) {
  const { selection } = useSelection();

  const navItems = [
    {
      id: 'dashboard' as WorkspaceTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'practice' as WorkspaceTab,
      label: 'Practice MCQs',
      icon: BrainCircuit,
    },
    {
      id: 'quizzes' as WorkspaceTab,
      label: 'Quizzes',
      icon: Target,
    },
    {
      id: 'flashcards' as WorkspaceTab,
      label: 'Flashcards',
      icon: Layers,
    },
    {
      id: 'notes' as WorkspaceTab,
      label: 'Study Notes',
      icon: FileText,
    },
    {
      id: 'sticky' as WorkspaceTab,
      label: 'Sticky Notes',
      icon: StickyNote,
    },
    {
      id: 'blanks' as WorkspaceTab,
      label: 'Fill in the Blanks',
      icon: Puzzle,
    },
    {
      id: 'tutor' as WorkspaceTab,
      label: 'AI Tutor',
      icon: Sparkles,
      hasAiBadge: true,
    },
    {
      id: 'plan' as WorkspaceTab,
      label: 'Study Plan',
      icon: Calendar,
    },
    {
      id: 'radar' as WorkspaceTab,
      label: 'Analytics',
      icon: TrendingUp,
    },
    {
      id: 'saved' as WorkspaceTab,
      label: 'Bookmarks',
      icon: Bookmark,
    },
  ];

  const examName = selection.exam?.name || user?.examName || 'AWS Certified Solutions Architect Associate';

  return (
    <aside
      className={`hidden lg:flex flex-col justify-between border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0E1324] transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto neo-scrollbar select-none z-30`}
    >
      {/* Top Nav List */}
      <div className="p-3 space-y-1">
        {/* Collapse button row */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-end'} px-1 pb-1`}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary 11 Navigation Items */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                } py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate tracking-tight">{item.label}</span>
                  )}
                </div>

                {!isCollapsed && item.hasAiBadge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50'
                    }`}
                  >
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: My Exam Card with Change Button */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">
              My Exam
            </span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 leading-snug line-clamp-2">
              {examName}
            </p>
            <button
              type="button"
              onClick={onOpenExamSwitch}
              className="mt-3 w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-center block shadow-2xs"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-200/80 dark:border-slate-800 flex justify-center">
          <button
            type="button"
            onClick={onOpenExamSwitch}
            className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            title={`Active Exam: ${examName} (Click to change)`}
          >
            <BrainCircuit className="w-5 h-5" />
          </button>
        </div>
      )}
    </aside>
  );
}
