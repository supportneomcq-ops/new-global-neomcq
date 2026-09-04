/**
 * NeoMCQ Authoritative Plan Configuration
 * 
 * STRICT RULES:
 * 1. ONLY THREE PAID PLANS EXIST: PRO ($9.99/mo), MAX ($19.99/mo), ELITE ($499/yr).
 * 2. Stable internal plan codes: PRO, MAX, ELITE.
 * 3. Never determine access by comparing displayed price strings.
 * 4. Razorpay plan IDs come from environment variables or database configuration.
 * 5. RAZORPAY_KEY_SECRET is NEVER exposed to the browser.
 */

export type PlanCode = 'PRO' | 'MAX' | 'ELITE';
export type BillingInterval = 'monthly' | 'yearly';
export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'authenticated'
  | 'paused'
  | 'cancelled'
  | 'expired'
  | 'halted'
  | 'failed'
  | 'none';

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  slug: string;
  price_usd: number;
  price_inr: number;
  amount_cents: number; // in USD cents (e.g. 999 = $9.99)
  amount_paise: number; // in INR paise (e.g. 84900 = ₹849.00)
  billing_interval: BillingInterval;
  annual: boolean;
  duration_days: number;
  period_label: string;
  tagline: string;
  description: string;
  popular?: boolean;
  highlight?: boolean;
  exam_switch_fee_usd: number; // $2 for PRO/MAX, $0 for ELITE
  is_unlimited: boolean; // true ONLY for ELITE
  features: string[];
  limits: {
    daily_ai_questions: number; // Infinity for ELITE
    monthly_ai_tutor_sessions: number; // Infinity for ELITE
    audio_tts_enabled: boolean;
    priority_queue: boolean;
    unlimited_exam_switches: boolean; // true for ELITE
    show_credit_caps: boolean; // FALSE for ELITE (Elite has no artificial quotas)
  };
}

export const AUTHORITATIVE_PLANS: Record<PlanCode, PlanDefinition> = {
  PRO: {
    code: 'PRO',
    name: 'Pro',
    slug: 'pro',
    price_usd: 9.99,
    price_inr: 849.0,
    amount_cents: 999,
    amount_paise: 84900,
    billing_interval: 'monthly',
    annual: false,
    duration_days: 30,
    period_label: '/month',
    tagline: 'High-yield foundation for dedicated medical & professional candidates',
    description: 'Essential AI question generation, adaptive quizzes, and revision notes.',
    popular: false,
    highlight: false,
    exam_switch_fee_usd: 2.0,
    is_unlimited: false,
    features: [
      'Comprehensive access to 180+ Country Syllabus & Exam Blueprints',
      'Adaptive MCQ Practice & Mock Exams with Standard Explanations',
      'High-Yield Printable A4 Notes & Revision Cheat Sheets',
      'Spaced Repetition Knowledge Radar & Topic Analytics',
      'Active Recall Flashcards & Fill-in-the-Blank Drills',
      'High-Speed Neural Audio (TTS) in AI Tutor (15 audio/day)',
      '$2.00 USD Exam Curriculum Switching Fee',
    ],
    limits: {
      daily_ai_questions: 100,
      monthly_ai_tutor_sessions: 30,
      daily_topic_switches: 2,
      daily_tutor_tts: 15,
      audio_tts_enabled: true,
      priority_queue: false,
      unlimited_exam_switches: false,
      show_credit_caps: true,
    },
  },
  MAX: {
    code: 'MAX',
    name: 'Max',
    slug: 'max',
    price_usd: 19.99,
    price_inr: 1699.0,
    amount_cents: 1999,
    amount_paise: 169900,
    billing_interval: 'monthly',
    annual: false,
    duration_days: 30,
    period_label: '/month',
    tagline: 'Enhanced clinical intelligence & interactive AI tutor for mastery',
    description: 'High-throughput generation, audio TTS, and diagnostic weakness radar.',
    popular: true,
    highlight: false,
    exam_switch_fee_usd: 2.0,
    is_unlimited: false,
    features: [
      'Everything in Pro included',
      'Advanced Clinical Vignettes & Complex Diagnostic Reasoning',
      'Interactive AI Tutor Whiteboard & Step-by-Step Problem Solving',
      'High-Speed Neural Audio (TTS) in AI Tutor (50 audio/day)',
      'Misconception Diagnostics & In-Depth Error Pattern Analytics',
      'Priority Fast-Track AI Content Generation Queue',
      '$2.00 USD Exam Curriculum Switching Fee',
    ],
    limits: {
      daily_ai_questions: 350,
      monthly_ai_tutor_sessions: 120,
      daily_topic_switches: 15,
      daily_tutor_tts: 50,
      audio_tts_enabled: true,
      priority_queue: true,
      unlimited_exam_switches: false,
      show_credit_caps: true,
    },
  },
  ELITE: {
    code: 'ELITE',
    name: 'Elite',
    slug: 'elite',
    price_usd: 499.0,
    price_inr: 41999.0,
    amount_cents: 49900,
    amount_paise: 4199900,
    billing_interval: 'yearly',
    annual: true,
    duration_days: 365,
    period_label: '/year',
    tagline: 'Unlimited platform access with zero exam switch fees for 1 full year',
    description: 'The ultimate all-inclusive annual membership for serious candidates.',
    popular: false,
    highlight: true,
    exam_switch_fee_usd: 0.0,
    is_unlimited: true,
    features: [
      'Truly Unlimited Access for 1 Full Year (365 Days)',
      'FREE Unlimited Exam Curriculum Switching (Zero $2 Fees)',
      'Unlimited MCQ, Quiz, Flashcard & A4 Revision Note Generation',
      'Unlimited AI Tutor Interactive Lessons & Live Whiteboards',
      'Unlimited Neural Audio TTS Explanations in AI Tutor',
      'Zero Artificial Credit Counters or Monthly Quotas',
      'Dedicated Tier-1 AI Compute with Ultra-Low Latency',
      'VIP Priority 24/7 Support & Rapid Syllabus Blueprint Updates',
    ],
    limits: {
      daily_ai_questions: Number.POSITIVE_INFINITY,
      monthly_ai_tutor_sessions: Number.POSITIVE_INFINITY,
      daily_topic_switches: Number.POSITIVE_INFINITY,
      daily_tutor_tts: Number.POSITIVE_INFINITY,
      audio_tts_enabled: true,
      priority_queue: true,
      unlimited_exam_switches: true,
      show_credit_caps: false,
    },
  },
};

/**
 * Returns plan definition by code
 */
export function getPlanByCode(code?: string | null): PlanDefinition | null {
  if (!code) return null;
  const upper = code.toUpperCase() as PlanCode;
  return AUTHORITATIVE_PLANS[upper] || null;
}

/**
 * Returns plan definition by slug
 */
export function getPlanBySlug(slug?: string | null): PlanDefinition | null {
  if (!slug) return null;
  const lower = slug.toLowerCase();
  for (const plan of Object.values(AUTHORITATIVE_PLANS)) {
    if (plan.slug === lower) return plan;
  }
  return null;
}

/**
 * Validates whether a code is one of the 3 canonical plans
 */
export function isValidPlanCode(code?: string | null): code is PlanCode {
  if (!code) return false;
  return ['PRO', 'MAX', 'ELITE'].includes(code.toUpperCase());
}

/**
 * Returns all active plan definitions in canonical order
 */
export function getAllActivePlans(): PlanDefinition[] {
  return [AUTHORITATIVE_PLANS.PRO, AUTHORITATIVE_PLANS.MAX, AUTHORITATIVE_PLANS.ELITE];
}

/**
 * Returns client-safe plan list (excluding server-only metadata)
 */
export function getPublicPlansConfig() {
  return getAllActivePlans().map((plan) => ({
    code: plan.code,
    name: plan.name,
    slug: plan.slug,
    price_usd: plan.price_usd,
    price_inr: plan.price_inr,
    billing_interval: plan.billing_interval,
    annual: plan.annual,
    duration_days: plan.duration_days,
    period_label: plan.period_label,
    tagline: plan.tagline,
    description: plan.description,
    popular: plan.popular,
    highlight: plan.highlight,
    exam_switch_fee_usd: plan.exam_switch_fee_usd,
    is_unlimited: plan.is_unlimited,
    features: plan.features,
    limits: {
      audio_tts_enabled: plan.limits.audio_tts_enabled,
      priority_queue: plan.limits.priority_queue,
      unlimited_exam_switches: plan.limits.unlimited_exam_switches,
      show_credit_caps: plan.limits.show_credit_caps,
    },
  }));
}
