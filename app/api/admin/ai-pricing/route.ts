import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

async function checkIsAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const adminClient = getSupabaseAdmin();
  const { data: userRoles } = await adminClient
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  const roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
  const userEmail = user.email?.toLowerCase().trim() || '';
  const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'support@neomcq.com').toLowerCase().trim();
  const isAdminEmail = userEmail === initialAdminEmail || userEmail === 'swapnilsonawane913@gmail.com';

  if (!isAdminEmail && !roleNames.includes('admin') && !roleNames.includes('super_admin')) {
    throw new Error('Unauthorized: Admin access required');
  }
  return user;
}

export async function GET(req: NextRequest) {
  try {
    await checkIsAdmin();
    const adminClient = getSupabaseAdmin();

    const { data: pricing } = await adminClient.from('ai_model_pricing').select('*').order('active', { ascending: false });
    const { data: routing } = await adminClient.from('ai_task_routing').select('*').order('task_type', { ascending: true });
    const { data: creditPacks } = await adminClient.from('credit_packs').select('*').order('display_order', { ascending: true });
    const { data: planLimits } = await adminClient.from('plan_ai_limits').select('*, subscription_plans(name, slug)');
    const { data: marginRules } = await adminClient.from('ai_margin_rules').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const { data: alerts } = await adminClient.from('ai_cost_alerts').select('*').order('created_at', { ascending: false });
    const { data: events } = await adminClient.from('ai_cost_events').select('*').order('created_at', { ascending: false }).limit(20);

    return NextResponse.json({
      success: true,
      pricing: pricing || [],
      routing: routing || [],
      creditPacks: creditPacks || [],
      planLimits: planLimits || [],
      marginRules: marginRules || {
        target_margin: 40.00,
        yellow_warning_threshold: 30.00,
        red_danger_threshold: 20.00,
        infrastructure_cost_coefficient: 5.00,
        payment_fee_coefficient: 3.00
      },
      alerts: alerts || [],
      recentEvents: events || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await checkIsAdmin();
    const adminClient = getSupabaseAdmin();
    const body = await req.json();
    const { action } = body;

    if (action === 'update_routing') {
      const { id, primary_provider, primary_model, fallback_provider, fallback_model, max_input_tokens, max_output_tokens, credit_cost, enabled } = body;
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
          enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, routing: data });
    }

    if (action === 'update_pricing') {
      const { id, input_cost_per_1m, output_cost_per_1m, active } = body;
      const { data, error } = await adminClient
        .from('ai_model_pricing')
        .update({
          input_cost_per_1m: Number(input_cost_per_1m),
          output_cost_per_1m: Number(output_cost_per_1m),
          active
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, pricing: data });
    }

    if (action === 'save_margin_rules') {
      const { target_margin, yellow_warning_threshold, red_danger_threshold, infrastructure_cost_coefficient, payment_fee_coefficient } = body;
      const { data, error } = await adminClient
        .from('ai_margin_rules')
        .insert({
          target_margin: Number(target_margin),
          yellow_warning_threshold: Number(yellow_warning_threshold),
          red_danger_threshold: Number(red_danger_threshold),
          infrastructure_cost_coefficient: Number(infrastructure_cost_coefficient),
          payment_fee_coefficient: Number(payment_fee_coefficient)
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, marginRules: data });
    }

    if (action === 'save_credit_pack') {
      const { id, name, price_usd, credits, bonus_credits, active, display_order } = body;
      let result;
      if (id) {
        const { data, error } = await adminClient
          .from('credit_packs')
          .update({
            name,
            price_usd: Number(price_usd),
            credits: Number(credits),
            bonus_credits: Number(bonus_credits),
            active,
            display_order: Number(display_order)
          })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await adminClient
          .from('credit_packs')
          .insert({
            name,
            price_usd: Number(price_usd),
            credits: Number(credits),
            bonus_credits: Number(bonus_credits),
            active,
            display_order: Number(display_order)
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }
      return NextResponse.json({ success: true, creditPack: result });
    }

    if (action === 'update_plan_limit') {
      const { plan_id, monthly_credit_grant, fair_use_allowance, daily_safety_threshold } = body;
      const { data, error } = await adminClient
        .from('plan_ai_limits')
        .update({
          monthly_credit_grant: Number(monthly_credit_grant),
          fair_use_allowance: Boolean(fair_use_allowance),
          daily_safety_threshold: Number(daily_safety_threshold)
        })
        .eq('plan_id', plan_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, planLimit: data });
    }

    if (action === 'admin_adjust_credits') {
      const { target_user_id, credits, transaction_type, description } = body;
      if (!target_user_id) throw new Error('Missing user ID');

      const { data: wallet } = await adminClient
        .from('credit_accounts')
        .select('credit_balance, lifetime_credits_granted')
        .eq('user_id', target_user_id)
        .maybeSingle();

      if (!wallet) throw new Error('User wallet not found');

      const oldBal = Number(wallet.credit_balance);
      const diff = Number(credits);
      const newBal = oldBal + diff;

      await adminClient
        .from('credit_accounts')
        .update({
          credit_balance: newBal,
          lifetime_credits_granted: diff > 0 ? Number(wallet.lifetime_credits_granted || 0) + diff : Number(wallet.lifetime_credits_granted || 0),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', target_user_id);

      await adminClient.from('credit_ledger').insert({
        user_id: target_user_id,
        transaction_type: transaction_type || 'ADMIN_ADJUSTMENT',
        credits: Math.abs(diff),
        balance_before: oldBal,
        balance_after: newBal,
        reference_type: 'admin_action',
        reference_id: adminUser.id,
        description: description || `Admin adjustment: ${diff > 0 ? '+' : ''}${diff} credits`,
        created_by: adminUser.id
      });

      return NextResponse.json({ success: true, newBalance: newBal });
    }

    if (action === 'simulation_run') {
      const { price, credits, expectedUsage, inputTokens, outputTokens, inputCost, outputCost, infraCoefficient } = body;
      const providerCost = (Number(inputTokens) / 1000000) * Number(inputCost) + (Number(outputTokens) / 1000000) * Number(outputCost);
      const totalProviderCost = providerCost * Number(expectedUsage);
      const infraCost = totalProviderCost * (Number(infraCoefficient) / 100);
      const totalCogs = totalProviderCost + infraCost;
      const paymentFee = Number(price) * 0.03; // simulated Stripe/Razorpay processing fee
      const contribution = Number(price) - paymentFee - totalCogs;
      const grossProfit = Number(price) - totalCogs;
      const grossMargin = Number(price) > 0 ? (grossProfit / Number(price)) * 100 : 0;

      return NextResponse.json({
        success: true,
        simulation: {
          providerCostPerUsage: Number(providerCost.toFixed(5)),
          totalProviderCost: Number(totalProviderCost.toFixed(4)),
          infrastructureCost: Number(infraCost.toFixed(4)),
          totalCogs: Number(totalCogs.toFixed(4)),
          paymentFee: Number(paymentFee.toFixed(2)),
          contribution: Number(contribution.toFixed(2)),
          grossProfit: Number(grossProfit.toFixed(2)),
          grossMargin: Number(grossMargin.toFixed(2)),
          breakEvenUsage: providerCost > 0 ? Math.floor((Number(price) - paymentFee) / (providerCost * 1.05)) : 0,
        }
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
