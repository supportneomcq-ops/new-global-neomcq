import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { getDateRange, safeAvg } from '@/lib/analytics-utils';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const timeframe = searchParams.get('timeframe') || '30d';
    const customStart = searchParams.get('customStart') || undefined;
    const customEnd = searchParams.get('customEnd') || undefined;

    const { startDate, endDate } = getDateRange(timeframe, customStart, customEnd);

    const { data: jobs, error } = await adminClient
      .from('ai_jobs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    const jobsList = jobs || [];

    const totalRequests = jobsList.length;
    const successfulRequests = jobsList.filter(j => j.status === 'completed' || j.status === 'success').length;
    const failedRequests = jobsList.filter(j => j.status === 'failed' || j.status === 'error').length;
    const pendingRequests = totalRequests - successfulRequests - failedRequests;

    const successRate = safeAvg(successfulRequests * 100, totalRequests, 1);

    // Retries count
    const retriesCount = jobsList.reduce((acc, j) => acc + (j.attempts > 1 ? j.attempts - 1 : (j.status === 'failed' ? 1 : 0)), 0);
    const retryRate = safeAvg(retriesCount * 100, totalRequests, 1);

    // Token & Cost Calculations
    let totalTokens = 0;
    let totalCostUSD = 0;
    let totalExecutionTimeMs = 0;

    const byProviderMap: Record<string, { requests: number; success: number; failed: number; cost: number }> = {};
    const byModelMap: Record<string, { requests: number; success: number; tokens: number }> = {};
    const byAssetTypeMap: Record<string, number> = {};

    jobsList.forEach((j: any) => {
      const payload = j.input_payload || {};
      const output = j.output_payload || {};
      const provider = j.provider || payload.provider || 'Google Gemini AI';
      const model = j.model || payload.model || 'gemini-3.5-flash';
      const assetType = payload.asset_type || j.task || 'MCQ';

      const inTokens = payload.estimated_input_tokens || 850;
      const outTokens = output.generated_count ? output.generated_count * 250 : (j.status === 'completed' ? 1200 : 0);
      const tokens = inTokens + outTokens;

      // Gemini pricing approx $0.00015 per 1k tokens
      const cost = (tokens / 1000) * 0.00015;

      totalTokens += tokens;
      totalCostUSD += cost;

      if (output.duration_ms) {
        totalExecutionTimeMs += output.duration_ms;
      } else if (j.completed_at && j.created_at) {
        totalExecutionTimeMs += Math.max(0, new Date(j.completed_at).getTime() - new Date(j.created_at).getTime());
      } else {
        totalExecutionTimeMs += 1800; // default 1.8s
      }

      // Provider
      if (!byProviderMap[provider]) byProviderMap[provider] = { requests: 0, success: 0, failed: 0, cost: 0 };
      byProviderMap[provider].requests += 1;
      if (j.status === 'completed' || j.status === 'success') byProviderMap[provider].success += 1;
      if (j.status === 'failed') byProviderMap[provider].failed += 1;
      byProviderMap[provider].cost += cost;

      // Model
      if (!byModelMap[model]) byModelMap[model] = { requests: 0, success: 0, tokens: 0 };
      byModelMap[model].requests += 1;
      if (j.status === 'completed' || j.status === 'success') byModelMap[model].success += 1;
      byModelMap[model].tokens += tokens;

      // Asset Type
      byAssetTypeMap[assetType] = (byAssetTypeMap[assetType] || 0) + 1;
    });

    const avgLatencySecs = safeAvg(totalExecutionTimeMs / 1000, totalRequests, 2);

    return NextResponse.json({
      success: true,
      metrics: {
        totalRequests,
        successfulRequests,
        failedRequests,
        pendingRequests,
        successRate,
        totalTokens,
        totalCostUSD: parseFloat(totalCostUSD.toFixed(4)),
        avgLatencySecs,
        retryRate,
      },
      byProvider: Object.entries(byProviderMap).map(([provider, val]) => ({
        provider,
        requests: val.requests,
        success: val.success,
        failed: val.failed,
        cost: parseFloat(val.cost.toFixed(4)),
      })),
      byModel: Object.entries(byModelMap).map(([model, val]) => ({
        model,
        requests: val.requests,
        success: val.success,
        tokens: val.tokens,
      })),
      byAssetType: Object.entries(byAssetTypeMap).map(([assetType, count]) => ({
        assetType,
        count,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching AI analytics:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
