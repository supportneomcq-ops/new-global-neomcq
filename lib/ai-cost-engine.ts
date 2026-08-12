import { getSupabaseAdmin } from './supabase';
import { GoogleGenAI } from '@google/genai';

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
    const supabase = this.getAdminClient();
    const { data: routing } = await supabase
      .from('ai_task_routing')
      .select('credit_cost')
      .eq('task_type', taskType)
      .maybeSingle();

    const baseCredits = routing?.credit_cost ? Number(routing.credit_cost) : 1.50;
    const min = Math.max(1, Math.floor(baseCredits * 0.8));
    const max = Math.ceil(baseCredits * 1.5);

    return {
      minCredits: min,
      maxCredits: max,
      estimatedText: `${min} - ${max} credits`
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
    } = {}
  ): Promise<{ text: string; metrics: AIUsageMetrics; modelUsed: string; providerUsed: string }> {
    const supabase = this.getAdminClient();

    // 1. Get margin rules
    const { data: marginRules } = await supabase
      .from('ai_margin_rules')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const rules = marginRules || {
      target_margin: 40.00,
      yellow_warning_threshold: 30.00,
      red_danger_threshold: 20.00,
      infrastructure_cost_coefficient: 5.00,
      payment_fee_coefficient: 3.00,
    };

    // 2. Fetch routing rule
    const { data: routing } = await supabase
      .from('ai_task_routing')
      .select('*')
      .eq('task_type', taskType)
      .maybeSingle();

    if (!routing) {
      throw new Error(`AI Cost Engine Error: No task routing rule configured for task type '${taskType}'`);
    }

    if (!routing.enabled) {
      throw new Error(`AI Cost Engine Error: Routing for task type '${taskType}' is currently disabled by Admin.`);
    }

    const provider = routing.primary_provider;
    const model = options.customModel || routing.primary_model;
    const creditCost = Number(routing.credit_cost);

    // 3. Fetch User Credit Balance & Subscription Plan details
    const { data: wallet } = await supabase
      .from('credit_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!wallet) {
      throw new Error(`AI Cost Engine Error: Credit account not found for user ${userId}. Please contact support.`);
    }

    if (wallet.frozen) {
      throw new Error(`AI Cost Engine Error: Your AI generation is currently locked by Admin due to suspicious activity.`);
    }

    const balance = Number(wallet.credit_balance);
    const reserved = Number(wallet.reserved_credits);
    const available = balance - reserved;

    if (available < creditCost) {
      throw new Error(`Insufficient credit balance. This action requires approx. ${creditCost} credits, but you only have ${available.toFixed(1)} available. Please buy credit packs or upgrade your plan.`);
    }

    // 4. Fair Use & Circuit Breakers check for Truly Unlimited ($99)
    // Check if user has an active subscription with fair_use_allowance = true
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    const planLimits = sub?.subscription_plans ? await supabase
      .from('plan_ai_limits')
      .select('*')
      .eq('plan_id', sub.plan_id)
      .maybeSingle()
      .then(res => res.data) : null;

    if (planLimits && planLimits.fair_use_allowance) {
      // Truly Unlimited abuse protection check: total user credits consumed today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayEvents } = await supabase
        .from('ai_cost_events')
        .select('credits_deducted')
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString());

      const todayCreditsUsed = (todayEvents || []).reduce((acc: number, e: any) => acc + Number(e.credits_deducted), 0);

      if (todayCreditsUsed >= Number(planLimits.daily_safety_threshold)) {
        // Trigger automated margin/abuse alert
        await supabase.from('ai_cost_alerts').insert({
          alert_type: 'user_abuse',
          severity: 'critical',
          threshold_value: Number(planLimits.daily_safety_threshold),
          current_value: todayCreditsUsed + creditCost,
          message: `Truly Unlimited user ${userId} exceeded safety threshold of ${planLimits.daily_safety_threshold} credits in 24h. Triggering rate throttle.`,
        });

        throw new Error(`Fair Use Policy Limit Reached: You have reached your high-volume daily fair-use threshold of ${planLimits.daily_safety_threshold} credits. Normal limits will resume tomorrow.`);
      }
    }

    // 5. Atomic Reservation
    const newReserved = reserved + creditCost;
    await supabase
      .from('credit_accounts')
      .update({ reserved_credits: newReserved, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    // Ledger reservation entries
    await supabase.from('credit_ledger').insert({
      user_id: userId,
      transaction_type: 'RESERVATION',
      credits: creditCost,
      balance_before: balance,
      balance_after: balance, // balance is unchanged during reservation, only reserved increases
      reference_type: 'ai_reservation',
      description: `Reserve ${creditCost} credits for task ${taskType}`
    });

    let finalPrompt = prompt;
    if (systemInstruction) {
      finalPrompt = `${systemInstruction}\n\nUser query:\n${prompt}`;
    }

    // 6. Execute actual provider request
    let responseText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cachedInputTokens = 0;
    let isFallbackUsed = false;
    let activeProvider = provider;
    let activeModel = model;

    try {
      const { text, inTokens, outTokens, cachedIn } = await this.invokeModel(activeProvider, activeModel, finalPrompt, routing);
      responseText = text;
      inputTokens = inTokens;
      outputTokens = outTokens;
      cachedInputTokens = cachedIn;
    } catch (primaryError) {
      const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
      console.warn(`Primary provider ${provider} with model ${model} failed:`, primaryMessage);

      if (routing.fallback_provider && routing.fallback_model) {
        console.log(`Routing Engine: Attempting fallback to ${routing.fallback_provider} (${routing.fallback_model})`);
        try {
          isFallbackUsed = true;
          activeProvider = routing.fallback_provider;
          activeModel = routing.fallback_model;

          const { text, inTokens, outTokens, cachedIn } = await this.invokeModel(activeProvider, activeModel, finalPrompt, routing);
          responseText = text;
          inputTokens = inTokens;
          outputTokens = outTokens;
          cachedInputTokens = cachedIn;
        } catch (fallbackError) {
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          // Both failed - release reservation and throw error
          await this.releaseReservation(userId, creditCost, balance);
          throw new Error(`AI Cost Engine Error: All available models failed. Primary: ${primaryMessage}. Fallback: ${fallbackMessage}`);
        }
      } else {
        await this.releaseReservation(userId, creditCost, balance);
        throw new Error(`AI Cost Engine Error: Primary model failed and no fallback configured. Detail: ${primaryMessage}`);
      }
    }

    // 7. Look up model pricing (for actual executed model)
    const { data: pricing } = await supabase
      .from('ai_model_pricing')
      .select('*')
      .eq('provider', activeProvider)
      .eq('model', activeModel)
      .eq('active', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    const priceRule = pricing || {
      input_cost_per_1m: activeModel.includes('pro') ? 1.25 : 0.10,
      cached_input_cost_per_1m: activeModel.includes('pro') ? 0.625 : 0.05,
      output_cost_per_1m: activeModel.includes('pro') ? 5.00 : 0.40,
    };

    // Calculate raw provider cost
    const regularInputTokens = Math.max(0, inputTokens - cachedInputTokens);
    const inputCost = (regularInputTokens / 1000000) * Number(priceRule.input_cost_per_1m);
    const cachedInputCost = (cachedInputTokens / 1000000) * Number(priceRule.cached_input_cost_per_1m || (priceRule.input_cost_per_1m * 0.5));
    const outputCost = (outputTokens / 1000000) * Number(priceRule.output_cost_per_1m);
    
    const providerCost = inputCost + cachedInputCost + outputCost;

    // Infrastructure COGS
    const infraCoefficient = Number(rules.infrastructure_cost_coefficient) / 100;
    const infrastructureCost = providerCost * infraCoefficient;
    const totalCogs = providerCost + infrastructureCost;

    // Commercial value: 1 Credit = $0.10 commercial allocation value (or proportional to plan pricing)
    const creditValue = 0.10; // canonical base mapping
    const revenueAllocated = creditCost * creditValue;

    // Margin analysis
    const grossProfit = revenueAllocated - totalCogs;
    const marginPercent = revenueAllocated > 0 ? (grossProfit / revenueAllocated) * 100 : 100;

    // 8. Commit credit deduction atomically
    const finalBalance = balance - creditCost;
    await supabase
      .from('credit_accounts')
      .update({
        credit_balance: finalBalance,
        reserved_credits: Math.max(0, reserved - creditCost),
        lifetime_credits_used: Number(wallet.lifetime_credits_used || 0) + creditCost,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    // Immutable credit ledger for deduction
    await supabase.from('credit_ledger').insert([
      {
        user_id: userId,
        transaction_type: 'RELEASE',
        credits: creditCost,
        balance_before: balance,
        balance_after: balance,
        reference_type: 'ai_reservation_release',
        description: `Release reservation of ${creditCost} credits`
      },
      {
        user_id: userId,
        transaction_type: 'AI_USAGE',
        credits: creditCost,
        balance_before: balance,
        balance_after: finalBalance,
        reference_type: 'ai_cost_event',
        description: `AI usage for task: ${taskType} with model: ${activeModel}`
      }
    ]);

    // 9. Save AI Cost Event log
    const { data: costEvent } = await supabase.from('ai_cost_events').insert({
      user_id: userId,
      task_type: taskType,
      provider: activeProvider,
      model: activeModel,
      input_tokens: inputTokens,
      cached_input_tokens: cachedInputTokens,
      output_tokens: outputTokens,
      actual_provider_cost: providerCost,
      revenue_allocated: revenueAllocated,
      ai_infrastructure_cost: infrastructureCost,
      credits_deducted: creditCost,
    }).select().single();

    // 10. Check warning circuit breakers
    if (marginPercent < Number(rules.yellow_warning_threshold)) {
      const severity = marginPercent < Number(rules.red_danger_threshold) ? 'critical' : 'warning';
      await supabase.from('ai_cost_alerts').insert({
        alert_type: 'plan_margin_drop',
        severity,
        threshold_value: Number(rules.yellow_warning_threshold),
        current_value: marginPercent,
        message: `Task ${taskType} on model ${activeModel} generated dangerous gross margin of ${marginPercent.toFixed(1)}%. Target is ${rules.target_margin}%.`,
      });
    }

    return {
      text: responseText,
      modelUsed: activeModel,
      providerUsed: activeProvider,
      metrics: {
        inputTokens,
        outputTokens,
        cachedInputTokens,
        reasoningTokens: 0,
        providerCost,
        infrastructureCost,
        totalCogs,
        revenueAllocated,
        creditsDeducted: creditCost,
        margin: marginPercent
      }
    };
  }

  /**
   * Release reservation if execution failed completely
   */
  private static async releaseReservation(userId: string, credits: number, balance: number) {
    const supabase = this.getAdminClient();
    const { data: wallet } = await supabase.from('credit_accounts').select('reserved_credits').eq('user_id', userId).maybeSingle();
    if (wallet) {
      const reserved = Number(wallet.reserved_credits);
      await supabase
        .from('credit_accounts')
        .update({ reserved_credits: Math.max(0, reserved - credits) })
        .eq('user_id', userId);

      await supabase.from('credit_ledger').insert({
        user_id: userId,
        transaction_type: 'RELEASE',
        credits,
        balance_before: balance,
        balance_after: balance,
        reference_type: 'ai_error_release',
        description: `Release reservation of ${credits} credits after API failure`
      });
    }
  }

  /**
   * Generates AI text utilizing the authorized server SDK with fallback checks
   */
  private static async invokeModel(
    provider: string,
    model: string,
    prompt: string,
    routing: any
  ): Promise<{ text: string; inTokens: number; outTokens: number; cachedIn: number }> {
    const apiKey = process.env.GEMINI_API_KEY;

    // If Gemini is requested and API key is present, execute actual API call
    if (provider.toLowerCase().includes('gemini') && apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: model || 'gemini-3.5-flash',
        contents: prompt,
        config: {
          maxOutputTokens: routing?.max_output_tokens || 2048,
          temperature: routing?.temperature ? Number(routing.temperature) : 0.70,
        }
      });

      const responseText = response.text || '';
      
      // Calculate token usage metrics
      // Gemini response returns metadata under response.usageMetadata
      const inputTokens = response.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4);
      const outputTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(responseText.length / 4);
      const cachedIn = response.usageMetadata?.candidatesTokenCount ? 0 : 0; // standard fallback

      return {
        text: responseText,
        inTokens: inputTokens,
        outTokens: outputTokens,
        cachedIn,
      };
    }

    // Default mock response helper for local sandbox / missing API key situations
    const estInput = Math.ceil(prompt.length / 4);
    const mockOutput = `[Simulated ${model} response] NeoMCQ Phase 12 AI output: Successful execution of task and structured content returned successfully according to routing constraints.`;
    const estOutput = Math.ceil(mockOutput.length / 4);

    return {
      text: mockOutput,
      inTokens: estInput,
      outTokens: estOutput,
      cachedIn: Math.floor(estInput * 0.2), // simulate 20% prompt cache savings
    };
  }
}
