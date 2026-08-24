/**
 * Global Exam Registry Compatibility Layer for NeoMCQ
 * 
 * CANONICAL SOURCE OF TRUTH:
 * The Supabase `exams` database table is the single canonical source of truth.
 * All UI, search, onboarding, SEO, and backend workflows query Supabase directly.
 */

export interface ExamRegistryEntry {
  canonicalName: string
  aliases: string[]
  slug: string
  country: string
  countryCode: string // ISO-2
  category: string
  organization: string
  officialWebsite?: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Adaptive'
  questionCount: number
  timeLimitMins: number
  isFeatured: boolean
  verificationStatus: 'verified' | 'official' | 'community_verified' | 'needs_verification'
  defaultSubjects?: string[]
}

/**
 * Legacy compatibility export - empty array to ensure database is strictly queried.
 * All application code queries the Supabase `exams` table directly.
 */
export const GLOBAL_EXAM_REGISTRY: ExamRegistryEntry[] = [];

