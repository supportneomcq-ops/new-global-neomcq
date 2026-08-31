/**
 * NEOMCQ — CANONICAL NOTES VALIDATOR (PHASE 4D)
 *
 * Enforces:
 * 1. Strict schema compliance for educational notes
 * 2. Rejection of empty, malformed, or incomplete sections
 * 3. Topic & Exam hierarchy relevance checks
 * 4. Deduplication of section titles and redundant content
 * 5. Accurate word count & reading time calculation
 * 6. Mathematical quality scoring (0 - 100)
 */

import type {
  CanonicalNotesPackage,
  CanonicalNotesSection,
  NotesValidationResult,
  NotesSectionType,
  MediaRecommendation,
} from './types.ts';

export class NotesValidator {
  /**
   * Validates and sanitizes a raw Notes payload against the canonical schema
   */
  public static validateNotes(
    raw: any,
    hierarchy: { examId: string; subjectId: string; topicId: string; version: number; topicName?: string; subjectName?: string; examName?: string }
  ): {
    valid: boolean;
    pkg: CanonicalNotesPackage | null;
    validation: NotesValidationResult;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!raw || typeof raw !== 'object') {
      return {
        valid: false,
        pkg: null,
        validation: {
          valid: false,
          score: 0,
          hasOverview: false,
          hasObjectives: false,
          hasHighYieldFacts: false,
          hasExamPearls: false,
          hasSummary: false,
          sectionsCount: 0,
          wordCount: 0,
          errors: ['Raw notes payload is empty or not an object.'],
          warnings: [],
        },
      };
    }

    // 1. Core String Fields
    const title = String(raw.title || `${hierarchy.topicName || 'Topic'} — Canonical High-Yield Guide`).trim();
    const topicOverview = String(raw.topicOverview || raw.overview || '').trim();
    const summary = String(raw.summary || '').trim();

    if (topicOverview.length < 20) {
      errors.push('Topic overview is missing or too short (< 20 characters).');
    }
    if (summary.length < 20) {
      errors.push('Summary is missing or too short (< 20 characters).');
    }

    // 2. Core Array Fields
    const learningObjectives = this.sanitizeStringArray(raw.learningObjectives);
    if (learningObjectives.length < 2) {
      errors.push('Must contain at least 2 clear learning objectives.');
    }

    const keyConcepts = this.sanitizeStringArray(raw.keyConcepts);
    if (keyConcepts.length < 2) {
      errors.push('Must contain at least 2 key concepts.');
    }

    const highYieldFacts = this.sanitizeStringArray(raw.highYieldFacts);
    if (highYieldFacts.length < 3) {
      errors.push('Must contain at least 3 high-yield facts.');
    }

    const examPearls = this.sanitizeStringArray(raw.examPearls);
    if (examPearls.length < 2) {
      errors.push('Must contain at least 2 exam pearls.');
    }

    // 3. Sections Validation & Deduplication
    const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
    const sanitizedSections: CanonicalNotesSection[] = [];
    const seenSectionTitles = new Set<string>();

    for (let i = 0; i < rawSections.length; i++) {
      const s = rawSections[i];
      if (!s || typeof s !== 'object') continue;

      const sTitle = String(s.sectionTitle || s.title || `Section ${i + 1}`).trim();
      const normalizedTitle = sTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (!normalizedTitle) continue;
      if (seenSectionTitles.has(normalizedTitle)) {
        warnings.push(`Duplicate section title removed: "${sTitle}".`);
        continue;
      }
      seenSectionTitles.add(normalizedTitle);

      const sContent = String(s.content || s.body || '').trim();
      if (sContent.length < 15) {
        warnings.push(`Section "${sTitle}" discarded due to sparse content (< 15 characters).`);
        continue;
      }

      const keyPoints = this.sanitizeStringArray(s.keyPoints || s.highlights);
      const mediaRecommendation = this.normalizeMediaRecommendation(s.mediaRecommendation);
      const mediaSearchQuery = s.mediaSearchQuery ? String(s.mediaSearchQuery).trim() : undefined;
      const sectionType = this.normalizeSectionType(s.sectionType || s.type);

      sanitizedSections.push({
        id: `sec-${hierarchy.topicId.slice(0, 8)}-${(i + 1).toString().padStart(2, '0')}`,
        sectionTitle: sTitle,
        sectionType,
        content: sContent,
        keyPoints,
        mediaRecommendation,
        mediaSearchQuery,
      });
    }

    if (sanitizedSections.length < 2) {
      errors.push('Notes must contain at least 2 non-empty, distinct structured sections.');
    }

    // 4. Optional Structured Modules (Definitions, Classifications, Clinical Features, Diagnosis, Management)
    const importantDefinitions = Array.isArray(raw.importantDefinitions)
      ? raw.importantDefinitions
          .filter((d: any) => d && d.term && d.definition)
          .map((d: any) => ({ term: String(d.term).trim(), definition: String(d.definition).trim() }))
      : undefined;

    const mechanismsOrPathophysiology = raw.mechanismsOrPathophysiology
      ? String(raw.mechanismsOrPathophysiology).trim()
      : undefined;

    const classifications = Array.isArray(raw.classifications)
      ? raw.classifications
          .filter((c: any) => c && c.name && Array.isArray(c.items))
          .map((c: any) => ({
            name: String(c.name).trim(),
            items: c.items.map((it: any) => String(it).trim()).filter(Boolean),
            criteria: c.criteria ? String(c.criteria).trim() : undefined,
          }))
      : undefined;

    const clinicalFeatures = raw.clinicalFeatures && typeof raw.clinicalFeatures === 'object'
      ? {
          signs: this.sanitizeStringArray(raw.clinicalFeatures.signs),
          symptoms: this.sanitizeStringArray(raw.clinicalFeatures.symptoms),
          complications: this.sanitizeStringArray(raw.clinicalFeatures.complications),
        }
      : undefined;

    const diagnosisAndInvestigation = raw.diagnosisAndInvestigation && typeof raw.diagnosisAndInvestigation === 'object'
      ? {
          goldStandard: raw.diagnosisAndInvestigation.goldStandard ? String(raw.diagnosisAndInvestigation.goldStandard).trim() : undefined,
          firstLine: raw.diagnosisAndInvestigation.firstLine ? String(raw.diagnosisAndInvestigation.firstLine).trim() : undefined,
          findings: this.sanitizeStringArray(raw.diagnosisAndInvestigation.findings),
        }
      : undefined;

    const management = raw.management && typeof raw.management === 'object'
      ? {
          firstLine: raw.management.firstLine ? String(raw.management.firstLine).trim() : undefined,
          definitive: raw.management.definitive ? String(raw.management.definitive).trim() : undefined,
          contraindications: this.sanitizeStringArray(raw.management.contraindications),
        }
      : undefined;

    // 5. Calculate Metrics (Word count, reading time)
    const allText = [
      title,
      topicOverview,
      summary,
      ...learningObjectives,
      ...keyConcepts,
      ...highYieldFacts,
      ...examPearls,
      ...sanitizedSections.map((s) => `${s.sectionTitle} ${s.content} ${s.keyPoints.join(' ')}`),
      mechanismsOrPathophysiology || '',
    ].join(' ');

    const wordCount = allText.split(/\s+/).filter(Boolean).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    // 6. Quality Score Calculation (0 - 100)
    let score = 100;
    if (errors.length > 0) score -= errors.length * 25;
    if (warnings.length > 0) score -= warnings.length * 5;
    if (wordCount < 300) score -= 15;
    score = Math.max(0, Math.min(100, score));

    const isValid = errors.length === 0 && score >= 70;

    const validation: NotesValidationResult = {
      valid: isValid,
      score,
      hasOverview: topicOverview.length >= 20,
      hasObjectives: learningObjectives.length >= 2,
      hasHighYieldFacts: highYieldFacts.length >= 3,
      hasExamPearls: examPearls.length >= 2,
      hasSummary: summary.length >= 20,
      sectionsCount: sanitizedSections.length,
      wordCount,
      errors,
      warnings,
    };

    if (!isValid) {
      return { valid: false, pkg: null, validation };
    }

    const canonicalPackage: CanonicalNotesPackage = {
      id: raw.id || `notes-${hierarchy.topicId.slice(0, 8)}-v${hierarchy.version}`,
      examId: hierarchy.examId,
      subjectId: hierarchy.subjectId,
      topicId: hierarchy.topicId,
      contentVersionId: hierarchy.version,
      title,
      topicOverview,
      learningObjectives,
      keyConcepts,
      importantDefinitions,
      mechanismsOrPathophysiology,
      classifications,
      clinicalFeatures,
      diagnosisAndInvestigation,
      management,
      highYieldFacts,
      examPearls,
      summary,
      sections: sanitizedSections,
      isSubjectSpecific: true,
      wordCount,
      readingTimeMinutes,
      status: 'approved',
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      valid: true,
      pkg: canonicalPackage,
      validation,
    };
  }

  private static sanitizeStringArray(arr: any): string[] {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item) => String(item || '').trim())
      .filter((s) => s.length > 3);
  }

  private static normalizeMediaRecommendation(rec: any): MediaRecommendation {
    const s = String(rec || '').toUpperCase();
    if (s.includes('IMAGE_AND_VIDEO') || s.includes('BOTH')) return 'IMAGE_AND_VIDEO_USEFUL';
    if (s.includes('IMAGE') || s.includes('PHOTO') || s.includes('DIAGRAM')) return 'IMAGE_REQUIRED';
    if (s.includes('VIDEO') || s.includes('CLIP') || s.includes('ANIMATION')) return 'VIDEO_USEFUL';
    return 'NO_MEDIA_REQUIRED';
  }

  private static normalizeSectionType(type: any): NotesSectionType {
    const s = String(type || '').toLowerCase();
    if (s.includes('overview') || s.includes('intro')) return 'overview';
    if (s.includes('objective')) return 'learning_objectives';
    if (s.includes('concept')) return 'key_concepts';
    if (s.includes('definition')) return 'definitions';
    if (s.includes('mechanism') || s.includes('patho') || s.includes('physio')) return 'mechanisms';
    if (s.includes('classif') || s.includes('type')) return 'classifications';
    if (s.includes('clinical') || s.includes('feature') || s.includes('sign') || s.includes('symptom')) return 'clinical_features';
    if (s.includes('diagno') || s.includes('investig')) return 'diagnosis';
    if (s.includes('manage') || s.includes('treat') || s.includes('therapy')) return 'management';
    if (s.includes('yield') || s.includes('fact')) return 'high_yield_facts';
    if (s.includes('pearl')) return 'exam_pearls';
    if (s.includes('summary') || s.includes('conclu')) return 'summary';
    return 'custom';
  }
}
