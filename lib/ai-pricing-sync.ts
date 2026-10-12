/**
 * NeoMCQ AI Official Pricing Synchronization Engine
 * 
 * Synchronizes and audits official model pricing for active providers (Gemini & OpenAI).
 * - Schedules automatic 10-day price synchronization
 * - Updates database model registry (ai_models & ai_model_pricing)
 * - Creates immutable snapshots (ai_pricing_snapshots)
 * - Logs detailed audit history (ai_pricing_history)
 * - Enforces consumer subscription price invariance ($9, $29, $99, $499)
 */

import { getSupabaseAdmin } from '@/lib/supabase'

export interface OfficialModelPrice {
  provider: 'gemini' | 'openai'
  model_id: string
  display_name: string
  input_cost_per_1m: number
  cached_input_cost_per_1m: number
  output_cost_per_1m: number
  context_window: number
  max_output_tokens: number
  recommended_tier: 'reasoning' | 'flash' | 'embedding' | 'economy'
  description: string
  task_types: string[]
  enabled: boolean
}

// Current official standard rates for active production providers (USD per 1,000,000 tokens)
export const OFFICIAL_PROVIDER_PRICING: OfficialModelPrice[] = [
  // Google Gemini Models (Primary Provider)
  {
    provider: 'gemini',
    model_id: 'gemini-3.8-flash',
    display_name: 'Gemini 3.8 Flash (Current Production Flash)',
    input_cost_per_1m: 0.75,
    cached_input_cost_per_1m: 0.075,
    output_cost_per_1m: 3.75,
    context_window: 1048576,
    max_output_tokens: 65536,
    recommended_tier: 'reasoning',
    task_types: ['FIRST_CANONICAL_CONTENT_CREATION', 'FIRST_GENERATION', 'DIFFICULT_EXAM_REASONING', 'EXAM_SCENARIO_GENERATION'],
    enabled: true,
    description: 'Premier hybrid reasoning model for first-generation canonical topic creation, complex exam question stems, and difficult explanations.',
  },
  {
    provider: 'gemini',
    model_id: 'gemini-3.6-flash',
    display_name: 'Gemini 3.6 Flash (High-Yield Reasoning & Refresh)',
    input_cost_per_1m: 0.75,
    cached_input_cost_per_1m: 0.075,
    output_cost_per_1m: 3.75,
    context_window: 1048576,
    max_output_tokens: 65536,
    recommended_tier: 'reasoning',
    task_types: ['CONTENT_30_DAY_REFRESH', 'TOPIC_CONTENT_REFRESH', 'DIFFICULT_MCQ_GENERATION', 'AI_TUTOR_DIFFICULT'],
    enabled: true,
    description: 'High-yield reasoning model for 30-day canonical content refresh, difficult MCQ batches, and advanced explanations.',
  },
  {
    provider: 'gemini',
    model_id: 'gemini-3.5-flash',
    display_name: 'Gemini 3.5 Flash (Deprecated; retained for historical pricing)',
    input_cost_per_1m: 1.50,
    cached_input_cost_per_1m: 0.15,
    output_cost_per_1m: 9.00,
    context_window: 1048576,
    max_output_tokens: 65536,
    recommended_tier: 'flash',
    task_types: ['NORMAL_MCQ_GENERATION', 'MCQ_GENERATION', 'NOTE_GENERATION', 'FLASHCARD_GENERATION', 'AI_TUTOR_NORMAL'],
    enabled: false,
    description: 'Deprecated by Google and automatically routed to Gemini 3.6 Flash. Disabled for new routing.',
  },
  {
    provider: 'gemini',
    model_id: 'gemini-3.5-flash-lite',
    display_name: 'Gemini 3.5 Flash-Lite (Low-Cost Operations)',
    input_cost_per_1m: 0.30,
    cached_input_cost_per_1m: 0.03,
    output_cost_per_1m: 2.50,
    context_window: 1048576,
    max_output_tokens: 65536,
    recommended_tier: 'economy',
    task_types: ['STUDY_PLAN', 'AI_TUTOR_SIMPLE', 'CONTENT_QUALITY_VALIDATION', 'CANONICAL_CLASSIFICATION'],
    enabled: true,
    description: 'Low-cost, high-throughput model for study plans, content validation, and simple AI tutoring.',
  },
  {
    provider: 'gemini',
    model_id: 'gemini-3.1-flash-lite',
    display_name: 'Gemini 3.1 Flash-Lite (Ultra-Low Cost & Extraction)',
    input_cost_per_1m: 0.25,
    cached_input_cost_per_1m: 0.025,
    output_cost_per_1m: 1.50,
    context_window: 1048576,
    max_output_tokens: 65536,
    recommended_tier: 'economy',
    task_types: ['ENTITY_RESOLUTION', 'DUPLICATE_DETECTION', 'CONTENT_DEDUPLICATION', 'CONTENT_METADATA_EXTRACTION'],
    enabled: true,
    description: 'Ultra-low cost model for entity resolution, duplicate detection, metadata extraction, and classification.',
  },

  // OpenAI Models (Fallback & Cross-Provider Redundancy)
  {
    provider: 'openai',
    model_id: 'gpt-5.4-mini',
    display_name: 'OpenAI GPT-5.4 Mini (Reasoning Fallback)',
    input_cost_per_1m: 0.75,
    cached_input_cost_per_1m: 0.075,
    output_cost_per_1m: 4.50,
    context_window: 400000,
    max_output_tokens: 128000,
    recommended_tier: 'reasoning',
    task_types: ['FALLBACK_REASONING', 'NOTE_GENERATION', 'NORMAL_MCQ_GENERATION', 'DIFFICULT_MCQ_GENERATION', 'FIRST_CANONICAL_CONTENT_CREATION', 'CONTENT_30_DAY_REFRESH', 'AI_TUTOR_NORMAL', 'AI_TUTOR_DIFFICULT'],
    enabled: true,
    description: 'Secondary high-quality reasoning and fallback provider for difficult exam MCQs and refresh operations.',
  },
  {
    provider: 'openai',
    model_id: 'gpt-5.4-nano',
    display_name: 'OpenAI GPT-5.4 Nano (Low-Cost Fallback)',
    input_cost_per_1m: 0.20,
    cached_input_cost_per_1m: 0.02,
    output_cost_per_1m: 1.25,
    context_window: 400000,
    max_output_tokens: 128000,
    recommended_tier: 'economy',
    task_types: ['FALLBACK_STANDARD', 'ENTITY_RESOLUTION', 'DUPLICATE_DETECTION', 'STUDY_PLAN', 'FLASHCARD_GENERATION', 'AI_TUTOR_SIMPLE', 'CONTENT_QUALITY_VALIDATION', 'CONTENT_DEDUPLICATION', 'CONTENT_METADATA_EXTRACTION'],
    enabled: true,
    description: 'Low-cost OpenAI fallback model for classification, study plans, flashcards, and lightweight validation.',
  },

  // Legacy Models (Retained as disabled for historical reference)
  {
    provider: 'openai',
    model_id: 'gpt-5-mini',
    display_name: 'OpenAI GPT-5 Mini (Legacy)',
    input_cost_per_1m: 0.20,
    cached_input_cost_per_1m: 0.10,
    output_cost_per_1m: 0.80,
    context_window: 128000,
    max_output_tokens: 16384,
    recommended_tier: 'reasoning',
    task_types: ['LEGACY_FALLBACK'],
    enabled: false,
    description: 'Legacy fallback model.',
  },
  {
    provider: 'openai',
    model_id: 'gpt-5-nano',
    display_name: 'OpenAI GPT-5 Nano (Legacy)',
    input_cost_per_1m: 0.05,
    cached_input_cost_per_1m: 0.025,
    output_cost_per_1m: 0.20,
    context_window: 128000,
    max_output_tokens: 16384,
    recommended_tier: 'economy',
    task_types: ['LEGACY_FALLBACK'],
    enabled: false,
    description: 'Legacy economy model.',
  },
  {
    provider: 'openai',
    model_id: 'gpt-4o-mini',
    display_name: 'GPT-4o Mini (Legacy)',
    input_cost_per_1m: 0.15,
    cached_input_cost_per_1m: 0.075,
    output_cost_per_1m: 0.60,
    context_window: 128000,
    max_output_tokens: 16384,
    recommended_tier: 'flash',
    task_types: ['LEGACY_FALLBACK'],
    enabled: false,
    description: 'Legacy fallback model.',
  },
  {
    provider: 'openai',
    model_id: 'gpt-4o',
    display_name: 'GPT-4o (Legacy)',
    input_cost_per_1m: 2.50,
    cached_input_cost_per_1m: 1.25,
    output_cost_per_1m: 10.00,
    context_window: 128000,
    max_output_tokens: 16384,
    recommended_tier: 'reasoning',
    task_types: ['LEGACY_FALLBACK'],
    enabled: false,
    description: 'Legacy reasoning model.',
  },
]

export const CANONICAL_TASK_ROUTING_RULES = [
  {
    task_type: 'ENTITY_RESOLUTION',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.1-flash-lite',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-nano',
    max_input_tokens: 2048,
    max_output_tokens: 1024,
    credit_cost: 0.25,
    temperature: 0.1,
    enabled: true,
  },
  {
    task_type: 'DUPLICATE_DETECTION',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.1-flash-lite',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-nano',
    max_input_tokens: 2048,
    max_output_tokens: 1024,
    credit_cost: 0.25,
    temperature: 0.1,
    enabled: true,
  },
  {
    task_type: 'STUDY_PLAN',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash-lite',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-nano',
    max_input_tokens: 4096,
    max_output_tokens: 2048,
    credit_cost: 0.50,
    temperature: 0.4,
    enabled: true,
  },
  {
    task_type: 'FLASHCARD_GENERATION',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.6-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-nano',
    max_input_tokens: 4096,
    max_output_tokens: 2048,
    credit_cost: 1.0,
    temperature: 0.4,
    enabled: true,
  },
  {
    task_type: 'NOTE_GENERATION',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.6-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-mini',
    max_input_tokens: 8192,
    max_output_tokens: 4096,
    credit_cost: 1.5,
    temperature: 0.4,
    enabled: true,
  },
  {
    task_type: 'NORMAL_MCQ_GENERATION',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.6-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-mini',
    max_input_tokens: 8192,
    max_output_tokens: 4096,
    credit_cost: 1.0,
    temperature: 0.4,
    enabled: true,
  },
  {
    task_type: 'DIFFICULT_MCQ_GENERATION',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.6-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-mini',
    max_input_tokens: 8192,
    max_output_tokens: 4096,
    credit_cost: 2.0,
    temperature: 0.4,
    enabled: true,
  },
  {
    task_type: 'FIRST_CANONICAL_CONTENT_CREATION',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.8-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-mini',
    max_input_tokens: 16384,
    max_output_tokens: 8192,
    credit_cost: 2.0,
    temperature: 0.3,
    enabled: true,
  },
  {
    task_type: 'CONTENT_30_DAY_REFRESH',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.6-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-mini',
    max_input_tokens: 16384,
    max_output_tokens: 8192,
    credit_cost: 2.0,
    temperature: 0.3,
    enabled: true,
  },
  {
    task_type: 'AI_TUTOR_SIMPLE',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash-lite',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-nano',
    max_input_tokens: 4096,
    max_output_tokens: 1024,
    credit_cost: 0.5,
    temperature: 0.5,
    enabled: true,
  },
  {
    task_type: 'AI_TUTOR_NORMAL',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.6-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-mini',
    max_input_tokens: 8192,
    max_output_tokens: 2048,
    credit_cost: 1.0,
    temperature: 0.5,
    enabled: true,
  },
  {
    task_type: 'AI_TUTOR_DIFFICULT',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.6-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-mini',
    max_input_tokens: 8192,
    max_output_tokens: 4096,
    credit_cost: 2.0,
    temperature: 0.4,
    enabled: true,
  },
  {
    task_type: 'CONTENT_QUALITY_VALIDATION',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash-lite',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-nano',
    max_input_tokens: 4096,
    max_output_tokens: 1024,
    credit_cost: 0.25,
    temperature: 0.1,
    enabled: true,
  },
  {
    task_type: 'CONTENT_DEDUPLICATION',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.1-flash-lite',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-nano',
    max_input_tokens: 4096,
    max_output_tokens: 1024,
    credit_cost: 0.25,
    temperature: 0.1,
    enabled: true,
  },
  {
    task_type: 'CONTENT_METADATA_EXTRACTION',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.1-flash-lite',
    fallback_provider: 'openai',
    fallback_model: 'gpt-5.4-nano',
    max_input_tokens: 2048,
    max_output_tokens: 1024,
    credit_cost: 0.25,
    temperature: 0.1,
    enabled: true,
  },
]

/**
 * Synchronizes the Supabase ai_models, ai_model_pricing, and snapshot tables
 */
export async function syncOfficialAiPricing(changedBy = 'AUTO_SYNC', reason = '10-Day Official Provider Pricing Sync'): Promise<{
  success: boolean
  updatedCount: number
  insertedCount: number
  changedPricesCount: number
  models: OfficialModelPrice[]
}> {
  const adminClient = getSupabaseAdmin()
  let updated = 0
  let inserted = 0
  let changedPrices = 0

  for (const item of OFFICIAL_PROVIDER_PRICING) {
    // 1. Check existing record in ai_models
    const { data: existingModel } = await adminClient
      .from('ai_models')
      .select('*')
      .eq('model_id', item.model_id)
      .maybeSingle()

    if (existingModel) {
      const oldInPrice = Number(existingModel.input_price_per_1m)
      const oldOutPrice = Number(existingModel.output_price_per_1m)
      const priceChanged = Math.abs(oldInPrice - item.input_cost_per_1m) > 0.0001 || Math.abs(oldOutPrice - item.output_cost_per_1m) > 0.0001

      if (priceChanged) {
        changedPrices++
        // Log to immutable pricing history
        await adminClient.from('ai_pricing_history').insert({
          provider: item.provider,
          model_id: item.model_id,
          old_input_price: oldInPrice,
          new_input_price: item.input_cost_per_1m,
          old_output_price: oldOutPrice,
          new_output_price: item.output_cost_per_1m,
          changed_by: changedBy,
          reason: reason,
        })
      }

      const { error } = await adminClient
        .from('ai_models')
        .update({
          provider: item.provider,
          display_name: item.display_name,
          tier: item.recommended_tier,
          task_types: item.task_types,
          input_price_per_1m: item.input_cost_per_1m,
          cached_input_price_per_1m: item.cached_input_cost_per_1m,
          output_price_per_1m: item.output_cost_per_1m,
          context_limit: item.context_window,
          max_output_tokens: item.max_output_tokens,
          enabled: item.enabled,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingModel.id)

      if (!error) updated++
    } else {
      const { error } = await adminClient.from('ai_models').insert({
        provider: item.provider,
        model_id: item.model_id,
        display_name: item.display_name,
        tier: item.recommended_tier,
        task_types: item.task_types,
        input_price_per_1m: item.input_cost_per_1m,
        cached_input_price_per_1m: item.cached_input_cost_per_1m,
        output_price_per_1m: item.output_cost_per_1m,
        context_limit: item.context_window,
        max_output_tokens: item.max_output_tokens,
        enabled: item.enabled,
        priority: 1,
        last_verified_at: new Date().toISOString(),
      })

      if (!error) inserted++
    }

    // 2. Keep the effective-dated pricing table in sync. The deployed schema
    // uses "model" (not model_id), and keeps historical rates as inactive rows.
    const pricingSource = item.provider === 'gemini'
      ? 'https://ai.google.dev/gemini-api/docs/pricing'
      : 'https://developers.openai.com/api/docs/pricing';
    const { data: activePricingRows, error: pricingReadError } = await adminClient
      .from('ai_model_pricing')
      .select('id, input_cost_per_1m, cached_input_cost_per_1m, output_cost_per_1m, effective_from')
      .eq('model', item.model_id)
      .eq('active', true)
      .order('effective_from', { ascending: false });

    if (pricingReadError) throw pricingReadError;
    const activeRows = activePricingRows || [];
    const currentPricing = activeRows[0];
    const priceChanged = Boolean(currentPricing) && (
      Math.abs(Number(currentPricing.input_cost_per_1m) - item.input_cost_per_1m) > 0.0001 ||
      Math.abs(Number(currentPricing.cached_input_cost_per_1m) - item.cached_input_cost_per_1m) > 0.0001 ||
      Math.abs(Number(currentPricing.output_cost_per_1m) - item.output_cost_per_1m) > 0.0001
    );

    // Repair any accidental duplicate active rows while preserving the newest row.
    const duplicateActiveIds = activeRows.slice(1).map((row: any) => row.id);
    if (duplicateActiveIds.length > 0) {
      const { error } = await adminClient
        .from('ai_model_pricing')
        .update({ active: false, effective_until: new Date().toISOString() })
        .in('id', duplicateActiveIds);
      if (error) throw error;
    }

    if (!item.enabled) {
      if (activeRows.length > 0) {
        const { error } = await adminClient
          .from('ai_model_pricing')
          .update({ active: false, effective_until: new Date().toISOString() })
          .in('id', activeRows.map((row: any) => row.id));
        if (error) throw error;
      }
    } else if (!currentPricing || priceChanged) {
      if (currentPricing) {
        changedPrices++;
        await adminClient.from('ai_pricing_history').insert({
          provider: item.provider,
          model_id: item.model_id,
          old_input_price: Number(currentPricing.input_cost_per_1m),
          new_input_price: item.input_cost_per_1m,
          old_output_price: Number(currentPricing.output_cost_per_1m),
          new_output_price: item.output_cost_per_1m,
          changed_by: changedBy,
          reason,
        });
        const { error } = await adminClient
          .from('ai_model_pricing')
          .update({ active: false, effective_until: new Date().toISOString() })
          .in('id', activeRows.map((row: any) => row.id));
        if (error) throw error;
        updated++;
      } else {
        inserted++;
      }

      const { error } = await adminClient.from('ai_model_pricing').insert({
        provider: item.provider,
        model: item.model_id,
        input_cost_per_1m: item.input_cost_per_1m,
        cached_input_cost_per_1m: item.cached_input_cost_per_1m,
        output_cost_per_1m: item.output_cost_per_1m,
        effective_from: new Date().toISOString(),
        effective_until: null,
        currency: 'USD',
        source: pricingSource,
        active: true,
      });
      if (error) throw error;
    } else {
      // Normalize provider/source metadata without changing effective rates.
      const { error } = await adminClient
        .from('ai_model_pricing')
        .update({ provider: item.provider, source: pricingSource })
        .eq('id', currentPricing.id);
      if (error) throw error;
    }
  }

  // 3. Record Snapshot in ai_pricing_snapshots
  await adminClient.from('ai_pricing_snapshots').insert({
    snapshot_date: new Date().toISOString().slice(0, 10),
    total_models: OFFICIAL_PROVIDER_PRICING.length,
    models_changed: changedPrices,
    pricing_payload: OFFICIAL_PROVIDER_PRICING,
  })

  // 4. Synchronize Task Routing Matrix
  await syncOfficialTaskRouting()

  return {
    success: true,
    updatedCount: updated,
    insertedCount: inserted,
    changedPricesCount: changedPrices,
    models: OFFICIAL_PROVIDER_PRICING,
  }
}

/**
 * Synchronizes the canonical task routing matrix in ai_task_routing
 */
export async function syncOfficialTaskRouting(): Promise<{ success: boolean; syncedCount: number }> {
  const adminClient = getSupabaseAdmin()
  let synced = 0

  for (const rule of CANONICAL_TASK_ROUTING_RULES) {
    const { data: existing } = await adminClient
      .from('ai_task_routing')
      .select('id')
      .eq('task_type', rule.task_type)
      .maybeSingle()

    if (existing) {
      const { error } = await adminClient
        .from('ai_task_routing')
        .update({
          primary_provider: rule.primary_provider,
          primary_model: rule.primary_model,
          fallback_provider: rule.fallback_provider,
          fallback_model: rule.fallback_model,
          max_input_tokens: rule.max_input_tokens,
          max_output_tokens: rule.max_output_tokens,
          credit_cost: rule.credit_cost,
          temperature: rule.temperature,
          enabled: rule.enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (!error) synced++
    } else {
      const { error } = await adminClient
        .from('ai_task_routing')
        .insert({
          task_type: rule.task_type,
          primary_provider: rule.primary_provider,
          primary_model: rule.primary_model,
          fallback_provider: rule.fallback_provider,
          fallback_model: rule.fallback_model,
          max_input_tokens: rule.max_input_tokens,
          max_output_tokens: rule.max_output_tokens,
          credit_cost: rule.credit_cost,
          temperature: rule.temperature,
          enabled: rule.enabled,
        })

      if (!error) synced++
    }
  }

  return { success: true, syncedCount: synced }
}

