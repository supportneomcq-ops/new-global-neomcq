'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Clock,
  CheckCircle2,
  Flag,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Award,
  AlertCircle,
  Eye,
  Strikethrough,
  Check,
  XCircle,
} from 'lucide-react';
import { MCQQuestion, QuizAttemptRecord } from './types';
import { useSelection } from '@/lib/context/selection-context';
import { useTopicContent } from '@/lib/context/topic-content-context';
import { OnboardingData } from '@/components/onboarding-flow';

interface PracticeCbtViewProps {
  user: OnboardingData;
  initialQuestions?: MCQQuestion[];
  topicId?: string;
  topicName?: string;
  onQuizComplete?: (record: QuizAttemptRecord) => void;
  isQuizMode?: boolean;
}

const DEFAULT_QUESTIONS: MCQQuestion[] = [
  {
    id: 'q1',
    question: 'A 58-year-old male with a history of hypertension and hyperlipidemia presents with substernal crushing chest pain radiating to his left jaw that began 45 minutes ago. ECG demonstrates ST-segment elevation in leads II, III, and aVF with reciprocal ST depression in leads I and aVL. Which coronary artery is most likely occluded?',
    options: [
      'Left anterior descending artery (LAD)',
      'Right coronary artery (RCA)',
      'Left circumflex artery (LCx)',
      'Left main coronary artery (LMCA)',
    ],
    correct_index: 1,
    explanation: 'ST elevation in leads II, III, and aVF signifies an acute inferior wall myocardial infarction. The inferior wall of the left ventricle is primarily supplied by the posterior descending artery, which in ~85-90% of individuals originates from the Right Coronary Artery (right-dominant circulation).',
    clinical_pearl: 'Inferior STEMI (II, III, aVF) is caused by RCA occlusion in 85-90% of cases. Always check lead V4R for right ventricular involvement before administering nitrates.',
    high_yield_tag: 'Cardiology • STEMI Localization',
    difficulty: 'High Yield',
  },
  {
    id: 'q2',
    question: 'Which of the following medications is contraindicated in the patient above if right ventricular infarction is suspected?',
    options: [
      'Aspirin 325 mg chewed',
      'Intravenous Nitroglycerin',
      'Unfractionated heparin bolus',
      'Ticagrelor 180 mg loading dose',
    ],
    correct_index: 1,
    explanation: 'Nitroglycerin reduces cardiac preload through venodilation. In right ventricular infarction, the right ventricle is highly preload-dependent to maintain forward flow to the left ventricle. Administering venodilators like nitroglycerin can precipitate severe refractory hypotension.',
    clinical_pearl: 'Never give nitrates or diuretics in suspected right ventricular infarction; maintain preload with aggressive IV crystalloid boluses.',
    high_yield_tag: 'Pharmacology • STEMI Management',
    difficulty: 'Board Classic',
  },
  {
    id: 'q3',
    question: 'A 65-year-old female presents for routine follow-up. Her blood pressure is 152/94 mmHg on two separate visits. Serum creatinine is 0.9 mg/dL and potassium is 4.2 mEq/L. Urine albumin-to-creatinine ratio is 180 mg/g. Which of the following is the most appropriate first-line antihypertensive agent?',
    options: [
      'Hydrochlorothiazide',
      'Lisinopril',
      'Metoprolol succinate',
      'Amlodipine',
    ],
    correct_index: 1,
    explanation: 'In patients with hypertension and persistent microalbuminuria (urine ACR 30-300 mg/g), ACE inhibitors (such as Lisinopril) or ARBs are the first-line therapy of choice due to their proven renal protective effects and reduction of intraglomerular pressure.',
    clinical_pearl: 'ACE inhibitors and ARBs dilate the efferent arteriole, reducing intraglomerular hydrostatic pressure and slowing renal disease progression.',
    high_yield_tag: 'Nephrology • Hypertension Guidelines',
    difficulty: 'High Yield',
  },
  {
    id: 'q4',
    question: 'A 32-year-old female presents with palpitations, heat intolerance, and unintended weight loss of 6 kg over 2 months. Physical examination reveals mild exophthalmos and a diffusely enlarged, non-tender thyroid with an audible bruit. What is the underlying mechanism of this condition?',
    options: [
      'Autoantibodies against thyroid peroxidase (anti-TPO)',
      'Autoantibodies stimulating the TSH receptor (TSI)',
      'Transient release of preformed colloid thyroid hormones',
      'Autonomously functioning thyroid follicular adenoma',
    ],
    correct_index: 1,
    explanation: 'The patient presents with classic signs of Graves disease (hyperthyroidism, diffuse non-tender goiter with bruit, and exophthalmos). Graves disease is caused by thyroid-stimulating immunoglobulins (TSI) that bind to and activate the TSH receptor on thyroid follicular cells.',
    clinical_pearl: 'Graves disease is characterized by TSH-receptor stimulating autoantibodies. Exophthalmos and pretibial myxedema are pathognomonic for Graves disease and do not occur in toxic multinodular goiter.',
    high_yield_tag: 'Endocrinology • Hyperthyroidism',
    difficulty: 'Core High Yield',
  },
];

export function PracticeCbtView({
  user,
  initialQuestions,
  topicId,
  topicName,
  onQuizComplete,
  isQuizMode = false,
}: PracticeCbtViewProps) {
  const { selection } = useSelection();
  const {
    activeQuiz,
    setActiveQuiz,
    activeQuestions,
    content,
    recordQuizAttempt,
    getAttemptsCount,
  } = useTopicContent();

  const [questions, setQuestions] = useState<MCQQuestion[]>(
    isQuizMode && activeQuestions && activeQuestions.length > 0
      ? activeQuestions
      : (!isQuizMode && content?.mcqs && content.mcqs.length > 0 ? content.mcqs : DEFAULT_QUESTIONS)
  );
  const [loading, setLoading] = useState(false);

  // CBT Mode: 'tutor' (instant feedback) vs 'exam' (timed, score at end)
  const [mode, setMode] = useState<'tutor' | 'exam'>('tutor');

  // Quiz State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<string, boolean>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [revealedRationales, setRevealedRationales] = useState<Record<number, boolean>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  // Attempt Tracking (Max 3 attempts strictly enforced)
  const currentTopicId = topicId || selection.topic?.id || 'general';
  const quizKey = isQuizMode ? `${currentTopicId}_${activeQuiz}` : `${currentTopicId}_practice`;
  const totalAttemptsMade = isQuizMode ? getAttemptsCount(quizKey) : 0;
  const attemptNumber = isQuizMode ? Math.min(3, totalAttemptsMade + 1) : 1;
  const maxAttemptsReached = isQuizMode ? totalAttemptsMade >= 3 : false;

  // Timer for Exam Mode
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(600); // 10 mins
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync questions when activeQuiz, topic content or mode changes
  useEffect(() => {
    if (isQuizMode) {
      if (activeQuestions && activeQuestions.length > 0) {
        setQuestions(activeQuestions);
      } else {
        setQuestions(DEFAULT_QUESTIONS);
      }
    } else {
      if (content?.mcqs && content.mcqs.length > 0) {
        setQuestions(content.mcqs);
      } else {
        setQuestions(DEFAULT_QUESTIONS);
      }
    }

    // Reset session progress on topic/quiz/mode switch
    setCurrentIndex(0);
    setSelectedAnswers({});
    setEliminatedOptions({});
    setFlaggedQuestions({});
    setRevealedRationales({});
    setIsCompleted(false);
    setTimeRemainingSeconds(600);
    setIsTimerRunning(false);
  }, [isQuizMode, activeQuestions, content?.mcqs, quizKey]);

  // Restore saved session for this topic + quiz if in progress
  useEffect(() => {
    const sessionKey = `neomcq_cbt_session_${quizKey}`;
    try {
      const savedSession = localStorage.getItem(sessionKey);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && !parsed.isCompleted) {
          setSelectedAnswers(parsed.selectedAnswers || {});
          setEliminatedOptions(parsed.eliminatedOptions || {});
          setFlaggedQuestions(parsed.flaggedQuestions || {});
          setRevealedRationales(parsed.revealedRationales || {});
          setCurrentIndex(parsed.currentIndex || 0);
          if (typeof parsed.timeRemainingSeconds === 'number') {
            setTimeRemainingSeconds(parsed.timeRemainingSeconds);
          }
        }
      }
    } catch {}
  }, [quizKey]);

  // Auto-save current progress
  useEffect(() => {
    if (isCompleted) return;
    const sessionKey = `neomcq_cbt_session_${quizKey}`;
    try {
      localStorage.setItem(
        sessionKey,
        JSON.stringify({
          selectedAnswers,
          eliminatedOptions,
          flaggedQuestions,
          revealedRationales,
          currentIndex,
          timeRemainingSeconds,
          isCompleted: false,
        })
      );
    } catch {}
  }, [quizKey, selectedAnswers, eliminatedOptions, flaggedQuestions, revealedRationales, currentIndex, timeRemainingSeconds, isCompleted]);

  // Timer logic
  useEffect(() => {
    if (mode === 'exam' && !isCompleted && isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleFinishQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, isCompleted, isTimerRunning]);

  const currentQ = questions[currentIndex] || questions[0];
  const totalQ = questions.length;
  const isCurrentAnswered = selectedAnswers[currentIndex] !== undefined;
  const selectedOptionIdx = selectedAnswers[currentIndex];
  const isCorrect = selectedOptionIdx === currentQ?.correct_index;

  const handleSelectOption = (optIdx: number) => {
    if (isCompleted || maxAttemptsReached) return;
    if (mode === 'tutor' && isCurrentAnswered) return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optIdx,
    }));

    if (mode === 'tutor') {
      setRevealedRationales((prev) => ({ ...prev, [currentIndex]: true }));
    }
  };

  const handleToggleEliminate = (optIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${currentIndex}_${optIdx}`;
    setEliminatedOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleToggleFlag = () => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex],
    }));
  };

  const handleFinishQuiz = () => {
    setIsCompleted(true);
    setIsTimerRunning(false);

    // Calculate score
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct_index) {
        correctCount += 1;
      }
    });

    const scorePct = Math.round((correctCount / Math.max(1, totalQ)) * 100);

    const record: QuizAttemptRecord = {
      quizId: `quiz_${activeQuiz}_${Date.now()}`,
      topicId: currentTopicId,
      attemptNumber: attemptNumber,
      score: scorePct,
      totalQuestions: totalQ,
      correctAnswers: correctCount,
      timeSpentSeconds: 600 - timeRemainingSeconds,
      completedAt: new Date().toISOString(),
      answers: selectedAnswers,
    };

    recordQuizAttempt(quizKey, record);

    // Clear active session storage
    try {
      localStorage.removeItem(`neomcq_cbt_session_${quizKey}`);
    } catch {}

    if (onQuizComplete) {
      onQuizComplete(record);
    }
  };

  const handleRetakeQuiz = () => {
    if (maxAttemptsReached) return;
    setSelectedAnswers({});
    setEliminatedOptions({});
    setFlaggedQuestions({});
    setRevealedRationales({});
    setIsCompleted(false);
    setCurrentIndex(0);
    setTimeRemainingSeconds(600);
    if (mode === 'exam') setIsTimerRunning(true);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Score stats
  const answeredCount = Object.keys(selectedAnswers).length;
  let finalCorrect = 0;
  questions.forEach((q, idx) => {
    if (selectedAnswers[idx] === q.correct_index) finalCorrect++;
  });
  const scorePercent = Math.round((finalCorrect / Math.max(1, totalQ)) * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header / Mode Switcher */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{isQuizMode ? 'CBT Sprint Quizzes' : 'CBT Practice Q-Bank'}</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {selection.topic?.name || topicName || 'High-Yield Session'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isQuizMode
              ? 'Non-overlapping 20-question challenge sprints with strict attempt rules.'
              : 'Board-style clinical vignettes with detailed diagnostic rationales.'}
          </p>
        </div>

        {/* Quiz A/B Switcher, Mode Selector & Attempt Counter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quiz A vs Quiz B Switcher (Quiz mode only) */}
          {isQuizMode && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setActiveQuiz('A');
                  setIsCompleted(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeQuiz === 'A'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Quiz A (20 Qs)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveQuiz('B');
                  setIsCompleted(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeQuiz === 'B'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Quiz B (20 Qs)
              </button>
            </div>
          )}

          {/* Mode Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setMode('tutor');
                setIsTimerRunning(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                mode === 'tutor'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tutor Mode
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('exam');
                if (!isCompleted) setIsTimerRunning(true);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                mode === 'exam'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Exam Timed Mode
            </button>
          </div>

          {/* Attempt Badge (Strict 3 Max Limit - Quiz mode only) */}
          {isQuizMode && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Attempt <span className="font-bold text-indigo-600 dark:text-indigo-400">{Math.min(3, attemptNumber)}</span> / 3
            </div>
          )}
        </div>
      </div>

      {/* Main Question Card & Layout */}
      {!isCompleted ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Stem & Choices (3 Cols) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              {/* Question Metadata Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    Question {currentIndex + 1} of {totalQ}
                  </span>
                  {currentQ?.high_yield_tag && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                      {currentQ.high_yield_tag}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Flag Button */}
                  <button
                    type="button"
                    onClick={handleToggleFlag}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      flaggedQuestions[currentIndex]
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${flaggedQuestions[currentIndex] ? 'fill-amber-500 text-amber-500' : ''}`} />
                    <span>{flaggedQuestions[currentIndex] ? 'Flagged' : 'Flag'}</span>
                  </button>

                  {mode === 'exam' && (
                    <div className="flex items-center gap-1 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTime(timeRemainingSeconds)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Question Stem */}
              <div className="text-sm sm:text-base text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                {currentQ?.question}
              </div>

              {/* Distractor Choices */}
              <div className="space-y-3 pt-2">
                {currentQ?.options.map((option, optIdx) => {
                  const isSelected = selectedOptionIdx === optIdx;
                  const isEliminated = eliminatedOptions[`${currentIndex}_${optIdx}`];
                  const showRationale = mode === 'tutor' && isCurrentAnswered;
                  const isOptionCorrect = optIdx === currentQ.correct_index;

                  let borderStyle = 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50/50 dark:bg-slate-800/40';

                  if (showRationale) {
                    if (isOptionCorrect) {
                      borderStyle = 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100';
                    } else if (isSelected && !isOptionCorrect) {
                      borderStyle = 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100';
                    }
                  } else if (isSelected) {
                    borderStyle = 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100';
                  }

                  const letter = String.fromCharCode(65 + optIdx);

                  return (
                    <div
                      key={optIdx}
                      onClick={() => !isEliminated && handleSelectOption(optIdx)}
                      className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 group ${borderStyle} ${
                        isEliminated ? 'opacity-40 line-through bg-slate-100 dark:bg-slate-900' : ''
                      }`}
                    >
                      {/* Option Letter Indicator */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          showRationale && isOptionCorrect
                            ? 'bg-emerald-600 text-white'
                            : showRationale && isSelected && !isOptionCorrect
                            ? 'bg-rose-600 text-white'
                            : isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 group-hover:bg-indigo-100 group-hover:text-indigo-700'
                        }`}
                      >
                        {showRationale && isOptionCorrect ? (
                          <Check className="w-4 h-4" />
                        ) : showRationale && isSelected && !isOptionCorrect ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          letter
                        )}
                      </div>

                      {/* Option Text */}
                      <div className="flex-1 text-xs sm:text-sm font-medium leading-normal pt-0.5">
                        {option}
                      </div>

                      {/* Strikethrough Distractor Tool Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleEliminate(optIdx, e)}
                        className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer shrink-0 ${
                          isEliminated ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/50' : ''
                        }`}
                        title="Eliminate distractor"
                      >
                        <Strikethrough className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Tutor Mode Immediate Rationale & Clinical Pearl */}
              {mode === 'tutor' && isCurrentAnswered && (
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-2xl flex items-start gap-3 ${
                      isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm">
                        {isCorrect ? 'Correct! High Yield Concept Mastered.' : 'Incorrect Choice.'}
                      </h4>
                      <p className="text-xs mt-1 leading-relaxed">{currentQ.explanation}</p>
                    </div>
                  </div>

                  {/* Clinical Pearl Box */}
                  {currentQ.clinical_pearl && (
                    <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Clinical Pearl & Board Exam Trap</span>
                      </div>
                      <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                        {currentQ.clinical_pearl}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {currentIndex < totalQ - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    Next Question <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishQuiz}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    <Award className="w-4 h-4" /> Submit Quiz ({answeredCount}/{totalQ})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Question Grid Map & Stats (1 Col) */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Question Navigator</h3>

              {/* Grid of Question Numbers */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, idx) => {
                  const isCurrent = currentIndex === idx;
                  const isAnswered = selectedAnswers[idx] !== undefined;
                  const isFlagged = flaggedQuestions[idx];

                  let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
                  if (isCurrent) {
                    bgClass = 'ring-2 ring-indigo-600 bg-indigo-50 dark:bg-indigo-950 font-black text-indigo-600 dark:text-indigo-400';
                  } else if (isAnswered) {
                    bgClass = 'bg-indigo-600 text-white font-bold';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`relative h-9 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer ${bgClass}`}
                    >
                      <span>{idx + 1}</span>
                      {isFlagged && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-indigo-600" />
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-slate-200 dark:bg-slate-700" />
                  <span>Unanswered ({totalQ - answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-amber-400" />
                  <span>Flagged for Review</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* End-of-Quiz Performance Report */
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Practice Session Complete!
            </h2>
            <p className="text-sm text-slate-500">
              Completed attempt <span className="font-bold text-slate-700 dark:text-slate-300">{attemptNumber - 1} of 3</span> for {selection.topic?.name || topicName || 'this topic'}.
            </p>
          </div>

          {/* Big Scorecard Numbers */}
          <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {scorePercent}%
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Accuracy Score
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {finalCorrect} / {totalQ}
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Correct Answers
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-800 dark:text-slate-200">
                {formatTime(600 - timeRemainingSeconds)}
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Time Spent
              </div>
            </div>
          </div>

          {/* 3-Attempt Constraint Notice */}
          {maxAttemptsReached ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium">
              You have completed all 3 permitted attempts for this quiz session. Review the rationales and clinical pearls below to solidify your knowledge.
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              You have <span className="font-bold text-indigo-600 dark:text-indigo-400">{3 - (attemptNumber - 1)}</span> attempts remaining for this quiz.
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {!maxAttemptsReached && (
              <button
                type="button"
                onClick={handleRetakeQuiz}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <RotateCcw className="w-4 h-4" /> Retake Quiz (Attempt {attemptNumber} of 3)
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsCompleted(false);
                setMode('tutor');
                setCurrentIndex(0);
              }}
              className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" /> Review Missed Questions & Pearls
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
