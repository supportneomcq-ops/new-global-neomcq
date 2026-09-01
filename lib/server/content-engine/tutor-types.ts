/**
 * NEOMCQ — VIDEO-BASED AI TUTOR ENGINE TYPES
 * Phase 6: Deterministic Visual Canvas Video Engine, Dynamic Scenes, Animated Diagrams & Checkpoints
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

export type TutorSceneType =
  | 'INTRO_ROADMAP'
  | 'FOUNDATIONAL_ANATOMY'
  | 'CORE_MECHANISM_FLOWCHART'
  | 'CLINICAL_VIGNETTE_COMPARISON'
  | 'INTERACTIVE_CHECKPOINT'
  | 'BOARD_TRAPS_DIFFERENTIAL'
  | 'RECAP_SYNTHESIS';

export interface FlowchartNode {
  id: string;
  label: string;
  sublabel?: string;
  color?: 'cyan' | 'indigo' | 'amber' | 'rose' | 'emerald' | 'purple';
  icon?: string;
}

export interface FlowchartArrow {
  from: string;
  to: string;
  label?: string;
}

export interface FlowchartData {
  title: string;
  nodes: FlowchartNode[];
  arrows: FlowchartArrow[];
  notes?: string;
}

export interface ComparisonRow {
  parameter: string;
  entityA: string;
  entityB: string;
  highYieldDifferentiator: string;
}

export interface ComparisonData {
  title: string;
  entityAName: string;
  entityBName: string;
  rows: ComparisonRow[];
}

export interface CheckpointQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  pearl: string;
}

export interface TimedNarrationCue {
  timeOffset: number; // in seconds relative to scene start
  text: string;
  highlightKeyword?: string;
  boardAction?: 'draw_node' | 'draw_arrow' | 'highlight_pearl' | 'show_checkpoint' | 'zoom_region' | 'pulse';
  targetElementId?: string;
}

export interface TutorScene {
  id: string;
  sequence: number;
  type: TutorSceneType;
  title: string;
  phase: string;
  startSeconds: number;
  durationSeconds: number;
  narrationScript: string;
  timedCues: TimedNarrationCue[];
  accentColor: 'indigo' | 'cyan' | 'amber' | 'rose' | 'emerald' | 'purple';
  flowchart?: FlowchartData;
  comparison?: ComparisonData;
  checkpoint?: CheckpointQuestion;
  anatomicalFeatures?: Array<{ label: string; description: string; tag: string }>;
  keyBullets: string[];
  examRelevance: string;
  clinicalPearls?: string[];
  boardSvgDiagramType?: 'heart_circulation' | 'nephron_pathway' | 'neural_arc' | 'pharmacokinetics' | 'generic_flowchart' | 'respiratory_loop';
  mediaReferenceIds?: string[];
}

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
  generatedText?: string;
  scene?: TutorScene;
}

export interface TutorLessonSession {
  id: string;
  title: string;
  subtitle?: string;
  userId: string;
  examId: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string | null;
  contentVersion: number;
  lessonState: TutorLessonState;
  currentPhase: string;
  currentSequence: number;
  totalDurationSeconds: number;
  segments: TutorSegment[];
  scenes: TutorScene[];
  difficultyLevel?: string;
  thumbnailGradient?: string;
  createdAt: string;
  updatedAt: string;
  canonicalNotesGrounding?: any;
}
