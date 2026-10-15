'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Sparkles,
  RotateCw,
  AlertTriangle,
  BookOpen,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useSelection } from '@/lib/context/selection-context';
import { A4NotesDocument, ContentScope } from '@/lib/types/a4-notes';
import { A4LibraryOverview } from './a4-library-overview';
import { A4DocumentReader } from './a4-document-reader';

interface A4NotebookViewerProps {
  onBookmark?: (bookmarked: boolean) => void;
}

export function A4NotebookViewer({ onBookmark }: A4NotebookViewerProps) {
  const { selection } = useSelection();

  // Active Document & View Mode State
  const [document, setDocument] = useState<A4NotesDocument | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'reader'>('overview');

  // Request & Generation Lifecycle State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Poll timer reference
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef<number>(0);

  // Derive canonical scope
  const hasSubtopic = !!selection.subtopic?.id;
  const contentScope: ContentScope = hasSubtopic ? 'SUBTOPIC' : 'TOPIC';

  // Fetch or generate A4 notes from canonical API
  const fetchNote = useCallback(
    async (forceRefresh = false) => {
      if (!selection.exam?.id || !selection.subject?.id || !selection.topic?.id) {
        setIsLoading(false);
        return;
      }

      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const payload = {
          examId: selection.exam.id,
          subjectId: selection.subject.id,
          topicId: selection.topic.id,
          subtopicId: selection.subtopic?.id || null,
          contentScope,
          examName: selection.exam.name,
          subjectName: selection.subject.name,
          topicName: selection.topic.name,
          subtopicName: selection.subtopic?.name || null,
          forceRefresh,
        };

        const res = await fetch('/api/notes/a4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load study notes');
        }

        if (data.status === 'PREPARING') {
          setIsPreparing(true);
          setIsLoading(false);
          setIsRefreshing(false);
          // Trigger polling if under attempt limit
          if (pollAttemptsRef.current < 15) {
            pollAttemptsRef.current += 1;
            pollTimerRef.current = setTimeout(() => {
              fetchNote(false);
            }, 3500);
          }
          return;
        }

        if (data.status === 'READY' && data.document) {
          setIsPreparing(false);
          setDocument(data.document);
          pollAttemptsRef.current = 0;
          // Ensure viewMode defaults to overview on initial selection load
          if (forceRefresh) {
            setViewMode('overview');
          }
        } else {
          throw new Error('Notes document structure was not returned');
        }
      } catch (err: any) {
        console.error('[A4NotebookViewer] Error loading notes:', err);
        setError(err.message || 'Unable to prepare study notes at this time.');
        setIsPreparing(false);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selection.exam, selection.subject, selection.topic, selection.subtopic, contentScope]
  );

  // Initial load when selection changes
  useEffect(() => {
    // Clear any previous poll timer
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
    }
    pollAttemptsRef.current = 0;
    setDocument(null);
    setViewMode('overview'); // Strict requirement: First show Overview/Library
    fetchNote(false);

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [selection.exam?.id, selection.subject?.id, selection.topic?.id, selection.subtopic?.id, fetchNote]);

  // Handle Manual Force Refresh
  const handleForceRefresh = () => {
    fetchNote(true);
  };

  // 1. NO SELECTION STATE
  if (!selection.topic?.id) {
    return (
      <div className="w-full max-w-4xl mx-auto my-12 p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Select a Topic or Subtopic
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Please select an Exam, Subject, and Topic or Subtopic from the header navigation to view the canonical A4 Study Notes.
          </p>
        </div>
      </div>
    );
  }

  // 2. INITIAL LOADING STATE (SKELETON)
  if (isLoading && !isRefreshing && !document) {
    return (
      <div className="w-full max-w-5xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // 3. PREPARING STATE (Generation In Progress)
  if (isPreparing) {
    return (
      <div className="w-full max-w-xl mx-auto my-16 p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900 shadow-xl text-center space-y-6">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <RotateCw className="w-8 h-8 animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Preparing your study notes…
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Our canonical content engine is generating a comprehensive A4 manuscript tailored specifically to{' '}
            <strong className="text-indigo-600 dark:text-indigo-400">
              {hasSubtopic ? selection.subtopic?.name : selection.topic?.name}
            </strong>
            . This usually takes a few seconds.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => fetchNote(false)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Check Status
          </button>
        </div>
      </div>
    );
  }

  // 4. FAILURE / ERROR RECOVERY STATE
  if (error && !document) {
    return (
      <div className="w-full max-w-lg mx-auto my-12 p-8 rounded-2xl bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-900/60 text-center space-y-4 shadow-lg">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
            Unable to Load Study Notes
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            We encountered a temporary issue while fetching your canonical study notes. Please try again.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchNote(true)}
          className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-extrabold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-md cursor-pointer"
        >
          Retry Generation
        </button>
      </div>
    );
  }

  // 5. READY STATE (Render Overview or Reader)
  if (!document) return null;

  if (viewMode === 'reader') {
    return (
      <A4DocumentReader
        document={document}
        onBackToOverview={() => setViewMode('overview')}
      />
    );
  }

  return (
    <A4LibraryOverview
      document={document}
      onReadNotes={() => setViewMode('reader')}
      onRefresh={handleForceRefresh}
      isRefreshing={isRefreshing}
    />
  );
}
