/**
 * NEOMCQ — GLOBAL CONTENT GENERATION ORCHESTRATOR
 *
 * Implements the Mandatory 5-Step Deduplication Pipeline:
 * Step 1: Resolve & Verify Canonical Hierarchy (Exam -> Subject -> Topic)
 * Step 2: Check Active Content Version (`content_versions`)
 * Step 3: Check Cache (Serve fresh content immediately with $0 cost, 0 provider calls)
 * Step 4: Check Active Generation Job (Attach to existing in-flight job if running)
 * Step 5: Create Exactly One New Generation Job & Coordinate Execution
 */

import { getSupabaseAdmin } from '../../supabase.ts';
import type {
  OrchestratorResolutionResult,
  DeduplicationPipelineStep,
  ContentPackageType,
  MainMCQGenerationResult,
  QuizMCQGenerationResult,
  QuizSlotType,
  NotesGenerationResult,
  NotesGenerationRequest,
  FlashcardsGenerationRequest,
  FlashcardsGenerationResult,
  RevisionSheetGenerationRequest,
  RevisionSheetGenerationResult,
  TutorLessonRequest,
  TutorSegmentRequest,
  TutorLessonResult,
} from './types.ts';
import { verifyCanonicalHierarchy, buildCanonicalPackageKey } from './canonical-identity.ts';
import { ContentCacheManager } from './content-cache-manager.ts';
import { GenerationJobManager } from './job-manager.ts';
import { MainMCQGenerator } from './main-mcq-generator.ts';
import { QuizMCQGenerator } from './quiz-mcq-generator.ts';
import { CanonicalNotesGenerator } from './notes-generator.ts';
import { CanonicalFlashcardsGenerator } from './flashcards-generator.ts';
import { CanonicalRevisionSheetGenerator } from './revision-sheet-generator.ts';
import { TutorSessionManager } from './tutor-session-manager.ts';
import { CanonicalTutorGenerator } from './tutor-generator.ts';

export interface OrchestrationOptions {
  examId: string;
  subjectId: string;
  topicId: string;
  packageType?: ContentPackageType;
  forceRefresh?: boolean;
  targetVersion?: number;
  userId?: string | null;
  supabaseClient?: any;
}

export class ContentGenerationOrchestrator {
  /**
   * Master Orchestration Entrypoint
   */
  public static async resolveOrchestratedContent(
    options: OrchestrationOptions
  ): Promise<OrchestratorResolutionResult> {
    const supabase = options.supabaseClient || getSupabaseAdmin();
    const { examId, subjectId, topicId, forceRefresh = false } = options;
    const pipelineSteps: DeduplicationPipelineStep[] = [];

    // =========================================================================
    // STEP 1: Resolve and Verify Canonical Hierarchy
    // =========================================================================
    const hierarchy = await verifyCanonicalHierarchy(examId, subjectId, topicId, supabase);
    if (!hierarchy.valid) {
      pipelineSteps.push({
        step: 1,
        name: 'Canonical Hierarchy Verification',
        description: 'Verifies Exam -> Subject -> Topic database relationship',
        outcome: 'MISS',
        details: { error: hierarchy.error },
      });

      return {
        success: false,
        servedFromCache: false,
        packageVersion: 0,
        canonicalKey: '',
        package: null,
        reason: 'ERROR',
        pipelineSteps,
        error: hierarchy.error || 'Invalid canonical hierarchy.',
        errorCode: 'HIERARCHY_INVALID',
      };
    }

    pipelineSteps.push({
      step: 1,
      name: 'Canonical Hierarchy Verification',
      description: `Verified ${hierarchy.examName} > ${hierarchy.subjectName} > ${hierarchy.topicName}`,
      outcome: 'HIT',
      details: { examId, subjectId, topicId },
    });

    // =========================================================================
    // STEP 2 & 3: Check Active Content Version and Cache
    // =========================================================================
    const cacheResult = await ContentCacheManager.getLatestVersion(examId, subjectId, topicId, supabase);
    const activeVersionNum = cacheResult.versionNumber || 1;
    const canonicalKey = buildCanonicalPackageKey(examId, subjectId, topicId, activeVersionNum);

    if (cacheResult.hasContent && cacheResult.pkg) {
      if (cacheResult.isFresh && !forceRefresh) {
        pipelineSteps.push({
          step: 2,
          name: 'Active Version Inspection',
          description: `Found active version v${activeVersionNum}`,
          outcome: 'HIT',
        });
        pipelineSteps.push({
          step: 3,
          name: 'Cache Verification (< 30 Days Fresh)',
          description: 'Content is fresh; serving directly from cache with $0 provider cost',
          outcome: 'HIT',
          details: { version: activeVersionNum, created_at: cacheResult.createdAt },
        });

        return {
          success: true,
          servedFromCache: true,
          isStale: false,
          packageVersion: activeVersionNum,
          canonicalKey,
          package: cacheResult.pkg,
          reason: 'CACHE_VALID',
          pipelineSteps,
        };
      } else if (!forceRefresh) {
        // Content exists but is stale: serve existing content first (stale-while-revalidate pattern)
        pipelineSteps.push({
          step: 3,
          name: 'Cache Verification (Stale Content > 30 Days)',
          description: 'Serving existing cached version while scheduling background refresh',
          outcome: 'HIT',
          details: { version: activeVersionNum, isStale: true },
        });

        // Trigger background job without blocking user response
        this.triggerAsyncRefresh({
          examId,
          subjectId,
          topicId,
          nextVersion: activeVersionNum + 1,
          supabase,
        }).catch((err) => console.warn('[Orchestrator] Background refresh notice:', err));

        return {
          success: true,
          servedFromCache: true,
          isStale: true,
          packageVersion: activeVersionNum,
          canonicalKey,
          package: cacheResult.pkg,
          reason: 'CACHE_STALE_ASYNC_REFRESH',
          pipelineSteps,
        };
      }
    } else {
      pipelineSteps.push({
        step: 2,
        name: 'Active Version Inspection',
        description: 'No existing content version found for this topic',
        outcome: 'MISS',
      });
      pipelineSteps.push({
        step: 3,
        name: 'Cache Verification',
        description: 'Cache miss. Proceeding to in-flight job inspection',
        outcome: 'MISS',
      });
    }

    // =========================================================================
    // STEP 4: Check Active Generation Job (Concurrency & Idempotency)
    // =========================================================================
    const nextVersionNum = options.targetVersion || (cacheResult.hasContent ? activeVersionNum + 1 : 1);
    const jobCreation = await GenerationJobManager.createOrAttachJob(
      {
        examId,
        subjectId,
        topicId,
        packageType: options.packageType || 'full_pack',
        version: nextVersionNum,
        task: `generate_canonical_package_${options.packageType || 'full_pack'}`,
      },
      supabase
    );

    if (!jobCreation.isNew) {
      // Attached to an existing in-flight job!
      pipelineSteps.push({
        step: 4,
        name: 'Active Generation Job Inspection',
        description: `Discovered existing in-flight job (${jobCreation.job.id}) in state ${jobCreation.job.status}`,
        outcome: 'HIT',
        details: { jobId: jobCreation.job.id, status: jobCreation.job.status },
      });

      return {
        success: true,
        servedFromCache: false,
        activeJobId: jobCreation.job.id,
        jobState: jobCreation.job.status,
        packageVersion: nextVersionNum,
        canonicalKey: buildCanonicalPackageKey(examId, subjectId, topicId, nextVersionNum),
        package: null,
        reason: 'ATTACHED_IN_FLIGHT_JOB',
        pipelineSteps,
      };
    }

    // =========================================================================
    // STEP 5: New Job Created & Registered for Generation
    // =========================================================================
    pipelineSteps.push({
      step: 4,
      name: 'Active Generation Job Inspection',
      description: 'No active job in flight. Proceeding to job creation',
      outcome: 'MISS',
    });

    pipelineSteps.push({
      step: 5,
      name: 'Create Canonical Generation Job',
      description: `Created single canonical generation job (${jobCreation.job.id}) in state QUEUED`,
      outcome: 'EXECUTED',
      details: {
        jobId: jobCreation.job.id,
        version: nextVersionNum,
        idempotencyKey: jobCreation.job.idempotencyKey,
      },
    });

    return {
      success: true,
      servedFromCache: false,
      activeJobId: jobCreation.job.id,
      jobState: 'QUEUED',
      packageVersion: nextVersionNum,
      canonicalKey: buildCanonicalPackageKey(examId, subjectId, topicId, nextVersionNum),
      package: null,
      reason: 'NEW_JOB_CREATED',
      pipelineSteps,
    };
  }

  /**
   * Helper to schedule an asynchronous refresh job for stale content
   */
  private static async triggerAsyncRefresh(params: {
    examId: string;
    subjectId: string;
    topicId: string;
    nextVersion: number;
    supabase: any;
  }) {
    await GenerationJobManager.createOrAttachJob(
      {
        examId: params.examId,
        subjectId: params.subjectId,
        topicId: params.topicId,
        packageType: 'full_pack',
        version: params.nextVersion,
        task: 'refresh_stale_content_package',
        priority: 8, // slightly lower priority for background refresh
      },
      params.supabase
    );
  }

  /**
   * Generates or retrieves exactly 40 Canonical MAIN MCQs
   */
  public static async generateMainMCQs(options: {
    examId: string;
    subjectId: string;
    topicId: string;
    version?: number;
    forceRefresh?: boolean;
    userId?: string | null;
    supabaseClient?: any;
  }): Promise<MainMCQGenerationResult> {
    return MainMCQGenerator.generateCanonicalMainMCQs(options);
  }

  /**
   * Generates or retrieves exactly 20 Canonical QUIZ MCQs (QUIZ_1 or QUIZ_2)
   */
  public static async generateQuizMCQs(options: {
    examId: string;
    subjectId: string;
    topicId: string;
    quizSlot: QuizSlotType;
    version?: number;
    forceRefresh?: boolean;
    userId?: string | null;
    supabaseClient?: any;
  }): Promise<QuizMCQGenerationResult> {
    return QuizMCQGenerator.generateCanonicalQuizMCQs(options);
  }

  /**
   * Generates or retrieves Canonical Notes & Educational Media (Phase 4D)
   */
  public static async generateNotes(
    options: NotesGenerationRequest
  ): Promise<NotesGenerationResult> {
    return CanonicalNotesGenerator.generateCanonicalNotes(options);
  }

  /**
   * Generates or retrieves Canonical Flashcards (Phase 4E)
   */
  public static async generateFlashcards(
    options: FlashcardsGenerationRequest
  ): Promise<FlashcardsGenerationResult> {
    return CanonicalFlashcardsGenerator.generateCanonicalFlashcards(options);
  }

  /**
   * Generates or retrieves Canonical Revision Sheet (Phase 4E)
   */
  public static async generateRevisionSheet(
    options: RevisionSheetGenerationRequest
  ): Promise<RevisionSheetGenerationResult> {
    return CanonicalRevisionSheetGenerator.generateCanonicalRevisionSheet(options);
  }

  /**
   * Creates or resumes AI Tutor Lesson (Phase 5A)
   */
  public static async createOrResumeTutorLesson(
    options: any
  ): Promise<any> {
    return TutorSessionManager.createOrResumeLesson(options);
  }

  /**
   * Generates or retrieves next AI Tutor Segment (Phase 5A)
   */
  public static async generateTutorSegment(
    options: any
  ): Promise<any> {
    return CanonicalTutorGenerator.generateNextSegment(options);
  }
}
