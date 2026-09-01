'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  House,
  Brain,
  ClipboardCheck,
  Sparkles,
  Grid2X2,
  Layers,
  FileText,
  StickyNote,
  Puzzle,
  TrendingUp,
  Calendar,
  Bookmark,
  Settings,
  X,
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
  studySubTab,
  onSelectTab,
  onOpenSettings,
}: WorkspaceMobileNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Close More menu when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreOpen(false);
      }
    };
    if (isMoreOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreOpen]);

  const primaryItems = [
    { id: 'dashboard' as WorkspaceTab, label: 'Home', icon: House, ariaLabel: 'Go to home dashboard' },
    { id: 'practice' as WorkspaceTab, label: 'MCQ', icon: Brain, ariaLabel: 'Go to MCQ practice' },
    { id: 'quizzes' as WorkspaceTab, label: 'Quiz', icon: ClipboardCheck, ariaLabel: 'Go to quizzes' },
    { id: 'tutor' as WorkspaceTab, label: 'Tutor', icon: Sparkles, ariaLabel: 'Go to AI tutor' },
  ];

  const moreItems = [
    {
      id: 'notes' as WorkspaceTab,
      subTab: 'flashcards' as StudySubTab,
      label: 'Flashcards',
      icon: Layers,
      ariaLabel: 'View flashcards deck',
    },
    {
      id: 'notes' as WorkspaceTab,
      subTab: 'notes' as StudySubTab,
      label: 'Notes',
      icon: FileText,
      ariaLabel: 'Read high-yield notes',
    },
    {
      id: 'notes' as WorkspaceTab,
      subTab: 'sticky' as StudySubTab,
      label: 'Sticky Notes',
      icon: StickyNote,
      ariaLabel: 'Open sticky notes board',
    },
    {
      id: 'notes' as WorkspaceTab,
      subTab: 'blanks' as StudySubTab,
      label: 'Fill in Blanks',
      icon: Puzzle,
      ariaLabel: 'Practice fill in the blanks cloze drills',
    },
    {
      id: 'radar' as WorkspaceTab,
      label: 'Analytics',
      icon: TrendingUp,
      ariaLabel: 'View performance analytics and weakness radar',
    },
    {
      id: 'plan' as WorkspaceTab,
      label: 'Study Plan',
      icon: Calendar,
      ariaLabel: 'View study plan and countdown calendar',
    },
    {
      id: 'saved' as WorkspaceTab,
      label: 'Bookmarks',
      icon: Bookmark,
      ariaLabel: 'View bookmarked and saved content',
    },
    {
      id: 'profile' as WorkspaceTab,
      label: 'Settings',
      icon: Settings,
      ariaLabel: 'Open profile and application settings',
      isSettings: true,
    },
  ];

  const handlePrimarySelect = (id: WorkspaceTab) => {
    setIsMoreOpen(false);
    onSelectTab(id);
  };

  const handleMoreSelect = (item: typeof moreItems[0]) => {
    setIsMoreOpen(false);
    if (item.isSettings) {
      onOpenSettings?.();
    } else {
      onSelectTab(item.id, item.subTab);
    }
  };

  // More is active if current tab is any of the More items
  const isMoreActive = ['notes', 'radar', 'plan', 'saved'].includes(activeTab);

  return (
    <>
      {/* Invisible Outside Click Backdrop overlay */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden"
          onClick={() => setIsMoreOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Viewport-fixed Mobile Navigation Bar */}
      <nav
        id="global-mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0F19]/90 dark:bg-[#070B19]/95 backdrop-blur-2xl border-t border-slate-200/10 dark:border-slate-800/80 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl transition-all"
        aria-label="Global mobile navigation"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto relative">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePrimarySelect(item.id)}
                aria-label={item.ariaLabel}
                aria-current={isItemActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-w-[60px] min-h-[48px] px-1 py-1 rounded-2xl transition-all cursor-pointer ${
                  isItemActive
                    ? 'text-[#6D5BFF] dark:text-indigo-400 font-extrabold scale-102'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-200 font-medium'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isItemActive ? 'bg-indigo-500/10 shadow-inner' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight font-semibold">{item.label}</span>
                {isItemActive && (
                  <span className="absolute bottom-0 w-1.5 h-1.5 bg-[#6D5BFF] dark:bg-indigo-400 rounded-full" />
                )}
              </button>
            );
          })}

          {/* More Menu Item Toggle */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            aria-label="Toggle more application options"
            aria-haspopup="true"
            aria-expanded={isMoreOpen}
            className={`flex flex-col items-center justify-center min-w-[60px] min-h-[48px] px-1 py-1 rounded-2xl transition-all cursor-pointer relative ${
              isMoreActive || isMoreOpen
                ? 'text-[#6D5BFF] dark:text-indigo-400 font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-200 font-medium'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isMoreActive || isMoreOpen ? 'bg-indigo-500/10 shadow-inner' : ''
              }`}
            >
              <Grid2X2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-semibold">More</span>
            {isMoreActive && (
              <span className="absolute bottom-0 w-1.5 h-1.5 bg-[#6D5BFF] dark:bg-indigo-400 rounded-full" />
            )}
          </button>

          {/* More Floating Card Menu Container */}
          <AnimatePresence>
            {isMoreOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ originX: 0.9, originY: 1 }}
                className="absolute bottom-[calc(100%+0.75rem)] right-2 z-50 w-64 max-w-[calc(100vw-1.5rem)] bg-[#0B0F19]/98 dark:bg-[#070B19]/98 border border-slate-200/10 dark:border-slate-800/80 backdrop-blur-3xl shadow-2xl rounded-3xl p-3 flex flex-col gap-1 overflow-hidden"
              >
                {/* floating menu head */}
                <div className="flex items-center justify-between px-2 pb-1.5 border-b border-slate-200/5 dark:border-slate-800/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Workspace Apps
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMoreOpen(false)}
                    aria-label="Close menu"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/45 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* menu list */}
                <div className="space-y-0.5 max-h-[60vh] overflow-y-auto pr-0.5">
                  {moreItems.map((item) => {
                    const Icon = item.icon;
                    // Determine if this secondary option is active
                    const isSubActive =
                      activeTab === item.id &&
                      (!item.subTab || studySubTab === item.subTab);

                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleMoreSelect(item)}
                        aria-label={item.ariaLabel}
                        className={`w-full flex items-center gap-3 py-2 px-3 rounded-2xl text-left border transition-all cursor-pointer ${
                          isSubActive
                            ? 'bg-indigo-600/15 border-indigo-500/30 text-[#6D5BFF] dark:text-indigo-400 font-bold'
                            : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800/45 hover:text-white'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isSubActive
                              ? 'bg-indigo-600/20 text-[#6D5BFF] dark:text-indigo-400'
                              : 'bg-slate-800/40 text-slate-400 group-hover:text-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </>
  );
}
