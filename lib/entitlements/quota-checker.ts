import { getSupabaseAdmin } from '@/lib/supabase';
import { getServerUserEntitlements } from './server-entitlements';
import { AUTHORITATIVE_PLANS, PlanCode } from '@/lib/plans/plan-config';

export type FeatureKey =
  | 'mcq'
  | 'quiz'
  | 'flashcards'
  | 'notes'
  | 'sticky_notes'
  | 'blanks'
  | 'tutor'
  | 'tutor_tts'
  | 'topic_switch'
  | 'exam_switch';

export interface QuotaCheckParams {
  userId: string;
  feature: FeatureKey;
  topicId?: string;
  examId?: string;
  subjectId?: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  limitType?: 'free_lifetime_topic' | 'daily_quota' | 'topic_switch_limit' | 'exam_switch_fee';
  featureName?: string;
  recordedTopicId?: string;
  upgradeMessage?: string;
  planCode?: string;
}

const FEATURE_NAMES: Record<FeatureKey, string> = {
  mcq: 'MCQ Practice',
  quiz: 'Timed Quiz',
  flashcards: 'Flashcards',
  notes: 'A4 Revision Notes',
  sticky_notes: 'Sticky Notes',
  blanks: 'Fill in the Blank',
  tutor: 'AI Tutor',
  tutor_tts: 'AI Tutor Neural Audio (TTS)',
  topic_switch: 'Topic Switching',
  exam_switch: 'Exam Switching',
};

/**
 * Authoritative Server-side Quota & Entitlement Checker
 */
export async function checkFeatureQuota(params: QuotaCheckParams): Promise<QuotaCheckResult> {
  const { userId, feature, topicId, examId, subjectId } = params;

  if (!userId) {
    return { allowed: true, planCode: 'FREE' };
  }

  const admin = getSupabaseAdmin();
  const userEntitlements = await getServerUserEntitlements(userId);
  const planCode = userEntitlements.planCode || 'FREE';
  const isPaid = userEntitlements.isPaid && userEntitlements.isActive;
  const featureName = FEATURE_NAMES[feature] || feature;

  // ---------------------------------------------------------------------------
  // 1. FREE PLAN LIFETIME TOPIC RESTRICTION
  // ---------------------------------------------------------------------------
  if (!isPaid) {
    if (['mcq', 'quiz', 'flashcards', 'notes', 'sticky_notes', 'blanks', 'tutor'].includes(feature)) {
      if (!topicId) {
        return { allowed: true, planCode: 'FREE' };
      }

      // Check user_free_topic_usage table in Supabase
      const { data: freeUsage, error: freeUsageErr } = await admin
        .from('user_free_topic_usage')
        .select('topic_id')
        .eq('user_id', userId)
        .eq('feature', feature)
        .maybeSingle();

      if (freeUsageErr && freeUsageErr.code !== 'PGRST116') {
        console.error('Error checking user_free_topic_usage:', freeUsageErr);
      }

      if (!freeUsage) {
        // Record 1st unique topic for this feature on Free plan in Supabase
        await admin.from('user_free_topic_usage').insert({
          user_id: userId,
          feature,
          topic_id: topicId,
          exam_id: examId || null,
          subject_id: subjectId || null,
          created_at: new Date().toISOString(),
        });

        return {
          allowed: true,
          planCode: 'FREE',
          recordedTopicId: topicId,
        };
      }

      // Compare with existing recorded topic for this feature
      if (freeUsage.topic_id === topicId) {
        return {
          allowed: true,
          planCode: 'FREE',
          recordedTopicId: freeUsage.topic_id,
        };
      }

      // Trying to access a 2nd topic for this feature on Free plan -> BLOCKED
      return {
        allowed: false,
        limitType: 'free_lifetime_topic',
        featureName,
        planCode: 'FREE',
        recordedTopicId: freeUsage.topic_id,
        reason: `Free plan allows 1 unique lifetime topic for ${featureName}.`,
        upgradeMessage: `Free plan allows 1 unique lifetime topic for ${featureName}. Upgrade to Pro to access unlimited topics across all subjects.`,
      };
    }

    // Free plan Neural Audio (TTS) in AI Tutor: Allowed up to 5 generations/day
    if (feature === 'tutor_tts') {
      const todayStr = new Date().toISOString().split('T')[0];
      const freeMaxTts = 5;

      const { data: dailyRow } = await admin
        .from('user_daily_usage')
        .select('count')
        .eq('user_id', userId)
        .eq('usage_date', todayStr)
        .eq('feature', 'tutor_tts')
        .maybeSingle();

      const currentCount = dailyRow?.count || 0;

      if (currentCount >= freeMaxTts) {
        return {
          allowed: false,
          limitType: 'daily_quota',
          featureName,
          planCode: 'FREE',
          reason: `Free plan includes 5 AI Tutor Neural Audio (TTS) generations per day.`,
          upgradeMessage: `Free plan daily limit reached for AI Tutor Neural Audio (5/day). Upgrade to Pro (15/day), Max (50/day), or Elite (Unlimited) to continue listening.`,
        };
      }

      await admin.from('user_daily_usage').upsert(
        {
          user_id: userId,
          usage_date: todayStr,
          feature: 'tutor_tts',
          count: currentCount + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,usage_date,feature' }
      );

      return { allowed: true, planCode: 'FREE' };
    }
  }

  // ---------------------------------------------------------------------------
  // 2. PAID PLAN DAILY QUOTAS & TOPIC SWITCH LIMITS
  // ---------------------------------------------------------------------------
  if (isPaid) {
    if (planCode === 'ELITE') {
      return { allowed: true, planCode: 'ELITE' };
    }

    // Fetch plan limits configuration from DB or AUTHORITATIVE_PLANS
    let planLimits: Record<string, any> = {};
    const { data: dbPlan } = await admin
      .from('subscription_plans')
      .select('limits, slug')
      .ilike('slug', planCode.toLowerCase())
      .maybeSingle();

    if (dbPlan?.limits) {
      planLimits = dbPlan.limits;
    } else {
      const authPlan = AUTHORITATIVE_PLANS[planCode as PlanCode];
      if (authPlan) {
        planLimits = authPlan.limits;
      }
    }

    let quotaKey = '';
    if (feature === 'mcq') quotaKey = 'daily_mcq_questions';
    else if (feature === 'quiz') quotaKey = 'daily_quiz_attempts';
    else if (feature === 'flashcards') quotaKey = 'daily_flashcard_reviews';
    else if (feature === 'notes') quotaKey = 'daily_notes_generations';
    else if (feature === 'blanks') quotaKey = 'daily_blanks_questions';
    else if (feature === 'tutor') quotaKey = 'daily_tutor_interactions';
    else if (feature === 'tutor_tts') quotaKey = 'daily_tutor_tts';
    else if (feature === 'topic_switch') quotaKey = 'daily_topic_switches';

    const maxQuota = planLimits[quotaKey];

    if (maxQuota === null || maxQuota === undefined || planLimits.unlimited) {
      return { allowed: true, planCode };
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const { data: dailyRow } = await admin
      .from('user_daily_usage')
      .select('count, accessed_topics')
      .eq('user_id', userId)
      .eq('usage_date', todayStr)
      .eq('feature', feature)
      .maybeSingle();

    const currentCount = dailyRow?.count || 0;

    if (feature === 'topic_switch' && topicId) {
      const accessedTopics: string[] = Array.isArray(dailyRow?.accessed_topics)
        ? dailyRow.accessed_topics
        : [];

      if (accessedTopics.includes(topicId)) {
        return { allowed: true, planCode };
      }

      if (accessedTopics.length >= maxQuota) {
        return {
          allowed: false,
          limitType: 'topic_switch_limit',
          featureName,
          planCode,
          reason: `Daily topic switch limit (${maxQuota}/day) reached for ${userEntitlements.planName}.`,
          upgradeMessage: `You've reached your daily topic change limit (${maxQuota}/day) on the ${userEntitlements.planName} plan. Upgrade to Max or Elite for higher daily topic switches.`,
        };
      }

      const updatedTopics = [...accessedTopics, topicId];
      await admin.from('user_daily_usage').upsert(
        {
          user_id: userId,
          usage_date: todayStr,
          feature,
          count: updatedTopics.length,
          accessed_topics: updatedTopics,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,usage_date,feature' }
      );

      return { allowed: true, planCode };
    }

    if (typeof maxQuota === 'number' && currentCount >= maxQuota) {
      return {
        allowed: false,
        limitType: 'daily_quota',
        featureName,
        planCode,
        reason: `Daily quota (${maxQuota}) reached for ${featureName}.`,
        upgradeMessage: `You've reached your daily limit (${maxQuota}) for ${featureName} on the ${userEntitlements.planName} plan. Upgrade to Max or Elite to continue practicing.`,
      };
    }

    await admin.from('user_daily_usage').upsert(
      {
        user_id: userId,
        usage_date: todayStr,
        feature,
        count: currentCount + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,usage_date,feature' }
    );
  }

  return { allowed: true, planCode };
}
