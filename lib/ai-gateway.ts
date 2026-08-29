import { AIGateway as CanonicalAIGateway } from './ai/ai-gateway';
import { ModelRegistry } from './ai/model-registry';
import { validateServerAIEnvironment } from './ai/env-validator';

export interface ProviderKeyInfo {
  id: string;
  provider: 'gemini' | 'openai';
  label: string;
  maskedKey: string;
  source: 'env' | 'vault';
  status: 'active' | 'cooldown' | 'exhausted' | 'disabled';
  requestCount: number;
  failureCount: number;
  lastUsedAt: string | null;
  lastTestedAt: string | null;
  latencyMs: number | null;
  health: 'Healthy' | 'Degraded' | 'Unavailable' | 'Not Configured';
  errorDetails?: string | null;
}

export interface ProviderStatus {
  id: 'gemini' | 'openai';
  name: string;
  isPrimary: boolean;
  defaultModel: string;
  supportedModels: string[];
  keysCount: number;
  activeKeysCount: number;
  health: 'Healthy' | 'Degraded' | 'Unavailable' | 'Not Configured';
  configuredStatus: 'Configured' | 'Not Configured';
  latencyMs: number | null;
  lastHealthCheck: string | null;
  keys: ProviderKeyInfo[];
}

export interface AIGenerationMetrics {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  providerCostUsd: number;
  infrastructureCostUsd: number;
  totalCogsUsd: number;
  revenueAllocatedUsd: number;
  creditsDeducted: number;
  marginPercent: number;
  durationMs: number;
}

export class KeyVault {
  public static getGeminiKeys(): { raw: string; info: ProviderKeyInfo }[] {
    const envStatus = validateServerAIEnvironment();
    if (!envStatus.gemini.configured) return [];
    return [
      {
        raw: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
        info: {
          id: 'gemini_env_1',
          provider: 'gemini',
          label: 'GEMINI_API_KEY',
          maskedKey: envStatus.gemini.maskedKey || '••••••••',
          source: 'env',
          status: 'active',
          requestCount: 0,
          failureCount: 0,
          lastUsedAt: null,
          lastTestedAt: null,
          latencyMs: null,
          health: 'Healthy',
        },
      },
    ];
  }

  public static getOpenAIKeys(): { raw: string; info: ProviderKeyInfo }[] {
    const envStatus = validateServerAIEnvironment();
    if (!envStatus.openai.configured) return [];
    return [
      {
        raw: process.env.OPENAI_API_KEY || '',
        info: {
          id: 'openai_env_1',
          provider: 'openai',
          label: 'OPENAI_API_KEY',
          maskedKey: envStatus.openai.maskedKey || '••••••••',
          source: 'env',
          status: 'active',
          requestCount: 0,
          failureCount: 0,
          lastUsedAt: null,
          lastTestedAt: null,
          latencyMs: null,
          health: 'Healthy',
        },
      },
    ];
  }
}

export class AIGateway {
  /**
   * Status of all active providers
   */
  public static async getProvidersStatus(): Promise<ProviderStatus[]> {
    const envStatus = validateServerAIEnvironment();
    const allModels = await ModelRegistry.getAllModels();

    const geminiModels = allModels.filter((m) => m.provider === 'gemini');
    const openaiModels = allModels.filter((m) => m.provider === 'openai');

    return [
      {
        id: 'gemini',
        name: 'Google Gemini API',
        isPrimary: true,
        defaultModel: 'gemini-3.5-flash',
        supportedModels: geminiModels.map((m) => m.model_id),
        keysCount: envStatus.gemini.configured ? 1 : 0,
        activeKeysCount: envStatus.gemini.configured ? 1 : 0,
        health: envStatus.gemini.configured ? 'Healthy' : 'Not Configured',
        configuredStatus: envStatus.gemini.configured ? 'Configured' : 'Not Configured',
        latencyMs: null,
        lastHealthCheck: null,
        keys: KeyVault.getGeminiKeys().map((k) => k.info),
      },
      {
        id: 'openai',
        name: 'OpenAI API',
        isPrimary: false,
        defaultModel: 'gpt-4o-mini',
        supportedModels: openaiModels.map((m) => m.model_id),
        keysCount: envStatus.openai.configured ? 1 : 0,
        activeKeysCount: envStatus.openai.configured ? 1 : 0,
        health: envStatus.openai.configured ? 'Healthy' : 'Not Configured',
        configuredStatus: envStatus.openai.configured ? 'Configured' : 'Not Configured',
        latencyMs: null,
        lastHealthCheck: null,
        keys: KeyVault.getOpenAIKeys().map((k) => k.info),
      },
    ];
  }

  /**
   * Run real connectivity ping against provider
   */
  public static async testProvider(providerId: 'gemini' | 'openai'): Promise<{
    success: boolean;
    provider: 'gemini' | 'openai';
    latencyMs?: number | null;
    message: string;
    health: string;
    modelTested?: string;
  }> {
    const result = await CanonicalAIGateway.testProvider(providerId);
    return {
      success: result.connected,
      provider: result.provider,
      latencyMs: result.latencyMs,
      message: result.connected
        ? `Successfully reached ${result.provider.toUpperCase()} (${result.latencyMs}ms latency)`
        : `Connection failed: ${result.errorMessage || 'Unknown error'}`,
      health: result.health,
      modelTested: result.modelTested,
    };
  }

  /**
   * Canonical generateContent method used across application
   */
  public static async generateContent(params: {
    userId?: string;
    taskType: string;
    prompt: string;
    systemInstruction?: string;
    preferredProvider?: 'gemini' | 'openai';
    preferredModel?: string;
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: any;
    jobId?: string;
    contentVersionId?: string;
  }): Promise<{
    text: string;
    parsedJson?: any;
    modelUsed: string;
    providerUsed: string;
    metrics: AIGenerationMetrics;
  }> {
    const result = await CanonicalAIGateway.generate({
      userId: params.userId,
      taskType: params.taskType,
      prompt: params.prompt,
      systemInstruction: params.systemInstruction,
      preferredProvider: params.preferredProvider,
      preferredModel: params.preferredModel,
      temperature: params.temperature,
      maxOutputTokens: params.maxOutputTokens,
      responseMimeType: params.responseMimeType,
      responseSchema: params.responseSchema,
      jobId: params.jobId,
      contentVersionId: params.contentVersionId,
    });

    return {
      text: result.text,
      parsedJson: result.parsedJson,
      modelUsed: result.model,
      providerUsed: result.provider,
      metrics: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cachedInputTokens: result.usage.cachedInputTokens,
        providerCostUsd: result.cost.totalProviderCostUsd,
        infrastructureCostUsd: result.cost.infrastructureCostUsd,
        totalCogsUsd: result.cost.totalCogsUsd,
        revenueAllocatedUsd: result.cost.revenueAllocatedUsd,
        creditsDeducted: Number(
          ((result.cost.revenueAllocatedUsd || 0.015) / 0.01).toFixed(2)
        ),
        marginPercent: result.cost.marginPercent,
        durationMs: result.latencyMs,
      },
    };
  }
}
