import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { extractJsonFromAiResponse } from '@/lib/ai/json-cleaner';
import { getExamStyleAndPattern } from '@/lib/server/content-engine/exam-style-helper';
import { AIGateway } from '@/lib/ai-gateway';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      exam: requestedExam,
      subject: requestedSubject,
      topic: requestedTopic,
      subtopic: requestedSubtopic,
      userId: requestedUserId,
    } = body || {};

    const sessionClient = await createClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Please sign in to generate sticky notes.' }, { status: 401 });
    }
    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json({ success: false, error: 'You cannot generate notes for another user.' }, { status: 403 });
    }

    if (!requestedExam?.id || !requestedSubject?.id || !requestedTopic?.id) {
      return NextResponse.json(
        { success: false, error: 'Select a valid exam, subject, and topic before generating sticky notes.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Validate every level of the hierarchy from the database; never trust client-supplied names/relationships.
    const [
      { data: examRow, error: examError },
      { data: subjectRow, error: subjectError },
      { data: topicRow, error: topicError },
    ] = await Promise.all([
      (supabase as any).from('exams').select('id, name, country_id').eq('id', requestedExam.id).maybeSingle(),
      (supabase as any).from('exam_subjects').select('id, name, exam_id').eq('id', requestedSubject.id).maybeSingle(),
      (supabase as any).from('exam_topics').select('id, name, subject_id').eq('id', requestedTopic.id).maybeSingle(),
    ]);

    if (examError || subjectError || topicError) {
      console.error('[Sticky Notes] Curriculum lookup failed:', examError || subjectError || topicError);
      return NextResponse.json({ success: false, error: 'We could not verify the selected curriculum. Please retry.' }, { status: 503 });
    }
    if (!examRow || !subjectRow || !topicRow ||
        subjectRow.exam_id !== examRow.id || topicRow.subject_id !== subjectRow.id) {
      return NextResponse.json({ success: false, error: 'The selected exam, subject, and topic do not match.' }, { status: 400 });
    }

    let subtopicRow: any = null;
    if (requestedSubtopic?.id) {
      const { data, error } = await (supabase as any)
        .from('exam_subtopics')
        .select('id, name, topic_id')
        .eq('id', requestedSubtopic.id)
        .maybeSingle();
      if (error) {
        console.error('[Sticky Notes] Subtopic lookup failed:', error.message);
        return NextResponse.json({ success: false, error: 'We could not verify the selected subtopic. Please retry.' }, { status: 503 });
      }
      if (!data || data.topic_id !== topicRow.id) {
        return NextResponse.json({ success: false, error: 'The selected subtopic does not belong to this topic.' }, { status: 400 });
      }
      subtopicRow = data;
    }

    const exam = { id: examRow.id, name: examRow.name };
    const subject = { id: subjectRow.id, name: subjectRow.name };
    const topic = { id: topicRow.id, name: topicRow.name };
    const subtopic = subtopicRow ? { id: subtopicRow.id, name: subtopicRow.name } : null;
    const targetUserId = user.id;

    const { checkFeatureQuota } = await import('@/lib/entitlements/quota-checker');
    const quotaResult = await checkFeatureQuota({
      userId: targetUserId,
      feature: 'sticky_notes',
      topicId: topic.id,
      examId: exam.id,
      subjectId: subject.id,
    });

    if (!quotaResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: quotaResult.upgradeMessage || quotaResult.reason,
          limitReached: true,
          limitType: quotaResult.limitType,
          upgradeRequired: true,
          planCode: quotaResult.planCode,
        },
        { status: 403 }
      );
    }

    const { data: existingNotes, error: existingNotesError } = await (supabase as any)
      .from('user_sticky_notes')
      .select('title, text')
      .eq('user_id', targetUserId)
      .eq('topic_id', topic.id)
      .limit(12);

    if (existingNotesError) {
      console.error('[Sticky Notes] Existing note lookup failed:', existingNotesError.message);
      return NextResponse.json({ success: false, error: 'We could not load your existing notes. Please retry.' }, { status: 503 });
    }

    const existingSummary = (existingNotes || [])
      .map((note: any) => `- ${note.title ? note.title + ': ' : ''}${String(note.text || '').slice(0, 350)}`)
      .join('\n');
    const styleAndPattern = await getExamStyleAndPattern(exam.id, supabase);
    const contextHierarchy = [exam.name, subject.name, topic.name, subtopic?.name]
      .filter(Boolean)
      .join(' > ');

    const prompt = `Create 3 to 4 distinct, ultra-high-yield memory sticky notes for a candidate studying for:
Context: ${contextHierarchy}

Domain: ${styleAndPattern.domain}
Exam style: ${styleAndPattern.styleDescription}

${existingSummary ? `Avoid repeating these notes already saved by the user:\n${existingSummary}\nGenerate new, complementary concepts.` : ''}

Each note must focus on a distinct category adapted to the exam:
- high_yield: core principle
- board_trap: common exam trick or pitfall
- clinical: diagnostic clue or classic scenario
- pharmacology: key drug/component/rule
- diagnosis: gold-standard test or verification method
- treatment: first-line management
- remember: mnemonic or rule of thumb
- formula: important calculation or governing rule

Return only a valid JSON array with 3 to 4 objects:
[
  {
    "title": "Short title, maximum 5 words",
    "text": "Accurate, concise 1 to 3 sentence exam-specific summary",
    "category": "high_yield|board_trap|clinical|pharmacology|diagnosis|treatment|remember|formula",
    "color": "yellow|amber|pink|violet|green|blue|orange",
    "size": "sm|md|lg"
  }
]
Do not use generic filler. Do not invent facts. Output JSON only.`;

    const generation = await AIGateway.generateContent({
      userId: targetUserId,
      taskType: 'summary_notes',
      prompt,
      systemInstruction: 'Generate accurate, exam-specific study notes. Return a JSON array only, with no markdown fences.',
      preferredProvider: 'gemini',
      preferredModel: 'gemini-3.5-flash',
      maxOutputTokens: 3000,
      responseMimeType: 'application/json',
    });

    let generatedArray: any = generation.parsedJson;
    if (!Array.isArray(generatedArray)) {
      try {
        generatedArray = extractJsonFromAiResponse(generation.text || '');
      } catch {
        generatedArray = null;
      }
    }

    if (!Array.isArray(generatedArray) || generatedArray.length < 3) {
      console.error('[Sticky Notes] AI returned invalid structured output:', { length: (generation.text || '').length });
      return NextResponse.json({
        success: false,
        error: 'The AI could not produce complete sticky notes this time. Please retry.',
      }, { status: 502 });
    }

    const allowedCategories = new Set(['high_yield', 'board_trap', 'clinical', 'pharmacology', 'diagnosis', 'treatment', 'remember', 'formula']);
    const allowedColors = new Set(['yellow', 'amber', 'pink', 'violet', 'green', 'blue', 'orange']);
    const allowedSizes = new Set(['sm', 'md', 'lg']);
    const existingKeys = new Set((existingNotes || []).map((note: any) =>
      `${String(note.title || '').toLowerCase().trim()}|${String(note.text || '').toLowerCase().replace(/\s+/g, ' ').trim()}`
    ));
    const normalized = generatedArray
      .filter((item: any) => item && typeof item.title === 'string' && typeof item.text === 'string' && item.text.trim())
      .map((item: any) => ({
        title: item.title.trim().slice(0, 100),
        text: item.text.trim().slice(0, 1200),
        category: allowedCategories.has(item.category) ? item.category : 'high_yield',
        color: allowedColors.has(item.color) ? item.color : 'yellow',
        size: allowedSizes.has(item.size) ? item.size : 'md',
      }))
      .filter((item: any) => !existingKeys.has(`${item.title.toLowerCase()}|${item.text.toLowerCase().replace(/\s+/g, ' ').trim()}`))
      .slice(0, 4);

    if (normalized.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'The generated notes were too similar to your existing notes. Please retry for fresh notes.',
      }, { status: 409 });
    }

    const rotations = [-2.5, 1.8, -1.2, 2.2, -3.0, 1.5];
    const newRecordsToInsert = normalized.map((item: any, idx: number) => ({
      user_id: targetUserId,
      exam_id: exam.id,
      subject_id: subject.id,
      topic_id: topic.id,
      subtopic_id: subtopic?.id || null,
      title: item.title,
      text: item.text,
      category: item.category,
      color: item.color,
      pinned: idx === 0,
      size: item.size,
      rotation_deg: rotations[idx % rotations.length],
      is_ai_generated: true,
    }));

    const { data: insertedData, error: insertErr } = await (supabase as any)
      .from('user_sticky_notes')
      .insert(newRecordsToInsert)
      .select('*');

    if (insertErr) {
      console.error('[Sticky Notes] Failed storing generated notes:', insertErr.message);
      return NextResponse.json({ success: false, error: 'Your notes were generated but could not be saved. Please retry.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stickyNotes: insertedData || [],
      message: `Generated ${insertedData?.length || 0} high-yield sticky notes.`,
    });
  } catch (error: any) {
    console.error('[Sticky Notes] Generation request failed:', error);
    return NextResponse.json({ success: false, error: 'Sticky note generation failed. Please retry.' }, { status: 500 });
  }
}
