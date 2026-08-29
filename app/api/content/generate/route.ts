import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getOrGenerateCanonicalTopicContent } from '@/lib/knowledge/ai-content-intelligence';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      exam_id,
      topic_id,
      topic_name,
      subject_name,
      exam_name,
      country_name,
      user_id,
      force_refresh,
      difficulty,
      language,
    } = body;

    if (!topic_name && !topic_id) {
      return NextResponse.json(
        { success: false, error: 'topic_name or topic_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    let safeTopicName = (topic_name || '').toString().trim();
    let safeSubjectName = (subject_name || '').toString().trim();
    let safeExamName = (exam_name || '').toString().trim();

    // If IDs are provided, look up canonical names
    if (topic_id && (!safeTopicName || !safeSubjectName || !safeExamName)) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topic_id);
      if (isUUID) {
        const { data: top } = await (supabase as any)
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
          .eq('id', topic_id)
          .maybeSingle();

        if (top) {
          safeTopicName = top.name;
          safeSubjectName = top.exam_subjects?.name || safeSubjectName;
          safeExamName = top.exam_subjects?.exams?.name || safeExamName;
        }
      }
    }

    if (!safeExamName) safeExamName = 'USMLE Step 1 & 2 CK';
    if (!safeSubjectName) safeSubjectName = 'General Medicine';

    // Record user study topic access
    if (user_id && topic_id) {
      try {
        const now = new Date().toISOString();
        await (supabase as any).from('user_study_topics').upsert(
          {
            user_id,
            exam_id: exam_id || null,
            exam_topic_id: topic_id,
            topic_name: safeTopicName,
            last_accessed_at: now,
          },
          { onConflict: 'user_id,exam_topic_id' }
        );
      } catch {
        // Non-blocking
      }
    }

    // Call Unified AI Content Intelligence Engine
    const result = await getOrGenerateCanonicalTopicContent({
      examInput: safeExamName,
      subjectInput: safeSubjectName,
      topicInput: safeTopicName,
      userId: user_id || null,
      difficulty: difficulty || 'Intermediate',
      language: language || 'en',
      forceRefresh: Boolean(force_refresh),
      autoCreateEntities: true,
    });

    if (!result.success && !result.content) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to generate content' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reused_existing: result.served_from_cache,
      generation_reason: result.generation_reason,
      version: result.version_number,
      metrics: result.metrics,
      mcqs: result.content?.mcqs || [],
      notes: [{ id: 'note-main', title: `${safeTopicName} Guide`, content: result.content?.notes || '' }],
      flashcards: result.content?.flashcards || [],
      tutor_explanation: result.content?.tutor_explanation || null,
      revision_sheet: result.content?.revision_sheet || null,
    });
  } catch (error: any) {
    console.error('Content Generation Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error generating content' },
      { status: 500 }
    );
  }
}
