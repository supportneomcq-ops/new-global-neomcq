'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  RotateCw,
  CheckCircle2,
  XCircle,
  Shuffle,
} from 'lucide-react';
import { StudySubTab, FlashcardItem } from './types';
import { useSelection } from '@/lib/context/selection-context';
import { OnboardingData } from '@/components/onboarding-flow';
import { StickyBoardWorkspaceView } from './sticky-board-workspace-view';
import { ActiveRecallWorkspaceView } from '@/components/active-recall/active-recall-workspace-view';
import { A4NotebookViewer } from '@/components/notes-a4/a4-notebook-viewer';

interface StudyHubViewProps {
  user?: OnboardingData;
  initialSubTab?: StudySubTab;
}

const DEFAULT_FLASHCARDS: FlashcardItem[] = [
  {
    id: 'fc1',
    front: 'What is the most common electrocardiographic finding in acute pulmonary embolism?',
    back: 'Sinus tachycardia (most common overall). The classic S1Q3T3 pattern (prominent S wave in lead I, Q wave in lead III, inverted T wave in lead III) is specific but only present in <20% of patients.',
    category: 'Cardiopulmonary',
    difficulty: 'High Yield',
    status: 'unseen',
  },
  {
    id: 'fc2',
    front: 'Which cardiac enzyme rises first in acute myocardial infarction, and which remains elevated longest?',
    back: 'Myoglobin / Troponin I rises first (2-4 hours). Troponin I remains elevated longest (7-10 days). CK-MB returns to baseline in 48-72 hours, making it ideal to diagnose reinfarction.',
    category: 'Pathology',
    difficulty: 'Board Classic',
    status: 'unseen',
  },
  {
    id: 'fc3',
    front: 'What is Beck’s Triad, and what condition does it indicate?',
    back: '1. Hypotension\n2. Distended neck veins (elevated JVP)\n3. Muffled heart sounds\n\nIndicates Cardiac Tamponade. Pulsus paradoxus (>10 mmHg drop in SBP during inspiration) is also hallmark.',
    category: 'Clinical Triads',
    difficulty: 'High Yield',
    status: 'unseen',
  },
  {
    id: 'fc4',
    front: 'What is the first-line medication for rate control in atrial fibrillation with rapid ventricular response in patients with preserved ejection fraction?',
    back: 'Non-dihydropyridine Calcium Channel Blockers (Diltiazem, Verapamil) or Beta-blockers (Metoprolol). Note: Avoid in pre-excited AF (Wolff-Parkinson-White).',
    category: 'Pharmacology',
    difficulty: 'Core High Yield',
    status: 'unseen',
  },
];

const DEFAULT_STICKY_NOTES: StickyNoteItem[] = [
  {
    id: 'sn1',
    text: '💡 High Yield Rule: Inferior STEMI (II, III, aVF) -> RCA. Check V4R before nitrates!',
    color: 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100',
    pinned: true,
  },
  {
    id: 'sn2',
    text: '⚡ Cardiac Enzymes: CK-MB for re-infarction (48-72h normalizes), Troponin stays for 10 days.',
    color: 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100',
    pinned: true,
  },
  {
    id: 'sn3',
    text: '🎯 Beck Triad: Hypotension + JVD + Muffled heart sounds -> Tamponade.',
    color: 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100',
    pinned: false,
  },
];

const DEFAULT_REVISION_ITEMS = [
  {
    id: 'rev1',
    title: 'Acute Coronary Syndromes Triad',
    concept: 'STEMI requires immediate PCI within 90 minutes of door-to-balloon time. Thrombolysis is indicated if PCI is unavailable within 120 minutes.',
    blanks: ['90 minutes', 'Thrombolysis', '120 minutes'],
    pearl: 'Antiplatelet dual therapy (Aspirin + P2Y12 inhibitor) + Heparin is standard of care.',
  },
  {
    id: 'rev2',
    title: 'Heart Failure Diagnostic Biomarkers',
    concept: 'Elevated BNP and NT-proBNP reflect ventricular wall stress and distinguish cardiac dyspnea from pulmonary causes.',
    blanks: ['BNP', 'NT-proBNP', 'ventricular wall stress'],
    pearl: 'Neprilysin inhibitors (Sacubitril) increase BNP; use NT-proBNP for monitoring when patient is on ARNI.',
  },
  {
    id: 'rev3',
    title: 'Infective Endocarditis Duke Criteria',
    concept: 'Major criteria include bacteremia with typical organisms in 2 separate blood cultures and echocardiographic evidence of endocardial involvement (vegetation/abscess).',
    blanks: ['bacteremia', 'blood cultures', 'echocardiographic evidence', 'vegetation'],
    pearl: 'Staph aureus is most common acute cause; Strep viridans is most common subacute cause on damaged native valves.',
  },
];

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
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>(DEFAULT_FLASHCARDS);
  const [fcIndex, setFcIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [fcFilter, setFcFilter] = useState<'all' | 'revision' | 'mastered'>('all');

  // Sticky Notes State
  const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>(DEFAULT_STICKY_NOTES);
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
              {selection.topic?.name || 'Coronary Artery Disease'}
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
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Deck Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setFcFilter('all');
                  setFcIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  fcFilter === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All ({flashcards.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFcFilter('revision');
                  setFcIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  fcFilter === 'revision' ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Repeat ({flashcards.filter((c) => c.status === 'revision').length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFcFilter('mastered');
                  setFcIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  fcFilter === 'mastered' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Mastered ({flashcards.filter((c) => c.status === 'mastered').length})
              </button>
            </div>

            {/* Shuffle & Progress */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleShuffleCards}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" /> Shuffle
              </button>

              <span className="font-bold text-slate-700 dark:text-slate-300">
                Card {fcIndex + 1} of {Math.max(1, filteredCards.length)}
              </span>
            </div>
          </div>

          {/* The Physical Card Container with 3D Flip */}
          {currentCard ? (
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative min-h-[300px] sm:min-h-[340px] rounded-3xl p-8 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col justify-between select-none"
            >
              {/* Card Top Pill */}
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px]">
                  {currentCard.category || 'High-Yield Concept'}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                  <RotateCw className="w-3.5 h-3.5" /> Click to {isFlipped ? 'Show Question' : 'Reveal Answer'}
                </span>
              </div>

              {/* Card Body */}
              <div className="py-6 my-auto text-center space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  {isFlipped ? 'Answer & High Yield Mnemonic' : 'Active Recall Prompt'}
                </span>
                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed max-w-lg mx-auto whitespace-pre-line">
                  {isFlipped ? currentCard.back : currentCard.front}
                </div>
              </div>

              {/* Card Footer Indicator */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="font-semibold">{currentCard.difficulty || 'High Yield'}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {isFlipped ? 'Back Side' : 'Front Side'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              No flashcards in this filter category.
            </div>
          )}

          {/* Leitner Spaced Repetition Rating Buttons */}
          {currentCard && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleRateCard('revision')}
                className="py-3 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-amber-500" /> Hard / Needs Revision (Repeat)
              </button>

              <button
                type="button"
                onClick={() => handleRateCard('mastered')}
                className="py-3 px-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Good / Mastered Concept
              </button>
            </div>
          )}
        </div>
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
