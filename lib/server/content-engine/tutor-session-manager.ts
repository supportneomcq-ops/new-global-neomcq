/**
 * NEOMCQ — AI TUTOR SESSION MANAGER
 * Phase 5A: Tutor Lesson Lifecycle, Grounding, Persistence & Ownership Verification
 */

import { getSupabaseAdmin } from '../../supabase.ts';
import { verifyCanonicalHierarchy } from './canonical-identity.ts';
import { ContentCacheManager } from './content-cache-manager.ts';
import type { TutorLessonSession, TutorSegment, TutorLessonState } from './tutor-types.ts';
import { CANONICAL_TUTOR_PHASES } from './tutor-types.ts';

export interface CreateOrResumeLessonOptions {
  examId: string;
  subjectId: string;
  topicId: string;
  userId: string;
  supabaseClient?: any;
}

export class TutorSessionManager {
  /**
   * Creates a new user-specific Tutor lesson or resumes an existing persistent lesson
   */
  public static async createOrResumeLesson(
    options: CreateOrResumeLessonOptions
  ): Promise<{
    success: boolean;
    session?: TutorLessonSession;
    isNew?: boolean;
    error?: string;
    errorCode?: string;
  }> {
    const supabase = options.supabaseClient || getSupabaseAdmin();
    const { examId, subjectId, topicId, userId } = options;

    if (!userId) {
      return {
        success: false,
        error: 'User authentication required to create or resume a Tutor lesson.',
        errorCode: 'UNAUTHORIZED',
      };
    }

    // 1. Verify Canonical Hierarchy
    const hierarchy = await verifyCanonicalHierarchy(examId, subjectId, topicId, supabase);
    if (!hierarchy.valid) {
      return {
        success: false,
        error: hierarchy.error || 'Invalid exam > subject > topic hierarchy.',
        errorCode: 'HIERARCHY_INVALID',
      };
    }

    // 2. Resolve Active Canonical Content Version
    const cacheRes = await ContentCacheManager.getLatestVersion(examId, subjectId, topicId, supabase);
    const activeVersion = cacheRes.versionNumber || 1;

    // 3. Query existing lesson for this (userId, topicId)
    try {
      const { data: existing, error: findErr } = await supabase
        .from('ai_tutor_lessons')
        .select('*')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!findErr && existing) {
        const session = this.mapDbRecordToSession(existing, cacheRes.pkg?.notesSlot || null);
        return {
          success: true,
          session,
          lesson: session,
          isNew: false,
          servedFromCache: true,
        };
      }

      // 4. Create new persistent lesson record
      const title = `${hierarchy.topicName || 'Canonical Topic'} — Interactive AI Tutor`;
      const newLesson = {
        title,
        user_id: userId,
        exam_id: examId,
        subject_id: subjectId,
        topic_id: topicId,
        content_version: activeVersion,
        lesson_state: 'NOT_STARTED',
        status: 'draft',
        current_phase: CANONICAL_TUTOR_PHASES[0],
        current_sequence: 0,
        segments: [],
        content: { canonical_grounding_version: activeVersion },
        version: activeVersion,
      };

      const { data: created, error: createErr } = await supabase
        .from('ai_tutor_lessons')
        .insert(newLesson)
        .select('*')
        .single();

      if (createErr || !created) {
        return {
          success: false,
          error: `Failed to create Tutor lesson: ${createErr?.message || 'Database insert failed'}`,
          errorCode: 'DB_ERROR',
        };
      }

      const session = this.mapDbRecordToSession(created, cacheRes.pkg?.notesSlot || null);
      return {
        success: true,
        session,
        lesson: session,
        isNew: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error in TutorSessionManager: ${err.message}`,
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Retrieves lesson state with strict ownership verification
   */
  public static async getLessonState(
    lessonId: string,
    userId: string,
    supabaseClient?: any
  ): Promise<{
    success: boolean;
    session?: TutorLessonSession;
    error?: string;
    errorCode?: string;
  }> {
    const supabase = supabaseClient || getSupabaseAdmin();

    try {
      const { data: lesson, error } = await supabase
        .from('ai_tutor_lessons')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle();

      if (error || !lesson) {
        return {
          success: false,
          error: 'Tutor lesson session not found.',
          errorCode: 'NOT_FOUND',
        };
      }

      // Security check: verify authenticated user ownership
      if (lesson.user_id && lesson.user_id !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You do not own this Tutor lesson session.',
          errorCode: 'UNAUTHORIZED',
        };
      }

      // Load grounding package
      const cacheRes = await ContentCacheManager.getLatestVersion(
        lesson.exam_id,
        lesson.subject_id,
        lesson.topic_id,
        supabase
      );

      const session = this.mapDbRecordToSession(lesson, cacheRes.pkg?.notesSlot || null);
      return {
        success: true,
        session,
        lesson: session,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Persists a completed Tutor segment into the lesson record
   */
  public static async persistSegment(
    lessonId: string,
    userId: string,
    segment: TutorSegment,
    supabaseClient?: any
  ): Promise<{
    success: boolean;
    session?: TutorLessonSession;
    error?: string;
    errorCode?: string;
  }> {
    const supabase = supabaseClient || getSupabaseAdmin();

    const stateRes = await this.getLessonState(lessonId, userId, supabase);
    if (!stateRes.success || !stateRes.session) {
      return {
        success: false,
        error: stateRes.error || 'Session lookup failed.',
        errorCode: stateRes.errorCode || 'NOT_FOUND',
      };
    }

    const session = stateRes.session;
    const existingSegments: TutorSegment[] = session.segments || [];

    // Deduplicate / update segment by sequence number
    const updatedSegments = [...existingSegments];
    const existingIdx = updatedSegments.findIndex((s) => s.sequence === segment.sequence);

    if (existingIdx >= 0) {
      updatedSegments[existingIdx] = segment;
    } else {
      updatedSegments.push(segment);
    }

    // Sort segments by sequence number
    updatedSegments.sort((a, b) => a.sequence - b.sequence);

    const isLastPhase =
      segment.phase === CANONICAL_TUTOR_PHASES[CANONICAL_TUTOR_PHASES.length - 1] ||
      segment.phase === 'RECAP' ||
      segment.phase === 'Completion' ||
      segment.sequence >= CANONICAL_TUTOR_PHASES.length;
    const nextState: TutorLessonState = isLastPhase ? 'COMPLETED' : 'IN_PROGRESS';

    try {
      const { data: updated, error: updateErr } = await supabase
        .from('ai_tutor_lessons')
        .update({
          segments: updatedSegments,
          current_phase: segment.phase,
          current_sequence: Math.max(session.currentSequence, segment.sequence),
          lesson_state: nextState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lessonId)
        .select('*')
        .single();

      if (updateErr || !updated) {
        return {
          success: false,
          error: `Failed to persist Tutor segment: ${updateErr?.message}`,
          errorCode: 'DB_ERROR',
        };
      }

      const updatedSession = this.mapDbRecordToSession(updated, session.canonicalNotesGrounding);
      return {
        success: true,
        session: updatedSession,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Convenience helper to pause or resume a lesson
   */
  public static async pauseOrResumeLesson(
    lessonId: string,
    userId: string,
    action: 'PAUSE' | 'RESUME',
    supabaseClient?: any
  ): Promise<{
    success: boolean;
    session?: TutorLessonSession;
    error?: string;
    errorCode?: string;
  }> {
    const newState: TutorLessonState = action === 'PAUSE' ? 'PAUSED' : 'IN_PROGRESS';
    return this.updateLessonState(lessonId, userId, newState, supabaseClient);
  }

  /**
   * Updates lesson state (PAUSED, IN_PROGRESS, COMPLETED, FAILED)
   */
  public static async updateLessonState(
    lessonId: string,
    userId: string,
    newState: TutorLessonState,
    supabaseClient?: any
  ): Promise<{
    success: boolean;
    session?: TutorLessonSession;
    error?: string;
    errorCode?: string;
  }> {
    const supabase = supabaseClient || getSupabaseAdmin();

    const stateRes = await this.getLessonState(lessonId, userId, supabase);
    if (!stateRes.success || !stateRes.session) {
      return {
        success: false,
        error: stateRes.error || 'Session lookup failed.',
        errorCode: stateRes.errorCode || 'NOT_FOUND',
      };
    }

    try {
      const { data: updated, error } = await supabase
        .from('ai_tutor_lessons')
        .update({
          lesson_state: newState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lessonId)
        .select('*')
        .single();

      if (error || !updated) {
        return {
          success: false,
          error: `Failed to update lesson state: ${error?.message}`,
          errorCode: 'DB_ERROR',
        };
      }

      const updatedSession = this.mapDbRecordToSession(updated, stateRes.session.canonicalNotesGrounding);
      return {
        success: true,
        session: updatedSession,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  private static mapDbRecordToSession(rec: any, notesGrounding?: any): TutorLessonSession {
    return {
      id: rec.id,
      title: rec.title || 'AI Tutor Lesson',
      userId: rec.user_id,
      examId: rec.exam_id,
      subjectId: rec.subject_id,
      topicId: rec.topic_id,
      contentVersion: rec.content_version || rec.version || 1,
      lessonState: (rec.lesson_state as TutorLessonState) || 'NOT_STARTED',
      currentPhase: rec.current_phase || CANONICAL_TUTOR_PHASES[0],
      currentSequence: rec.current_sequence || 0,
      segments: Array.isArray(rec.segments) ? rec.segments : [],
      createdAt: rec.created_at,
      updatedAt: rec.updated_at,
      canonicalNotesGrounding: notesGrounding,
    };
  }
}
