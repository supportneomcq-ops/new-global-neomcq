/**
 * NEOMCQ — CANONICAL TOPIC IDENTITY BUILDER & VALIDATOR
 *
 * Enforces:
 * 1. Authoritative Identity: Strictly `exam_id:subject_id:topic_id:content_package_version`
 * 2. Hierarchy integrity: Verifies that exam owns subject, and subject owns topic
 * 3. Never trust client-supplied raw text, slugs, or browser state for generation jobs
 */

import { getSupabaseAdmin } from '../../supabase.ts';
import type { ContentPackageType } from './types.ts';

export function buildCanonicalPackageKey(
  examId: string,
  subjectId: string,
  topicId: string,
  version: number = 1
): string {
  if (!examId || !subjectId || !topicId) {
    throw new Error('Cannot construct canonical package key: examId, subjectId, and topicId are required.');
  }
  return `${examId}:${subjectId}:${topicId}:v${Math.max(1, Math.floor(version))}`;
}

export function buildIdempotencyKey(
  examId: string,
  subjectId: string,
  topicId: string,
  packageType: ContentPackageType = 'full_pack',
  version: number = 1
): string {
  const canonicalKey = buildCanonicalPackageKey(examId, subjectId, topicId, version);
  return `canonical_content:${canonicalKey}:${packageType}`;
}

export interface HierarchyVerificationResult {
  valid: boolean;
  examId: string;
  subjectId: string;
  topicId: string;
  examName?: string;
  subjectName?: string;
  topicName?: string;
  error?: string;
}

/**
 * Verifies that exam owns subject and subject owns topic using server-side database
 */
export async function verifyCanonicalHierarchy(
  examId: string,
  subjectId: string,
  topicId: string,
  supabaseClient?: any
): Promise<HierarchyVerificationResult> {
  const supabase = supabaseClient || getSupabaseAdmin();

  if (!examId || !subjectId || !topicId) {
    return {
      valid: false,
      examId,
      subjectId,
      topicId,
      error: 'Missing required hierarchy identifiers.',
    };
  }

  try {
    // 1. Verify subject belongs to exam
    const { data: subject, error: subjErr } = await supabase
      .from('exam_subjects')
      .select('id, exam_id, name')
      .eq('id', subjectId)
      .maybeSingle();

    if (subjErr || !subject) {
      return {
        valid: false,
        examId,
        subjectId,
        topicId,
        error: `Subject ${subjectId} not found.`,
      };
    }

    if (subject.exam_id !== examId) {
      return {
        valid: false,
        examId,
        subjectId,
        topicId,
        error: `Subject ${subjectId} does not belong to Exam ${examId}.`,
      };
    }

    // 2. Verify topic belongs to subject
    const { data: topic, error: topErr } = await supabase
      .from('exam_topics')
      .select('id, subject_id, name')
      .eq('id', topicId)
      .maybeSingle();

    if (topErr || !topic) {
      return {
        valid: false,
        examId,
        subjectId,
        topicId,
        error: `Topic ${topicId} not found.`,
      };
    }

    if (topic.subject_id !== subjectId) {
      return {
        valid: false,
        examId,
        subjectId,
        topicId,
        error: `Topic ${topicId} does not belong to Subject ${subjectId}.`,
      };
    }

    // 3. Optional lookup exam name
    const { data: exam } = await supabase
      .from('exams')
      .select('id, name')
      .eq('id', examId)
      .maybeSingle();

    return {
      valid: true,
      examId,
      subjectId,
      topicId,
      examName: exam?.name || 'Canonical Exam',
      subjectName: subject.name,
      topicName: topic.name,
    };
  } catch (err: any) {
    return {
      valid: false,
      examId,
      subjectId,
      topicId,
      error: err.message || 'Database error verifying canonical hierarchy.',
    };
  }
}
