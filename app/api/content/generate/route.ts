import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { checkFeatureQuota } from '@/lib/entitlements/quota-checker';
import { getOrGenerateCanonicalTopicContent } from '@/lib/knowledge/ai-content-intelligence';

export async function POST(req: NextRequest) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Please sign in to generate study content.' }, { status: 401 });
    }

    const body = await req.json();
    const { topic_id, force_refresh, difficulty, language } = body || {};
    if (typeof topic_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topic_id)) {
      return NextResponse.json({ success: false, error: 'Select a valid topic from your saved exam curriculum.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: topic, error: topicError } = await admin
      .from('exam_topics')
      .select('id, name, subject_id, exam_subjects(id, name, exam_id, exams(id, name))')
      .eq('id', topic_id)
      .maybeSingle();

    if (topicError || !topic) {
      return NextResponse.json({ success: false, error: 'The selected topic could not be found in the saved curriculum.' }, { status: 404 });
    }

    const subject = (topic as any).exam_subjects;
    const exam = subject?.exams;
    if (!subject?.id || !exam?.id || !topic.name) {
      return NextResponse.json({ success: false, error: 'The selected topic has an incomplete curriculum hierarchy. Please report this topic.' }, { status: 409 });
    }

    const quota = await checkFeatureQuota({
      userId: user.id,
      feature: 'mcq',
      topicId: topic.id,
      examId: exam.id,
      subjectId: subject.id,
    });
    if (!quota.allowed) {
      return NextResponse.json({
        success: false,
        limitReached: true,
        limitType: quota.limitType,
        error: quota.upgradeMessage || quota.reason || 'Your plan limit has been reached.',
        upgradeRequired: true,
        planCode: quota.planCode,
      }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { error: accessError } = await admin.from('user_study_topics').upsert(
      {
        user_id: user.id,
        exam_id: exam.id,
        exam_topic_id: topic.id,
        topic_name: topic.name,
        last_accessed_at: now,
      },
      { onConflict: 'user_id,exam_topic_id' }
    );
    if (accessError) {
      console.warn('[Content Generation] Could not update topic access history:', accessError.message);
    }

    const result = await getOrGenerateCanonicalTopicContent({
      examInput: exam.id,
      subjectInput: subject.id,
      topicInput: topic.id,
      userId: user.id,
      difficulty: typeof difficulty === 'string' ? difficulty : 'Intermediate',
      language: typeof language === 'string' ? language : 'en',
      forceRefresh: Boolean(force_refresh),
      autoCreateEntities: false,
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
      notes: [{ id: 'note-main', title: `${topic.name} Guide`, content: result.content?.notes || '' }],
      flashcards: result.content?.flashcards || [],
      tutor_explanation: result.content?.tutor_explanation || null,
      revision_sheet: result.content?.revision_sheet || null,
    });
  } catch (error: any) {
    console.error('[Content Generation] Request failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error generating content' },
      { status: 500 }
    );
  }
}
