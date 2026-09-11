'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Trash2,
  MessageSquare,
  Sparkles,
  CheckSquare,
} from 'lucide-react';
import {
  A4NotesDocument,
  A4Page,
  A4Section,
  UserHighlight,
  UserAnnotation,
} from '@/lib/types/a4-notes';
import { A4MarkdownContent } from './a4-markdown-content';
import { A4CalloutBlock } from './a4-callout-block';
import { A4TableBlock } from './a4-table-block';
import { A4SelectionToolbar } from './a4-selection-toolbar';
import { A4BlockRenderer } from './a4-block-renderer';

interface A4DocumentReaderProps {
  document: A4NotesDocument;
  onBackToOverview: () => void;
}

interface SelectionTarget {
  selectedText: string;
  pageNumber: number;
  sectionId: string;
  position: { top: number; left: number };
}

export function A4DocumentReader({ document, onBackToOverview }: A4DocumentReaderProps) {
  const isSubtopicScope = document.contentScope === 'SUBTOPIC' && !!document.subtopicName;

  // --------------------------------------------------------------------------
  // 1. FONT SIZE CONTROLS STATE
  // --------------------------------------------------------------------------
  const [fontScale, setFontScale] = useState<number>(100);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('a4_notes_font_scale');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 80 && val <= 130) {
          setFontScale(val);
        }
      }
    } catch {
      // Ignore local storage errors
    }
  }, []);

  const handleFontChange = (delta: number) => {
    setFontScale((prev) => {
      const next = Math.min(130, Math.max(80, prev + delta));
      try {
        localStorage.setItem('a4_notes_font_scale', next.toString());
      } catch {}
      return next;
    });
  };

  // --------------------------------------------------------------------------
  // 2. SEARCH STATE & ENGINE
  // --------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Count total matches dynamically across the canonical document
  const totalMatches = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return 0;

    let count = 0;
    const countOccurrences = (str: string | undefined) => {
      if (!str) return;
      let pos = str.toLowerCase().indexOf(trimmed);
      while (pos !== -1) {
        count++;
        pos = str.toLowerCase().indexOf(trimmed, pos + trimmed.length);
      }
    };

    for (const page of document.pages) {
      for (const section of page.sections) {
        countOccurrences(section.heading);
        countOccurrences(section.contentMarkdown);

        if (section.callouts) {
          for (const callout of section.callouts) {
            countOccurrences(`${callout.title} ${callout.content}`);
          }
        }

        if (section.checklist) {
          for (const item of section.checklist) {
            countOccurrences(item);
          }
        }

        if (section.blocks) {
          for (const block of section.blocks) {
            countOccurrences(block.content);
            if (block.items) {
              for (const item of block.items) {
                countOccurrences(item);
              }
            }
            if (block.formula) {
              countOccurrences(`${block.formula.title} ${block.formula.expression} ${block.formula.explanation || ''}`);
            }
            if (block.memoryAid) {
              countOccurrences(`${block.memoryAid.title} ${block.memoryAid.mnemonic} ${block.memoryAid.context || ''}`);
            }
            if (block.callout) {
              countOccurrences(`${block.callout.title} ${block.callout.content}`);
            }
            if (block.processFlow) {
              countOccurrences(block.processFlow.title);
              for (const step of block.processFlow.steps) {
                countOccurrences(`${step.title} ${step.description || ''}`);
              }
            }
          }
        }
      }
    }
    return count;
  }, [searchQuery, document.pages]);

  // Handle active match scrolling
  const scrollToActiveMatch = useCallback((index: number) => {
    if (index < 0) return;
    setTimeout(() => {
      const targetEl = window.document.getElementById(`search-match-${index}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }, []);

  const handleNextMatch = () => {
    if (totalMatches === 0) return;
    const nextIdx = (activeMatchIndex + 1) % totalMatches;
    setActiveMatchIndex(nextIdx);
    scrollToActiveMatch(nextIdx);
  };

  const handlePrevMatch = () => {
    if (totalMatches === 0) return;
    const prevIdx = (activeMatchIndex - 1 + totalMatches) % totalMatches;
    setActiveMatchIndex(prevIdx);
    scrollToActiveMatch(prevIdx);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setActiveMatchIndex(0);
    if (val.trim()) {
      scrollToActiveMatch(0);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveMatchIndex(0);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Keyboard navigation for search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  // --------------------------------------------------------------------------
  // 3. USER HIGHLIGHTS & ANNOTATIONS STATE & API INTEGRATION
  // --------------------------------------------------------------------------
  const [highlights, setHighlights] = useState<UserHighlight[]>([]);
  const [annotations, setAnnotations] = useState<UserAnnotation[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Selection target state for floating toolbar
  const [selectionTarget, setSelectionTarget] = useState<SelectionTarget | null>(null);

  // Fetch annotations on mount / document change
  useEffect(() => {
    let isMounted = true;

    async function loadUserAnnotations() {
      if (!document.id) return;
      try {
        const res = await fetch(`/api/notes/a4/user-annotations?documentId=${document.id}`);
        if (!res.ok) throw new Error('Failed to load user annotations');
        const data = await res.json();
        if (isMounted) {
          setHighlights(data.highlights || []);
          setAnnotations(data.annotations || []);
        }
      } catch (err) {
        console.error('[A4DocumentReader] Error fetching user annotations:', err);
      }
    }

    loadUserAnnotations();

    return () => {
      isMounted = false;
    };
  }, [document.id]);

  // Handle Text Selection Event
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 2) return;

    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Find parent element to locate page and section
      const anchorNode = sel.anchorNode;
      const element = anchorNode?.nodeType === 1 ? (anchorNode as HTMLElement) : anchorNode?.parentElement;
      const sectionEl = element?.closest('[data-section-id]');
      const pageEl = element?.closest('[data-page-number]');

      const sectionId = sectionEl?.getAttribute('data-section-id') || 'sec-default';
      const pageNumberStr = pageEl?.getAttribute('data-page-number');
      const pageNumber = pageNumberStr ? parseInt(pageNumberStr, 10) : 1;

      setSelectionTarget({
        selectedText: text,
        pageNumber,
        sectionId,
        position: {
          top: rect.top + window.scrollY,
          left: rect.left + rect.width / 2 + window.scrollX,
        },
      });
    } catch {
      // Ignore range calculation errors
    }
  }, []);

  // Add Highlight Handler
  const handleAddHighlight = async (color: 'yellow' | 'green' | 'blue' | 'pink') => {
    if (!selectionTarget) return;

    const payload = {
      type: 'highlight',
      documentId: document.id,
      pageNumber: selectionTarget.pageNumber,
      sectionId: selectionTarget.sectionId,
      selectedText: selectionTarget.selectedText,
      color,
    };

    // Optimistic Update
    const tempId = `temp_hl_${Date.now()}`;
    const newHighlight: UserHighlight = {
      id: tempId,
      pageNumber: selectionTarget.pageNumber,
      sectionId: selectionTarget.sectionId,
      selectedText: selectionTarget.selectedText,
      color,
      createdAt: new Date().toISOString(),
    };

    setHighlights((prev) => [...prev, newHighlight]);
    setSyncStatus('Saving highlight…');

    try {
      const res = await fetch('/api/notes/a4/user-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save highlight');

      // Update with server ID
      setHighlights((prev) =>
        prev.map((h) => (h.id === tempId ? { ...h, id: data.highlight.id } : h))
      );
      setSyncStatus('Highlight saved');
      setTimeout(() => setSyncStatus(null), 2500);
    } catch (err: any) {
      console.error('[handleAddHighlight] Error:', err);
      setHighlights((prev) => prev.filter((h) => h.id !== tempId));
      setSyncStatus('Failed to save highlight');
      setTimeout(() => setSyncStatus(null), 3000);
    } finally {
      window.getSelection()?.removeAllRanges();
      setSelectionTarget(null);
    }
  };

  // Add Annotation Handler
  const handleAddAnnotation = async (noteText: string) => {
    if (!selectionTarget) return;

    const payload = {
      type: 'annotation',
      documentId: document.id,
      pageNumber: selectionTarget.pageNumber,
      sectionId: selectionTarget.sectionId,
      noteText,
    };

    const tempId = `temp_ann_${Date.now()}`;
    const newAnn: UserAnnotation = {
      id: tempId,
      pageNumber: selectionTarget.pageNumber,
      sectionId: selectionTarget.sectionId,
      noteText,
      createdAt: new Date().toISOString(),
    };

    setAnnotations((prev) => [...prev, newAnn]);
    setSyncStatus('Saving note…');

    try {
      const res = await fetch('/api/notes/a4/user-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save annotation');

      setAnnotations((prev) =>
        prev.map((a) => (a.id === tempId ? { ...a, id: data.annotation.id } : a))
      );
      setSyncStatus('Note saved');
      setTimeout(() => setSyncStatus(null), 2500);
    } catch (err: any) {
      console.error('[handleAddAnnotation] Error:', err);
      setAnnotations((prev) => prev.filter((a) => a.id !== tempId));
      setSyncStatus('Failed to save note');
      setTimeout(() => setSyncStatus(null), 3000);
    } finally {
      window.getSelection()?.removeAllRanges();
      setSelectionTarget(null);
    }
  };

  // Delete Highlight Handler
  const handleDeleteHighlight = async (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    setSyncStatus('Deleting highlight…');

    try {
      const res = await fetch(`/api/notes/a4/user-annotations?id=${id}&type=highlight`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete highlight');
      setSyncStatus('Deleted highlight');
      setTimeout(() => setSyncStatus(null), 2000);
    } catch (err) {
      console.error('[handleDeleteHighlight] Error:', err);
      setSyncStatus('Unable to delete highlight');
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  // Delete Annotation Handler
  const handleDeleteAnnotation = async (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setSyncStatus('Deleting note…');

    try {
      const res = await fetch(`/api/notes/a4/user-annotations?id=${id}&type=annotation`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete annotation');
      setSyncStatus('Deleted note');
      setTimeout(() => setSyncStatus(null), 2000);
    } catch (err) {
      console.error('[handleDeleteAnnotation] Error:', err);
      setSyncStatus('Unable to delete note');
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  // Match counter reference for rendering
  const matchCounterRef = useRef({ count: 0 });
  matchCounterRef.current.count = 0;

  return (
    <div
      className="w-full min-h-screen bg-slate-100/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 relative"
      onMouseUp={handleMouseUp}
    >
      {/* Floating Selection Toolbar */}
      <A4SelectionToolbar
        target={selectionTarget}
        onClose={() => setSelectionTarget(null)}
        onAddHighlight={handleAddHighlight}
        onAddAnnotation={handleAddAnnotation}
      />

      {/* Reader Header Toolbar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Back & Document Metadata */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToOverview}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Return to Notes Library Overview"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </button>

            <div className="hidden md:block text-slate-300 dark:text-slate-700">|</div>

            <div className="truncate min-w-0">
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                {document.examName} › {document.subjectName} › {document.topicName}
                {isSubtopicScope ? ` › ${document.subtopicName}` : ''}
              </div>
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                {document.documentTitle}
              </h1>
            </div>
          </div>

          {/* Right: Controls (Font A-/A+, Search, Version/Status) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Sync / Status Toast Badge */}
            {syncStatus && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hidden lg:flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                <span>{syncStatus}</span>
              </span>
            )}

            {/* Font Size Scaling Controls */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5">
              <button
                type="button"
                onClick={() => handleFontChange(-10)}
                disabled={fontScale <= 80}
                className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 text-xs font-black disabled:opacity-30 cursor-pointer"
                title="Decrease font size"
              >
                A−
              </button>
              <span className="px-1.5 text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400">
                {fontScale}%
              </span>
              <button
                type="button"
                onClick={() => handleFontChange(10)}
                disabled={fontScale >= 130}
                className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 text-xs font-black disabled:opacity-30 cursor-pointer"
                title="Increase font size"
              >
                A+
              </button>
            </div>

            {/* Search Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (!isSearchOpen) {
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }
              }}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isSearchOpen || searchQuery
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Search document text"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Search Control Bar */}
        {(isSearchOpen || searchQuery) && (
          <div className="max-w-6xl mx-auto mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 animate-in slide-in-from-top-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search across all document pages…"
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Match Counter & Prev/Next Navigation */}
            <div className="flex items-center gap-1 text-xs shrink-0">
              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold text-[11px]">
                {searchQuery.trim()
                  ? totalMatches > 0
                    ? `${activeMatchIndex + 1} of ${totalMatches}`
                    : '0 matches'
                  : 'Type to search'}
              </span>

              <button
                type="button"
                onClick={handlePrevMatch}
                disabled={totalMatches === 0}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                title="Previous match (Shift+Enter)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleNextMatch}
                disabled={totalMatches === 0}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                title="Next match (Enter)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* A4 Document Pages Container */}
      <div
        className="max-w-4xl mx-auto px-2 sm:px-4 py-6 sm:py-10 space-y-8"
        style={{ fontSize: `${fontScale}%` }}
      >
        {document.pages.map((page: A4Page) => (
          <article
            key={page.pageNumber}
            id={`a4-page-${page.pageNumber}`}
            data-page-number={page.pageNumber}
            className="w-full bg-[#fcfaf4] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 sm:p-10 md:p-12 transition-all relative max-w-full group/sheet"
            style={{
              maxWidth: '820px',
              margin: '0 auto 2rem auto',
            }}
          >
            {/* Top Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-600 dark:bg-indigo-500" />

            {/* Desktop Binder Hole Indents for Study Notebook Character */}
            <div className="hidden md:flex flex-col justify-around absolute left-2.5 top-12 bottom-12 w-3 pointer-events-none opacity-40 group-hover/sheet:opacity-70 transition-opacity">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-800 border border-slate-400/60 dark:border-slate-700 shadow-inner"
                />
              ))}
            </div>

            {/* Page Sheet Header */}
            <header className="pb-3 border-b-2 border-slate-200 dark:border-slate-800 mb-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 font-extrabold text-slate-800 dark:text-slate-200 truncate pr-2">
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-mono text-[11px] font-black tracking-wider shrink-0 shadow-2xs">
                  NeoMCQ
                </span>
                <span className="truncate text-slate-700 dark:text-slate-300">
                  {document.examName} · {document.subjectName} · {document.topicName}
                  {isSubtopicScope ? ` (${document.subtopicName})` : ''}
                </span>
              </div>
              <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 text-[11px]">
                Page {page.pageNumber} of {document.totalPages}
              </div>
            </header>

            {/* Page Title if present */}
            {page.pageTitle && (
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mb-6 tracking-tight pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{page.pageTitle}</span>
              </h2>
            )}

            {/* Page Sections */}
            <div className="space-y-8">
              {page.sections.map((section: A4Section) => {
                const sectionHighlights = highlights.filter(
                  (h) => h.sectionId === section.id || (!h.sectionId && h.pageNumber === page.pageNumber)
                );
                const sectionAnnotations = annotations.filter(
                  (a) => a.sectionId === section.id || (!a.sectionId && a.pageNumber === page.pageNumber)
                );

                const hasStructuredBlocks = section.blocks && section.blocks.length > 0;

                return (
                  <section
                    key={section.id}
                    data-section-id={section.id}
                    data-page-number={page.pageNumber}
                    className="space-y-3 relative group"
                  >
                    {/* Section Heading */}
                    {section.heading && (
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight text-indigo-950 dark:text-indigo-200 flex items-center gap-2 pt-2 border-b border-indigo-100 dark:border-indigo-950 pb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                        <span>{section.heading}</span>
                      </h3>
                    )}

                    {/* STRUCTURED BLOCKS (BATCH 4) */}
                    {hasStructuredBlocks ? (
                      <div className="space-y-3">
                        {section.blocks!.map((block) => (
                          <A4BlockRenderer
                            key={block.id}
                            block={block}
                            searchQuery={searchQuery}
                            activeMatchIndex={activeMatchIndex}
                            sectionId={section.id}
                            highlights={sectionHighlights}
                            onDeleteHighlight={handleDeleteHighlight}
                            matchCounterRef={matchCounterRef}
                          />
                        ))}
                      </div>
                    ) : (
                      /* FALLBACK FOR LEGACY MANUSCRIPTS */
                      <>
                        {/* Markdown Paragraph Content with Highlights & Search */}
                        {section.contentMarkdown && (
                          <A4MarkdownContent
                            content={section.contentMarkdown}
                            searchQuery={searchQuery}
                            activeMatchIndex={activeMatchIndex}
                            sectionId={section.id}
                            highlights={sectionHighlights}
                            onDeleteHighlight={handleDeleteHighlight}
                            matchCounterRef={matchCounterRef}
                          />
                        )}

                        {/* Callout Blocks */}
                        {section.callouts && section.callouts.length > 0 && (
                          <div className="space-y-2">
                            {section.callouts.map((callout, cIdx) => (
                              <A4CalloutBlock key={callout.id || `callout-${cIdx}`} callout={callout} />
                            ))}
                          </div>
                        )}

                        {/* Table Block */}
                        {section.table && <A4TableBlock table={section.table} />}

                        {/* Checklist Items */}
                        {section.checklist && section.checklist.length > 0 && (
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 my-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                              <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Key Checklist & Verification</span>
                            </div>
                            <div className="space-y-1.5 text-xs sm:text-sm">
                              {section.checklist.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-slate-800 dark:text-slate-200">
                                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">✓</span>
                                  <span className="leading-snug">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Active Highlights List / Management Tags for this section */}
                    {sectionHighlights.length > 0 && (
                      <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs my-2">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
                          Highlights:
                        </span>
                        {sectionHighlights.map((hl) => (
                          <div
                            key={hl.id}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-[11px] font-medium"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                hl.color === 'green'
                                  ? 'bg-emerald-500'
                                  : hl.color === 'blue'
                                  ? 'bg-sky-500'
                                  : hl.color === 'pink'
                                  ? 'bg-pink-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <span className="max-w-[120px] truncate text-slate-700 dark:text-slate-300">
                              "{hl.selectedText}"
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteHighlight(hl.id)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                              title="Remove highlight"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Personal Annotations Cards */}
                    {sectionAnnotations.length > 0 && (
                      <div className="space-y-2 my-3">
                        {sectionAnnotations.map((ann) => (
                          <div
                            key={ann.id}
                            className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border-l-4 border-amber-400 dark:border-amber-500 text-slate-800 dark:text-slate-200 space-y-1 shadow-2xs relative group/ann"
                          >
                            <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                              <div className="flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Personal Note</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-amber-700/70 dark:text-amber-400/70 font-normal">
                                  {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAnnotation(ann.id)}
                                  className="text-amber-700 dark:text-amber-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                                  title="Delete note"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-serif italic text-slate-900 dark:text-slate-100">
                              {ann.noteText}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            {/* Page Sheet Footer */}
            <footer className="pt-4 border-t-2 border-slate-200 dark:border-slate-800 mt-8 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <div className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300 truncate">
                <span className="text-indigo-600 dark:text-indigo-400 font-black">NeoMCQ</span>
                <span>•</span>
                <span className="truncate">
                  {document.examName} • {document.subjectName} • {document.topicName}
                </span>
              </div>
              <div className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                Page {page.pageNumber} of {document.totalPages}
              </div>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
