'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSelection } from '@/lib/context/selection-context';
import { MCQQuestion } from '@/components/learning-workspace/types';

export interface StickyNoteItem {
  id: string;
  text: string;
  color: 'amber' | 'emerald' | 'indigo' | 'rose' | string;
  category?: string;
  pinned?: boolean;
}

export interface FillInBlankItem {
  id: string;
  sentence: string;
  blank: string;
  concept: string;
  explanation: string;
}

export interface WhiteboardPhaseItem {
  phase: number;
  title: string;
  diagram: string;
  description: string;
  badge: string;
  narration?: string;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: string;
}

export interface TopicContentData {
  mcqs: MCQQuestion[];
  quiz_a: MCQQuestion[];
  quiz_b: MCQQuestion[];
  notes: string;
  flashcards: FlashcardItem[];
  sticky_notes: StickyNoteItem[];
  fill_in_the_blanks: FillInBlankItem[];
  whiteboard_phases: WhiteboardPhaseItem[];
  tutor_explanation?: string;
  revision_sheet?: string;
  quality_score?: number;
}

export type PreparationStage =
  | 'identifying_exam'
  | 'identifying_subject'
  | 'identifying_topic'
  | 'checking_knowledge'
  | 'creating_structure'
  | 'creating_mcqs'
  | 'creating_quizzes'
  | 'creating_flashcards'
  | 'creating_notes'
  | 'creating_sticky'
  | 'creating_recall'
  | 'preparing_tutor'
  | 'validating'
  | 'saving'
  | 'ready';

export interface PreparationStep {
  id: PreparationStage;
  label: string;
  detail: string;
}

export const PREPARATION_STEPS: PreparationStep[] = [
  { id: 'identifying_exam', label: 'Exam Identified', detail: 'Verifying official syllabus & exam blueprint...' },
  { id: 'identifying_subject', label: 'Subject Resolved', detail: 'Mapping exam domain & subject taxonomy...' },
  { id: 'identifying_topic', label: 'Topic Scoped', detail: 'Strict canonical entity resolution...' },
  { id: 'checking_knowledge', label: 'Checking Knowledge Repository', detail: '30-day freshness verification...' },
  { id: 'creating_structure', label: 'Structuring Learning Hierarchy', detail: 'Constructing high-yield syllabus modules...' },
  { id: 'creating_mcqs', label: 'Synthesizing 40 High-Yield MCQs', detail: 'Deduplicated exam questions with rationales...' },
  { id: 'creating_quizzes', label: 'Assembling Quiz A & Quiz B', detail: 'Partitioning non-overlapping 20-question sprints...' },
  { id: 'creating_flashcards', label: 'Building Spaced Flashcards', detail: 'Extracting key concepts & associations...' },
  { id: 'creating_notes', label: 'Generating Structured A4 Notes', detail: 'Formatting core concepts, formulas & comparative tables...' },
  { id: 'creating_sticky', label: 'Curating High-Yield Sticky Board', detail: 'Extracting key exam points & traps...' },
  { id: 'creating_recall', label: 'Preparing 60s Active Recall', detail: 'Generating cloze-deletion revision sheets...' },
  { id: 'preparing_tutor', label: 'Calibrating Synaptic AI Tutor', detail: 'Generating multi-phase visual whiteboard lesson...' },
  { id: 'validating', label: 'Validating Quality Standards', detail: 'Running schema & accuracy consensus check...' },
  { id: 'saving', label: 'Saving to Learning Library', detail: 'Ready for instant practice...' },
];

export interface ContentCardItem {
  featureId: string;
  featureName: string;
  versionNumber: number;
  versionLabel: string;
  status: 'READY' | 'GENERATING' | 'QUEUED' | 'FAILED' | 'EXPIRED' | 'NOT_AVAILABLE';
  createdAt: string;
  updatedAt: string;
  quantity: number;
  quantityLabel: string;
  contentVersionId: string;
  description: string;
  error?: string | null;
}

interface TopicContentContextType {
  content: TopicContentData | null;
  cards: ContentCardItem[];
  isOrchestrating: boolean;
  isLoading: boolean;
  isInitialLoad: boolean;
  isRefreshing: boolean;
  isCached: boolean;
  version: number;
  lastRefreshedAt: string | null;
  error: string | null;
  currentStage: PreparationStage;
  currentStageIndex: number;
  orchestrateTopic: (force?: boolean) => Promise<ContentCardItem[]>;
  refreshTopicContent: (force?: boolean) => Promise<void>;
  activeQuiz: 'A' | 'B';
  setActiveQuiz: (quiz: 'A' | 'B') => void;
  activeQuestions: MCQQuestion[];
  quizAttempts: Record<string, any[]>;
  recordQuizAttempt: (quizKey: string, attempt: any) => void;
  getAttemptsCount: (quizKey: string) => number;
}

const TopicContentContext = createContext<TopicContentContextType | undefined>(undefined);

export function TopicContentProvider({ children }: { children: React.ReactNode }) {
  const { selection } = useSelection();

  const [content, setContent] = useState<TopicContentData | null>(null);
  const [cards, setCards] = useState<ContentCardItem[]>([]);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [version, setVersion] = useState(1);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stepper state for educational loading animation
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const currentStage: PreparationStage = useMemo(() => {
    return PREPARATION_STEPS[Math.min(currentStageIndex, PREPARATION_STEPS.length - 1)].id;
  }, [currentStageIndex]);

  // CBT Quiz Switch: Quiz A vs Quiz B
  const [activeQuiz, setActiveQuiz] = useState<'A' | 'B'>('A');

  // Quiz Attempts Tracking (stored per topic + quiz)
  const [quizAttempts, setQuizAttempts] = useState<Record<string, any[]>>({});

  // Initialize stored quiz attempts from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('neomcq_all_quiz_attempts');
      if (stored) {
        setQuizAttempts(JSON.parse(stored));
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  const recordQuizAttempt = useCallback((quizKey: string, attempt: any) => {
    setQuizAttempts((prev) => {
      const existing = prev[quizKey] || [];
      const updated = [...existing, attempt];
      const nextMap = { ...prev, [quizKey]: updated };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('neomcq_all_quiz_attempts', JSON.stringify(nextMap));
        } catch {}
      }
      return nextMap;
    });
  }, []);

  const getAttemptsCount = useCallback(
    (quizKey: string) => {
      return (quizAttempts[quizKey] || []).length;
    },
    [quizAttempts]
  );

  // Derive active questions based on current active quiz
  const activeQuestions: MCQQuestion[] = useMemo(() => {
    if (!content) return [];
    if (activeQuiz === 'A' && content.quiz_a && content.quiz_a.length > 0) {
      return content.quiz_a;
    }
    if (activeQuiz === 'B' && content.quiz_b && content.quiz_b.length > 0) {
      return content.quiz_b;
    }
    return content.mcqs || [];
  }, [content, activeQuiz]);

  // Main Topic Fetcher & Pipeline Orchestrator
  const fetchTopicContent = useCallback(
    async (forceRefresh = false) => {
      const topicName = selection.topic?.name;
      const subjectName = selection.subject?.name;
      const examName = selection.exam?.name;

      if (!topicName) return;

      setIsLoading(true);
      setError(null);
      setCurrentStageIndex(0);

      // Educational Stepper animation timer
      let stepTimer: NodeJS.Timeout | null = null;
      let curStep = 0;
      stepTimer = setInterval(() => {
        curStep += 1;
        if (curStep < PREPARATION_STEPS.length - 1) {
          setCurrentStageIndex(curStep);
        }
      }, 450);

      try {
        const res = await fetch('/api/knowledge/topic-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicId: selection.topic?.id,
            topicName: topicName,
            subtopicId: selection.subtopic?.id,
            subtopicName: selection.subtopic?.name,
            subjectId: selection.subject?.id,
            subjectName: subjectName,
            examId: selection.exam?.id,
            examName: examName,
            forceRefresh,
          }),
        });

        const data = await res.json();

        if (stepTimer) clearInterval(stepTimer);
        setCurrentStageIndex(PREPARATION_STEPS.length - 1); // Done / Saved

        if (data.success && data.content) {
          const raw = data.content;

          // Use only persisted/generated content. Do not silently replace missing assets with fabricated demo material.
          const rawMcqs: MCQQuestion[] = Array.isArray(raw.mcqs) ? raw.mcqs : [];
          const rawQuizA: MCQQuestion[] = Array.isArray(raw.quiz_a) ? raw.quiz_a : [];
          const rawQuizB: MCQQuestion[] = Array.isArray(raw.quiz_b) ? raw.quiz_b : [];
          const allMcqs: MCQQuestion[] = rawMcqs.length > 0 ? rawMcqs : [...rawQuizA, ...rawQuizB];

          const quizA: MCQQuestion[] = rawQuizA.length > 0
            ? rawQuizA
            : allMcqs.slice(0, Math.min(20, Math.ceil(allMcqs.length / 2)));

          const quizB: MCQQuestion[] = rawQuizB.length > 0
            ? rawQuizB
            : allMcqs.slice(quizA.length, quizA.length + 20);

          const flashcards: FlashcardItem[] = Array.isArray(raw.flashcards) ? raw.flashcards : [];
          const stickyNotes: StickyNoteItem[] = Array.isArray(raw.sticky_notes) ? raw.sticky_notes : [];
          const fillInBlanks: FillInBlankItem[] = Array.isArray(raw.fill_in_the_blanks) ? raw.fill_in_the_blanks : [];
          const whiteboardPhases: WhiteboardPhaseItem[] = Array.isArray(raw.whiteboard_phases) ? raw.whiteboard_phases : [];

          const parsedContent: TopicContentData = {
            mcqs: allMcqs,
            quiz_a: quizA,
            quiz_b: quizB,
            notes: typeof raw.notes === 'string' ? raw.notes : '',
            flashcards,
            sticky_notes: stickyNotes,
            fill_in_the_blanks: fillInBlanks,
            whiteboard_phases: whiteboardPhases,
            tutor_explanation: typeof raw.tutor_explanation === 'string' ? raw.tutor_explanation : undefined,
            revision_sheet: typeof raw.revision_sheet === 'string' ? raw.revision_sheet : undefined,
            quality_score: typeof raw.quality_score === 'number' ? raw.quality_score : undefined,
          };

          setContent(parsedContent);
          setIsCached(data.cached ?? true);
          setVersion(data.version || 1);
          setLastRefreshedAt(data.topicState?.last_refreshed_at || new Date().toISOString());
        } else {
          // Keep existing valid content during a failed refresh; on first load, show the actual error instead of fake content.
          console.warn('[TopicContentProvider] API could not load topic content:', data.error);
          setError(data.error || 'No saved learning content is available for this topic yet.');
        }
      } catch (err: any) {
        if (stepTimer) clearInterval(stepTimer);
        console.error('[TopicContentProvider] Network fetch failed:', err);
        setError(err.message || 'Failed to load topic learning content.');
      } finally {
        // Brief pleasant pause on completion
        setTimeout(() => {
          setIsLoading(false);
          setIsInitialLoad(false);
          setIsRefreshing(false);
        }, 300);
      }
    },
    [selection.topic?.id, selection.topic?.name, selection.subject?.id, selection.subject?.name, selection.exam?.id, selection.exam?.name, selection.subtopic?.id, selection.subtopic?.name]
  );

  const orchestrateTopic = useCallback(
    async (forceRefresh = false): Promise<ContentCardItem[]> => {
      const topicName = selection.topic?.name;
      const topicId = selection.topic?.id;
      if (!topicName && !topicId) return [];

      setIsOrchestrating(true);
      setError(null);

      try {
        const res = await fetch('/api/topic-content/orchestrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId: selection.exam?.id,
            examName: selection.exam?.name,
            subjectId: selection.subject?.id,
            subjectName: selection.subject?.name,
            topicId: selection.topic?.id,
            topicName: selection.topic?.name,
            subtopicId: selection.subtopic?.id,
            subtopicName: selection.subtopic?.name,
            forceRefresh,
          }),
        });

        const data = await res.json();
        if (data.success && Array.isArray(data.cards)) {
          setCards(data.cards);
          if (data.versionRecord?.version) {
            setVersion(data.versionRecord.version);
          }
          if (data.versionRecord?.createdAt) {
            setLastRefreshedAt(data.versionRecord.createdAt);
          }
          // Also fetch topic content into memory
          fetchTopicContent(false);
          return data.cards;
        } else {
          const message = data.error || 'Could not load study content for this topic. Please try again.';
          console.warn('[orchestrateTopic] Non-success response:', message);
          setError(message);
          setIsInitialLoad(false);
          setIsRefreshing(false);
          return [];
        }
      } catch (err: any) {
        console.error('[orchestrateTopic] Failed to orchestrate topic cards:', err);
        setError(err.message || 'Failed to check topic cards.');
        setIsInitialLoad(false);
        setIsRefreshing(false);
        return [];
      } finally {
        setIsOrchestrating(false);
      }
    },
    [selection.topic?.id, selection.topic?.name, selection.subject?.id, selection.subject?.name, selection.exam?.id, selection.exam?.name, selection.subtopic?.id, selection.subtopic?.name, fetchTopicContent]
  );

  // Poll for live card status updates whenever any card is GENERATING or QUEUED
  useEffect(() => {
    const hasPendingCards = cards.some((c) => c.status === 'GENERATING' || c.status === 'QUEUED');
    if (!hasPendingCards) return;

    const interval = setInterval(() => {
      orchestrateTopic(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [cards, orchestrateTopic]);

  // When active topic or subtopic changes, immediately reset cards so no stale cards are shown!
  useEffect(() => {
    setCards([]);
    setContent(null);
    setError(null);
    setIsInitialLoad(true);
    if (selection.topic?.name) {
      orchestrateTopic(false);
    }
  }, [selection.topic?.id, selection.topic?.name, selection.subtopic?.id, selection.subtopic?.name, orchestrateTopic]);

  const refreshTopicContent = useCallback(
    async (force = true) => {
      setIsRefreshing(true);
      await orchestrateTopic(force);
    },
    [orchestrateTopic]
  );

  return (
    <TopicContentContext.Provider
      value={{
        content,
        cards,
        isOrchestrating,
        isLoading,
        isInitialLoad,
        isRefreshing,
        isCached,
        version,
        lastRefreshedAt,
        error,
        currentStage,
        currentStageIndex,
        orchestrateTopic,
        refreshTopicContent,
        activeQuiz,
        setActiveQuiz,
        activeQuestions,
        quizAttempts,
        recordQuizAttempt,
        getAttemptsCount,
      }}
    >
      {children}
    </TopicContentContext.Provider>
  );
}

export function useTopicContent() {
  const ctx = useContext(TopicContentContext);
  if (!ctx) {
    throw new Error('useTopicContent must be used within a TopicContentProvider');
  }
  return ctx;
}
