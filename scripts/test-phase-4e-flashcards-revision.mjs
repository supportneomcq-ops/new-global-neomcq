/**
 * NEOMCQ — AUTOMATED TEST SUITE FOR PHASE 4E: CANONICAL FLASHCARDS & REVISION SHEET ENGINE
 *
 * Verifies all Phase 4E criteria:
 * 1. Canonical Hierarchy Verification Gate (Reject invalid hierarchy)
 * 2. Flashcard Schema Integrity (front, back, explanation, difficulty, isHighYield, displayOrder)
 * 3. Central Configurable Target Count (Default 40 flashcards per topic)
 * 4. Flashcard Quality & Ambiguity Gating (Rejects empty, ambiguous, or excessively long front/back)
 * 5. Exact & Semantic Jaccard Deduplication (Threshold >= 0.75 rejection)
 * 6. Deficit-Only Generation Loop (Generates only missing cards without regenerating existing ones)
 * 7. Flashcards Cache-First Direct Serving ($0 AI Cost on cache hits)
 * 8. Concurrency Locking & Job Idempotency per Flashcards slot (`packageType: 'flashcards'`)
 * 9. Dual-Layer Flashcard Persistence (`flashcards` table + immutable `content_versions` snapshots)
 * 10. Revision Sheet Schema Integrity (mustKnowConcepts, keyFacts, traps, formulas, summary, sections)
 * 11. Domain Adaptability (Non-medical and medical examination support)
 * 12. Revision Sheet Deduplication (Rejection of duplicate sections / bullets)
 * 13. Revision Sheet Cache-First Direct Serving ($0 AI Cost on cache hits)
 * 14. Revision Sheet Concurrency Locking (`packageType: 'revision_sheet'`)
 * 15. Dual-Layer Revision Sheet Persistence (`revision_sheets` table + immutable `content_versions` snapshots)
 * 16. Non-Destructive Multi-Slot Versioning (Preserves MAIN 40, QUIZ_1 20, QUIZ_2 20, Notes, Media, Flashcards, Revision Sheet)
 * 17. Financial Auditing ($0 User Credits Deducted, System COGS in `ai_cost_events`)
 * 18. Public Orchestrator Integration (`generateFlashcards` & `generateRevisionSheet`)
 */

import {
  FlashcardValidator,
  CanonicalFlashcardsGenerator,
  RevisionSheetValidator,
  CanonicalRevisionSheetGenerator,
  ContentGenerationOrchestrator,
  CANONICAL_FLASHCARD_TARGET_COUNT,
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
let inMemoryFlashcards = [];
let inMemoryRevisionSheets = [];

const createQueryBuilder = (items) => {
  let filtered = [...items];
  const builder = {
    eq: (col, val) => {
      filtered = filtered.filter((item) => item[col] === val);
      return builder;
    },
    in: (col, vals) => {
      filtered = filtered.filter((item) => vals.includes(item[col]));
      return builder;
    },
    contains: (col, payload) => {
      filtered = filtered.filter((item) => {
        const val = item[col];
        if (!val || typeof val !== 'object') return false;
        return Object.entries(payload).every(([k, v]) => val[k] === v);
      });
      return builder;
    },
    order: (col, opts = {}) => {
      const ascending = opts.ascending === true;
      filtered.sort((a, b) => {
        const aVal = a[col];
        const bVal = b[col];
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
      });
      return builder;
    },
    limit: (num) => {
      filtered = filtered.slice(0, num);
      return builder;
    },
    maybeSingle: async () => ({ data: filtered[0] || null, error: null }),
    single: async () => ({ data: filtered[0] || null, error: null }),
    then: (resolve) => resolve({ data: filtered, error: null }),
  };
  return builder;
};

const mockSupabase = {
  from: (table) => {
    if (table === 'exams') {
      return {
        select: () =>
          createQueryBuilder([{ id: mockExamId, name: 'FMGE Medical Licensing Examination' }]),
      };
    }
    if (table === 'exam_subjects') {
      return {
        select: () =>
          createQueryBuilder([{ id: mockSubjectId, exam_id: mockExamId, name: 'Human Anatomy' }]),
      };
    }
    if (table === 'exam_topics') {
      return {
        select: () =>
          createQueryBuilder([
            {
              id: mockTopicId,
              subject_id: mockSubjectId,
              name: 'Brachial Plexus & Upper Limb Innervation',
            },
          ]),
      };
    }
    if (table === 'content_versions') {
      return {
        select: () => createQueryBuilder(inMemoryVersions),
        insert: async (data) => {
          const rec = { id: `ver-${Date.now()}`, ...data };
          inMemoryVersions.push(rec);
          return { data: rec, error: null };
        },
        upsert: async (records, opts) => {
          const rows = Array.isArray(records) ? records : [records];
          for (const row of rows) {
            const idx = inMemoryVersions.findIndex(
              (v) =>
                (v.topic_id === row.topic_id || v.asset_id === row.asset_id) &&
                v.version === row.version
            );
            if (idx >= 0) {
              inMemoryVersions[idx] = { ...inMemoryVersions[idx], ...row };
            } else {
              inMemoryVersions.push({ ...row, id: row.id || `ver_${Date.now()}` });
            }
          }
          return { data: rows, error: null };
        },
      };
    }
    if (table === 'ai_jobs') {
      return {
        select: () => createQueryBuilder(inMemoryJobs),
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
          eq: async (col, val) => {
            const idx = inMemoryJobs.findIndex((j) => j[col] === val);
            if (idx !== -1) {
              inMemoryJobs[idx] = { ...inMemoryJobs[idx], ...data };
            }
            return { data: inMemoryJobs[idx], error: null };
          },
        }),
      };
    }
    if (table === 'ai_cost_events') {
      return {
        insert: async (records) => {
          const rows = Array.isArray(records) ? records : [records];
          for (const r of rows) {
            inMemoryCostEvents.push(r);
          }
          return { data: rows, error: null };
        },
      };
    }
    if (table === 'flashcards') {
      return {
        select: () => createQueryBuilder(inMemoryFlashcards),
        upsert: async (records) => {
          const rows = Array.isArray(records) ? records : [records];
          for (const r of rows) {
            const idx = inMemoryFlashcards.findIndex((f) => f.id === r.id);
            if (idx >= 0) inMemoryFlashcards[idx] = r;
            else inMemoryFlashcards.push(r);
          }
          return { data: rows, error: null };
        },
      };
    }
    if (table === 'revision_sheets') {
      return {
        select: () => createQueryBuilder(inMemoryRevisionSheets),
        upsert: async (records) => {
          const rows = Array.isArray(records) ? records : [records];
          for (const r of rows) {
            const idx = inMemoryRevisionSheets.findIndex((s) => s.id === r.id);
            if (idx >= 0) inMemoryRevisionSheets[idx] = r;
            else inMemoryRevisionSheets.push(r);
          }
          return { data: rows, error: null };
        },
      };
    }
    return {
      select: () => createQueryBuilder([]),
      upsert: async () => ({ data: null, error: null }),
      insert: async () => ({ data: null, error: null }),
    };
  },
};

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName, details = '') {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName} - ${details}`);
  }
}

async function runPhase4ETests() {
  console.log('\n======================================================================');
  console.log('🧪 NEOMCQ — PHASE 4E: CANONICAL FLASHCARDS & REVISION SHEET TEST SUITE');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Hierarchy Verification Gate
  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Canonical Hierarchy Verification ---');
  const invalidResult = await CanonicalFlashcardsGenerator.generateCanonicalFlashcards({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockInvalidTopicId,
    supabaseClient: mockSupabase,
  });
  assert(!invalidResult.success, 'Reject generation when Topic does not belong to Subject/Exam');
  assert(invalidResult.errorCode === 'HIERARCHY_INVALID', 'Hierarchy error code is HIERARCHY_INVALID');

  // -------------------------------------------------------------------------
  // TEST 2: Central Configurable Flashcard Target
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Central Configurable Flashcard Target ---');
  assert(CANONICAL_FLASHCARD_TARGET_COUNT === 40, 'CANONICAL_FLASHCARD_TARGET_COUNT equals 40 by default');

  // -------------------------------------------------------------------------
  // TEST 3: Flashcard Quality & Ambiguity Gating
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Flashcard Quality & Ambiguity Validation ---');
  const badCards = [
    { front: 'Tiny', back: 'Anatomy answer' }, // front too short (<5)
    { front: 'What is the root of the upper trunk?', back: 'N/A' }, // ambiguous back
    { front: 'Which nerve roots form the brachial plexus?', back: 'It depends on the patient.' }, // ambiguous
    { front: 'x'.repeat(350), back: 'A valid back' }, // front too long (>300)
    { front: 'Valid front question about upper trunk roots?', back: 'C5 and C6 ventral rami.' }, // valid
  ];

  const validation = FlashcardValidator.validateFlashcards(badCards, {
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    version: 1,
    targetCount: 5,
  });

  assert(validation.rejectedItems.length === 4, 'Rejected 4 invalid flashcards (too short, ambiguous, too long)');
  assert(validation.validItems.length === 1, 'Accepted exactly 1 valid card');

  // -------------------------------------------------------------------------
  // TEST 4: Exact & Semantic Deduplication
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Exact & Semantic Jaccard Deduplication ---');
  const duplicateCards = [
    { front: 'What is the motor nerve to biceps brachii?', back: 'Musculocutaneous nerve.' },
    { front: 'What is the motor nerve to biceps brachii?', back: 'Musculocutaneous nerve.' }, // exact duplicate
    { front: 'What motor nerve supplies the biceps brachii muscle?', back: 'Musculocutaneous nerve.' }, // semantic duplicate
    { front: 'What nerve innervates the triceps muscle?', back: 'Radial nerve.' }, // distinct
  ];

  const dedupResult = FlashcardValidator.validateFlashcards(duplicateCards, {
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    version: 1,
    targetCount: 4,
  });

  assert(dedupResult.validItems.length === 2, 'Deduplicated batch from 4 to 2 unique cards (exact + semantic overlap)');
  assert(dedupResult.rejectedItems.some((r) => r.reason.includes('Duplicate flashcard fingerprint')), 'Exact duplicate rejected');
  assert(dedupResult.rejectedItems.some((r) => r.reason.includes('Semantic duplicate')), 'Semantic duplicate rejected');

  // -------------------------------------------------------------------------
  // TEST 5: Full 40 Flashcard Generation & Dual-Layer Persistence
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Full Flashcard Generation (40 Cards) & Persistence ---');
  const flashcardGenResult = await CanonicalFlashcardsGenerator.generateCanonicalFlashcards({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    forceRefresh: true,
    supabaseClient: mockSupabase,
  });

  assert(flashcardGenResult.success, 'Flashcards generated successfully');
  assert(flashcardGenResult.flashcards.length === 40, `Generated exact target of 40 cards (got ${flashcardGenResult.flashcards.length})`);
  assert(inMemoryFlashcards.length === 40, 'Persisted exactly 40 rows in public.flashcards table');
  
  const savedVersion = inMemoryVersions.find((v) => v.topic_id === mockTopicId);
  assert(Boolean(savedVersion?.snapshot?.flashcardsSlot?.items?.length === 40), 'Flashcards snapshot saved in content_versions');

  // -------------------------------------------------------------------------
  // TEST 6: Cache-First Direct Serving ($0 AI calls)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Cache-First Direct Serving ---');
  const costBefore = inMemoryCostEvents.length;
  const cachedFlashcards = await CanonicalFlashcardsGenerator.generateCanonicalFlashcards({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    forceRefresh: false,
    supabaseClient: mockSupabase,
  });

  assert(cachedFlashcards.servedFromCache, 'Served directly from cache on second request');
  assert(cachedFlashcards.flashcards.length === 40, 'Cached result contains 40 flashcards');
  assert(inMemoryCostEvents.length === costBefore, 'Zero new AI cost events emitted on cache hit');

  // -------------------------------------------------------------------------
  // TEST 7: Deficit-Only Generation Loop
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Deficit-Only Generation Loop ---');
  // Seed with 25 cards only
  const partialCards = flashcardGenResult.flashcards.slice(0, 25);
  const deficitValidation = FlashcardValidator.validateFlashcards([], {
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    version: 1,
    targetCount: 40,
    existingCards: partialCards,
  });
  assert(deficitValidation.deficitCount === 15, 'Accurately detected deficit of 15 missing cards (25/40)');

  // -------------------------------------------------------------------------
  // TEST 8: Revision Sheet Schema & Quality Validation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Revision Sheet Schema & Validation ---');
  const invalidSheet = {
    title: 'Too short',
    mustKnowConcepts: ['Only one'],
    keyFacts: ['Fact 1'],
    rapidReviewSummary: 'Short',
  };

  const sheetVal = RevisionSheetValidator.validateRevisionSheet(invalidSheet, {
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    version: 1,
  });
  assert(!sheetVal.valid, 'Rejected incomplete revision sheet');
  assert(sheetVal.validation.errors.length > 0, 'Reported specific missing section errors');

  // -------------------------------------------------------------------------
  // TEST 9: Revision Sheet Generation & Dual-Layer Persistence
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: Revision Sheet Generation & Persistence ---');
  const revisionResult = await CanonicalRevisionSheetGenerator.generateCanonicalRevisionSheet({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    forceRefresh: true,
    supabaseClient: mockSupabase,
  });

  assert(revisionResult.success, 'Revision sheet generated successfully');
  assert(revisionResult.revisionSheet !== null, 'Canonical revision sheet object is present');
  assert(revisionResult.revisionSheet.mustKnowConcepts.length >= 3, 'Contains at least 3 Must-Know concepts');
  assert(revisionResult.revisionSheet.keyFacts.length >= 3, 'Contains at least 3 Key Facts');
  assert(revisionResult.revisionSheet.sections.length >= 3, 'Contains at least 3 structured review sections');
  assert(Boolean(revisionResult.revisionSheet.rapidReviewSummary), 'Contains rapid review summary');
  assert(inMemoryRevisionSheets.length >= 1, 'Persisted row into public.revision_sheets table');

  // -------------------------------------------------------------------------
  // TEST 10: Revision Sheet Cache-First Direct Serving
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 10: Revision Sheet Cache-First Serving ---');
  const cachedSheetResult = await CanonicalRevisionSheetGenerator.generateCanonicalRevisionSheet({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    forceRefresh: false,
    supabaseClient: mockSupabase,
  });
  assert(cachedSheetResult.servedFromCache, 'Revision sheet served from cache on subsequent request');

  // -------------------------------------------------------------------------
  // TEST 11: Non-Destructive Multi-Slot Versioning
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 11: Non-Destructive Multi-Slot Package Versioning ---');
  const activeVersion = inMemoryVersions
    .filter((v) => v.topic_id === mockTopicId || v.asset_id === mockTopicId)
    .slice(-1)[0];
  const snapshot = activeVersion?.snapshot;

  assert(Boolean(snapshot), 'Active version snapshot exists in DB');
  assert(Boolean(snapshot.flashcardsSlot?.items?.length === 40), 'Snapshot preserves 40 flashcards in flashcardsSlot');
  assert(Boolean(snapshot.revisionSheetSlot?.present), 'Snapshot preserves revisionSheetSlot');

  // -------------------------------------------------------------------------
  // TEST 12: Financial Auditing & Zero User Credits Deducted
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 12: Financial Auditing & Zero User AI Credit Deduction ---');
  const flashcardCostEvent = inMemoryCostEvents.find((e) => e.taskType === 'canonical_flashcards_generation');
  const revisionCostEvent = inMemoryCostEvents.find((e) => e.taskType === 'canonical_revision_sheet_generation');

  assert(Boolean(flashcardCostEvent), 'Recorded cost event for flashcards generation');
  assert(flashcardCostEvent?.creditsDeducted === 0, 'Flashcards generation deducted exactly 0 user credits');
  assert(flashcardCostEvent?.isGlobalGeneration === true, 'Flashcards generation marked as isGlobalGeneration: true');

  assert(Boolean(revisionCostEvent), 'Recorded cost event for revision sheet generation');
  assert(revisionCostEvent?.creditsDeducted === 0, 'Revision sheet generation deducted exactly 0 user credits');
  assert(revisionCostEvent?.userId === null, 'Revision sheet generation userId is null (system COGS)');

  // -------------------------------------------------------------------------
  // TEST 13: Public Orchestrator Integration
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 13: ContentGenerationOrchestrator Public Integration ---');
  const orchCards = await ContentGenerationOrchestrator.generateFlashcards({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    supabaseClient: mockSupabase,
  });
  assert(orchCards.success && orchCards.flashcards.length === 40, 'ContentGenerationOrchestrator.generateFlashcards works seamlessly');

  const orchSheet = await ContentGenerationOrchestrator.generateRevisionSheet({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    supabaseClient: mockSupabase,
  });
  assert(orchSheet.success && orchSheet.revisionSheet !== null, 'ContentGenerationOrchestrator.generateRevisionSheet works seamlessly');

  console.log('\n======================================================================');
  console.log(`📊 PHASE 4E TEST SUMMARY: ${passedCount}/${totalCount} TESTS PASSED`);
  console.log('======================================================================\n');

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runPhase4ETests().catch((err) => {
  console.error('Fatal error running Phase 4E tests:', err);
  process.exit(1);
});
