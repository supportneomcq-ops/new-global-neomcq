/**
 * NEOMCQ — GLOBAL CONTENT GENERATION ENGINE
 * Phase 4A & 4B Public API
 */

export * from './types';
export * from './canonical-identity';
export * from './job-manager';
export * from './content-cache-manager';
export * from './cost-auditor';
export * from './mcq-deduplicator';
export * from './mcq-validator';
export * from './main-mcq-generator';
export * from './quiz-mcq-generator';
export * from './notes-validator';
export * from './media-retriever';
export * from './notes-generator';
export * from './flashcards-validator';
export * from './flashcards-generator';
export * from './revision-sheet-validator';
export * from './revision-sheet-generator';
export * from './orchestrator';
export {
  CANONICAL_TUTOR_PHASES,
  type TutorPhaseType,
  type TutorSceneType,
  type FlowchartNode,
  type FlowchartArrow,
  type FlowchartData,
  type ComparisonRow,
  type ComparisonData,
  type CheckpointQuestion,
  type TimedNarrationCue,
  type TutorScene,
  type TutorSegmentData,
  type TutorSegment,
  type TutorLessonSession,
} from './tutor-types';
export * from './tutor-segment-validator';
export * from './tutor-session-manager';
export * from './tutor-generator';
export { CanonicalTutorGenerator } from './ai-tutor-generator';
