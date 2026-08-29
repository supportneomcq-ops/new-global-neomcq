export type WorkspaceTab = 'dashboard' | 'practice' | 'study' | 'tutor' | 'radar';

export type StudySubTab = 'notes' | 'flashcards' | 'sticky' | 'revision';

export interface MCQQuestion {
  id?: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  clinical_pearl?: string;
  high_yield_tag?: string;
  difficulty?: string;
}

export interface FlashcardItem {
  id?: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: string;
  status?: 'mastered' | 'revision' | 'unseen';
}

export interface StickyNoteItem {
  id: string;
  text: string;
  color: string;
  pinned: boolean;
  size?: 'sm' | 'md' | 'lg';
  created_at?: string;
}

export interface QuizAttemptRecord {
  quizId: string;
  topicId: string;
  attemptNumber: number; // 1, 2, or 3 (max 3)
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpentSeconds: number;
  completedAt: string;
  answers: Record<number, number>;
}

export interface SubjectMastery {
  subjectId: string;
  subjectName: string;
  totalTopics: number;
  completedTopics: number;
  masteryPercentage: number;
  accuracyPercentage: number;
  questionsAnswered: number;
  colorClass: string;
}
