'use client';

import React from 'react';
import { UserHighlight } from '@/lib/types/a4-notes';

interface A4MarkdownContentProps {
  content: string;
  className?: string;
  searchQuery?: string;
  activeMatchIndex?: number;
  sectionId?: string;
  highlights?: UserHighlight[];
  onDeleteHighlight?: (id: string) => void;
  // Ref or callback to count search matches
  registerMatch?: (match: { elementId: string; text: string }) => void;
  matchCounterRef?: React.MutableRefObject<{ count: number }> | { count: number };
}

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: 'bg-yellow-200/90 dark:bg-yellow-800/80 text-slate-900 dark:text-slate-100 px-0.5 rounded',
  green: 'bg-emerald-200/90 dark:bg-emerald-800/80 text-slate-900 dark:text-slate-100 px-0.5 rounded',
  blue: 'bg-sky-200/90 dark:bg-sky-800/80 text-slate-900 dark:text-slate-100 px-0.5 rounded',
  pink: 'bg-pink-200/90 dark:bg-pink-800/80 text-slate-900 dark:text-slate-100 px-0.5 rounded',
};

/**
 * Utility to process text with both User Highlights and Search Query matching.
 */
function processTextNode(
  text: string,
  searchQuery?: string,
  activeMatchIndex?: number,
  highlights?: UserHighlight[],
  matchCounterRef?: React.MutableRefObject<{ count: number }> | { count: number }
): React.ReactNode[] {
  if (!text) return [text];

  const trimmedQuery = searchQuery?.trim().toLowerCase();
  const validHighlights = (highlights || []).filter((h) => h.selectedText && h.selectedText.trim());

  // If neither search query nor user highlights present, return text as is
  if (!trimmedQuery && validHighlights.length === 0) {
    return [text];
  }

  // Create segments for user highlights first, then search matches
  // For simplicity and performance, split text by matching terms
  let segments: Array<{ text: string; type: 'plain' | 'highlight' | 'search'; color?: string; matchIndex?: number }> = [
    { text, type: 'plain' },
  ];

  // 1. Process User Highlights
  if (validHighlights.length > 0) {
    for (const hl of validHighlights) {
      const target = hl.selectedText;
      const targetLower = target.toLowerCase();
      const nextSegments: typeof segments = [];

      for (const seg of segments) {
        if (seg.type !== 'plain') {
          nextSegments.push(seg);
          continue;
        }

        let currText = seg.text;
        let idx = currText.toLowerCase().indexOf(targetLower);

        while (idx !== -1) {
          if (idx > 0) {
            nextSegments.push({ text: currText.substring(0, idx), type: 'plain' });
          }
          nextSegments.push({
            text: currText.substring(idx, idx + target.length),
            type: 'highlight',
            color: hl.color,
          });
          currText = currText.substring(idx + target.length);
          idx = currText.toLowerCase().indexOf(targetLower);
        }

        if (currText.length > 0) {
          nextSegments.push({ text: currText, type: 'plain' });
        }
      }

      segments = nextSegments;
    }
  }

  // 2. Process Search Matches
  if (trimmedQuery && trimmedQuery.length > 0) {
    const nextSegments: typeof segments = [];

    for (const seg of segments) {
      // Allow searching inside plain and highlighted text
      let currText = seg.text;
      let idx = currText.toLowerCase().indexOf(trimmedQuery);

      while (idx !== -1) {
        if (idx > 0) {
          nextSegments.push({ ...seg, text: currText.substring(0, idx) });
        }

        const counterObj = matchCounterRef ? ('current' in matchCounterRef ? matchCounterRef.current : matchCounterRef) : null;
        const matchIdx = counterObj ? counterObj.count++ : 0;
        nextSegments.push({
          text: currText.substring(idx, idx + trimmedQuery.length),
          type: 'search',
          matchIndex: matchIdx,
        });

        currText = currText.substring(idx + trimmedQuery.length);
        idx = currText.toLowerCase().indexOf(trimmedQuery);
      }

      if (currText.length > 0) {
        nextSegments.push({ ...seg, text: currText });
      }
    }

    segments = nextSegments;
  }

  // Convert segments to React elements
  return segments.map((seg, i) => {
    if (seg.type === 'highlight') {
      const colorClass = HIGHLIGHT_COLOR_MAP[seg.color || 'yellow'] || HIGHLIGHT_COLOR_MAP.yellow;
      return (
        <mark key={`hl_${i}`} className={colorClass}>
          {seg.text}
        </mark>
      );
    }

    if (seg.type === 'search') {
      const isActive = seg.matchIndex === activeMatchIndex;
      return (
        <mark
          key={`src_${i}`}
          id={`search-match-${seg.matchIndex}`}
          data-search-match="true"
          className={
            isActive
              ? 'bg-amber-500 text-slate-900 font-black px-1 rounded ring-2 ring-amber-400 shadow-sm transition-all'
              : 'bg-amber-300 dark:bg-amber-700 text-slate-900 dark:text-slate-100 px-0.5 rounded transition-all'
          }
        >
          {seg.text}
        </mark>
      );
    }

    return <span key={`pl_${i}`}>{seg.text}</span>;
  });
}

/**
 * Formats inline Markdown styles (**bold**, *italic*, `code`) with highlight support
 */
function renderInlineMarkdown(
  text: string,
  searchQuery?: string,
  activeMatchIndex?: number,
  highlights?: UserHighlight[],
  matchCounterRef?: React.MutableRefObject<{ count: number }> | { count: number }
): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-slate-900 dark:text-slate-100">
          {processTextNode(part.slice(2, -2), searchQuery, activeMatchIndex, highlights, matchCounterRef)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-slate-800 dark:text-slate-200">
          {processTextNode(part.slice(1, -1), searchQuery, activeMatchIndex, highlights, matchCounterRef)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-[0.9em]"
        >
          {processTextNode(part.slice(1, -1), searchQuery, activeMatchIndex, highlights, matchCounterRef)}
        </code>
      );
    }
    return <React.Fragment key={index}>{processTextNode(part, searchQuery, activeMatchIndex, highlights, matchCounterRef)}</React.Fragment>;
  });
}

/**
 * Lightweight, generic Markdown Content renderer for A4 Notes.
 * Supports Search Query matching & User Highlights.
 */
export function A4MarkdownContent({
  content,
  className = '',
  searchQuery,
  activeMatchIndex,
  sectionId,
  highlights = [],
  matchCounterRef,
}: A4MarkdownContentProps) {
  if (!content) return null;

  const sectionHighlights = highlights.filter((h) => !sectionId || h.sectionId === sectionId);

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'bullet' | 'number'; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!currentList) return;
    if (currentList.type === 'bullet') {
      elements.push(
        <ul key={key} className="list-disc list-inside space-y-1 my-2 pl-2 text-slate-700 dark:text-slate-300">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineMarkdown(item, searchQuery, activeMatchIndex, sectionHighlights, matchCounterRef)}
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key} className="list-decimal list-inside space-y-1 my-2 pl-2 text-slate-700 dark:text-slate-300">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineMarkdown(item, searchQuery, activeMatchIndex, sectionHighlights, matchCounterRef)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(`list_${index}`);
      return;
    }

    if (trimmed.startsWith('#')) {
      flushList(`list_${index}`);
      const headingText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4
          key={`h_${index}`}
          className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 mt-4 mb-2 tracking-tight"
        >
          {renderInlineMarkdown(headingText, searchQuery, activeMatchIndex, sectionHighlights, matchCounterRef)}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.substring(2);
      if (currentList && currentList.type === 'bullet') {
        currentList.items.push(itemText);
      } else {
        flushList(`list_${index}`);
        currentList = { type: 'bullet', items: [itemText] };
      }
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s/, '');
      if (currentList && currentList.type === 'number') {
        currentList.items.push(itemText);
      } else {
        flushList(`list_${index}`);
        currentList = { type: 'number', items: [itemText] };
      }
      return;
    }

    if (trimmed.startsWith('> ')) {
      flushList(`list_${index}`);
      const quoteText = trimmed.substring(2);
      elements.push(
        <blockquote
          key={`q_${index}`}
          className="border-l-4 border-indigo-500 pl-4 py-1.5 my-3 text-slate-700 dark:text-slate-300 italic bg-indigo-50/50 dark:bg-indigo-950/30 rounded-r-lg"
        >
          {renderInlineMarkdown(quoteText, searchQuery, activeMatchIndex, sectionHighlights, matchCounterRef)}
        </blockquote>
      );
      return;
    }

    flushList(`list_${index}`);
    elements.push(
      <p key={`p_${index}`} className="my-2 leading-relaxed text-slate-700 dark:text-slate-300">
        {renderInlineMarkdown(trimmed, searchQuery, activeMatchIndex, sectionHighlights, matchCounterRef)}
      </p>
    );
  });

  flushList('list_end');

  return <div className={`text-sm sm:text-base ${className}`}>{elements}</div>;
}
