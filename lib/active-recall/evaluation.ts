import { ActiveRecallItem, AnswerEvaluationResult } from '@/lib/types/active-recall';

/**
 * Normalizes text for safe, medical-grade active recall comparison.
 * - Trims leading and trailing whitespace
 * - Collapses consecutive whitespace to a single space
 * - Converts to lower case
 * - Strips non-essential punctuation (periods, commas, semicolons, quotes, hyphens)
 * - Standardizes common word variations (e.g. "type 1" vs "type-1", "iv" vs "i.v.")
 */
export function normalizeRecallAnswer(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .trim()
    .toLowerCase()
    // Replace hyphens and slashes with space to treat "Beta-blocker" and "Beta blocker" identically
    .replace(/[-/]/g, ' ')
    // Remove common punctuation: quotes, periods, commas, parens, brackets, semicolons
    .replace(/[.,;:'"()[\]{}]/g, '')
    // Collapse multiple spaces into one
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates a user's answer against the target blank and accepted synonyms.
 * Strictly avoids loose fuzzy matching to guarantee medical accuracy.
 */
export function evaluateRecallAnswer(
  userAnswer: string,
  item: ActiveRecallItem
): AnswerEvaluationResult {
  const normUser = normalizeRecallAnswer(userAnswer);
  const normCorrect = normalizeRecallAnswer(item.blank);

  // If user entered nothing
  if (!normUser) {
    return {
      isCorrect: false,
      normalizedUserAnswer: '',
      normalizedCorrectAnswer: normCorrect,
      matchType: 'incorrect',
    };
  }

  // 1. Direct exact match (raw or normalized)
  if (userAnswer.trim().toLowerCase() === item.blank.trim().toLowerCase()) {
    return {
      isCorrect: true,
      normalizedUserAnswer: normUser,
      normalizedCorrectAnswer: normCorrect,
      matchedAnswer: item.blank,
      matchType: 'exact',
    };
  }

  // 2. Normalized match (punctuation/hyphen stripped)
  if (normUser === normCorrect) {
    return {
      isCorrect: true,
      normalizedUserAnswer: normUser,
      normalizedCorrectAnswer: normCorrect,
      matchedAnswer: item.blank,
      matchType: 'normalized',
    };
  }

  // 3. Accepted synonyms / abbreviations match
  if (Array.isArray(item.acceptedAnswers) && item.acceptedAnswers.length > 0) {
    for (const accepted of item.acceptedAnswers) {
      const normAccepted = normalizeRecallAnswer(accepted);
      if (normUser === normAccepted) {
        return {
          isCorrect: true,
          normalizedUserAnswer: normUser,
          normalizedCorrectAnswer: normCorrect,
          matchedAnswer: accepted,
          matchType: 'accepted_synonym',
        };
      }
    }
  }

  // 4. Clinical Number & Unit variations (e.g. "90 mins" vs "90 minutes")
  const standardReplacements: Record<string, string> = {
    min: 'minute',
    mins: 'minutes',
    hr: 'hour',
    hrs: 'hours',
    sec: 'second',
    secs: 'seconds',
    mg: 'milligram',
    mcg: 'microgram',
    g: 'gram',
  };

  const expandUnits = (str: string) => {
    return str
      .split(' ')
      .map((word) => standardReplacements[word] || word)
      .join(' ');
  };

  const expandedUser = expandUnits(normUser);
  const expandedCorrect = expandUnits(normCorrect);

  if (expandedUser === expandedCorrect) {
    return {
      isCorrect: true,
      normalizedUserAnswer: normUser,
      normalizedCorrectAnswer: normCorrect,
      matchedAnswer: item.blank,
      matchType: 'normalized',
    };
  }

  // 5. Otherwise incorrect
  return {
    isCorrect: false,
    normalizedUserAnswer: normUser,
    normalizedCorrectAnswer: normCorrect,
    matchType: 'incorrect',
  };
}
