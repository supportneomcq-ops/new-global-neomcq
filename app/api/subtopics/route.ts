import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { normalizeInput } from '@/lib/knowledge/normalizer';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topicId');
    const subjectId = searchParams.get('subjectId');
    const examId = searchParams.get('examId');

    if (!topicId) {
      return NextResponse.json({ error: 'topicId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify ancestry if subjectId or examId provided
    if (subjectId || examId) {
      const { data: topicData } = await (supabase as any)
        .from('exam_topics')
        .select('id, subject_id, exam_subjects(id, exam_id)')
        .eq('id', topicId)
        .maybeSingle();

      if (!topicData) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
      }

      if (subjectId && topicData.subject_id !== subjectId) {
        return NextResponse.json(
          { error: 'Ancestry mismatch: Topic does not belong to the specified subject.' },
          { status: 400 }
        );
      }

      if (examId && (topicData.exam_subjects as any)?.exam_id !== examId) {
        return NextResponse.json(
          { error: 'Ancestry mismatch: Topic does not belong to the specified exam.' },
          { status: 400 }
        );
      }
    }

    const { data: subtopics, error } = await (supabase as any)
      .from('exam_subtopics')
      .select('id, topic_id, name, description, display_order, is_active, created_at')
      .eq('topic_id', topicId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subtopics: subtopics || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { examId, subjectId, topicId, name, description } = body;

    if (!topicId || !name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'topicId and a non-empty name are required.' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const supabase = getSupabaseAdmin();

    // 1. Verify ancestry: Topic -> Subject -> Exam
    const { data: topic, error: topicErr } = await (supabase as any)
      .from('exam_topics')
      .select(`
        id,
        name,
        subject_id,
        exam_subjects (
          id,
          name,
          exam_id,
          exams (
            id,
            name
          )
        )
      `)
      .eq('id', topicId)
      .maybeSingle();

    if (topicErr || !topic) {
      return NextResponse.json(
        { success: false, error: 'Topic not found in database.' },
        { status: 404 }
      );
    }

    const subjectObj = topic.exam_subjects as any;
    const examObj = subjectObj?.exams as any;

    if (subjectId && topic.subject_id !== subjectId) {
      return NextResponse.json(
        { success: false, error: 'Ancestry mismatch: Topic does not belong to specified subject.' },
        { status: 400 }
      );
    }

    if (examId && subjectObj?.exam_id !== examId) {
      return NextResponse.json(
        { success: false, error: 'Ancestry mismatch: Subject does not belong to specified exam.' },
        { status: 400 }
      );
    }

    const topicName = topic.name;
    const subjectName = subjectObj?.name || 'Subject';
    const examName = examObj?.name || 'Exam';

    const norm = normalizeInput(trimmedName);
    const slug = norm.slug;
    const canonicalName = norm.canonical;

    // 2. Check if subtopic already exists under this topic
    const { data: existingSubtopics } = await (supabase as any)
      .from('exam_subtopics')
      .select('id, topic_id, name, description')
      .eq('topic_id', topicId)
      .or(`name.ilike.${trimmedName},slug.ilike.${slug},name.ilike.${canonicalName}`)
      .limit(1);

    if (existingSubtopics && existingSubtopics.length > 0) {
      const existing = existingSubtopics[0];
      return NextResponse.json({
        success: true,
        reused: true,
        subtopic: existing,
        message: `Existing subtopic '${existing.name}' reused.`,
      });
    }

    // 3. AI Relevance Validation
    let isValid = true;
    let relevanceReason = '';

    try {
      const prompt = `You are an expert curriculum validator.
Exam: "${examName}"
Subject: "${subjectName}"
Topic: "${topicName}"
Proposed Subtopic: "${trimmedName}"

Determine if "${trimmedName}" is a valid, high-yield granular subtopic under "${topicName}" (${subjectName}) for "${examName}".
Respond with valid JSON:
{
  "isValid": boolean,
  "canonicalName": string,
  "reason": string
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
          error: relevanceReason || `"${trimmedName}" is not relevant to ${topicName} under ${examName}.`,
        },
        { status: 422 }
      );
    }

    // 4. Insert new canonical subtopic
    const { data: newSubtopic, error: insertErr } = await (supabase as any)
      .from('exam_subtopics')
      .insert({
        topic_id: topicId,
        name: trimmedName,
        slug,
        description: description || `Curriculum subtopic under ${topicName}`,
        is_active: true,
      })
      .select('id, topic_id, name, description')
      .single();

    if (insertErr || !newSubtopic) {
      return NextResponse.json(
        { success: false, error: insertErr?.message || 'Failed to insert subtopic.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reused: false,
      subtopic: newSubtopic,
      message: `Subtopic '${newSubtopic.name}' created successfully under ${topicName}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
