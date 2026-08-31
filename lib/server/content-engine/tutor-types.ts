/**
 * NEOMCQ — AI TUTOR FOUNDATION & TEACHING ENGINE TYPES
 * Phase 5A & 5B: Persistent Tutor Lesson Model & Canonical Teaching Engine
 */

export type TutorLessonState = 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'FAILED';

export const CANONICAL_TUTOR_PHASES = [
  'INTRODUCTION',
  'FOUNDATION',
  'CORE_CONCEPT',
  'IMPORTANT_DETAILS',
  'CLINICAL_OR_PRACTICAL_APPLICATION',
  'EXAM_FOCUS',
  'RECAP',
] as const;

export type TutorPhaseType = typeof CANONICAL_TUTOR_PHASES[number];

export interface TutorSegmentData {
  sequence: number;
  phase: string;
  title: string;
  teachingText: string;
  keyPoints: string[];
  examRelevance: string;
  clinicalCorrelation?: string | null;
  recap?: string | null;
  mediaReferenceIds?: string[];
}

export interface TutorSegment extends TutorSegmentData {
  lessonId: string;
  topicId: string;
  contentVersion: number;
  createdAt: string;
  completionState: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS';
  isCompleted: boolean;
  generatedText?: string; // Backwards compatibility for Phase 5A
}

export interface TutorLessonSession {
  id: string;
  title: string;
  userId: string;
  examId: string;
  subjectId: string;
  topicId: string;
  contentVersion: number;
  lessonState: TutorLessonState;
  currentPhase: string;
  currentSequence: number;
  segments: TutorSegment[];
  createdAt: string;
  updatedAt: string;
  canonicalNotesGrounding?: any;
}

