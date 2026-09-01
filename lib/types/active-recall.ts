export type RecallDifficulty = 'High Yield' | 'Core' | 'Advanced' | 'Board Classic';

export interface ActiveRecallItem {
  id: string;
  concept: string;
  sentence: string; // May contain [BLANK] or multiple [BLANK] markers
  blank: string; // The primary expected answer
  acceptedAnswers?: string[]; // Synonyms, abbreviations, and clinical aliases
  explanation: string; // Clinical rationale & pathophysiology
  highYieldPoint?: string; // High-yield rule / core takeaway
  memoryHook?: string; // Mnemonic, memory cue, or association
  examTip?: string; // Board exam trap, distractor warning, or key differentiator
  difficulty?: RecallDifficulty;
  imageUrl?: string;
  imageCaption?: string;
  videoUrl?: string;
  subtopicName?: string;
}

export interface ActiveRecallSet {
  id: string; // Unique identifier / version ID
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  examId: string;
  examName: string;
  subtopicId?: string;
  subtopicName?: string;
  version: number;
  batch: string; // e.g. "Batch 01"
  updatedAt: string;
  itemsCount: number;
  difficulty?: string;
  completionPercentage?: number;
  bestAccuracy?: number;
  items: ActiveRecallItem[];
}

export interface ActiveRecallAttempt {
  id?: string;
  userId: string;
  examId: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string;
  recallItemId: string;
  sessionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  isRevealed: boolean;
  attemptedAt: string;
  responseTimeMs?: number;
  reviewDueAt?: string;
}

export interface ActiveRecallSessionStats {
  totalItems: number;
  recalledCount: number; // Answered or revealed
  correctCount: number;
  reviewedCount: number; // Incorrect
  revealedCount: number; // Revealed without answering
  accuracy: number; // Percentage
  currentStreak: number;
  bestStreak: number;
  strongAreas: string[];
  needsReview: string[];
}

export interface AnswerEvaluationResult {
  isCorrect: boolean;
  normalizedUserAnswer: string;
  normalizedCorrectAnswer: string;
  matchedAnswer?: string;
  matchType: 'exact' | 'normalized' | 'accepted_synonym' | 'incorrect';
}
