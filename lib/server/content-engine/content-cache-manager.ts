/**
 * NEOMCQ — CONTENT CACHE & VERSIONING LAYER
 *
 * Implements:
 * 1. Global Reusable Content Cache backed by `content_versions`
 * 2. Active & Historical Version Tracking
 * 3. 30-Day Freshness Evaluation
 * 4. Immutable Historical Snapshots (v1 remains accessible when v2 is created)
 */

import { getSupabaseAdmin } from '../../supabase';
import type { GlobalContentPackage } from './types';
import { buildCanonicalPackageKey } from './canonical-identity';

const DEFAULT_FRESHNESS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days

export class ContentCacheManager {
  /**
   * Retrieves the latest active content version for a canonical topic
   */
  public static async getLatestVersion(
    examId: string,
    subjectId: string,
    topicId: string,
    supabaseClient?: any
  ): Promise<{
    hasContent: boolean;
    isFresh: boolean;
    versionNumber: number;
    pkg: GlobalContentPackage | null;
    createdAt?: string;
  }> {
    const supabase = supabaseClient || getSupabaseAdmin();

    try {
      const { data: versionRecord, error } = await supabase
        .from('content_versions')
        .select('id, asset_id, asset_type, version, snapshot, created_at, change_summary')
        .eq('asset_id', topicId)
        .eq('asset_type', 'topic')
        .order('version', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !versionRecord || !versionRecord.snapshot) {
        return {
          hasContent: false,
          isFresh: false,
          versionNumber: 0,
          pkg: null,
        };
      }

      const versionNum = Number(versionRecord.version || 1);
      const createdAt = versionRecord.created_at;
      const ageMs = Date.now() - new Date(createdAt).getTime();
      const isFresh = ageMs < DEFAULT_FRESHNESS_WINDOW_MS;

      const rawSnapshot = versionRecord.snapshot as any;
      const canonicalKey = buildCanonicalPackageKey(examId, subjectId, topicId, versionNum);

      const pkg: GlobalContentPackage = {
        packageVersion: versionNum,
        canonicalKey,
        examId,
        subjectId,
        topicId,
        mainMcqsSlot: rawSnapshot.mainMcqsSlot || {
          targetCount: 40,
          actualCount: Array.isArray(rawSnapshot.mcqs) ? rawSnapshot.mcqs.length : 0,
          items: rawSnapshot.mcqs,
        },
        quiz1Slot: rawSnapshot.quiz1Slot || {
          targetCount: 20,
          actualCount: Array.isArray(rawSnapshot.quiz_a) ? rawSnapshot.quiz_a.length : 0,
          items: rawSnapshot.quiz_a,
        },
        quiz2Slot: rawSnapshot.quiz2Slot || {
          targetCount: 20,
          actualCount: Array.isArray(rawSnapshot.quiz_b) ? rawSnapshot.quiz_b.length : 0,
          items: rawSnapshot.quiz_b,
        },
        notesSlot: rawSnapshot.notesSlot || {
          present: Boolean(rawSnapshot.notes),
          content: rawSnapshot.notes,
        },
        flashcardsSlot: rawSnapshot.flashcardsSlot || {
          targetCount: 40,
          count: Array.isArray(rawSnapshot.flashcards) ? rawSnapshot.flashcards.length : 0,
          items: rawSnapshot.flashcards,
        },
        revisionSheetSlot: rawSnapshot.revisionSheetSlot || (rawSnapshot.revision_sheet ? {
          present: true,
          sheet: rawSnapshot.revision_sheet,
        } : undefined),
        aiTutorSlot: rawSnapshot.aiTutorSlot || {
          present: Boolean(rawSnapshot.tutor_explanation),
          content: rawSnapshot.tutor_explanation,
        },
        mediaReferencesSlot: rawSnapshot.mediaReferencesSlot || {
          count: Array.isArray(rawSnapshot.whiteboard_phases) ? rawSnapshot.whiteboard_phases.length : 0,
          items: rawSnapshot.whiteboard_phases,
        },
        validationMetadata: rawSnapshot.validationMetadata || {
          structuralValid: true,
          scopeValid: true,
          deduplicationValid: true,
          answersValid: true,
          score: rawSnapshot.quality_score || 95.0,
          status: 'passed',
        },
        createdAt,
        updatedAt: createdAt,
      };

      return {
        hasContent: true,
        isFresh,
        versionNumber: versionNum,
        pkg,
        createdAt,
      };
    } catch (err) {
      console.warn('[ContentCacheManager] Error fetching latest version:', err);
      return {
        hasContent: false,
        isFresh: false,
        versionNumber: 0,
        pkg: null,
      };
    }
  }

  /**
   * Retrieves a specific historical version of a canonical topic's package
   */
  public static async getVersionByNumber(
    examId: string,
    subjectId: string,
    topicId: string,
    versionNumber: number,
    supabaseClient?: any
  ): Promise<GlobalContentPackage | null> {
    const supabase = supabaseClient || getSupabaseAdmin();

    try {
      const { data: record, error } = await supabase
        .from('content_versions')
        .select('*')
        .eq('asset_id', topicId)
        .eq('asset_type', 'topic')
        .eq('version', versionNumber)
        .maybeSingle();

      if (error || !record || !record.snapshot) return null;

      const raw = record.snapshot as any;
      return {
        packageVersion: versionNumber,
        canonicalKey: buildCanonicalPackageKey(examId, subjectId, topicId, versionNumber),
        examId,
        subjectId,
        topicId,
        mainMcqsSlot: raw.mainMcqsSlot || { targetCount: 40, actualCount: 0 },
        quiz1Slot: raw.quiz1Slot || { targetCount: 20, actualCount: 0 },
        quiz2Slot: raw.quiz2Slot || { targetCount: 20, actualCount: 0 },
        notesSlot: raw.notesSlot || { present: false },
        flashcardsSlot: raw.flashcardsSlot || {
          targetCount: 40,
          count: Array.isArray(raw.flashcards) ? raw.flashcards.length : 0,
          items: raw.flashcards,
        },
        revisionSheetSlot: raw.revisionSheetSlot || (raw.revision_sheet ? {
          present: true,
          sheet: raw.revision_sheet,
        } : undefined),
        aiTutorSlot: raw.aiTutorSlot || { present: false },
        mediaReferencesSlot: raw.mediaReferencesSlot || { count: 0 },
        validationMetadata: raw.validationMetadata || {
          structuralValid: true,
          scopeValid: true,
          deduplicationValid: true,
          answersValid: true,
          score: 90.0,
          status: 'passed',
        },
        createdAt: record.created_at,
        updatedAt: record.created_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * Commits a newly validated package version to `content_versions`
   */
  public static async savePackageVersion(
    examId: string,
    subjectId: string,
    topicId: string,
    versionNumber: number,
    pkg: GlobalContentPackage,
    changeSummary: string = 'Automated canonical content package generation',
    supabaseClient?: any
  ): Promise<boolean> {
    const supabase = supabaseClient || getSupabaseAdmin();

    try {
      const { error } = await supabase.from('content_versions').insert({
        asset_id: topicId,
        asset_type: 'topic',
        version: versionNumber,
        snapshot: pkg,
        change_summary: changeSummary,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[ContentCacheManager] Error writing content version:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[ContentCacheManager] Exception saving package version:', err);
      return false;
    }
  }
}
