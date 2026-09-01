import type {
  AIProviderId,
  AIGenerationOptions,
  AITokenUsage,
  AIProviderErrorDetails,
  ProviderConnectionTestResult,
  ModelVerificationItem,
} from '../types';

export class AIProviderError extends Error {
  public details: AIProviderErrorDetails;

  constructor(details: AIProviderErrorDetails) {
    super(`[${details.provider.toUpperCase()} ERROR] ${details.errorCode || 'UNKNOWN'}: ${details.rawMessage}`);
    this.name = 'AIProviderError';
    this.details = details;
  }
}

export interface AdapterGenerationResult {
  text: string;
  parsedJson?: any;
  provider: AIProviderId;
  model: string;
  usage: AITokenUsage;
  latencyMs: number;
  requestId?: string;
  rawUsageAvailable: boolean;
}

export abstract class ProviderAdapter {
  public abstract readonly providerId: AIProviderId;
  public abstract readonly name: string;

  /**
   * Check if provider credentials are set up server-side
   */
  public abstract isConfigured(): boolean;

  /**
   * Run a lightweight connectivity benchmark ping
   */
  public abstract testConnection(probeModel?: string): Promise<ProviderConnectionTestResult>;

  /**
   * Discover or validate available models against the real provider API
   */
  public abstract discoverModels(): Promise<ModelVerificationItem[]>;

  /**
   * Validate a specific model against the provider API
   */
  public abstract verifyModel(modelId: string): Promise<ModelVerificationItem>;

  /**
   * Execute content generation with structured output / retry capabilities
   */
  public abstract generate(options: AIGenerationOptions): Promise<AdapterGenerationResult>;

  /**
   * Helper: Normalized execution with timeout and retries
   */
  protected async executeWithRetry<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    timeoutMs = 60000,
    maxRetries = 2
  ): Promise<T> {
    let attempt = 0;
    let lastError: any;

    while (attempt <= maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const result = await fn(controller.signal);
        clearTimeout(timeoutId);
        return result;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        const normalized = this.normalizeError(err);

        // Do not retry on Auth failure, Invalid Model, or Client syntax errors
        if (normalized.isAuthError || normalized.isModelNotFound || (!normalized.isRetryable && !normalized.isRateLimit)) {
          throw new AIProviderError(normalized);
        }

        if (attempt <= maxRetries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 300, 8000);
          console.warn(
            `[${this.providerId.toUpperCase()}] Transient error encountered (attempt ${attempt}/${maxRetries}): ${normalized.rawMessage}. Retrying in ${backoff}ms...`
          );
          await new Promise((res) => setTimeout(res, backoff));
        } else {
          throw new AIProviderError(normalized);
        }
      }
    }

    throw lastError;
  }

  /**
   * Standardized error normalizer
   */
  public abstract normalizeError(err: any): AIProviderErrorDetails;
}
