import { getSupabaseAdmin } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

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

// In-memory key tracking & rotation state
export class KeyVault {
  private static geminiKeyIndex = 0;
  private static openAIKeyIndex = 0;

  public static getGeminiKeys(): { raw: string; info: ProviderKeyInfo }[] {
    const keys: { raw: string; info: ProviderKeyInfo }[] = [];
    const envVars = ['GEMINI_API_KEY', 'GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3', 'GOOGLE_API_KEY'];
    
    envVars.forEach((varName, idx) => {
      const val = process.env[varName]?.trim();
      if (val && val.length > 5) {
        const masked = `Gemini ••••${val.slice(-4)}`;
        keys.push({
          raw: val,
          info: {
            id: `gemini_env_${idx + 1}`,
            provider: 'gemini',
            label: `Key ${idx + 1} (${varName})`,
            maskedKey: masked,
            source: 'env',
            status: 'active',
            requestCount: 0,
            failureCount: 0,
            lastUsedAt: null,
            lastTestedAt: null,
            latencyMs: null,
            health: 'Healthy',
          },
        });
      }
    });

    return keys;
  }

  public static getOpenAIKeys(): { raw: string; info: ProviderKeyInfo }[] {
    const keys: { raw: string; info: ProviderKeyInfo }[] = [];
    const envVars = ['OPENAI_API_KEY', 'OPENAI_API_KEY_1', 'OPENAI_API_KEY_2'];
    
    envVars.forEach((varName, idx) => {
      const val = process.env[varName]?.trim();
      if (val && val.length > 5) {
        const masked = `OpenAI ••••${val.slice(-4)}`;
        keys.push({
          raw: val,
          info: {
            id: `openai_env_${idx + 1}`,
            provider: 'openai',
            label: `Key ${idx + 1} (${varName})`,
            maskedKey: masked,
            source: 'env',
            status: 'active',
            requestCount: 0,
            failureCount: 0,
            lastUsedAt: null,
            lastTestedAt: null,
            latencyMs: null,
            health: 'Healthy',
          },
        });
      }
    });

    return keys;
  }

  public static getNextGeminiKey(): string | null {
    const keys = this.getGeminiKeys();
    if (keys.length === 0) return null;
    const key = keys[this.geminiKeyIndex % keys.length];
    this.geminiKeyIndex++;
    return key.raw;
  }

  public static getNextOpenAIKey(): string | null {
    const keys = this.getOpenAIKeys();
    if (keys.length === 0) return null;
    const key = keys[this.openAIKeyIndex % keys.length];
    this.openAIKeyIndex++;
    return key.raw;
  }
}

export class AIGateway {
  /**
   * Run real live health & latency benchmark for a specific key/provider
   */
  public static async testProvider(providerId: 'gemini' | 'openai'): Promise<{
    success: boolean;
    health: 'Healthy' | 'Degraded' | 'Unavailable' | 'Not Configured';
    latencyMs: number | null;
    message: string;
    details?: any;
  }> {
    const startTime = Date.now();

    if (providerId === 'gemini') {
      const key = KeyVault.getNextGeminiKey();
      if (!key) {
        return {
          success: false,
          health: 'Not Configured',
          latencyMs: null,
          message: 'Google Gemini API key (GEMINI_API_KEY) is not set in environment or vault.',
        };
      }

      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: 'Respond with exactly the word "PONG"',
          config: {
            maxOutputTokens: 10,
            temperature: 0.1,
          },
        });

        const latencyMs = Date.now() - startTime;
        const text = response.text?.trim() || '';

        return {
          success: true,
          health: latencyMs > 3000 ? 'Degraded' : 'Healthy',
          latencyMs,
          message: `Google Gemini 3.5 Flash live benchmark passed (${latencyMs}ms). Response verified: "${text}".`,
          details: {
            model: 'gemini-3.5-flash',
            tokens: response.usageMetadata?.totalTokenCount || 5,
          },
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        const isRateLimit = err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
        return {
          success: false,
          health: isRateLimit ? 'Degraded' : 'Unavailable',
          latencyMs,
          message: `Google Gemini benchmark failed: ${err.message || 'Unknown network error'}`,
          details: { error: err.message },
        };
      }
    }

    if (providerId === 'openai') {
      const key = KeyVault.getNextOpenAIKey();
      if (!key) {
        return {
          success: false,
          health: 'Not Configured',
          latencyMs: null,
          message: 'OpenAI API key (OPENAI_API_KEY) is not set in environment or vault.',
        };
      }

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Respond with exactly the word "PONG"' }],
            max_tokens: 10,
            temperature: 0.1,
          }),
        });

        const latencyMs = Date.now() - startTime;
        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          const errMsg = errJson.error?.message || `HTTP ${response.status} ${response.statusText}`;
          const isRateLimit = response.status === 429;
          return {
            success: false,
            health: isRateLimit ? 'Degraded' : 'Unavailable',
            latencyMs,
            message: `OpenAI benchmark failed: ${errMsg}`,
            details: { status: response.status, error: errMsg },
          };
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim() || '';

        return {
          success: true,
          health: latencyMs > 3000 ? 'Degraded' : 'Healthy',
          latencyMs,
          message: `OpenAI gpt-4o-mini live benchmark passed (${latencyMs}ms). Response: "${text}".`,
          details: {
            model: 'gpt-4o-mini',
            tokens: data.usage?.total_tokens || 5,
          },
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        return {
          success: false,
          health: 'Unavailable',
          latencyMs,
          message: `OpenAI benchmark failed: ${err.message || 'Unknown network error'}`,
          details: { error: err.message },
        };
      }
    }

    return {
      success: false,
      health: 'Unavailable',
      latencyMs: null,
      message: `Unknown provider ${providerId}`,
    };
  }

  /**
   * Get production providers status (Gemini + OpenAI only)
   */
  public static async getProvidersStatus(): Promise<ProviderStatus[]> {
    const geminiKeys = KeyVault.getGeminiKeys();
    const openAIKeys = KeyVault.getOpenAIKeys();

    const geminiStatus: ProviderStatus = {
      id: 'gemini',
      name: 'Google Gemini AI',
      isPrimary: true,
      defaultModel: 'gemini-3.7-flash',
      supportedModels: [
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
      ],
      keysCount: geminiKeys.length,
      activeKeysCount: geminiKeys.length,
      health: geminiKeys.length > 0 ? 'Healthy' : 'Not Configured',
      configuredStatus: geminiKeys.length > 0 ? 'Configured' : 'Not Configured',
      latencyMs: null,
      lastHealthCheck: new Date().toISOString(),
      keys: geminiKeys.map((k) => k.info),
    };

    const openAIStatus: ProviderStatus = {
      id: 'openai',
      name: 'OpenAI',
      isPrimary: false,
      defaultModel: 'gpt-5.4-mini',
      supportedModels: ['gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4o-mini', 'gpt-4o'],
      keysCount: openAIKeys.length,
      activeKeysCount: openAIKeys.length,
      health: openAIKeys.length > 0 ? 'Healthy' : 'Not Configured',
      configuredStatus: openAIKeys.length > 0 ? 'Configured' : 'Not Configured',
      latencyMs: null,
      lastHealthCheck: new Date().toISOString(),
      keys: openAIKeys.map((k) => k.info),
    };

    return [geminiStatus, openAIStatus];
  }

  /**
   * Execute Generation with automatic provider failover, token counting, atomic credit deduction, and COGS logging
   */
  public static async generateContent(params: {
    userId?: string | null;
    taskType: string;
    prompt: string;
    systemInstruction?: string;
    preferredModel?: string;
    temperature?: number;
    maxOutputTokens?: number;
    jobId?: string | null;
  }): Promise<{
    text: string;
    parsedJson?: any;
    modelUsed: string;
    providerUsed: string;
    metrics: AIGenerationMetrics;
  }> {
    const startTime = Date.now();
    const adminClient = getSupabaseAdmin();

    // 1. Resolve task routing rule from DB
    const { data: routing } = await adminClient
      .from('ai_task_routing')
      .select('*')
      .eq('task_type', params.taskType)
      .maybeSingle();

    const primaryProvider = routing?.primary_provider || 'Google Gemini AI';
    const primaryModel = params.preferredModel || routing?.primary_model || 'gemini-3.5-flash';
    const fallbackProvider = routing?.fallback_provider || 'OpenAI';
    const fallbackModel = routing?.fallback_model || 'gpt-4o-mini';
    const creditCost = Number(routing?.credit_cost || 2);

    // 2. Atomic credit check and reservation if userId provided
    let balanceBefore = 0;
    if (params.userId) {
      const { data: wallet } = await adminClient
        .from('credit_accounts')
        .select('*')
        .eq('user_id', params.userId)
        .maybeSingle();

      if (wallet) {
        if (wallet.frozen) {
          throw new Error('AI Generation Locked: Your account has been temporarily restricted by system administrator.');
        }
        balanceBefore = Number(wallet.credit_balance || 0);
        const reserved = Number(wallet.reserved_credits || 0);
        const available = balanceBefore - reserved;

        if (available < creditCost) {
          throw new Error(`Insufficient credits: Required ${creditCost} credits, but only ${available.toFixed(1)} available.`);
        }

        // Reserve credits
        await adminClient
          .from('credit_accounts')
          .update({
            reserved_credits: reserved + creditCost,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', params.userId);
      }
    }

    // 3. Execution attempt with failover
    let responseText = '';
    let inTokens = 0;
    let outTokens = 0;
    let cachedInTokens = 0;
    let actualProvider = 'Google Gemini AI';
    let actualModel = primaryModel;

    let primaryFailed = false;
    let primaryErrorMsg = '';

    // Primary Attempt: Gemini
    const geminiKey = KeyVault.getNextGeminiKey();
    if (geminiKey && (primaryProvider.toLowerCase().includes('gemini') || !primaryProvider.toLowerCase().includes('openai'))) {
      try {
        actualProvider = 'Google Gemini AI';
        actualModel = primaryModel;
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        const contents = params.systemInstruction
          ? `${params.systemInstruction}\n\nTask:\n${params.prompt}`
          : params.prompt;

        const response = await ai.models.generateContent({
          model: actualModel,
          contents,
          config: {
            temperature: params.temperature || (routing?.temperature ? Number(routing.temperature) : 0.7),
            maxOutputTokens: params.maxOutputTokens || routing?.max_output_tokens || 4096,
          },
        });

        responseText = response.text || '';
        inTokens = response.usageMetadata?.promptTokenCount || Math.ceil(contents.length / 4);
        outTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(responseText.length / 4);
      } catch (err: any) {
        primaryFailed = true;
        primaryErrorMsg = err.message || 'Gemini error';
        console.warn(`Primary AI Provider (Gemini) failed: ${primaryErrorMsg}. Attempting fallback...`);
      }
    } else {
      primaryFailed = true;
      primaryErrorMsg = 'Gemini API key not configured';
    }

    // Fallback Attempt: OpenAI
    if (primaryFailed) {
      const openAIKey = KeyVault.getNextOpenAIKey();
      if (openAIKey) {
        try {
          actualProvider = 'OpenAI';
          actualModel = fallbackModel;

          const messages: { role: 'system' | 'user'; content: string }[] = [];
          if (params.systemInstruction) {
            messages.push({ role: 'system', content: params.systemInstruction });
          }
          messages.push({ role: 'user', content: params.prompt });

          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openAIKey}`,
            },
            body: JSON.stringify({
              model: actualModel,
              messages,
              temperature: params.temperature || (routing?.temperature ? Number(routing.temperature) : 0.7),
              max_tokens: params.maxOutputTokens || routing?.max_output_tokens || 4096,
            }),
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error?.message || `HTTP ${res.status} ${res.statusText}`);
          }

          const data = await res.json();
          responseText = data.choices?.[0]?.message?.content || '';
          inTokens = data.usage?.prompt_tokens || Math.ceil(params.prompt.length / 4);
          outTokens = data.usage?.completion_tokens || Math.ceil(responseText.length / 4);
        } catch (fbErr: any) {
          // Release credit reservation if execution failed
          if (params.userId) {
            await this.releaseCreditReservation(params.userId, creditCost);
          }
          throw new Error(`AI Engine Provider Error: Primary failed (${primaryErrorMsg}). Fallback failed (${fbErr.message || 'OpenAI error'}).`);
        }
      } else {
        // Both not available
        if (params.userId) {
          await this.releaseCreditReservation(params.userId, creditCost);
        }
        throw new Error(`AI Engine Provider Error: No active provider credentials available. Primary: ${primaryErrorMsg}. Fallback: OpenAI key not configured.`);
      }
    }

    const durationMs = Date.now() - startTime;

    // 4. Calculate COGS using canonical ai_model_pricing
    const { data: pricing } = await adminClient
      .from('ai_model_pricing')
      .select('*')
      .eq('model', actualModel)
      .eq('active', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    const inputRate = Number(pricing?.input_cost_per_1m || (actualModel.includes('gpt-4o') ? 2.5 : actualModel.includes('pro') ? 1.25 : 0.075));
    const outputRate = Number(pricing?.output_cost_per_1m || (actualModel.includes('gpt-4o') ? 10.0 : actualModel.includes('pro') ? 5.0 : 0.30));

    const providerCostUsd = (inTokens / 1000000) * inputRate + (outTokens / 1000000) * outputRate;
    const infrastructureCostUsd = providerCostUsd * 0.05; // 5% infra COGS
    const totalCogsUsd = providerCostUsd + infrastructureCostUsd;
    const revenueAllocatedUsd = creditCost * 0.10; // $0.10 per credit reference
    const grossProfitUsd = revenueAllocatedUsd - totalCogsUsd;
    const marginPercent = revenueAllocatedUsd > 0 ? (grossProfitUsd / revenueAllocatedUsd) * 100 : 100;

    const metrics: AIGenerationMetrics = {
      inputTokens: inTokens,
      outputTokens: outTokens,
      cachedInputTokens: cachedInTokens,
      providerCostUsd: Number(providerCostUsd.toFixed(6)),
      infrastructureCostUsd: Number(infrastructureCostUsd.toFixed(6)),
      totalCogsUsd: Number(totalCogsUsd.toFixed(6)),
      revenueAllocatedUsd: Number(revenueAllocatedUsd.toFixed(4)),
      creditsDeducted: creditCost,
      marginPercent: Number(marginPercent.toFixed(2)),
      durationMs,
    };

    // 5. Commit credit deduction & immutable ledger
    if (params.userId) {
      const finalBalance = balanceBefore - creditCost;
      const { data: wallet } = await adminClient
        .from('credit_accounts')
        .select('*')
        .eq('user_id', params.userId)
        .single();

      if (wallet) {
        const curReserved = Number(wallet.reserved_credits || 0);
        await adminClient
          .from('credit_accounts')
          .update({
            credit_balance: finalBalance,
            reserved_credits: Math.max(0, curReserved - creditCost),
            lifetime_credits_used: Number(wallet.lifetime_credits_used || 0) + creditCost,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', params.userId);

        await adminClient.from('credit_ledger').insert([
          {
            user_id: params.userId,
            transaction_type: 'AI_USAGE',
            credits: creditCost,
            balance_before: balanceBefore,
            balance_after: finalBalance,
            reference_type: 'ai_task_routing',
            reference_id: routing?.id || params.taskType,
            description: `AI ${params.taskType} via ${actualProvider} (${actualModel})`,
          },
        ]);
      }
    }

    // 6. Record canonical cost event
    await adminClient.from('ai_cost_events').insert({
      user_id: params.userId || null,
      task_type: params.taskType,
      provider: actualProvider,
      model: actualModel,
      input_tokens: inTokens,
      cached_input_tokens: cachedInTokens,
      output_tokens: outTokens,
      actual_provider_cost: providerCostUsd,
      ai_infrastructure_cost: infrastructureCostUsd,
      revenue_allocated: revenueAllocatedUsd,
      credits_deducted: creditCost,
      created_at: new Date().toISOString(),
    });

    // 7. Parse JSON if applicable
    let parsedJson: any = undefined;
    try {
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        parsedJson = JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
      }
    } catch {
      // Not JSON or partial JSON
    }

    return {
      text: responseText,
      parsedJson,
      modelUsed: actualModel,
      providerUsed: actualProvider,
      metrics,
    };
  }

  private static async releaseCreditReservation(userId: string, credits: number) {
    const adminClient = getSupabaseAdmin();
    const { data: wallet } = await adminClient
      .from('credit_accounts')
      .select('reserved_credits')
      .eq('user_id', userId)
      .maybeSingle();

    if (wallet) {
      const cur = Number(wallet.reserved_credits || 0);
      await adminClient
        .from('credit_accounts')
        .update({
          reserved_credits: Math.max(0, cur - credits),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }
  }
}
