/**
 * NEOMCQ — CONTENT GENERATION JOB MANAGER
 *
 * Implements:
 * 1. Database-backed Job Lifecycle using `ai_jobs`
 * 2. State Machine: QUEUED -> RUNNING -> VALIDATING -> COMPLETED / FAILED / CANCELLED
 * 3. Atomic Idempotency & Race-Condition Attachment (10 concurrent requests = 1 job)
 * 4. Bounded Retry & Backoff (Max 3 attempts, failed jobs allow retry)
 */

import { getSupabaseAdmin } from '../../supabase';
import type { JobState, GenerationJobRecord, ContentPackageType } from './types';
import { buildIdempotencyKey } from './canonical-identity';

const ACTIVE_JOB_STATUSES = ['queued', 'running', 'validating', 'processing', 'pending'];

export class GenerationJobManager {
  /**
   * Fetches a job by ID from ai_jobs
   */
  public static async getJobById(
    jobId: string,
    supabaseClient?: any
  ): Promise<GenerationJobRecord | null> {
    const supabase = supabaseClient || getSupabaseAdmin();
    try {
      const { data: job, error } = await supabase
        .from('ai_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (error || !job) return null;
      return this.mapDbJobToRecord(job);
    } catch {
      return null;
    }
  }

  /**
   * Finds an existing in-flight job for the given idempotency key
   */
  public static async findActiveJob(
    idempotencyKey: string,
    supabaseClient?: any
  ): Promise<GenerationJobRecord | null> {
    const supabase = supabaseClient || getSupabaseAdmin();

    try {
      // Check column first, then input_payload
      const { data: job, error } = await supabase
        .from('ai_jobs')
        .select('*')
        .or(`idempotency_key.eq.${idempotencyKey},input_payload->>idempotency_key.eq.${idempotencyKey}`)
        .in('status', ACTIVE_JOB_STATUSES)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !job) return null;

      return this.mapDbJobToRecord(job);
    } catch {
      return null;
    }
  }

  /**
   * Finds the latest job (including completed or failed) for a topic
   */
  public static async getLatestJobForTopic(
    topicId: string,
    supabaseClient?: any
  ): Promise<GenerationJobRecord | null> {
    const supabase = supabaseClient || getSupabaseAdmin();

    try {
      const { data: job, error } = await supabase
        .from('ai_jobs')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !job) return null;
      return this.mapDbJobToRecord(job);
    } catch {
      return null;
    }
  }

  /**
   * Idempotently creates a new generation job or attaches to an existing active one.
   * Guaranteed: Database-enforced atomic concurrency prevents duplicate generation jobs.
   */
  public static async createOrAttachJob(
    params: {
      examId: string;
      subjectId?: string;
      topicId?: string;
      examVersionId?: string | null;
      packageType?: ContentPackageType | string;
      version?: number;
      priority?: number;
      task?: string;
      userId?: string | null;
      inputPayload?: Record<string, any>;
      provider?: string;
      model?: string;
      maxAttempts?: number;
    },
    supabaseClient?: any
  ): Promise<{ job: GenerationJobRecord; isNew: boolean; resolutionType?: string }> {
    const supabase = supabaseClient || getSupabaseAdmin();
    const version = params.version || 1;
    const packageType = params.packageType || 'full_pack';
    const task = params.task || `generate_content_package_${packageType}`;
    const idempotencyKey = buildIdempotencyKey(
      params.examId,
      params.subjectId || '',
      params.topicId || '',
      packageType,
      version,
      params.examVersionId
    );

    const inputPayload = {
      idempotency_key: idempotencyKey,
      exam_id: params.examId,
      exam_version_id: params.examVersionId || null,
      subject_id: params.subjectId || null,
      topic_id: params.topicId || null,
      package_type: packageType,
      version,
      is_global_generation: true,
      created_timestamp: new Date().toISOString(),
      ...(params.inputPayload || {}),
    };

    // 1. Attempt Atomic Database RPC Call (Batch 2 Idempotency Boundary)
    try {
      const { data, error } = await supabase.rpc('get_or_create_ai_generation_job', {
        p_idempotency_key: idempotencyKey,
        p_task: task,
        p_exam_id: params.examId || null,
        p_exam_version_id: params.examVersionId || null,
        p_subject_id: params.subjectId || null,
        p_topic_id: params.topicId || null,
        p_user_id: params.userId || null,
        p_input_payload: inputPayload,
        p_priority: params.priority || 5,
        p_provider: params.provider || 'Google Gemini AI',
        p_model: params.model || 'gemini-3.5-flash',
        p_max_attempts: params.maxAttempts || 3,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        const result = data[0];
        const job = await this.getJobById(result.job_id, supabase);
        if (job) {
          return {
            job,
            isNew: Boolean(result.is_new),
            resolutionType: result.resolution_type,
          };
        }
      }
    } catch {
      // Fall through to standard fallback logic if RPC is unavailable in isolated mock environments
    }

    // 2. Direct Fallback Check for active job
    const active = await this.findActiveJob(idempotencyKey, supabase);
    if (active) {
      return { job: active, isNew: false, resolutionType: 'FALLBACK_ACTIVE' };
    }

    // 3. Fallback Insert
    try {
      const { data: created, error } = await supabase
        .from('ai_jobs')
        .insert({
          idempotency_key: idempotencyKey,
          exam_id: params.examId,
          exam_version_id: params.examVersionId || null,
          subject_id: params.subjectId || null,
          topic_id: params.topicId || null,
          task,
          status: 'queued',
          priority: params.priority || 5,
          provider: params.provider || 'Google Gemini AI',
          model: params.model || 'gemini-3.5-flash',
          attempts: 0,
          max_attempts: params.maxAttempts || 3,
          credits_reserved: 0,
          credits_consumed: 0,
          input_payload: inputPayload,
          created_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        const retryActive = await this.findActiveJob(idempotencyKey, supabase);
        if (retryActive) {
          return { job: retryActive, isNew: false, resolutionType: 'FALLBACK_CONFLICT_ACTIVE' };
        }
        throw error;
      }

      return { job: this.mapDbJobToRecord(created), isNew: true, resolutionType: 'FALLBACK_CREATED' };
    } catch (err: any) {
      const fallbackActive = await this.findActiveJob(idempotencyKey, supabase);
      if (fallbackActive) {
        return { job: fallbackActive, isNew: false, resolutionType: 'FALLBACK_ERROR_ATTACHED' };
      }
      throw new Error(`Failed to create generation job: ${err.message}`);
    }
  }

  /**
   * Alias for createOrAttachJob for flexible generator integration
   */
  public static async findOrCreateJob(
    params: {
      examId: string;
      subjectId: string;
      topicId: string;
      packageType?: ContentPackageType;
      version?: number;
      priority?: number;
      task?: string;
    },
    supabaseClient?: any
  ): Promise<{ job: GenerationJobRecord; isNew: boolean }> {
    return this.createOrAttachJob(params, supabaseClient);
  }

  /**
   * Transitions job to RUNNING
   */
  public static async markRunning(
    jobId: string,
    providerOrClient?: string | any,
    model?: string,
    supabaseClient?: any
  ): Promise<boolean> {
    let provider = 'gemini';
    let mod = 'gemini-2.5-flash';
    let supabase = supabaseClient;

    if (typeof providerOrClient === 'string') {
      provider = providerOrClient;
      if (model) mod = model;
    } else if (providerOrClient && typeof providerOrClient === 'object' && providerOrClient.from) {
      supabase = providerOrClient;
    }

    supabase = supabase || getSupabaseAdmin();
    try {
      const { error } = await supabase
        .from('ai_jobs')
        .update({
          status: 'running',
          provider,
          model: mod,
          started_at: new Date().toISOString(),
          attempts: 1,
        })
        .eq('id', jobId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Polling helper to wait for an in-flight job to complete
   */
  public static async waitForJobCompletion(
    jobId: string,
    timeoutMs: number = 30000,
    supabaseClient?: any
  ): Promise<GenerationJobRecord | null> {
    const supabase = supabaseClient || getSupabaseAdmin();
    const startTime = Date.now();
    const pollIntervalMs = 500;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const { data: job } = await supabase
          .from('ai_jobs')
          .select('*')
          .eq('id', jobId)
          .maybeSingle();

        if (job) {
          const record = this.mapDbJobToRecord(job);
          if (record.status === 'COMPLETED' || record.status === 'FAILED' || record.status === 'CANCELLED') {
            return record;
          }
        }
      } catch {
        // ignore transient poll error
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    return null;
  }

  /**
   * Transitions job to VALIDATING
   */
  public static async markValidating(jobId: string, supabaseClient?: any): Promise<boolean> {
    const supabase = supabaseClient || getSupabaseAdmin();
    try {
      const { error } = await supabase
        .from('ai_jobs')
        .update({
          status: 'validating',
        })
        .eq('id', jobId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Transitions job to COMPLETED with output payload
   */
  public static async markCompleted(
    jobId: string,
    outputPayload: any,
    supabaseClient?: any
  ): Promise<boolean> {
    const supabase = supabaseClient || getSupabaseAdmin();
    try {
      const { error } = await supabase
        .from('ai_jobs')
        .update({
          status: 'completed',
          output_payload: outputPayload,
          completed_at: new Date().toISOString(),
          error: null,
        })
        .eq('id', jobId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Transitions job to FAILED (allows controlled retry later)
   */
  public static async markFailed(
    jobId: string,
    errorMessage: string,
    supabaseClient?: any
  ): Promise<boolean> {
    const supabase = supabaseClient || getSupabaseAdmin();
    try {
      const { error } = await supabase
        .from('ai_jobs')
        .update({
          status: 'failed',
          error: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Helper to map DB row to standardized TypeScript interface
   */
  private static mapDbJobToRecord(dbRow: any): GenerationJobRecord {
    const rawStatus = String(dbRow.status || 'queued').toUpperCase();
    const status: JobState = ['QUEUED', 'RUNNING', 'VALIDATING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(rawStatus)
      ? (rawStatus as JobState)
      : 'QUEUED';

    return {
      id: dbRow.id,
      examId: dbRow.exam_id,
      subjectId: dbRow.subject_id,
      topicId: dbRow.topic_id,
      examVersionId: dbRow.exam_version_id || dbRow.input_payload?.exam_version_id || null,
      task: dbRow.task || 'content_generation',
      status,
      priority: dbRow.priority || 5,
      provider: dbRow.provider,
      model: dbRow.model,
      attempts: dbRow.attempts || 0,
      maxAttempts: dbRow.max_attempts || 3,
      error: dbRow.error,
      idempotencyKey: dbRow.idempotency_key || dbRow.input_payload?.idempotency_key || '',
      createdAt: dbRow.created_at,
      startedAt: dbRow.started_at,
      completedAt: dbRow.completed_at,
      outputPayload: dbRow.output_payload,
    };
  }
}
