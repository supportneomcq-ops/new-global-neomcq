import { getSupabaseAdmin } from './supabase';
import { AIGateway } from './ai/ai-gateway';
import { TaskRouter } from './ai/task-router';

export interface AIUsageMetrics {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  providerCost: number;
  infrastructureCost: number;
  totalCogs: number;
  revenueAllocated: number;
  creditsDeducted: number;
  margin: number;
}

/**
 * Centered Server-Side AI Cost, Routing, and Margin Engine
 */
export class AICostEngine {
  private static getAdminClient() {
    return getSupabaseAdmin();
  }

  /**
   * Pre-flight prediction of credit cost range for the user dashboard or confirmation UI
   */
  static async estimateTaskCost(taskType: string): Promise<{ minCredits: number; maxCredits: number; estimatedText: string }> {
    const rule = await TaskRouter.getRuleForTask(taskType);
    const baseCredits = rule.credit_cost;
    const min = Math.max(1, Math.floor(baseCredits * 0.8));
    const max = Math.ceil(baseCredits * 1.5);

    return {
      minCredits: min,
      maxCredits: max,
      estimatedText: `${min} - ${max} credits`,
    };
  }

  /**
   * Executes AI Request with complete fallback, token budgeting, credit charging, and margin auditing
   */
  static async executeAIRequest(
    userId: string,
    taskType: string,
    prompt: string,
    systemInstruction: string = '',
    options: {
      useBatch?: boolean;
      customModel?: string;
      responseMimeType?: string;
      responseSchema?: any;
    } = {}
  ): Promise<{ text: string; metrics: AIUsageMetrics; modelUsed: string; providerUsed: string }> {
    const result = await AIGateway.generate({
      userId,
      taskType,
      prompt,
      systemInstruction,
      preferredModel: options.customModel,
      responseMimeType: options.responseMimeType,
      responseSchema: options.responseSchema,
    });

    return {
      text: result.text,
      modelUsed: result.model,
      providerUsed: result.provider,
      metrics: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cachedInputTokens: result.usage.cachedInputTokens,
        reasoningTokens: result.usage.reasoningTokens || 0,
        providerCost: result.cost.totalProviderCostUsd,
        infrastructureCost: result.cost.infrastructureCostUsd,
        totalCogs: result.cost.totalCogsUsd,
        revenueAllocated: result.cost.revenueAllocatedUsd,
        creditsDeducted: Number(((result.cost.revenueAllocatedUsd || 0.015) / 0.01).toFixed(2)),
        margin: result.cost.marginPercent,
      },
    };
  }
}
