/**
 * NEOMCQ — GLOBAL CONTENT GENERATION ENGINE FOUNDATION
 * Phase 4A: Architectural Types & Canonical Schemas
 *
 * Core Directives:
 * 1. Global & Reusable: One canonical content package per Exam > Subject > Topic
 * 2. Canonical Identity: Deterministic keys built from UUIDs (never raw user text/slugs)
 * 3. 80-MCQ Slot Specification: Main (40), Quiz 1 (20), Quiz 2 (20) independent slots
 * 4. Zero User Credit Deductions for Global Content Generation ($0 user cost, 0 credits)
 * 5. Multi-versioning, Cache first, and DB-backed concurrency lock
 */

export type JobState =
  | 'QUEUED'
  | 'RUNNING'
  | 'VALIDATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type DbJobStatus =
  | 'queued'
  | 'running'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ContentPackageType =
  | 'full_pack'
  | 'main_mcqs'
  | 'quiz_1'
  | 'quiz_2'
  | 'notes'
  | 'flashcards'
  | 'revision_sheet'
  | 'tutor';

export interface CanonicalTopicIdentity {
  examId: string;
  subjectId: string;
  topicId: string;
  version: number;
  packageType: ContentPackageType;
}

export interface MCQSlotRequirement {
  slot: 'main' | 'quiz_1' | 'quiz_2';
  targetCount: number;
  description: string;
  independentSet: boolean;
}

/**
 * Requirement 8: Canonical 80-MCQ Slot Architecture
 * - Main MCQs: 40 items
 * - Quiz 1: 20 separate items
 * - Quiz 2: 20 separate items
 * Total: 80 items. Quiz 1 & 2 must NOT be copied from Main MCQs.
 */
export const CANONICAL_MCQ_SLOT_SPEC: Record<'MAIN' | 'QUIZ_1' | 'QUIZ_2', MCQSlotRequirement> = {
  MAIN: {
    slot: 'main',
    targetCount: 40,
    description: '40 Comprehensive Master Practice MCQs',
    independentSet: true,
  },
  QUIZ_1: {
    slot: 'quiz_1',
    targetCount: 20,
    description: '20 Independent Diagnostic Pre-Test MCQs',
    independentSet: true,
  },
  QUIZ_2: {
    slot: 'quiz_2',
    targetCount: 20,
    description: '20 Independent Mastery Post-Test MCQs',
    independentSet: true,
  },
};

export const TOTAL_CANONICAL_MCQ_COUNT = 80;

/**
 * Phase 4E: Canonical Flashcards Target Specification
 * Central configurable target: Default 30 Flashcards per canonical topic
 */
export const CANONICAL_FLASHCARD_TARGET_COUNT = 30;

export interface ValidationMetadata {
  structuralValid: boolean;
  scopeValid: boolean;
  deduplicationValid: boolean;
  answersValid: boolean;
  score: number; // 0 - 100
  status: 'pending' | 'passed' | 'failed';
  checkedAt?: string;
  validatorVersion?: string;
  notes?: string;
}

export interface GlobalContentPackage {
  packageVersion: number;
  canonicalKey: string;
  examId: string;
  subjectId: string;
  topicId: string;
  // Slot specifications (assets to be filled in subsequent phases)
  mainMcqsSlot: {
    targetCount: number;
    actualCount: number;
    items?: CanonicalMCQItem[];
  };
  quiz1Slot: {
    targetCount: number;
    actualCount: number;
    items?: any[];
  };
  quiz2Slot: {
    targetCount: number;
    actualCount: number;
    items?: any[];
  };
  notesSlot: {
    present: boolean;
    content?: string;
    package?: CanonicalNotesPackage;
  };
  flashcardsSlot: {
    targetCount: number;
    count: number;
    items?: CanonicalFlashcardItem[];
  };
  revisionSheetSlot?: {
    present: boolean;
    sheet?: CanonicalRevisionSheet;
  };
  aiTutorSlot: {
    present: boolean;
    content?: any;
  };
  mediaReferencesSlot: {
    count: number;
    items?: EducationalMediaItem[];
  };
  validationMetadata: ValidationMetadata;
  createdAt: string;
  updatedAt: string;
}

export type MCQDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface CanonicalMCQItem {
  id: string;
  examId: string;
  subjectId: string;
  topicId: string;
  contentVersionId: number;
  questionSet: 'MAIN' | 'QUIZ_1' | 'QUIZ_2';
  question: string;
  options: [string, string, string, string] | string[];
  correctAnswer: string;
  correctIndex: number;
  explanation: string;
  difficulty: MCQDifficulty;
  clinicalPearl?: string;
  highYieldTag?: string;
  slug: string;
  fingerprint: string;
  status?: 'active' | 'draft' | 'archived';
  aiGenerated?: boolean;
  source?: string;
  createdAt?: string;
}

export interface MCQValidationResult {
  valid: boolean;
  score: number; // 0 - 100
  structuralValid: boolean;
  optionsValid: boolean;
  correctAnswerValid: boolean;
  explanationValid: boolean;
  deduplicationValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BatchMCQValidationResult {
  valid: boolean;
  targetCount: number;
  validCount: number;
  deficitCount: number;
  rejectedCount: number;
  validItems: CanonicalMCQItem[];
  rejectedItems: { item: Partial<CanonicalMCQItem>; reasons: string[] }[];
  averageScore: number;
  deduplicationSummary: {
    totalEvaluated: number;
    exactDuplicates: number;
    semanticDuplicates: number;
  };
}

export interface MainMCQGenerationRequest {
  examId: string;
  subjectId: string;
  topicId: string;
  version?: number;
  forceRefresh?: boolean;
  userId?: string | null;
  supabaseClient?: any;
}

export interface MainMCQGenerationResult {
  success: boolean;
  servedFromCache: boolean;
  jobId?: string;
  canonicalKey: string;
  versionNumber: number;
  itemCount: number; // Exactly 40 for MAIN
  items: CanonicalMCQItem[];
  validation: BatchMCQValidationResult;
  costAudit?: CostAccountingEvent;
  generationReason: 'CACHE_VALID' | 'FRESH_GENERATION' | 'RETRIED_DEFICIT' | 'ATTACHED_JOB' | 'ERROR';
  error?: string;
  errorCode?: string;
}

export type QuizSlotType = 'QUIZ_1' | 'QUIZ_2';

export interface QuizMCQGenerationRequest {
  examId: string;
  subjectId: string;
  topicId: string;
  quizSlot: QuizSlotType;
  version?: number;
  forceRefresh?: boolean;
  userId?: string | null;
  supabaseClient?: any;
}

export interface QuizMCQGenerationResult {
  success: boolean;
  servedFromCache: boolean;
  jobId?: string;
  canonicalKey: string;
  versionNumber: number;
  quizSlot: QuizSlotType;
  itemCount: number; // Exactly 20 for QUIZ_1 / QUIZ_2
  items: CanonicalMCQItem[];
  validation: BatchMCQValidationResult;
  costAudit?: CostAccountingEvent;
  generationReason: 'CACHE_VALID' | 'FRESH_GENERATION' | 'RETRIED_DEFICIT' | 'ATTACHED_JOB' | 'ERROR';
  error?: string;
  errorCode?: string;
}

/**
 * ============================================================================
 * PHASE 4D: CANONICAL NOTES & EDUCATIONAL MEDIA TYPES
 * ============================================================================
 */

export type NotesSectionType =
  | 'overview'
  | 'learning_objectives'
  | 'key_concepts'
  | 'definitions'
  | 'mechanisms'
  | 'classifications'
  | 'clinical_features'
  | 'diagnosis'
  | 'management'
  | 'high_yield_facts'
  | 'exam_pearls'
  | 'summary'
  | 'custom';

export type MediaRecommendation =
  | 'NO_MEDIA_REQUIRED'
  | 'IMAGE_REQUIRED'
  | 'VIDEO_USEFUL'
  | 'IMAGE_AND_VIDEO_USEFUL';

export interface CanonicalNotesSection {
  id: string;
  sectionTitle: string;
  sectionType: NotesSectionType;
  content: string;
  keyPoints: string[];
  mediaRecommendation: MediaRecommendation;
  mediaSearchQuery?: string;
}

export interface CanonicalNotesPackage {
  id: string;
  examId: string;
  subjectId: string;
  topicId: string;
  contentVersionId: number;
  title: string;
  topicOverview: string;
  learningObjectives: string[];
  keyConcepts: string[];
  importantDefinitions?: { term: string; definition: string }[];
  mechanismsOrPathophysiology?: string;
  classifications?: { name: string; items: string[]; criteria?: string }[];
  clinicalFeatures?: { signs: string[]; symptoms: string[]; complications?: string[] };
  diagnosisAndInvestigation?: { goldStandard?: string; firstLine?: string; findings?: string[] };
  management?: { firstLine?: string; definitive?: string; contraindications?: string[] };
  highYieldFacts: string[];
  examPearls: string[];
  summary: string;
  sections: CanonicalNotesSection[];
  isSubjectSpecific: boolean;
  wordCount: number;
  readingTimeMinutes: number;
  status: 'approved' | 'active';
  createdAt: string;
  updatedAt: string;
}

export interface EducationalMediaItem {
  id: string;
  examId: string;
  subjectId: string;
  topicId: string;
  contentVersionId: number;
  mediaType: 'image' | 'video';
  sourcePlatform:
    | 'Wikimedia Commons'
    | 'OpenStax'
    | 'NCBI Bookshelf'
    | 'Public Medical Knowledge'
    | 'Khan Academy'
    | 'YouTube Educational'
    | 'Osmosis / OpenCourseware'
    | 'Medical Education Commons'
    | string;
  title: string;
  description: string;
  sourceUrl: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  duration?: string;
  attribution?: string;
  license?: string;
  associatedSectionTitle?: string;
  associatedSectionIndex?: number;
  relevanceScore: number; // 0 - 100
  validationStatus: 'verified' | 'pending' | 'rejected';
  retrievedAt: string;
  lastCheckedAt: string;
}

export interface NotesValidationResult {
  valid: boolean;
  score: number; // 0 - 100
  hasOverview: boolean;
  hasObjectives: boolean;
  hasHighYieldFacts: boolean;
  hasExamPearls: boolean;
  hasSummary: boolean;
  sectionsCount: number;
  wordCount: number;
  errors: string[];
  warnings: string[];
}

export interface MediaValidationResult {
  valid: boolean;
  totalFound: number;
  verifiedCount: number;
  rejectedCount: number;
  validItems: EducationalMediaItem[];
  rejectedItems: { item: Partial<EducationalMediaItem>; reasons: string[] }[];
  imageCount: number;
  videoCount: number;
  deduplicationSummary: {
    totalEvaluated: number;
    exactDuplicates: number;
  };
}

export interface NotesGenerationRequest {
  examId: string;
  subjectId: string;
  topicId: string;
  version?: number;
  forceRefresh?: boolean;
  userId?: string | null;
  supabaseClient?: any;
}

export interface NotesGenerationResult {
  success: boolean;
  servedFromCache: boolean;
  jobId?: string;
  canonicalKey: string;
  versionNumber: number;
  notes: CanonicalNotesPackage | null;
  media: EducationalMediaItem[];
  notesValidation: NotesValidationResult;
  mediaValidation: MediaValidationResult;
  costAudit?: CostAccountingEvent;
  generationReason: 'CACHE_VALID' | 'FRESH_GENERATION' | 'ATTACHED_JOB' | 'ERROR';
  error?: string;
  errorCode?: string;
}

export interface CostAccountingEvent {
  jobId?: string;
  isGlobalGeneration: true; // Distinguishes global platform generation from user personal AI queries
  userId: string | null; // System-attributed
  taskType: string;
  provider: 'gemini' | 'openai' | string;
  model: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  actualCostUsd: number;
  creditsDeducted: 0; // CRITICAL: strictly 0 for global topic content generation
  timestamp: string;
}

export interface GenerationJobRecord {
  id: string;
  examId: string;
  subjectId: string;
  topicId: string;
  task: string;
  status: JobState;
  priority: number;
  provider?: string;
  model?: string;
  attempts: number;
  maxAttempts: number;
  error?: string | null;
  idempotencyKey: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  outputPayload?: any;
}

export interface DeduplicationPipelineStep {
  step: number;
  name: string;
  description: string;
  outcome: 'HIT' | 'MISS' | 'SKIPPED' | 'EXECUTED';
  details?: any;
}

export interface OrchestratorResolutionResult {
  success: boolean;
  servedFromCache: boolean;
  isStale?: boolean;
  activeJobId?: string;
  jobState?: JobState;
  packageVersion: number;
  canonicalKey: string;
  package: GlobalContentPackage | null;
  reason:
    | 'CACHE_VALID'
    | 'CACHE_STALE_ASYNC_REFRESH'
    | 'ATTACHED_IN_FLIGHT_JOB'
    | 'NEW_JOB_CREATED'
    | 'ERROR';
  pipelineSteps: DeduplicationPipelineStep[];
  costAudit?: CostAccountingEvent;
  error?: string;
  errorCode?: string;
}

// ============================================================================
// PHASE 4E: CANONICAL FLASHCARDS & REVISION SHEET TYPES
// ============================================================================

export type FlashcardDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface CanonicalFlashcardItem {
  id: string;
  deckId?: string | null;
  examId: string;
  subjectId: string;
  topicId: string;
  contentVersionId: number;
  front: string;
  back: string;
  explanation?: string;
  difficulty: FlashcardDifficulty;
  isHighYield: boolean;
  displayOrder: number;
  fingerprint: string;
  status?: 'approved' | 'pending_review' | 'archived';
  aiGenerated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FlashcardsValidationResult {
  isValid: boolean;
  validCount: number;
  targetCount: number;
  deficitCount: number;
  validItems: CanonicalFlashcardItem[];
  rejectedItems: Array<{ item: Partial<CanonicalFlashcardItem>; reason: string }>;
  validationScore: number; // 0 - 100
  errors: string[];
  warnings: string[];
}

export interface FlashcardsGenerationRequest {
  examId: string;
  subjectId: string;
  topicId: string;
  targetCount?: number;
  version?: number;
  forceRefresh?: boolean;
  userId?: string | null;
  supabaseClient?: any;
}

export interface FlashcardsGenerationResult {
  success: boolean;
  servedFromCache: boolean;
  jobId?: string;
  canonicalKey: string;
  versionNumber: number;
  flashcards: CanonicalFlashcardItem[];
  validation: FlashcardsValidationResult;
  costAudit?: CostAccountingEvent;
  generationReason: 'CACHE_VALID' | 'FRESH_GENERATION' | 'ATTACHED_JOB' | 'DEFICIT_GENERATED' | 'ERROR';
  error?: string;
  errorCode?: string;
}

export interface RevisionSheetSection {
  title: string;
  bullets: string[];
  highlightNotes?: string;
}

export interface CanonicalRevisionSheet {
  id: string;
  examId: string;
  subjectId: string;
  topicId: string;
  contentVersionId: number;
  title: string;
  sheetType: 'quick_revision' | 'high_yield' | 'cheat_sheet';
  content: string;
  mustKnowConcepts: string[];
  keyFacts: string[];
  classifications?: Array<{ name: string; items: string[] }>;
  importantAssociations?: Array<{ trigger: string; target: string }>;
  commonExamTraps?: string[];
  formulasOrRules?: string[];
  clinicalCorrelations?: string[];
  rapidReviewSummary: string;
  sections: RevisionSheetSection[];
  status?: 'approved' | 'pending_review';
  aiGenerated?: boolean;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RevisionSheetValidationResult {
  isValid: boolean;
  validationScore: number;
  hasMustKnowConcepts: boolean;
  hasKeyFacts: boolean;
  hasSummary: boolean;
  sectionsCount: number;
  wordCount: number;
  errors: string[];
  warnings: string[];
}

export interface RevisionSheetGenerationRequest {
  examId: string;
  subjectId: string;
  topicId: string;
  version?: number;
  forceRefresh?: boolean;
  userId?: string | null;
  supabaseClient?: any;
}

export interface RevisionSheetGenerationResult {
  success: boolean;
  servedFromCache: boolean;
  jobId?: string;
  canonicalKey: string;
  versionNumber: number;
  revisionSheet: CanonicalRevisionSheet | null;
  validation: RevisionSheetValidationResult;
  costAudit?: CostAccountingEvent;
  generationReason: 'CACHE_VALID' | 'FRESH_GENERATION' | 'ATTACHED_JOB' | 'ERROR';
  error?: string;
  errorCode?: string;
}

// ============================================================================
// PHASE 5A: AI TUTOR FOUNDATION TYPES
// ============================================================================

export type TutorLessonState = 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'FAILED';

export interface TutorLessonSegment {
  id: string;
  sequenceNumber: number;
  phase: string;
  generatedText: string;
  topicId: string;
  contentVersion: number;
  createdAt: string;
  status: 'COMPLETED' | 'FAILED';
}

export interface AITutorLessonPackage {
  id: string;
  userId: string;
  examId: string;
  subjectId: string;
  topicId: string;
  title: string;
  contentVersion: number;
  status: TutorLessonState;
  currentPhase: string;
  currentSequence: number;
  phases: string[];
  segments: TutorLessonSegment[];
  createdAt: string;
  updatedAt: string;
}

export interface TutorLessonRequest {
  userId: string;
  examId: string;
  subjectId: string;
  topicId: string;
  version?: number;
  forceNew?: boolean;
  supabaseClient?: any;
}

export interface TutorSegmentRequest {
  userId: string;
  lessonId: string;
  sequenceNumber?: number;
  forceRefresh?: boolean;
  supabaseClient?: any;
}

export interface TutorLessonResult {
  success: boolean;
  lesson: AITutorLessonPackage | null;
  servedFromCache?: boolean;
  jobId?: string;
  costAudit?: CostAccountingEvent;
  reason?: string;
  error?: string;
  errorCode?: string;
}


