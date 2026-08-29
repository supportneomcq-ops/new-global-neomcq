/**
 * NeoMCQ Production AI Types & Interfaces
 */

export type AIProviderId = 'gemini' | 'openai';

export type AIHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'NOT_CONFIGURED';

export type VerificationStatus = 'verified' | 'unverified' | 'unavailable' | 'deprecated';

export interface ProviderModelMetadata {
  id?: string;
  provider: AIProviderId;
  model_id: string;
  display_name: string;
  active: boolean;
  input_price: number; // USD per 1M tokens
  cached_input_price: number; // USD per 1M tokens
  output_price: number; // USD per 1M tokens
  max_input_tokens: number;
  max_output_tokens: number;
  supports_text: boolean;
  supports_image: boolean;
  supports_audio: boolean;
  supports_video: boolean;
  supports_reasoning: boolean;
  supports_structured_output: boolean;
  last_verified_at: string | null;
  verification_status: VerificationStatus;
  verification_error?: string | null;
  latency_ms?: number | null;
}

export interface TaskRoutingRule {
  id?: string;
  task_type: string;
  display_name?: string;
  description?: string;
  primary_provider: AIProviderId;
  primary_model: string;
  fallback_provider: AIProviderId;
  fallback_model: string;
  credit_cost: number;
  temperature: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AITokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
  totalTokens: number;
}

export interface AIProviderCost {
  inputCostUsd: number;
  cachedInputCostUsd: number;
  outputCostUsd: number;
  totalProviderCostUsd: number;
  infrastructureCostUsd: number;
  totalCogsUsd: number;
  revenueAllocatedUsd: number;
  grossProfitUsd: number;
  marginPercent: number;
}

export interface AIGenerationOptions {
  userId?: string | null;
  taskType: string;
  prompt: string;
  systemInstruction?: string;
  preferredProvider?: AIProviderId;
  preferredModel?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: any; // JSON schema or Gemini Type
  jobId?: string | null;
  contentVersionId?: string | null;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface AIGenerationResult {
  text: string;
  parsedJson?: any;
  provider: AIProviderId;
  model: string;
  isFallback: boolean;
  fallbackReason?: string;
  usage: AITokenUsage;
  cost: AIProviderCost;
  latencyMs: number;
  requestId?: string;
  rawUsageAvailable: boolean;
}

export interface ProviderConnectionTestResult {
  provider: AIProviderId;
  connected: boolean;
  latencyMs: number | null;
  testedAt: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  modelTested?: string;
  health: AIHealthStatus;
}

export interface ModelVerificationItem {
  provider: AIProviderId;
  model: string;
  available: boolean;
  verifiedAt: string;
  capabilities: {
    text: boolean;
    image: boolean;
    audio: boolean;
    video: boolean;
    reasoning: boolean;
    structuredOutput: boolean;
  };
  latencyMs?: number | null;
  error?: string | null;
}

export interface AIProviderErrorDetails {
  provider: AIProviderId;
  model?: string;
  statusCode?: number;
  errorCode?: string;
  isRateLimit: boolean;
  isRetryable: boolean;
  isAuthError: boolean;
  isModelNotFound: boolean;
  rawMessage: string;
}
