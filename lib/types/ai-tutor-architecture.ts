import { z } from 'zod';

/**
 * NEOMCQ — FEATURE 7: AI TUTOR ARCHITECTURE TYPES & ZOD SCHEMAS
 * Batch 7.1: Database + Architecture Foundations
 */

export type TutorLessonState = 'NOT_STARTED' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED';

export const BOARD_ACTION_TYPES = [
  'WRITE',
  'HIGHLIGHT',
  'UNDERLINE',
  'CIRCLE',
  'ARROW',
  'DRAW',
  'SHOW_IMAGE',
  'SHOW_TABLE',
  'ERASE',
  'PAUSE',
  'TRANSITION',
] as const;

export type BoardActionType = typeof BOARD_ACTION_TYPES[number];

export const BoardActionSchema = z.object({
  id: z.string(),
  type: z.enum(BOARD_ACTION_TYPES),
  timeOffsetMs: z.number().nonnegative(),
  durationMs: z.number().nonnegative().optional(),
  targetId: z.string().optional(),
  text: z.string().optional(),
  color: z.string().optional(), // Hex or token e.g. '#0284c7', 'emerald'
  position: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
  style: z
    .object({
      fontSize: z.number().optional(),
      fontWeight: z.string().optional(),
      markerWidth: z.number().optional(),
      highlightOpacity: z.number().optional(),
    })
    .optional(),
});

export type BoardAction = z.infer<typeof BoardActionSchema>;

export const TUTOR_ASSET_TYPES = ['IMAGE', 'DIAGRAM', 'TABLE', 'FORMULA', 'AUDIO_VOICE'] as const;
export type TutorAssetType = typeof TUTOR_ASSET_TYPES[number];

export const TutorAssetSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  sceneId: z.string().optional(),
  assetType: z.enum(TUTOR_ASSET_TYPES),
  sourceUrl: z.string(),
  altText: z.string(),
  caption: z.string().optional(),
  positionMetadata: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    width: z.number().optional(),
    height: z.number().optional(),
    aspectRatio: z.number().optional(),
    crop: z.string().optional(),
    margin: z.number().default(16),
  }),
  isSafeRendering: z.literal(true).default(true), // Strictly no raw HTML/SVG scripts
});

export type TutorAsset = z.infer<typeof TutorAssetSchema>;

export const WordTimestampSchema = z.object({
  word: z.string(),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
});

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;

export const TutorVoiceMetadataSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  sceneId: z.string(),
  voiceId: z.string().default('en-US-Neural2-F'),
  languageCode: z.string().default('en-US'),
  speakingRate: z.number().default(1.0),
  audioUrl: z.string().optional(),
  durationMs: z.number().nonnegative(),
  wordLevelTimestamps: z.array(WordTimestampSchema).default([]),
});

export type TutorVoiceMetadata = z.infer<typeof TutorVoiceMetadataSchema>;

export const TutorSceneSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  sequenceNumber: z.number().int().positive(),
  title: z.string(),
  phase: z.string(), // e.g. 'INTRODUCTION', 'FOUNDATION', 'CORE_CONCEPT', 'RECAP'
  startSeconds: z.number().nonnegative(),
  durationSeconds: z.number().positive(),
  narrationScript: z.string(),
  timedCues: z.array(
    z.object({
      timeOffsetMs: z.number().nonnegative(),
      text: z.string(),
      boardActionId: z.string().optional(),
    })
  ).default([]),
  boardActions: z.array(BoardActionSchema).default([]),
  accentColor: z.enum(['indigo', 'cyan', 'amber', 'rose', 'emerald', 'purple']).default('indigo'),
  keyBullets: z.array(z.string()).default([]),
  examRelevance: z.string().default('High Yield'),
  clinicalPearls: z.array(z.string()).optional(),
  mediaAssetIds: z.array(z.string()).optional(),
});

export type TutorScene = z.infer<typeof TutorSceneSchema>;

export const TutorLessonSchema = z.object({
  id: z.string(),
  examId: z.string(),
  subjectId: z.string(),
  topicId: z.string(),
  subtopicId: z.string().nullable().optional(),
  contentVersion: z.number().int().default(1),
  title: z.string(),
  subtitle: z.string().optional(),
  durationSeconds: z.number().nonnegative().default(0),
  totalScenes: z.number().int().nonnegative().default(0),
  difficultyLevel: z.string().default('Intermediate'),
  thumbnailUrl: z.string().optional(),
  lessonState: z.enum(['NOT_STARTED', 'QUEUED', 'GENERATING', 'READY', 'FAILED']).default('READY'),
  canonicalData: z.object({
    learningObjectives: z.array(z.string()).default([]),
    introduction: z.string().optional(),
    summary: z.string().optional(),
    revisionQuestions: z.array(
      z.object({
        id: z.string(),
        question: z.string(),
        options: z.array(z.string()),
        correctIndex: z.number().int(),
        explanation: z.string(),
      })
    ).default([]),
    faqReferences: z.array(z.string()).default([]),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastAccessedAt: z.string().optional(),
});

export type TutorLesson = z.infer<typeof TutorLessonSchema>;

export const TutorStructuredAnswerSchema = z.object({
  directAnswer: z.string(),
  explanation: z.string(),
  keyPoints: z.array(z.string()).default([]),
  example: z.string().optional(),
  commonTrap: z.string().optional(),
  memoryAid: z.string().optional(),
  relatedConcepts: z.array(z.string()).optional(),
});

export type TutorStructuredAnswer = z.infer<typeof TutorStructuredAnswerSchema>;

export const TutorCanonicalFAQSchema = z.object({
  id: z.string(),
  examId: z.string(),
  subjectId: z.string(),
  topicId: z.string(),
  subtopicId: z.string().nullable().optional(),
  question: z.string(),
  questionNormalized: z.string().optional(),
  questionHash: z.string(),
  answer: z.string(), // Formatted text/markdown response
  answerJson: TutorStructuredAnswerSchema.optional(),
  confidenceScore: z.number().default(0.95),
  helpfulCount: z.number().int().default(0),
  useCount: z.number().int().default(1),
  status: z.enum(['APPROVED', 'PENDING_REVIEW', 'REJECTED', 'CANDIDATE']).default('APPROVED'),
  lessonId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TutorCanonicalFAQ = z.infer<typeof TutorCanonicalFAQSchema>;

export const TutorFaqReferenceSchema = z.object({
  id: z.string(),
  faqId: z.string(),
  lessonId: z.string(),
  sceneId: z.string().optional(),
  relevanceScore: z.number().default(1.0),
});

export type TutorFaqReference = z.infer<typeof TutorFaqReferenceSchema>;

export const UserTutorProgressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  lessonId: z.string(),
  lastSceneSequence: z.number().int().default(1),
  playbackPositionSeconds: z.number().nonnegative().default(0),
  isCompleted: z.boolean().default(false),
  completedScenes: z.array(z.number().int()).default([]),
  checkpointsPassed: z.array(z.string()).default([]),
  lastStudiedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserTutorProgress = z.infer<typeof UserTutorProgressSchema>;

export interface TutorGenerationJobParams {
  examId: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string | null;
  version?: number;
  userId?: string;
}
