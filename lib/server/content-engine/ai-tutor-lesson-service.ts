/**
 * NEOMCQ — FEATURE 7: CANONICAL AI TUTOR LESSON SERVICE
 * Batch 7.2: Lesson Generator & FAQ Discovery Engine
 */

import { GoogleGenAI } from '@google/genai';
import { getSupabaseAdmin } from '../../supabase';
import { verifyCanonicalHierarchy } from './canonical-identity';
import { TutorDbService } from './tutor-db-service';
import { GenerationJobManager } from './job-manager';
import { TutorAssetResolver } from './tutor-asset-resolver';
import {
  TutorLessonSchema,
  TutorSceneSchema,
  BoardActionSchema,
  TutorAssetSchema,
  type TutorLesson,
  type TutorScene,
  type TutorAsset,
  type TutorVoiceMetadata,
} from '../../types/ai-tutor-architecture';
import { z } from 'zod';

export interface GetOrGenerateLessonParams {
  examId: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string | null;
  contentVersion?: number;
  userId?: string;
  forceRefresh?: boolean;
}

export interface LessonServiceResponse {
  success: boolean;
  lessonState?: 'NOT_STARTED' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED';
  message?: string;
  servedFromCache?: boolean;
  lesson?: TutorLesson;
  scenes?: TutorScene[];
  assets?: TutorAsset[];
  voiceMetadata?: TutorVoiceMetadata[];
  userProgress?: any;
  jobId?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Sanitizes strings against script injection and raw HTML tag execution
 */
function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

export class AITutorLessonService {
  /**
   * Retrieves or generates a canonical AI Tutor lesson for exact scope:
   * Exam -> Subject -> Topic -> Subtopic
   */
  public static async getOrGenerateLesson(params: GetOrGenerateLessonParams): Promise<LessonServiceResponse> {
    const supabase = getSupabaseAdmin();
    const { examId, subjectId, topicId, subtopicId = null, contentVersion = 1, forceRefresh = false } = params;

    // 1. Hierarchy Verification (server-side database check)
    const hierarchy = await verifyCanonicalHierarchy(examId, subjectId, topicId, subtopicId, supabase);
    if (!hierarchy.valid) {
      return {
        success: false,
        error: hierarchy.error || 'Invalid curriculum scope hierarchy.',
        errorCode: 'HIERARCHY_INVALID',
      };
    }

    // 2. Check existing canonical lesson (Indefinite reuse, NO 30-day expiration constraint)
    if (!forceRefresh) {
      const existing = await TutorDbService.getCanonicalTutorLesson(
        examId,
        subjectId,
        topicId,
        subtopicId,
        contentVersion
      );

      if (existing && existing.lesson && existing.lesson.lessonState === 'READY') {
        let finalAssets = existing.assets || [];
        const needsResolution = finalAssets.length === 0 || finalAssets.some((a) => {
          const pos = a.positionMetadata as any;
          return !a.sourceUrl || pos?.status !== 'READY';
        });

        if (needsResolution) {
          const resolved = await TutorAssetResolver.resolveAndSaveLessonAssets({
            examId,
            subjectId,
            topicId,
            subtopicId,
            lessonId: existing.lesson.id,
            userId: params.userId,
          });
          if (resolved.success && resolved.assets) {
            finalAssets = resolved.assets;
          }
        }

        const userProgress = params.userId
          ? await TutorDbService.getUserTutorProgress(params.userId, existing.lesson.id)
          : null;

        return {
          success: true,
          lessonState: 'READY',
          message: 'Retrieved existing canonical Tutor lesson.',
          servedFromCache: true,
          lesson: existing.lesson,
          scenes: existing.scenes,
          assets: finalAssets,
          voiceMetadata: existing.voiceMetadata,
          userProgress,
        };
      }
    }

    // 3. Concurrency Lock: Check or attach to active job in ai_jobs
    const jobRes = await TutorDbService.createOrAttachTutorJob({
      examId,
      subjectId,
      topicId,
      subtopicId,
      version: contentVersion,
      userId: params.userId,
    });

    const activeJob = jobRes.job;
    const isNewJob = jobRes.isNew;

    if (!isNewJob && activeJob.status === 'RUNNING') {
      return {
        success: true,
        lessonState: 'GENERATING',
        message: 'Preparing your Tutor lesson…',
        jobId: activeJob.id,
      };
    }

    // Mark job running
    await GenerationJobManager.markRunning(activeJob.id, 'gemini', 'gemini-3.8-flash', supabase);

    // 4. Gemini AI Lesson Generation
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      let parsedData: any = null;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });

      const prompt = `
You are an expert AI Master Tutor creating a comprehensive 5-scene visual lesson.

EXAM SCOPE:
- Exam: ${hierarchy.examName || examId}
- Subject: ${hierarchy.subjectName || subjectId}
- Main Topic: ${hierarchy.topicName || topicId}
${hierarchy.subtopicName ? `- Subtopic: ${hierarchy.subtopicName}` : ''}

INSTRUCTIONS:
1. Adapt content strictly to the exam context above. Content must work for any domain (medical, engineering, law, finance, entrance exams, languages, etc.).
2. Do NOT include raw HTML, executable JavaScript, or script tags in any field.
3. Structure 5 sequential scenes covering:
   - Scene 1: Introduction & High-Yield Roadmap (phase: "INTRODUCTION")
   - Scene 2: Foundational Principles & Terminology (phase: "FOUNDATION")
   - Scene 3: Core Mechanism / Concept Flow (phase: "CORE_CONCEPT")
   - Scene 4: Advanced Application & Exam Traps (phase: "APPLICATION")
   - Scene 5: High-Yield Recap & Checkpoint Questions (phase: "RECAP")

4. Return ONLY valid JSON in the following schema format:
{
  "title": "Comprehensive Master Lesson: ${hierarchy.topicName}",
  "subtitle": "High-yield concepts and exam strategies for ${hierarchy.examName}",
  "difficultyLevel": "Intermediate",
  "durationSeconds": 300,
  "canonicalData": {
    "learningObjectives": [
      "Understand core concepts of ${hierarchy.topicName}",
      "Master exam-specific problem solving patterns",
      "Avoid common distractors and traps"
    ],
    "introduction": "Welcome to this AI Tutor session on ${hierarchy.topicName}.",
    "summary": "In summary, remember the foundational principles and key decision points for ${hierarchy.topicName}.",
    "revisionQuestions": [
      {
        "id": "rev_1",
        "question": "What is the primary key principle governing ${hierarchy.topicName}?",
        "options": ["Principle A", "Principle B", "Principle C", "Principle D"],
        "correctIndex": 0,
        "explanation": "Option A is correct because it directly addresses the fundamental mechanism."
      }
    ]
  },
  "scenes": [
    {
      "sequenceNumber": 1,
      "title": "1. Introduction — ${hierarchy.topicName}",
      "phase": "INTRODUCTION",
      "startSeconds": 0,
      "durationSeconds": 60,
      "narrationScript": "Welcome! In this lesson, we will explore ${hierarchy.topicName} specifically tailored for ${hierarchy.examName}. Let us begin with our high-yield roadmap.",
      "timedCues": [
        { "timeOffsetMs": 1000, "text": "Lesson Overview", "boardActionId": "action_1" }
      ],
      "boardActions": [
        { "id": "action_1", "type": "WRITE", "timeOffsetMs": 1000, "text": "${hierarchy.topicName} Overview", "color": "#0284c7" }
      ],
      "accentColor": "indigo",
      "keyBullets": ["High yield scope", "Exam relevancy", "Key terminology"],
      "examRelevance": "Core testable concept for ${hierarchy.examName}"
    },
    {
      "sequenceNumber": 2,
      "title": "2. Foundation & Terminology",
      "phase": "FOUNDATION",
      "startSeconds": 60,
      "durationSeconds": 60,
      "narrationScript": "Before diving deeper, let us establish the foundational definitions and core rules.",
      "timedCues": [
        { "timeOffsetMs": 1000, "text": "Definitions", "boardActionId": "action_2" }
      ],
      "boardActions": [
        { "id": "action_2", "type": "HIGHLIGHT", "timeOffsetMs": 1000, "text": "Key Terms", "color": "emerald" }
      ],
      "accentColor": "cyan",
      "keyBullets": ["Foundational rule 1", "Foundational rule 2"],
      "examRelevance": "Frequently tested terminology"
    },
    {
      "sequenceNumber": 3,
      "title": "3. Core Mechanism & Step-by-Step Flow",
      "phase": "CORE_CONCEPT",
      "startSeconds": 120,
      "durationSeconds": 60,
      "narrationScript": "Now let us examine the step-by-step mechanism and underlying logic.",
      "timedCues": [
        { "timeOffsetMs": 1000, "text": "Step-by-step process", "boardActionId": "action_3" }
      ],
      "boardActions": [
        { "id": "action_3", "type": "ARROW", "timeOffsetMs": 1000, "text": "Process Flow", "color": "indigo" }
      ],
      "accentColor": "indigo",
      "keyBullets": ["Step 1 Trigger", "Step 2 Cascade", "Step 3 Outcome"],
      "examRelevance": "High-yield mechanical sequence"
    },
    {
      "sequenceNumber": 4,
      "title": "4. Advanced Application & Traps",
      "phase": "APPLICATION",
      "startSeconds": 180,
      "durationSeconds": 60,
      "narrationScript": "Let us analyze how examiners create distractor options and high-yield traps on ${hierarchy.examName}.",
      "timedCues": [
        { "timeOffsetMs": 1000, "text": "Board Trap Analysis", "boardActionId": "action_4" }
      ],
      "boardActions": [
        { "id": "action_4", "type": "CIRCLE", "timeOffsetMs": 1000, "text": "Common Pitfall", "color": "rose" }
      ],
      "accentColor": "rose",
      "keyBullets": ["Avoid distractor pattern A", "Key differentiator B"],
      "examRelevance": "Crucial exam trap identification"
    },
    {
      "sequenceNumber": 5,
      "title": "5. High-Yield Summary & Review",
      "phase": "RECAP",
      "startSeconds": 240,
      "durationSeconds": 60,
      "narrationScript": "To wrap up, review these core takeaways before answering exam practice questions.",
      "timedCues": [
        { "timeOffsetMs": 1000, "text": "Final Summary", "boardActionId": "action_5" }
      ],
      "boardActions": [
        { "id": "action_5", "type": "TRANSITION", "timeOffsetMs": 1000, "text": "Summary Card", "color": "emerald" }
      ],
      "accentColor": "emerald",
      "keyBullets": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
      "examRelevance": "Last-minute review points"
    }
  ],
  "assets": [
    {
      "assetType": "DIAGRAM",
      "sourceUrl": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
      "altText": "Conceptual diagram illustrating ${hierarchy.topicName}",
      "caption": "Step-by-step process flowchart for ${hierarchy.topicName}",
      "positionMetadata": { "x": 0, "y": 0, "margin": 16 }
    }
  ]
}
`;

          const aiResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
          });

          const responseText = (aiResponse.text || '').trim();
          const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
          parsedData = JSON.parse(cleanJson);
        } catch (genErr) {
          console.warn('[AITutorLessonService] Gemini call failed, falling back to deterministic synthesis:', genErr);
        }
      }

      if (!parsedData) {
        parsedData = {
          title: `Master Lesson: ${hierarchy.topicName}`,
          subtitle: `High-yield concepts and exam strategies for ${hierarchy.examName}`,
          difficultyLevel: 'Intermediate',
          durationSeconds: 300,
          canonicalData: {
            learningObjectives: [
              `Understand fundamental principles of ${hierarchy.topicName}`,
              `Master high-yield problem solving workflows for ${hierarchy.examName}`,
              `Identify and avoid common exam traps in ${hierarchy.subjectName}`,
            ],
            introduction: `Welcome to this AI Master Tutor lesson focusing on ${hierarchy.topicName}.`,
            summary: `Remember the essential mechanisms, decision rules, and key differentiators for ${hierarchy.topicName}.`,
            revisionQuestions: [
              {
                id: 'rev_1',
                question: `What represents the primary governing principle of ${hierarchy.topicName}?`,
                options: [
                  `Direct application of fundamental rules for ${hierarchy.topicName}`,
                  'Arbitrary unstructured heuristic without validation',
                  'Ignoring standard constraints and assumptions',
                  'Inverted order of standard analytical operations',
                ],
                correctIndex: 0,
                explanation: `Option A correctly identifies the fundamental rule governing ${hierarchy.topicName} in ${hierarchy.examName}.`,
              },
            ],
          },
          scenes: [
            {
              sequenceNumber: 1,
              title: `1. Introduction & Overview — ${hierarchy.topicName}`,
              phase: 'INTRODUCTION',
              startSeconds: 0,
              durationSeconds: 60,
              narrationScript: `Welcome! In this lesson, we will explore ${hierarchy.topicName} in the context of ${hierarchy.examName}. Let us begin with our high-yield roadmap.`,
              timedCues: [{ timeOffsetMs: 1000, text: 'Lesson Overview', boardActionId: 'act_1' }],
              boardActions: [{ id: 'act_1', type: 'WRITE', timeOffsetMs: 1000, text: `Roadmap: ${hierarchy.topicName}`, color: 'sky' }],
              accentColor: 'sky',
              keyBullets: ['Exam scope & weighting', 'Foundational roadmap', 'Key target concepts'],
              examRelevance: 'Orientation for high-yield exam sections',
            },
            {
              sequenceNumber: 2,
              title: `2. Core Definitions & Principles`,
              phase: 'FOUNDATION',
              startSeconds: 60,
              durationSeconds: 60,
              narrationScript: `Let us establish the governing principles and definitions for ${hierarchy.topicName}.`,
              timedCues: [{ timeOffsetMs: 1000, text: 'Core Rules', boardActionId: 'act_2' }],
              boardActions: [{ id: 'act_2', type: 'BOX', timeOffsetMs: 1000, text: 'Foundational Rules', color: 'amber' }],
              accentColor: 'amber',
              keyBullets: ['Governing definitions', 'Standard formulas / criteria', 'Domain terminology'],
              examRelevance: 'Direct definition questions and base calculations',
            },
            {
              sequenceNumber: 3,
              title: `3. Step-by-Step Problem Solving Workflow`,
              phase: 'CORE_CONCEPT',
              startSeconds: 120,
              durationSeconds: 60,
              narrationScript: `Now we walk through the analytical problem-solving sequence required for ${hierarchy.topicName}.`,
              timedCues: [{ timeOffsetMs: 1000, text: 'Workflow Flowchart', boardActionId: 'act_3' }],
              boardActions: [{ id: 'act_3', type: 'ARROW', timeOffsetMs: 1000, text: 'Step 1 -> Step 2 -> Step 3', color: 'indigo' }],
              accentColor: 'indigo',
              keyBullets: ['Identify problem parameters', 'Apply governing criteria', 'Verify solution against constraints'],
              examRelevance: 'Multi-step analytical questions',
            },
            {
              sequenceNumber: 4,
              title: `4. Exam Traps & Common Distractors`,
              phase: 'APPLICATION',
              startSeconds: 180,
              durationSeconds: 60,
              narrationScript: `Pay close attention to subtle exam distractors and unit / boundary condition errors.`,
              timedCues: [{ timeOffsetMs: 1000, text: 'Trap Alert', boardActionId: 'act_4' }],
              boardActions: [{ id: 'act_4', type: 'CIRCLE', timeOffsetMs: 1000, text: 'Beware: Boundary traps', color: 'rose' }],
              accentColor: 'rose',
              keyBullets: ['Common misunderstanding A', 'Distractor pattern B', 'Correct verification check'],
              examRelevance: 'Crucial for avoiding negative marking and distractor traps',
            },
            {
              sequenceNumber: 5,
              title: `5. High-Yield Summary & Revision`,
              phase: 'RECAP',
              startSeconds: 240,
              durationSeconds: 60,
              narrationScript: `Here is the final summary of key takeaways for ${hierarchy.topicName}. Keep these memorized for rapid recall.`,
              timedCues: [{ timeOffsetMs: 1000, text: 'Final Summary', boardActionId: 'act_5' }],
              boardActions: [{ id: 'act_5', type: 'TRANSITION', timeOffsetMs: 1000, text: 'Key Takeaways', color: 'emerald' }],
              accentColor: 'emerald',
              keyBullets: ['Takeaway 1: Core definition', 'Takeaway 2: Analytical rule', 'Takeaway 3: Distractor pattern'],
              examRelevance: 'Rapid last-minute revision checklist',
            },
          ],
          assets: [
            {
              assetType: 'DIAGRAM',
              sourceUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
              altText: `Concept chart for ${hierarchy.topicName}`,
              caption: `Systematic overview of ${hierarchy.topicName}`,
              positionMetadata: { x: 0, y: 0, margin: 16 },
            },
          ],
        };
      }

      // Sanitize fields
      const title = sanitizeText(parsedData.title || `Master Lesson: ${hierarchy.topicName}`);
      const subtitle = sanitizeText(parsedData.subtitle || `Exam strategy for ${hierarchy.examName}`);
      const durationSeconds = Number(parsedData.durationSeconds || 300);
      const canonicalData = {
        learningObjectives: (parsedData.canonicalData?.learningObjectives || []).map((o: string) => sanitizeText(o)),
        introduction: sanitizeText(parsedData.canonicalData?.introduction || ''),
        summary: sanitizeText(parsedData.canonicalData?.summary || ''),
        revisionQuestions: (parsedData.canonicalData?.revisionQuestions || []).map((q: any) => ({
          id: String(q.id || 'q_1'),
          question: sanitizeText(q.question || ''),
          options: (q.options || []).map((opt: string) => sanitizeText(opt)),
          correctIndex: Number(q.correctIndex || 0),
          explanation: sanitizeText(q.explanation || ''),
        })),
        faqReferences: [],
      };

      const scenes: Array<Omit<TutorScene, 'id' | 'lessonId'>> = (parsedData.scenes || []).map((scene: any, idx: number) => ({
        sequenceNumber: Number(scene.sequenceNumber || idx + 1),
        title: sanitizeText(scene.title || `Scene ${idx + 1}`),
        phase: sanitizeText(scene.phase || 'CORE_CONCEPT'),
        startSeconds: Number(scene.startSeconds || idx * 60),
        durationSeconds: Number(scene.durationSeconds || 60),
        narrationScript: sanitizeText(scene.narrationScript || ''),
        timedCues: (scene.timedCues || []).map((c: any) => ({
          timeOffsetMs: Number(c.timeOffsetMs || 0),
          text: sanitizeText(c.text || ''),
          boardActionId: c.boardActionId ? String(c.boardActionId) : undefined,
        })),
        boardActions: (scene.boardActions || []).map((act: any) => ({
          id: String(act.id || `act_${idx}_${Math.random().toString(36).substring(2, 6)}`),
          type: act.type || 'WRITE',
          timeOffsetMs: Number(act.timeOffsetMs || 0),
          text: sanitizeText(act.text || ''),
          color: sanitizeText(act.color || '#0284c7'),
          position: act.position ? { x: Number(act.position.x || 0), y: Number(act.position.y || 0) } : undefined,
        })),
        accentColor: scene.accentColor || 'indigo',
        keyBullets: (scene.keyBullets || []).map((b: string) => sanitizeText(b)),
        examRelevance: sanitizeText(scene.examRelevance || 'High Yield'),
        clinicalPearls: (scene.clinicalPearls || []).map((p: string) => sanitizeText(p)),
      }));

      const assets: Array<Omit<TutorAsset, 'id' | 'lessonId'>> = (parsedData.assets || []).map((ast: any) => ({
        assetType: ast.assetType || 'DIAGRAM',
        sourceUrl: ast.sourceUrl || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
        altText: sanitizeText(ast.altText || `Visual illustration for ${hierarchy.topicName}`),
        caption: ast.caption ? sanitizeText(ast.caption) : undefined,
        positionMetadata: ast.positionMetadata || { x: 0, y: 0, margin: 16 },
        isSafeRendering: true,
      }));

      // Save newly generated canonical lesson permanently
      const saveRes = await TutorDbService.saveCanonicalTutorLesson({
        examId,
        subjectId,
        topicId,
        subtopicId,
        contentVersion,
        title,
        subtitle,
        durationSeconds,
        difficultyLevel: parsedData.difficultyLevel || 'Intermediate',
        canonicalData,
        scenes,
        assets,
      });

      if (!saveRes.success || !saveRes.lessonId) {
        await GenerationJobManager.markFailed(activeJob.id, saveRes.error || 'Failed to save lesson record.', supabase);
        return {
          success: false,
          error: saveRes.error || 'Database storage error for canonical lesson.',
          errorCode: 'STORAGE_FAILED',
        };
      }

      await GenerationJobManager.markCompleted(activeJob.id, { lessonId: saveRes.lessonId }, supabase);

      // Resolve safe canonical visual assets
      await TutorAssetResolver.resolveAndSaveLessonAssets({
        examId,
        subjectId,
        topicId,
        subtopicId,
        lessonId: saveRes.lessonId,
        userId: params.userId,
      });

      // Re-query canonical lesson for clean structure return
      const finalResult = await TutorDbService.getCanonicalTutorLesson(
        examId,
        subjectId,
        topicId,
        subtopicId,
        contentVersion
      );

      if (!finalResult) {
        return {
          success: false,
          error: 'Failed to retrieve saved canonical lesson.',
          errorCode: 'FETCH_FAILED',
        };
      }

      return {
        success: true,
        lessonState: 'READY',
        message: 'Successfully generated canonical AI Tutor lesson.',
        servedFromCache: false,
        lesson: finalResult.lesson,
        scenes: finalResult.scenes,
        assets: finalResult.assets,
        voiceMetadata: finalResult.voiceMetadata,
      };
    } catch (err: any) {
      await GenerationJobManager.markFailed(activeJob.id, err.message, supabase);
      return {
        success: false,
        error: 'We\'re preparing this lesson for you.',
        errorCode: 'GENERATION_FAILED',
      };
    }
  }
}
