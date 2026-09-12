/**
 * NEOMCQ — FEATURE 7: AI TUTOR DATABASE SERVICE
 * Batch 7.1: Canonical Storage, Concurrency Locking & Progress Management
 */

import { getSupabaseAdmin } from '../../supabase';
import { GenerationJobManager } from './job-manager';
import type {
  TutorLesson,
  TutorScene,
  TutorAsset,
  TutorVoiceMetadata,
  TutorCanonicalFAQ,
  UserTutorProgress,
  TutorGenerationJobParams,
} from '../../types/ai-tutor-architecture';
import crypto from 'crypto';

export class TutorDbService {
  /**
   * Generates a deterministic SHA256 question hash for canonical FAQ deduplication
   */
  public static hashQuestion(question: string): string {
    const normalized = question
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Fetches an existing canonical tutor lesson for exact scope: Exam -> Subject -> Topic -> Subtopic
   */
  public static async getCanonicalTutorLesson(
    examId: string,
    subjectId: string,
    topicId: string,
    subtopicId?: string | null,
    contentVersion: number = 1
  ): Promise<{ lesson: TutorLesson; scenes: TutorScene[]; assets: TutorAsset[]; voiceMetadata: TutorVoiceMetadata[] } | null> {
    const supabase = getSupabaseAdmin();
    const subtopicKey = subtopicId || null;

    try {
      // 1. Fetch lesson
      let query = supabase
        .from('tutor_lessons')
        .select('*')
        .eq('exam_id', examId)
        .eq('subject_id', subjectId)
        .eq('topic_id', topicId)
        .eq('content_version', contentVersion);

      if (subtopicKey) {
        query = query.eq('subtopic_id', subtopicKey);
      } else {
        query = query.is('subtopic_id', null);
      }

      const { data: dbLesson, error: lessonError } = await query.maybeSingle();

      if (lessonError || !dbLesson) return null;

      const lessonId = dbLesson.id;

      // Update last_accessed_at asynchronously
      supabase
        .from('tutor_lessons')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', lessonId)
        .then(() => {});

      // 2. Fetch scenes
      const { data: dbScenes } = await supabase
        .from('tutor_scenes')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('sequence_number', { ascending: true });

      // 3. Fetch assets
      const { data: dbAssets } = await supabase
        .from('tutor_assets')
        .select('*')
        .eq('lesson_id', lessonId);

      // 4. Fetch voice metadata
      const { data: dbVoice } = await supabase
        .from('tutor_voice_metadata')
        .select('*')
        .eq('lesson_id', lessonId);

      const lesson: TutorLesson = {
        id: dbLesson.id,
        examId: dbLesson.exam_id,
        subjectId: dbLesson.subject_id,
        topicId: dbLesson.topic_id,
        subtopicId: dbLesson.subtopic_id,
        contentVersion: dbLesson.content_version,
        title: dbLesson.title,
        subtitle: dbLesson.subtitle || undefined,
        durationSeconds: dbLesson.duration_seconds || 0,
        totalScenes: dbLesson.total_scenes || 0,
        difficultyLevel: dbLesson.difficulty_level || 'Intermediate',
        thumbnailUrl: dbLesson.thumbnail_url || undefined,
        lessonState: dbLesson.lesson_state || 'READY',
        canonicalData: dbLesson.canonical_data || { learningObjectives: [], revisionQuestions: [], faqReferences: [] },
        createdAt: dbLesson.created_at,
        updatedAt: dbLesson.updated_at,
        lastAccessedAt: dbLesson.last_accessed_at,
      };

      const scenes: TutorScene[] = (dbScenes || []).map((s: any) => ({
        id: s.id,
        lessonId: s.lesson_id,
        sequenceNumber: s.sequence_number,
        title: s.title,
        phase: s.phase,
        startSeconds: Number(s.start_seconds || 0),
        durationSeconds: Number(s.duration_seconds || 0),
        narrationScript: s.narration_script,
        timedCues: s.timed_cues || [],
        boardActions: s.board_actions || [],
        accentColor: s.accent_color || 'indigo',
        keyBullets: s.key_bullets || [],
        examRelevance: s.exam_relevance || 'High Yield',
        clinicalPearls: s.clinical_pearls || [],
        mediaAssetIds: s.media_asset_ids || [],
      }));

      const assets: TutorAsset[] = (dbAssets || []).map((a: any) => ({
        id: a.id,
        lessonId: a.lesson_id,
        sceneId: a.scene_id || undefined,
        assetType: a.asset_type,
        sourceUrl: a.source_url,
        altText: a.alt_text,
        caption: a.caption || undefined,
        positionMetadata: a.position_metadata || { x: 0, y: 0, margin: 16 },
        isSafeRendering: true,
      }));

      const voiceMetadata: TutorVoiceMetadata[] = (dbVoice || []).map((v: any) => ({
        id: v.id,
        lessonId: v.lesson_id,
        sceneId: v.scene_id,
        voiceId: v.voice_id || 'en-US-Neural2-F',
        languageCode: v.language_code || 'en-US',
        speakingRate: Number(v.speaking_rate || 1.0),
        audioUrl: v.audio_url || undefined,
        durationMs: v.duration_ms || 0,
        wordLevelTimestamps: v.word_level_timestamps || [],
      }));

      return { lesson, scenes, assets, voiceMetadata };
    } catch (err) {
      console.error('TutorDbService.getCanonicalTutorLesson error:', err);
      return null;
    }
  }

  /**
   * Concurrency locking: Creates or attaches to a single global generation job for this tutor lesson scope
   */
  public static async createOrAttachTutorJob(params: TutorGenerationJobParams) {
    const task = `generate_ai_tutor_lesson_${params.examId}_${params.subjectId}_${params.topicId}`;
    return GenerationJobManager.createOrAttachJob(
      {
        examId: params.examId,
        subjectId: params.subjectId,
        topicId: params.topicId,
        packageType: 'full_pack',
        version: params.version || 1,
        priority: 8,
        task,
      }
    );
  }

  /**
   * Saves a newly generated canonical AI Tutor lesson permanently
   */
  public static async saveCanonicalTutorLesson(params: {
    examId: string;
    subjectId: string;
    topicId: string;
    subtopicId?: string | null;
    contentVersion?: number;
    title: string;
    subtitle?: string;
    durationSeconds: number;
    difficultyLevel?: string;
    thumbnailUrl?: string;
    canonicalData: any;
    scenes: Array<Omit<TutorScene, 'id' | 'lessonId'>>;
    assets?: Array<Omit<TutorAsset, 'id' | 'lessonId'>>;
  }): Promise<{ success: boolean; lessonId?: string; error?: string }> {
    const supabase = getSupabaseAdmin();
    const contentVersion = params.contentVersion || 1;

    try {
      // 1. Check if existing lesson exists
      let query = supabase
        .from('tutor_lessons')
        .select('id')
        .eq('exam_id', params.examId)
        .eq('subject_id', params.subjectId)
        .eq('topic_id', params.topicId)
        .eq('content_version', contentVersion);

      if (params.subtopicId) {
        query = query.eq('subtopic_id', params.subtopicId);
      } else {
        query = query.is('subtopic_id', null);
      }

      const { data: existingLesson } = await query.maybeSingle();

      let lessonId: string;

      const lessonPayload = {
        exam_id: params.examId,
        subject_id: params.subjectId,
        topic_id: params.topicId,
        subtopic_id: params.subtopicId || null,
        content_version: contentVersion,
        title: params.title,
        subtitle: params.subtitle || null,
        duration_seconds: params.durationSeconds,
        total_scenes: params.scenes.length,
        difficulty_level: params.difficultyLevel || 'Intermediate',
        thumbnail_url: params.thumbnailUrl || null,
        lesson_state: 'READY',
        canonical_data: params.canonicalData || {},
        updated_at: new Date().toISOString(),
      };

      if (existingLesson?.id) {
        lessonId = existingLesson.id;
        const { error: updateError } = await supabase
          .from('tutor_lessons')
          .update(lessonPayload)
          .eq('id', lessonId);

        if (updateError) {
          return { success: false, error: updateError.message };
        }
      } else {
        lessonId = crypto.randomUUID();
        const { error: insertError } = await supabase
          .from('tutor_lessons')
          .insert({
            id: lessonId,
            created_at: new Date().toISOString(),
            ...lessonPayload,
          });

        if (insertError) {
          return { success: false, error: insertError.message };
        }
      }

      // Delete existing scenes, assets, and voice metadata for clean replacement if re-generating
      await supabase.from('tutor_scenes').delete().eq('lesson_id', lessonId);
      await supabase.from('tutor_assets').delete().eq('lesson_id', lessonId);
      await supabase.from('tutor_voice_metadata').delete().eq('lesson_id', lessonId);

      // 2. Insert scenes
      const sceneRows = params.scenes.map((scene) => ({
        id: crypto.randomUUID(),
        lesson_id: lessonId,
        sequence_number: scene.sequenceNumber,
        title: scene.title,
        phase: scene.phase,
        start_seconds: scene.startSeconds,
        duration_seconds: scene.durationSeconds,
        narration_script: scene.narrationScript,
        timed_cues: scene.timedCues || [],
        board_actions: scene.boardActions || [],
        accent_color: scene.accentColor || 'indigo',
        key_bullets: scene.keyBullets || [],
        exam_relevance: scene.examRelevance || 'High Yield',
        clinical_pearls: scene.clinicalPearls || [],
        media_asset_ids: scene.mediaAssetIds || [],
        created_at: new Date().toISOString(),
      }));

      const { error: sceneError } = await supabase.from('tutor_scenes').insert(sceneRows);
      if (sceneError) {
        console.error('Error inserting tutor scenes:', sceneError);
      }

      // 3. Insert assets
      if (params.assets && params.assets.length > 0) {
        const assetRows = params.assets.map((asset, idx) => ({
          id: crypto.randomUUID(),
          lesson_id: lessonId,
          scene_id: (sceneRows[idx] ? sceneRows[idx].id : sceneRows[0]?.id) || null,
          asset_type: asset.assetType,
          source_url: asset.sourceUrl,
          alt_text: asset.altText,
          caption: asset.caption || null,
          position_metadata: asset.positionMetadata || { x: 0, y: 0, margin: 16 },
          is_safe_rendering: true,
          status: 'ready',
          created_at: new Date().toISOString(),
        }));
        await supabase.from('tutor_assets').insert(assetRows);
      }

      // 4. Insert default voice metadata for each scene
      const voiceRows = sceneRows.map((sc) => ({
        id: crypto.randomUUID(),
        lesson_id: lessonId,
        scene_id: sc.id,
        voice_id: 'en-US-Neural2-F',
        language_code: 'en-US',
        speaking_rate: 1.0,
        audio_url: null,
        duration_ms: Math.round(sc.duration_seconds * 1000),
        word_level_timestamps: [],
        created_at: new Date().toISOString(),
      }));
      await supabase.from('tutor_voice_metadata').insert(voiceRows);

      return { success: true, lessonId };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Retrieves canonical FAQs for exact scope: Exam -> Subject -> Topic -> Subtopic
   */
  public static async getCanonicalFaqs(
    examId: string,
    subjectId: string,
    topicId: string,
    subtopicId?: string | null
  ): Promise<TutorCanonicalFAQ[]> {
    const supabase = getSupabaseAdmin();
    try {
      let query = supabase
        .from('tutor_faqs')
        .select('*')
        .eq('exam_id', examId)
        .eq('subject_id', subjectId)
        .eq('topic_id', topicId)
        .in('status', ['APPROVED', 'PUBLISHED']);

      if (subtopicId) {
        query = query.eq('subtopic_id', subtopicId);
      } else {
        query = query.is('subtopic_id', null);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((f: any) => ({
        id: f.id,
        examId: f.exam_id,
        subjectId: f.subject_id,
        topicId: f.topic_id,
        subtopicId: f.subtopic_id || undefined,
        question: f.question,
        questionHash: f.question_hash,
        answer: f.answer,
        status: f.status || 'APPROVED',
        helpfulCount: f.helpful_count || 0,
        lessonId: f.lesson_id || undefined,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Deduplicates and saves a new canonical FAQ
   */
  public static async findOrCreateCanonicalFaq(params: {
    examId: string;
    subjectId: string;
    topicId: string;
    subtopicId?: string | null;
    question: string;
    answer: string;
    lessonId?: string;
  }): Promise<{ faq: TutorCanonicalFAQ; isNew: boolean }> {
    const supabase = getSupabaseAdmin();
    const qHash = this.hashQuestion(params.question);

    try {
      let query = supabase
        .from('tutor_faqs')
        .select('*')
        .eq('exam_id', params.examId)
        .eq('subject_id', params.subjectId)
        .eq('topic_id', params.topicId)
        .eq('question_hash', qHash);

      if (params.subtopicId) {
        query = query.eq('subtopic_id', params.subtopicId);
      } else {
        query = query.is('subtopic_id', null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const faq: TutorCanonicalFAQ = {
          id: existing.id,
          examId: existing.exam_id,
          subjectId: existing.subject_id,
          topicId: existing.topic_id,
          subtopicId: existing.subtopic_id || undefined,
          question: existing.question,
          questionHash: existing.question_hash,
          answer: existing.answer,
          status: existing.status || 'APPROVED',
          helpfulCount: existing.helpful_count || 0,
          lessonId: existing.lesson_id || undefined,
          createdAt: existing.created_at,
          updatedAt: existing.updated_at,
        };
        return { faq, isNew: false };
      }

      const { data: inserted, error } = await supabase
        .from('tutor_faqs')
        .insert({
          exam_id: params.examId,
          subject_id: params.subjectId,
          topic_id: params.topicId,
          subtopic_id: params.subtopicId || null,
          question: params.question,
          question_hash: qHash,
          answer: params.answer,
          status: 'CANDIDATE',
          helpful_count: 0,
          lesson_id: params.lessonId || null,
        })
        .select('*')
        .single();

      if (error || !inserted) {
        throw new Error(error?.message || 'Failed to save canonical FAQ');
      }

      const faq: TutorCanonicalFAQ = {
        id: inserted.id,
        examId: inserted.exam_id,
        subjectId: inserted.subject_id,
        topicId: inserted.topic_id,
        subtopicId: inserted.subtopic_id || undefined,
        question: inserted.question,
        questionHash: inserted.question_hash,
        answer: inserted.answer,
        status: inserted.status || 'CANDIDATE',
        helpfulCount: 0,
        lessonId: inserted.lesson_id || undefined,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
      };

      return { faq, isNew: true };
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * Retrieves user's progress for an AI Tutor lesson
   */
  public static async getUserTutorProgress(userId: string, lessonId: string): Promise<UserTutorProgress | null> {
    const supabase = getSupabaseAdmin();
    try {
      const { data, error } = await supabase
        .from('user_tutor_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        lessonId: data.lesson_id,
        lastSceneSequence: data.last_scene_sequence || 1,
        playbackPositionSeconds: Number(data.playback_position_seconds || 0),
        isCompleted: data.is_completed || false,
        completedScenes: data.completed_scenes || [],
        checkpointsPassed: data.checkpoints_passed || [],
        lastStudiedAt: data.last_studied_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * Upserts user's progress for an AI Tutor lesson
   */
  public static async upsertUserTutorProgress(progress: {
    userId: string;
    lessonId: string;
    lastSceneSequence: number;
    playbackPositionSeconds: number;
    isCompleted?: boolean;
    completedScenes?: number[];
    checkpointsPassed?: string[];
  }): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    try {
      const { error } = await supabase.from('user_tutor_progress').upsert(
        {
          user_id: progress.userId,
          lesson_id: progress.lessonId,
          last_scene_sequence: progress.lastSceneSequence,
          playback_position_seconds: progress.playbackPositionSeconds,
          is_completed: progress.isCompleted ?? false,
          completed_scenes: progress.completedScenes || [],
          checkpoints_passed: progress.checkpointsPassed || [],
          last_studied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, lesson_id' }
      );

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Searches existing canonical FAQs for exact scope matching a user doubt.
   * Returns matching canonical FAQ if found, or GENERATION_REQUIRED state if no relevant FAQ exists.
   */
  public static async searchScopeFaq(params: {
    examId: string;
    subjectId: string;
    topicId: string;
    subtopicId?: string | null;
    question: string;
  }): Promise<{ matched: boolean; state?: string; faq?: TutorCanonicalFAQ; message?: string }> {
    if (!params.question || !params.question.trim()) {
      return { matched: false, state: 'INVALID_INPUT', message: 'Question cannot be empty.' };
    }

    const questionHash = this.hashQuestion(params.question);
    const normalizedQuery = params.question.trim().toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ');

    // 1. Fetch all FAQs for this exact scope ONLY
    const faqs = await this.getCanonicalFaqs(params.examId, params.subjectId, params.topicId, params.subtopicId);

    if (!faqs || faqs.length === 0) {
      return {
        matched: false,
        state: 'GENERATION_REQUIRED',
        message: 'Finding an existing explanation…',
      };
    }

    // 2. Check exact hash match
    const exactHashMatch = faqs.find((f) => f.questionHash === questionHash);
    if (exactHashMatch) {
      // Increment helpful_count asynchronously
      const supabase = getSupabaseAdmin();
      supabase
        .from('tutor_faqs')
        .update({ helpful_count: exactHashMatch.helpfulCount + 1, updated_at: new Date().toISOString() })
        .eq('id', exactHashMatch.id)
        .then(() => {});

      return {
        matched: true,
        faq: exactHashMatch,
      };
    }

    // 3. Word overlap matching
    const queryTokens = normalizedQuery.split(/\s+/).filter((t) => t.length > 2);
    if (queryTokens.length > 0) {
      for (const faq of faqs) {
        const faqTokens = faq.question.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter((t) => t.length > 2);
        if (faqTokens.length === 0) continue;

        const commonTokens = queryTokens.filter((token) => faqTokens.includes(token));
        const overlapRatio = commonTokens.length / Math.max(queryTokens.length, faqTokens.length);

        if (overlapRatio >= 0.75) {
          const supabase = getSupabaseAdmin();
          supabase
            .from('tutor_faqs')
            .update({ helpful_count: faq.helpfulCount + 1, updated_at: new Date().toISOString() })
            .eq('id', faq.id)
            .then(() => {});

          return {
            matched: true,
            faq,
          };
        }
      }
    }

    return {
      matched: false,
      state: 'GENERATION_REQUIRED',
      message: 'Finding an existing explanation…',
    };
  }

  /**
   * Batch 7.8: Logs non-blocking learning analytics and engagement events
   */
  public static async logTutorEvent(params: {
    userId: string;
    eventType: string;
    examId: string;
    subjectId: string;
    topicId: string;
    subtopicId?: string | null;
    lessonId?: string | null;
    sceneId?: string | null;
    faqId?: string | null;
    metadata?: Record<string, any>;
  }): Promise<boolean> {
    const allowedEvents = [
      'tutor_opened',
      'tutor_started',
      'scene_started',
      'scene_completed',
      'tutor_paused',
      'tutor_resumed',
      'tutor_seeked',
      'tutor_completed',
      'faq_opened',
      'faq_viewed',
      'doubt_asked',
      'canonical_faq_reused',
      'new_doubt_answer_generated',
      'tutor_exited',
    ];

    if (!allowedEvents.includes(params.eventType)) {
      return false;
    }

    if (!params.userId || !params.examId || !params.subjectId || !params.topicId) {
      return false;
    }

    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from('tutor_events').insert({
        user_id: params.userId,
        event_type: params.eventType,
        exam_id: params.examId,
        subject_id: params.subjectId,
        topic_id: params.topicId,
        subtopic_id: params.subtopicId || null,
        lesson_id: params.lessonId || null,
        scene_id: params.sceneId || null,
        faq_id: params.faqId || null,
        metadata: params.metadata || {},
        event_timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('[TutorDbService] Failed to log tutor event:', error.message);
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('[TutorDbService] Error logging tutor event:', err.message);
      return false;
    }
  }
}

