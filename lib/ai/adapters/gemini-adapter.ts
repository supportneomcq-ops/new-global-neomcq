import { GoogleGenAI } from '@google/genai';
import {
  ProviderAdapter,
  AIProviderError,
} from './provider-adapter.ts';
import type { AdapterGenerationResult } from './provider-adapter.ts';
import type {
  AIProviderId,
  AIGenerationOptions,
  AITokenUsage,
  AIProviderErrorDetails,
  ProviderConnectionTestResult,
  ModelVerificationItem,
} from '../types.ts';

export class GoogleGeminiProvider extends ProviderAdapter {
  public readonly providerId: AIProviderId = 'gemini';
  public readonly name = 'Google Gemini API';

  // Candidate models to probe/verify
  public static readonly CANDIDATE_MODELS = [
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
  ];

  private getApiKey(): string | null {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key || key.trim().length === 0) return null;
    return key.trim();
  }

  private getClient(): GoogleGenAI {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new AIProviderError({
        provider: 'gemini',
        isAuthError: true,
        isRateLimit: false,
        isRetryable: false,
        isModelNotFound: false,
        errorCode: 'GEMINI_KEY_MISSING',
        rawMessage: 'GEMINI_API_KEY is not configured in server environment variables.',
      });
    }

    return new GoogleGenAI({
      apiKey,
    });
  }

  public isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  public async testConnection(probeModel = 'gemini-3.5-flash'): Promise<ProviderConnectionTestResult> {
    const testedAt = new Date().toISOString();
    if (!this.isConfigured()) {
      return {
        provider: 'gemini',
        connected: false,
        latencyMs: null,
        testedAt,
        errorCode: 'NOT_CONFIGURED',
        errorMessage: 'GEMINI_API_KEY is not configured in server environment variables.',
        health: 'NOT_CONFIGURED',
      };
    }

    const start = performance.now();
    try {
      const ai = this.getClient();
      // Fast probe with minimal tokens
      const response = await ai.models.generateContent({
        model: probeModel,
        contents: 'Ping. Respond with "PONG".',
        config: {
          maxOutputTokens: 10,
          temperature: 0.1,
        },
      });

      const latencyMs = Math.round(performance.now() - start);
      const text = response.text || '';
      const isSuccess = text.length > 0;

      return {
        provider: 'gemini',
        connected: isSuccess,
        latencyMs,
        testedAt,
        modelTested: probeModel,
        health: isSuccess ? 'HEALTHY' : 'DEGRADED',
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      const norm = this.normalizeError(err);
      return {
        provider: 'gemini',
        connected: false,
        latencyMs,
        testedAt,
        errorCode: norm.errorCode,
        errorMessage: norm.rawMessage,
        modelTested: probeModel,
        health: norm.isRateLimit ? 'RATE_LIMITED' : 'UNAVAILABLE',
      };
    }
  }

  public async verifyModel(modelId: string): Promise<ModelVerificationItem> {
    const verifiedAt = new Date().toISOString();
    if (!this.isConfigured()) {
      return {
        provider: 'gemini',
        model: modelId,
        available: false,
        verifiedAt,
        capabilities: {
          text: true,
          image: true,
          audio: false,
          video: false,
          reasoning: modelId.includes('3.7') || modelId.includes('pro'),
          structuredOutput: true,
        },
        error: 'GEMINI_API_KEY is missing.',
      };
    }

    const start = performance.now();
    try {
      const ai = this.getClient();
      const response = await ai.models.generateContent({
        model: modelId,
        contents: 'Verify medical model availability. Reply: OK',
        config: {
          maxOutputTokens: 10,
          temperature: 0.1,
        },
      });

      const latencyMs = Math.round(performance.now() - start);
      const available = Boolean(response.text && response.text.length > 0);

      return {
        provider: 'gemini',
        model: modelId,
        available,
        verifiedAt,
        latencyMs,
        capabilities: {
          text: true,
          image: true,
          audio: false,
          video: false,
          reasoning: modelId.includes('3.7') || modelId.includes('pro'),
          structuredOutput: true,
        },
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      const norm = this.normalizeError(err);
      return {
        provider: 'gemini',
        model: modelId,
        available: false,
        verifiedAt,
        latencyMs,
        capabilities: {
          text: true,
          image: true,
          audio: false,
          video: false,
          reasoning: modelId.includes('3.7') || modelId.includes('pro'),
          structuredOutput: true,
        },
        error: norm.rawMessage,
      };
    }
  }

  public async discoverModels(): Promise<ModelVerificationItem[]> {
    const verifiedAt = new Date().toISOString();
    if (!this.isConfigured()) {
      return GoogleGeminiProvider.CANDIDATE_MODELS.map((modelId) => ({
        provider: 'gemini' as const,
        model: modelId,
        available: false,
        verifiedAt,
        capabilities: {
          text: true,
          image: true,
          audio: false,
          video: false,
          reasoning: modelId.includes('3.7') || modelId.includes('pro'),
          structuredOutput: true,
        },
        error: 'API key not configured in environment',
      }));
    }

    // Probe all candidate models in parallel
    const results = await Promise.all(
      GoogleGeminiProvider.CANDIDATE_MODELS.map((modelId) => this.verifyModel(modelId))
    );

    return results;
  }

  public async generate(options: AIGenerationOptions): Promise<AdapterGenerationResult> {
    const model = options.preferredModel || 'gemini-3.5-flash';
    const start = performance.now();

    return this.executeWithRetry(
      async (signal) => {
        const ai = this.getClient();

        // Build config payload
        const config: any = {
          temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
        };

        if (options.maxOutputTokens) {
          config.maxOutputTokens = options.maxOutputTokens;
        }

        if (options.systemInstruction && options.systemInstruction.trim().length > 0) {
          config.systemInstruction = options.systemInstruction.trim();
        }

        if (options.responseMimeType) {
          config.responseMimeType = options.responseMimeType;
        }

        if (options.responseSchema) {
          config.responseSchema = options.responseSchema;
        }

        const response = await ai.models.generateContent({
          model,
          contents: options.prompt,
          config,
        });

        const latencyMs = Math.round(performance.now() - start);
        const text = response.text || '';

        // Extract usage tokens accurately
        const inTokens = response.usageMetadata?.promptTokenCount || Math.ceil(options.prompt.length / 4);
        const outTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
        const cachedIn = response.usageMetadata?.cachedContentTokenCount || 0;

        const usage: AITokenUsage = {
          inputTokens: inTokens,
          cachedInputTokens: cachedIn,
          outputTokens: outTokens,
          totalTokens: inTokens + outTokens,
        };

        let parsedJson: any = undefined;
        if (options.responseMimeType === 'application/json' || options.responseSchema) {
          try {
            parsedJson = JSON.parse(text);
          } catch {
            // Attempt clean markdown block extraction if wrapped
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
              try {
                parsedJson = JSON.parse(jsonMatch[1]);
              } catch {
                // leave as undefined
              }
            }
          }
        }

        return {
          text,
          parsedJson,
          provider: 'gemini',
          model,
          usage,
          latencyMs,
          rawUsageAvailable: Boolean(response.usageMetadata),
        };
      },
      options.timeoutMs || 45000,
      options.maxRetries ?? 2
    );
  }

  public normalizeError(err: any): AIProviderErrorDetails {
    const rawMessage = err?.message || String(err || 'Unknown Gemini error');
    const status = err?.status || err?.statusCode || (rawMessage.includes('429') ? 429 : 500);

    const isRateLimit =
      status === 429 ||
      rawMessage.toLowerCase().includes('rate limit') ||
      rawMessage.toLowerCase().includes('resource_exhausted') ||
      rawMessage.toLowerCase().includes('quota exceeded');

    const isAuthError =
      status === 401 ||
      status === 403 ||
      rawMessage.toLowerCase().includes('api_key_invalid') ||
      rawMessage.toLowerCase().includes('permission_denied') ||
      rawMessage.toLowerCase().includes('unauthenticated');

    const isModelNotFound =
      status === 404 ||
      rawMessage.toLowerCase().includes('not_found') ||
      rawMessage.toLowerCase().includes('is not found') ||
      rawMessage.toLowerCase().includes('unsupported model');

    const isRetryable =
      !isAuthError &&
      !isModelNotFound &&
      (status >= 500 ||
        status === 408 ||
        rawMessage.toLowerCase().includes('timeout') ||
        rawMessage.toLowerCase().includes('econnreset') ||
        rawMessage.toLowerCase().includes('network'));

    let errorCode = 'GEMINI_GENERIC_ERROR';
    if (isRateLimit) errorCode = 'RATE_LIMIT_EXCEEDED';
    else if (isAuthError) errorCode = 'INVALID_API_KEY';
    else if (isModelNotFound) errorCode = 'MODEL_NOT_FOUND';
    else if (isRetryable) errorCode = 'SERVICE_UNAVAILABLE';

    return {
      provider: 'gemini',
      statusCode: status,
      errorCode,
      isRateLimit,
      isRetryable,
      isAuthError,
      isModelNotFound,
      rawMessage,
    };
  }
}
