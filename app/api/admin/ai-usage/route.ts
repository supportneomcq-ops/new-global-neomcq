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

// GET: AI Usage Analytics
export async function GET(req: NextRequest) {
  try {
    await checkIsAdmin();
    const adminClient = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const timeframe = searchParams.get('timeframe') || '7d';

    let startDate = new Date();
    if (timeframe === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      // default 7d
      startDate.setDate(startDate.getDate() - 7);
    }

    const { data: jobs, error } = await adminClient
      .from('ai_generation_jobs')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const totalRequests = jobs?.length || 0;
    const successfulRequests = jobs?.filter((j) => j.status === 'completed').length || 0;
    const failedRequests = jobs?.filter((j) => j.status === 'failed').length || 0;

    // Estimate token usage from job input_params and results
    let totalTokensInput = 0;
    let totalTokensOutput = 0;

    const byProvider: Record<string, { requests: number; success: number; failed: number; tokens: number }> = {};
    const byModel: Record<string, { requests: number; tokens: number }> = {};
    const byAssetType: Record<string, number> = {};
    const byExam: Record<string, number> = {};

    (jobs || []).forEach((j: any) => {
      const provider = j.input_params?.provider || 'Gemini';
      const model = j.input_params?.model || 'gemini-3.5-flash';
      const assetType = j.input_params?.asset_type || j.job_type || 'MCQ';
      const examName = j.input_params?.exam_name || 'General';

      const estimatedInput = j.input_params?.estimated_input_tokens || 850;
      const estimatedOutput = j.result?.generated_count ? j.result.generated_count * 220 : (j.status === 'completed' ? 2400 : 0);

      totalTokensInput += estimatedInput;
      totalTokensOutput += estimatedOutput;

      // By Provider
      if (!byProvider[provider]) {
        byProvider[provider] = { requests: 0, success: 0, failed: 0, tokens: 0 };
      }
      byProvider[provider].requests += 1;
      if (j.status === 'completed') byProvider[provider].success += 1;
      if (j.status === 'failed') byProvider[provider].failed += 1;
      byProvider[provider].tokens += estimatedInput + estimatedOutput;

      // By Model
      if (!byModel[model]) {
        byModel[model] = { requests: 0, tokens: 0 };
      }
      byModel[model].requests += 1;
      byModel[model].tokens += estimatedInput + estimatedOutput;

      // By Asset Type
      byAssetType[assetType] = (byAssetType[assetType] || 0) + 1;

      // By Exam
      byExam[examName] = (byExam[examName] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      timeframe,
      metrics: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRatePercentage: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100,
        tokensInput: totalTokensInput,
        tokensOutput: totalTokensOutput,
        totalTokens: totalTokensInput + totalTokensOutput,
      },
      breakdowns: {
        byProvider,
        byModel,
        byAssetType,
        byExam,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
