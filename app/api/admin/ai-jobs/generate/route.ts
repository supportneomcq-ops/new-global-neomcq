import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;
    const user = auth.user!;
    const adminClient = getSupabaseAdmin();
    const body = await req.json();

    const {
      asset_type = 'mcq',
      exam_id,
      subject_id,
      topic_id,
      batch_size = 5,
      priority = 'Normal',
      provider = 'gemini',
      model = 'gemini-3.5-flash',
      mode = 'check_and_generate', // 'check_only' | 'check_and_generate'
    } = body;

    // STEP 1: CANONICAL RESOLUTION
    let exam_name = 'General Medical Examination';
    let subject_name = 'General Practice';
    let topic_name = 'General Medical Topics';

    if (exam_id) {
      const { data: ex } = await adminClient.from('exams').select('name').eq('id', exam_id).single();
      if (ex) exam_name = ex.name;
    }
    if (subject_id) {
      const { data: sb } = await adminClient.from('exam_subjects').select('name').eq('id', subject_id).single();
      if (sb) subject_name = sb.name;
    }
    if (topic_id) {
      const { data: tp } = await adminClient.from('exam_topics').select('name').eq('id', topic_id).single();
      if (tp) topic_name = tp.name;
    }

    // STEP 2: EXISTING CONTENT CHECK
    let existingCount = 0;
    if (asset_type === 'mcq') {
      const { count } = await adminClient.from('mcqs').select('*', { count: 'exact', head: true }).eq('topic_id', topic_id || '00000000-0000-0000-0000-000000000000');
      if (count !== null) existingCount = count;
    } else if (asset_type === 'note') {
      const { count } = await adminClient.from('notes').select('*', { count: 'exact', head: true }).eq('topic_id', topic_id || '00000000-0000-0000-0000-000000000000');
      if (count !== null) existingCount = count;
    } else if (asset_type === 'flashcard') {
      const { count } = await adminClient.from('flashcards').select('*', { count: 'exact', head: true }).eq('topic_id', topic_id || '00000000-0000-0000-0000-000000000000');
      if (count !== null) existingCount = count;
    } else if (asset_type === 'revision_sheet') {
      const { count } = await adminClient.from('revision_sheets').select('*', { count: 'exact', head: true }).eq('topic_id', topic_id || '00000000-0000-0000-0000-000000000000');
      if (count !== null) existingCount = count;
    }

    if (mode === 'check_only') {
      return NextResponse.json({
        success: true,
        canonical: { exam_name, subject_name, topic_name },
        existing_count: existingCount,
        message: `Existing content check complete: ${existingCount} ${asset_type}(s) already exist for ${topic_name}.`,
      });
    }

    // STEP 3: INSERT PENDING JOB ENTRY
    const input_payload = {
      asset_type,
      exam_id,
      exam_name,
      subject_id,
      subject_name,
      topic_id,
      topic_name,
      batch_size,
      priority,
      provider,
      model,
      initiated_by: user.email,
      estimated_input_tokens: 1200,
    };

    const { data: job, error: jobErr } = await adminClient
      .from('ai_jobs')
      .insert({
        user_id: user.id,
        exam_id: exam_id || null,
        subject_id: subject_id || null,
        topic_id: topic_id || null,
        task: `${asset_type}_generation`,
        status: 'processing',
        provider: provider || 'gemini',
        model: model || 'gemini-3.5-flash',
        priority: priority === 'High' ? 10 : priority === 'Low' ? 1 : 5,
        input_payload,
        attempts: 1,
      })
      .select('*')
      .single();

    if (jobErr) throw jobErr;

    // STEP 4: SERVER-SIDE AI GENERATION EXECUTION
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await adminClient
        .from('ai_jobs')
        .update({
          status: 'failed',
          error: 'GEMINI_API_KEY is not configured in environment',
        })
        .eq('id', job.id);

      return NextResponse.json({
        error: 'AI Provider key missing (GEMINI_API_KEY). Job set to failed status.',
        job_id: job.id,
      }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a world-class medical exam author and clinical specialist creating production-grade learning content for ${exam_name}.
Subject: ${subject_name}
Topic: ${topic_name}
Asset Type: ${asset_type.toUpperCase()}
Quantity: ${batch_size}

Target JSON Structure:
For MCQs: Output a JSON array of objects with:
- "question_text": string (high-yield clinical scenario)
- "options": array of 4 objects: [{"option_id": "A", "option_text": string, "is_correct": boolean, "explanation": string}]
- "explanation": string (detailed step-by-step clinical rationale)
- "difficulty": "Beginner" | "Intermediate" | "Advanced" | "Expert"
- "high_yield_tag": string

For Notes: Output a JSON object with:
- "title": string
- "content_markdown": string (rich markdown with bullet points, clinical pearls, key mnemonics)
- "summary": string

For Flashcards: Output a JSON array of objects with:
- "front": string (question or scenario)
- "back": string (concise high-yield answer)

Respond ONLY with valid, parseable JSON matching the specified structure without markdown code blocks.`;

    const aiResponse = await ai.models.generateContent({
      model: model || 'gemini-3.5-flash',
      contents: prompt,
    });

    const responseText = aiResponse.text || '';
    let parsedResult: any = null;

    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch {
      parsedResult = { raw_output: responseText };
    }

    const duration = Date.now() - startTime;
    const generatedCount = Array.isArray(parsedResult) ? parsedResult.length : 1;

    // STEP 5: SAVE RESULT & UPDATE JOB STATUS TO COMPLETED
    await adminClient
      .from('ai_jobs')
      .update({
        status: 'completed',
        output_payload: {
          generated_count: generatedCount,
          duration_ms: duration,
          payload: parsedResult,
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // RECORD AUDIT LOG
    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'AI_JOB_COMPLETED',
      entity_type: 'ai_jobs',
      entity_id: job.id,
      details: { asset_type, exam_name, topic_name, generatedCount, duration_ms: duration },
    });

    return NextResponse.json({
      success: true,
      job_id: job.id,
      status: 'COMPLETED',
      duration_ms: duration,
      canonical: { exam_name, subject_name, topic_name },
      generated_count: generatedCount,
      existing_count: existingCount,
      result: parsedResult,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
