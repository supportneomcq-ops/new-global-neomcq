import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { ActiveRecallSet, ActiveRecallItem } from '@/lib/types/active-recall'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 15

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { examId, subjectId, topicId, subtopicId } = body || {}

    const sessionClient = await createClient()
    const { data: authData, error: authError } = await sessionClient.auth.getUser()
    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: 'Please sign in to access active recall.' }, { status: 401 })
    }
    if (!topicId) {
      return NextResponse.json({ success: false, error: 'topicId is required.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: topicData, error: topicError } = await (supabase as any)
      .from('exam_topics')
      .select('id,name,subject_id,exam_subjects(id,name,exam_id,exams(id,name,verification_status,metadata))')
      .eq('id', topicId)
      .maybeSingle()

    if (topicError || !topicData) {
      return NextResponse.json({ success: false, error: 'Topic not found in curriculum hierarchy.' }, { status: 404 })
    }

    const canonicalSubject = topicData.exam_subjects
    const canonicalExam = canonicalSubject?.exams
    const canonicalExamId = canonicalSubject?.exam_id
    const canonicalSubjectId = canonicalSubject?.id
    if (!canonicalExam || !canonicalExamId || !canonicalSubjectId) {
      return NextResponse.json({ success: false, error: 'Topic is not attached to a complete exam hierarchy.' }, { status: 409 })
    }
    if ((examId && examId !== canonicalExamId) || (subjectId && subjectId !== canonicalSubjectId)) {
      return NextResponse.json({ success: false, error: 'The selected exam or subject does not match this topic.' }, { status: 400 })
    }

    let subtopicName = ''
    if (subtopicId) {
      const { data: subtopic } = await (supabase as any)
        .from('exam_subtopics')
        .select('id,name,topic_id')
        .eq('id', subtopicId)
        .maybeSingle()
      if (!subtopic || subtopic.topic_id !== topicId) {
        return NextResponse.json({ success: false, error: 'The selected subtopic does not belong to this topic.' }, { status: 400 })
      }
      subtopicName = subtopic.name
    }

    const { data: versionRows, error: versionError } = await (supabase as any)
      .from('content_versions')
      .select('id,version,snapshot,created_at')
      .eq('asset_id', topicId)
      .eq('asset_type', 'topic')
      .order('version', { ascending: false })
      .limit(1)

    if (versionError) {
      return NextResponse.json({ success: false, error: 'Unable to check the shared topic content.' }, { status: 500 })
    }

    const latestVersion = versionRows?.[0] || null
    const savedItems = Array.isArray(latestVersion?.snapshot?.fill_in_the_blanks)
      ? latestVersion.snapshot.fill_in_the_blanks
      : []
    const reusableItems = subtopicName
      ? savedItems.filter((item: any) =>
          String(item?.subtopicName || item?.subtopic || '').trim().toLowerCase() === subtopicName.toLowerCase()
        )
      : savedItems

    if (reusableItems.length > 0 && latestVersion) {
      const safeItems = reusableItems.map((item: any, index: number) => ({
        id: typeof item.id === 'string' ? item.id : `fib_${latestVersion.version || 1}_${index + 1}`,
        concept: item.concept || topicData.name,
        sentence: item.sentence,
        difficulty: item.difficulty || 'High Yield',
        subtopicName: item.subtopicName || item.subtopic || subtopicName || undefined,
      })) as ActiveRecallItem[]

      const savedSet: ActiveRecallSet = {
        id: latestVersion.id,
        topicId,
        topicName: topicData.name,
        subjectId: canonicalSubjectId,
        subjectName: canonicalSubject.name,
        examId: canonicalExamId,
        examName: canonicalExam.name,
        subtopicId,
        subtopicName: subtopicName || undefined,
        version: latestVersion.version,
        batch: `Batch ${String(latestVersion.version).padStart(2, '0')}`,
        updatedAt: latestVersion.created_at || new Date().toISOString(),
        itemsCount: safeItems.length,
        difficulty: 'High-Yield',
        completionPercentage: 0,
        bestAccuracy: 0,
        items: safeItems,
      }
      return NextResponse.json({ success: true, source: 'canonical_cache', set: savedSet })
    }

    const metadata = canonicalExam.metadata || {}
    const { data: currentVersion, error: currentVersionError } = await (supabase as any)
      .from('exam_versions')
      .select('verification_status,verified_at')
      .eq('exam_id', canonicalExamId)
      .eq('is_current', true)
      .maybeSingle()
    if (currentVersionError) {
      return NextResponse.json({ success: false, error: 'Unable to verify the current exam version.' }, { status: 500 })
    }
    if (canonicalExam.verification_status !== 'verified' ||
        metadata.exam_metadata_audit_status !== 'verified' ||
        currentVersion?.verification_status !== 'verified' ||
        !currentVersion?.verified_at) {
      return NextResponse.json({
        success: false,
        status: 'awaiting_exam_verification',
        error: 'This exam and its current version are waiting for official source verification. Shared AI content will start after approval.',
      }, { status: 409 })
    }

    if (String(metadata.curriculum_validation_version || '') !== '4' ||
        !(metadata.curriculum_validation_passed === true || metadata.curriculum_validation_passed === 'true')) {
      return NextResponse.json({
        success: false,
        status: 'awaiting_curriculum_validation',
        error: 'The official subject → topic → subtopic hierarchy is still being validated. Active Recall will be available after that check passes.',
      }, { status: 409 })
    }

    // Active Recall reuses the shared canonical topic pack. It never starts a second,
    // student-specific AI generation that could race the canonical worker or duplicate spend.
    let idempotencyKey = `canonical-topic-prefetch:v1:${canonicalExamId}:${topicId}`
    let { data: job } = await (supabase as any)
      .from('ai_jobs')
      .select('id,status,attempts,max_attempts,error,progress_stage')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (job?.status === 'completed' && reusableItems.length === 0) {
      idempotencyKey = `canonical-topic-prefetch:v2:${canonicalExamId}:${topicId}:v${(latestVersion?.version || 0) + 1}`
      const retryLookup = await (supabase as any)
        .from('ai_jobs')
        .select('id,status,attempts,max_attempts,error,progress_stage')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      job = retryLookup.data
    }

    if (!job) {
      const { data: insertedJob, error: insertError } = await (supabase as any)
        .from('ai_jobs')
        .insert({
          task: 'canonical_topic_prefetch',
          user_id: null,
          exam_id: canonicalExamId,
          subject_id: canonicalSubjectId,
          topic_id: topicId,
          idempotency_key: idempotencyKey,
          priority: 10,
          status: 'queued',
          attempts: 0,
          max_attempts: 3,
          progress_stage: 'Queued for shared canonical topic-pack generation',
          step_percentage: 0,
          input_payload: {
            requested_by_feature: 'active_recall',
            requested_subtopic_id: subtopicId || null,
            requested_subtopic_name: subtopicName || null,
          },
        })
        .select('id,status,attempts,max_attempts,error,progress_stage')
        .maybeSingle()

      if (insertError) {
        const { data: racedJob } = await (supabase as any)
          .from('ai_jobs')
          .select('id,status,attempts,max_attempts,error,progress_stage')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle()
        job = racedJob
      } else {
        job = insertedJob
      }
    }

    if (job && ['failed', 'cancelled'].includes(job.status) &&
        Number(job.attempts || 0) < Number(job.max_attempts || 3)) {
      const { data: requeued } = await (supabase as any)
        .from('ai_jobs')
        .update({
          status: 'queued',
          error: null,
          started_at: null,
          completed_at: null,
          progress_stage: 'Requeued for shared canonical topic-pack generation',
          step_percentage: 0,
        })
        .eq('id', job.id)
        .in('status', ['failed', 'cancelled'])
        .select('id,status,attempts,max_attempts,error,progress_stage')
        .maybeSingle()
      if (requeued) job = requeued
    }

    if (!job) {
      return NextResponse.json({ success: false, error: 'Could not register the shared topic-pack job.' }, { status: 500 })
    }

    if (job.status === 'completed') {
      return NextResponse.json({
        success: false,
        status: 'content_pack_missing_fill_in_blanks',
        error: 'The saved topic pack completed without a usable fill-in-the-blanks set. This is a content-quality issue and needs an administrator review before another generation is started.',
      }, { status: 409 })
    }

    if (['failed', 'cancelled'].includes(job.status) &&
        Number(job.attempts || 0) >= Number(job.max_attempts || 3)) {
      return NextResponse.json({
        success: false,
        status: 'generation_failed',
        error: job.error || 'The shared topic-pack job exhausted its retry limit and needs an administrator retry.',
      }, { status: 503 })
    }

    if (!['queued', 'processing'].includes(job.status)) {
      return NextResponse.json({
        success: false,
        status: 'generation_unavailable',
        error: 'The shared topic-pack job is in an unsupported state and needs administrator review.',
      }, { status: 409 })
    }

    const status = job.status === 'processing' ? 'processing' : 'queued'
    const message = status === 'processing'
      ? 'The shared topic pack is being generated. Fill-in-the-blanks will appear here when it is saved.'
      : 'The shared topic pack is queued. MCQs, notes, flashcards and fill-in-the-blanks will be generated once the worker has verified exam access and AI budget.'

    return NextResponse.json({
      success: false,
      status,
      jobId: job.id,
      message,
      error: message,
    }, { status: 202 })
  } catch (error: any) {
    console.error('Error preparing shared active recall content:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unable to prepare shared active recall content.',
    }, { status: 500 })
  }
}
