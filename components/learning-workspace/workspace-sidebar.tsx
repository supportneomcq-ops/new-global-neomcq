'use client';

import React from 'react';
import {
  LayoutDashboard,
  BrainCircuit,
  BookOpen,
  GraduationCap,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { WorkspaceTab } from './types';
import { useSelection } from '@/lib/context/selection-context';

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
  questionCount = 20,
}: WorkspaceSidebarProps) {
  const { selection } = useSelection();

  const navItems = [
    {
      id: 'dashboard' as WorkspaceTab,
      label: 'Dashboard',
      description: 'Home learning hub',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'practice' as WorkspaceTab,
      label: 'Practice',
      description: 'CBT Q-Bank & Exam Simulation',
      icon: BrainCircuit,
      badge: questionCount > 0 ? `${questionCount} Qs` : 'Active',
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    },
    {
      id: 'study' as WorkspaceTab,
      label: 'Study Hub',
      description: 'Notes, Flashcards & Revision',
      icon: BookOpen,
      badge: '4 Tools',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    },
    {
      id: 'tutor' as WorkspaceTab,
      label: 'AI Tutor',
      description: 'Whiteboard & Case Reasoning',
      icon: GraduationCap,
      badge: 'Interactive',
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    },
    {
      id: 'radar' as WorkspaceTab,
      label: 'Weakness Radar',
      description: 'Mastery & Accuracy Analytics',
      icon: TrendingUp,
      badge: null,
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } shrink-0`}
    >
      {/* Top Nav List */}
      <div className="p-3 space-y-1">
        {/* Collapse toggle */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2 py-2 mb-2`}>
          {!isCollapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/80 dark:border-indigo-800/80 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title={item.label}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold truncate leading-tight">{item.label}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Topic Focus Card */}
      {!isCollapsed && (
        <div className="p-4 m-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Active Topic Focus</span>
          </div>

          <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
            {selection.topic?.name || 'Coronary Artery Disease'}
          </div>

          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
            {selection.subject?.name || 'Cardiovascular System'}
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3 h-3" /> Ready
            </span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">High Yield</span>
          </div>
        </div>
      )}
    </aside>
  );
}
