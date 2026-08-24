import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exam_id, topic_id, topic_name, exam_name, country_name, user_id, force_refresh } = body;

    if (!topic_name || (!topic_id && !exam_id)) {
      return NextResponse.json(
        { success: false, error: 'topic_name and topic_id/exam_id are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Record user topic access & check 15-day update rule
    let needsUpdate = false;
    if (user_id && topic_id) {
      const { data: userTopic } = await (supabase as any)
        .from('user_study_topics')
        .select('*')
        .eq('user_id', user_id)
        .eq('exam_topic_id', topic_id)
        .maybeSingle();

      const now = new Date();
      if (userTopic) {
        const lastAccessed = new Date(userTopic.last_accessed_at);
        const daysDiff = (now.getTime() - lastAccessed.getTime()) / (1000 * 3600 * 24);
        if (daysDiff >= 15) {
          needsUpdate = true;
        }

        await (supabase as any)
          .from('user_study_topics')
          .update({
            last_accessed_at: now.toISOString(),
            needs_update_check: needsUpdate,
          })
          .eq('id', userTopic.id);
      } else {
        await (supabase as any)
          .from('user_study_topics')
          .insert({
            user_id,
            exam_id,
            exam_topic_id: topic_id,
            topic_name,
            first_accessed_at: now.toISOString(),
            last_accessed_at: now.toISOString(),
          });
      }
    }

    // 2. Deduplication check: Check for existing MCQs in database
    if (!force_refresh && !needsUpdate && topic_id) {
      const { data: existingMcqs } = await (supabase as any)
        .from('mcqs')
        .select('*')
        .eq('topic_id', topic_id)
        .limit(20);

      const { data: existingNotes } = await (supabase as any)
        .from('notes')
        .select('*')
        .eq('topic_id', topic_id)
        .limit(5);

      const { data: existingFlashcards } = await (supabase as any)
        .from('flashcards')
        .select('*')
        .eq('topic_id', topic_id)
        .limit(20);

      if (existingMcqs && existingMcqs.length >= 5) {
        return NextResponse.json({
          success: true,
          reused_existing: true,
          mcqs: existingMcqs,
          notes: existingNotes || [],
          flashcards: existingFlashcards || [],
        });
      }
    }

    // 3. AI Generation Engine using Gemini server-side
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY missing' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a world-class exam author creating high-yield practice content for:
- Examination: "${exam_name || 'Global Professional Board'}" (${country_name || 'Global'})
- Topic: "${topic_name}"

Generate a complete high-yield study packet containing:
1. 5 High-Yield Multiple Choice Questions (MCQs) with clinical/practical scenarios, 4 options (A-D), correct option index (0-3), detailed rationale, and high-yield key takeaway.
2. 1 Comprehensive High-Yield Summary Note covering high-yield definitions, key mechanisms, exam traps, and clinical pearls.
3. 5 Rapid-Fire Active Recall Flashcards (Front question/prompt, Back concise answer).

Return ONLY a valid JSON object matching this schema:
{
  "mcqs": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_option_index": 0,
      "explanation": "Detailed explanation of why A is correct and why B, C, D are incorrect.",
      "high_yield_takeaway": "Key exam concept to memorize.",
      "difficulty": "Hard"
    }
  ],
  "notes": [
    {
      "title": "High-Yield Summary: ${topic_name}",
      "content": "Markdown content with sections: ## Core Concepts, ## High-Frequency Exam Traps, ## Key Rules"
    }
  ],
  "flashcards": [
    {
      "front": "Front question or cue",
      "back": "Back answer or concept"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '{}';
    const jsonText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonText);

    const generatedMcqs = parsed.mcqs || [];
    const generatedNotes = parsed.notes || [];
    const generatedFlashcards = parsed.flashcards || [];

    // 4. Save to Database
    const savedMcqs: any[] = [];
    for (const mcq of generatedMcqs) {
      const { data: insertedMcq } = await (supabase as any)
        .from('mcqs')
        .insert({
          topic_id: topic_id || null,
          exam_id: exam_id || null,
          question: mcq.question,
          options: mcq.options,
          correct_option_index: mcq.correct_option_index,
          correct_answer: mcq.options?.[mcq.correct_option_index] || '',
          explanation: mcq.explanation,
          high_yield_takeaway: mcq.high_yield_takeaway || '',
          difficulty: mcq.difficulty || 'Hard',
          created_by_ai: true,
        })
        .select('*')
        .single();

      if (insertedMcq) savedMcqs.push(insertedMcq);
    }

    const savedNotes: any[] = [];
    for (const note of generatedNotes) {
      const { data: insertedNote } = await (supabase as any)
        .from('notes')
        .insert({
          topic_id: topic_id || null,
          exam_id: exam_id || null,
          title: note.title,
          content: note.content,
          created_by_ai: true,
        })
        .select('*')
        .single();

      if (insertedNote) savedNotes.push(insertedNote);
    }

    const savedFlashcards: any[] = [];
    for (const fc of generatedFlashcards) {
      const { data: insertedFc } = await (supabase as any)
        .from('flashcards')
        .insert({
          topic_id: topic_id || null,
          exam_id: exam_id || null,
          front: fc.front,
          back: fc.back,
          created_by_ai: true,
        })
        .select('*')
        .single();

      if (insertedFc) savedFlashcards.push(insertedFc);
    }

    return NextResponse.json({
      success: true,
      reused_existing: false,
      appended_15day_update: needsUpdate,
      mcqs: savedMcqs.length > 0 ? savedMcqs : generatedMcqs,
      notes: savedNotes.length > 0 ? savedNotes : generatedNotes,
      flashcards: savedFlashcards.length > 0 ? savedFlashcards : generatedFlashcards,
    });
  } catch (error: any) {
    console.error('Content Generation Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Content generation failed' },
      { status: 500 }
    );
  }
}
