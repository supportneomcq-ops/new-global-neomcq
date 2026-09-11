/**
 * NEOMCQ — BATCH 7.9: AI TUTOR ANALYTICS SERVICE
 * Server-side data aggregation service for AI Tutor engagement, telemetry, and friction analysis.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import type {
  TutorAnalyticsParams,
  TutorAnalyticsData,
  HighFrictionItem,
  TutorAnalyticsTimeframe,
} from '@/lib/types/ai-tutor-analytics';

export class TutorAnalyticsService {
  /**
   * Aggregates tutor event telemetry for admin reporting
   */
  public static async getAnalytics(params: TutorAnalyticsParams): Promise<TutorAnalyticsData> {
    const timeframe: TutorAnalyticsTimeframe = params.timeframe || '30d';
    const supabase = getSupabaseAdmin();

    // 1. Calculate Cutoff Date
    let cutoffDate: Date | null = null;
    const now = new Date();
    if (timeframe === '7d') {
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '30d') {
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '90d') {
      cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else {
      cutoffDate = null; // 'all'
    }

    // 2. Build Query
    let query = supabase
      .from('tutor_events')
      .select(
        'id, user_id, event_type, exam_id, subject_id, topic_id, subtopic_id, lesson_id, scene_id, faq_id, metadata, created_at'
      );

    if (cutoffDate) {
      query = query.gte('created_at', cutoffDate.toISOString());
    }

    if (params.examId && params.examId !== 'all') {
      query = query.eq('exam_id', params.examId);
    }
    if (params.subjectId && params.subjectId !== 'all') {
      query = query.eq('subject_id', params.subjectId);
    }
    if (params.topicId && params.topicId !== 'all') {
      query = query.eq('topic_id', params.topicId);
    }
    if (params.subtopicId && params.subtopicId !== 'all') {
      query = query.eq('subtopic_id', params.subtopicId);
    }

    const { data: events, error } = await query
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) {
      console.error('Error fetching tutor_events for analytics:', error);
      throw new Error('Database error aggregating tutor analytics');
    }

    const eventList = events || [];

    // 3. Counters
    let totalOpens = 0;
    let totalStarts = 0;
    let totalCompletions = 0;
    let sceneStarts = 0;
    let sceneCompletions = 0;
    let pauseCount = 0;
    let resumeCount = 0;
    let seekCount = 0;
    let exitBeforeCompletionCount = 0;
    let faqOpened = 0;
    let faqViewed = 0;
    let canonicalFaqReused = 0;
    let doubtsAsked = 0;
    let newDoubtAnswersGenerated = 0;

    const uniqueUserIds = new Set<string>();

    // Scope breakdown for friction analysis
    const scopeMap = new Map<
      string,
      {
        examId: string;
        subjectId: string;
        topicId: string;
        subtopicId?: string | null;
        startsCount: number;
        completionsCount: number;
        dropOffCount: number;
        doubtsCount: number;
        pauseSeekCount: number;
      }
    >();

    for (const ev of eventList) {
      if (ev.user_id) {
        uniqueUserIds.add(ev.user_id);
      }

      const scopeKey = `${ev.exam_id}:${ev.subject_id}:${ev.topic_id}:${ev.subtopic_id || 'null'}`;
      if (!scopeMap.has(scopeKey)) {
        scopeMap.set(scopeKey, {
          examId: ev.exam_id,
          subjectId: ev.subject_id,
          topicId: ev.topic_id,
          subtopicId: ev.subtopic_id || null,
          startsCount: 0,
          completionsCount: 0,
          dropOffCount: 0,
          doubtsCount: 0,
          pauseSeekCount: 0,
        });
      }
      const scopeData = scopeMap.get(scopeKey)!;

      switch (ev.event_type) {
        case 'tutor_opened':
          totalOpens++;
          break;
        case 'tutor_started':
          totalStarts++;
          scopeData.startsCount++;
          break;
        case 'tutor_completed':
          totalCompletions++;
          scopeData.completionsCount++;
          break;
        case 'scene_started':
          sceneStarts++;
          break;
        case 'scene_completed':
          sceneCompletions++;
          break;
        case 'tutor_paused':
          pauseCount++;
          scopeData.pauseSeekCount++;
          break;
        case 'tutor_resumed':
          resumeCount++;
          break;
        case 'tutor_seeked':
          seekCount++;
          scopeData.pauseSeekCount++;
          break;
        case 'tutor_exited':
          exitBeforeCompletionCount++;
          scopeData.dropOffCount++;
          break;
        case 'faq_opened':
          faqOpened++;
          scopeData.doubtsCount++;
          break;
        case 'faq_viewed':
          faqViewed++;
          break;
        case 'doubt_asked':
          doubtsAsked++;
          scopeData.doubtsCount++;
          break;
        case 'canonical_faq_reused':
          canonicalFaqReused++;
          break;
        case 'new_doubt_answer_generated':
          newDoubtAnswersGenerated++;
          break;
        default:
          break;
      }
    }

    // 4. Rate Calculations (Guarded against division by zero)
    const uniqueLearners = uniqueUserIds.size;
    const completionRate =
      totalStarts > 0 ? Math.round((totalCompletions / totalStarts) * 1000) / 10 : 0;
    
    // Average completion percentage calculation
    const avgCompletionPercentage =
      totalStarts > 0
        ? Math.min(
            100,
            Math.round(
              ((totalCompletions * 100) + (sceneCompletions * 15)) /
                Math.max(1, totalStarts)
            )
          )
        : 0;

    const sceneCompletionRate =
      sceneStarts > 0 ? Math.round((sceneCompletions / sceneStarts) * 1000) / 10 : 0;

    const pauseRate =
      totalStarts > 0 ? Math.round((pauseCount / totalStarts) * 1000) / 10 : 0;

    const seekRate =
      totalStarts > 0 ? Math.round((seekCount / totalStarts) * 1000) / 10 : 0;

    const totalFaqDoubtInquiries = canonicalFaqReused + newDoubtAnswersGenerated;
    const canonicalFaqReuseRate =
      totalFaqDoubtInquiries > 0
        ? Math.round((canonicalFaqReused / totalFaqDoubtInquiries) * 1000) / 10
        : 0;

    // 5. Build High-Friction Items (Top Scopes with friction signals)
    const frictionItemList: HighFrictionItem[] = [];

    // Pre-fetch names for exams, subjects, topics to enrich high-friction items
    const examIds = Array.from(new Set(Array.from(scopeMap.values()).map((s) => s.examId))).filter(Boolean);
    const subjectIds = Array.from(new Set(Array.from(scopeMap.values()).map((s) => s.subjectId))).filter(Boolean);
    const topicIds = Array.from(new Set(Array.from(scopeMap.values()).map((s) => s.topicId))).filter(Boolean);

    const [examsRes, subjectsRes, topicsRes] = await Promise.all([
      examIds.length > 0 ? supabase.from('exams').select('id, name').in('id', examIds) : { data: [] },
      subjectIds.length > 0 ? supabase.from('exam_subjects').select('id, name').in('id', subjectIds) : { data: [] },
      topicIds.length > 0 ? supabase.from('exam_topics').select('id, name').in('id', topicIds) : { data: [] },
    ]);

    const examNameMap = new Map((examsRes.data || []).map((e: any) => [e.id, e.name]));
    const subjectNameMap = new Map((subjectsRes.data || []).map((s: any) => [s.id, s.name]));
    const topicNameMap = new Map((topicsRes.data || []).map((t: any) => [t.id, t.name]));

    for (const [scopeKey, scope] of scopeMap.entries()) {
      const frictionScore =
        scope.dropOffCount * 3 +
        scope.doubtsCount * 2 +
        scope.pauseSeekCount * 1 +
        (scope.startsCount > 0 && scope.completionsCount === 0 ? 5 : 0);

      if (frictionScore === 0) continue;

      const signals: string[] = [];
      if (scope.dropOffCount > 0) {
        signals.push(`High drop-off (${scope.dropOffCount} exits)`);
      }
      if (scope.doubtsCount > 0) {
        signals.push(`High doubt activity (${scope.doubtsCount} doubts/FAQs)`);
      }
      if (scope.pauseSeekCount > 0) {
        signals.push(`High learner friction (${scope.pauseSeekCount} pauses/seeks)`);
      }
      if (scope.startsCount > 0 && scope.completionsCount === 0) {
        signals.push('Low completion rate (0%)');
      }

      frictionItemList.push({
        scopeKey,
        examId: scope.examId,
        subjectId: scope.subjectId,
        topicId: scope.topicId,
        subtopicId: scope.subtopicId,
        examName: examNameMap.get(scope.examId) || scope.examId,
        subjectName: subjectNameMap.get(scope.subjectId) || scope.subjectId,
        topicName: topicNameMap.get(scope.topicId) || scope.topicId,
        subtopicName: scope.subtopicId || undefined,
        startsCount: scope.startsCount,
        completionsCount: scope.completionsCount,
        dropOffCount: scope.dropOffCount,
        doubtsCount: scope.doubtsCount,
        pauseSeekCount: scope.pauseSeekCount,
        frictionScore,
        frictionSignals: signals.length > 0 ? signals : ['High learner friction'],
      });
    }

    // Sort by frictionScore descending, top 10
    frictionItemList.sort((a, b) => b.frictionScore - a.frictionScore);
    const topFrictionItems = frictionItemList.slice(0, 10);

    return {
      timeframe,
      filters: {
        examId: params.examId !== 'all' ? params.examId : undefined,
        subjectId: params.subjectId !== 'all' ? params.subjectId : undefined,
        topicId: params.topicId !== 'all' ? params.topicId : undefined,
        subtopicId: params.subtopicId !== 'all' ? params.subtopicId : undefined,
      },
      metrics: {
        engagement: {
          totalOpens,
          uniqueLearners,
          totalStarts,
          totalCompletions,
          completionRate,
          avgCompletionPercentage,
        },
        lesson: {
          sceneStarts,
          sceneCompletions,
          sceneCompletionRate,
        },
        playback: {
          pauseCount,
          resumeCount,
          seekCount,
          exitBeforeCompletionCount,
          pauseRate,
          seekRate,
        },
        faqDoubt: {
          faqOpened,
          faqViewed,
          canonicalFaqReused,
          doubtsAsked,
          newDoubtAnswersGenerated,
          canonicalFaqReuseRate,
        },
      },
      highFrictionItems: topFrictionItems,
      totalEventCount: eventList.length,
      updatedAt: new Date().toISOString(),
    };
  }
}
