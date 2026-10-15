'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { StudySubTab } from './types';
import { useSelection } from '@/lib/context/selection-context';
import type { OnboardingData } from '@/components/onboarding-flow';
import { StickyBoardWorkspaceView } from './sticky-board-workspace-view';
import { ActiveRecallWorkspaceView } from '@/components/active-recall/active-recall-workspace-view';
import { A4NotebookViewer } from '@/components/notes-a4/a4-notebook-viewer';
import { FlashcardWorkspaceView } from './flashcard-workspace-view';

interface StudyHubViewProps {
  user?: OnboardingData;
  initialSubTab?: StudySubTab;
}

const subTabs: { id: StudySubTab; label: string }[] = [
  { id: 'notes', label: '📄 A4 Notes' },
  { id: 'flashcards', label: '🃏 Flashcards' },
  { id: 'sticky', label: '📌 Sticky Board' },
  { id: 'revision', label: '⚡ Active Recall' },
];

export function StudyHubView({ user, initialSubTab = 'notes' }: StudyHubViewProps) {
  const { selection } = useSelection();
  const [activeSubTab, setActiveSubTab] = useState<StudySubTab>(initialSubTab);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
              <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Study Suite &amp; Active Recall
            </h2>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
              {selection.topic?.name || 'Select a topic'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Topic-specific notes, flashcards, revision, and sticky notes.
          </p>
        </div>
        <nav aria-label="Study tools" className="flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              aria-pressed={activeSubTab === tab.id}
              className={`rounded-xl px-3 py-2 transition-colors ${activeSubTab === tab.id
                ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {activeSubTab === 'notes' && <A4NotebookViewer onBookmark={setIsBookmarked} />}
      {activeSubTab === 'flashcards' && <FlashcardWorkspaceView />}
      {activeSubTab === 'sticky' && <StickyBoardWorkspaceView user={user} />}
      {(activeSubTab === 'revision' || activeSubTab === 'blanks') && <ActiveRecallWorkspaceView user={user} />}

      <span className="sr-only" aria-live="polite">{isBookmarked ? 'Note bookmarked' : ''}</span>
    </div>
  );
}
