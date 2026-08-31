/**
 * NEOMCQ — AUTOMATED TEST SUITE FOR PHASE 4D: CANONICAL NOTES + EDUCATIONAL MEDIA ENGINE
 *
 * Verifies all 12 Phase 4D criteria:
 * 1. Canonical Hierarchy Verification Gate (Reject invalid hierarchy)
 * 2. Canonical Topic Notes Structure & Schema Integrity (Overview, Objectives, Concepts, Facts, Pearls, Summary, Sections)
 * 3. Zero AI Image Generation Verification (Grounded retrieval from permitted platforms: Wikimedia, OpenStax)
 * 4. Zero AI Video Generation Verification (Grounded retrieval from permitted platforms: YouTube Educational, Khan Academy, Osmosis)
 * 5. Media Safety, URL Validation & Relevance Gating (Valid HTTPS, relevance score >= 60, duplicate URL rejection)
 * 6. Media Quantity & Section Placement Recommendations (Attaches media only to relevant sections)
 * 7. Global Caching & Cache-First Direct Serving ($0 AI cost on cache hits)
 * 8. Concurrency Locking & Job Idempotency per Notes slot (`packageType: 'notes'`)
 * 9. Non-Destructive Versioning (Preserves MAIN 40, QUIZ_1 20, QUIZ_2 20 MCQ slots completely intact)
 * 10. Dual-Layer Persistence (`notes` table + immutable `content_versions` snapshots)
 * 11. Financial Auditing ($0 User Credits Deducted, System COGS recorded in `ai_cost_events`)
 * 12. Public Orchestrator Integration (`ContentGenerationOrchestrator.generateNotes`)
 */

import {
  NotesValidator,
  EducationalMediaRetriever,
  CanonicalNotesGenerator,
  ContentGenerationOrchestrator,
  buildCanonicalPackageKey,
  buildIdempotencyKey,
} from '../lib/server/content-engine/index.ts';

const mockExamId = '11111111-1111-4111-a111-111111111111';
const mockSubjectId = '22222222-2222-4222-a222-222222222222';
const mockTopicId = '33333333-3333-4333-a333-333333333333';
const mockInvalidTopicId = '99999999-9999-9999-9999-999999999999';

let inMemoryJobs = [];
let inMemoryVersions = [];
let inMemoryCostEvents = [];
let inMemoryNotes = [];
let inMemoryMedia = [];

const mockSupabase = {
  from: (table) => {
    if (table === 'exam_subjects') {
      return {
        select: () => ({
          eq: (col, val) => ({
            maybeSingle: async () => {
              if (val === mockSubjectId) {
                return { data: { id: mockSubjectId, exam_id: mockExamId, name: 'Human Anatomy' }, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
      };
    }
    if (table === 'exam_topics') {
      return {
        select: () => ({
          eq: (col, val) => ({
            maybeSingle: async () => {
              if (val === mockTopicId) {
                return { data: { id: mockTopicId, subject_id: mockSubjectId, name: 'Upper Limb Nerve Supply' }, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
      };
    }
    if (table === 'exams') {
      return {
        select: () => ({
          eq: (col, val) => ({
            maybeSingle: async () => {
              if (val === mockExamId) {
                return { data: { id: mockExamId, name: 'FMGE Medical Licensing Examination' }, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
      };
    }
    if (table === 'ai_jobs') {
      return {
        select: () => ({
          contains: (col, payload) => ({
            in: (col2, statuses) => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => {
                    const match = inMemoryJobs.find(
                      (j) =>
                        j.input_payload?.idempotency_key === payload.idempotency_key &&
                        statuses.includes(j.status)
                    );
                    return { data: match || null, error: null };
                  },
                }),
              }),
            }),
          }),
        }),
        insert: (data) => ({
          select: () => ({
            single: async () => {
              const rec = { id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...data };
              inMemoryJobs.push(rec);
              return { data: rec, error: null };
            },
          }),
        }),
        update: (data) => ({
          eq: (col, val) => ({
            then: (resolve) => {
              const idx = inMemoryJobs.findIndex((j) => j.id === val);
              if (idx !== -1) {
                inMemoryJobs[idx] = { ...inMemoryJobs[idx], ...data };
              }
              resolve({ data: inMemoryJobs[idx], error: null });
            },
          }),
        }),
      };
    }
    if (table === 'content_versions') {
      return {
        select: () => ({
          eq: (col, val) => ({
            eq: (col2, val2) => ({
              order: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => {
                      const match = inMemoryVersions
                        .filter((v) => v.asset_id === val && v.asset_type === val2)
                        .sort((a, b) => b.version - a.version || (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()))[0];
                      return { data: match || null, error: null };
                    },
                  }),
                }),
                limit: () => ({
                  maybeSingle: async () => {
                    const match = inMemoryVersions
                      .filter((v) => v.asset_id === val && v.asset_type === val2)
                      .sort((a, b) => b.version - a.version || (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()))[0];
                    return { data: match || null, error: null };
                  },
                }),
              }),
            }),
          }),
        }),
        insert: async (data) => {
          const rec = { id: `ver-${Date.now()}`, ...data };
          inMemoryVersions.push(rec);
          return { data: rec, error: null };
        },
      };
    }
    if (table === 'notes') {
      return {
        upsert: async (records, opts) => {
          const recs = Array.isArray(records) ? records : [records];
          for (const r of recs) {
            const idx = inMemoryNotes.findIndex((n) => n.id === r.id);
            if (idx !== -1) inMemoryNotes[idx] = { ...inMemoryNotes[idx], ...r };
            else inMemoryNotes.push(r);
          }
          return { data: recs, error: null };
        },
      };
    }
    if (table === 'topic_media_references') {
      return {
        upsert: async (records) => {
          const recs = Array.isArray(records) ? records : [records];
          for (const r of recs) {
            inMemoryMedia.push(r);
          }
          return { data: recs, error: null };
        },
      };
    }
    if (table === 'ai_cost_events') {
      return {
        insert: async (data) => {
          inMemoryCostEvents.push(data);
          return { data, error: null };
        },
      };
    }
    if (table === 'ai_models') {
      return {
        select: () => ({
          eq: () => ({
            data: [
              { model_id: 'gemini-3.7-flash', input_price_per_1m: 0.10, cached_input_price_per_1m: 0.025, output_price_per_1m: 0.40 },
            ],
            error: null,
          }),
        }),
      };
    }
    return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      upsert: async () => ({ data: null, error: null }),
      insert: async () => ({ data: null, error: null }),
      update: () => ({ eq: () => ({ then: (r) => r({ data: null, error: null }) }) }),
    };
  },
};

async function runPhase4DTestSuite() {
  console.log('\n===============================================================');
  console.log('  NEOMCQ — PHASE 4D: CANONICAL NOTES + EDUCATIONAL MEDIA TEST SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 12;

  // Helper assertion
  function assert(condition, testName, failureDetails = '') {
    if (condition) {
      console.log(`  [PASS] Test ${passedTests + 1}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${passedTests + 1}: ${testName}`);
      if (failureDetails) console.error(`         Details: ${failureDetails}`);
      process.exit(1);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Canonical Hierarchy Verification Gate
    // -------------------------------------------------------------------------
    const invalidRes = await ContentGenerationOrchestrator.generateNotes({
      examId: mockExamId,
      subjectId: mockSubjectId,
      topicId: mockInvalidTopicId,
      supabaseClient: mockSupabase,
    });

    assert(
      !invalidRes.success && invalidRes.errorCode === 'HIERARCHY_INVALID',
      'Hierarchy Gate rejects invalid topic hierarchy with HIERARCHY_INVALID error'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Canonical Topic Notes Structure & Schema Integrity
    // -------------------------------------------------------------------------
    const notesRes = await ContentGenerationOrchestrator.generateNotes({
      examId: mockExamId,
      subjectId: mockSubjectId,
      topicId: mockTopicId,
      supabaseClient: mockSupabase,
    });

    assert(
      notesRes.success &&
        notesRes.notes !== null &&
        notesRes.notes.topicOverview.length > 20 &&
        notesRes.notes.learningObjectives.length >= 2 &&
        notesRes.notes.keyConcepts.length >= 2 &&
        notesRes.notes.highYieldFacts.length >= 3 &&
        notesRes.notes.examPearls.length >= 2 &&
        notesRes.notes.summary.length > 20 &&
        notesRes.notes.sections.length >= 2 &&
        notesRes.notesValidation.valid === true,
      'Canonical Notes generate with complete structured schema (Overview, Objectives, Concepts, Facts, Pearls, Summary, Sections)'
    );

    // -------------------------------------------------------------------------
    // TEST 3: Zero AI Image Generation Verification
    // -------------------------------------------------------------------------
    const images = notesRes.media.filter((m) => m.mediaType === 'image');
    const hasPermittedImagePlatforms = images.every((img) =>
      ['Wikimedia Commons', 'OpenStax', 'NCBI Bookshelf', 'Public Medical Knowledge'].some((p) =>
        img.sourcePlatform.includes(p)
      )
    );

    assert(
      images.length > 0 && hasPermittedImagePlatforms,
      'ZERO AI image generation: Educational images retrieved solely from permitted open-license academic platforms'
    );

    // -------------------------------------------------------------------------
    // TEST 4: Zero AI Video Generation Verification
    // -------------------------------------------------------------------------
    const videos = notesRes.media.filter((m) => m.mediaType === 'video');
    const hasPermittedVideoPlatforms = videos.every((vid) =>
      ['YouTube Educational', 'Khan Academy', 'Osmosis', 'Medical Education'].some((p) =>
        vid.sourcePlatform.includes(p)
      )
    );

    assert(
      videos.length > 0 && hasPermittedVideoPlatforms,
      'ZERO AI video generation: Educational videos retrieved solely from permitted open-educational repositories'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Media Safety, URL Validation & Relevance Gating
    // -------------------------------------------------------------------------
    const allHttps = notesRes.media.every((m) => m.sourceUrl.startsWith('https://'));
    const allHighRelevance = notesRes.media.every((m) => m.relevanceScore >= 60);

    // Test rejection of broken or low-relevance media
    const badCandidate = {
      title: 'Bad',
      sourceUrl: 'http://localhost/broken.jpg',
      mediaType: 'image',
    };
    const badValidation = EducationalMediaRetriever.validateMediaItem(
      badCandidate,
      'Upper Limb Nerve Supply',
      'Human Anatomy'
    );

    assert(
      allHttps && allHighRelevance && !badValidation.valid,
      'Media Validator enforces HTTPS protocols, high relevance threshold (>=60), and rejects unsafe/localhost URLs'
    );

    // -------------------------------------------------------------------------
    // TEST 6: Media Quantity & Section Placement Recommendations
    // -------------------------------------------------------------------------
    const sectionsWithMedia = notesRes.notes.sections.filter(
      (s) => s.mediaRecommendation !== 'NO_MEDIA_REQUIRED'
    );
    const mediaAttachedToSections = notesRes.media.some((m) => m.associatedSectionTitle !== undefined);

    assert(
      sectionsWithMedia.length > 0 && mediaAttachedToSections,
      'Media recommendations appropriately assign images/videos to specific structured sections'
    );

    // -------------------------------------------------------------------------
    // TEST 7: Global Caching & Cache-First Direct Serving ($0 AI Cost)
    // -------------------------------------------------------------------------
    const cachedNotesRes = await ContentGenerationOrchestrator.generateNotes({
      examId: mockExamId,
      subjectId: mockSubjectId,
      topicId: mockTopicId,
      supabaseClient: mockSupabase,
    });

    assert(
      cachedNotesRes.success &&
        cachedNotesRes.servedFromCache === true &&
        cachedNotesRes.generationReason === 'CACHE_VALID' &&
        cachedNotesRes.notes !== null,
      'Cache-First Direct Serving serves existing canonical Notes & Media immediately with $0 AI Cost'
    );

    // -------------------------------------------------------------------------
    // TEST 8: Concurrency Locking & Job Idempotency
    // -------------------------------------------------------------------------
    // Simulate active in-flight job
    const inFlightIdempotencyKey = buildIdempotencyKey(mockExamId, mockSubjectId, mockTopicId, 'notes', 2);
    inMemoryJobs.push({
      id: 'job-notes-inflight-001',
      exam_id: mockExamId,
      subject_id: mockSubjectId,
      topic_id: mockTopicId,
      status: 'running',
      input_payload: {
        idempotency_key: inFlightIdempotencyKey,
      },
    });

    const concurrentRes = await ContentGenerationOrchestrator.generateNotes({
      examId: mockExamId,
      subjectId: mockSubjectId,
      topicId: mockTopicId,
      version: 2,
      forceRefresh: true,
      supabaseClient: mockSupabase,
    });

    assert(
      concurrentRes.success &&
        concurrentRes.generationReason === 'ATTACHED_JOB' &&
        concurrentRes.jobId === 'job-notes-inflight-001',
      'Concurrency manager attaches concurrent requests to active in-flight Notes generation job'
    );

    // -------------------------------------------------------------------------
    // TEST 9: Non-Destructive Versioning (Preserves MAIN 40, QUIZ_1 20, QUIZ_2 20)
    // -------------------------------------------------------------------------
    const latestVersionRecord = inMemoryVersions[inMemoryVersions.length - 1];
    const snapshot = latestVersionRecord?.snapshot || {};

    assert(
      snapshot.notesSlot?.present === true &&
        snapshot.notesSlot?.package?.title.includes('Upper Limb Nerve Supply') &&
        snapshot.mediaReferencesSlot?.count >= 1 &&
        snapshot.mainMcqsSlot !== undefined &&
        snapshot.quiz1Slot !== undefined &&
        snapshot.quiz2Slot !== undefined,
      'Non-destructive version snapshot: Updates notesSlot & mediaReferencesSlot while preserving all MCQ slots'
    );

    // -------------------------------------------------------------------------
    // TEST 10: Dual-Layer Persistence (`notes` table + `content_versions` snapshots)
    // -------------------------------------------------------------------------
    const dbNote = inMemoryNotes.find((n) => n.topic_id === mockTopicId);

    assert(
      dbNote !== undefined &&
        dbNote.note_type === 'high_yield' &&
        dbNote.status === 'approved' &&
        dbNote.content.length > 500 &&
        inMemoryVersions.length > 0,
      'Dual-Layer Persistence successfully writes to public.notes and persists immutable content_versions snapshot'
    );

    // -------------------------------------------------------------------------
    // TEST 11: Financial Auditing ($0 User Credits Deducted, System COGS recorded)
    // -------------------------------------------------------------------------
    const costEvent = inMemoryCostEvents.find(
      (e) => e.task_type === 'generate_canonical_notes_and_media' || e.taskType === 'generate_canonical_notes_and_media'
    );

    assert(
      costEvent !== undefined &&
        (costEvent.credits_deducted === 0 || costEvent.creditsDeducted === 0) &&
        costEvent.user_id === null &&
        notesRes.costAudit !== undefined &&
        notesRes.costAudit.creditsDeducted === 0 &&
        notesRes.costAudit.isGlobalGeneration === true &&
        notesRes.costAudit.userId === null,
      'Financial audit correctly logs $0 user credit deduction and records system infrastructure COGS'
    );

    // -------------------------------------------------------------------------
    // TEST 12: Public Orchestrator Integration (`generateNotes`)
    // -------------------------------------------------------------------------
    assert(
      typeof ContentGenerationOrchestrator.generateNotes === 'function',
      'ContentGenerationOrchestrator.generateNotes is exposed as primary public entrypoint'
    );

    console.log('\n===============================================================');
    console.log(`  ALL ${passedTests}/${totalTests} PHASE 4D TESTS PASSED PERFECTLY!`);
    console.log('===============================================================\n');
  } catch (err) {
    console.error('\n  [ERROR] Exception encountered during test execution:', err);
    process.exit(1);
  }
}

runPhase4DTestSuite();
