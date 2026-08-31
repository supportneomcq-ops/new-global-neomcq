/**
 * NEOMCQ — CANONICAL REVISION SHEET VALIDATOR & DEDUPLICATOR (PHASE 4E)
 *
 * Implements:
 * 1. Comprehensive Revision Sheet Schema Validation
 * 2. Rapid-review content verification (Must-know concepts, key facts, summary, sections)
 * 3. Domain-adaptive validation (Adapts to medical and non-medical examinations)
 * 4. Section & paragraph deduplication gating
 */

import type {
  CanonicalRevisionSheet,
  RevisionSheetValidationResult,
  RevisionSheetSection,
} from './types.ts';

export class RevisionSheetValidator {
  private static readonly MIN_WORD_COUNT = 250;
  private static readonly MIN_SECTIONS_COUNT = 3;
  private static readonly MIN_MUST_KNOW = 3;
  private static readonly MIN_KEY_FACTS = 3;

  /**
   * Validates a candidate Revision Sheet against educational quality standards,
   * ensures absence of repeated sections/bullets, and verifies domain adaptability.
   */
  public static validateRevisionSheet(
    rawSheet: any,
    context: {
      examId: string;
      subjectId: string;
      topicId: string;
      version: number;
      examName?: string;
      subjectName?: string;
      topicName?: string;
    }
  ): {
    valid: boolean;
    pkg: CanonicalRevisionSheet | null;
    validation: RevisionSheetValidationResult;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rawSheet || typeof rawSheet !== 'object') {
      return {
        valid: false,
        pkg: null,
        validation: {
          isValid: false,
          validationScore: 0,
          hasMustKnowConcepts: false,
          hasKeyFacts: false,
          hasSummary: false,
          sectionsCount: 0,
          wordCount: 0,
          errors: ['No valid revision sheet object provided for validation.'],
          warnings: [],
        },
      };
    }

    const title = (rawSheet.title || `${context.topicName || 'Topic'} — Rapid Revision Sheet`).trim();

    // 1. Must-Know Concepts Validation
    const rawMustKnow = rawSheet.mustKnowConcepts || rawSheet.must_know_concepts || [];
    const mustKnowConcepts: string[] = Array.isArray(rawMustKnow)
      ? rawMustKnow.map((item: any) => (typeof item === 'string' ? item.trim() : String(item))).filter(Boolean)
      : [];

    const hasMustKnowConcepts = mustKnowConcepts.length >= this.MIN_MUST_KNOW;
    if (!hasMustKnowConcepts) {
      errors.push(`Revision Sheet must include at least ${this.MIN_MUST_KNOW} Must-Know Concepts (found ${mustKnowConcepts.length}).`);
    }

    // 2. Key Facts Validation
    const rawKeyFacts = rawSheet.keyFacts || rawSheet.key_facts || [];
    const keyFacts: string[] = Array.isArray(rawKeyFacts)
      ? rawKeyFacts.map((item: any) => (typeof item === 'string' ? item.trim() : String(item))).filter(Boolean)
      : [];

    const hasKeyFacts = keyFacts.length >= this.MIN_KEY_FACTS;
    if (!hasKeyFacts) {
      errors.push(`Revision Sheet must include at least ${this.MIN_KEY_FACTS} Key Facts (found ${keyFacts.length}).`);
    }

    // 3. Rapid Review Summary Validation
    const rapidReviewSummary = (rawSheet.rapidReviewSummary || rawSheet.summary || rawSheet.rapid_review_summary || '').trim();
    const hasSummary = Boolean(rapidReviewSummary && rapidReviewSummary.length >= 40);
    if (!hasSummary) {
      errors.push('Revision Sheet is missing a comprehensive Rapid Review Summary (>40 characters).');
    }

    // 4. Structured Sections & Deduplication
    const rawSections = rawSheet.sections || [];
    const sections: RevisionSheetSection[] = [];
    const seenSectionTitles = new Set<string>();
    const seenBullets = new Set<string>();

    if (Array.isArray(rawSections)) {
      for (const s of rawSections) {
        if (!s || typeof s !== 'object') continue;
        const sTitle = (s.title || s.sectionTitle || '').trim();
        if (!sTitle) continue;

        const normalizedTitle = sTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seenSectionTitles.has(normalizedTitle)) {
          warnings.push(`Duplicate section title ignored: "${sTitle}"`);
          continue;
        }
        seenSectionTitles.add(normalizedTitle);

        const rawBullets = s.bullets || s.keyPoints || s.points || [];
        const cleanBullets: string[] = [];

        if (Array.isArray(rawBullets)) {
          for (const b of rawBullets) {
            const bText = (typeof b === 'string' ? b : String(b)).trim();
            if (bText.length > 5) {
              const normalizedBullet = bText.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (!seenBullets.has(normalizedBullet)) {
                seenBullets.add(normalizedBullet);
                cleanBullets.push(bText);
              }
            }
          }
        }

        if (cleanBullets.length > 0 || typeof s.content === 'string') {
          if (cleanBullets.length === 0 && typeof s.content === 'string') {
            cleanBullets.push(s.content.trim());
          }
          sections.push({
            title: sTitle,
            bullets: cleanBullets,
            highlightNotes: s.highlightNotes || s.highlight || undefined,
          });
        }
      }
    }

    const sectionsCount = sections.length;
    if (sectionsCount < this.MIN_SECTIONS_COUNT) {
      // If sections are missing, synthesize from mustKnow and keyFacts if available
      if (mustKnowConcepts.length > 0 || keyFacts.length > 0) {
        sections.push(
          { title: 'Core High-Yield Concepts', bullets: mustKnowConcepts },
          { title: 'Essential Examination Facts', bullets: keyFacts },
          { title: 'High-Yield Review & Synthesis', bullets: [rapidReviewSummary] }
        );
      } else {
        errors.push(`Revision Sheet must contain at least ${this.MIN_SECTIONS_COUNT} structured sections (found ${sectionsCount}).`);
      }
    }

    // 5. Optional Adaptive Fields
    const classifications = Array.isArray(rawSheet.classifications)
      ? rawSheet.classifications
      : undefined;
    const importantAssociations = Array.isArray(rawSheet.importantAssociations || rawSheet.important_associations)
      ? (rawSheet.importantAssociations || rawSheet.important_associations)
      : undefined;
    const commonExamTraps = Array.isArray(rawSheet.commonExamTraps || rawSheet.common_exam_traps)
      ? (rawSheet.commonExamTraps || rawSheet.common_exam_traps)
      : undefined;
    const formulasOrRules = Array.isArray(rawSheet.formulasOrRules || rawSheet.formulas_or_rules)
      ? (rawSheet.formulasOrRules || rawSheet.formulas_or_rules)
      : undefined;
    const clinicalCorrelations = Array.isArray(rawSheet.clinicalCorrelations || rawSheet.clinical_correlations)
      ? (rawSheet.clinicalCorrelations || rawSheet.clinical_correlations)
      : undefined;

    // 6. Word Count & Formatted Content
    const fullTextContent = [
      title,
      mustKnowConcepts.join(' '),
      keyFacts.join(' '),
      sections.map((s) => `${s.title} ${s.bullets.join(' ')}`).join(' '),
      rapidReviewSummary,
    ].join(' ');

    const wordCount = fullTextContent.split(/\s+/).filter(Boolean).length;
    if (wordCount < this.MIN_WORD_COUNT) {
      errors.push(`Revision sheet word count is insufficient: ${wordCount} words (minimum required: ${this.MIN_WORD_COUNT}).`);
    }

    const isValid = errors.length === 0;
    const validationScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (hasMustKnowConcepts ? 25 : 0) +
          (hasKeyFacts ? 25 : 0) +
          (hasSummary ? 20 : 0) +
          (sections.length >= this.MIN_SECTIONS_COUNT ? 20 : 0) +
          (wordCount >= this.MIN_WORD_COUNT ? 10 : 0)
        )
      )
    );

    if (!isValid) {
      return {
        valid: false,
        pkg: null,
        validation: {
          isValid: false,
          validationScore,
          hasMustKnowConcepts,
          hasKeyFacts,
          hasSummary,
          sectionsCount: sections.length,
          wordCount,
          errors,
          warnings,
        },
      };
    }

    const canonicalId = rawSheet.id || crypto.randomUUID();
    const pkg: CanonicalRevisionSheet = {
      id: canonicalId,
      examId: context.examId,
      subjectId: context.subjectId,
      topicId: context.topicId,
      contentVersionId: context.version,
      title,
      sheetType: rawSheet.sheetType || rawSheet.sheet_type || 'quick_revision',
      content: rawSheet.content || fullTextContent,
      mustKnowConcepts,
      keyFacts,
      classifications,
      importantAssociations,
      commonExamTraps,
      formulasOrRules,
      clinicalCorrelations,
      rapidReviewSummary,
      sections,
      status: 'approved',
      aiGenerated: true,
      version: context.version,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      valid: true,
      pkg,
      validation: {
        isValid: true,
        validationScore,
        hasMustKnowConcepts,
        hasKeyFacts,
        hasSummary,
        sectionsCount: sections.length,
        wordCount,
        errors: [],
        warnings,
      },
    };
  }
}
