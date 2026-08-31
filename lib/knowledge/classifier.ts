import { GLOBAL_COUNTRIES } from '../data/countries.ts'
import { normalizeInput } from './normalizer.ts'

export type InputClassificationType =
  | 'EXAM'
  | 'SUBJECT'
  | 'TOPIC'
  | 'CONCEPT'
  | 'COUNTRY'
  | 'AMBIGUOUS'
  | 'INVALID'

export interface ClassificationResult {
  type: InputClassificationType
  confidence: number // 0 - 100
  reason: string
  normalizedText: string
  suggestedEntity?: {
    type: 'country' | 'exam' | 'subject' | 'topic'
    name: string
    id?: string
    metadata?: Record<string, any>
  }
  isCountryMetadata: boolean
  isCurricularValid: boolean
}

// Set of all lowercase country names & iso codes for rapid O(1) detection
const KNOWN_COUNTRIES = new Set<string>()
for (const c of GLOBAL_COUNTRIES) {
  if (c.name) KNOWN_COUNTRIES.add(c.name.toLowerCase().trim())
  if (c.iso2) KNOWN_COUNTRIES.add(c.iso2.toLowerCase().trim())
  if (c.iso3) KNOWN_COUNTRIES.add(c.iso3.toLowerCase().trim())
}
// Add common variants
KNOWN_COUNTRIES.add('usa')
KNOWN_COUNTRIES.add('united states of america')
KNOWN_COUNTRIES.add('uk')
KNOWN_COUNTRIES.add('great britain')
KNOWN_COUNTRIES.add('uae')
KNOWN_COUNTRIES.add('india')
KNOWN_COUNTRIES.add('bharat')

/**
 * Classifies user-entered text independently and in context.
 * Prevents country names (e.g. "India") from becoming topics/subjects.
 */
export function classifyUserInput(
  rawInput: string,
  context?: {
    targetLevel?: 'exam' | 'subject' | 'topic'
    activeExamName?: string
    activeSubjectName?: string
  }
): ClassificationResult {
  const norm = normalizeInput(rawInput)
  const clean = norm.canonical.toLowerCase().trim()

  if (!clean || clean.length < 2) {
    return {
      type: 'INVALID',
      confidence: 100,
      reason: 'Input is empty or too short to be a valid learning entity.',
      normalizedText: clean,
      isCountryMetadata: false,
      isCurricularValid: false,
    }
  }

  // 1. Check if input is purely a Country / Region name
  if (KNOWN_COUNTRIES.has(clean)) {
    const matchedCountry = GLOBAL_COUNTRIES.find(
      (c) =>
        c.name.toLowerCase() === clean ||
        c.iso2.toLowerCase() === clean ||
        c.iso3.toLowerCase() === clean
    )

    // Check if the active context explicitly justifies a country topic (e.g., UPSC Indian Polity & Geography)
    const isSpecialCountryException = Boolean(
      context?.activeExamName?.toLowerCase().includes('upsc') &&
      context?.activeSubjectName?.toLowerCase().includes('polity')
    )

    return {
      type: 'COUNTRY',
      confidence: 99,
      reason: `"${rawInput}" is country/geographical metadata, not an academic subject or topic.`,
      normalizedText: norm.canonical,
      suggestedEntity: {
        type: 'country',
        name: matchedCountry?.name || rawInput,
        metadata: matchedCountry,
      },
      isCountryMetadata: true,
      isCurricularValid: isSpecialCountryException,
    }
  }

  // 2. Check if input matches common Exam pattern keywords or abbreviations
  const commonExamKeywords = [
    'exam', 'test', 'license', 'licensure', 'neet', 'usmle', 'fmge', 'plab', 'nclex',
    'upsc', 'gate', 'cat', 'jee', 'neet-pg', 'inicet', 'ini-cet', 'cfa', 'gre', 'gmat',
    'sat', 'toefl', 'ielts', 'amc', 'mccqe', 'mrcp', 'mrcs', 'frcr', 'mrcog', 'mrcpch'
  ]

  const isExamPattern = commonExamKeywords.some((kw) => clean.includes(kw))

  if (isExamPattern) {
    return {
      type: 'EXAM',
      confidence: 95,
      reason: `Recognized as examination title or board test: ${norm.canonical}`,
      normalizedText: norm.canonical,
      suggestedEntity: {
        type: 'exam',
        name: norm.canonical,
      },
      isCountryMetadata: false,
      isCurricularValid: true,
    }
  }

  // 4. Check if targetLevel is 'subject' or 'topic' with contextual validation
  if (context?.targetLevel === 'subject') {
    // Basic check for valid academic subject syntax (alphanumeric, no code garbage)
    return {
      type: 'SUBJECT',
      confidence: 85,
      reason: `Validated as academic subject under ${context.activeExamName || 'exam'}.`,
      normalizedText: norm.canonical,
      isCountryMetadata: false,
      isCurricularValid: true,
    }
  }

  if (context?.targetLevel === 'topic') {
    return {
      type: 'TOPIC',
      confidence: 85,
      reason: `Validated as curricular topic under ${context.activeSubjectName || 'subject'}.`,
      normalizedText: norm.canonical,
      isCountryMetadata: false,
      isCurricularValid: true,
    }
  }

  return {
    type: 'CONCEPT',
    confidence: 70,
    reason: `Recognized as general academic term or concept.`,
    normalizedText: norm.canonical,
    isCountryMetadata: false,
    isCurricularValid: true,
  }
}
