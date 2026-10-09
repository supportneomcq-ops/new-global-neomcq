import { getSupabaseAdmin } from '@/lib/supabase'

export interface ClaimJobResult {
  claimed: boolean
  jobId?: string
  existingJob?: any
}

/**
 * Claim or join a generation/resolution job in `ai_generation_jobs`.
 * Uses database rows for cross-worker / serverless idempotency.
 */
export async function claimOrJoinAIJob(
  jobType: string,
  idempotencyKey: string,
  metadata: Record<string, any> = {}
): Promise<ClaimJobResult> {
  const supabase = getSupabaseAdmin()
  const staleThresholdMinutes = 5
  const staleDate = new Date(Date.now() - staleThresholdMinutes * 60 * 1000).toISOString()

  try {
    // 1. Check if an active or completed job already exists
    const { data: existing, error: selectErr } = await supabase
      .from('ai_generation_jobs')
      .select('*')
      .eq('job_type', jobType)
      .eq('idempotency_key', idempotencyKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (selectErr) {
      console.warn('[AI Job Lock] Query error, proceeding with best effort:', selectErr.message)
    }

    if (existing) {
      if (existing.status === 'completed') {
        return {
          claimed: false,
          jobId: existing.id,
          existingJob: existing,
        }
      }

      // If pending/processing and NOT stale, another worker is working on it
      if ((existing.status === 'processing' || existing.status === 'pending') && existing.updated_at > staleDate) {
        return {
          claimed: false,
          jobId: existing.id,
          existingJob: existing,
        }
      }

      // If stale or failed, reclaim by updating
      const { data: reclaimed, error: updateErr } = await supabase
        .from('ai_generation_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: { ...(existing.metadata || {}), ...metadata, reclaimed_at: new Date().toISOString() },
        })
        .eq('id', existing.id)
        .select('*')
        .maybeSingle()

      if (!updateErr && reclaimed) {
        return {
          claimed: true,
          jobId: reclaimed.id,
          existingJob: reclaimed,
        }
      }
    }

    // 2. Insert new job
    const { data: inserted, error: insertErr } = await supabase
      .from('ai_generation_jobs')
      .insert({
        job_type: jobType,
        status: 'processing',
        idempotency_key: idempotencyKey,
        started_at: new Date().toISOString(),
        metadata,
      })
      .select('*')
      .maybeSingle()

    if (insertErr) {
      // Race condition insert conflict: Fetch the row that won the race
      const { data: raceWinner } = await supabase
        .from('ai_generation_jobs')
        .select('*')
        .eq('job_type', jobType)
        .eq('idempotency_key', idempotencyKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return {
        claimed: false,
        jobId: raceWinner?.id,
        existingJob: raceWinner,
      }
    }

    return {
      claimed: true,
      jobId: inserted?.id,
      existingJob: inserted,
    }
  } catch (err: any) {
    console.warn('[AI Job Lock] Unexpected error claiming job:', err.message)
    return { claimed: true }
  }
}

/**
 * Marks an AI job as completed with output payload.
 */
export async function completeAIJob(
  jobId: string,
  resultPayload: Record<string, any> = {}
): Promise<void> {
  if (!jobId) return
  const supabase = getSupabaseAdmin()
  try {
    await supabase
      .from('ai_generation_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        output_payload: resultPayload,
      })
      .eq('id', jobId)
  } catch (err: any) {
    console.warn('[AI Job Lock] Failed to mark job completed:', err.message)
  }
}

/**
 * Marks an AI job as failed with error message.
 */
export async function failAIJob(
  jobId: string,
  errorMessage: string
): Promise<void> {
  if (!jobId) return
  const supabase = getSupabaseAdmin()
  try {
    await supabase
      .from('ai_generation_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  } catch (err: any) {
    console.warn('[AI Job Lock] Failed to mark job failed:', err.message)
  }
}

/**
 * Polls for an in-flight job to complete (up to timeoutMs).
 */
export async function waitForAIJobCompletion(
  jobId: string,
  timeoutMs: number = 8000,
  intervalMs: number = 500
): Promise<any | null> {
  if (!jobId) return null
  const supabase = getSupabaseAdmin()
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    await new Promise((res) => setTimeout(res, intervalMs))
    const { data: job } = await supabase
      .from('ai_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle()

    if (job?.status === 'completed') {
      return job.output_payload || job
    }
    if (job?.status === 'failed') {
      return null
    }
  }
  return null
}
