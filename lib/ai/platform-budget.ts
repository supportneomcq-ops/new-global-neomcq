import { getSupabaseAdmin } from '@/lib/supabase'

export interface PlatformBudgetReservationInput {
  idempotencyKey: string
  taskType: string
  provider: string
  model: string
  amountUsd: number
  userId?: string | null
  requestId?: string | null
  metadata?: Record<string, unknown>
}

export async function reservePlatformAIBudget(input: PlatformBudgetReservationInput): Promise<string> {
  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    throw new Error('A positive platform AI budget reservation is required.')
  }

  const admin = getSupabaseAdmin() as any
  const { data, error } = await admin.rpc('reserve_platform_ai_budget', {
    p_idempotency_key: input.idempotencyKey,
    p_task_type: input.taskType,
    p_provider: input.provider,
    p_model: input.model,
    p_amount_usd: input.amountUsd,
    p_user_id: input.userId || null,
    p_request_id: input.requestId || null,
    p_metadata: input.metadata || {},
  })

  if (error) {
    console.error('[Platform AI Budget] Reservation RPC failed:', error.message)
    throw new Error('AI platform budget could not be verified. Generation was blocked.')
  }

  if (!data?.allowed || !data?.reservation_id) {
    const reason = String(data?.reason || 'budget_reservation_denied')
    const available = Number(data?.available_budget_usd || 0)
    const required = Number(data?.required_budget_usd || input.amountUsd)
    throw new Error(
      reason === 'ai_budget_not_funded'
        ? `AI_BUDGET_NOT_FUNDED: available $\u0024{available.toFixed(6)}, required $\u0024{required.toFixed(6)}.`
        : `AI_BUDGET_RESERVATION_DENIED: ${reason}.`
    )
  }

  return String(data.reservation_id)
}

export async function settlePlatformAIBudget(input: {
  reservationId: string
  actualCostUsd: number
  provider: string
  model: string
  inputTokens?: number
  cachedInputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
  revenueAllocatedUsd?: number
  infrastructureCostUsd?: number
  creditsDeducted?: number
  requestId?: string | null
  uncertain?: boolean
  metadata?: Record<string, unknown>
}): Promise<void> {
  const admin = getSupabaseAdmin() as any
  const { data, error } = await admin.rpc('settle_platform_ai_budget', {
    p_reservation_id: input.reservationId,
    p_actual_cost_usd: input.actualCostUsd,
    p_provider: input.provider,
    p_model: input.model,
    p_input_tokens: input.inputTokens || 0,
    p_cached_input_tokens: input.cachedInputTokens || 0,
    p_output_tokens: input.outputTokens || 0,
    p_reasoning_tokens: input.reasoningTokens || 0,
    p_revenue_allocated: input.revenueAllocatedUsd || 0,
    p_infrastructure_cost: input.infrastructureCostUsd || 0,
    p_credits_deducted: input.creditsDeducted || 0,
    p_request_id: input.requestId || null,
    p_uncertain: Boolean(input.uncertain),
    p_metadata: input.metadata || {},
  })

  if (error || !data?.success) {
    console.error('[Platform AI Budget] Settlement failed; reservation remains held:', error?.message || data)
    throw new Error('AI generation could not be financially finalized. The reserved budget remains held for reconciliation.')
  }
}

export async function releasePlatformAIBudget(reservationId: string, reason: string): Promise<void> {
  const admin = getSupabaseAdmin() as any
  const { data, error } = await admin.rpc('release_platform_ai_budget', {
    p_reservation_id: reservationId,
    p_reason: reason,
  })

  if (error || !data?.success) {
    console.error('[Platform AI Budget] Reservation release failed:', error?.message || data)
    throw new Error('AI platform budget reservation could not be released.')
  }
}
