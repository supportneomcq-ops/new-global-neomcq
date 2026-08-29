import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

// GET: AI Usage Analytics from real ai_jobs and ai_cost_events
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const timeframe = searchParams.get('timeframe') || '7d';

    let startDate = new Date();
    if (timeframe === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      // 7d default
      startDate.setDate(startDate.getDate() - 7);
    }

    const [jobsRes, costEventsRes, profilesRes] = await Promise.all([
      adminClient
        .from('ai_jobs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),
      adminClient
        .from('ai_cost_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),
      adminClient.from('profiles').select('id, email, full_name'),
    ]);

    const jobs = jobsRes.data || [];
    const costEvents = costEventsRes.data || [];
    const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

    const totalRequests = jobs.length;
    const successfulRequests = jobs.filter((j) => j.status === 'completed' || j.status === 'success').length;
    const failedRequests = jobs.filter((j) => j.status === 'failed' || j.status === 'error').length;
    const queuedRequests = jobs.filter((j) => j.status === 'queued' || j.status === 'pending').length;
    const runningRequests = jobs.filter((j) => j.status === 'running' || j.status === 'processing').length;

    let totalTokensInput = 0;
    let totalTokensOutput = 0;

    const byProvider: Record<string, { requests: number; success: number; failed: number; tokens: number }> = {};
    const byModel: Record<string, { requests: number; tokens: number }> = {};
    const byTask: Record<string, number> = {};
    const byExam: Record<string, number> = {};
    const userUsageMap: Record<string, { userId: string; email: string; name: string; requests: number; tokens: number; credits: number }> = {};

    // Process cost events first for high-fidelity token accounting
    costEvents.forEach((ev: any) => {
      const inTok = Number(ev.input_tokens || 0);
      const outTok = Number(ev.output_tokens || 0);
      totalTokensInput += inTok;
      totalTokensOutput += outTok;

      if (ev.user_id) {
        if (!userUsageMap[ev.user_id]) {
          const profile = profilesMap.get(ev.user_id) || { email: 'Unknown', full_name: 'Anonymous User' };
          userUsageMap[ev.user_id] = {
            userId: ev.user_id,
            email: profile.email || 'N/A',
            name: profile.full_name || 'Anonymous User',
            requests: 0,
            tokens: 0,
            credits: 0,
          };
        }
        userUsageMap[ev.user_id].requests += 1;
        userUsageMap[ev.user_id].tokens += inTok + outTok;
        userUsageMap[ev.user_id].credits += Number(ev.credits_deducted || 0);
      }
    });

    // Process jobs for breakdown distributions
    jobs.forEach((j: any) => {
      const payload = j.input_payload || {};
      const output = j.output_payload || {};
      const provider = j.provider || payload.provider || 'Google Gemini AI';
      const model = j.model || payload.model || 'gemini-3.5-flash';
      const taskType = j.task || payload.job_type || payload.asset_type || 'MCQ_GENERATION';
      const examName = payload.exam_name || 'General';

      const inTok = Number(payload.input_tokens || output.input_tokens || 0);
      const outTok = Number(output.output_tokens || payload.output_tokens || 0);

      // Provider breakdown
      if (!byProvider[provider]) {
        byProvider[provider] = { requests: 0, success: 0, failed: 0, tokens: 0 };
      }
      byProvider[provider].requests += 1;
      if (j.status === 'completed' || j.status === 'success') byProvider[provider].success += 1;
      if (j.status === 'failed' || j.status === 'error') byProvider[provider].failed += 1;
      byProvider[provider].tokens += inTok + outTok;

      // Model breakdown
      if (!byModel[model]) {
        byModel[model] = { requests: 0, tokens: 0 };
      }
      byModel[model].requests += 1;
      byModel[model].tokens += inTok + outTok;

      // Task breakdown
      byTask[taskType] = (byTask[taskType] || 0) + 1;

      // Exam breakdown
      byExam[examName] = (byExam[examName] || 0) + 1;
    });

    const topUsers = Object.values(userUsageMap)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      timeframe,
      metrics: {
        totalRequests,
        successfulRequests,
        failedRequests,
        queuedRequests,
        runningRequests,
        successRatePercentage: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100,
        tokensInput: totalTokensInput,
        tokensOutput: totalTokensOutput,
        totalTokens: totalTokensInput + totalTokensOutput,
      },
      breakdowns: {
        byProvider,
        byModel,
        byTask,
        byExam,
      },
      topUsers,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
