'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ZoomIn,
  ZoomOut,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useSelection } from '@/lib/context/selection-context';
import { HandwrittenA4NotePackage } from '@/types/notes-a4.types';
import { A4PageSheet } from './a4-page-sheet';

interface A4NotebookViewerProps {
  onBookmark?: (bookmarked: boolean) => void;
}

export function A4NotebookViewer({ onBookmark }: A4NotebookViewerProps) {
  const { selection } = useSelection();
  const [note, setNote] = useState<HandwrittenA4NotePackage | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const notebookContainerRef = useRef<HTMLDivElement>(null);

  // Fetch or generate the A4 note whenever the active selection changes
  useEffect(() => {
    let isMounted = true;

    async function fetchNote() {
      if (!selection.topic?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/notes/a4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId: selection.exam?.id || 'default_exam',
            subjectId: selection.subject?.id || 'default_subject',
            topicId: selection.topic.id,
            subtopicId: selection.subtopic?.id || null,
            examName: selection.exam?.name || 'Medical Examination',
            subjectName: selection.subject?.name || 'Clinical Medicine',
            topicName: selection.topic.name || 'High-Yield Topic',
            subtopicName: selection.subtopic?.name || null,
            version: selectedVersion,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to load A4 notes');
        }

        const data = await response.json();
        if (isMounted) {
          setNote(data.note);
          setCurrentPage(0);
        }
      } catch (err: any) {
        console.error('[A4NotebookViewer] Error fetching note:', err);
        if (isMounted) {
          setError(err.message || 'Error loading notes');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchNote();

    return () => {
      isMounted = false;
    };
  }, [selection.exam, selection.subject, selection.topic, selection.subtopic, selectedVersion]);

  // Handle regeneration with AI
  const handleRegenerate = async () => {
    if (!selection.topic?.id || isRegenerating) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/notes/a4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selection.exam?.id || 'default_exam',
          subjectId: selection.subject?.id || 'default_subject',
          topicId: selection.topic.id,
          subtopicId: selection.subtopic?.id || null,
          examName: selection.exam?.name || 'Medical Examination',
          subjectName: selection.subject?.name || 'Clinical Medicine',
          topicName: selection.topic.name || 'High-Yield Topic',
          subtopicName: selection.subtopic?.name || null,
          version: selectedVersion + 1,
          regenerate: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate A4 notes');
      }

      const data = await response.json();
      setNote(data.note);
      setSelectedVersion((v) => v + 1);
      setCurrentPage(0);
    } catch (err: any) {
      console.error('[A4NotebookViewer] Error regenerating note:', err);
      setError(err.message || 'Failed to regenerate');
    } finally {
      setIsRegenerating(false);
    }
  };

  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [selectedPageIndices, setSelectedPageIndices] = useState<number[]>([]);

  // Open PDF modal and initialize page selections
  const handleOpenPdfModal = () => {
    if (!note || !note.pages || note.pages.length === 0) return;
    // Default to all pages selected
    setSelectedPageIndices(note.pages.map((_, i) => i));
    setIsPdfModalOpen(true);
  };

  // Export specific selected pages into ONE combined PDF
  const handleExecuteExportPDF = async () => {
    if (!note || isExportingPdf || selectedPageIndices.length === 0) return;

    setIsExportingPdf(true);
    setIsPdfModalOpen(false);

    const originalPage = currentPage;

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Sort selected indices in ascending order
      const sortedIndices = [...selectedPageIndices].sort((a, b) => a - b);

      for (let i = 0; i < sortedIndices.length; i++) {
        const pageIdx = sortedIndices[i];
        setCurrentPage(pageIdx);
        // Allow React state to update DOM render
        await new Promise((resolve) => setTimeout(resolve, 180));

        const element = document.getElementById('a4-active-page-render');
        if (element) {
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#fcfaf4',
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const imgWidth = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (i > 0) {
            pdf.addPage();
          }

          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, 297));
        }
      }

      pdf.save(`${note.topicName.replace(/\s+/g, '_')}_A4_Selected_Pages.pdf`);
    } catch (err) {
      console.error('[PDF Export] Failed:', err);
      window.print();
    } finally {
      setCurrentPage(originalPage);
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleBookmark = () => {
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);
    if (onBookmark) {
      onBookmark(nextState);
    }
  };

  const totalPages = note?.pages?.length || 1;

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* TOP CONTROL TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md">
        {/* Left Side: Topic Title & Version info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-kalam font-bold text-lg shrink-0">
            A4
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Handwritten Study Notebook
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{selection.topic?.name || 'Select a Topic'}</span>
              {note && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  v{note.version || 1}
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Right Side: Page Navigation & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
              disabled={zoomLevel <= 0.8}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.3, z + 0.1))}
              disabled={zoomLevel >= 1.3}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Regenerate Note Button */}
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating || isLoading}
            className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            title="Regenerate with AI"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isRegenerating ? 'Regenerating...' : 'Regenerate Note'}</span>
          </button>

          {/* PDF Download Button */}
          <button
            type="button"
            onClick={handleOpenPdfModal}
            disabled={isExportingPdf || isLoading}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Select pages & download PDF"
          >
            <Download className={`w-3.5 h-3.5 ${isExportingPdf ? 'animate-pulse' : ''}`} />
            <span className="hidden md:inline">{isExportingPdf ? 'Exporting...' : 'PDF'}</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Print Notebook Sheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Print</span>
          </button>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={toggleBookmark}
            className={`p-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              isBookmarked
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Bookmark note"
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-amber-500" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setSelectedVersion((v) => v)}
            className="ml-auto underline font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
          <div className="font-kalam font-bold text-slate-600 dark:text-slate-400 text-sm animate-pulse">
            Composing A4 Handwritten Study Sheet...
          </div>
        </div>
      ) : note && note.pages && note.pages.length > 0 ? (
        /* NOTEBOOK VIEWER STAGE */
        <div className="flex flex-col items-center space-y-6" ref={notebookContainerRef}>
          {/* Main A4 Page Display with Motion Transition */}
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease-out',
            }}
            className="w-full"
            id="a4-active-page-render"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, rotateY: 15, x: 20 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: -15, x: -20 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="w-full"
              >
                <A4PageSheet
                  note={note}
                  page={note.pages[currentPage] || note.pages[0]}
                  pageIndex={currentPage}
                  totalPages={totalPages}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* PAGE NAVIGATION BOTTOM BAR */}
          {totalPages > 1 && (
            <div className="flex items-center gap-3 p-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
              <button
                type="button"
                onClick={goToPrevPage}
                disabled={currentPage === 0}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Page Number Chips */}
              <div className="flex items-center gap-1.5 px-2">
                {note.pages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentPage(idx)}
                    className={`w-7 h-7 rounded-lg font-kalam font-bold text-xs transition-colors cursor-pointer ${
                      currentPage === idx
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={goToNextPage}
                disabled={currentPage === totalPages - 1}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* EMPTY SELECTION FALLBACK */
        <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
          <FileText className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            No Topic Selected
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Please choose an Exam, Subject, and Topic from the top navigation bar to generate your handwritten A4 study sheet.
          </p>
        </div>
      )}
      {/* SELECTIVE PAGE EXPORT MODAL */}
      <AnimatePresence>
        {isPdfModalOpen && note && note.pages && (
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Export A4 Notes PDF
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select specific pages to combine into ONE single PDF
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-400">
                  {selectedPageIndices.length} of {note.pages.length} pages selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPageIndices(note.pages.map((_, i) => i))}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPageIndices([])}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Page Checkboxes Grid */}
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {note.pages.map((p, idx) => {
                  const isChecked = selectedPageIndices.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setSelectedPageIndices(selectedPageIndices.filter((i) => i !== idx));
                        } else {
                          setSelectedPageIndices([...selectedPageIndices, idx]);
                        }
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs">
                        <span className="block font-black">Page {p.pageNumber}</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[110px]">
                          {p.isFirstPage ? 'Overview & Pearls' : `Part ${p.pageNumber}`}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center text-xs ${
                          isChecked
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isChecked && '✓'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteExportPDF}
                  disabled={selectedPageIndices.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-40 transition-colors shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ONE PDF ({selectedPageIndices.length})</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
