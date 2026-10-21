'use client';

import React, { useState } from 'react';
import { ExamItem } from '@/lib/homepage-config';
import { Search, Sparkles, Stethoscope, Activity, HeartPulse, Atom, Landmark, GraduationCap, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface ExamCategoriesSectionProps {
  exams: ExamItem[];
  onSelectExam?: (exam: ExamItem) => void;
}

const CATEGORIES = ['All', 'Medical', 'Engineering', 'Civil Services', 'College Entrance', 'Professional', 'Custom'];

export function ExamCategoriesSection({ exams, onSelectExam }: ExamCategoriesSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExams = exams.filter((exam) => {
    const matchesCategory = selectedCategory === 'All' || exam.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Stethoscope':
        return <Stethoscope className="w-5 h-5 text-violet-500" />;
      case 'Activity':
        return <Activity className="w-5 h-5 text-cyan-500" />;
      case 'HeartPulse':
        return <HeartPulse className="w-5 h-5 text-rose-500" />;
      case 'Atom':
        return <Atom className="w-5 h-5 text-indigo-500" />;
      case 'Landmark':
        return <Landmark className="w-5 h-5 text-amber-500" />;
      case 'GraduationCap':
        return <GraduationCap className="w-5 h-5 text-emerald-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-violet-500" />;
    }
  };

  return (
    <section id="exams" className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-10">
        <span className="px-3.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider">
          Comprehensive Blueprints
        </span>
        <h2 className="font-heading font-black text-2xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
          Prepare for <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500">Every Global Examination</span>
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
          Choose your exam syllabus below to access AI-generated adaptive question banks, timed mock tests, and active recall flashcards.
        </p>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        
        {/* Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exam or subject..."
            className="w-full pl-10 pr-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

      </div>

      {/* Exam Cards Grid */}
      {filteredExams.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-slate-700 dark:text-slate-300 font-semibold">No exams found matching your search query.</p>
          <p className="text-xs text-slate-500 mt-1">Try clearing filters or search for another keyword.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="group relative bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 hover:border-violet-500/50 dark:hover:border-violet-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200/50 dark:border-violet-800/40">
                    {getIcon(exam.icon)}
                  </div>
                  {exam.popularBadge && (
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold">
                      {exam.popularBadge}
                    </span>
                  )}
                </div>

                {/* Exam Title */}
                <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-cyan-400 transition-colors">
                  {exam.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  <span className="font-semibold text-violet-600 dark:text-violet-400">{exam.questionCount}</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                    {exam.difficulty}
                  </span>
                </div>

                {/* High Yield Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {exam.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <Link
                href="/onboarding"
                onClick={() => onSelectExam && onSelectExam(exam)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600 text-slate-800 dark:text-slate-200 font-heading font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:shadow-md"
              >
                <span>Start Practice</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
