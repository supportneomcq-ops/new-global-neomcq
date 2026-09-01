import { getSupabaseAdmin } from '../supabase/admin';
import type { ProviderModelMetadata, AIProviderId, VerificationStatus } from './types';
import { GoogleGeminiProvider } from './adapters/gemini-adapter';
import { OpenAIProvider } from './adapters/openai-adapter';

/**
 * Standard Production Pricing and Capability Seed Registry
 */
export const DEFAULT_MODEL_METADATA: ProviderModelMetadata[] = [
  // Google Gemini Models
  {
    provider: 'gemini',
    model_id: 'gemini-3.7-flash',
    display_name: 'Gemini 3.7 Flash (Hybrid Reasoning)',
    active: true,
    input_price: 0.10,
    cached_input_price: 0.025,
    output_price: 0.40,
    max_input_tokens: 1048576,
    max_output_tokens: 8192,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_video: false,
    supports_reasoning: true,
    supports_structured_output: true,
    last_verified_at: null,
    verification_status: 'unverified',
  },
  {
    provider: 'gemini',
    model_id: 'gemini-3.5-flash',
    display_name: 'Gemini 3.5 Flash (Standard Workhorse)',
    active: true,
    input_price: 0.05,
    cached_input_price: 0.0125,
    output_price: 0.20,
    max_input_tokens: 1048576,
    max_output_tokens: 8192,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_video: false,
    supports_reasoning: false,
    supports_structured_output: true,
    last_verified_at: null,
    verification_status: 'unverified',
  },
  {
    provider: 'gemini',
    model_id: 'gemini-3.1-flash-lite',
    display_name: 'Gemini 3.1 Flash-Lite (Low Latency / Extraction)',
    active: true,
    input_price: 0.015,
    cached_input_price: 0.00375,
    output_price: 0.06,
    max_input_tokens: 1048576,
    max_output_tokens: 8192,
    supports_text: true,
    supports_image: false,
    supports_audio: false,
    supports_video: false,
    supports_reasoning: false,
    supports_structured_output: true,
    last_verified_at: null,
    verification_status: 'unverified',
  },
  {
    provider: 'gemini',
    model_id: 'gemini-3.1-pro-preview',
    display_name: 'Gemini 3.1 Pro Preview (Complex STEM / Clinical)',
    active: true,
    input_price: 1.25,
    cached_input_price: 0.3125,
    output_price: 5.00,
    max_input_tokens: 2097152,
    max_output_tokens: 8192,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_video: false,
    supports_reasoning: true,
    supports_structured_output: true,
    last_verified_at: null,
    verification_status: 'unverified',
  },
  {
    provider: 'gemini',
    model_id: 'gemini-2.5-flash',
    display_name: 'Gemini 2.5 Flash',
    active: true,
    input_price: 0.075,
    cached_input_price: 0.0187,
    output_price: 0.30,
    max_input_tokens: 1048576,
    max_output_tokens: 8192,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_video: false,
    supports_reasoning: false,
    supports_structured_output: true,
    last_verified_at: null,
    verification_status: 'unverified',
  },

  // OpenAI Models
  {
    provider: 'openai',
    model_id: 'gpt-4o-mini',
    display_name: 'GPT-4o Mini (Fast Redundancy Fallback)',
    active: true,
    input_price: 0.15,
    cached_input_price: 0.075,
    output_price: 0.60,
    max_input_tokens: 128000,
    max_output_tokens: 16384,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_video: false,
    supports_reasoning: false,
    supports_structured_output: true,
    last_verified_at: null,
    verification_status: 'unverified',
  },
  {
    provider: 'openai',
    model_id: 'gpt-4o',
    display_name: 'GPT-4o (Omni High Quality Fallback)',
    active: true,
    input_price: 2.50,
    cached_input_price: 1.25,
    output_price: 10.00,
    max_input_tokens: 128000,
    max_output_tokens: 16384,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_video: false,
    supports_reasoning: false,
    supports_structured_output: true,
    last_verified_at: null,
    verification_status: 'unverified',
  },
  {
    provider: 'openai',
    model_id: 'o3-mini',
    display_name: 'o3-mini (High Reasoning Clinical Deduction)',
    active: true,
    input_price: 1.10,
    cached_input_price: 0.55,
    output_price: 4.40,
    max_input_tokens: 200000,
    max_output_tokens: 65536,
    supports_text: true,
    supports_image: false,
    supports_audio: false,
    supports_video: false,
    supports_reasoning: true,
    supports_structured_output: true,
    last_verified_at: null,
    verification_status: 'unverified',
  },
];

export class ModelRegistry {
  private static cache: Map<string, ProviderModelMetadata> = new Map();
  private static isInitialized = false;

  private static getCacheKey(provider: AIProviderId, modelId: string): string {
    return `${provider}:${modelId}`;
  }

  public static async initialize(): Promise<void> {
    if (this.isInitialized && this.cache.size > 0) return;

    // 1. Preload defaults
    for (const m of DEFAULT_MODEL_METADATA) {
      this.cache.set(this.getCacheKey(m.provider, m.model_id), { ...m });
    }

    // 2. Fetch overrides from database if accessible
    try {
      const supabase: any = getSupabaseAdmin();
      const { data: dbModels, error } = await supabase
        .from('ai_models')
        .select('*');

      if (!error && dbModels && dbModels.length > 0) {
        for (const row of dbModels) {
          const key = this.getCacheKey(row.provider as AIProviderId, row.model_id);
          const existing = this.cache.get(key) || {
            provider: row.provider as AIProviderId,
            model_id: row.model_id,
            display_name: row.display_name || row.model_id,
            active: row.enabled ?? true,
            input_price: Number(row.input_price_per_1m || 0.10),
            cached_input_price: Number(row.cached_input_price_per_1m || 0.025),
            output_price: Number(row.output_price_per_1m || 0.40),
            max_input_tokens: row.context_limit || 128000,
            max_output_tokens: row.max_output_tokens || 8192,
            supports_text: true,
            supports_image: false,
            supports_audio: false,
            supports_video: false,
            supports_reasoning: row.supports_thinking || false,
            supports_structured_output: row.supports_structured_output ?? true,
            last_verified_at: row.last_verified_at,
            verification_status: (row.enabled ? 'verified' : 'unavailable') as VerificationStatus,
          };

          this.cache.set(key, {
            ...existing,
            active: row.enabled ?? existing.active,
            input_price: Number(row.input_price_per_1m ?? existing.input_price),
            cached_input_price: Number(row.cached_input_price_per_1m ?? existing.cached_input_price),
            output_price: Number(row.output_price_per_1m ?? existing.output_price),
            last_verified_at: row.last_verified_at ?? existing.last_verified_at,
          });
        }
      }
    } catch (err) {
      console.warn('ModelRegistry: Could not fetch from ai_models table, using in-memory registry:', err);
    }

    this.isInitialized = true;
  }

  public static async getAllModels(): Promise<ProviderModelMetadata[]> {
    await this.initialize();
    return Array.from(this.cache.values());
  }

  public static async getModel(provider: AIProviderId, modelId: string): Promise<ProviderModelMetadata | null> {
    await this.initialize();
    return this.cache.get(this.getCacheKey(provider, modelId)) || null;
  }

  public static async getVerifiedActiveModels(provider?: AIProviderId): Promise<ProviderModelMetadata[]> {
    await this.initialize();
    const all = Array.from(this.cache.values());
    return all.filter((m) => {
      if (provider && m.provider !== provider) return false;
      return m.active && (m.verification_status === 'verified' || m.verification_status === 'unverified');
    });
  }

  /**
   * Run live verification on all candidate models against real provider APIs,
   * mark unavailable models inactive, record verification timestamp,
   * and persist state into DB.
   */
  public static async verifyAndSyncAll(
    geminiProvider: GoogleGeminiProvider,
    openaiProvider: OpenAIProvider
  ): Promise<{
    geminiResults: ProviderModelMetadata[];
    openaiResults: ProviderModelMetadata[];
    verifiedCount: number;
    unavailableCount: number;
  }> {
    await this.initialize();

    const [geminiDiscovered, openaiDiscovered] = await Promise.all([
      geminiProvider.discoverModels(),
      openaiProvider.discoverModels(),
    ]);

    const timestamp = new Date().toISOString();
    let verifiedCount = 0;
    let unavailableCount = 0;

    const updateList = (discovered: typeof geminiDiscovered, provider: AIProviderId) => {
      const results: ProviderModelMetadata[] = [];

      for (const disc of discovered) {
        const key = this.getCacheKey(provider, disc.model);
        const existing = this.cache.get(key) || {
          provider,
          model_id: disc.model,
          display_name: `${provider === 'gemini' ? 'Gemini' : 'OpenAI'} ${disc.model}`,
          active: disc.available,
          input_price: 0.10,
          cached_input_price: 0.025,
          output_price: 0.40,
          max_input_tokens: 128000,
          max_output_tokens: 8192,
          supports_text: disc.capabilities.text,
          supports_image: disc.capabilities.image,
          supports_audio: disc.capabilities.audio,
          supports_video: disc.capabilities.video,
          supports_reasoning: disc.capabilities.reasoning,
          supports_structured_output: disc.capabilities.structuredOutput,
          last_verified_at: timestamp,
          verification_status: disc.available ? 'verified' : 'unavailable',
        };

        const updated: ProviderModelMetadata = {
          ...existing,
          active: disc.available,
          verification_status: disc.available ? 'verified' : 'unavailable',
          verification_error: disc.error || null,
          last_verified_at: timestamp,
          latency_ms: disc.latencyMs || null,
          supports_text: disc.capabilities.text,
          supports_image: disc.capabilities.image,
          supports_audio: disc.capabilities.audio,
          supports_video: disc.capabilities.video,
          supports_reasoning: disc.capabilities.reasoning,
          supports_structured_output: disc.capabilities.structuredOutput,
        };

        if (disc.available) verifiedCount++;
        else unavailableCount++;

        this.cache.set(key, updated);
        results.push(updated);
      }

      return results;
    };

    const geminiResults = updateList(geminiDiscovered, 'gemini');
    const openaiResults = updateList(openaiDiscovered, 'openai');

    // Persist status updates to Supabase tables
    try {
      const supabase: any = getSupabaseAdmin();
      const allUpdated = [...geminiResults, ...openaiResults];

      for (const item of allUpdated) {
        await supabase
          .from('ai_models')
          .upsert(
            {
              provider: item.provider,
              model_id: item.model_id,
              display_name: item.display_name,
              enabled: item.active,
              input_price_per_1m: item.input_price,
              cached_input_price_per_1m: item.cached_input_price,
              output_price_per_1m: item.output_price,
              context_limit: item.max_input_tokens,
              max_output_tokens: item.max_output_tokens,
              supports_thinking: item.supports_reasoning,
              supports_structured_output: item.supports_structured_output,
              last_verified_at: timestamp,
              updated_at: timestamp,
            },
            { onConflict: 'model_id' }
          );
      }
    } catch (err) {
      console.warn('ModelRegistry: Could not persist verification to ai_models DB:', err);
    }

    return {
      geminiResults,
      openaiResults,
      verifiedCount,
      unavailableCount,
    };
  }

  public static async updateModelPriceOrStatus(
    provider: AIProviderId,
    modelId: string,
    updates: Partial<ProviderModelMetadata>
  ): Promise<ProviderModelMetadata | null> {
    await this.initialize();
    const key = this.getCacheKey(provider, modelId);
    const existing = this.cache.get(key);
    if (!existing) return null;

    const updated: ProviderModelMetadata = {
      ...existing,
      ...updates,
    };

    this.cache.set(key, updated);

    try {
      const supabase: any = getSupabaseAdmin();
      await supabase
        .from('ai_models')
        .update({
          enabled: updated.active,
          input_price_per_1m: updated.input_price,
          cached_input_price_per_1m: updated.cached_input_price,
          output_price_per_1m: updated.output_price,
          updated_at: new Date().toISOString(),
        })
        .eq('model_id', modelId);
    } catch (err) {
      console.warn('ModelRegistry: Failed to update DB:', err);
    }

    return updated;
  }
}
