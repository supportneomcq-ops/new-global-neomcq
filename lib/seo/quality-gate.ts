/**
 * NeoMCQ Content Quality Gate & Indexability Classifier
 * Ensures only high-value, comprehensive, verified educational content is indexed by search engines.
 */

import { McqSeoData, NoteSeoData, TopicSeoData } from './types';

export interface QualityEvaluation {
  isIndexable: boolean;
  qualityScore: number; // 0 - 100
  reasons: string[];
  suggestedAction: 'index' | 'noindex' | 'review' | 'enhance';
}

/**
 * Validates whether an MCQ item is eligible for public indexing.
 * Prevents thin, broken, or duplicate questions from degrading domain quality.
 */
export function evaluateMcqQuality(
  mcq: Partial<McqSeoData> & { question?: string; options?: any[]; status?: string; visibility?: string }
): QualityEvaluation {
  const reasons: string[] = [];
  let score = 100;

  // 1. Status & Visibility Check
  if (mcq.status && mcq.status !== 'approved') {
    reasons.push(`Status is '${mcq.status}', must be 'approved'`);
    score -= 40;
  }

  if (mcq.visibility && mcq.visibility === 'PRIVATE') {
    reasons.push("Visibility is set to 'PRIVATE'");
    score -= 50;
  }

  // 2. Question Stem Depth
  const questionText = (mcq.question || '').trim();
  if (!questionText || questionText.length < 25) {
    reasons.push('Question stem is too short or empty (<25 chars)');
    score -= 35;
  } else if (questionText.length >= 80) {
    // Rich clinical scenario or detailed prompt
    score += 5;
  }

  // 3. Options Quality
  const options = Array.isArray(mcq.options) ? mcq.options : [];
  if (options.length < 3) {
    reasons.push(`Only ${options.length} options provided (minimum 3 required)`);
    score -= 30;
  }

  const distinctOptions = new Set(options.map((o) => (typeof o === 'string' ? o.trim().toLowerCase() : '')));
  if (distinctOptions.size < options.length) {
    reasons.push('Duplicate options detected');
    score -= 20;
  }

  // 4. Taxonomical Association
  if (!mcq.exam_id && !mcq.exam_slug) {
    reasons.push('Missing associated exam');
    score -= 15;
  }
  if (!mcq.topic_id && !mcq.topic_slug) {
    reasons.push('Missing associated topic');
    score -= 10;
  }

  // 5. Explicit manual override
  if (mcq.seo_indexable === false) {
    reasons.push('Manually flagged as non-indexable (seo_indexable = false)');
    score = Math.min(score, 45);
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const isIndexable = normalizedScore >= 70 && !reasons.some((r) => r.includes('PRIVATE') || r.includes('Status is'));

  let suggestedAction: QualityEvaluation['suggestedAction'] = 'index';
  if (!isIndexable) {
    suggestedAction = normalizedScore < 50 ? 'noindex' : 'review';
  } else if (normalizedScore < 85) {
    suggestedAction = 'enhance';
  }

  return {
    isIndexable,
    qualityScore: normalizedScore,
    reasons,
    suggestedAction,
  };
}

/**
 * Validates whether a study note is eligible for public indexing.
 */
export function evaluateNoteQuality(
  note: Partial<NoteSeoData> & { content?: string; title?: string; status?: string }
): QualityEvaluation {
  const reasons: string[] = [];
  let score = 100;

  if (note.status && note.status !== 'approved') {
    reasons.push(`Status is '${note.status}', must be 'approved'`);
    score -= 40;
  }

  const title = (note.title || '').trim();
  if (!title || title.length < 5) {
    reasons.push('Title is missing or too short');
    score -= 30;
  }

  const content = (note.content || '').trim();
  if (!content || content.length < 150) {
    reasons.push('Note content is too short for standalone indexing (<150 chars)');
    score -= 35;
  }

  if (note.seo_indexable === false) {
    reasons.push('Manually flagged as non-indexable');
    score = Math.min(score, 45);
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const isIndexable = normalizedScore >= 70 && !reasons.some((r) => r.includes('Status is'));

  return {
    isIndexable,
    qualityScore: normalizedScore,
    reasons,
    suggestedAction: isIndexable ? 'index' : 'noindex',
  };
}
