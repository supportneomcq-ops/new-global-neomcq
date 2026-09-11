/**
 * NEOMCQ — FEATURE 7: CANONICAL AI TUTOR ASSET RESOLVER (BATCH 7.5)
 * Safe Asset Retrieval, Validation, Storage & Canonical Reuse Pipeline
 */

import { getSupabaseAdmin } from '../../supabase';
import { verifyCanonicalHierarchy } from './canonical-identity';
import { TutorDbService } from './tutor-db-service';
import { EducationalMediaRetriever } from './media-retriever';
import { GenerationJobManager } from './job-manager';
import type { TutorAsset } from '../../types/ai-tutor-architecture';

export interface ResolveAssetsParams {
  examId: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string | null;
  lessonId: string;
  forceRefresh?: boolean;
  userId?: string;
}

export interface ResolveAssetsResponse {
  success: boolean;
  lessonId: string;
  assets: TutorAsset[];
  servedFromCache?: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Validates HTTPS image/media URLs against safety constraints
 */
function isSafeMediaUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();

  // Reject scripts, data URIs with html/js, javascript: pseudo-protocols
  if (clean.startsWith('javascript:') || clean.startsWith('data:text/html') || clean.includes('<script')) {
    return false;
  }

  // Must be valid HTTP/HTTPS URL
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes input text against HTML/JS injection
 */
function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

export class TutorAssetResolver {
  /**
   * Resolves, validates, and persists visual assets for a canonical AI Tutor lesson
   */
  public static async resolveAndSaveLessonAssets(params: ResolveAssetsParams): Promise<ResolveAssetsResponse> {
    const { examId, subjectId, topicId, subtopicId = null, lessonId, forceRefresh = false, userId } = params;
    const supabase = getSupabaseAdmin();

    // 1. Verify Scope Hierarchy
    const hierarchy = await verifyCanonicalHierarchy(examId, subjectId, topicId, subtopicId, supabase);
    if (!hierarchy.valid) {
      return {
        success: false,
        lessonId,
        assets: [],
        error: hierarchy.error || 'Invalid curriculum scope hierarchy.',
        errorCode: 'HIERARCHY_INVALID',
      };
    }

    // 2. Fetch Existing Lesson Data
    const canonical = await TutorDbService.getCanonicalTutorLesson(examId, subjectId, topicId, subtopicId);
    if (!canonical || !canonical.lesson) {
      return {
        success: false,
        lessonId,
        assets: [],
        error: 'Canonical lesson not found for asset resolution.',
        errorCode: 'LESSON_NOT_FOUND',
      };
    }

    const existingAssets = canonical.assets || [];

    // Check if assets are already resolved and ready (Canonical Reuse)
    const allReady = existingAssets.length > 0 && existingAssets.every((a) => {
      const pos = a.positionMetadata as any;
      return a.sourceUrl && a.sourceUrl.length > 0 && pos?.status === 'READY';
    });

    if (allReady && !forceRefresh) {
      return {
        success: true,
        lessonId,
        assets: existingAssets,
        servedFromCache: true,
      };
    }

    // 3. Concurrency Locking via ai_jobs
    const jobRes = await TutorDbService.createOrAttachTutorJob({
      examId,
      subjectId,
      topicId,
      subtopicId,
      version: canonical.lesson.contentVersion,
      userId,
    });

    const activeJob = jobRes.job;

    // 4. Resolve Each Asset Requirement safely
    const resolvedAssets: TutorAsset[] = [];

    const safeHierarchy = {
      examName: hierarchy.examName || 'Medical Board Exam',
      subjectName: hierarchy.subjectName || 'Clinical Science',
      topicName: hierarchy.topicName || 'High-Yield Topic',
      subtopicName: hierarchy.subtopicName,
    };

    for (let i = 0; i < existingAssets.length; i++) {
      const rawAsset = existingAssets[i];
      try {
        const resolved = await this.resolveSingleAsset(rawAsset, safeHierarchy, i);
        resolvedAssets.push(resolved);
      } catch (err) {
        console.error(`Asset resolution error for index ${i}:`, err);
        // Fallback to FAILED status safely without crashing
        resolvedAssets.push({
          ...rawAsset,
          sourceUrl: '',
          altText: sanitizeText(rawAsset.altText || 'Educational visual explanation'),
          caption: sanitizeText(rawAsset.caption || ''),
          positionMetadata: {
            ...(rawAsset.positionMetadata || { x: 0, y: 0, margin: 16 }),
            status: 'FAILED',
            error: 'Visual explanation unavailable',
          } as any,
          isSafeRendering: true,
        });
      }
    }

    // If no assets were defined in the lesson structure, create a default high-yield topic illustration requirement
    if (resolvedAssets.length === 0) {
      try {
        const defaultAsset = await this.resolveSingleAsset(
          {
            id: `asset_${lessonId}_0`,
            lessonId,
            assetType: 'IMAGE',
            sourceUrl: '',
            altText: `High-yield visual summary for ${safeHierarchy.topicName}`,
            caption: `Canonical visual explanation for ${safeHierarchy.topicName} in ${safeHierarchy.subjectName}`,
            positionMetadata: { x: 0, y: 0, width: 800, height: 600, aspectRatio: 1.33, margin: 16 },
            isSafeRendering: true,
          },
          safeHierarchy,
          0
        );
        resolvedAssets.push(defaultAsset);
      } catch (err) {
        console.error('Failed to create default topic asset:', err);
      }
    }

    // 5. Persist Resolved Assets back to tutor_assets table
    if (resolvedAssets.length > 0) {
      await supabase.from('tutor_assets').delete().eq('lesson_id', lessonId);
      const assetRows = resolvedAssets.map((asset) => ({
        lesson_id: lessonId,
        scene_id: asset.sceneId || null,
        asset_type: asset.assetType,
        source_url: asset.sourceUrl,
        alt_text: asset.altText,
        caption: asset.caption || null,
        position_metadata: asset.positionMetadata || { x: 0, y: 0, margin: 16 },
        is_safe_rendering: true,
      }));

      const { error: insertError } = await supabase.from('tutor_assets').insert(assetRows);
      if (insertError) {
        console.error('Error persisting tutor_assets:', insertError);
      }
    }

    // Release/mark concurrency job completed
    if (activeJob) {
      await GenerationJobManager.markCompleted(activeJob.id, { lessonId, assetCount: resolvedAssets.length }, supabase);
    }

    return {
      success: true,
      lessonId,
      assets: resolvedAssets,
      servedFromCache: false,
    };
  }

  /**
   * Resolves a single asset requirement using domain-independent retrieval logic
   */
  private static async resolveSingleAsset(
    rawAsset: TutorAsset,
    hierarchy: { examName: string; subjectName: string; topicName: string; subtopicName?: string | null },
    index: number
  ): Promise<TutorAsset> {
    const assetType = rawAsset.assetType || 'IMAGE';
    const altText = sanitizeText(rawAsset.altText || `${hierarchy.topicName} Visual Diagram`);
    const caption = sanitizeText(rawAsset.caption || `${hierarchy.topicName} — Core Concept Visualization`);

    // A. IMAGE / DIAGRAM
    if (assetType === 'IMAGE' || assetType === 'DIAGRAM') {
      const query = `${hierarchy.examName} ${hierarchy.subjectName} ${hierarchy.topicName} ${hierarchy.subtopicName || ''} ${caption} ${altText}`.trim();

      const candidates = EducationalMediaRetriever['resolveCuratedEducationalImages'](
        hierarchy.topicName,
        hierarchy.subjectName,
        caption,
        query
      );

      const bestCandidate = candidates && candidates.length > 0 ? candidates[0] : null;

      if (bestCandidate && bestCandidate.sourceUrl && isSafeMediaUrl(bestCandidate.sourceUrl)) {
        return {
          id: rawAsset.id || `asset_${rawAsset.lessonId}_${index}`,
          lessonId: rawAsset.lessonId,
          sceneId: rawAsset.sceneId,
          assetType,
          sourceUrl: bestCandidate.previewUrl || bestCandidate.sourceUrl,
          altText: sanitizeText(bestCandidate.title || altText),
          caption: sanitizeText(caption || bestCandidate.description || ''),
          positionMetadata: {
            ...(rawAsset.positionMetadata || { x: 0, y: 0, margin: 16 }),
            width: 800,
            height: 600,
            aspectRatio: 1.33,
            status: 'READY',
            sourcePlatform: bestCandidate.sourcePlatform || 'Open Academic Media',
            attribution: bestCandidate.attribution || 'Open Educational Resource',
            license: bestCandidate.license || 'Creative Commons CC-BY 4.0',
          } as any,
          isSafeRendering: true,
        };
      }
    }

    // B. TABLE
    if (assetType === 'TABLE') {
      return {
        id: rawAsset.id || `asset_${rawAsset.lessonId}_${index}`,
        lessonId: rawAsset.lessonId,
        sceneId: rawAsset.sceneId,
        assetType: 'TABLE',
        sourceUrl: rawAsset.sourceUrl || '',
        altText,
        caption,
        positionMetadata: {
          ...(rawAsset.positionMetadata || { x: 0, y: 0, margin: 16 }),
          status: 'READY',
          tableData: {
            title: caption || 'High-Yield Comparison Table',
            topic: hierarchy.topicName,
          },
        } as any,
        isSafeRendering: true,
      };
    }

    // C. FORMULA
    if (assetType === 'FORMULA') {
      return {
        id: rawAsset.id || `asset_${rawAsset.lessonId}_${index}`,
        lessonId: rawAsset.lessonId,
        sceneId: rawAsset.sceneId,
        assetType: 'FORMULA',
        sourceUrl: rawAsset.sourceUrl || '',
        altText,
        caption,
        positionMetadata: {
          ...(rawAsset.positionMetadata || { x: 0, y: 0, margin: 16 }),
          status: 'READY',
          formulaText: caption || altText,
        } as any,
        isSafeRendering: true,
      };
    }

    // D. Fallback if URL is provided and safe
    if (rawAsset.sourceUrl && isSafeMediaUrl(rawAsset.sourceUrl)) {
      return {
        ...rawAsset,
        altText,
        caption,
        positionMetadata: {
          ...(rawAsset.positionMetadata || { x: 0, y: 0, margin: 16 }),
          status: 'READY',
        } as any,
        isSafeRendering: true,
      };
    }

    return {
      ...rawAsset,
      sourceUrl: '',
      altText,
      caption,
      positionMetadata: {
        ...(rawAsset.positionMetadata || { x: 0, y: 0, margin: 16 }),
        status: 'FAILED',
        error: 'Visual explanation unavailable',
      } as any,
      isSafeRendering: true,
    };
  }
}
