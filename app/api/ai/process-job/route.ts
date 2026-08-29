import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { AIGateway } from '@/lib/ai-gateway';

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();

    // 1. Retrieve job
    const { data: job, error: fetchError } = await adminClient
      .from('ai_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'completed') {
      return NextResponse.json({ success: true, status: 'completed', result: job.output_payload });
    }

    // 2. Mark job as running
    await adminClient
      .from('ai_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        attempts: (job.attempts || 0) + 1,
      })
      .eq('id', jobId);

    const taskType = job.task || job.input_payload?.job_type || 'study_plan';
    const inputParams = job.input_payload || {};
    const cacheKey = `${taskType}:${JSON.stringify(inputParams)}`;

    // 3. Check AI Content Cache (Deduplication)
    const { data: cached } = await adminClient
      .from('ai_content_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached && cached.payload) {
      await adminClient
        .from('ai_jobs')
        .update({
          status: 'completed',
          output_payload: {
            payload: cached.payload,
            from_cache: true,
            completed_at: new Date().toISOString(),
          },
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return NextResponse.json({
        success: true,
        status: 'completed',
        cached: true,
        result: cached.payload,
      });
    }

    // 4. Execute Generation via AIGateway
    try {
      const systemInstruction = `You are NeoMCQ AI Engine. Generate authoritative, high-yield medical and academic content for task: ${taskType}. Always respond in strict, valid JSON format.`;
      const prompt = `Input details:\n${JSON.stringify(inputParams, null, 2)}`;

      const genResult = await AIGateway.generateContent({
        userId: job.user_id,
        taskType,
        prompt,
        systemInstruction,
        preferredModel: job.model || undefined,
        jobId: job.id,
      });

      const finalOutput = genResult.parsedJson || { text: genResult.text };

      // 5. Update ai_jobs to completed
      await adminClient
        .from('ai_jobs')
        .update({
          status: 'completed',
          provider: genResult.providerUsed,
          model: genResult.modelUsed,
          output_payload: {
            payload: finalOutput,
            metrics: genResult.metrics,
            generated_at: new Date().toISOString(),
          },
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // 6. Cache output for 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await adminClient.from('ai_content_cache').upsert(
        {
          cache_key: cacheKey,
          content_type: taskType,
          payload: finalOutput,
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: 'cache_key' }
      );

      return NextResponse.json({
        success: true,
        status: 'completed',
        result: finalOutput,
        metrics: genResult.metrics,
      });
    } catch (aiErr: any) {
      console.error('AI Generation execution error:', aiErr);
      await adminClient
        .from('ai_jobs')
        .update({
          status: 'failed',
          error: aiErr.message || 'AI generation processing failure',
        })
        .eq('id', jobId);

      return NextResponse.json(
        {
          error: 'AI generation failed',
          details: aiErr.message,
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
