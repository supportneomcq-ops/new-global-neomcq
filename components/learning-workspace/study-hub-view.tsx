'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  RotateCw,
  CheckCircle2,
  XCircle,
  Shuffle,
} from 'lucide-react';
import { StudySubTab, FlashcardItem, StickyNoteItem } from './types';
import { useSelection } from '@/lib/context/selection-context';
import { useTopicContent } from '@/lib/context/topic-content-context';
import { OnboardingData } from '@/components/onboarding-flow';
import { StickyBoardWorkspaceView } from './sticky-board-workspace-view';
import { ActiveRecallWorkspaceView } from '@/components/active-recall/active-recall-workspace-view';
import { A4NotebookViewer } from '@/components/notes-a4/a4-notebook-viewer';
import { FlashcardWorkspaceView } from './flashcard-workspace-view';

interface StudyHubViewProps {
  user?: OnboardingData;
  initialSubTab?: StudySubTab;
}

const DEFAULT_FLASHCARDS: FlashcardItem[] = [];

const DEFAULT_STICKY_NOTES: StickyNoteItem[] = [];

const DEFAULT_REVISION_ITEMS = [];

export function StudyHubView({ user, initialSubTab = 'notes' }: StudyHubViewProps) {
  const { selection } = useSelection();
  const { content } = useTopicContent();

  // Sub-tab: 'notes' | 'flashcards' | 'sticky' | 'revision'
  const [activeSubTab, setActiveSubTab] = useState<StudySubTab>(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // A4 Notes State
  const [notesSearch, setNotesSearch] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Flashcards State
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [fcIndex, setFcIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [fcFilter, setFcFilter] = useState<'all' | 'revision' | 'mastered'>('all');

  // Sticky Notes State
  const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([]);
  const [newStickyText, setNewStickyText] = useState('');
  const [newStickyColor, setNewStickyColor] = useState('amber');

  // Revision Sheets State (Active recall fill-in-the-blanks)
  const [activeRecallMode, setActiveRecallMode] = useState(true);
  const [revealedBlanks, setRevealedBlanks] = useState<Record<string, boolean>>({});

  // Synchronize when topic content changes
  React.useEffect(() => {
    if (content?.flashcards && content.flashcards.length > 0) {
      setFlashcards(
        content.flashcards.map((f, idx) => ({
          id: f.id || `fc_${idx}`,
          front: f.front,
          back: f.back,
          category: f.category || selection.subject?.name || 'Cardiology',
          difficulty: f.difficulty || 'High Yield',
          status: 'unseen',
        }))
      );
      setFcIndex(0);
      setIsFlipped(false);
    }

    if (content?.sticky_notes && content.sticky_notes.length > 0) {
      setStickyNotes(
        content.sticky_notes.map((s, idx) => {
          let colorStyle = 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100';
          if (s.color === 'emerald') {
            colorStyle = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100';
          } else if (s.color === 'indigo') {
            colorStyle = 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100';
          } else if (s.color === 'rose') {
            colorStyle = 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100';
          }
          return {
            id: s.id || `sn_${idx}`,
            text: s.text,
            color: colorStyle,
            pinned: !!s.pinned,
          };
        })
      );
    }
  }, [content, selection.subject?.name]);

  const filteredCards = flashcards.filter((card) => {
    if (fcFilter === 'mastered') return card.status === 'mastered';
    if (fcFilter === 'revision') return card.status === 'revision';
    return true;
  });

  const currentCard = filteredCards[fcIndex] || filteredCards[0];

  const handleRateCard = (status: 'mastered' | 'revision') => {
    if (!currentCard) return;
    setFlashcards((prev) =>
      prev.map((c) => (c.id === currentCard.id ? { ...c, status } : c))
    );
    setIsFlipped(false);
    if (fcIndex < filteredCards.length - 1) {
      setFcIndex((prev) => prev + 1);
    } else {
      setFcIndex(0);
    }
  };

  const handleShuffleCards = () => {
    setFlashcards((prev) => [...prev].sort(() => Math.random() - 0.5));
    setFcIndex(0);
    setIsFlipped(false);
  };

  // Sticky Notes handlers
  const handleAddSticky = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStickyText.trim()) return;

    let colorStyle = 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100';
    if (newStickyColor === 'emerald') {
      colorStyle = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100';
    } else if (newStickyColor === 'indigo') {
      colorStyle = 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100';
    } else if (newStickyColor === 'rose') {
      colorStyle = 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100';
    }

    const note: StickyNoteItem = {
      id: `sn_${Date.now()}`,
      text: newStickyText.trim(),
      color: colorStyle,
      pinned: false,
    };

    setStickyNotes((prev) => [note, ...prev]);
    setNewStickyText('');
  };

  const handleTogglePin = (id: string) => {
    setStickyNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  };

  const handleDeleteSticky = (id: string) => {
    setStickyNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleToggleBlank = (key: string) => {
    setRevealedBlanks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Study Hub Header & Sub-nav Pills */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Study Suite & Active Recall</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {selection.topic?.name || 'Select a topic'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Structured high-yield notes, physical flashcards, active recall sheets & sticky notes.
          </p>
        </div>

        {/* 4 Tool Sub-Navigation Pills */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700">
          {[
            { id: 'notes' as StudySubTab, label: '📄 A4 Notes' },
            { id: 'flashcards' as StudySubTab, label: '🃏 Flashcards' },
            { id: 'sticky' as StudySubTab, label: '📌 Sticky Board' },
            { id: 'revision' as StudySubTab, label: '⚡ Active Recall' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. A4 HANDWRITTEN NOTES VIEW */}
      {activeSubTab === 'notes' && (
        <A4NotebookViewer onBookmark={setIsBookmarked} />
      )}

      {/* 2. 3D PHYSICAL FLASHCARDS VIEW */}
      {activeSubTab === 'flashcards' && (
        <FlashcardWorkspaceView />
      )}

      {/* 3. STICKY NOTES CORKBOARD VIEW */}
      {activeSubTab === 'sticky' && (
        <StickyBoardWorkspaceView user={user} />
      )}

      {/* 4. ACTIVE RECALL SYSTEM (FILL IN THE BLANKS) */}
      {(activeSubTab === 'revision' || activeSubTab === 'blanks') && (
        <ActiveRecallWorkspaceView user={user} />
      )}
    </div>
  );
}
