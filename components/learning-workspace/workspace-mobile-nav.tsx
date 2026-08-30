'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  BrainCircuit,
  Target,
  BookOpen,
  Video,
  MoreHorizontal,
  Layers,
  FileText,
  StickyNote,
  Puzzle,
  TrendingUp,
  Calendar,
  Bookmark,
  X,
} from 'lucide-react';
import { WorkspaceTab, StudySubTab } from './types';

interface WorkspaceMobileNavProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab, subTab?: StudySubTab) => void;
}

export function WorkspaceMobileNav({ activeTab, onSelectTab }: WorkspaceMobileNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const primaryItems = [
    { id: 'dashboard' as WorkspaceTab, label: 'Home', icon: LayoutDashboard },
    { id: 'practice' as WorkspaceTab, label: 'MCQs', icon: BrainCircuit },
    { id: 'quizzes' as WorkspaceTab, label: 'Quizzes', icon: Target },
    { id: 'notes' as WorkspaceTab, subTab: 'notes' as StudySubTab, label: 'Study', icon: BookOpen },
    { id: 'tutor' as WorkspaceTab, label: 'AI Tutor', icon: Video },
  ];

  const moreItems = [
    { id: 'flashcards' as WorkspaceTab, subTab: 'flashcards' as StudySubTab, label: 'Flashcards', icon: Layers, desc: '3D interactive spaced-repetition cards' },
    { id: 'notes' as WorkspaceTab, subTab: 'notes' as StudySubTab, label: 'Notes (A4)', icon: FileText, desc: 'High-yield A4 structured exam notes' },
    { id: 'sticky' as WorkspaceTab, subTab: 'sticky' as StudySubTab, label: 'Sticky Notes', icon: StickyNote, desc: 'Custom colored sticky board notes' },
    { id: 'blanks' as WorkspaceTab, subTab: 'blanks' as StudySubTab, label: 'Fill in Blanks', icon: Puzzle, desc: 'Active recall cloze deletion drills' },
    { id: 'radar' as WorkspaceTab, label: 'Analytics', icon: TrendingUp, desc: 'Weakness radar & performance analytics' },
    { id: 'plan' as WorkspaceTab, label: 'Study Plan', icon: Calendar, desc: 'Personalized study schedule & countdown' },
    { id: 'saved' as WorkspaceTab, label: 'Bookmarks', icon: Bookmark, desc: 'Saved questions, notes & high-yield pearls' },
  ];

  const handleSelect = (tab: WorkspaceTab, subTab?: StudySubTab) => {
    onSelectTab(tab, subTab);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Fixed Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-1.5 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl transition-all">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && (!item.subTab || activeTab === item.id);
            return (
              <button
                key={item.id + (item.subTab || '')}
                type="button"
                onClick={() => handleSelect(item.id, item.subTab)}
                className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] px-1.5 py-1 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-transform ${
                    isActive ? 'bg-indigo-50 dark:bg-indigo-950/80 scale-105 shadow-xs' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight font-bold">{item.label}</span>
              </button>
            );
          })}

          {/* More Sheet Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] px-1.5 py-1 rounded-xl transition-all cursor-pointer ${
              isMoreOpen
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${isMoreOpen ? 'bg-indigo-50 dark:bg-indigo-950/80' : ''}`}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-bold">More</span>
          </button>
        </div>
      </nav>

      {/* More Bottom Sheet Drawer */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white dark:bg-slate-950 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl max-h-[80vh] overflow-y-auto z-10">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-800 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Workspace Features</h3>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleSelect(item.id, item.subTab)}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold tracking-tight">{item.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
