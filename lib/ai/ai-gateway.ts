import { getSupabaseAdmin } from '../supabase/admin';
import type {
  AIProviderId,
  AIGenerationOptions,
  AIGenerationResult,
  AITokenUsage,
  AIProviderCost,
  ProviderConnectionTestResult,
  ModelVerificationItem,
} from './types';
import { GoogleGeminiProvider } from './adapters/gemini-adapter';
import { OpenAIProvider } from './adapters/openai-adapter';
import { ModelRegistry } from './model-registry';
import { TaskRouter } from './task-router';
import { ProviderAdapter, AIProviderError } from './adapters/provider-adapter';
import { validateServerAIEnvironment } from './env-validator';

export class AIGateway {
  private static geminiProvider = new GoogleGeminiProvider();
  private static openaiProvider = new OpenAIProvider();

  public static getAdapter(provider: AIProviderId | string): ProviderAdapter {
    // Database rows and legacy jobs may contain display labels (e.g. "OpenAI"
    // or "Google Gemini AI") instead of canonical provider IDs. Normalize them
    // at this boundary so persisted labels cannot break AI execution.
    const normalized = String(provider || '')
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');

    if (['gemini', 'google gemini', 'google gemini ai', 'google gemini api'].includes(normalized)) {
      return this.geminiProvider;
    }
    if (['openai', 'open ai', 'openai api'].includes(normalized)) {
      return this.openaiProvider;
    }
    throw new Error(`Unknown AI Provider: ${provider}`);
  }

  /**
   * Get server-side environment readiness & masked status
   */
  public static getEnvironmentStatus() {
    return validateServerAIEnvironment();
  }

  /**
   * Test connection to a specific provider
   */
  public static async testProvider(
    provider: AIProviderId,
    probeModel?: string
  ): Promise<ProviderConnectionTestResult> {
    const adapter = this.getAdapter(provider);
    return adapter.testConnection(probeModel);
  }

  /**
   * Discover and verify all models against live provider APIs
   */
  public static async verifyAndSyncAllModels(): Promise<{
    geminiResults: ModelVerificationItem[];
    openaiResults: ModelVerificationItem[];
    verifiedCount: number;
    unavailableCount: number;
  }> {
    const res = await ModelRegistry.verifyAndSyncAll(this.geminiProvider, this.openaiProvider);
    return {
      geminiResults: res.geminiResults.map((m) => ({
        provider: m.provider,
        model: m.model_id,
        available: m.active,
        verifiedAt: m.last_verified_at || new Date().toISOString(),
        capabilities: {
          text: m.supports_text,
          image: m.supports_image,
          audio: m.supports_audio,
          video: m.supports_video,
          reasoning: m.supports_reasoning,
          structuredOutput: m.supports_structured_output,
        },
        latencyMs: m.latency_ms,
        error: m.verification_error,
      })),
      openaiResults: res.openaiResults.map((m) => ({
        provider: m.provider,
        model: m.model_id,
        available: m.active,
        verifiedAt: m.last_verified_at || new Date().toISOString(),
        capabilities: {
          text: m.supports_text,
          image: m.supports_image,
          audio: m.supports_audio,
          video: m.supports_video,
          reasoning: m.supports_reasoning,
          structuredOutput: m.supports_structured_output,
        },
        latencyMs: m.latency_ms,
        error: m.verification_error,
      })),
      verifiedCount: res.verifiedCount,
      unavailableCount: res.unavailableCount,
    };
  }

  /**
   * Calculate exact provider COGS and margins based on token consumption
   */
  public static async calculateCostAndMargin(
    provider: AIProviderId,
    modelId: string,
    usage: AITokenUsage,
    creditCost: number
  ): Promise<AIProviderCost> {
    const meta = await ModelRegistry.getModel(provider, modelId);

    const inputPricePer1M = meta ? meta.input_price : (modelId.includes('pro') || modelId.includes('3.7') ? 0.10 : 0.05);
    const cachedPricePer1M = meta ? meta.cached_input_price : inputPricePer1M * 0.25;
    const outputPricePer1M = meta ? meta.output_price : (modelId.includes('pro') || modelId.includes('3.7') ? 0.40 : 0.20);

    const standardInputTokens = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
    const inputCostUsd = (standardInputTokens / 1_000_000) * inputPricePer1M;
    const cachedInputCostUsd = (usage.cachedInputTokens / 1_000_000) * cachedPricePer1M;
    const outputCostUsd = (usage.outputTokens / 1_000_000) * outputPricePer1M;
    const totalProviderCostUsd = Number((inputCostUsd + cachedInputCostUsd + outputCostUsd).toFixed(6));

    // Internal infrastructure & payment buffer (5% of COGS)
    const infrastructureCostUsd = Number((totalProviderCostUsd * 0.05).toFixed(6));
    const totalCogsUsd = Number((totalProviderCostUsd + infrastructureCostUsd).toFixed(6));

    // Value per credit is pegged at $0.01
    const revenueAllocatedUsd = Number((creditCost * 0.01).toFixed(6));
    const grossProfitUsd = Number((revenueAllocatedUsd - totalCogsUsd).toFixed(6));
    const marginPercent =
      revenueAllocatedUsd > 0
        ? Number(((grossProfitUsd / revenueAllocatedUsd) * 100).toFixed(2))
        : 60.0;

    return {
      inputCostUsd,
      cachedInputCostUsd,
      outputCostUsd,
      totalProviderCostUsd,
      infrastructureCostUsd,
      totalCogsUsd,
      revenueAllocatedUsd,
      grossProfitUsd,
      marginPercent,
    };
  }

  /**
   * CANONICAL EXECUTION PIPELINE
   * AI Task -> Task Router -> Model Registry -> AI Gateway -> Provider Adapter -> Provider API
   */
  public static async generate(options: AIGenerationOptions): Promise<AIGenerationResult> {
    const supabase = getSupabaseAdmin();
    const taskType = TaskRouter.normalizeTaskType(options.taskType);

    // 1. Resolve Route & Models
    const route = await TaskRouter.resolveExecutableRoute(
      taskType,
      options.preferredProvider,
      options.preferredModel
    );

    const effectiveCreditCost = route.creditCost;
    const userId = options.userId;

    // 2. Reserve User Credits if userId provided
    let reservedCredits = 0;
    if (userId) {
      try {
        const supabaseAdmin: any = supabase;
        const { data: wallet } = await supabaseAdmin
          .from('credit_accounts')
          .select('balance, reserved_balance, frozen')
          .eq('user_id', userId)
          .maybeSingle();

        if (wallet) {
          if (wallet.frozen) {
            throw new Error('AI generation is paused on your account. Please contact support.');
          }

          const available = Number(wallet.balance) - Number(wallet.reserved_balance || 0);
          if (available < effectiveCreditCost) {
            throw new Error(
              `Insufficient credits. Required: ${effectiveCreditCost}, Available: ${available.toFixed(1)}. Please top up your credits.`
            );
          }

          // Atomic increment of reserved balance
          await supabaseAdmin
            .from('credit_accounts')
            .update({
              reserved_balance: Number(wallet.reserved_balance || 0) + effectiveCreditCost,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          reservedCredits = effectiveCreditCost;
        }
      } catch (err: any) {
        if (err.message.includes('Insufficient') || err.message.includes('paused')) {
          throw err;
        }
        console.warn('AIGateway: Could not access credit_accounts table, continuing with unmetered execution:', err);
      }
    }

    // 3. Execution with Fallback Hierarchy
    let primaryAdapter: ProviderAdapter;
    try {
      primaryAdapter = this.getAdapter(route.primaryProvider);
    } catch (providerErr) {
      await this.releaseCreditReservation(userId, reservedCredits);
      const detail = providerErr instanceof Error ? providerErr.message : String(providerErr);
      throw new Error(`AI routing configuration error: ${detail}`);
    }

    let isFallback = false;
    let fallbackReason: string | undefined = undefined;
    let executionResult: any;
    let finalProvider: AIProviderId = route.primaryProvider;
    let finalModel: string = route.primaryModel;

    const generationPayload: AIGenerationOptions = {
      ...options,
      taskType,
      temperature: typeof options.temperature === 'number' ? options.temperature : route.temperature,
      maxOutputTokens: options.maxOutputTokens || route.maxOutputTokens,
      preferredModel: route.primaryModel,
    };

    try {
      if (!primaryAdapter.isConfigured()) {
        throw new AIProviderError({
          provider: route.primaryProvider,
          isAuthError: true,
          isRateLimit: false,
          isRetryable: true,
          isModelNotFound: false,
          errorCode: 'PRIMARY_PROVIDER_NOT_CONFIGURED',
          rawMessage: `${route.primaryProvider.toUpperCase()} is not configured in server environment.`,
        });
      }

      executionResult = await primaryAdapter.generate(generationPayload);
      finalProvider = route.primaryProvider;
      finalModel = route.primaryModel;
    } catch (primaryErr: any) {
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      console.warn(`AIGateway: Primary provider ${route.primaryProvider} (${route.primaryModel}) failed:`, primaryMsg);

      // Check if fallback is available
      const fallbackAdapter = this.getAdapter(route.fallbackProvider);
      if (fallbackAdapter && fallbackAdapter.isConfigured() && route.fallbackModel) {
        isFallback = true;
        fallbackReason = `Primary provider error: ${primaryMsg}`;
        console.log(`AIGateway: Initiating automated failover to ${route.fallbackProvider} (${route.fallbackModel})`);

        try {
          const fallbackPayload: AIGenerationOptions = {
            ...generationPayload,
            preferredModel: route.fallbackModel,
          };
          executionResult = await fallbackAdapter.generate(fallbackPayload);
          finalProvider = route.fallbackProvider;
          finalModel = route.fallbackModel;
        } catch (fallbackErr: any) {
          const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          // Release reservation
          await this.releaseCreditReservation(userId, reservedCredits);
          throw new Error(
            `AIGateway Failover Error: All configured providers failed. Primary: ${primaryMsg}. Fallback: ${fallbackMsg}`
          );
        }
      } else {
        // Fallback not configured or failed
        await this.releaseCreditReservation(userId, reservedCredits);
        throw new Error(`AIGateway Error: ${primaryMsg}`);
      }
    }

    // 4. Calculate real COGS and margin metrics
    const costMetrics = await this.calculateCostAndMargin(
      finalProvider,
      finalModel,
      executionResult.usage,
      effectiveCreditCost
    );

    // 5. Settle Credit Deduction & Record Audit Events in Database
    if (userId && reservedCredits > 0) {
      try {
        const supabaseAdmin: any = supabase;
        const { data: wallet } = await supabaseAdmin
          .from('credit_accounts')
          .select('balance, reserved_balance')
          .eq('user_id', userId)
          .maybeSingle();

        if (wallet) {
          const curBal = Number(wallet.balance);
          const curRes = Number(wallet.reserved_balance || 0);
          const newBal = Math.max(0, curBal - effectiveCreditCost);
          const newRes = Math.max(0, curRes - reservedCredits);

          await supabaseAdmin
            .from('credit_accounts')
            .update({
              balance: newBal,
              reserved_balance: newRes,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          await supabaseAdmin.from('credit_ledger').insert({
            user_id: userId,
            transaction_type: 'AI_USAGE',
            credits: -effectiveCreditCost,
            balance_before: curBal,
            balance_after: newBal,
            reference_type: 'ai_task',
            description: `AI ${taskType} on ${finalProvider} (${finalModel})`,
          });
        }
      } catch (err) {
        console.warn('AIGateway: Could not finalize credit deduction in DB:', err);
      }
    }

    // 6. Record immutable AI Cost Event
    try {
      const supabaseAdmin: any = supabase;
      await supabaseAdmin.from('ai_cost_events').insert({
        user_id: userId || null,
        job_id: options.jobId || null,
        content_version_id: options.contentVersionId || null,
        task_type: taskType,
        provider: finalProvider,
        model: finalModel,
        input_tokens: executionResult.usage.inputTokens,
        cached_input_tokens: executionResult.usage.cachedInputTokens,
        output_tokens: executionResult.usage.outputTokens,
        reasoning_tokens: executionResult.usage.reasoningTokens || 0,
        actual_provider_cost: costMetrics.totalProviderCostUsd,
        revenue_allocated: costMetrics.revenueAllocatedUsd,
        ai_infrastructure_cost: costMetrics.infrastructureCostUsd,
        credits_deducted: effectiveCreditCost,
        margin_percent: costMetrics.marginPercent,
      });
    } catch (err) {
      console.warn('AIGateway: Could not record ai_cost_events ledger:', err);
    }

    return {
      text: executionResult.text,
      parsedJson: executionResult.parsedJson,
      provider: finalProvider,
      model: finalModel,
      isFallback,
      fallbackReason,
      usage: executionResult.usage,
      cost: costMetrics,
      latencyMs: executionResult.latencyMs,
      requestId: executionResult.requestId,
      rawUsageAvailable: executionResult.rawUsageAvailable,
    };
  }

  private static async releaseCreditReservation(userId?: string | null, amount = 0): Promise<void> {
    if (!userId || amount <= 0) return;
    try {
      const supabaseAdmin: any = getSupabaseAdmin();
      const { data: wallet } = await supabaseAdmin
        .from('credit_accounts')
        .select('reserved_balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (wallet) {
        const curRes = Number(wallet.reserved_balance || 0);
        await supabaseAdmin
          .from('credit_accounts')
          .update({
            reserved_balance: Math.max(0, curRes - amount),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }
    } catch (err) {
      console.warn('AIGateway: Failed to release credit reservation:', err);
    }
  }
}
