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

const MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  'gemini-3.5-flash': { inputPerM: 0.075, outputPerM: 0.30 },
  'gemini-3.6-flash': { inputPerM: 0.10, outputPerM: 0.40 },
  'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.60 },
  'claude-3-5-sonnet-20241022': { inputPerM: 3.00, outputPerM: 15.00 },
  'llama-3.3-70b-versatile': { inputPerM: 0.59, outputPerM: 0.79 },
  'deepseek-chat': { inputPerM: 0.14, outputPerM: 0.28 },
};

// GET: AI Cost Analysis
export async function GET(req: NextRequest) {
  try {
    await checkIsAdmin();
    const adminClient = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const timeframe = searchParams.get('timeframe') || '30d';

    let startDate = new Date();
    if (timeframe === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }

    // Attempt to fetch from real ai_cost_events first
    const { data: realEvents, error: eventsError } = await adminClient
      .from('ai_cost_events')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (!eventsError && realEvents && realEvents.length > 0) {
      let totalCostUsd = 0;
      let totalCreditsDeducted = 0;
      let totalRevenueUsd = 0;
      const costByProvider: Record<string, number> = {};
      const costByModel: Record<string, number> = {};
      const costByAsset: Record<string, number> = {};

      realEvents.forEach((ev: any) => {
        const provider = ev.provider || 'Google Gemini AI';
        const model = ev.model || 'gemini-3.5-flash';
        const taskType = ev.task_type || 'CHAT';
        const cost = Number(ev.actual_provider_cost || 0) + Number(ev.ai_infrastructure_cost || 0);
        const credits = Number(ev.credits_deducted || 0);
        const revenue = Number(ev.revenue_allocated || 0);

        totalCostUsd += cost;
        totalCreditsDeducted += credits;
        totalRevenueUsd += revenue;

        costByProvider[provider] = (costByProvider[provider] || 0) + cost;
        costByModel[model] = (costByModel[model] || 0) + cost;
        costByAsset[taskType] = (costByAsset[taskType] || 0) + cost;
      });

      const avgMargin = totalRevenueUsd > 0 ? ((totalRevenueUsd - totalCostUsd) / totalRevenueUsd) * 100 : 0;

      return NextResponse.json({
        success: true,
        timeframe,
        source: 'production_events',
        costs: {
          totalCostUsd: Number(totalCostUsd.toFixed(4)),
          totalCreditsDeducted,
          revenueAllocatedUsd: Number(totalRevenueUsd.toFixed(4)),
          grossMarginPercent: Number(avgMargin.toFixed(2)),
          totalGeneratedAssets: realEvents.length,
          costPerAssetUsd: realEvents.length > 0 ? Number((totalCostUsd / realEvents.length).toFixed(6)) : 0,
          byProvider: Object.fromEntries(Object.entries(costByProvider).map(([k, v]) => [k, Number(v.toFixed(4))])),
          byModel: Object.fromEntries(Object.entries(costByModel).map(([k, v]) => [k, Number(v.toFixed(4))])),
          byAsset: Object.fromEntries(Object.entries(costByAsset).map(([k, v]) => [k, Number(v.toFixed(4))])),
          byExam: {},
        },
      });
    }

    // Fallback to estimating based on job logs if realEvents table is still quiet
    const { data: jobs, error } = await adminClient
      .from('ai_generation_jobs')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    let totalCostUsd = 0;
    const costByProvider: Record<string, number> = {};
    const costByModel: Record<string, number> = {};
    const costByAsset: Record<string, number> = {};
    const costByExam: Record<string, number> = {};

    let totalGeneratedAssets = 0;

    (jobs || []).forEach((j: any) => {
      const provider = j.input_params?.provider || 'Gemini';
      const model = j.input_params?.model || 'gemini-3.5-flash';
      const assetType = j.input_params?.asset_type || j.job_type || 'MCQ';
      const examName = j.input_params?.exam_name || 'General';

      const pricing = MODEL_PRICING[model] || MODEL_PRICING['gemini-3.5-flash'];
      const estInput = j.input_params?.estimated_input_tokens || 850;
      const estOutput = j.result?.generated_count ? j.result.generated_count * 220 : (j.status === 'completed' ? 2400 : 0);

      const jobCost = (estInput / 1000000) * pricing.inputPerM + (estOutput / 1000000) * pricing.outputPerM;

      totalCostUsd += jobCost;

      const generatedItems = j.result?.generated_count || (j.status === 'completed' ? (j.input_params?.batch_size || 20) : 0);
      totalGeneratedAssets += generatedItems;

      costByProvider[provider] = (costByProvider[provider] || 0) + jobCost;
      costByModel[model] = (costByModel[model] || 0) + jobCost;
      costByAsset[assetType] = (costByAsset[assetType] || 0) + jobCost;
      costByExam[examName] = (costByExam[examName] || 0) + jobCost;
    });

    const costPerAssetUsd = totalGeneratedAssets > 0 ? totalCostUsd / totalGeneratedAssets : 0;

    return NextResponse.json({
      success: true,
      timeframe,
      source: 'generation_jobs_estimate',
      costs: {
        totalCostUsd: Number(totalCostUsd.toFixed(4)),
        totalGeneratedAssets,
        costPerAssetUsd: Number(costPerAssetUsd.toFixed(6)),
        byProvider: Object.fromEntries(Object.entries(costByProvider).map(([k, v]) => [k, Number(v.toFixed(4))])),
        byModel: Object.fromEntries(Object.entries(costByModel).map(([k, v]) => [k, Number(v.toFixed(4))])),
        byAsset: Object.fromEntries(Object.entries(costByAsset).map(([k, v]) => [k, Number(v.toFixed(4))])),
        byExam: Object.fromEntries(Object.entries(costByExam).map(([k, v]) => [k, Number(v.toFixed(4))])),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
