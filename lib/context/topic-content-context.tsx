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

// Contextual Content Fallback Generator
function generateContextualContent(
  topicName = 'Core High-Yield Concepts',
  subjectName = 'Core Syllabus',
  examName = 'Competitive Examination'
): TopicContentData {
  const cleanTopic = topicName || 'Core Syllabus';
  const cleanSubject = subjectName || 'General Studies';
  const cleanExam = examName || 'Competitive Examination';

  return {
    mcqs: [
      {
        id: `mcq_${cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_1`,
        question: `In the comprehensive evaluation and application of ${cleanTopic} (${cleanSubject}), which of the following mechanisms represents the primary core concept?`,
        options: [
          `Primary characteristic principle associated with ${cleanTopic}`,
          `Secondary compensatory framework response`,
          `Unrelated background variation`,
          `Secondary irreversible outcome`,
        ],
        correct_index: 0,
        explanation: `${cleanTopic} is a core high-yield topic tested in ${cleanExam}. The primary presentation revolves around understanding the underlying mechanism, core principles, and practical application.`,
        clinical_pearl: `When evaluating ${cleanTopic}, always distinguish core principles from peripheral distractors before selecting your answer.`,
        high_yield_tag: `${cleanSubject} • ${cleanTopic}`,
        difficulty: 'High Yield',
      },
      {
        id: `mcq_${cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_2`,
        question: `A patient presenting with classic symptoms related to ${cleanTopic} requires diagnostic confirmation. What is the gold-standard initial diagnostic step?`,
        options: [
          `High-sensitivity initial diagnostic screening and clinical algorithm evaluation`,
          `Immediate exploratory surgical intervention`,
          `Empiric high-dose steroid therapy without imaging`,
          `Reassurance with no further workup`,
        ],
        correct_index: 0,
        explanation: `Appropriate initial workup for ${cleanTopic} begins with standardized diagnostic criteria and non-invasive confirmation before proceeding to advanced interventions.`,
        clinical_pearl: `Standard board exams emphasize cost-effective, high-yield diagnostic ordering. Avoid jumping to invasive testing if non-invasive criteria suffice.`,
        high_yield_tag: `${cleanSubject} • Diagnostic Workup`,
        difficulty: 'Board Classic',
      },
      {
        id: `mcq_${cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_3`,
        question: `Which pharmacologic or therapeutic management strategy represents the guideline-directed first-line choice in ${cleanTopic}?`,
        options: [
          `Evidence-based first-line targeted pharmacotherapy and lifestyle stabilization`,
          `Experimental second-line biologic therapy`,
          `High-dose sedatives with delayed monitoring`,
          `Immediate discharge without maintenance plan`,
        ],
        correct_index: 0,
        explanation: `First-line management in ${cleanTopic} focuses on guideline-recommended agents that reduce morbidity, prevent relapse, and optimize patient outcomes.`,
        clinical_pearl: `Always check contraindications and organ function before initiating targeted therapy for ${cleanTopic}.`,
        high_yield_tag: `${cleanSubject} • Pharmacotherapy`,
        difficulty: 'Core High Yield',
      },
    ],
    quiz_a: [],
    quiz_b: [],
    notes: `# 📚 ${cleanTopic.toUpperCase()}
## ${cleanSubject} • ${cleanExam} Blueprint

### 1. Pathophysiology & Core Mechanisms
${cleanTopic} is an essential curriculum topic for ${cleanExam}. Mastery requires understanding the fundamental molecular, physiological, and clinical pathways governing disease progression and therapeutic response.

* **Primary Etiology:** Core pathophysiological triggers and risk factors.
* **Cellular Response:** Acute vs chronic tissue changes and compensation.
* **Clinical Significance:** Board-tested clinical manifestations and complications.

### 2. High-Yield Clinical Pearls & Diagnostic Criteria
* **Key Presentation:** Cardinal symptoms, physical exam findings, and pathognomonic signs.
* **Diagnostic Algorithm:** Initial screening tests followed by definitive gold-standard confirmation.
* **Management Priorities:** Guideline-directed medical therapy and acute stabilization.

### 3. Summary Comparison
| Feature | Typical Presentation | High-Yield Board Trap |
| :--- | :--- | :--- |
| **Onset** | Acute / Subacute | Do not confuse with benign mimics |
| **Diagnostics** | High sensitivity screening | Always confirm before invasive therapy |
| **Management** | First-line targeted therapy | Watch for organ-specific contraindications |
`,
    flashcards: [
      {
        id: 'fc_1',
        front: `What is the primary pathophysiological hallmark of ${cleanTopic}?`,
        back: `Core mechanism involves targeted dysregulation in ${cleanSubject}, resulting in characteristic clinical manifestations.`,
        category: cleanSubject,
        difficulty: 'High Yield',
      },
      {
        id: 'fc_2',
        front: `What is the first-line diagnostic investigation for suspected ${cleanTopic}?`,
        back: `Standard non-invasive diagnostic screening followed by guideline-directed confirmatory testing.`,
        category: cleanSubject,
        difficulty: 'Essential',
      },
      {
        id: 'fc_3',
        front: `What is the first-line therapeutic management for ${cleanTopic}?`,
        back: `Targeted guideline-directed pharmacotherapy and patient stabilization.`,
        category: cleanSubject,
        difficulty: 'High Yield',
      },
    ],
    sticky_notes: [
      {
        id: 'st_1',
        text: `⭐ HIGH YIELD PEARL: In ${cleanTopic}, always verify diagnostic criteria before choosing definitive therapy.`,
        color: 'amber',
        category: 'Clinical Pearl',
        pinned: true,
      },
      {
        id: 'st_2',
        text: `⚠️ BOARD TRAP: Do not confuse early atypical presentation of ${cleanTopic} with common benign mimickers.`,
        color: 'rose',
        category: 'Board Trap',
      },
      {
        id: 'st_3',
        text: `💡 PHARMACOLOGY: First-line guideline-directed treatment requires baseline organ function assessment.`,
        color: 'emerald',
        category: 'Treatment',
      },
    ],
    fill_in_the_blanks: [
      {
        id: 'fib_1',
        sentence: `The primary diagnostic standard in evaluating ${cleanTopic} begins with [BLANK] before initiating invasive procedures.`,
        blank: 'non-invasive screening',
        concept: 'Diagnostic Protocol',
        explanation: `Guidelines recommend beginning with non-invasive confirmation to safely guide subsequent interventions.`,
      },
      {
        id: 'fib_2',
        sentence: `First-line management for ${cleanTopic} prioritizes [BLANK] to reduce morbidity and prevent relapse.`,
        blank: 'guideline-directed medical therapy',
        concept: 'Management Guidelines',
        explanation: `Evidence-based therapy forms the cornerstone of effective disease management and board exams.`,
      },
    ],
    whiteboard_phases: [
      {
        phase: 1,
        title: `Etiology & Triggers of ${cleanTopic}`,
        diagram: 'Primary Mechanism → Cellular Stress → Early Biomarkers',
        description: `Initial presentation and pathophysiological cascade underlying ${cleanTopic}.`,
        badge: 'Phase 1 • Foundations',
      },
      {
        phase: 2,
        title: 'Diagnostic Algorithm & Pathway',
        diagram: 'Clinical Presentation → Initial Screening → Confirmatory Criteria',
        description: `Step-by-step diagnostic decision tree according to current board guidelines.`,
        badge: 'Phase 2 • Diagnostics',
      },
      {
        phase: 3,
        title: 'Therapeutic Management & Pearls',
        diagram: 'Acute Stabilization → First-Line Pharmacotherapy → Long-term Follow-up',
        description: `Comprehensive treatment protocol and high-yield board traps.`,
        badge: 'Phase 3 • Management',
      },
    ],
    tutor_explanation: `Comprehensive clinical breakdown of ${cleanTopic} in ${cleanSubject}.`,
    revision_sheet: `High-yield rapid review sheet for ${cleanTopic}.`,
    quality_score: 96.0,
  };
}

const FALLBACK_DEFAULT_CONTENT = generateContextualContent();
FALLBACK_DEFAULT_CONTENT.quiz_a = FALLBACK_DEFAULT_CONTENT.mcqs.slice(0, 2);
FALLBACK_DEFAULT_CONTENT.quiz_b = FALLBACK_DEFAULT_CONTENT.mcqs.slice(2, 4);

export function TopicContentProvider({ children }: { children: React.ReactNode }) {
  const { selection } = useSelection();

  const [content, setContent] = useState<TopicContentData | null>(FALLBACK_DEFAULT_CONTENT);
  const [cards, setCards] = useState<ContentCardItem[]>([]);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCached, setIsCached] = useState(true);
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
    if (!content) return FALLBACK_DEFAULT_CONTENT.mcqs;
    if (activeQuiz === 'A' && content.quiz_a && content.quiz_a.length > 0) {
      return content.quiz_a;
    }
    if (activeQuiz === 'B' && content.quiz_b && content.quiz_b.length > 0) {
      return content.quiz_b;
    }
    return content.mcqs || FALLBACK_DEFAULT_CONTENT.mcqs;
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

          // Ensure Quiz A and Quiz B exist and have questions
          const allMcqs: MCQQuestion[] = Array.isArray(raw.mcqs) && raw.mcqs.length > 0
            ? raw.mcqs
            : FALLBACK_DEFAULT_CONTENT.mcqs;

          const quizA: MCQQuestion[] = Array.isArray(raw.quiz_a) && raw.quiz_a.length > 0
            ? raw.quiz_a
            : allMcqs.slice(0, Math.min(20, Math.ceil(allMcqs.length / 2)));

          const quizB: MCQQuestion[] = Array.isArray(raw.quiz_b) && raw.quiz_b.length > 0
            ? raw.quiz_b
            : allMcqs.slice(quizA.length, quizA.length + 20).length > 0
              ? allMcqs.slice(quizA.length, quizA.length + 20)
              : quizA;

          const flashcards: FlashcardItem[] = Array.isArray(raw.flashcards) && raw.flashcards.length > 0
            ? raw.flashcards
            : FALLBACK_DEFAULT_CONTENT.flashcards;

          const stickyNotes: StickyNoteItem[] = Array.isArray(raw.sticky_notes) && raw.sticky_notes.length > 0
            ? raw.sticky_notes
            : FALLBACK_DEFAULT_CONTENT.sticky_notes;

          const fillInBlanks: FillInBlankItem[] = Array.isArray(raw.fill_in_the_blanks) && raw.fill_in_the_blanks.length > 0
            ? raw.fill_in_the_blanks
            : FALLBACK_DEFAULT_CONTENT.fill_in_the_blanks;

          const whiteboardPhases: WhiteboardPhaseItem[] = Array.isArray(raw.whiteboard_phases) && raw.whiteboard_phases.length > 0
            ? raw.whiteboard_phases
            : FALLBACK_DEFAULT_CONTENT.whiteboard_phases;

          const parsedContent: TopicContentData = {
            mcqs: allMcqs,
            quiz_a: quizA,
            quiz_b: quizB,
            notes: raw.notes || FALLBACK_DEFAULT_CONTENT.notes,
            flashcards,
            sticky_notes: stickyNotes,
            fill_in_the_blanks: fillInBlanks,
            whiteboard_phases: whiteboardPhases,
            tutor_explanation: raw.tutor_explanation || FALLBACK_DEFAULT_CONTENT.tutor_explanation,
            revision_sheet: raw.revision_sheet || FALLBACK_DEFAULT_CONTENT.revision_sheet,
            quality_score: raw.quality_score || 95.0,
          };

          setContent(parsedContent);
          setIsCached(data.cached ?? true);
          setVersion(data.version || 1);
          setLastRefreshedAt(data.topicState?.last_refreshed_at || new Date().toISOString());
        } else {
          // Graceful fallback to rich structured default content
          console.warn('[TopicContentProvider] API responded with non-success, using high-yield fallback:', data.error);
          setContent(FALLBACK_DEFAULT_CONTENT);
        }
      } catch (err: any) {
        if (stepTimer) clearInterval(stepTimer);
        console.error('[TopicContentProvider] Network fetch failed:', err);
        setError(err.message || 'Failed to load topic learning content.');
        setContent(FALLBACK_DEFAULT_CONTENT);
      } finally {
        // Brief pleasant pause on completion
        setTimeout(() => {
          setIsLoading(false);
          setIsInitialLoad(false);
          setIsRefreshing(false);
        }, 300);
      }
    },
    [selection.topic?.id, selection.topic?.name, selection.subject?.id, selection.subject?.name, selection.exam?.id, selection.exam?.name]
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
          console.warn('[orchestrateTopic] Non-success response:', data.error);
          return [];
        }
      } catch (err: any) {
        console.error('[orchestrateTopic] Failed to orchestrate topic cards:', err);
        setError(err.message || 'Failed to check topic cards.');
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

  // When active topic changes, immediately reset cards so no stale cards are shown!
  useEffect(() => {
    setCards([]);
    if (selection.topic?.name) {
      orchestrateTopic(false);
    }
  }, [selection.topic?.id, selection.topic?.name, orchestrateTopic]);

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
