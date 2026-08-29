import OpenAI from 'openai';
import {
  ProviderAdapter,
  AdapterGenerationResult,
  AIProviderError,
} from './provider-adapter';
import {
  AIProviderId,
  AIGenerationOptions,
  AITokenUsage,
  AIProviderErrorDetails,
  ProviderConnectionTestResult,
  ModelVerificationItem,
} from '../types';

export class OpenAIProvider extends ProviderAdapter {
  public readonly providerId: AIProviderId = 'openai';
  public readonly name = 'OpenAI API';

  // Candidate standard production models to probe
  public static readonly CANDIDATE_MODELS = [
    'gpt-4o-mini',
    'gpt-4o',
    'o3-mini',
    'o1-mini',
    'o1',
    'gpt-4-turbo',
  ];

  private getApiKey(): string | null {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key.trim().length === 0) return null;
    return key.trim();
  }

  private getClient(): OpenAI {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new AIProviderError({
        provider: 'openai',
        isAuthError: true,
        isRateLimit: false,
        isRetryable: false,
        isModelNotFound: false,
        errorCode: 'OPENAI_KEY_MISSING',
        rawMessage: 'OPENAI_API_KEY is not configured in server environment variables.',
      });
    }

    return new OpenAI({
      apiKey,
      timeout: 60000,
      maxRetries: 0, // We handle retries centrally with backoff in ProviderAdapter
    });
  }

  public isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  public async testConnection(probeModel = 'gpt-4o-mini'): Promise<ProviderConnectionTestResult> {
    const testedAt = new Date().toISOString();
    if (!this.isConfigured()) {
      return {
        provider: 'openai',
        connected: false,
        latencyMs: null,
        testedAt,
        errorCode: 'NOT_CONFIGURED',
        errorMessage: 'OPENAI_API_KEY is not configured in server environment variables.',
        health: 'NOT_CONFIGURED',
      };
    }

    const start = performance.now();
    try {
      const client = this.getClient();
      const response = await client.chat.completions.create({
        model: probeModel,
        messages: [{ role: 'user', content: 'Ping. Respond with "PONG".' }],
        max_tokens: 10,
        temperature: 0.1,
      });

      const latencyMs = Math.round(performance.now() - start);
      const text = response.choices[0]?.message?.content || '';
      const isSuccess = text.length > 0;

      return {
        provider: 'openai',
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
        provider: 'openai',
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
        provider: 'openai',
        model: modelId,
        available: false,
        verifiedAt,
        capabilities: {
          text: true,
          image: modelId.includes('4o'),
          audio: false,
          video: false,
          reasoning: modelId.startsWith('o1') || modelId.startsWith('o3'),
          structuredOutput: true,
        },
        error: 'OPENAI_API_KEY is missing.',
      };
    }

    const start = performance.now();
    try {
      const client = this.getClient();
      const response = await client.chat.completions.create({
        model: modelId,
        messages: [{ role: 'user', content: 'Verify medical model availability. Reply: OK' }],
        max_tokens: 10,
        temperature: 0.1,
      });

      const latencyMs = Math.round(performance.now() - start);
      const text = response.choices[0]?.message?.content || '';
      const available = text.length > 0;

      return {
        provider: 'openai',
        model: modelId,
        available,
        verifiedAt,
        latencyMs,
        capabilities: {
          text: true,
          image: modelId.includes('4o'),
          audio: false,
          video: false,
          reasoning: modelId.startsWith('o1') || modelId.startsWith('o3'),
          structuredOutput: true,
        },
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      const norm = this.normalizeError(err);
      return {
        provider: 'openai',
        model: modelId,
        available: false,
        verifiedAt,
        latencyMs,
        capabilities: {
          text: true,
          image: modelId.includes('4o'),
          audio: false,
          video: false,
          reasoning: modelId.startsWith('o1') || modelId.startsWith('o3'),
          structuredOutput: true,
        },
        error: norm.rawMessage,
      };
    }
  }

  public async discoverModels(): Promise<ModelVerificationItem[]> {
    const verifiedAt = new Date().toISOString();
    if (!this.isConfigured()) {
      return OpenAIProvider.CANDIDATE_MODELS.map((modelId) => ({
        provider: 'openai' as const,
        model: modelId,
        available: false,
        verifiedAt,
        capabilities: {
          text: true,
          image: modelId.includes('4o'),
          audio: false,
          video: false,
          reasoning: modelId.startsWith('o1') || modelId.startsWith('o3'),
          structuredOutput: true,
        },
        error: 'API key not configured in environment',
      }));
    }

    try {
      // First, fetch actual models list from OpenAI endpoint
      const client = this.getClient();
      const listRes = await client.models.list();
      const remoteModelIds = new Set((listRes.data || []).map((m) => m.id));

      // Filter and probe candidate models that exist on the account
      const results: ModelVerificationItem[] = [];

      for (const candidate of OpenAIProvider.CANDIDATE_MODELS) {
        if (remoteModelIds.has(candidate)) {
          // Probe actual availability for completion
          const verified = await this.verifyModel(candidate);
          results.push(verified);
        } else {
          results.push({
            provider: 'openai',
            model: candidate,
            available: false,
            verifiedAt,
            capabilities: {
              text: true,
              image: candidate.includes('4o'),
              audio: false,
              video: false,
              reasoning: candidate.startsWith('o1') || candidate.startsWith('o3'),
              structuredOutput: true,
            },
            error: `Model '${candidate}' not found on active OpenAI account.`,
          });
        }
      }

      return results;
    } catch (err: any) {
      // Fall back to direct probe of candidate models
      return Promise.all(OpenAIProvider.CANDIDATE_MODELS.map((m) => this.verifyModel(m)));
    }
  }

  public async generate(options: AIGenerationOptions): Promise<AdapterGenerationResult> {
    const model = options.preferredModel || 'gpt-4o-mini';
    const start = performance.now();

    return this.executeWithRetry(
      async (signal) => {
        const client = this.getClient();

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

        if (options.systemInstruction && options.systemInstruction.trim().length > 0) {
          messages.push({
            role: 'system',
            content: options.systemInstruction.trim(),
          });
        }

        messages.push({
          role: 'user',
          content: options.prompt,
        });

        const params: OpenAI.Chat.ChatCompletionCreateParams = {
          model,
          messages,
          temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
        };

        if (options.maxOutputTokens) {
          // O1/O3 reasoning models use max_completion_tokens
          if (model.startsWith('o1') || model.startsWith('o3')) {
            params.max_completion_tokens = options.maxOutputTokens;
            // reasoning models do not take custom temperature
            delete (params as any).temperature;
          } else {
            params.max_tokens = options.maxOutputTokens;
          }
        }

        if (options.responseMimeType === 'application/json' || options.responseSchema) {
          if (options.responseSchema) {
            params.response_format = {
              type: 'json_schema',
              json_schema: {
                name: 'structured_response',
                strict: true,
                schema: options.responseSchema,
              },
            };
          } else {
            params.response_format = { type: 'json_object' };
          }
        }

        const response = await client.chat.completions.create(params, { signal });
        const latencyMs = Math.round(performance.now() - start);

        const choice = response.choices[0];
        const text = choice?.message?.content || '';

        const usageDetails = response.usage;
        const inTokens = usageDetails?.prompt_tokens || Math.ceil(options.prompt.length / 4);
        const outTokens = usageDetails?.completion_tokens || Math.ceil(text.length / 4);
        const cachedIn = (usageDetails as any)?.prompt_tokens_details?.cached_tokens || 0;
        const reasoningTokens = (usageDetails as any)?.completion_tokens_details?.reasoning_tokens || 0;

        const usage: AITokenUsage = {
          inputTokens: inTokens,
          cachedInputTokens: cachedIn,
          outputTokens: outTokens,
          reasoningTokens,
          totalTokens: inTokens + outTokens,
        };

        let parsedJson: any = undefined;
        if (options.responseMimeType === 'application/json' || options.responseSchema) {
          try {
            parsedJson = JSON.parse(text);
          } catch {
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
          provider: 'openai',
          model,
          usage,
          latencyMs,
          requestId: response.id,
          rawUsageAvailable: Boolean(response.usage),
        };
      },
      options.timeoutMs || 45000,
      options.maxRetries ?? 2
    );
  }

  public normalizeError(err: any): AIProviderErrorDetails {
    const rawMessage = err?.message || String(err || 'Unknown OpenAI error');
    const status = err?.status || err?.statusCode || (rawMessage.includes('429') ? 429 : 500);

    const isRateLimit =
      status === 429 ||
      rawMessage.toLowerCase().includes('rate limit') ||
      rawMessage.toLowerCase().includes('quota') ||
      rawMessage.toLowerCase().includes('insufficient_quota');

    const isAuthError =
      status === 401 ||
      status === 403 ||
      rawMessage.toLowerCase().includes('invalid_api_key') ||
      rawMessage.toLowerCase().includes('incorrect api key');

    const isModelNotFound =
      status === 404 ||
      rawMessage.toLowerCase().includes('model_not_found') ||
      rawMessage.toLowerCase().includes('does not exist') ||
      rawMessage.toLowerCase().includes('no access');

    const isRetryable =
      !isAuthError &&
      !isModelNotFound &&
      (status >= 500 ||
        status === 408 ||
        rawMessage.toLowerCase().includes('timeout') ||
        rawMessage.toLowerCase().includes('econnreset') ||
        rawMessage.toLowerCase().includes('network'));

    let errorCode = 'OPENAI_GENERIC_ERROR';
    if (isRateLimit) errorCode = 'RATE_LIMIT_EXCEEDED';
    else if (isAuthError) errorCode = 'INVALID_API_KEY';
    else if (isModelNotFound) errorCode = 'MODEL_NOT_FOUND';
    else if (isRetryable) errorCode = 'SERVICE_UNAVAILABLE';

    return {
      provider: 'openai',
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
