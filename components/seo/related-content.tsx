import React from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight, HelpCircle, GraduationCap, FolderTree } from 'lucide-react';
import { McqSeoData, TopicSeoData, SubjectSeoData, ExamSeoData } from '@/lib/seo/types';

interface RelatedContentProps {
  exam: ExamSeoData;
  subject?: SubjectSeoData;
  topic?: TopicSeoData;
  relatedMcqs?: McqSeoData[];
  relatedTopics?: TopicSeoData[];
  className?: string;
}

export function RelatedContent({
  exam,
  subject,
  topic,
  relatedMcqs = [],
  relatedTopics = [],
  className = '',
}: RelatedContentProps) {
  return (
    <aside id="seo-related-content" className={`space-y-8 ${className}`}>
      {/* Related MCQs from same Topic */}
      {relatedMcqs.length > 0 && topic && subject && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0D1326] border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              Related Practice Questions
            </h3>
            <Link
              href={`/${exam.slug}/${subject.slug}/${topic.slug}/mcq`}
              className="text-xs text-indigo-500 hover:text-indigo-400 font-semibold inline-flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {relatedMcqs.slice(0, 4).map((m) => (
              <Link
                key={m.id}
                href={`/${exam.slug}/${subject.slug}/${topic.slug}/mcq/${m.slug}`}
                className="block p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border border-slate-200/60 dark:border-slate-800/60 hover:border-indigo-500/30 transition-all group"
              >
                <p className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 font-medium line-clamp-2 leading-relaxed">
                  {m.question}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="capitalize">{m.difficulty}</span>
                  <span className="text-indigo-500 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                    Solve Question →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Topics in this Subject */}
      {relatedTopics.length > 0 && subject && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0D1326] border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-indigo-500" />
            {subject.name} Syllabus Topics
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {relatedTopics.map((t) => (
              <Link
                key={t.slug}
                href={`/${exam.slug}/${subject.slug}/${t.slug}`}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 hover:bg-indigo-500/10 border border-slate-200/60 dark:border-slate-800/60 hover:border-indigo-500/30 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-500 transition-all flex items-center justify-between"
              >
                <span className="truncate">{t.name}</span>
                <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* High-Yield Study Pack Promotion */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 space-y-4">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white">
            {exam.name} Smart Preparation
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Practice unlimited high-yield questions with personalized AI tutor guidance, error pattern detection, and spaced-repetition flashcards.
          </p>
        </div>
        <Link
          href={`/login?redirect=/${exam.slug}`}
          className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
        >
          Start Practicing Now
        </Link>
      </div>
    </aside>
  );
}
