'use client';

import React from 'react';
import {
  Calculator,
  Brain,
  CheckSquare,
  ArrowRight,
  ArrowDown,
  Quote as QuoteIcon,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { A4Block, UserHighlight } from '@/lib/types/a4-notes';
import { A4CalloutBlock } from './a4-callout-block';
import { A4TableBlock } from './a4-table-block';
import { A4MarkdownContent } from './a4-markdown-content';

function sanitizeSvgXml(svgXml: string): string {
  if (!svgXml) return '';
  // Strip <script> tags and contents
  let clean = svgXml.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  // Strip <iframe>, <object>, <embed> tags
  clean = clean.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '');
  clean = clean.replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '');
  clean = clean.replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, '');
  // Strip inline event attributes like onload=, onerror=, onclick=, etc.
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
  // Neutralize javascript: protocol in attributes
  clean = clean.replace(/href\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, 'href="#"');
  return clean;
}

interface A4BlockRendererProps {
  block: A4Block;
  searchQuery?: string;
  activeMatchIndex?: number;
  sectionId: string;
  highlights?: UserHighlight[];
  onDeleteHighlight?: (id: string) => void;
  matchCounterRef?: React.MutableRefObject<{ count: number }>;
}

export function A4BlockRenderer({
  block,
  searchQuery = '',
  activeMatchIndex = 0,
  sectionId,
  highlights = [],
  onDeleteHighlight,
  matchCounterRef,
}: A4BlockRendererProps) {
  switch (block.type) {
    case 'heading': {
      const level = block.level || 2;
      const headingClass =
        level === 1
          ? 'text-lg sm:text-xl font-black text-indigo-950 dark:text-indigo-100 border-b pb-1 border-indigo-100 dark:border-indigo-900'
          : level === 3
          ? 'text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100'
          : 'text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 text-indigo-950 dark:text-indigo-200';

      return (
        <div className="pt-2 pb-1 break-inside-avoid">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
            <h4 className={headingClass}>{block.content}</h4>
          </div>
        </div>
      );
    }

    case 'paragraph': {
      if (!block.content) return null;
      return (
        <div className="my-2 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          <A4MarkdownContent
            content={block.content}
            searchQuery={searchQuery}
            activeMatchIndex={activeMatchIndex}
            sectionId={sectionId}
            highlights={highlights}
            onDeleteHighlight={onDeleteHighlight}
            matchCounterRef={matchCounterRef}
          />
        </div>
      );
    }

    case 'bullet_list': {
      if (!block.items || block.items.length === 0) return null;
      return (
        <ul className="space-y-1.5 my-2.5 ml-2 sm:ml-3">
          {block.items.map((item, idx) => (
            <li
              key={idx}
              className="text-xs sm:text-sm leading-snug text-slate-800 dark:text-slate-200 flex items-start gap-2"
            >
              <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                ➔
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }

    case 'numbered_list': {
      if (!block.items || block.items.length === 0) return null;
      return (
        <ol className="space-y-2 my-2.5 ml-1 sm:ml-2">
          {block.items.map((item, idx) => (
            <li
              key={idx}
              className="text-xs sm:text-sm leading-snug text-slate-800 dark:text-slate-200 flex items-start gap-2.5"
            >
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-black text-[11px] flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                {idx + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      );
    }

    case 'callout': {
      if (!block.callout) return null;
      return (
        <div className="break-inside-avoid">
          <A4CalloutBlock callout={block.callout} />
        </div>
      );
    }

    case 'comparison_table': {
      if (!block.table) return null;
      return (
        <div className="break-inside-avoid my-3">
          <A4TableBlock table={block.table} />
        </div>
      );
    }

    case 'formula_or_rule': {
      if (!block.formula) return null;
      const { formula } = block;
      return (
        <div className="p-4 rounded-xl bg-sky-50/90 dark:bg-sky-950/40 border-2 border-sky-300 dark:border-sky-800 my-3 space-y-3 shadow-xs break-inside-avoid">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sky-950 dark:text-sky-100 font-bold text-xs sm:text-sm">
              <Calculator className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>{formula.title}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-100 border border-sky-300 dark:border-sky-700">
              FORMULA / RULE
            </span>
          </div>

          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-200 font-mono font-extrabold text-xs sm:text-sm text-center shadow-2xs overflow-x-auto">
            {formula.expression}
          </div>

          {formula.explanation && (
            <p className="text-xs text-sky-900 dark:text-sky-200 leading-relaxed font-medium">
              {formula.explanation}
            </p>
          )}

          {formula.variablesOrConditions && formula.variablesOrConditions.length > 0 && (
            <div className="pt-1 space-y-1 text-xs border-t border-sky-200 dark:border-sky-800">
              <span className="font-bold text-sky-900 dark:text-sky-300 text-[11px] uppercase tracking-wide">
                Parameters & Conditions:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {formula.variablesOrConditions.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex items-baseline gap-1.5 bg-white/80 dark:bg-slate-900/80 px-2 py-1 rounded border border-sky-100 dark:border-sky-900 text-[11px]"
                  >
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-300 shrink-0">
                      {v.name}:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 truncate">{v.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'memory_aid': {
      if (!block.memoryAid) return null;
      const { memoryAid } = block;
      return (
        <div className="p-4 rounded-xl bg-purple-50/90 dark:bg-purple-950/40 border-2 border-purple-300 dark:border-purple-800 my-3 space-y-2.5 shadow-xs break-inside-avoid">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-purple-950 dark:text-purple-100 font-bold text-xs sm:text-sm">
              <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>{memoryAid.title}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-lg bg-purple-600 text-white font-mono font-black text-xs tracking-wider shadow-2xs">
              {memoryAid.mnemonic}
            </span>
          </div>

          {memoryAid.expansion && memoryAid.expansion.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {memoryAid.expansion.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-xs"
                >
                  <span className="w-5 h-5 rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-mono font-black flex items-center justify-center shrink-0">
                    {item.key}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {item.meaning}
                  </span>
                </div>
              ))}
            </div>
          )}

          {memoryAid.context && (
            <p className="text-xs text-purple-900 dark:text-purple-200 font-medium italic pt-1">
              💡 {memoryAid.context}
            </p>
          )}
        </div>
      );
    }

    case 'checklist': {
      if (!block.items || block.items.length === 0) return null;
      return (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 my-3 break-inside-avoid">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
            <span>Key Revision Checklist</span>
          </div>
          <div className="space-y-1.5 text-xs sm:text-sm">
            {block.items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-slate-800 dark:text-slate-200">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">✓</span>
                <span className="leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'process_flow': {
      if (!block.processFlow || !block.processFlow.steps || block.processFlow.steps.length === 0)
        return null;

      const { processFlow } = block;
      const isHorizontal = processFlow.direction === 'horizontal';

      return (
        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-800 my-3 space-y-3 break-inside-avoid shadow-xs">
          {processFlow.title && (
            <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-100 font-extrabold text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{processFlow.title}</span>
            </div>
          )}

          <div
            className={
              isHorizontal
                ? 'flex flex-col sm:flex-row items-center justify-between gap-2 overflow-x-auto pb-1'
                : 'space-y-2'
            }
          >
            {processFlow.steps.map((step, idx) => {
              const isLast = idx === processFlow.steps.length - 1;

              return (
                <React.Fragment key={idx}>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 space-y-1 shadow-2xs flex-1 w-full min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-mono font-bold text-[10px]">
                        STEP {step.stepNumber || idx + 1}
                      </span>
                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                        {step.title}
                      </h5>
                    </div>
                    {step.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                        {step.description}
                      </p>
                    )}
                  </div>

                  {!isLast && (
                    <div className="flex items-center justify-center shrink-0 text-indigo-500 py-1 sm:py-0">
                      {isHorizontal ? (
                        <ArrowRight className="w-4 h-4 hidden sm:block" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      );
    }

    case 'image_or_diagram': {
      if (!block.imageOrDiagram) return null;
      const { imageOrDiagram } = block;

      const sizeClasses =
        imageOrDiagram.widthSize === 'small'
          ? 'max-w-xs mx-auto'
          : imageOrDiagram.widthSize === 'large'
          ? 'max-w-2xl mx-auto'
          : imageOrDiagram.widthSize === 'full'
          ? 'w-full'
          : 'max-w-md mx-auto';

      return (
        <figure className={`my-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2 break-inside-avoid ${sizeClasses}`}>
          {imageOrDiagram.svgXml ? (
            <div
              className="w-full flex items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-slate-900 p-2"
              dangerouslySetInnerHTML={{ __html: sanitizeSvgXml(imageOrDiagram.svgXml) }}
            />
          ) : imageOrDiagram.url ? (
            <img
              src={imageOrDiagram.url}
              alt={imageOrDiagram.altText || 'Study diagram'}
              className="w-full h-auto object-contain max-h-[360px] rounded-xl bg-white dark:bg-slate-900"
              loading="lazy"
            />
          ) : (
            <div className="w-full py-8 px-4 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1">
              <ImageIcon className="w-8 h-8 text-indigo-500 mx-auto" />
              <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                {imageOrDiagram.diagramType || 'Illustrated Concept Diagram'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                {imageOrDiagram.altText}
              </p>
            </div>
          )}

          {imageOrDiagram.caption && (
            <figcaption className="text-center text-xs text-slate-500 dark:text-slate-400 italic font-medium px-2">
              {imageOrDiagram.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case 'quote': {
      if (!block.content) return null;
      return (
        <blockquote className="my-3 p-3.5 rounded-r-xl bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600 text-slate-800 dark:text-slate-200 italic font-serif text-xs sm:text-sm leading-relaxed flex items-start gap-2 break-inside-avoid">
          <QuoteIcon className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5 rotate-180" />
          <span>{block.content}</span>
        </blockquote>
      );
    }

    default:
      return null;
  }
}
