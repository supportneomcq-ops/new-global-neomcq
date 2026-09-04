import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { checkFeatureQuota } from '@/lib/entitlements/quota-checker';
import { paginateHandwrittenA4Note } from '@/lib/notes-a4/pagination';
import { HandwrittenNoteItem, MnemonicCard, ComparisonMiniTable } from '@/types/notes-a4.types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      examId,
      subjectId,
      topicId,
      subtopicId,
      examName = 'Medical Exam',
      subjectName = 'Medicine',
      topicName = 'High-Yield Topic',
      subtopicName = null,
      version = 1,
      regenerate = false,
      userId,
    } = body;

    if (!topicId) {
      return NextResponse.json(
        { error: 'topicId is required' },
        { status: 400 }
      );
    }

    let activeUserId = userId || null;
    if (!activeUserId) {
      try {
        const userClient = await createClient();
        const { data: { user } } = await userClient.auth.getUser();
        if (user) activeUserId = user.id;
      } catch (_) {}
    }

    if (activeUserId) {
      const quotaResult = await checkFeatureQuota({
        userId: activeUserId,
        feature: 'notes',
        topicId,
        examId,
        subjectId,
      });

      if (!quotaResult.allowed) {
        return NextResponse.json(
          {
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

    // 1. Check if a note already exists in the database for this topic
    if (!regenerate) {
      const { data: existingNote } = await supabase
        .from('study_notes')
        .select('*')
        .eq('topic_id', topicId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingNote && existingNote.content) {
        const lastUpdated = new Date(existingNote.updated_at || existingNote.created_at || Date.now()).getTime();
        const ageInDays = (Date.now() - lastUpdated) / (1000 * 60 * 60 * 24);

        // Content remains valid for 30 days
        if (ageInDays < 30) {
          let parsedContent = null;
          try {
            if (typeof existingNote.content === 'string') {
              parsedContent = JSON.parse(existingNote.content);
            } else {
              parsedContent = existingNote.content;
            }
          } catch {
            parsedContent = null;
          }

          if (parsedContent && (parsedContent.rawItems || parsedContent.items || parsedContent.pages)) {
            const rawItems: HandwrittenNoteItem[] = parsedContent.rawItems || parsedContent.items || [];
            const keyPoints: string[] = parsedContent.keyPoints || (parsedContent.keyPointsSticky ? parsedContent.keyPointsSticky.points : []);
            const mnemonics: MnemonicCard[] = parsedContent.mnemonics || [];
            const comparisonTables: ComparisonMiniTable[] = parsedContent.comparisonTables || [];

            const paginated = paginateHandwrittenA4Note({
              id: existingNote.id,
              examId: existingNote.exam_id || examId,
              subjectId: existingNote.subject_id || subjectId,
              topicId: existingNote.topic_id || topicId,
              subtopicId: existingNote.subtopic_id || subtopicId,
              examName,
              subjectName,
              topicName,
              subtopicName,
              title: existingNote.title || topicName,
              version: existingNote.version || 1,
              items: rawItems,
              keyPoints,
              mnemonics,
              comparisonTables,
              createdAt: existingNote.created_at,
              updatedAt: existingNote.updated_at,
            });

            return NextResponse.json({
              note: paginated,
              source: 'database',
              ageInDays: Math.floor(ageInDays),
            });
          }
        } else {
          // Content is older than 30 days -> generate new version on open
          console.log(`[A4 Notes] Note for topic ${topicId} is ${Math.floor(ageInDays)} days old (>= 30 days). Regenerating new version...`);
        }
      }
    }

    // 2. Generate structured note items using Gemini API
    let generatedItems: HandwrittenNoteItem[] = [];
    let keyPoints: string[] = [];
    let mnemonics: MnemonicCard[] = [];
    let comparisonTables: ComparisonMiniTable[] = [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemPrompt = `You are a world-class medical board examination educator. 
Generate a high-yield, handwritten study notebook note for the topic: "${topicName}" (${subjectName}, ${examName}).

Structure your response strictly as JSON with this exact schema:
{
  "title": "${topicName.toUpperCase()}",
  "subtitle": "(High-Yield Core Review & Examination Pearls)",
  "keyPoints": [
    "Most high-yield diagnostic criteria",
    "First-line drug of choice and dosing rationale",
    "Pathognomonic investigation of choice (IOC)",
    "Critical board exam trap / distractor difference"
  ],
  "items": [
    {
      "id": "item_1",
      "bulletIcon": "heart",
      "bulletColor": "red",
      "label": "Screening / Initial Test -",
      "boxedHighlight": "Name of Test",
      "highlightColor": "emerald",
      "explanationBullets": [
        "Concise bullet explaining the mechanism or diagnostic threshold.",
        "Clinical implication for board exams."
      ],
      "diagramType": "speech_bubble",
      "diagramCaption": "Optional short label",
      "sideAnnotation": "High-yield margin note",
      "isHighYield": true
    }
  ],
  "mnemonics": [
    {
      "mnemonic": "MNEMONIC_CODE",
      "clinicalContext": "Clinical purpose of this mnemonic",
      "expansion": [
        {"letter": "M", "phrase": "Mechanism"}
      ]
    }
  ],
  "comparisonTables": [
    {
      "title": "Differential Diagnosis Distinction",
      "headers": ["Feature", "${topicName}", "Key Differential"],
      "rows": [
        ["Onset", "Gradual with fatigability", "Sudden / Fixed"],
        ["Reflexes", "Normal / Intact", "Depressed / Absent"],
        ["Treatment", "Pyridostigmine / IVIG", "Plasma Exchange / Steroids"]
      ]
    }
  ]
}

Available bulletIcons: "heart", "star", "lightning", "check", "target", "lightbulb", "pill", "warning", "microscope", "dna".
Available highlightColors: "emerald", "sky", "amber", "purple", "rose", "indigo", "teal".
Available diagramTypes: "ice_pack", "antibody", "emg_wave", "chest_lungs", "iv_drip", "diurnal_sun_moon", "speech_bubble", "synapse_nmj", "heart_ecg", "pill_capsule", "microscope_slide", "algorithm_flow".

Generate 6 to 10 high-yield items with distinct highlighted boxed answers, bullet explanations, diagrams, and high-yield badges.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ text: systemPrompt }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.items && Array.isArray(parsed.items)) {
            generatedItems = parsed.items;
          }
          if (parsed.keyPoints && Array.isArray(parsed.keyPoints)) {
            keyPoints = parsed.keyPoints;
          }
          if (parsed.mnemonics && Array.isArray(parsed.mnemonics)) {
            mnemonics = parsed.mnemonics;
          }
          if (parsed.comparisonTables && Array.isArray(parsed.comparisonTables)) {
            comparisonTables = parsed.comparisonTables;
          }
        }
      } catch (aiErr) {
        console.warn('[A4 Note Generator] AI Generation fallback triggered:', aiErr);
      }
    }

    // 3. Paginate the result into A4 pages
    const paginated = paginateHandwrittenA4Note({
      examId,
      subjectId,
      topicId,
      subtopicId,
      examName,
      subjectName,
      topicName,
      subtopicName,
      version,
      items: generatedItems,
      keyPoints,
      mnemonics,
      comparisonTables,
    });

    // 4. Save/upsert the generated note into the Supabase database
    try {
      await supabase.from('study_notes').upsert({
        topic_id: topicId,
        subject_id: subjectId,
        exam_id: examId,
        title: paginated.title,
        content: JSON.stringify({
          rawItems: paginated.rawItems,
          keyPoints: paginated.keyPointsSticky?.points || [],
          mnemonics: paginated.mnemonics || [],
          comparisonTables: paginated.comparisonTables || [],
        }),
        version,
        updated_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn('[A4 Note Database] Non-fatal save error:', dbErr);
    }

    return NextResponse.json({
      note: paginated,
      source: 'generated',
    });
  } catch (error) {
    console.error('[API Notes A4] Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve or generate A4 notes' },
      { status: 500 }
    );
  }
}
