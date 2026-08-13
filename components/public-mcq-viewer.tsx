'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, Loader2, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';

interface PublicMcqProps {
  id: string;
  slug: string;
  question: string;
  options: string[];
  difficulty: string;
  explanation: string | null;
  clinical_pearl: string | null;
  exam_name: string | null;
  exam_slug: string | null;
  subject_name: string | null;
  topic_name: string | null;
}

interface SubmitResult {
  success: boolean;
  is_correct: boolean;
  correct_answer: string;
  explanation: string | null;
  clinical_pearl: string | null;
  rationale: string | null;
  error?: string;
}

export function PublicMcqViewer({ mcq }: { mcq: PublicMcqProps }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedOptionText, setSelectedOptionText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const handleSelectOption = (index: number, text: string) => {
    if (result) return; // Locked after submitting
    setSelectedIndex(index);
    setSelectedOptionText(text);
  };

  const handleSubmit = async () => {
    if (selectedIndex === null || !selectedOptionText || isSubmitting || result) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/mcq/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mcqId: mcq.id,
          selectedIndex,
          selectedOption: selectedOptionText,
        }),
      });

      const data: SubmitResult = await res.json();
      if (res.ok && data.success) {
        setResult(data);
      } else {
        alert(data.error || 'Failed to verify answer. Please try again.');
      }
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Network error verifying answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Taxonomy Header */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
        {mcq.exam_name && (
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            {mcq.exam_name}
          </span>
        )}
        {mcq.subject_name && (
          <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            {mcq.subject_name}
          </span>
        )}
        {mcq.topic_name && (
          <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400">
            {mcq.topic_name}
          </span>
        )}
        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 ml-auto">
          {mcq.difficulty || 'Adaptive'}
        </span>
      </div>

      {/* Question Card */}
      <div className="bg-[#0D1326] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shrink-0 mt-1">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div className="space-y-4 flex-1">
            <h1 className="text-xl md:text-2xl font-medium text-slate-100 leading-relaxed">
              {mcq.question}
            </h1>

            {/* Answer Options */}
            <div className="space-y-3 pt-4">
              {mcq.options.map((optionText, idx) => {
                const isSelected = selectedIndex === idx;
                let optionStyle = 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/40';

                if (result) {
                  const isThisCorrect = optionText === result.correct_answer;
                  if (isThisCorrect) {
                    optionStyle = 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200';
                  } else if (isSelected && !result.is_correct) {
                    optionStyle = 'bg-rose-950/40 border-rose-500/60 text-rose-200';
                  } else {
                    optionStyle = 'bg-slate-900/30 border-slate-800/50 text-slate-500 opacity-60';
                  }
                } else if (isSelected) {
                  optionStyle = 'bg-indigo-950/50 border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-500/10';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx, optionText)}
                    disabled={!!result || isSubmitting}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3.5 group cursor-pointer disabled:cursor-default ${optionStyle}`}
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 bg-slate-800 border border-slate-700 group-hover:border-slate-600">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-base leading-snug pt-0.5 flex-1">{optionText}</span>
                    {result && optionText === result.correct_answer && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {result && isSelected && !result.is_correct && (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Submit Action */}
            {!result && (
              <div className="pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Select an answer option above and submit to verify.
                </span>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={selectedIndex === null || isSubmitting}
                  className="px-6 py-2.5 rounded-xl font-medium text-sm transition-all bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying Answer...
                    </>
                  ) : (
                    'Submit Answer'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post-Submission Result & Rationale Panel */}
      {result && (
        <div className={`p-6 md:p-8 rounded-2xl border transition-all space-y-4 ${
          result.is_correct 
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100' 
            : 'bg-rose-950/20 border-rose-500/30 text-rose-100'
        }`}>
          <div className="flex items-center gap-3">
            {result.is_correct ? (
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <XCircle className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold">
                {result.is_correct ? 'Correct Answer!' : 'Incorrect Answer'}
              </h3>
              <p className="text-sm opacity-80">
                Correct Choice: <span className="font-semibold text-white">{result.correct_answer}</span>
              </p>
            </div>
          </div>

          {(result.explanation || mcq.explanation) && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Educational Explanation
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {result.explanation || mcq.explanation}
              </p>
            </div>
          )}

          {(result.clinical_pearl || mcq.clinical_pearl) && (
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-1">
              <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Key High-Yield Clinical Pearl
              </h5>
              <p className="text-xs text-slate-300">
                {result.clinical_pearl || mcq.clinical_pearl}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
