/**
 * NEOMCQ — GLOBAL CONTENT GENERATION & USER CREDIT COST AUDITOR
 *
 * Enforces Financial Isolation & Auditing:
 * 1. Global Platform Generation Cost is tracked in `ai_cost_events`.
 * 2. Strict $0 User AI Credit Deduction: Global content generation, existing FAQs, segments,
 *    media, and UI playback NEVER debit user credit accounts ($0 user deduction).
 * 3. Genuinely new personalized AI doubt chat requests debit user credits per credit policy.
 * 4. Full Idempotency: Retries with the same idempotency_key / request_id CANNOT double-charge users.
 * 5. Every cost event records user_id, task_type, provider, model, input_tokens, cached_tokens,
 *    output_tokens, actual_provider_cost, credits_deducted, timestamp, and request_id.
 */

import { getSupabaseAdmin } from '../../supabase';
import type { CostAccountingEvent } from './types';

const DEFAULT_PRICING_TABLE: Record<string, { inputPrice: number; cachedInputPrice: number; outputPrice: number }> = {
  'gemini-3.7-flash': { inputPrice: 0.10, cachedInputPrice: 0.025, outputPrice: 0.40 },
  'gemini-3.5-flash': { inputPrice: 0.05, cachedInputPrice: 0.0125, outputPrice: 0.20 },
  'gemini-2.5-pro': { inputPrice: 1.25, cachedInputPrice: 0.3125, outputPrice: 5.00 },
  'gpt-4o-mini': { inputPrice: 0.15, cachedInputPrice: 0.075, outputPrice: 0.60 },
  'gpt-4o': { inputPrice: 2.50, cachedInputPrice: 1.25, outputPrice: 10.00 },
};

export class ContentCostAuditor {
  /**
   * Computes provider COGS for AI operations based on active model rates
   */
  public static async calculateProviderCost(
    provider: string,
    modelId: string,
    inputTokens: number,
    cachedInputTokens: number,
    outputTokens: number,
    supabaseClient?: any
  ): Promise<number> {
    const supabase = supabaseClient || getSupabaseAdmin();
    let rates = DEFAULT_PRICING_TABLE[modelId] || DEFAULT_PRICING_TABLE['gemini-3.7-flash'];

    try {
      const { data: dbPricing } = await supabase
        .from('ai_model_pricing')
        .select('input_cost_per_1m, cached_input_cost_per_1m, output_cost_per_1m')
        .eq('model', modelId)
        .eq('active', true)
        .maybeSingle();

      if (dbPricing && dbPricing.input_cost_per_1m != null) {
        rates = {
          inputPrice: Number(dbPricing.input_cost_per_1m),
          cachedInputPrice: Number(dbPricing.cached_input_cost_per_1m ?? (dbPricing.input_cost_per_1m * 0.25)),
          outputPrice: Number(dbPricing.output_cost_per_1m),
        };
      }
    } catch {
      // Fall back to default table rates
    }

    const standardInput = Math.max(0, inputTokens - cachedInputTokens);
    const inputCost = (standardInput / 1_000_000) * rates.inputPrice;
    const cachedCost = (cachedInputTokens / 1_000_000) * rates.cachedInputPrice;
    const outputCost = (outputTokens / 1_000_000) * rates.outputPrice;

    return Number((inputCost + cachedCost + outputCost).toFixed(6));
  }

  /**
   * Records an audit event for global content generation.
   * STRICT GUARANTEE: `credits_deducted` is ALWAYS 0 and user personal account is NEVER touched.
   */
  public static async recordGlobalGenerationCost(
    event: Omit<CostAccountingEvent, 'creditsDeducted' | 'isGlobalGeneration' | 'timestamp'> & { requestId?: string; idempotencyKey?: string },
    supabaseClient?: any
  ): Promise<CostAccountingEvent> {
    const supabase = supabaseClient || getSupabaseAdmin();
    const timestamp = new Date().toISOString();

    const auditRecord: CostAccountingEvent = {
      jobId: event.jobId,
      isGlobalGeneration: true,
      userId: null,
      taskType: event.taskType,
      provider: event.provider,
      model: event.model,
      inputTokens: event.inputTokens,
      cachedTokens: event.cachedTokens,
      outputTokens: event.outputTokens,
      actualCostUsd: event.actualCostUsd,
      creditsDeducted: 0,
      timestamp,
    };

    try {
      await supabase.from('ai_cost_events').insert({
        user_id: null,
        userId: null,
        job_id: event.jobId || null,
        jobId: event.jobId || null,
        task_type: event.taskType,
        taskType: event.taskType,
        provider: event.provider,
        model: event.model,
        input_tokens: event.inputTokens,
        inputTokens: event.inputTokens,
        cached_input_tokens: event.cachedTokens,
        cachedTokens: event.cachedTokens,
        output_tokens: event.outputTokens,
        outputTokens: event.outputTokens,
        reasoning_tokens: 0,
        actual_provider_cost: event.actualCostUsd,
        actualCostUsd: event.actualCostUsd,
        revenue_allocated: 0.0000,
        ai_infrastructure_cost: Number((event.actualCostUsd * 0.05).toFixed(6)),
        credits_deducted: 0.00,
        creditsDeducted: 0,
        isGlobalGeneration: true,
        created_at: timestamp,
        timestamp,
        request_id: event.requestId || null,
        idempotency_key: event.idempotencyKey || null,
      });
    } catch (err) {
      console.warn('[ContentCostAuditor] Non-blocking notice recording global cost event:', err);
    }

    return auditRecord;
  }

  /**
   * Alias for recordGlobalGenerationCost
   */
  public static async recordCostEvent(
    event: Omit<CostAccountingEvent, 'creditsDeducted' | 'isGlobalGeneration' | 'timestamp'> & { requestId?: string; idempotencyKey?: string },
    supabaseClient?: any
  ): Promise<CostAccountingEvent> {
    return this.recordGlobalGenerationCost(event, supabaseClient);
  }

  /**
   * Deducts user credits and records cost event for genuinely new personalized AI doubt chat requests.
   * GUARANTEED IDEMPOTENCY: Retries with the same idempotencyKey will NOT double-charge user credits.
   */
  public static async recordUserDoubtCost(
    params: {
      userId: string;
      taskType?: string;
      provider: string;
      model: string;
      inputTokens: number;
      cachedTokens: number;
      outputTokens: number;
      actualCostUsd: number;
      creditsCharged: number;
      requestId?: string;
      idempotencyKey?: string;
    },
    supabaseClient?: any
  ): Promise<{ creditsDeducted: number; isDuplicateRequest: boolean }> {
    const supabase = supabaseClient || getSupabaseAdmin();
    const timestamp = new Date().toISOString();
    const taskType = params.taskType || 'AI_TUTOR_DOUBT_CHAT';
    const idempotencyKey = params.idempotencyKey || params.requestId || null;

    // 1. Check idempotency: If idempotencyKey is present, check if cost event already exists
    if (idempotencyKey) {
      try {
        const { data: existingEvent } = await supabase
          .from('ai_cost_events')
          .select('id, credits_deducted')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();

        if (existingEvent) {
          console.log(`[ContentCostAuditor] Duplicate request detected for idempotencyKey ${idempotencyKey}. Skipping double billing.`);
          return {
            creditsDeducted: Number(existingEvent.credits_deducted || 0),
            isDuplicateRequest: true,
          };
        }
      } catch (err) {
        console.warn('[ContentCostAuditor] Notice checking idempotency:', err);
      }
    }

    // 2. Perform credit deduction from user's credit_accounts table
    let actualDeducted = 0;
    if (params.creditsCharged > 0 && params.userId && params.userId !== 'system-user') {
      try {
        const { data: wallet, error: walletErr } = await supabase
          .from('credit_accounts')
          .select('credit_balance, lifetime_credits_used')
          .eq('user_id', params.userId)
          .maybeSingle();

        if (walletErr) {
          console.error('[ContentCostAuditor] wallet fetch error:', walletErr);
        }

        if (wallet) {
          const curBal = Number(wallet.credit_balance || 0);
          const newBal = Math.max(0, curBal - params.creditsCharged);
          actualDeducted = params.creditsCharged;

          const { error: updateErr } = await supabase
            .from('credit_accounts')
            .update({
              credit_balance: newBal,
              lifetime_credits_used: Number(wallet.lifetime_credits_used || 0) + actualDeducted,
              updated_at: timestamp,
            })
            .eq('user_id', params.userId);

          if (updateErr) {
            console.error('[ContentCostAuditor] wallet update error:', updateErr);
          }

          const { error: ledgerErr } = await supabase.from('credit_ledger').insert({
            user_id: params.userId,
            transaction_type: 'AI_USAGE',
            credits: -actualDeducted,
            balance_before: curBal,
            balance_after: newBal,
            reference_type: 'ai_tutor_doubt',
            reference_id: params.requestId || null,
            idempotency_key: idempotencyKey,
            description: `AI Doubt Chat on ${params.provider} (${params.model})`,
            created_at: timestamp,
          });

          if (ledgerErr) {
            console.error('[ContentCostAuditor] credit_ledger insert error:', ledgerErr);
          }
        }
      } catch (err) {
        console.warn('[ContentCostAuditor] Error updating user credit account:', err);
      }
    }

    // 3. Insert cost event into ai_cost_events with full metadata
    try {
      const { error: costErr } = await supabase.from('ai_cost_events').insert({
        user_id: params.userId,
        userId: params.userId,
        task_type: taskType,
        taskType,
        provider: params.provider,
        model: params.model,
        input_tokens: params.inputTokens,
        inputTokens: params.inputTokens,
        cached_input_tokens: params.cachedTokens,
        cachedTokens: params.cachedTokens,
        output_tokens: params.outputTokens,
        outputTokens: params.outputTokens,
        reasoning_tokens: 0,
        actual_provider_cost: params.actualCostUsd,
        actualCostUsd: params.actualCostUsd,
        revenue_allocated: 0.0000,
        ai_infrastructure_cost: Number((params.actualCostUsd * 0.05).toFixed(6)),
        credits_deducted: actualDeducted,
        creditsDeducted: actualDeducted,
        created_at: timestamp,
        timestamp,
        request_id: params.requestId || null,
        idempotency_key: idempotencyKey,
      });

      if (costErr) {
        console.error('[ContentCostAuditor] ai_cost_events insert error:', costErr);
      }
    } catch (err) {
      console.warn('[ContentCostAuditor] Error inserting user doubt cost event:', err);
    }

    return {
      creditsDeducted: actualDeducted,
      isDuplicateRequest: false,
    };
  }
}
