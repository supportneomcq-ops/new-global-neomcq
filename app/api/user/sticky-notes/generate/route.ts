import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { extractJsonFromAiResponse } from '@/lib/ai/json-cleaner';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exam, subject, topic, subtopic, userId } = body;

    if (!topic || !topic.id || !topic.name) {
      return NextResponse.json(
        { success: false, error: 'Active topic selection is required for AI sticky note generation.' },
        { status: 400 }
      );
    }

    let targetUserId: string | null = userId || null;
    if (!targetUserId) {
      try {
        const supabaseUserClient = await createClient();
        const { data: { user } } = await supabaseUserClient.auth.getUser();
        if (user) targetUserId = user.id;
      } catch (_) {}
    }

    if (targetUserId) {
      const { checkFeatureQuota } = await import('@/lib/entitlements/quota-checker');
      const quotaResult = await checkFeatureQuota({
        userId: targetUserId,
        feature: 'sticky_notes',
        topicId: topic.id,
        examId: exam?.id,
        subjectId: subject?.id,
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
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch existing sticky notes for this user & topic to prevent duplicates
    let existingNotesQuery = (supabase as any)
      .from('user_sticky_notes')
      .select('title, text')
      .eq('topic_id', topic.id);

    if (targetUserId) {
      existingNotesQuery = existingNotesQuery.eq('user_id', targetUserId);
    }

    const { data: existingNotes } = await existingNotesQuery;

    const existingSummary = (existingNotes || [])
      .map((n: any) => `- ${n.title ? n.title + ': ' : ''}${n.text}`)
      .join('\n');

    // 2. Initialize Gemini API Client
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY environment variable is missing.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const contextHierarchy = [
      exam?.name ? `Exam: ${exam.name}` : null,
      subject?.name ? `Subject: ${subject.name}` : null,
      `Topic: ${topic.name}`,
      subtopic?.name ? `Subtopic: ${subtopic.name}` : null,
    ]
      .filter(Boolean)
      .join(' > ');

    const prompt = `You are a top-tier medical exam board author and high-yield study strategist.
Create 3 to 4 distinct, ultra-high-yield memory sticky notes for a candidate studying for:
Context: ${contextHierarchy}

${
  existingSummary
    ? `IMPORTANT DEDUPLICATION MANDATE:
The user ALREADY HAS the following sticky notes on their board for this topic:
${existingSummary}

DO NOT repeat or duplicate any of these concepts or mnemonics! Generate NEW, unique, complementary high-yield exam pearls.`
    : ''
}

Each sticky note MUST focus on a distinct category from this list:
- "high_yield" (High-Yield Pearl)
- "board_trap" (Common Exam Trick / Mimicker)
- "clinical" (Diagnostic Clue / Classic Presentation)
- "pharmacology" (Drug of Choice / Key Side Effect)
- "diagnosis" (Gold Standard Test / Diagnostic Criteria)
- "treatment" (First-line Management / Surgical Landmark)
- "remember" (Key Mnemonic or Rule of Thumb)
- "formula" (Important Calculation / Cutoff Score)

Return strictly a JSON array of objects with the following schema:
[
  {
    "title": "Short punchy title (max 5 words, e.g., 'DIAGNOSTIC TRIAD', 'FIRST-LINE RX', 'BOARD TRAP')",
    "text": "Clear, concise 1 to 3 sentence high-yield summary or mnemonic.",
    "category": "one of the category keys above",
    "color": "one of: 'yellow', 'amber', 'pink', 'violet', 'green', 'blue', 'orange'",
    "size": "one of: 'sm', 'md', 'lg'"
  }
]

Do NOT include any markdown formatting like \`\`\`json. Output ONLY valid raw JSON array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    let rawText = response.text || '';
    let generatedArray: any[] = [];
    try {
      generatedArray = extractJsonFromAiResponse(rawText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output for sticky notes:', rawText);
      return NextResponse.json({ success: false, error: 'Failed to generate structured sticky notes from AI.' }, { status: 500 });
    }

    if (!Array.isArray(generatedArray) || generatedArray.length === 0) {
      return NextResponse.json({ success: false, error: 'AI returned an empty sticky notes payload.' }, { status: 500 });
    }

    // 3. Save generated notes into database with random pleasant rotations
    const rotations = [-2.5, 1.8, -1.2, 2.2, -3.0, 1.5];
    const newRecordsToInsert = generatedArray.map((item, idx) => ({
      user_id: targetUserId,
      exam_id: exam?.id || null,
      subject_id: subject?.id || null,
      topic_id: topic.id,
      subtopic_id: subtopic?.id || null,
      title: item.title || 'HIGH-YIELD PEARL',
      text: item.text,
      category: item.category || 'high_yield',
      color: item.color || ['yellow', 'amber', 'pink', 'violet', 'green', 'blue', 'orange'][idx % 7],
      pinned: idx === 0, // Pin the first top pearl
      size: item.size || 'md',
      rotation_deg: rotations[idx % rotations.length],
      is_ai_generated: true,
    }));

    const { data: insertedData, error: insertErr } = await (supabase as any)
      .from('user_sticky_notes')
      .insert(newRecordsToInsert)
      .select('*');

    if (insertErr) {
      console.error('Failed storing AI generated sticky notes in Supabase:', insertErr);
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stickyNotes: insertedData || [],
      message: `Generated ${insertedData?.length || 0} high-yield sticky notes.`,
    });
  } catch (error: any) {
    console.error('AI Sticky Note generation API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
