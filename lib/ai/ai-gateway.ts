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
import { randomUUID } from 'crypto';
import { reservePlatformAIBudget, settlePlatformAIBudget, releasePlatformAIBudget } from './platform-budget';

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

  private static async reservePlatformBudget(
    taskType: string,
    route: {
      primaryProvider: AIProviderId;
      primaryModel: string;
      fallbackProvider: AIProviderId;
      fallbackModel: string;
      maxOutputTokens: number;
    },
    userId: string | null | undefined,
    requestId: string
  ): Promise<string> {
    const rule = await TaskRouter.getRuleForTask(taskType);
    const [primaryMeta, fallbackMeta, routingResult] = await Promise.all([
      ModelRegistry.getModel(route.primaryProvider, route.primaryModel),
      ModelRegistry.getModel(route.fallbackProvider, route.fallbackModel),
      (getSupabaseAdmin() as any)
        .from('ai_task_routing')
        .select('cost_ceiling')
        .eq('task_type', taskType)
        .maybeSingle(),
    ]);

    if (routingResult.error) {
      throw new Error('AI platform budget configuration could not be verified.');
    }
    if (!primaryMeta || !fallbackMeta) {
      throw new Error('Verified model pricing is unavailable; AI generation was blocked.');
    }

    const inputCap = Math.max(1, Number(rule.max_input_tokens || 8192));
    const outputCap = Math.max(1, Number(route.maxOutputTokens || rule.max_output_tokens || 4096));
    const primaryMaxCost =
      (inputCap * primaryMeta.input_price + outputCap * primaryMeta.output_price) / 1_000_000;
    const fallbackMaxCost =
      (inputCap * fallbackMeta.input_price + outputCap * fallbackMeta.output_price) / 1_000_000;
    const configuredCeiling = Number(routingResult.data?.cost_ceiling || 0);
    const reservationAmount = Math.max(configuredCeiling, (primaryMaxCost + fallbackMaxCost) * 1.5, 0.005);

    return reservePlatformAIBudget({
      idempotencyKey: `ai-gateway:${requestId}`,
      taskType,
      provider: route.primaryProvider,
      model: route.primaryModel,
      amountUsd: Number(reservationAmount.toFixed(6)),
      userId,
      requestId,
      metadata: {
        fallbackProvider: route.fallbackProvider,
        fallbackModel: route.fallbackModel,
        inputTokenCap: inputCap,
        outputTokenCap: outputCap,
        configuredCostCeilingUsd: configuredCeiling || null,
      },
    });
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

    // Credit RPCs accept integer amounts; use the same rounded amount for reservation,
    // consumption, ledger entries, and cost reporting.
    const effectiveCreditCost = Math.max(0, Math.ceil(Number(route.creditCost) || 0));
    const userId = options.userId;

    // 2. Reserve credits atomically through the authoritative database RPC.
    // Never continue with unmetered execution when a user's wallet cannot be verified.
    let reservedCredits = 0;
    let alreadyChargedForJob = false;

    if (userId && options.jobId && effectiveCreditCost > 0) {
      const { data: priorCharge, error: priorChargeError } = await (supabase as any)
        .from('credit_ledger')
        .select('id')
        .eq('user_id', userId)
        .eq('transaction_type', 'AI_USAGE')
        .eq('reference_type', 'ai_job')
        .eq('reference_id', options.jobId)
        .limit(1)
        .maybeSingle();

      if (priorChargeError) {
        console.error('AIGateway: Could not verify prior job charge:', priorChargeError.message);
        throw new Error('Could not verify your AI credit balance. Please retry shortly.');
      }
      alreadyChargedForJob = Boolean(priorCharge);
    }

    if (userId && effectiveCreditCost > 0 && !alreadyChargedForJob) {
      const { data: reservationId, error: reserveError } = await (supabase as any).rpc('credit_reserve', {
        p_user_id: userId,
        p_amount: effectiveCreditCost,
        p_task: taskType,
        p_metadata: { description: `Reserved credits for AI task: ${taskType}` },
      });

      if (reserveError || !reservationId) {
        const detail = String(reserveError?.message || 'Credit reservation failed');
        if (/INSUFFICIENT_CREDITS/i.test(detail)) {
          throw new Error(`Insufficient credits. Required: ${effectiveCreditCost}. Please top up your credits.`);
        }
        if (/frozen/i.test(detail)) {
          throw new Error('AI generation is paused on your account. Please contact support.');
        }
        console.error('AIGateway: Credit reservation failed:', detail);
        throw new Error('Could not verify or reserve your AI credits. Please retry shortly.');
      }
      reservedCredits = effectiveCreditCost;
    }

    // Reserve the platform's 60% AI pool before any provider request. Student credits
    // and platform cash budget are separate controls and both must pass.
    const platformBudgetRequestId = options.jobId || randomUUID();
    let platformReservationId: string | null = null;
    try {
      platformReservationId = await this.reservePlatformBudget(taskType, route, userId, platformBudgetRequestId);
    } catch (budgetError) {
      await this.releaseCreditReservation(userId, reservedCredits, taskType);
      throw budgetError;
    }

    // 3. Execution with Fallback Hierarchy
    let primaryAdapter: ProviderAdapter;
    try {
      primaryAdapter = this.getAdapter(route.primaryProvider);
    } catch (providerErr) {
      if (platformReservationId) await releasePlatformAIBudget(platformReservationId, 'provider_adapter_resolution_failed_before_request');
      await this.releaseCreditReservation(userId, reservedCredits, taskType);
      const detail = providerErr instanceof Error ? providerErr.message : String(providerErr);
      throw new Error(`AI routing configuration error: ${detail}`);
    }

    let isFallback = false;
    let fallbackReason: string | undefined = undefined;
    let providerRequestAttempted = false;
    let primaryRequestAttempted = false;
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

      providerRequestAttempted = true;
      primaryRequestAttempted = true;
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
          providerRequestAttempted = true;
          executionResult = await fallbackAdapter.generate(fallbackPayload);
          finalProvider = route.fallbackProvider;
          finalModel = route.fallbackModel;
        } catch (fallbackErr: any) {
          const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          // A provider request was sent but failed without reliable usage details.
          // Keep the unused reservation held until an operator reconciles the provider bill.
          if (platformReservationId && providerRequestAttempted) {
            try {
              await settlePlatformAIBudget({
                reservationId: platformReservationId,
                actualCostUsd: 0,
                provider: finalProvider,
                model: finalModel,
                requestId: platformBudgetRequestId,
                uncertain: true,
                metadata: { providerFailure: true, primaryError: primaryMsg, fallbackError: fallbackMsg },
              });
            } catch (budgetError) {
              console.error('AIGateway: Could not mark failed provider spend uncertain:', budgetError);
            }
          } else if (platformReservationId) {
            await releasePlatformAIBudget(platformReservationId, 'provider_requests_not_started');
          }
          await this.releaseCreditReservation(userId, reservedCredits, taskType);
          throw new Error(
            `AIGateway Failover Error: All configured providers failed. Primary: ${primaryMsg}. Fallback: ${fallbackMsg}`
          );
        }
      } else {
        if (platformReservationId && providerRequestAttempted) {
          try {
            await settlePlatformAIBudget({
              reservationId: platformReservationId,
              actualCostUsd: 0,
              provider: finalProvider,
              model: finalModel,
              requestId: platformBudgetRequestId,
              uncertain: true,
              metadata: { providerFailure: true, primaryError: primaryMsg },
            });
          } catch (budgetError) {
            console.error('AIGateway: Could not mark failed provider spend uncertain:', budgetError);
          }
        } else if (platformReservationId) {
          await releasePlatformAIBudget(platformReservationId, 'provider_requests_not_started');
        }
        await this.releaseCreditReservation(userId, reservedCredits, taskType);
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

    // 5. Settle provider COGS and the platform reservation in one database transaction.
    // A fallback after a failed primary keeps the unspent remainder held for reconciliation.
    if (platformReservationId) {
      try {
        await settlePlatformAIBudget({
          reservationId: platformReservationId,
          actualCostUsd: costMetrics.totalProviderCostUsd,
          provider: finalProvider,
          model: finalModel,
          inputTokens: executionResult.usage.inputTokens,
          cachedInputTokens: executionResult.usage.cachedInputTokens,
          outputTokens: executionResult.usage.outputTokens,
          reasoningTokens: executionResult.usage.reasoningTokens || 0,
          revenueAllocatedUsd: userId ? costMetrics.revenueAllocatedUsd : 0,
          infrastructureCostUsd: costMetrics.infrastructureCostUsd,
          creditsDeducted: userId ? effectiveCreditCost : 0,
          requestId: executionResult.requestId || options.jobId || platformBudgetRequestId,
          uncertain: isFallback && primaryRequestAttempted,
          metadata: { fallbackUsed: isFallback, fallbackReason: fallbackReason || null },
        });
      } catch (settlementError) {
        await this.releaseCreditReservation(userId, reservedCredits, taskType);
        throw settlementError;
      }
    }

    // 6. Consume the user credit reservation.
    if (userId && reservedCredits > 0) {
      const { error: consumeError } = await (supabase as any).rpc('credit_consume', {
        p_user_id: userId,
        p_amount: reservedCredits,
        p_task: taskType,
        p_job_id: options.jobId || null,
        p_metadata: { description: `AI ${taskType} on ${finalProvider} (${finalModel})` },
      });

      if (consumeError) {
        console.error('AIGateway: Credit consumption failed:', consumeError.message);
        await this.releaseCreditReservation(userId, reservedCredits, taskType);
        throw new Error('AI output could not be finalized against your credit balance. Please retry.');
      }
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

  private static async releaseCreditReservation(
    userId?: string | null,
    amount = 0,
    task = 'ai-generation'
  ): Promise<void> {
    if (!userId || amount <= 0) return;
    try {
      const supabaseAdmin: any = getSupabaseAdmin();
      const { error } = await supabaseAdmin.rpc('credit_release', {
        p_user_id: userId,
        p_amount: amount,
        p_task: task,
        p_metadata: { description: `Released reserved credits after failed AI task: ${task}` },
      });
      if (error) {
        console.error('AIGateway: Credit reservation release failed:', error.message);
      }
    } catch (err) {
      console.error('AIGateway: Credit reservation release failed:', err);
    }
  }
}
