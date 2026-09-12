'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  BookOpen,
  Award,
  Zap,
  HelpCircle,
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ActiveRecallItem, AnswerEvaluationResult } from '@/lib/types/active-recall';
import { evaluateRecallAnswer } from '@/lib/active-recall/evaluation';

interface ActiveRecallCardProps {
  item: ActiveRecallItem;
  currentIndex: number;
  totalItems: number;
  onAnswerSubmit: (answer: string, evalResult: AnswerEvaluationResult, isRevealed: boolean, responseTimeMs: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  savedAnswer?: {
    userAnswer: string;
    isCorrect: boolean;
    isRevealed: boolean;
    evaluated: boolean;
  };
}

export function ActiveRecallCard({
  item,
  currentIndex,
  totalItems,
  onAnswerSubmit,
  onNext,
  onPrevious,
  hasPrevious,
  hasNext,
  savedAnswer,
}: ActiveRecallCardProps) {
  const [userAnswer, setUserAnswer] = useState(savedAnswer?.userAnswer || '');
  const [isEvaluated, setIsEvaluated] = useState(!!savedAnswer?.evaluated);
  const [evalResult, setEvalResult] = useState<AnswerEvaluationResult | null>(
    savedAnswer?.evaluated
      ? {
          isCorrect: !!savedAnswer.isCorrect,
          normalizedUserAnswer: savedAnswer.userAnswer,
          normalizedCorrectAnswer: item.blank,
          matchType: savedAnswer.isCorrect ? 'exact' : 'incorrect',
        }
      : null
  );
  const [isRevealed, setIsRevealed] = useState(!!savedAnswer?.isRevealed);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isShaking, setIsShaking] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Video state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize when question changes
  useEffect(() => {
    if (savedAnswer?.evaluated) {
      setUserAnswer(savedAnswer.userAnswer);
      setIsEvaluated(true);
      setIsRevealed(!!savedAnswer.isRevealed);
      setEvalResult({
        isCorrect: !!savedAnswer.isCorrect,
        normalizedUserAnswer: savedAnswer.userAnswer,
        normalizedCorrectAnswer: item.blank,
        matchType: savedAnswer.isCorrect ? 'exact' : 'incorrect',
      });
    } else {
      setUserAnswer('');
      setIsEvaluated(false);
      setEvalResult(null);
      setIsRevealed(false);
      setStartTime(Date.now());
      setIsShaking(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [item.id, savedAnswer]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      // If enter pressed inside input when not evaluated
      if (e.key === 'Enter' && !isEvaluated && userAnswer.trim()) {
        e.preventDefault();
        handleCheckAnswer();
      } else if (e.key === 'Enter' && isEvaluated) {
        e.preventDefault();
        onNext();
      } else if (!isInputActive) {
        if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight') {
          if (isEvaluated) {
            e.preventDefault();
            onNext();
          }
        } else if (e.key === 'p' || e.key === 'P' || e.key === 'ArrowLeft') {
          if (hasPrevious) {
            e.preventDefault();
            onPrevious();
          }
        } else if ((e.key === 'r' || e.key === 'R') && !isEvaluated) {
          e.preventDefault();
          handleRevealAnswer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userAnswer, isEvaluated, hasPrevious, onNext, onPrevious]);

  const handleCheckAnswer = () => {
    if (!userAnswer.trim() || isEvaluated) return;

    const responseTime = Date.now() - startTime;
    const res = evaluateRecallAnswer(userAnswer, item);

    setEvalResult(res);
    setIsEvaluated(true);
    setIsRevealed(false);

    if (!res.isCorrect) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    }

    onAnswerSubmit(userAnswer.trim(), res, false, responseTime);
  };

  const handleRevealAnswer = () => {
    if (isEvaluated) return;

    const responseTime = Date.now() - startTime;
    const res: AnswerEvaluationResult = {
      isCorrect: false,
      normalizedUserAnswer: '',
      normalizedCorrectAnswer: item.blank,
      matchType: 'incorrect',
    };

    setEvalResult(res);
    setIsEvaluated(true);
    setIsRevealed(true);
    setUserAnswer(item.blank);

    onAnswerSubmit('[REVEALED]', res, true, responseTime);
  };

  // Render sentence with interactive/transformed blanks
  const renderSentenceWithBlanks = () => {
    const rawSentence = item.sentence || '';
    const parts = rawSentence.split(/(\[BLANK\]|______+)/g);

    return (
      <div className="text-base sm:text-lg md:text-xl text-slate-800 dark:text-slate-100 font-medium leading-relaxed tracking-normal">
        {parts.map((part, idx) => {
          const isBlankMarker = part === '[BLANK]' || /^______+$/.test(part);

          if (isBlankMarker) {
            if (isEvaluated) {
              const isSuccess = evalResult?.isCorrect && !isRevealed;
              return (
                <motion.span
                  key={idx}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 mx-1.5 rounded-xl font-bold font-mono text-sm sm:text-base border shadow-xs align-baseline ${
                    isSuccess
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700'
                      : isRevealed
                      ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700'
                      : 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700'
                  }`}
                >
                  {isSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : isRevealed ? (
                    <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <span>{item.blank}</span>
                </motion.span>
              );
            }

            // Un-evaluated active blank slot
            return (
              <span
                key={idx}
                className="inline-flex items-center justify-center min-w-[120px] sm:min-w-[160px] h-8 px-3 mx-1.5 border-b-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 rounded-md font-mono text-xs sm:text-sm font-bold align-baseline animate-pulse shadow-inner"
              >
                [ Recall Target ]
              </span>
            );
          }

          return <span key={idx}>{part}</span>;
        })}
      </div>
    );
  };

  const isCorrect = evalResult?.isCorrect && !isRevealed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full max-w-3xl mx-auto space-y-4"
    >
      {/* MAIN PREMIUM ACTIVE RECALL CARD */}
      <motion.div
        animate={isShaking ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.5 }}
        className={`p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0B0F19] border transition-all duration-300 shadow-sm relative overflow-hidden ${
          isEvaluated
            ? isCorrect
              ? 'border-emerald-300 dark:border-emerald-800/80 shadow-emerald-500/5'
              : isRevealed
              ? 'border-amber-300 dark:border-amber-800/80 shadow-amber-500/5'
              : 'border-rose-300 dark:border-rose-800/80 shadow-rose-500/5'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        {/* Top Card Badge & Concept Metadata */}
        <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200/80 dark:border-indigo-800">
              Active Recall • Question {currentIndex + 1} of {totalItems}
            </span>
            {item.difficulty && (
              <span className="hidden sm:inline-flex text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {item.difficulty}
              </span>
            )}
          </div>

          <span className="text-xs font-mono font-semibold text-slate-400">
            {Math.round(((currentIndex + 1) / totalItems) * 100)}%
          </span>
        </div>

        {/* Concept Title */}
        <div className="space-y-1 mb-5">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>{item.concept}</span>
          </h3>
          {item.subtopicName && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Subtopic: {item.subtopicName}
            </p>
          )}
        </div>

        {/* Sentence with Blanks */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 mb-6">
          {renderSentenceWithBlanks()}
        </div>

        {/* Optional Image or Diagram */}
        {item.imageUrl && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 relative group">
            <img
              src={item.imageUrl}
              alt={item.imageCaption || item.concept}
              className="w-full max-h-64 object-contain mx-auto"
            />
            {item.imageCaption && (
              <div className="p-2 text-center text-xs text-slate-500 font-medium bg-white/80 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800">
                {item.imageCaption}
              </div>
            )}
            <button
              onClick={() => setIsImageModalOpen(true)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Enlarge Diagram"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input & Action Area (Before Evaluation) */}
        {!isEvaluated ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="recall-answer-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Type Your Recalled Term
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  id="recall-answer-input"
                  ref={inputRef}
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Enter medical term, drug, criterion, or abbreviation..."
                  autoComplete="off"
                  spellCheck="false"
                  className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500 text-slate-900 dark:text-white text-sm font-medium outline-hidden transition-all shadow-xs"
                />

                <button
                  type="button"
                  onClick={handleCheckAnswer}
                  disabled={!userAnswer.trim()}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold tracking-wide transition-all shadow-sm hover:shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Check Answer</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">Enter</kbd> to submit
              </span>

              <button
                type="button"
                onClick={handleRevealAnswer}
                className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Can&apos;t recall? Reveal Answer</span>
              </button>
            </div>
          </div>
        ) : (
          /* Result & Explanation Section (After Evaluation) */
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="space-y-5 pt-2"
          >
            {/* Feedback Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : isRevealed
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="p-1 rounded-lg shrink-0 mt-0.5">
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : isRevealed ? (
                  <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                )}
              </div>

              <div className="flex-1 space-y-1 text-xs sm:text-sm">
                <div className="font-bold flex items-center gap-2">
                  <span>{isCorrect ? '✓ Excellent Recall!' : isRevealed ? 'Revealed for Learning' : 'Not quite right'}</span>
                </div>

                {!isRevealed && !isCorrect && (
                  <p className="text-slate-600 dark:text-slate-300">
                    Your answer: <span className="font-bold line-through">{userAnswer || '(blank)'}</span>
                  </p>
                )}

                <p className="font-semibold text-slate-900 dark:text-white">
                  Target Answer: <span className="underline decoration-indigo-500 font-bold">{item.blank}</span>
                  {item.acceptedAnswers && item.acceptedAnswers.length > 1 && (
                    <span className="block text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                      Accepted: {item.acceptedAnswers.join(' • ')}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Pathophysiology & Core Rationale */}
            {item.explanation && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Conceptual Rationale &amp; Key Mechanism
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {item.explanation}
                </p>
              </div>
            )}

            {/* High-Yield Point */}
            {item.highYieldPoint && (
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs sm:text-sm text-amber-950 dark:text-amber-200 space-y-1 flex items-start gap-2.5">
                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wide">
                    High-Yield Board Takeaway
                  </strong>
                  <p className="leading-snug">{item.highYieldPoint}</p>
                </div>
              </div>
            )}

            {/* Memory Hook / Mnemonic */}
            {item.memoryHook && (
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 text-xs sm:text-sm text-purple-950 dark:text-purple-200 space-y-1 flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-purple-900 dark:text-purple-300 text-xs uppercase tracking-wide">
                    Memory Hook &amp; Mnemonic
                  </strong>
                  <p className="leading-snug">{item.memoryHook}</p>
                </div>
              </div>
            )}

            {/* Board Exam Trap / Tip */}
            {item.examTip && (
              <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 text-xs sm:text-sm text-rose-950 dark:text-rose-200 space-y-1 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-rose-900 dark:text-rose-300 text-xs uppercase tracking-wide">
                    Board Exam Trap Warning
                  </strong>
                  <p className="leading-snug">{item.examTip}</p>
                </div>
              </div>
            )}

            {/* Optional Associated Educational Video */}
            {item.videoUrl && (
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-indigo-500" /> Educational Video Clip
                </h4>
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-56">
                  <video
                    ref={videoRef}
                    src={item.videoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* BOTTOM NAVIGATION BAR */}
      <div className="flex items-center justify-between gap-3 p-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="text-xs font-mono text-slate-400 font-semibold">
          {currentIndex + 1} / {totalItems}
        </div>

        <button
          type="button"
          onClick={onNext}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
            isEvaluated
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 animate-pulse'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <span>{hasNext ? 'Next Recall' : 'Complete Session'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Fullscreen Image Modal */}
      {isImageModalOpen && item.imageUrl && (
        <div
          onClick={() => setIsImageModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl p-4 overflow-hidden border border-slate-700 relative"
          >
            <img
              src={item.imageUrl}
              alt={item.imageCaption || 'Enlarged diagram'}
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
            {item.imageCaption && (
              <p className="text-xs text-center text-slate-400 mt-2">{item.imageCaption}</p>
            )}
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="mt-3 w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
