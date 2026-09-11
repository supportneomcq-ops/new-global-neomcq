'use client';

import React from 'react';
import {
  FileText,
  BookOpen,
  Layers,
  Sparkles,
  Clock,
  ArrowRight,
  RotateCw,
  CheckCircle2,
  Bookmark,
  ShieldCheck,
  ListTree,
} from 'lucide-react';
import { A4NotesDocument } from '@/lib/types/a4-notes';

interface A4LibraryOverviewProps {
  document: A4NotesDocument;
  onReadNotes: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function A4LibraryOverview({
  document,
  onReadNotes,
  onRefresh,
  isRefreshing = false,
}: A4LibraryOverviewProps) {
  const isSubtopicScope = document.contentScope === 'SUBTOPIC' && !!document.subtopicName;

  // Format creation or update date
  const formattedDate = document.createdAt
    ? new Date(document.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recent';

  // Count total sections across pages
  const totalSections = document.pages.reduce(
    (acc, page) => acc + (page.sections?.length || 0),
    0
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Scope Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center flex-wrap gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <span>{document.examName}</span>
            <span>›</span>
            <span>{document.subjectName}</span>
            <span>›</span>
            <span className="text-slate-800 dark:text-slate-200 font-bold">{document.topicName}</span>
            {isSubtopicScope && (
              <>
                <span>›</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{document.subtopicName}</span>
              </>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>A4 Notes Library</span>
          </h2>
        </div>

        {/* Scope Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase border flex items-center gap-1.5 ${
              isSubtopicScope
                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isSubtopicScope ? 'Subtopic Scope' : 'Topic Scope'}</span>
          </span>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>30-Day Canonical</span>
          </span>
        </div>
      </div>

      {/* Main Canonical A4 Resource Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all">
        {/* Top Accent Stripe */}
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 w-full" />

        <div className="p-6 sm:p-8 lg:p-10 space-y-6">
          {/* Title & Primary Metadata */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Version {document.version}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                {document.documentTitle}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Structured A4 exam manuscript covering essential concepts, core frameworks, high-yield insights, and diagnostic comparison tables.
              </p>
            </div>

            {/* Read Notes CTA Button */}
            <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2">
              <button
                type="button"
                onClick={onReadNotes}
                className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
              >
                <BookOpen className="w-5 h-5 group-hover:rotate-6 transition-transform" />
                <span>Read Notes</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Regenerate/update canonical manuscript"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing…' : 'Force Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Pages
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {document.totalPages} A4 Pages
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Scope Level
              </div>
              <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                {document.contentScope}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sections
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {totalSections} Modules
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Last Updated
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Table of Contents / Outline Preview */}
          {document.tableOfContents && document.tableOfContents.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ListTree className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Document Outline & Table of Contents</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {document.tableOfContents.map((toc) => (
                  <div
                    key={toc.pageNumber}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold mr-1.5">
                        P.{toc.pageNumber}
                      </span>
                      <span>{toc.title}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold shrink-0">
                      {toc.sectionIds?.length || 1} sections
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Callout Info */}
          <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This document is generated and formatted as a printable A4 manuscript tailored specifically to{' '}
              <strong className="font-bold">{isSubtopicScope ? document.subtopicName : document.topicName}</strong> under{' '}
              <strong className="font-bold">{document.subjectName} ({document.examName})</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
