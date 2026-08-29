import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { TaskRouter } from '@/lib/ai/task-router';
import { ModelRegistry } from '@/lib/ai/model-registry';
import { AIProviderId } from '@/lib/ai/types';

// GET: Retrieve canonical models, task routing matrix, and token pricing
export async function GET() {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const [routing, models] = await Promise.all([
      TaskRouter.getAllRules(),
      ModelRegistry.getAllModels(),
    ]);

    // Map models into pricing format for UI compatibility
    const pricing = models.map((m) => ({
      id: `${m.provider}_${m.model_id}`,
      provider: m.provider,
      model: m.model_id,
      display_name: m.display_name,
      input_cost_per_1m: m.input_price,
      cached_input_cost_per_1m: m.cached_input_price,
      output_cost_per_1m: m.output_price,
      active: m.active,
      verification_status: m.verification_status,
      last_verified_at: m.last_verified_at,
      latency_ms: m.latency_ms,
      supports_text: m.supports_text,
      supports_image: m.supports_image,
      supports_reasoning: m.supports_reasoning,
      supports_structured_output: m.supports_structured_output,
      max_input_tokens: m.max_input_tokens,
      max_output_tokens: m.max_output_tokens,
      currency: 'USD',
    }));

    return NextResponse.json({
      success: true,
      routing,
      models,
      pricing,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Update task routing or pricing / model activation rules
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;
    const user = auth.user!;
    const adminClient = getSupabaseAdmin();
    const body = await req.json();

    const { action } = body;

    if (action === 'update_routing') {
      const {
        task_type,
        primary_provider,
        primary_model,
        fallback_provider,
        fallback_model,
        max_input_tokens,
        max_output_tokens,
        credit_cost,
        temperature,
        enabled,
      } = body;

      // Validate that primary model exists in registry and is active
      const primaryMeta = await ModelRegistry.getModel(
        primary_provider as AIProviderId,
        primary_model
      );
      if (!primaryMeta) {
        return NextResponse.json(
          {
            error: `Primary model '${primary_model}' is not registered in the system. Run model verification first.`,
          },
          { status: 400 }
        );
      }

      const updated = await TaskRouter.updateRule(task_type, {
        primary_provider,
        primary_model,
        fallback_provider,
        fallback_model,
        max_input_tokens: Number(max_input_tokens) || 8192,
        max_output_tokens: Number(max_output_tokens) || 4096,
        credit_cost: Number(credit_cost) || 1.5,
        temperature: Number(temperature) || 0.7,
        enabled: Boolean(enabled),
      });

      try {
        await adminClient.from('audit_logs').insert({
          user_id: user.id,
          action: 'AI_TASK_ROUTING_UPDATED',
          entity_type: 'ai_task_routing',
          details: { updated_by: user.email, task_type },
        });
      } catch {
        // ignore audit log failure
      }

      return NextResponse.json({ success: true, routing: updated });
    }

    if (action === 'update_pricing' || action === 'update_model') {
      const {
        provider,
        model,
        model_id,
        input_cost_per_1m,
        cached_input_cost_per_1m,
        output_cost_per_1m,
        active,
      } = body;

      const targetModelId = model || model_id;
      const targetProvider = (provider || 'gemini') as AIProviderId;

      const updated = await ModelRegistry.updateModelPriceOrStatus(
        targetProvider,
        targetModelId,
        {
          input_price: typeof input_cost_per_1m === 'number' ? input_cost_per_1m : undefined,
          cached_input_price:
            typeof cached_input_cost_per_1m === 'number'
              ? cached_input_cost_per_1m
              : undefined,
          output_price: typeof output_cost_per_1m === 'number' ? output_cost_per_1m : undefined,
          active: typeof active === 'boolean' ? active : undefined,
        }
      );

      try {
        await adminClient.from('audit_logs').insert({
          user_id: user.id,
          action: 'AI_MODEL_PRICING_UPDATED',
          entity_type: 'ai_models',
          details: { updated_by: user.email, model: targetModelId, provider: targetProvider },
        });
      } catch {
        // ignore audit log failure
      }

      return NextResponse.json({ success: true, model: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
