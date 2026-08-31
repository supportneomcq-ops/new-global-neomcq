/**
 * NEOMCQ — AI TUTOR SEGMENT VALIDATOR
 * Phase 5B: Schema Validation, Quality Checks & Duplication Prevention
 */

import type { TutorSegmentData, TutorSegment } from './tutor-types.ts';

export interface SegmentValidationResult {
  valid: boolean;
  errors: string[];
}

export class TutorSegmentValidator {
  /**
   * Validates a segment against strict schema requirements and anti-duplication rules
   */
  public static validateSegment(
    segment: Partial<TutorSegmentData> | null | undefined,
    expectedSequence?: number,
    previousSegments: TutorSegment[] = []
  ): SegmentValidationResult {
    if (!segment) {
      return {
        valid: false,
        errors: ['Segment object is required and cannot be null or undefined.'],
      };
    }

    const errors: string[] = [];

    // 1. Sequence Validation
    if (typeof segment.sequence !== 'number' || segment.sequence < 1) {
      errors.push('Segment sequence must be a positive integer.');
    } else if (expectedSequence !== undefined && Number(segment.sequence) !== Number(expectedSequence)) {
      errors.push(`Sequence mismatch: expected ${expectedSequence}, got ${segment.sequence}.`);
    }

    // 2. Phase Validation
    if (!segment.phase || typeof segment.phase !== 'string' || segment.phase.trim().length === 0) {
      errors.push('Segment phase is required and must be a non-empty string.');
    }

    // 3. Title Validation
    if (!segment.title || typeof segment.title !== 'string' || segment.title.trim().length < 3) {
      errors.push('Segment title is required and must be at least 3 characters.');
    }

    // 4. Teaching Text Validation (reject empty, generic stubs, or extremely short text)
    if (!segment.teachingText || typeof segment.teachingText !== 'string') {
      errors.push('Segment teachingText is required and must be a string.');
    } else {
      const trimmedText = segment.teachingText.trim();
      if (trimmedText.length < 50) {
        errors.push('Segment teachingText is too short (minimum 50 characters required).');
      }
      if (
        trimmedText.toLowerCase().includes('placeholder') ||
        trimmedText.toLowerCase().includes('lorem ipsum') ||
        trimmedText.toLowerCase().includes('todo: teach')
      ) {
        errors.push('Segment teachingText contains placeholder or stub content.');
      }
    }

    // 5. Key Points Validation
    if (!Array.isArray(segment.keyPoints) || segment.keyPoints.length === 0) {
      errors.push('Segment keyPoints must be a non-empty array of strings.');
    } else {
      const validPoints = segment.keyPoints.filter(
        (kp) => typeof kp === 'string' && kp.trim().length > 0
      );
      if (validPoints.length === 0) {
        errors.push('Segment keyPoints must contain at least one valid non-empty string.');
      }
    }

    // 6. Exam Relevance Validation
    if (!segment.examRelevance || typeof segment.examRelevance !== 'string' || segment.examRelevance.trim().length < 5) {
      errors.push('Segment examRelevance is required and must be at least 5 characters.');
    }

    // 7. Duplication check against previous segments
    if (segment.teachingText && previousSegments.length > 0) {
      const currentTokens = this.tokenize(segment.teachingText);
      for (const prev of previousSegments) {
        const prevText = prev.teachingText || prev.generatedText || '';
        if (!prevText) continue;

        const prevTokens = this.tokenize(prevText);
        const similarity = this.calculateJaccardSimilarity(currentTokens, prevTokens);

        if (similarity > 0.75) {
          errors.push(
            `Duplicate or highly repetitive teaching text detected (Jaccard similarity: ${(similarity * 100).toFixed(1)}% with sequence ${prev.sequence}).`
          );
          break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static tokenize(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
  }

  private static calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const token of setA) {
      if (setB.has(token)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }
}
