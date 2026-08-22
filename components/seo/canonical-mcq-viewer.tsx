'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  BookOpen,
  BrainCircuit,
  Share2,
  Check,
} from 'lucide-react';
import { McqSeoData } from '@/lib/seo/types';

interface CanonicalMcqViewerProps {
  mcq: McqSeoData;
  examSlug: string;
  subjectSlug: string;
  topicSlug: string;
  isAuthenticated?: boolean;
}

export function CanonicalMcqViewer({
  mcq,
  examSlug,
  subjectSlug,
  topicSlug,
  isAuthenticated = false,
}: CanonicalMcqViewerProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [copied, setCopied] = useState(false);

  const options = Array.isArray(mcq.options) ? mcq.options : [];
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  const handleSelectOption = (opt: string) => {
    if (!hasAttempted) {
      setSelectedOption(opt);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;
    setHasAttempted(true);
  };

  const handleShare = async () => {
    if (typeof window !== 'undefined') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        // Fallback
      }
    }
  };

  const isCorrect =
    isAuthenticated && mcq.correct_answer && selectedOption === mcq.correct_answer;

  return (
    <div id="canonical-mcq-container" className="space-y-6">
      {/* MCQ Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0D1326] border border-slate-200 dark:border-slate-800/80 shadow-xl shadow-slate-900/5 dark:shadow-none space-y-6">
        {/* Header Tags & Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {mcq.difficulty || 'High-Yield'}
            </span>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {mcq.question_type === 'clinical_scenario' ? 'Clinical Vignette' : 'Single Best Answer'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-500 transition-colors px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Question</span>
              </>
            )}
          </button>
        </div>

        {/* Question Text */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
            Practice Question
          </p>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
            {mcq.question}
          </h1>
        </div>

        {/* Interactive Options Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          {options.map((opt, idx) => {
            const letter = optionLetters[idx] || String(idx + 1);
            const isSelected = selectedOption === opt;

            let optionStyle =
              'border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200';

            if (isSelected) {
              optionStyle =
                'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/20';
            }

            if (hasAttempted && isAuthenticated && mcq.correct_answer) {
              if (opt === mcq.correct_answer) {
                optionStyle =
                  'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20';
              } else if (isSelected && opt !== mcq.correct_answer) {
                optionStyle =
                  'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20';
              }
            }

            return (
              <button
                key={opt}
                type="button"
                id={`mcq-option-${idx}`}
                disabled={hasAttempted}
                onClick={() => handleSelectOption(opt)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${optionStyle}`}
              >
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {letter}
                </span>
                <span className="text-sm font-medium leading-relaxed pt-0.5">{opt}</span>
              </button>
            );
          })}

          {!hasAttempted && (
            <div className="pt-4 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                Select an option to evaluate your diagnostic reasoning
              </span>
              <button
                type="submit"
                id="submit-mcq-attempt-btn"
                disabled={!selectedOption}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 shrink-0"
              >
                <span>Submit Answer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </form>

        {/* AUTHENTICATED RESULT VIEW */}
        {hasAttempted && isAuthenticated && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-emerald-400">Correct Answer!</h3>
                    <p className="text-xs text-slate-400">Mastery level recorded for spaced repetition.</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-rose-400">Incorrect Choice</h3>
                    <p className="text-xs text-slate-400">
                      Correct option: <span className="text-emerald-400 font-semibold">{mcq.correct_answer}</span>
                    </p>
                  </div>
                </>
              )}
            </div>

            {mcq.explanation && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4" />
                  Detailed Clinical Rationale
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {mcq.explanation}
                </p>
              </div>
            )}

            {mcq.clinical_pearl && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-400">
                  <Sparkles className="w-4 h-4" /> High-Yield Board Pearl
                </span>
                <p>{mcq.clinical_pearl}</p>
              </div>
            )}
          </div>
        )}

        {/* ANONYMOUS GATED CTA (STRICT SECURITY: Explanation NEVER rendered to unauthenticated visitor) */}
        {hasAttempted && !isAuthenticated && (
          <div
            id="unauthenticated-explanation-gate"
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/30 text-white space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Answer Validation & Diagnostic Rationale</span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
                Free Student Access
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Unlock Complete Explanation & Clinical Pearls
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                You selected an answer for this {mcq.exam_name || 'medical'} practice question. Create a free NeoMCQ account to immediately view:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-200">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Step-by-step diagnostic reasoning</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>High-yield distractor analysis</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Board high-yield clinical pearls</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Adaptive spaced repetition tracking</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href={`/login?redirect=/${examSlug}/${subjectSlug}/${topicSlug}/mcq/${mcq.slug}`}
                id="signup-to-unlock-btn"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all text-center flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>Sign Up Free to View Explanation</span>
              </Link>
              <Link
                href={`/login?redirect=/${examSlug}/${subjectSlug}/${topicSlug}/mcq/${mcq.slug}`}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-semibold transition-all text-center"
              >
                Existing User? Sign In
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Trust & Academic Validation Footer */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-500" />
          <span>Curated for {mcq.exam_name || 'Global Licensing Exams'} syllabus standards</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`/${examSlug}/${subjectSlug}/${topicSlug}/mcq`}
            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>More {mcq.topic_name || 'Topic'} MCQs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
