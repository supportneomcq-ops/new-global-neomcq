import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { normalizeInput } from '@/lib/knowledge/normalizer';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');

    if (!examId) {
      return NextResponse.json({ error: 'examId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: subjects, error } = await (supabase as any)
      .from('exam_subjects')
      .select('id, exam_id, name, description, display_order, created_at')
      .eq('exam_id', examId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subjects: subjects || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { examId, name, description } = body;

    if (!examId || !name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'examId and a non-empty name are required.' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const supabase = getSupabaseAdmin();

    // 1. Verify exam exists
    const { data: exam, error: examErr } = await (supabase as any)
      .from('exams')
      .select('id, name, slug')
      .eq('id', examId)
      .maybeSingle();

    if (examErr || !exam) {
      return NextResponse.json(
        { success: false, error: 'Exam not found in database.' },
        { status: 404 }
      );
    }

    const norm = normalizeInput(trimmedName);
    const slug = norm.slug;
    const canonicalName = norm.canonical;

    // 2. Check if subject already exists for this exam
    const { data: existingSubjs } = await (supabase as any)
      .from('exam_subjects')
      .select('id, exam_id, name, description')
      .eq('exam_id', examId)
      .or(`name.ilike.${trimmedName},slug.ilike.${slug},name.ilike.${canonicalName}`)
      .limit(1);

    if (existingSubjs && existingSubjs.length > 0) {
      const existing = existingSubjs[0];
      return NextResponse.json({
        success: true,
        reused: true,
        subject: existing,
        message: `Existing subject '${existing.name}' reused.`,
      });
    }

    // 3. AI Relevance & Curriculum Validation
    let isValid = true;
    let relevanceReason = '';

    try {
      const prompt = `You are a strict curriculum accreditation validator.
Exam: "${exam.name}"
Proposed Subject: "${trimmedName}"

Determine if "${trimmedName}" is a valid, relevant academic/clinical subject under the curriculum for "${exam.name}".
Respond with valid JSON:
{
  "isValid": boolean,
  "canonicalName": string,
  "description": string,
  "reason": string
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(response.text || '{}');
      isValid = parsed.isValid !== false;
      relevanceReason = parsed.reason || '';
    } catch (aiErr) {
      console.warn('AI validation warning, falling back to permissive check:', aiErr);
    }

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: relevanceReason || `"${trimmedName}" is not relevant to the ${exam.name} curriculum.`,
        },
        { status: 422 }
      );
    }

    // 4. Insert new canonical subject
    const { data: newSubj, error: insertErr } = await (supabase as any)
      .from('exam_subjects')
      .insert({
        exam_id: examId,
        name: trimmedName,
        slug,
        description: description || `Curriculum subject for ${exam.name}`,
        is_active: true,
      })
      .select('id, exam_id, name, description')
      .single();

    if (insertErr || !newSubj) {
      return NextResponse.json(
        { success: false, error: insertErr?.message || 'Failed to insert subject.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reused: false,
      subject: newSubj,
      message: `Subject '${newSubj.name}' created successfully under ${exam.name}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
