/**
 * NEOMCQ — BATCH 7.9: AI TUTOR ANALYTICS INTELLIGENCE TYPES
 * Reusable strongly typed analytics structures for admin telemetry & friction analysis.
 */

export type TutorAnalyticsTimeframe = '7d' | '30d' | '90d' | 'all';

export interface TutorEngagementMetrics {
  totalOpens: number;
  uniqueLearners: number;
  totalStarts: number;
  totalCompletions: number;
  completionRate: number; // Percentage 0-100
  avgCompletionPercentage: number; // Percentage 0-100
}

export interface TutorLessonMetrics {
  sceneStarts: number;
  sceneCompletions: number;
  sceneCompletionRate: number; // Percentage 0-100
}

export interface TutorPlaybackMetrics {
  pauseCount: number;
  resumeCount: number;
  seekCount: number;
  exitBeforeCompletionCount: number;
  pauseRate: number; // Pauses per started session %
  seekRate: number; // Seeks per started session %
}

export interface TutorFaqDoubtMetrics {
  faqOpened: number;
  faqViewed: number;
  canonicalFaqReused: number;
  doubtsAsked: number;
  newDoubtAnswersGenerated: number;
  canonicalFaqReuseRate: number; // Percentage 0-100
}

export interface HighFrictionItem {
  scopeKey: string;
  examId: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string | null;
  examName?: string;
  subjectName?: string;
  topicName?: string;
  subtopicName?: string;
  startsCount: number;
  completionsCount: number;
  dropOffCount: number;
  doubtsCount: number;
  pauseSeekCount: number;
  frictionScore: number;
  frictionSignals: string[];
}

export interface TutorAnalyticsParams {
  timeframe?: TutorAnalyticsTimeframe;
  examId?: string;
  subjectId?: string;
  topicId?: string;
  subtopicId?: string;
}

export interface TutorAnalyticsData {
  timeframe: TutorAnalyticsTimeframe;
  filters: {
    examId?: string;
    subjectId?: string;
    topicId?: string;
    subtopicId?: string;
  };
  metrics: {
    engagement: TutorEngagementMetrics;
    lesson: TutorLessonMetrics;
    playback: TutorPlaybackMetrics;
    faqDoubt: TutorFaqDoubtMetrics;
  };
  highFrictionItems: HighFrictionItem[];
  totalEventCount: number;
  updatedAt: string;
}

export interface TutorAnalyticsResponse {
  success: boolean;
  data?: TutorAnalyticsData;
  error?: string;
}
