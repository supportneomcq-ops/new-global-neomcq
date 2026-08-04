/**
 * Autonomous Knowledge Engine - Text Normalization Utility
 * Step 1: Normalizes any raw user input into canonical form and slug.
 */

const COMMON_ABBREVIATIONS: Record<string, string> = {
  fmges: 'fmge',
  fmg: 'fmge',
  'foreign medical graduate exam': 'fmge',
  'foreign medical graduate examination': 'fmge',
  'usmle step one': 'usmle step 1',
  'usmle step two': 'usmle step 2',
  'usmle step three': 'usmle step 3',
  neetpg: 'neet pg',
  'neet-pg': 'neet pg',
  inicet: 'ini cet',
  'ini-cet': 'ini cet',
  plab1: 'plab 1',
  plab2: 'plab 2',
  ukmla: 'plab ukmla',
  nclex: 'nclex-rn',
  'nclex rn': 'nclex-rn',
  amc: 'amc mcq',
  'upsc cse': 'upsc civil services',
  cpa: 'us cpa',
  'cardio': 'cardiology',
  'neuro anatomy': 'neuroanatomy',
  'neuro-anatomy': 'neuroanatomy',
  'thoracic anatomy': 'thorax anatomy',
  'obgyn': 'obstetrics and gynecology',
  'obg': 'obstetrics and gynecology',
  'peds': 'pediatrics',
  'paediatrics': 'pediatrics',
  'ortho': 'orthopedics',
  'orthopaedics': 'orthopedics',
  'psych': 'psychiatry',
  'derma': 'dermatology',
  'micro': 'microbiology',
  'patho': 'pathology',
  'pharma': 'pharmacology',
  'physio': 'physiology',
  'biochem': 'biochemistry',
  'forensic': 'forensic medicine',
  'psm': 'preventive and social medicine',
  'radio': 'radiology',
  'anaesthesia': 'anesthesia',
}

export interface NormalizedResult {
  raw: string
  canonical: string
  slug: string
  tokens: string[]
}

export function normalizeInput(input: string): NormalizedResult {
  if (!input || typeof input !== 'string') {
    return { raw: '', canonical: '', slug: '', tokens: [] }
  }

  const raw = input.trim()

  // 1. Lowercase & sanitize emojis, special symbols
  let cleaned = raw
    .toLowerCase()
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // 2. Lookup common exact abbreviation maps
  if (COMMON_ABBREVIATIONS[cleaned]) {
    cleaned = COMMON_ABBREVIATIONS[cleaned]
  }

  // 3. Word tokenization & plural normalization (simple s stripping where appropriate)
  const tokens = cleaned
    .split(' ')
    .filter(Boolean)
    .map((token) => {
      if (COMMON_ABBREVIATIONS[token]) {
        return COMMON_ABBREVIATIONS[token]
      }
      return token
    })

  const canonical = tokens.join(' ')

  // 4. Generate URL-safe slug
  const slug = canonical
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return {
    raw,
    canonical,
    slug,
    tokens,
  }
}

export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 100.0

  const len1 = s1.length
  const len2 = s2.length

  if (len1 === 0 || len2 === 0) return 0.0

  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  const distance = matrix[len1][len2]
  const maxLen = Math.max(len1, len2)
  const similarity = ((maxLen - distance) / maxLen) * 100

  return Math.round(similarity * 100) / 100
}
