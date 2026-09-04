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
    emerald: 'bg-emerald-100 text-emerald-950 border-emerald-600',
    sky: 'bg-sky-100 text-sky-950 border-sky-600',
    amber: 'bg-amber-100 text-amber-950 border-amber-600',
    purple: 'bg-purple-100 text-purple-950 border-purple-600',
    rose: 'bg-rose-100 text-rose-950 border-rose-600',
    indigo: 'bg-indigo-100 text-indigo-950 border-indigo-600',
    teal: 'bg-teal-100 text-teal-950 border-teal-600',
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
      className="a4-notebook-paper relative w-full aspect-[1/1.414] max-w-[860px] mx-auto p-5 sm:p-8 md:p-10 text-slate-900 bg-[#fcfaf4] rounded-2xl sm:rounded-3xl border-2 border-slate-300 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-2xl select-text"
      style={{
        minHeight: '820px',
      }}
    >
      {/* Top Left Binder / Margin Indents */}
      <div className="absolute left-2.5 sm:left-4 top-1/6 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-slate-300 border border-slate-400 shadow-inner select-none pointer-events-none" />
      <div className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-slate-300 border border-slate-400 shadow-inner select-none pointer-events-none" />
      <div className="absolute left-2.5 sm:left-4 top-5/6 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-slate-300 border border-slate-400 shadow-inner select-none pointer-events-none" />

      {/* Main Page Content */}
      <div className="space-y-3 sm:space-y-4 relative z-10 pl-4 sm:pl-7">
        {/* PAGE 1 HEADER (Exact match to reference sheet) */}
        {page.isFirstPage ? (
          <div className="relative pb-3 sm:pb-4 border-b border-slate-400/50">
            {/* Top Left Taped High-Yield Post-It Note */}
            <div className="absolute -top-3 -left-3 sm:-left-2 z-20">
              <TopLeftTapedPostIt text="High Yield" />
            </div>

            {/* Top Center Title Section */}
            <div className="text-center px-14 sm:px-20 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="font-kalam text-base sm:text-lg text-slate-700">☆</span>
                <span className="font-kalam font-bold text-rose-600 text-sm sm:text-base">
                  &gt;&gt;
                </span>

                <h1 className="text-2xl sm:text-4xl font-kalam font-black tracking-wide text-purple-900 uppercase drop-shadow-xs">
                  {note.title || note.topicName.toUpperCase()}
                </h1>

                <span className="font-kalam font-bold text-rose-600 text-sm sm:text-base">
                  &lt;&lt;
                </span>
                <span className="font-kalam text-base sm:text-lg text-slate-700">☆</span>
              </div>

              {/* Subtitle in parentheses / handwriting */}
              <p className="font-kalam font-medium text-xs sm:text-base text-slate-800">
                {note.subtitle?.startsWith('(')
                  ? note.subtitle
                  : `(${note.subtitle || 'High-Yield Clinical Reference'})`}
              </p>
            </div>

            {/* Top Right Red Circle Acronym Badge */}
            <div className="absolute top-0 right-0 z-10 flex flex-col items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-rose-600 flex items-center justify-center font-kalam font-black text-rose-700 text-sm sm:text-base bg-rose-50 shadow-xs -rotate-6">
                {acronym}
              </div>
            </div>
          </div>
        ) : (
          /* Subsequent Pages Header */
          <div className="border-b border-slate-400/50 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 font-kalam font-bold text-sm sm:text-base text-purple-900">
              <span>☆</span>
              <span>
                {note.topicName} — Part {page.pageNumber}
              </span>
            </div>
            <div className="font-kalam font-bold text-xs text-rose-600">
              Page {page.pageNumber} of {totalPages}
            </div>
          </div>
        )}

        {/* 1. FIRST SHOW THE RELEVANT SUMMARY / OVERVIEW CARD SECTION */}
        {page.isFirstPage && (
          <div className="p-3 sm:p-4 rounded-2xl bg-indigo-50/90 border-2 border-indigo-300 shadow-xs space-y-1.5 font-kalam">
            <div className="flex items-center justify-between text-indigo-950 font-bold text-xs sm:text-sm">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>HIGH-YIELD OVERVIEW CARD</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-200 text-indigo-900 font-black text-[11px] uppercase tracking-wider">
                Summary First
              </span>
            </div>
            <p className="text-xs sm:text-sm text-indigo-900 font-medium leading-relaxed">
              {note.subtitle || `${note.topicName}: Core clinical concepts, diagnostic gold standards, and high-yield board recall points.`}
            </p>
          </div>
        )}

        {/* 2. THEN SHOW THE DETAILED NOTES */}
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
                      <span className="font-kalam text-sm sm:text-base font-bold text-slate-900">
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
                          className="font-kalam text-xs sm:text-sm text-slate-800 leading-snug flex items-start gap-1.5"
                        >
                          <span className="font-bold text-slate-600">➔</span>
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
              <div className="rounded-xl border-2 border-indigo-300 overflow-hidden bg-white/90 shadow-xs font-kalam text-xs">
                <div className="px-3 py-1 bg-indigo-100 font-bold text-indigo-950">
                  📊 {page.comparisonTable.title}
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-800">
                    <tr>
                      {page.comparisonTable.headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-1.5 border-r last:border-r-0 border-slate-200">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {page.comparisonTable.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-1.5 border-r last:border-r-0 border-slate-200">
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
              <div className="p-2.5 rounded-xl bg-purple-50 border-2 border-purple-300 font-kalam text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-purple-950">
                  <span>🧠 High-Yield Mnemonic:</span>
                  <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-950 font-black">
                    {page.mnemonic.mnemonic}
                  </span>
                </div>
                <p className="text-purple-900 leading-snug">
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
      <div className="relative z-10 pt-3 mt-2 border-t-2 border-slate-400/50">
        <div className="rounded-xl border-2 border-sky-800 bg-white px-4 py-2 flex items-center justify-between shadow-xs">
          {/* Left Brand Mark */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-black">
              ★
            </div>
            <span className="font-kalam font-black text-xs sm:text-sm text-sky-950">
              NeoMCQ High-Yield
            </span>
          </div>

          {/* Center Discount / Code banner */}
          <div className="font-kalam font-black text-xs sm:text-base text-sky-900 tracking-wide text-center">
            NeoMCQ High-Yield Notes • Code-NEXT24
          </div>

          {/* Right Star & Page indicator */}
          <div className="flex items-center gap-2 font-kalam text-xs sm:text-sm text-sky-950 font-bold">
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
