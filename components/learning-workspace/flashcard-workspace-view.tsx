'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RotateCw,
  CheckCircle2,
  XCircle,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Layers,
  Sparkles,
  ArrowLeft,
  Clock,
  BarChart3,
  BookOpen,
  Volume2,
  Image as ImageIcon,
  Flame,
  Award,
  HelpCircle,
} from 'lucide-react';
import { useSelection } from '@/lib/context/selection-context';
import { useTopicContent } from '@/lib/context/topic-content-context';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: string;
  explanation?: string;
  clinical_pearl?: string;
  media_url?: string;
  status?: 'mastered' | 'revision' | 'unseen';
  bookmarked?: boolean;
}

export interface FlashcardSet {
  id: string;
  title: string;
  description: string;
  subjectName: string;
  topicName: string;
  subtopicName?: string;
  cardCount: number;
  lastUpdated: string;
  difficulty: 'High Yield' | 'Board Classic' | 'Advanced' | 'Core Concept';
  masteryPercentage: number;
  cards: Flashcard[];
}

const DEFAULT_FALLBACK_CARDS: Flashcard[] = [
  {
    id: 'fc_def_1',
    front: 'What is the most common electrocardiographic finding in acute pulmonary embolism?',
    back: 'Sinus tachycardia (present in >40% of cases).',
    explanation: 'The classic S1Q3T3 pattern (prominent S wave in lead I, Q wave in lead III, inverted T wave in lead III) is highly specific for cor pulmonale but present in <20% of PE cases.',
    clinical_pearl: 'Always check Wells score prior to ordering CT Pulmonary Angiogram (CTPA). D-Dimer is only useful to rule out PE in low-risk patients.',
    category: 'Cardiopulmonary',
    difficulty: 'High Yield',
    status: 'unseen',
  },
  {
    id: 'fc_def_2',
    front: 'Which cardiac enzyme rises first in acute myocardial infarction, and which remains elevated longest?',
    back: 'Myoglobin / Troponin I rises first (2-4 hours). Troponin I remains elevated longest (7-10 days).',
    explanation: 'CK-MB returns to baseline within 48-72 hours, making it the biomarker of choice for detecting early reinfarction.',
    clinical_pearl: 'Troponin can be elevated in renal failure due to decreased clearance; always evaluate cardiac enzyme trends alongside ECG evolution.',
    category: 'Pathology & Diagnostics',
    difficulty: 'Board Classic',
    status: 'unseen',
  },
  {
    id: 'fc_def_3',
    front: 'What is Beck’s Triad, and what condition does it indicate?',
    back: '1. Hypotension\n2. Distended neck veins (elevated JVP)\n3. Muffled heart sounds',
    explanation: 'Beck’s Triad indicates Cardiac Tamponade. Pulsus paradoxus (>10 mmHg drop in SBP during inspiration) is the classic physical exam hallmark.',
    clinical_pearl: 'Echocardiogram reveals diastolic collapse of the right ventricle.',
    category: 'Clinical Triads',
    difficulty: 'High Yield',
    status: 'unseen',
  },
  {
    id: 'fc_def_4',
    front: 'What is the first-line medication for rate control in atrial fibrillation with rapid ventricular response in patients with preserved ejection fraction?',
    back: 'Non-dihydropyridine Calcium Channel Blockers (Diltiazem, Verapamil) or Beta-Blockers (Metoprolol).',
    explanation: 'Rate control slows AV node conduction. Note: Avoid AV node blockers in pre-excited AF (Wolff-Parkinson-White syndrome).',
    clinical_pearl: 'In WPW with AF, use Procainamide or Ibutilide to avoid ventricular fibrillation.',
    category: 'Pharmacology',
    difficulty: 'High Yield',
    status: 'unseen',
  },
];

export function FlashcardWorkspaceView() {
  const { selection } = useSelection();
  const { content } = useTopicContent();

  const [cardSets, setCardSets] = useState<FlashcardSet[]>([]);
  const [activeSet, setActiveSet] = useState<FlashcardSet | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [filterMode, setFilterMode] = useState<'all' | 'revision' | 'mastered'>('all');

  // Generate sets from selection & topic content
  useEffect(() => {
    const activeCards: Flashcard[] =
      content?.flashcards && content.flashcards.length > 0
        ? content.flashcards.map((f, idx) => ({
            id: f.id || `fc_${idx}`,
            front: f.front,
            back: f.back,
            category: f.category || selection.subject?.name || 'High Yield',
            difficulty: (f.difficulty as any) || 'High Yield',
            explanation: (f as any).explanation || 'High-yield active recall concept for medical board examinations.',
            clinical_pearl: (f as any).clinical_pearl || 'Core association frequently tested on USMLE / NEET-PG / PLAB.',
            status: 'unseen',
            bookmarked: false,
          }))
        : DEFAULT_FALLBACK_CARDS;

    const subject = selection.subject?.name || 'Clinical Medicine';
    const topic = selection.topic?.name || 'Coronary Artery Disease';
    const subtopic = selection.subtopic?.name;

    const mainSet: FlashcardSet = {
      id: 'set_main',
      title: `${topic} High-Yield Flashcard Set`,
      description: `Comprehensive active-recall questions, clinical pearls, and exam traps for ${topic}.`,
      subjectName: subject,
      topicName: topic,
      subtopicName: subtopic,
      cardCount: activeCards.length,
      lastUpdated: 'Updated 2 Sep 2026',
      difficulty: 'High Yield',
      masteryPercentage: 0,
      cards: activeCards,
    };

    const pathogenesisCards = activeCards.slice(0, Math.ceil(activeCards.length / 2));
    const secondarySet: FlashcardSet = {
      id: 'set_patho',
      title: `${topic} Pathogenesis & Diagnostics`,
      description: `Focus set on etiology, pathophysiology, screening tests, and Gold Standard investigations.`,
      subjectName: subject,
      topicName: topic,
      subtopicName: subtopic,
      cardCount: Math.max(1, pathogenesisCards.length),
      lastUpdated: 'Updated Recently',
      difficulty: 'Board Classic',
      masteryPercentage: 25,
      cards: pathogenesisCards.length > 0 ? pathogenesisCards : activeCards,
    };

    setCardSets([mainSet, secondarySet]);
  }, [content?.flashcards, selection.subject?.name, selection.topic?.name, selection.subtopic?.name]);

  // Active cards in current set
  const currentCards = activeSet
    ? activeSet.cards.filter((card) => {
        if (filterMode === 'mastered') return card.status === 'mastered';
        if (filterMode === 'revision') return card.status === 'revision';
        return true;
      })
    : [];

  const currentCard = currentCards[activeCardIndex] || currentCards[0];

  // Rating card
  const handleRateCard = (status: 'mastered' | 'revision') => {
    if (!activeSet || !currentCard) return;

    const updatedCards = activeSet.cards.map((c) =>
      c.id === currentCard.id ? { ...c, status } : c
    );

    const masteredCount = updatedCards.filter((c) => c.status === 'mastered').length;
    const newMastery = Math.round((masteredCount / updatedCards.length) * 100);

    const updatedSet = {
      ...activeSet,
      cards: updatedCards,
      masteryPercentage: newMastery,
    };

    setActiveSet(updatedSet);
    setCardSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));

    setIsFlipped(false);
    if (activeCardIndex < currentCards.length - 1) {
      setDirection('next');
      setActiveCardIndex((prev) => prev + 1);
    } else {
      setActiveCardIndex(0);
    }
  };

  // Toggle bookmark
  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeSet || !currentCard) return;

    const updatedCards = activeSet.cards.map((c) =>
      c.id === currentCard.id ? { ...c, bookmarked: !c.bookmarked } : c
    );

    const updatedSet = { ...activeSet, cards: updatedCards };
    setActiveSet(updatedSet);
    setCardSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));
  };

  // Shuffle active set
  const handleShuffle = () => {
    if (!activeSet) return;
    const shuffled = [...activeSet.cards].sort(() => Math.random() - 0.5);
    setActiveSet({ ...activeSet, cards: shuffled });
    setActiveCardIndex(0);
    setIsFlipped(false);
  };

  // Keyboard Navigation
  useEffect(() => {
    if (!activeSet) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeCardIndex < currentCards.length - 1) {
          setDirection('next');
          setActiveCardIndex((i) => i + 1);
          setIsFlipped(false);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeCardIndex > 0) {
          setDirection('prev');
          setActiveCardIndex((i) => i - 1);
          setIsFlipped(false);
        }
      } else if (e.key === 'm' || e.key === 'M') {
        handleRateCard('mastered');
      } else if (e.key === 'r' || e.key === 'R') {
        handleRateCard('revision');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSet, activeCardIndex, currentCards.length]);

  return (
    <div className="space-y-6">
      {/* 1. FLASHCARD SET LIST VIEW */}
      {!activeSet ? (
        <div className="space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Flashcard Decks
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {selection.topic?.name || 'Active Topic'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Active recall & spaced repetition flashcard sets powered by AI.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>{cardSets.reduce((acc, s) => acc + s.cardCount, 0)} Total Cards</span>
              </span>
            </div>
          </div>

          {/* Flashcard Set Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {cardSets.map((set) => (
              <div
                key={set.id}
                className="group relative rounded-3xl p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Subject / Subtopic Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
                      {set.subjectName}
                    </span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      ⚡ {set.difficulty}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {set.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {set.description}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1 font-semibold">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      {set.cardCount} Cards
                    </span>
                    <span className="flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {set.lastUpdated}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-500 dark:text-slate-400">Mastery Progress</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{set.masteryPercentage}% Mastered</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${set.masteryPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Open Flashcards CTA Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSet(set);
                    setActiveCardIndex(0);
                    setIsFlipped(false);
                  }}
                  className="mt-6 w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Open Flashcard Set</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 2. SINGLE CARD 3D PLAYER MODE */
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Top Bar inside Player */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveSet(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Decks</span>
            </button>

            <div className="text-center">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
                {activeSet.title}
              </h4>
              <span className="text-[10px] text-slate-400 font-semibold">
                Card {activeCardIndex + 1} of {Math.max(1, currentCards.length)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleShuffle}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Shuffle Set"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setActiveCardIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All ({activeSet.cards.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode('revision');
                  setActiveCardIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  filterMode === 'revision'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Repeat ({activeSet.cards.filter((c) => c.status === 'revision').length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode('mastered');
                  setActiveCardIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  filterMode === 'mastered'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Mastered ({activeSet.cards.filter((c) => c.status === 'mastered').length})
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-semibold">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Space</kbd> to flip</span>
            </div>
          </div>

          {/* 3D SINGLE FLASHCARD CONTAINER */}
          {currentCard ? (
            <div className="perspective-1000 w-full min-h-[380px] sm:min-h-[420px] relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentCard.id}_${isFlipped ? 'back' : 'front'}`}
                  initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`w-full min-h-[380px] sm:min-h-[420px] rounded-3xl p-6 sm:p-8 border-2 shadow-2xl cursor-pointer select-none flex flex-col justify-between transition-all ${
                    isFlipped
                      ? 'bg-gradient-to-br from-indigo-900/90 via-slate-900 to-slate-950 text-white border-indigo-500/80 shadow-indigo-500/10'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] border ${
                        isFlipped
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                      }`}
                    >
                      {currentCard.category || 'Clinical Recall'}
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleToggleBookmark}
                        className="p-1 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                      >
                        {currentCard.bookmarked ? (
                          <BookmarkCheck className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Bookmark className="w-5 h-5" />
                        )}
                      </button>

                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                        <RotateCw className="w-3.5 h-3.5" /> Tap to {isFlipped ? 'Question' : 'Answer'}
                      </span>
                    </div>
                  </div>

                  {/* Card Center Content */}
                  <div className="py-6 my-auto space-y-4 text-center">
                    <span
                      className={`text-[11px] font-extrabold uppercase tracking-widest ${
                        isFlipped ? 'text-indigo-400' : 'text-slate-400'
                      }`}
                    >
                      {isFlipped ? 'Answer & Clinical Rationale' : 'Active Recall Question'}
                    </span>

                    <div className="text-base sm:text-xl font-bold leading-relaxed max-w-lg mx-auto whitespace-pre-line">
                      {isFlipped ? currentCard.back : currentCard.front}
                    </div>

                    {/* Back side details */}
                    {isFlipped && (
                      <div className="space-y-3 pt-4 border-t border-indigo-800/60 text-left max-w-lg mx-auto">
                        {currentCard.explanation && (
                          <div className="text-xs text-indigo-200/90 leading-normal">
                            <strong className="text-indigo-300">Explanation: </strong>
                            {currentCard.explanation}
                          </div>
                        )}

                        {currentCard.clinical_pearl && (
                          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold text-amber-400 mb-0.5">Clinical Pearl:</strong>
                              {currentCard.clinical_pearl}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between text-[11px] border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="font-semibold text-slate-400">
                      {currentCard.difficulty || 'High Yield'}
                    </span>
                    <span className="font-black text-indigo-500">
                      {isFlipped ? 'Back (Answer)' : 'Front (Question)'}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              No flashcards in this category.
            </div>
          )}

          {/* Player Bottom Control Bar */}
          {currentCard && (
            <div className="space-y-4">
              {/* Leitner Rating Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRateCard('revision')}
                  className="py-3 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <XCircle className="w-4 h-4 text-amber-500" /> Need Review (R)
                </button>

                <button
                  type="button"
                  onClick={() => handleRateCard('mastered')}
                  className="py-3 px-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mastered (M)
                </button>
              </div>

              {/* Prev / Next Navigation Bar */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (activeCardIndex > 0) {
                      setDirection('prev');
                      setActiveCardIndex((i) => i - 1);
                      setIsFlipped(false);
                    }
                  }}
                  disabled={activeCardIndex === 0}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Progress Indicators */}
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-xs px-2">
                  {currentCards.map((c, idx) => (
                    <button
                      key={c.id || idx}
                      type="button"
                      onClick={() => {
                        setActiveCardIndex(idx);
                        setIsFlipped(false);
                      }}
                      className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                        activeCardIndex === idx
                          ? 'bg-indigo-600 scale-125'
                          : c.status === 'mastered'
                          ? 'bg-emerald-500/60'
                          : c.status === 'revision'
                          ? 'bg-amber-500/60'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                      title={`Card ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (activeCardIndex < currentCards.length - 1) {
                      setDirection('next');
                      setActiveCardIndex((i) => i + 1);
                      setIsFlipped(false);
                    }
                  }}
                  disabled={activeCardIndex === currentCards.length - 1}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
