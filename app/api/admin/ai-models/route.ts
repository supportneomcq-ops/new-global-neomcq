import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

// GET: Retrieve canonical models, task routing matrix, and token pricing
export async function GET() {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();

    const [routingRes, pricingRes] = await Promise.all([
      adminClient.from('ai_task_routing').select('*').order('task_type', { ascending: true }),
      adminClient.from('ai_model_pricing').select('*').order('active', { ascending: false }),
    ]);

    if (routingRes.error) throw routingRes.error;
    if (pricingRes.error) throw pricingRes.error;

    return NextResponse.json({
      success: true,
      routing: routingRes.data || [],
      pricing: pricingRes.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// PUT / POST: Update task routing or pricing rules
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
        id,
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

      const { data, error } = await adminClient
        .from('ai_task_routing')
        .update({
          primary_provider,
          primary_model,
          fallback_provider,
          fallback_model,
          max_input_tokens: Number(max_input_tokens),
          max_output_tokens: Number(max_output_tokens),
          credit_cost: Number(credit_cost),
          temperature: Number(temperature),
          enabled: Boolean(enabled),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'AI_TASK_ROUTING_UPDATED',
        entity_type: 'ai_task_routing',
        entity_id: id,
        details: { updated_by: user.email, task_type: data.task_type },
      });

      return NextResponse.json({ success: true, routing: data });
    }

    if (action === 'update_pricing') {
      const { id, input_cost_per_1m, cached_input_cost_per_1m, output_cost_per_1m, active } = body;

      const { data, error } = await adminClient
        .from('ai_model_pricing')
        .update({
          input_cost_per_1m: Number(input_cost_per_1m),
          cached_input_cost_per_1m: Number(cached_input_cost_per_1m || 0),
          output_cost_per_1m: Number(output_cost_per_1m),
          active: Boolean(active),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'AI_MODEL_PRICING_UPDATED',
        entity_type: 'ai_model_pricing',
        entity_id: id,
        details: { updated_by: user.email, model: data.model },
      });

      return NextResponse.json({ success: true, pricing: data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
