/**
 * NEOMCQ — CANONICAL AI TUTOR TEACHING ENGINE (VIDEO PIPELINE HARDENED)
 * Phase 6: Grounded Progressive Video Scene Generation, Timed Narration, Visual Flowcharts & Checkpoints
 */

import { getSupabaseAdmin } from '../../supabase';
import { verifyCanonicalHierarchy } from './canonical-identity';
import { TutorSessionManager } from './tutor-session-manager';
import { GenerationJobManager } from './job-manager';
import { ContentCostAuditor } from './cost-auditor';
import { ContentCacheManager } from './content-cache-manager';
import type { TutorSegment, TutorLessonSession, TutorSegmentData, TutorScene, FlowchartData, ComparisonData, CheckpointQuestion } from './tutor-types';
import { CANONICAL_TUTOR_PHASES } from './tutor-types';
import { TutorSegmentValidator } from './tutor-segment-validator';
import { GoogleGenAI } from '@google/genai';

export interface GenerateSegmentOptions {
  lessonId: string;
  userId: string;
  phase?: string;
  sequence?: number;
  sequenceNumber?: number;
  forceRefresh?: boolean;
  supabaseClient?: any;
}

export class CanonicalTutorGenerator {
  public static async createOrResumeLesson(options: any) {
    return TutorSessionManager.createOrResumeLesson(options);
  }

  public static async listTopicLessons(topicId: string, userId?: string, supabaseClient?: any) {
    return TutorSessionManager.listTopicLessons(topicId, userId, supabaseClient);
  }

  public static async getLessonState(lessonId: string, userId: string, supabaseClient?: any) {
    return TutorSessionManager.getLessonState(lessonId, userId, supabaseClient);
  }

  public static async pauseOrResumeLesson(lessonId: string, userId: string, action: 'PAUSE' | 'RESUME', supabaseClient?: any) {
    return TutorSessionManager.pauseOrResumeLesson(lessonId, userId, action, supabaseClient);
  }

  /**
   * Generates the next Tutor teaching segment & video scene grounded in canonical notes
   */
  public static async generateNextSegment(
    options: GenerateSegmentOptions
  ): Promise<{
    success: boolean;
    segment?: TutorSegment;
    scene?: TutorScene;
    session?: TutorLessonSession;
    lesson?: TutorLessonSession;
    error?: string;
    errorCode?: string;
    retryable?: boolean;
    attachedToJob?: boolean;
    servedFromCache?: boolean;
    isCompleted?: boolean;
    currentSequence?: number;
    nextAvailableState?: string;
    costAudit?: any;
  }> {
    const supabase = options.supabaseClient || getSupabaseAdmin();
    const { lessonId, userId, forceRefresh = false } = options;

    if (!userId) {
      return {
        success: false,
        error: 'User authentication required.',
        errorCode: 'UNAUTHORIZED',
      };
    }

    // 1. Retrieve current lesson state and verify ownership
    const stateRes = await TutorSessionManager.getLessonState(lessonId, userId, supabase);
    if (!stateRes.success || !stateRes.session) {
      return {
        success: false,
        error: stateRes.error || 'Tutor lesson session not found.',
        errorCode: stateRes.errorCode || 'NOT_FOUND',
      };
    }

    const session = stateRes.session;

    // 2. Verify Canonical Hierarchy
    const hierarchy = await verifyCanonicalHierarchy(session.examId, session.subjectId, session.topicId, supabase);
    if (!hierarchy.valid) {
      return {
        success: false,
        error: hierarchy.error || 'Invalid canonical hierarchy.',
        errorCode: 'HIERARCHY_INVALID',
      };
    }

    // Fetch active subtopics
    let subtopicNames: string[] = [];
    try {
      const { data: dbSubtopics } = await supabase
        .from('exam_subtopics')
        .select('name')
        .eq('topic_id', session.topicId)
        .eq('is_active', true);
      if (dbSubtopics && dbSubtopics.length > 0) {
        subtopicNames = dbSubtopics.map((s: any) => s.name);
      }
    } catch (subErr) {
      console.warn('[AI Tutor Generator] Subtopics query failed:', subErr);
    }

    // 3. Determine sequence and target phase
    const reqSeq = options.sequence !== undefined ? options.sequence : options.sequenceNumber;
    const nextSequence = reqSeq !== undefined ? reqSeq : session.currentSequence + 1;
    const phaseIndex = Math.min(Math.max(0, nextSequence - 1), CANONICAL_TUTOR_PHASES.length - 1);
    const targetPhase = options.phase || CANONICAL_TUTOR_PHASES[phaseIndex] || 'RECAP';

    // 4. Check if scene already exists in session
    const existingSegment = session.segments.find((s) => Number(s.sequence) === Number(nextSequence));
    if (existingSegment && !forceRefresh) {
      return {
        success: true,
        segment: existingSegment,
        scene: existingSegment.scene || session.scenes.find((sc) => sc.sequence === nextSequence),
        session,
        lesson: session,
        servedFromCache: true,
        currentSequence: Number(existingSegment.sequence),
        isCompleted: session.lessonState === 'COMPLETED',
        nextAvailableState: session.lessonState,
      };
    }

    // 5. Concurrency lock
    const idempotencyKey = `tutor_segment:${userId}:${session.topicId}:${lessonId}:seq${nextSequence}`;
    const activeJob = await GenerationJobManager.findActiveJob(idempotencyKey, supabase);

    if (activeJob && !forceRefresh) {
      await GenerationJobManager.waitForJobCompletion(activeJob.id, 15000, supabase);
      const updatedState = await TutorSessionManager.getLessonState(lessonId, userId, supabase);
      const seg = updatedState.session?.segments.find((s) => Number(s.sequence) === Number(nextSequence));
      return {
        success: true,
        segment: seg,
        scene: seg?.scene,
        session: updatedState.session || session,
        lesson: updatedState.session || session,
        attachedToJob: true,
        currentSequence: nextSequence,
        isCompleted: updatedState.session?.lessonState === 'COMPLETED',
        nextAvailableState: updatedState.session?.lessonState || 'IN_PROGRESS',
      };
    }

    const jobCreation = await GenerationJobManager.createOrAttachJob(
      {
        examId: session.examId,
        subjectId: session.subjectId,
        topicId: session.topicId,
        packageType: `tutor_seq_${nextSequence}` as any,
        version: session.contentVersion,
        task: `generate_tutor_scene_${nextSequence}`,
      },
      supabase
    );

    const jobId = jobCreation.job.id;
    const provider = 'gemini';
    const model = 'gemini-3.7-flash';

    await GenerationJobManager.markRunning(jobId, provider, model, supabase);

    // 6. Grounding: Fetch canonical Notes content
    const cacheRes = await ContentCacheManager.getLatestVersion(
      session.examId,
      session.subjectId,
      session.topicId,
      supabase
    );

    const notesGrounding = cacheRes.pkg?.notesSlot || session.canonicalNotesGrounding || null;
    const mediaGrounding = cacheRes.pkg?.mediaReferencesSlot || notesGrounding?.mediaReferences || [];

    const availableMediaIds: string[] = Array.isArray(mediaGrounding)
      ? mediaGrounding.map((m: any) => m.id || m.media_id || m.url).filter(Boolean)
      : [];

    const previousSegments = (session.segments || []).filter((s) => Number(s.sequence) < Number(nextSequence));

    // 7. AI Video Scene & Teaching Segment Generation
    try {
      const { sceneData, inputTokens, outputTokens, cachedTokens } = await this.callAIVideoSceneEngine({
        examName: hierarchy.examName || 'Exam',
        subjectName: hierarchy.subjectName || 'Subject',
        topicName: hierarchy.topicName || 'Topic',
        phase: targetPhase,
        sequence: nextSequence,
        notesGrounding,
        previousSegments,
        availableMediaIds,
        model,
        subtopicNames,
      });

      // Construct complete segment object
      const newSegment: TutorSegment = {
        lessonId,
        topicId: session.topicId,
        contentVersion: session.contentVersion,
        sequence: nextSequence,
        phase: sceneData.phase || targetPhase,
        title: sceneData.title,
        teachingText: sceneData.narrationScript,
        generatedText: sceneData.narrationScript,
        keyPoints: sceneData.keyBullets,
        examRelevance: sceneData.examRelevance,
        clinicalCorrelation: sceneData.clinicalPearls?.[0] || null,
        recap: sceneData.type === 'RECAP_SYNTHESIS' ? sceneData.narrationScript : null,
        mediaReferenceIds: sceneData.mediaReferenceIds || availableMediaIds,
        createdAt: new Date().toISOString(),
        completionState: 'COMPLETED',
        isCompleted: true,
        scene: sceneData,
      };

      // 8. Persist Segment atomically
      const persistRes = await TutorSessionManager.persistSegment(lessonId, userId, newSegment, supabase);
      if (!persistRes.success || !persistRes.session) {
        await GenerationJobManager.markFailed(jobId, persistRes.error || 'Persistence failed', supabase);
        return {
          success: false,
          error: persistRes.error || 'Failed to save generated Tutor video scene.',
          errorCode: 'PERSISTENCE_FAILED',
          retryable: true,
          session,
        };
      }

      // 9. Cost Audit Recording ($0 User Credits)
      const costUsd = await ContentCostAuditor.calculateProviderCost(
        provider,
        model,
        inputTokens,
        cachedTokens,
        outputTokens,
        supabase
      );

      await ContentCostAuditor.recordGlobalGenerationCost(
        {
          jobId,
          userId: null,
          taskType: 'tutor_video_scene',
          provider,
          model,
          inputTokens,
          cachedTokens,
          outputTokens,
          actualCostUsd: costUsd,
        },
        supabase
      );

      await GenerationJobManager.markCompleted(jobId, { segment: newSegment, scene: sceneData }, supabase);

      const isCompleted = persistRes.session.lessonState === 'COMPLETED';

      return {
        success: true,
        segment: newSegment,
        scene: sceneData,
        session: persistRes.session,
        lesson: persistRes.session,
        currentSequence: nextSequence,
        isCompleted,
        nextAvailableState: persistRes.session.lessonState,
        costAudit: { creditsDeducted: 0, actualCostUsd: costUsd },
      };
    } catch (err: any) {
      await GenerationJobManager.markFailed(jobId, err.message, supabase);
      return {
        success: false,
        error: `AI Tutor Video Scene Generation failed: ${err.message}`,
        errorCode: 'GENERATION_FAILED',
        retryable: true,
        session,
      };
    }
  }

  /**
   * Calls AI Model or Grounded Fallback Engine to produce structured video scene
   */
  private static async callAIVideoSceneEngine(params: {
    examName: string;
    subjectName: string;
    topicName: string;
    phase: string;
    sequence: number;
    notesGrounding: any;
    previousSegments: TutorSegment[];
    availableMediaIds: string[];
    model: string;
    subtopicNames?: string[];
  }): Promise<{
    sceneData: TutorScene;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
  }> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const groundingText = params.notesGrounding
          ? typeof params.notesGrounding === 'string'
            ? params.notesGrounding
            : JSON.stringify(params.notesGrounding).slice(0, 3500)
          : 'Canonical examination notes and high-yield topic reference.';

        const prompt = `
You are an expert AI Master Teacher creating an interactive visual blackboard video scene for:
Exam: ${params.examName}
Subject: ${params.subjectName}
Topic: ${params.topicName}
Sequence: ${params.sequence} of 7 (Phase: "${params.phase}")

GROUNDING NOTES:
${groundingText}

REQUIREMENTS:
1. Write an engaging, spoken-word teacher narration script (120-180 words) that explains concepts clearly as if drawing on a blackboard.
2. Structure high-yield visual elements (flowchart steps, differential comparison, or interactive checkpoint MCQ).
3. Return ONLY strict JSON without code blocks:
{
  "id": "scene_${params.sequence}",
  "sequence": ${params.sequence},
  "type": "${params.sequence === 1 ? 'INTRO_ROADMAP' : params.sequence === 2 ? 'FOUNDATIONAL_ANATOMY' : params.sequence === 3 ? 'CORE_MECHANISM_FLOWCHART' : params.sequence === 4 ? 'CLINICAL_VIGNETTE_COMPARISON' : params.sequence === 5 ? 'INTERACTIVE_CHECKPOINT' : params.sequence === 6 ? 'BOARD_TRAPS_DIFFERENTIAL' : 'RECAP_SYNTHESIS'}",
  "phase": "${params.phase}",
  "title": "${params.sequence}. ${params.phase} — ${params.topicName}",
  "startSeconds": ${(params.sequence - 1) * 55},
  "durationSeconds": 55,
  "narrationScript": "Spoken teaching script for the visual video scene...",
  "timedCues": [
    { "timeOffset": 3, "text": "Key concept introduction", "highlightKeyword": "${params.topicName}", "boardAction": "draw_node" },
    { "timeOffset": 20, "text": "Step 2 mechanism connection", "highlightKeyword": "mechanism", "boardAction": "draw_arrow" },
    { "timeOffset": 40, "text": "High-yield board pearl highlight", "highlightKeyword": "pearl", "boardAction": "highlight_pearl" }
  ],
  "accentColor": "${params.sequence === 1 ? 'indigo' : params.sequence === 2 ? 'cyan' : params.sequence === 3 ? 'indigo' : params.sequence === 4 ? 'amber' : params.sequence === 5 ? 'purple' : params.sequence === 6 ? 'rose' : 'emerald'}",
  "keyBullets": ["High-yield bullet 1", "High-yield bullet 2", "High-yield bullet 3"],
  "examRelevance": "Specific testable pattern on ${params.examName}",
  "clinicalPearls": ["Crucial clinical pearl for ${params.topicName}"],
  "flowchart": {
    "title": "${params.topicName} Pathway",
    "nodes": [
      { "id": "node_1", "label": "Initial Insult / Trigger", "sublabel": "Etiology", "color": "indigo" },
      { "id": "node_2", "label": "Pathological Cascade", "sublabel": "Mechanism", "color": "amber" },
      { "id": "node_3", "label": "Clinical Manifestation", "sublabel": "Sign/Symptom", "color": "rose" },
      { "id": "node_4", "label": "Gold-Standard Diagnostic", "sublabel": "Target Confirmation", "color": "emerald" }
    ],
    "arrows": [
      { "from": "node_1", "to": "node_2", "label": "Activates" },
      { "from": "node_2", "to": "node_3", "label": "Causes" },
      { "from": "node_3", "to": "node_4", "label": "Detected by" }
    ]
  },
  "checkpoint": {
    "id": "cp_${params.sequence}",
    "question": "High yield checkpoint question testing ${params.topicName}?",
    "options": ["Correct diagnostic option", "Common distractor A", "Common distractor B", "Common distractor C"],
    "correctIndex": 0,
    "explanation": "Clear explanation why option 1 is correct and others are wrong.",
    "pearl": "High yield takeaway rule."
  }
}
`;

        const response = await ai.models.generateContent({
          model: params.model,
          contents: prompt,
        });

        const rawText = (response.text || '').trim();
        const jsonText = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const usage = (response as any).usageMetadata || {};

        if (jsonText.startsWith('{') && jsonText.endsWith('}')) {
          const parsed = JSON.parse(jsonText);
          const scene: TutorScene = {
            id: parsed.id || `scene_${params.sequence}`,
            sequence: params.sequence,
            type: parsed.type || 'CORE_MECHANISM_FLOWCHART',
            phase: parsed.phase || params.phase,
            title: parsed.title || `${params.sequence}. ${params.phase}`,
            startSeconds: parsed.startSeconds || (params.sequence - 1) * 55,
            durationSeconds: parsed.durationSeconds || 55,
            narrationScript: parsed.narrationScript || parsed.teachingText || `Instruction on ${params.topicName}`,
            timedCues: Array.isArray(parsed.timedCues) ? parsed.timedCues : [],
            accentColor: parsed.accentColor || 'indigo',
            keyBullets: Array.isArray(parsed.keyBullets) ? parsed.keyBullets : [params.topicName],
            examRelevance: parsed.examRelevance || `Core concept tested in ${params.examName}`,
            clinicalPearls: Array.isArray(parsed.clinicalPearls) ? parsed.clinicalPearls : undefined,
            flowchart: parsed.flowchart || undefined,
            comparison: parsed.comparison || undefined,
            checkpoint: parsed.checkpoint || undefined,
            anatomicalFeatures: parsed.anatomicalFeatures || undefined,
            boardSvgDiagramType: 'generic_flowchart',
            mediaReferenceIds: params.availableMediaIds,
          };

          return {
            sceneData: scene,
            inputTokens: usage.promptTokenCount || 600,
            outputTokens: usage.candidatesTokenCount || 900,
            cachedTokens: usage.cachedContentTokenCount || 0,
          };
        }
      } catch (err) {
        console.warn('[AI Tutor Generator] Gemini scene generation fallback:', err);
      }
    }

    // Fallback to initial video scene generator
    const defaultScenes = TutorSessionManager.generateInitialVideoScenes(
      params.topicName,
      params.subjectName,
      params.examName,
      params.subtopicNames
    );

    const matchedScene = defaultScenes.find((s) => s.sequence === params.sequence) || defaultScenes[0];

    return {
      sceneData: matchedScene,
      inputTokens: 300,
      outputTokens: 500,
      cachedTokens: 0,
    };
  }
}

export const AITutorGenerator = CanonicalTutorGenerator;
