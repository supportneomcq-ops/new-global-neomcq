'use client';

import React from 'react';
import { HandwrittenA4Page, HandwrittenA4NotePackage } from '@/types/notes-a4.types';
import {
  HandwrittenBulletIcon,
  HandDrawnDiagram,
  TopLeftTapedPostIt,
  BottomRightStickyKeyPoints,
} from './diagram-icons';
import { Sparkles } from 'lucide-react';

interface A4PageSheetProps {
  note: HandwrittenA4NotePackage;
  page: HandwrittenA4Page;
  pageIndex: number;
  totalPages: number;
}

export function A4PageSheet({
  note,
  page,
  pageIndex,
  totalPages,
}: A4PageSheetProps) {
  // Highlight box color variations matching handwritten ink styles
  const highlightBoxStyles: Record<string, string> = {
    emerald: 'bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-100 border-emerald-500/80 dark:border-emerald-500',
    sky: 'bg-sky-100/90 dark:bg-sky-950/80 text-sky-950 dark:text-sky-100 border-sky-600/80 dark:border-sky-500',
    amber: 'bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-100 border-amber-600/80 dark:border-amber-500',
    purple: 'bg-purple-100/90 dark:bg-purple-950/80 text-purple-950 dark:text-purple-100 border-purple-600/80 dark:border-purple-500',
    rose: 'bg-rose-100/90 dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 border-rose-600/80 dark:border-rose-500',
    indigo: 'bg-indigo-100/90 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-100 border-indigo-600/80 dark:border-indigo-500',
    teal: 'bg-teal-100/90 dark:bg-teal-950/80 text-teal-950 dark:text-teal-100 border-teal-600/80 dark:border-teal-500',
  };

  // Generate short topic acronym (e.g., MG for Myasthenia Gravis)
  const acronym =
    note.topicName
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3) || 'HY';

  return (
    <div
      id="a4-active-page-render"
      className="a4-notebook-paper relative w-full aspect-[1/1.414] max-w-[860px] mx-auto p-5 sm:p-8 md:p-10 text-slate-900 dark:text-slate-100 rounded-2xl sm:rounded-3xl border-2 border-slate-300/90 dark:border-slate-800 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-2xl select-text"
      style={{
        minHeight: '820px',
      }}
    >
      {/* Top Left Binder / Margin Indents */}
      <div className="absolute left-2.5 sm:left-4 top-1/6 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-slate-300/70 dark:bg-slate-800 border border-slate-400/40 shadow-inner select-none pointer-events-none" />
      <div className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-slate-300/70 dark:bg-slate-800 border border-slate-400/40 shadow-inner select-none pointer-events-none" />
      <div className="absolute left-2.5 sm:left-4 top-5/6 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-slate-300/70 dark:bg-slate-800 border border-slate-400/40 shadow-inner select-none pointer-events-none" />

      {/* Main Page Content */}
      <div className="space-y-3 sm:space-y-4 relative z-10 pl-4 sm:pl-7">
        {/* PAGE 1 HEADER (Exact match to reference sheet) */}
        {page.isFirstPage ? (
          <div className="relative pb-3 sm:pb-4 border-b border-slate-400/30 dark:border-slate-600/30">
            {/* Top Left Taped High-Yield Post-It Note */}
            <div className="absolute -top-3 -left-3 sm:-left-2 z-20">
              <TopLeftTapedPostIt text="High Yield" />
            </div>

            {/* Top Center Title Section */}
            <div className="text-center px-14 sm:px-20 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="font-kalam text-base sm:text-lg text-slate-700 dark:text-slate-300">☆</span>
                <span className="font-kalam font-bold text-rose-500 dark:text-rose-400 text-sm sm:text-base">
                  &gt;&gt;
                </span>

                <h1 className="text-2xl sm:text-4xl font-kalam font-black tracking-wide text-purple-900 dark:text-purple-300 uppercase drop-shadow-xs">
                  {note.title || note.topicName.toUpperCase()}
                </h1>

                <span className="font-kalam font-bold text-rose-500 dark:text-rose-400 text-sm sm:text-base">
                  &lt;&lt;
                </span>
                <span className="font-kalam text-base sm:text-lg text-slate-700 dark:text-slate-300">☆</span>
              </div>

              {/* Subtitle in parentheses / handwriting */}
              <p className="font-kalam font-medium text-xs sm:text-base text-slate-800 dark:text-slate-200">
                {note.subtitle?.startsWith('(')
                  ? note.subtitle
                  : `(${note.subtitle || 'Autoimmune disorder of Neuromuscular Junction'})`}
              </p>
            </div>

            {/* Top Right Red Circle Acronym Badge */}
            <div className="absolute top-0 right-0 z-10 flex flex-col items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-rose-600 dark:border-rose-500 flex items-center justify-center font-kalam font-black text-rose-700 dark:text-rose-400 text-sm sm:text-base bg-rose-50/80 dark:bg-rose-950/60 shadow-xs -rotate-6">
                {acronym}
              </div>
            </div>
          </div>
        ) : (
          /* Subsequent Pages Header */
          <div className="border-b border-slate-400/30 dark:border-slate-600/30 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 font-kalam font-bold text-sm sm:text-base text-purple-900 dark:text-purple-300">
              <span>☆</span>
              <span>
                {note.topicName} — Part {page.pageNumber}
              </span>
            </div>
            <div className="font-kalam font-bold text-xs text-rose-600 dark:text-rose-400">
              Page {page.pageNumber} of {totalPages}
            </div>
          </div>
        )}

        {/* Note Items List */}
        <div className="space-y-2.5 sm:space-y-3.5">
          {page.items.map((item, idx) => (
            <div key={item.id || idx} className="relative group">
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                {/* Left Bullet + Label + Boxed Text + Bullets */}
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    {/* Red Heart Bullet Icon */}
                    <div className="mt-0.5 shrink-0">
                      <HandwrittenBulletIcon
                        type={item.bulletIcon || 'heart'}
                        color={item.bulletColor || 'red'}
                        className="w-4 h-4 sm:w-5 sm:h-5"
                      />
                    </div>

                    {/* Category Label + Boxed Answer */}
                    <div className="flex-1 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                      <span className="font-kalam text-sm sm:text-base font-bold text-[#1e293b] dark:text-slate-100">
                        {item.label}
                      </span>

                      {item.boxedHighlight && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border-2 font-kalam font-black text-xs sm:text-sm tracking-wide shadow-xs ${
                            highlightBoxStyles[item.highlightColor] || highlightBoxStyles.emerald
                          }`}
                        >
                          {item.boxedHighlight}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Indented explanation bullets with arrows */}
                  {item.explanationBullets && item.explanationBullets.length > 0 && (
                    <ul className="space-y-0.5 mt-1 ml-6 sm:ml-7">
                      {item.explanationBullets.map((bullet, bIdx) => (
                        <li
                          key={bIdx}
                          className="font-kalam text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-snug flex items-start gap-1.5"
                        >
                          <span className="font-bold text-slate-600 dark:text-slate-400">➔</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Right-Side Hand-Drawn Diagram */}
                {item.diagramType && (
                  <div className="shrink-0 w-28 sm:w-36 md:w-44 flex justify-end">
                    <HandDrawnDiagram
                      type={item.diagramType}
                      caption={item.diagramCaption}
                      sideText={item.sideAnnotation}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* BOTTOM SECTION: Key Points Sticky Note / Mnemonics / Comparison Table */}
        <div className="pt-2 flex flex-wrap items-end justify-between gap-4">
          {/* Left space filler or comparison table */}
          <div className="flex-1 min-w-[240px]">
            {page.comparisonTable && (
              <div className="rounded-xl border-2 border-indigo-300 dark:border-indigo-800 overflow-hidden bg-white/70 dark:bg-slate-900/70 shadow-xs font-kalam text-xs">
                <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-950 font-bold text-indigo-950 dark:text-indigo-200">
                  📊 {page.comparisonTable.title}
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300">
                    <tr>
                      {page.comparisonTable.headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-1.5 border-r last:border-r-0 border-slate-200 dark:border-slate-700">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {page.comparisonTable.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-1.5 border-r last:border-r-0 border-slate-200 dark:border-slate-700">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {page.mnemonic && !page.comparisonTable && (
              <div className="p-2.5 rounded-xl bg-purple-50/90 dark:bg-purple-950/70 border-2 border-purple-300 dark:border-purple-800 font-kalam text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-purple-950 dark:text-purple-200">
                  <span>🧠 High-Yield Mnemonic:</span>
                  <span className="px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-900 text-purple-950 dark:text-purple-100 font-black">
                    {page.mnemonic.mnemonic}
                  </span>
                </div>
                <p className="text-purple-900 dark:text-purple-300 leading-snug">
                  {page.mnemonic.clinicalContext}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Right Yellow Ruled Sticky Note (matching image) */}
          {(page.isFirstPage || page.stickyBox) && (
            <div className="shrink-0 self-end">
              <BottomRightStickyKeyPoints
                title={page.stickyBox?.title || 'Key Points'}
                items={
                  page.stickyBox?.points || [
                    'Autoimmune',
                    'Fatigability',
                    'Fluctuating weakness',
                    'Normal DTR',
                  ]
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* FOOTER BAR (Exact match to reference sheet footer) */}
      <div className="relative z-10 pt-3 mt-2 border-t-2 border-slate-400/30 dark:border-slate-700/30">
        <div className="rounded-xl border-2 border-sky-800/80 dark:border-sky-500/80 bg-white/80 dark:bg-slate-900/80 px-4 py-2 flex items-center justify-between shadow-xs">
          {/* Left Brand Mark */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-black">
              ★
            </div>
            <span className="font-kalam font-black text-xs sm:text-sm text-sky-950 dark:text-sky-200">
              NeoMCQ Cerebellum
            </span>
          </div>

          {/* Center Discount / Code banner */}
          <div className="font-kalam font-black text-xs sm:text-base text-sky-900 dark:text-sky-100 tracking-wide text-center">
            NeoMCQ High-Yield Notes • Code-NEXT24
          </div>

          {/* Right Star & Page indicator */}
          <div className="flex items-center gap-2 font-kalam text-xs sm:text-sm text-sky-950 dark:text-sky-200 font-bold">
            <span>☆</span>
            <span>
              P.{page.pageNumber}/{totalPages}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
