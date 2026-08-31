/**
 * NEOMCQ — CANONICAL FLASHCARDS VALIDATOR & DEDUPLICATOR (PHASE 4E)
 *
 * Implements:
 * 1. Strict Flashcard Schema Verification (front, back, explanation, difficulty, isHighYield, displayOrder)
 * 2. Quality gating: Rejects empty front/back, ambiguous answers, excessively long fronts (>300 chars)
 * 3. Exact and Semantic Deduplication (Token-overlap Jaccard similarity threshold < 0.75)
 * 4. Multi-set and existing-canonical cross-deduplication
 * 5. Deficit calculation against configurable canonical target count (default 40)
 */

import { createHash } from 'crypto';
import type {
  CanonicalFlashcardItem,
  FlashcardDifficulty,
  FlashcardsValidationResult,
} from './types.ts';
import { CANONICAL_FLASHCARD_TARGET_COUNT } from './types.ts';

export interface FlashcardRawItem {
  id?: string;
  front?: string;
  question?: string;
  back?: string;
  answer?: string;
  explanation?: string;
  difficulty?: string;
  isHighYield?: boolean;
  is_high_yield?: boolean;
  highYield?: boolean;
  displayOrder?: number;
  display_order?: number;
  order?: number;
  [key: string]: any;
}

export class FlashcardValidator {
  private static readonly MAX_FRONT_LENGTH = 300;
  private static readonly MIN_FRONT_LENGTH = 5;
  private static readonly MIN_BACK_LENGTH = 3;
  private static readonly MAX_BACK_LENGTH = 1000;
  private static readonly SEMANTIC_SIMILARITY_THRESHOLD = 0.75; // 75% max token overlap

  private static readonly AMBIGUOUS_PATTERNS = [
    /^it depends/i,
    /^refer to/i,
    /^see above/i,
    /^n\/?a$/i,
    /^tbd$/i,
    /^unknown$/i,
    /^none of the above$/i,
    /^all of the above$/i,
    /^both [ab] and [cd]$/i,
    /^as discussed/i,
    /^check textbook/i,
    /^various$/i,
  ];

  /**
   * Generates normalized alphanumeric fingerprint for exact/near-exact deduplication
   */
  public static generateFingerprint(front: string, back: string): string {
    const norm = `${front.toLowerCase().replace(/[^a-z0-9]/g, '')}:${back.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    return createHash('sha256').update(norm).digest('hex').slice(0, 24);
  }

  /**
   * Tokenizes text for semantic Jaccard similarity
   */
  public static tokenize(text: string): Set<string> {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
    return new Set(words);
  }

  /**
   * Computes Jaccard Similarity between two token sets
   */
  public static computeSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Validates a batch of raw flashcard candidates against canonical quality rules,
   * performs intra-batch and cross-corpus deduplication, and calculates target deficit.
   */
  public static validateFlashcards(
    rawCards: any[],
    context: {
      examId: string;
      subjectId: string;
      topicId: string;
      version: number;
      targetCount?: number;
      existingCards?: CanonicalFlashcardItem[];
      topicName?: string;
      examName?: string;
    }
  ): FlashcardsValidationResult {
    const targetCount = context.targetCount || CANONICAL_FLASHCARD_TARGET_COUNT;
    const existingCards = context.existingCards || [];
    const validItems: CanonicalFlashcardItem[] = [];
    const rejectedItems: Array<{ item: Partial<CanonicalFlashcardItem>; reason: string }> = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const seenFingerprints = new Set<string>();
    const seenTokenSets: Array<{ id: string; tokens: Set<string>; front: string }> = [];

    // Pre-populate with existing cards to prevent duplicate generation against already stored cards
    for (const existing of existingCards) {
      const fp = existing.fingerprint || this.generateFingerprint(existing.front, existing.back);
      seenFingerprints.add(fp);
      seenTokenSets.push({
        id: existing.id,
        tokens: this.tokenize(existing.front),
        front: existing.front,
      });
      validItems.push(existing);
    }

    if (!Array.isArray(rawCards) || rawCards.length === 0) {
      if (validItems.length < targetCount) {
        return {
          isValid: false,
          validCount: validItems.length,
          targetCount,
          deficitCount: targetCount - validItems.length,
          validItems,
          rejectedItems: [],
          validationScore: 0,
          errors: ['No flashcards provided for validation.'],
          warnings: [],
        };
      }
    }

    let displayOrder = validItems.length > 0
      ? Math.max(...validItems.map((c) => c.displayOrder || 0)) + 1
      : 1;

    for (let i = 0; i < (rawCards || []).length; i++) {
      const raw = rawCards[i] || {};
      const front = (raw.front || raw.question || '').trim();
      const back = (raw.back || raw.answer || '').trim();
      const explanation = (raw.explanation || '').trim() || undefined;
      const isHighYield = Boolean(raw.isHighYield ?? raw.is_high_yield ?? raw.highYield ?? true);
      
      let difficulty: FlashcardDifficulty = 'Medium';
      if (typeof raw.difficulty === 'string') {
        const d = raw.difficulty.toLowerCase();
        if (d === 'easy') difficulty = 'Easy';
        else if (d === 'hard') difficulty = 'Hard';
        else difficulty = 'Medium';
      }

      const itemStub: Partial<CanonicalFlashcardItem> = {
        front,
        back,
        explanation,
        difficulty,
        isHighYield,
      };

      // 1. Empty / Missing Front or Back
      if (!front || front.length < this.MIN_FRONT_LENGTH) {
        rejectedItems.push({
          item: itemStub,
          reason: `Front text is missing or too short (< ${this.MIN_FRONT_LENGTH} characters).`,
        });
        continue;
      }

      if (!back || back.length < this.MIN_BACK_LENGTH) {
        rejectedItems.push({
          item: itemStub,
          reason: `Back text is missing or too short (< ${this.MIN_BACK_LENGTH} characters).`,
        });
        continue;
      }

      // 2. Excessively Long Front (> 300 chars)
      if (front.length > this.MAX_FRONT_LENGTH) {
        rejectedItems.push({
          item: itemStub,
          reason: `Front text exceeds maximum length of ${this.MAX_FRONT_LENGTH} characters (was ${front.length}).`,
        });
        continue;
      }

      if (back.length > this.MAX_BACK_LENGTH) {
        rejectedItems.push({
          item: itemStub,
          reason: `Back text exceeds maximum length of ${this.MAX_BACK_LENGTH} characters (was ${back.length}).`,
        });
        continue;
      }

      // 3. Ambiguous answers / non-answers
      const isAmbiguous = this.AMBIGUOUS_PATTERNS.some((pattern) => pattern.test(back));
      if (isAmbiguous) {
        rejectedItems.push({
          item: itemStub,
          reason: `Answer on back is ambiguous or low-yield (${back}).`,
        });
        continue;
      }

      // 4. Exact Fingerprint Deduplication
      const fingerprint = this.generateFingerprint(front, back);
      if (seenFingerprints.has(fingerprint)) {
        rejectedItems.push({
          item: itemStub,
          reason: `Duplicate flashcard fingerprint detected: "${front.slice(0, 40)}..."`,
        });
        continue;
      }

      // 5. Semantic Similarity Deduplication (Jaccard > 0.75 against existing/batch)
      const currentTokens = this.tokenize(front);
      let isSemanticDuplicate = false;
      let duplicateFront = '';
      let highestSimilarity = 0;

      for (const seen of seenTokenSets) {
        const similarity = this.computeSimilarity(currentTokens, seen.tokens);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          duplicateFront = seen.front;
        }
        if (similarity >= this.SEMANTIC_SIMILARITY_THRESHOLD) {
          isSemanticDuplicate = true;
          break;
        }
      }

      if (isSemanticDuplicate) {
        rejectedItems.push({
          item: itemStub,
          reason: `Semantic duplicate of existing card (${(highestSimilarity * 100).toFixed(1)}% match with "${duplicateFront.slice(0, 40)}...").`,
        });
        continue;
      }

      // Card is valid and unique!
      const id = raw.id || crypto.randomUUID();
      const canonicalCard: CanonicalFlashcardItem = {
        id,
        examId: context.examId,
        subjectId: context.subjectId,
        topicId: context.topicId,
        contentVersionId: context.version,
        front,
        back,
        explanation,
        difficulty,
        isHighYield,
        displayOrder: raw.displayOrder || raw.display_order || raw.order || displayOrder++,
        fingerprint,
        status: 'approved',
        aiGenerated: true,
        deckId: raw.deckId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      seenFingerprints.add(fingerprint);
      seenTokenSets.push({ id, tokens: currentTokens, front });
      validItems.push(canonicalCard);

      // If we have met the target count, stop adding more to avoid exceeding target count
      if (validItems.length >= targetCount) {
        break;
      }
    }

    const deficitCount = Math.max(0, targetCount - validItems.length);
    const isValid = validItems.length >= targetCount;
    const validationScore = Math.max(0, Math.min(100, Math.round((validItems.length / targetCount) * 100)));

    if (!isValid) {
      errors.push(`Flashcard package has deficit: ${validItems.length}/${targetCount} valid cards (deficit: ${deficitCount}).`);
    }

    return {
      isValid,
      validCount: validItems.length,
      targetCount,
      deficitCount,
      validItems: validItems.slice(0, targetCount),
      rejectedItems,
      validationScore,
      errors,
      warnings,
    };
  }
}
