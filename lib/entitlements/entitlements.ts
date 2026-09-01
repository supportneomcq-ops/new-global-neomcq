/**
 * NeoMCQ Authoritative Plan Entitlement System
 * 
 * Centralized authorization rules for all learning, AI, and exam-switch features.
 * Client components and server actions MUST rely on this layer rather than
 * scattering disparate price or plan checks.
 */

import { PlanCode, SubscriptionStatus, AUTHORITATIVE_PLANS, getPlanByCode } from '@/lib/plans/plan-config';

export interface UserEntitlements {
  userId: string;
  planCode: 'FREE' | PlanCode;
  planName: string;
  status: SubscriptionStatus;
  isPaid: boolean;
  isActive: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  
  // Platform Permissions
  canAccessAdaptiveMCQ: boolean;
  canAccessQuizzes: boolean;
  canAccessFlashcards: boolean;
  canAccessNotes: boolean;
  canAccessBlanks: boolean;
  canAccessAiTutor: boolean;
  canAccessTtsAudio: boolean; // MAX and ELITE
  canAccessWeaknessRadar: boolean;
  canAccessStudyPlan: boolean;
  canGeneratePriority: boolean; // MAX and ELITE

  // Exam Switching Entitlements
  hasUnlimitedExamSwitches: boolean; // true ONLY for ELITE
  examSwitchFeeUsd: number; // 0 for ELITE, 2.00 for PRO / MAX / FREE

  // AI Generation & Credit Display Rules
  isUnlimitedAi: boolean; // true ONLY for ELITE
  showCreditCounters: boolean; // false for ELITE (Elite has no artificial quotas)
  dailyQuestionsLimit: number;
  monthlyTutorLimit: number;
}

export const DEFAULT_FREE_ENTITLEMENTS = (userId: string = ''): UserEntitlements => ({
  userId,
  planCode: 'FREE',
  planName: 'Free Trial',
  status: 'none',
  isPaid: false,
  isActive: false,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  canAccessAdaptiveMCQ: true,
  canAccessQuizzes: true,
  canAccessFlashcards: true,
  canAccessNotes: true,
  canAccessBlanks: true,
  canAccessAiTutor: true,
  canAccessTtsAudio: false,
  canAccessWeaknessRadar: true,
  canAccessStudyPlan: true,
  canGeneratePriority: false,
  hasUnlimitedExamSwitches: false,
  examSwitchFeeUsd: 2.0,
  isUnlimitedAi: false,
  showCreditCounters: true,
  dailyQuestionsLimit: 50,
  monthlyTutorLimit: 10,
});

/**
 * Derives comprehensive entitlements given raw subscription and profile records.
 */
export function deriveEntitlements(
  userId: string,
  subscriptionRecord?: {
    plan_code?: string | null;
    status?: string | null;
    current_period_start?: string | null;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean | null;
  } | null
): UserEntitlements {
  if (!subscriptionRecord) {
    return DEFAULT_FREE_ENTITLEMENTS(userId);
  }

  const rawStatus = (subscriptionRecord.status || '').toLowerCase() as SubscriptionStatus;
  const rawPlanCode = (subscriptionRecord.plan_code || '').toUpperCase();
  const plan = getPlanByCode(rawPlanCode);

  // Verify subscription is genuinely active (or within valid billing period)
  const isStatusActive = ['active', 'authenticated'].includes(rawStatus);
  const now = new Date();
  const hasNotExpired =
    !subscriptionRecord.current_period_end ||
    new Date(subscriptionRecord.current_period_end).getTime() > now.getTime();

  const isSubscriptionValid = Boolean(plan && isStatusActive && hasNotExpired);

  if (!isSubscriptionValid || !plan) {
    return {
      ...DEFAULT_FREE_ENTITLEMENTS(userId),
      status: rawStatus || 'expired',
      currentPeriodStart: subscriptionRecord.current_period_start || null,
      currentPeriodEnd: subscriptionRecord.current_period_end || null,
      cancelAtPeriodEnd: Boolean(subscriptionRecord.cancel_at_period_end),
    };
  }

  const isElite = plan.code === 'ELITE';
  const isMax = plan.code === 'MAX';
  const isPro = plan.code === 'PRO';

  return {
    userId,
    planCode: plan.code,
    planName: plan.name,
    status: rawStatus,
    isPaid: true,
    isActive: true,
    currentPeriodStart: subscriptionRecord.current_period_start || null,
    currentPeriodEnd: subscriptionRecord.current_period_end || null,
    cancelAtPeriodEnd: Boolean(subscriptionRecord.cancel_at_period_end),

    // Core learning tabs
    canAccessAdaptiveMCQ: true,
    canAccessQuizzes: true,
    canAccessFlashcards: true,
    canAccessNotes: true,
    canAccessBlanks: true,
    canAccessAiTutor: true,
    canAccessTtsAudio: isMax || isElite,
    canAccessWeaknessRadar: true,
    canAccessStudyPlan: true,
    canGeneratePriority: isMax || isElite,

    // Exam switch policy
    hasUnlimitedExamSwitches: isElite,
    examSwitchFeeUsd: isElite ? 0.0 : 2.0,

    // AI Limits & UI display
    isUnlimitedAi: isElite,
    showCreditCounters: !isElite,
    dailyQuestionsLimit: plan.limits.daily_ai_questions,
    monthlyTutorLimit: plan.limits.monthly_ai_tutor_sessions,
  };
}
