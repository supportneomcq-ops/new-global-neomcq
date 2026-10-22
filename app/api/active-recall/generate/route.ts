import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { AIGateway } from '@/lib/ai/ai-gateway';
import { ActiveRecallSet, ActiveRecallItem } from '@/lib/types/active-recall';
import { extractJsonFromAiResponse } from '@/lib/ai/json-cleaner';
import { getExamStyleAndPattern } from '@/lib/server/content-engine/exam-style-helper';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { examId, subjectId, topicId, subtopicId, userId, difficulty = 'High Yield' } = body;

    if (!topicId) {
      return NextResponse.json(
        { success: false, error: 'topicId is required for generating active recall items.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch Topic, Subject, and Exam Context
    const { data: topicData, error: topicErr } = await (supabase as any)
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

    if (topicErr || !topicData) {
      return NextResponse.json(
        { success: false, error: 'Topic not found in curriculum hierarchy.' },
        { status: 404 }
      );
    }

    const examName = topicData.exam_subjects?.exams?.name || 'Board Exam';
    const subjectName = topicData.exam_subjects?.name || 'Core Subject';
    const topicName = topicData.name;

    const finalExamId = examId || topicData.exam_subjects?.exam_id;
    const styleAndPattern = await getExamStyleAndPattern(finalExamId, supabase);

    // Optional Subtopic Context
    let subtopicName = '';
    if (subtopicId) {
      const { data: subData } = await (supabase as any)
        .from('exam_subtopics')
        .select('id, name')
        .eq('id', subtopicId)
        .maybeSingle();
      if (subData) {
        subtopicName = subData.name;
      }
    }

    // 2. Determine Next Version Number
    const { data: existingVersions } = await (supabase as any)
      .from('content_versions')
      .select('version, snapshot')
      .eq('asset_id', topicId)
      .eq('asset_type', 'topic')
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingVersions && existingVersions.length > 0 ? (existingVersions[0].version || 1) + 1 : 1;
    const previousSnapshot = existingVersions && existingVersions[0]?.snapshot ? existingVersions[0].snapshot : {};

    // 3. Construct System Prompt for Domain-Neutral Active Recall Generation
    const prompt = `You are a Senior ${styleAndPattern.role}, Board Examination Item Writer, and Active Recall Specialist.
Create 12 to 15 high-yield ACTIVE RECALL (Cloze / Fill-in-the-Blank) items strictly for the following curriculum scope:

EXAM: ${examName}
SUBJECT: ${subjectName}
TOPIC: ${topicName}
${subtopicName ? `SUBTOPIC: ${subtopicName}` : ''}
DIFFICULTY: ${difficulty}

Domain/Style Guidelines:
- Domain: ${styleAndPattern.domain}
- Style: ${styleAndPattern.styleDescription}

RULES FOR ACTIVE RECALL GENERATION:
1. Every blank must test a crucial high-yield target (e.g., core formula, standard definition, statutory section, main diagnostic tool, first-line choice, key mechanism, or critical trap).
2. DO NOT create trivial grammar blanks (e.g., "is", "located in", "the"). The blank must require genuine conceptual, structural, or factual active recall.
3. In the sentence, replace the primary test term with "[BLANK]".
4. "blank" must be the exact canonical term.
5. "acceptedAnswers" must include 2-4 valid synonyms, common acronyms, and alternative naming conventions or notations.
6. "explanation" must explain the underlying theory, logic, formula derivation, statutory rationale, or domain-specific guideline.
7. "highYieldPoint" must summarize the board exam rule, formula, or takeaway.
8. "memoryHook" must provide a memorable mnemonic, analogy, or conceptual association.
9. "examTip" must warn about common board exam distractors, traps, or look-alike entities.

Respond strictly in valid JSON format with NO markdown wrapping:
{
  "fill_in_the_blanks": [
    {
      "concept": "Specific Target Entity / Mechanism / Principle",
      "sentence": "The core mechanism or equation governing [BLANK] under standard conditions is [BLANK].",
      "blank": "Governing Rule or Formula",
      "acceptedAnswers": ["Synonym 1", "Synonym 2", "Alternate acronym"],
      "explanation": "Why this is the standard of care or industry benchmark based on guidelines...",
      "highYieldPoint": "Core rule to remember for board exams.",
      "memoryHook": "Mnemonic, analogy, or conceptual association.",
      "examTip": "Common distractor warning or trap to avoid.",
      "difficulty": "High Yield"
    }
  ]
}`;

    // 4. Generate with Multi-Provider Failover Gateway
    let rawResultText = '';
    try {
      const genResult = await AIGateway.generate({
        taskType: 'active_recall_generation',
        prompt,
        preferredProvider: 'gemini',
        preferredModel: 'gemini-3.8-flash',
        temperature: 0.2,
      });
      rawResultText = genResult.text;
    } catch (genErr) {
      console.warn('Gemini fallback to OpenAI adapter for Active Recall:', genErr);
      try {
        const openResult = await AIGateway.generate({
          taskType: 'active_recall_generation',
          prompt,
          preferredProvider: 'openai',
          preferredModel: 'gpt-4o-mini',
          temperature: 0.2,
        });
        rawResultText = openResult.text;
      } catch (fallbackErr: any) {
        throw new Error(`AI generation failed across all providers: ${fallbackErr.message}`);
      }
    }

    // 5. Parse JSON Payload
    let parsed: any = {};
    try {
      parsed = extractJsonFromAiResponse(rawResultText);
    } catch (parseErr: any) {
      console.error('Failed to parse AI recall JSON:', rawResultText);
      throw new Error(`AI produced invalid JSON output: ${parseErr.message}`);
    }

    const rawList = Array.isArray(parsed.fill_in_the_blanks) ? parsed.fill_in_the_blanks : [];
    if (rawList.length === 0) {
      throw new Error('No active recall items were returned by the generator.');
    }

    const items: ActiveRecallItem[] = rawList.map((fib: any, idx: number) => ({
      id: `fib_${nextVersion}_${idx + 1}`,
      concept: fib.concept || `${topicName} Concept #${idx + 1}`,
      sentence: fib.sentence || 'The primary presentation of [Condition] begins with [BLANK].',
      blank: fib.blank || 'Primary Clinical Answer',
      acceptedAnswers: Array.isArray(fib.acceptedAnswers) && fib.acceptedAnswers.length > 0
        ? fib.acceptedAnswers
        : [fib.blank],
      explanation: fib.explanation || 'Evidence-based clinical protocol and board rationale.',
      highYieldPoint: fib.highYieldPoint || 'High-yield board examination principle.',
      memoryHook: fib.memoryHook || undefined,
      examTip: fib.examTip || undefined,
      difficulty: fib.difficulty || 'High Yield',
      subtopicName: subtopicName || undefined,
    }));

    // 6. Update Topic Snapshot & Content Version
    const updatedSnapshot = {
      ...previousSnapshot,
      exam_id: topicData.exam_subjects?.exams?.id || examId,
      exam_name: examName,
      subject_id: topicData.exam_subjects?.id || subjectId,
      subject_name: subjectName,
      topic_id: topicId,
      topic_name: topicName,
      fill_in_the_blanks: items,
    };

    const { data: newVersionRow, error: saveErr } = await (supabase as any)
      .from('content_versions')
      .insert({
        asset_id: topicId,
        asset_type: 'topic',
        version: nextVersion,
        is_current: true,
        generation_reason: nextVersion === 1 ? 'FIRST_GENERATION' : 'FORCE_REFRESH',
        requested_by: userId || null,
        snapshot: updatedSnapshot,
      })
      .select('id, version, created_at')
      .single();

    if (saveErr) {
      console.warn('Notice saving content version:', saveErr);
    }

    const newSet: ActiveRecallSet = {
      id: newVersionRow?.id || `set_${nextVersion}`,
      topicId,
      topicName,
      subjectId: topicData.exam_subjects?.id || subjectId,
      subjectName,
      examId: topicData.exam_subjects?.exams?.id || examId,
      examName,
      subtopicId,
      subtopicName,
      version: nextVersion,
      batch: `Batch ${String(nextVersion).padStart(2, '0')}`,
      updatedAt: newVersionRow?.created_at || new Date().toISOString(),
      itemsCount: items.length,
      difficulty: 'High-Yield',
      completionPercentage: 0,
      bestAccuracy: 0,
      items,
    };

    return NextResponse.json({
      success: true,
      set: newSet,
    });
  } catch (error: any) {
    console.error('Error generating active recall set:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate active recall set' },
      { status: 500 }
    );
  }
}
