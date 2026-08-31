import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { normalizeInput } from '@/lib/knowledge/normalizer';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    const examId = searchParams.get('examId');

    if (!subjectId) {
      return NextResponse.json({ error: 'subjectId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify ancestry if examId is provided
    if (examId) {
      const { data: subjectCheck } = await (supabase as any)
        .from('exam_subjects')
        .select('id, exam_id')
        .eq('id', subjectId)
        .maybeSingle();

      if (!subjectCheck || subjectCheck.exam_id !== examId) {
        return NextResponse.json(
          { error: 'Ancestry mismatch: Subject does not belong to the specified exam.' },
          { status: 400 }
        );
      }
    }

    const { data: topics, error } = await (supabase as any)
      .from('exam_topics')
      .select('id, subject_id, name, description, display_order, created_at')
      .eq('subject_id', subjectId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      topics: topics || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { examId, subjectId, name, description } = body;

    if (!subjectId || !name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'subjectId and a non-empty name are required.' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const supabase = getSupabaseAdmin();

    // 1. Verify subject exists and validate ancestry with exam if provided
    const { data: subject, error: subjErr } = await (supabase as any)
      .from('exam_subjects')
      .select('id, exam_id, name, exams(id, name)')
      .eq('id', subjectId)
      .maybeSingle();

    if (subjErr || !subject) {
      return NextResponse.json(
        { success: false, error: 'Subject not found in database.' },
        { status: 404 }
      );
    }

    if (examId && subject.exam_id !== examId) {
      return NextResponse.json(
        { success: false, error: 'Ancestry mismatch: Subject does not belong to the provided exam.' },
        { status: 400 }
      );
    }

    const examName = subject.exams?.name || 'Target Exam';
    const norm = normalizeInput(trimmedName);
    const slug = norm.slug;
    const canonicalName = norm.canonical;

    // 2. Check if topic already exists for this subject
    const { data: existingTopics } = await (supabase as any)
      .from('exam_topics')
      .select('id, subject_id, name, description')
      .eq('subject_id', subjectId)
      .or(`name.ilike.${trimmedName},slug.ilike.${slug},name.ilike.${canonicalName}`)
      .limit(1);

    if (existingTopics && existingTopics.length > 0) {
      const existing = existingTopics[0];
      return NextResponse.json({
        success: true,
        reused: true,
        topic: existing,
        message: `Existing topic '${existing.name}' reused.`,
      });
    }

    // 3. AI Relevance Validation
    let isValid = true;
    let relevanceReason = '';

    try {
      const prompt = `You are an expert curriculum validator.
Exam: "${examName}"
Subject: "${subject.name}"
Proposed Topic: "${trimmedName}"

Determine if "${trimmedName}" is a valid, high-yield learning topic under "${subject.name}" for "${examName}".
Respond with valid JSON:
{
  "isValid": boolean,
  "canonicalName": string,
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
          error: relevanceReason || `"${trimmedName}" is not relevant to ${subject.name} under ${examName}.`,
        },
        { status: 422 }
      );
    }

    // 4. Insert new canonical topic
    const { data: newTopic, error: insertErr } = await (supabase as any)
      .from('exam_topics')
      .insert({
        subject_id: subjectId,
        name: trimmedName,
        slug,
        description: description || `Curriculum topic under ${subject.name}`,
        is_active: true,
      })
      .select('id, subject_id, name, description')
      .single();

    if (insertErr || !newTopic) {
      return NextResponse.json(
        { success: false, error: insertErr?.message || 'Failed to insert topic.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reused: false,
      topic: newTopic,
      message: `Topic '${newTopic.name}' created successfully under ${subject.name}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
