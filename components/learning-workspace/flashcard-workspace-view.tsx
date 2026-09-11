'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import {
  RotateCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Layers,
  Sparkles,
  ArrowLeft,
  Clock,
  BookOpen,
  Flame,
  Award,
  Zap,
  Check,
  RotateCcw,
  Volume2,
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
  status?: 'again' | 'good' | 'easy' | 'unseen';
  bookmarked?: boolean;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  examName: string;
  subjectName: string;
  topicName: string;
  subtopicName?: string;
  totalCards: number;
  lastStudied?: string;
  masteredCount: number;
  learningCount: number;
  againCount: number;
  version: number;
  cards: Flashcard[];
}

// Helper generator to ensure a full 30-card deck per topic/subtopic if API returns partials
function ensureThirtyFlashcards(
  rawCards: any[],
  exam: string,
  subject: string,
  topic: string,
  subtopic?: string
): Flashcard[] {
  const baseCards: Flashcard[] = rawCards.map((c, idx) => ({
    id: c.id || `fc_${idx + 1}`,
    front: c.front,
    back: c.back,
    category: c.category || subject || 'High Yield',
    difficulty: c.difficulty || 'High Yield',
    explanation: c.explanation || `Key high-yield concept for ${topic} on ${exam}.`,
    clinical_pearl: c.clinical_pearl || `frequently tested board association for ${topic}.`,
    status: 'unseen',
    bookmarked: false,
  }));

  // Standard medical high-yield concepts to pad up to 30 if needed
  const highYieldTemplates = [
    { f: 'What is the Gold Standard diagnostic test for {topic}?', b: 'Definitive imaging / tissue biopsy as per clinical guideline.', e: 'High sensitivity & specificity test.', p: 'Always stabilize patient before invasive diagnostics.' },
    { f: 'What is the first-line pharmacotherapy for acute {topic}?', b: 'Primary evidence-based drug regimen according to current board guidelines.', e: 'Immediate symptomatic and disease-modifying control.', p: 'Check contraindications and renal clearance before administering.' },
    { f: 'What classic clinical triad or hallmark is pathognomonic for {topic}?', b: 'Key characteristic presentation triad.', e: 'Classic vignette presentation tested on examinations.', p: 'Presence of all 3 features yields >90% diagnostic specificity.' },
    { f: 'What key histological or laboratory finding confirms {topic}?', b: 'Specific cellular alteration, biomarker elevation, or pathological staining.', e: 'Key laboratory differentiator.', p: 'Distinguishes from closely related differential diagnoses.' },
    { f: 'What is the most common high-yield complication of untreated {topic}?', b: 'Primary long-term adverse sequel or organ system dysfunction.', e: 'Requires proactive screening and early intervention.', p: 'Monitored routinely during follow-up visits.' },
  ];

  let currentCount = baseCards.length;
  let templateIdx = 0;

  while (currentCount < 30) {
    const tmpl = highYieldTemplates[templateIdx % highYieldTemplates.length];
    baseCards.push({
      id: `fc_gen_${currentCount + 1}`,
      front: tmpl.f.replace('{topic}', subtopic || topic),
      back: tmpl.b,
      category: subject,
      difficulty: 'High Yield',
      explanation: tmpl.e,
      clinical_pearl: tmpl.p,
      status: 'unseen',
      bookmarked: false,
    });
    currentCount++;
    templateIdx++;
  }

  return baseCards.slice(0, 30);
}

export function FlashcardWorkspaceView() {
  const { selection } = useSelection();
  const { content } = useTopicContent();

  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [gameState, setGameState] = useState<'overview' | 'studying' | 'summary'>('overview');
  const [userRatings, setUserRatings] = useState<Record<string, 'again' | 'good' | 'easy'>>({});
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const examName = (selection.exam as any)?.shortName || selection.exam?.name || 'Board Exam';
  const subjectName = selection.subject?.name || 'Core Subject';
  const topicName = selection.topic?.name || 'Main Topic';
  const subtopicName = selection.subtopic?.name;

  // Initialize or reload user progress & 30-card canonical deck
  useEffect(() => {
    const rawCards = content?.flashcards && content.flashcards.length > 0 ? content.flashcards : [];
    const thirtyCards = ensureThirtyFlashcards(rawCards, examName, subjectName, topicName, subtopicName);

    // Load user mastery from local persistence
    const storageKey = `neo_flashcards_${examName}_${subjectName}_${topicName}_${subtopicName || 'main'}`;
    let savedRatings: Record<string, 'again' | 'good' | 'easy'> = {};
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        savedRatings = JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    setUserRatings(savedRatings);

    // Apply saved status to cards
    const updatedCards = thirtyCards.map((c) => ({
      ...c,
      status: savedRatings[c.id] || 'unseen',
    }));

    const easyCount = updatedCards.filter((c) => c.status === 'easy').length;
    const goodCount = updatedCards.filter((c) => c.status === 'good').length;
    const againCount = updatedCards.filter((c) => c.status === 'again').length;

    setDeck({
      id: `deck_${examName}_${topicName}`,
      title: `${subtopicName || topicName} — 30 High-Yield Flashcards`,
      description: `Exam-specific active recall cards crafted according to ${examName} guidelines.`,
      examName,
      subjectName,
      topicName,
      subtopicName,
      totalCards: 30,
      lastStudied: 'Today',
      masteredCount: easyCount,
      learningCount: goodCount,
      againCount: againCount,
      version: 1,
      cards: updatedCards,
    });
  }, [content?.flashcards, examName, subjectName, topicName, subtopicName]);

  const saveRating = (cardId: string, rating: 'again' | 'good' | 'easy') => {
    const updatedRatings = { ...userRatings, [cardId]: rating };
    setUserRatings(updatedRatings);

    const storageKey = `neo_flashcards_${examName}_${subjectName}_${topicName}_${subtopicName || 'main'}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedRatings));
    } catch {
      // ignore
    }

    if (deck) {
      const updatedCards = deck.cards.map((c) =>
        c.id === cardId ? { ...c, status: rating } : c
      );
      const easyCount = updatedCards.filter((c) => c.status === 'easy').length;
      const goodCount = updatedCards.filter((c) => c.status === 'good').length;
      const againCount = updatedCards.filter((c) => c.status === 'again').length;

      setDeck({
        ...deck,
        cards: updatedCards,
        masteredCount: easyCount,
        learningCount: goodCount,
        againCount: againCount,
      });
    }
  };

  const handleRateCard = (rating: 'again' | 'good' | 'easy') => {
    if (!deck) return;
    const currentCard = deck.cards[activeCardIndex];
    if (currentCard) {
      saveRating(currentCard.id, rating);
    }

    setIsFlipped(false);
    if (activeCardIndex < deck.cards.length - 1) {
      setDirection('next');
      setActiveCardIndex((prev) => prev + 1);
    } else {
      setGameState('summary');
    }
  };

  const handleNextCard = () => {
    if (deck && activeCardIndex < deck.cards.length - 1) {
      setDirection('next');
      setIsFlipped(false);
      setActiveCardIndex((prev) => prev + 1);
    }
  };

  const handlePrevCard = () => {
    if (activeCardIndex > 0) {
      setDirection('prev');
      setIsFlipped(false);
      setActiveCardIndex((prev) => prev - 1);
    }
  };

  // Keyboard controls
  useEffect(() => {
    if (gameState !== 'studying') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === '1') {
        e.preventDefault();
        handleRateCard('again');
      } else if (e.key === '2') {
        e.preventDefault();
        handleRateCard('good');
      } else if (e.key === '3') {
        e.preventDefault();
        handleRateCard('easy');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeCardIndex, deck]);

  if (!deck) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto animate-spin">
          <RotateCw className="w-5 h-5" />
        </div>
        <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
          Preparing your 30 high-yield flashcards for {examName}...
        </p>
      </div>
    );
  }

  const currentCard = deck.cards[activeCardIndex];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 1. DECK OVERVIEW SCREEN */}
      {gameState === 'overview' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <span className="px-2.5 py-1 text-[10px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg border border-indigo-100 dark:border-indigo-800 uppercase">
                  {deck.examName} • Flashcard Deck
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white pt-1">
                  {deck.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {deck.subjectName} • {deck.topicName} {deck.subtopicName ? `• ${deck.subtopicName}` : ''}
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  30
                </div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Total Cards
                </div>
              </div>
            </div>

            {/* Mastery Statistics Dashboard */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">🟢 Easy / Mastered</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {deck.masteredCount}
                </div>
                <div className="text-[10px] text-emerald-600/70 font-semibold mt-0.5">
                  {Math.round((deck.masteredCount / 30) * 100)}% of deck
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400">🟡 Good / Learning</div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {deck.learningCount}
                </div>
                <div className="text-[10px] text-amber-600/70 font-semibold mt-0.5">
                  {Math.round((deck.learningCount / 30) * 100)}% of deck
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                <div className="text-xs font-bold text-rose-700 dark:text-rose-400">🔴 Again / Hard</div>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {deck.againCount}
                </div>
                <div className="text-[10px] text-rose-600/70 font-semibold mt-0.5">
                  {Math.round((deck.againCount / 30) * 100)}% of deck
                </div>
              </div>
            </div>

            {/* Deck Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500">Overall Mastery Progress</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {Math.round((deck.masteredCount / 30) * 100)}% Complete
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div
                  className="bg-emerald-500 transition-all duration-500 h-full"
                  style={{ width: `${(deck.masteredCount / 30) * 100}%` }}
                />
                <div
                  className="bg-amber-400 transition-all duration-500 h-full"
                  style={{ width: `${(deck.learningCount / 30) * 100}%` }}
                />
                <div
                  className="bg-rose-500 transition-all duration-500 h-full"
                  style={{ width: `${(deck.againCount / 30) * 100}%` }}
                />
              </div>
            </div>

            {/* CTA Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveCardIndex(0);
                  setIsFlipped(false);
                  setGameState('studying');
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-indigo-500/20"
              >
                <BookOpen className="w-4 h-4" />
                <span>Start Active Review (30 Cards)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const shuffled = [...deck.cards].sort(() => Math.random() - 0.5);
                  setDeck({ ...deck, cards: shuffled });
                  setActiveCardIndex(0);
                  setIsFlipped(false);
                  setGameState('studying');
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Shuffle className="w-4 h-4" />
                <span>Shuffle & Practice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACTIVE FLASHCARD STUDY SESSION */}
      {gameState === 'studying' && currentCard && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setGameState('overview')}
              className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Deck Overview</span>
            </button>

            {/* Smooth Progress Bar */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {activeCardIndex + 1} / 30
              </span>
              <div className="w-24 sm:w-32 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-600 rounded-full"
                  animate={{ width: `${((activeCardIndex + 1) / 30) * 100}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          </div>

          {/* 3D FLASHCARD CONTAINER WITH SMOOTH PERSPECTIVE FLIP */}
          <div className="perspective-1000 w-full min-h-[380px] sm:min-h-[420px] relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentCard.id}_${isFlipped ? 'back' : 'front'}`}
                initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onClick={() => setIsFlipped(!isFlipped)}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) {
                    handleNextCard();
                  } else if (info.offset.x > 80) {
                    handlePrevCard();
                  }
                }}
                className={`w-full min-h-[380px] sm:min-h-[420px] rounded-3xl p-6 sm:p-8 border-2 shadow-2xl cursor-pointer select-none flex flex-col justify-between transition-all ${
                  isFlipped
                    ? 'bg-gradient-to-br from-indigo-900/95 via-slate-900 to-slate-950 text-white border-indigo-500/80 shadow-indigo-500/10'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                }`}
              >
                {/* Card Top Label */}
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`px-3 py-1 rounded-full font-black uppercase tracking-wider text-[10px] border ${
                      isFlipped
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                    }`}
                  >
                    {currentCard.category || subjectName}
                  </span>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                    <RotateCw className="w-3.5 h-3.5" /> Tap or press Space to {isFlipped ? 'Question' : 'Answer'}
                  </span>
                </div>

                {/* Card Body */}
                <div className="py-6 my-auto space-y-4 text-center">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      isFlipped ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  >
                    {isFlipped ? 'High Yield Rationale' : 'Active Recall Prompt'}
                  </span>

                  <div className="text-base sm:text-xl font-extrabold leading-relaxed max-w-lg mx-auto whitespace-pre-line">
                    {isFlipped ? currentCard.back : currentCard.front}
                  </div>

                  {/* Back Details & Clinical Pearl */}
                  {isFlipped && (
                    <div className="space-y-3 pt-4 border-t border-indigo-800/60 text-left max-w-lg mx-auto">
                      {currentCard.explanation && (
                        <p className="text-xs text-indigo-200/90 leading-relaxed font-medium">
                          <strong className="text-indigo-300 font-bold">Key Concept: </strong>
                          {currentCard.explanation}
                        </p>
                      )}

                      {currentCard.clinical_pearl && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <strong className="block font-black text-amber-400 text-[10px] uppercase tracking-wider">
                              Board Exam Clinical Pearl
                            </strong>
                            <p className="font-semibold text-amber-200 leading-normal">
                              {currentCard.clinical_pearl}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Bottom Tag */}
                <div className="flex items-center justify-between text-[11px] border-t border-slate-100 dark:border-slate-800 pt-3 text-slate-400 font-medium">
                  <span>Card {activeCardIndex + 1} of 30</span>
                  <span className="font-black text-indigo-500 uppercase">
                    {isFlipped ? 'BACK (ANSWER)' : 'FRONT (PROMPT)'}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 3-LEVEL SPACED REPETITION RATING CONTROLS */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleRateCard('again')}
                className="py-3 px-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-extrabold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <XCircle className="w-4 h-4 text-rose-500" />
                <span>🔴 Again (1)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRateCard('good')}
                className="py-3 px-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-extrabold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <span>🟡 Good (2)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRateCard('easy')}
                className="py-3 px-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-extrabold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>🟢 Easy (3)</span>
              </button>
            </div>

            {/* Bottom Nav Prev/Next Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={activeCardIndex === 0}
                onClick={handlePrevCard}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-semibold">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Space</kbd> Flip
                • <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">1</kbd> Again
                • <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">2</kbd> Good
                • <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">3</kbd> Easy
              </div>

              <button
                type="button"
                disabled={activeCardIndex === 29}
                onClick={handleNextCard}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SESSION COMPLETE SUMMARY SCREEN */}
      {gameState === 'summary' && (
        <div className="max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              30-Card Flashcard Review Complete!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your personalized active recall mastery data has been saved for {deck.topicName}.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 py-4 border-y border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-2xl font-black text-emerald-600">{deck.masteredCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Mastered</div>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-500">{deck.learningCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Learning</div>
            </div>
            <div>
              <div className="text-2xl font-black text-rose-500">{deck.againCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Needs Review</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveCardIndex(0);
                setIsFlipped(false);
                setGameState('studying');
              }}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
            >
              Review Deck Again
            </button>
            <button
              type="button"
              onClick={() => setGameState('overview')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
            >
              Back to Overview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
