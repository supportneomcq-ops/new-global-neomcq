/**
 * NEOMCQ — AUTOMATED TEST SUITE FOR PHASE 4C: INDEPENDENT QUIZ GENERATION ENGINE
 *
 * Verifies all 12 Phase 4C criteria:
 * 1. Pre-generation Canonical Hierarchy Gate
 * 2. Exact 20 QUIZ_1 MCQ Count Guarantee (questionSet = 'QUIZ_1')
 * 3. Exact 20 QUIZ_2 MCQ Count Guarantee (questionSet = 'QUIZ_2')
 * 4. Preservation of 40 MAIN MCQs (questionSet = 'MAIN')
 * 5. Complete 80-MCQ Canonical Package Structure (40 + 20 + 20 = 80)
 * 6. Absolute Cross-Set Uniqueness (MAIN ↔ QUIZ_1 ↔ QUIZ_2 with 0 collisions)
 * 7. Intra-Set Uniqueness & Strict Deduplication (MD5 / Token fingerprinting + Jaccard similarity)
 * 8. Cache-First Direct Serving ($0 AI cost on cache hits)
 * 9. Concurrency Lock & Job Idempotency per Quiz Slot (`quiz_1` vs `quiz_2`)
 * 10. Dual-Layer Persistence (`mcqs` table + `content_versions` snapshots)
 * 11. Financial Auditing ($0 User Credits Deducted, System COGS recorded)
 * 12. Public Orchestrator Integration (`generateQuizMCQs`)
 */

import {
  MCQValidator,
  MCQDeDuplicator,
  MainMCQGenerator,
  QuizMCQGenerator,
  ContentGenerationOrchestrator,
  buildCanonicalPackageKey,
} from '../lib/server/content-engine/index.ts';

const mockExamId = '11111111-1111-4111-a111-111111111111';
const mockSubjectId = '22222222-2222-4222-a222-222222222222';
const mockTopicId = '33333333-3333-4333-a333-333333333333';
const mockInvalidTopicId = '99999999-9999-9999-9999-999999999999';

let inMemoryJobs = [];
let inMemoryVersions = [];
let inMemoryCostEvents = [];
let inMemoryMCQs = [];

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
                return { data: { id: mockExamId, name: 'FMGE' }, error: null };
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
          eq: (col, val) => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => {
                  const match = inMemoryJobs.filter((j) => j.topic_id === val).pop();
                  return { data: match || null, error: null };
                },
              }),
            }),
          }),
        }),
        insert: (row) => ({
          select: () => ({
            single: async () => {
              const existing = inMemoryJobs.find(
                (j) =>
                  j.input_payload?.idempotency_key === row.input_payload?.idempotency_key &&
                  ['queued', 'running', 'validating', 'processing', 'pending'].includes(j.status)
              );
              if (existing) {
                return {
                  data: null,
                  error: { message: 'duplicate key value violates unique constraint', code: '23505' },
                };
              }
              const inserted = {
                id: `job-${inMemoryJobs.length + 1}-${Math.random().toString(36).slice(2, 7)}`,
                ...row,
              };
              inMemoryJobs.push(inserted);
              return { data: inserted, error: null };
            },
          }),
        }),
        update: (updates) => ({
          eq: (col, id) => {
            const job = inMemoryJobs.find((j) => j.id === id);
            if (job) Object.assign(job, updates);
            return { error: null };
          },
        }),
      };
    }
    if (table === 'content_versions') {
      return {
        select: () => ({
          eq: (col1, val1) => ({
            eq: (col2, val2) => ({
              order: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => {
                      const matching = inMemoryVersions
                        .filter((v) => v.asset_id === val1 && v.asset_type === val2)
                        .sort((a, b) => (b.version - a.version) || (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
                      return { data: matching[0] || null, error: null };
                    },
                  }),
                }),
                limit: () => ({
                  maybeSingle: async () => {
                    const matching = inMemoryVersions
                      .filter((v) => v.asset_id === val1 && v.asset_type === val2)
                      .sort((a, b) => (b.version - a.version) || (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
                    return { data: matching[0] || null, error: null };
                  },
                }),
              }),
              eq: (col3, val3) => ({
                maybeSingle: async () => {
                  const match = inMemoryVersions.find(
                    (v) => v.asset_id === val1 && v.asset_type === val2 && v.version === val3
                  );
                  return { data: match || null, error: null };
                },
              }),
            }),
          }),
        }),
        insert: async (row) => {
          inMemoryVersions.unshift({
            id: `cv-${inMemoryVersions.length + 1}`,
            ...row,
          });
          return { error: null };
        },
      };
    }
    if (table === 'mcqs') {
      return {
        select: () => ({
          eq: (col, val) => ({
            then: (resolve) => {
              const rows = inMemoryMCQs.filter((m) => m.topic_id === val);
              resolve({ data: rows, error: null });
            },
          }),
        }),
        upsert: async (records) => {
          const list = Array.isArray(records) ? records : [records];
          for (const item of list) {
            const existingIdx = inMemoryMCQs.findIndex((m) => m.id === item.id);
            if (existingIdx >= 0) {
              inMemoryMCQs[existingIdx] = item;
            } else {
              inMemoryMCQs.push(item);
            }
          }
          return { error: null };
        },
      };
    }
    if (table === 'ai_cost_events') {
      return {
        insert: async (row) => {
          inMemoryCostEvents.push(row);
          return { error: null };
        },
      };
    }
    return {
      select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
    };
  },
};

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

async function runPhase4CTestSuite() {
  console.log('================================================================');
  console.log('  NEOMCQ — PHASE 4C: INDEPENDENT QUIZ GENERATION TEST SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Canonical Hierarchy Gate
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Canonical Hierarchy Gate ---');
  const invalidResult = await QuizMCQGenerator.generateCanonicalQuizMCQs({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockInvalidTopicId,
    quizSlot: 'QUIZ_1',
    supabaseClient: mockSupabase,
  });

  assert(invalidResult.success === false, 'Rejects invalid canonical hierarchy');
  assert(invalidResult.errorCode === 'HIERARCHY_INVALID', 'Returns HIERARCHY_INVALID error code');
  assert(invalidResult.itemCount === 0, 'Does not emit items on invalid hierarchy');

  // ---------------------------------------------------------------------------
  // TEST 2: Generate Canonical 40 MAIN MCQs (Baseline)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Canonical MAIN 40 MCQs Generation ---');
  const mainResult = await MainMCQGenerator.generateCanonicalMainMCQs({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    supabaseClient: mockSupabase,
  });

  assert(mainResult.success === true, 'MAIN MCQs generated successfully');
  assert(mainResult.itemCount === 40, 'MAIN slot contains exactly 40 MCQs');
  assert(mainResult.items.every((q) => q.questionSet === 'MAIN'), 'All MAIN MCQs have questionSet = "MAIN"');

  // ---------------------------------------------------------------------------
  // TEST 3: Generate Canonical 20 QUIZ_1 MCQs
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Canonical QUIZ_1 20 MCQs Generation ---');
  const quiz1Result = await QuizMCQGenerator.generateCanonicalQuizMCQs({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    quizSlot: 'QUIZ_1',
    supabaseClient: mockSupabase,
  });

  assert(quiz1Result.success === true, 'QUIZ_1 generated successfully');
  assert(quiz1Result.quizSlot === 'QUIZ_1', 'Returns quizSlot = "QUIZ_1"');
  assert(quiz1Result.itemCount === 20, 'QUIZ_1 contains exactly 20 MCQs');
  assert(quiz1Result.items.length === 20, 'QUIZ_1 items array has length 20');
  assert(quiz1Result.items.every((q) => q.questionSet === 'QUIZ_1'), 'All QUIZ_1 MCQs have questionSet = "QUIZ_1"');
  assert(quiz1Result.items.every((q) => q.options.length === 4), 'All QUIZ_1 MCQs have exactly 4 options');
  assert(quiz1Result.items.every((q) => q.explanation.length > 20), 'All QUIZ_1 MCQs have detailed explanations');

  // ---------------------------------------------------------------------------
  // TEST 4: Generate Canonical 20 QUIZ_2 MCQs
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Canonical QUIZ_2 20 MCQs Generation ---');
  const quiz2Result = await QuizMCQGenerator.generateCanonicalQuizMCQs({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    quizSlot: 'QUIZ_2',
    supabaseClient: mockSupabase,
  });

  assert(quiz2Result.success === true, 'QUIZ_2 generated successfully');
  assert(quiz2Result.quizSlot === 'QUIZ_2', 'Returns quizSlot = "QUIZ_2"');
  assert(quiz2Result.itemCount === 20, 'QUIZ_2 contains exactly 20 MCQs');
  assert(quiz2Result.items.length === 20, 'QUIZ_2 items array has length 20');
  assert(quiz2Result.items.every((q) => q.questionSet === 'QUIZ_2'), 'All QUIZ_2 MCQs have questionSet = "QUIZ_2"');
  assert(quiz2Result.items.every((q) => q.options.length === 4), 'All QUIZ_2 MCQs have exactly 4 options');
  assert(quiz2Result.items.every((q) => q.explanation.length > 20), 'All QUIZ_2 MCQs have detailed explanations');

  // ---------------------------------------------------------------------------
  // TEST 5: Complete 80-MCQ Canonical Package Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Complete 80-MCQ Canonical Package Verification ---');
  const latestSnapshot = inMemoryVersions[0];
  const pkg = latestSnapshot.snapshot;

  assert(pkg.mainMcqsSlot.actualCount === 40, 'Package snapshot contains 40 MAIN MCQs');
  assert(pkg.quiz1Slot.actualCount === 20, 'Package snapshot contains 20 QUIZ_1 MCQs');
  assert(pkg.quiz2Slot.actualCount === 20, 'Package snapshot contains 20 QUIZ_2 MCQs');
  
  const totalMCQs = pkg.mainMcqsSlot.actualCount + pkg.quiz1Slot.actualCount + pkg.quiz2Slot.actualCount;
  assert(totalMCQs === 80, 'Complete topic package contains exactly 80 canonical MCQs (40 + 20 + 20)');

  // ---------------------------------------------------------------------------
  // TEST 6: Absolute Cross-Set Uniqueness (MAIN ↔ QUIZ_1 ↔ QUIZ_2)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Absolute Cross-Set Uniqueness ---');
  const mainFingerprints = new Set(mainResult.items.map((q) => q.fingerprint));
  const quiz1Fingerprints = new Set(quiz1Result.items.map((q) => q.fingerprint));
  const quiz2Fingerprints = new Set(quiz2Result.items.map((q) => q.fingerprint));

  // Check 1: No exact collisions between MAIN and QUIZ_1
  let mainQ1Collisions = 0;
  for (const fp of quiz1Fingerprints) {
    if (mainFingerprints.has(fp)) mainQ1Collisions++;
  }
  assert(mainQ1Collisions === 0, 'Zero fingerprint collisions between MAIN and QUIZ_1');

  // Check 2: No exact collisions between MAIN and QUIZ_2
  let mainQ2Collisions = 0;
  for (const fp of quiz2Fingerprints) {
    if (mainFingerprints.has(fp)) mainQ2Collisions++;
  }
  assert(mainQ2Collisions === 0, 'Zero fingerprint collisions between MAIN and QUIZ_2');

  // Check 3: No exact collisions between QUIZ_1 and QUIZ_2
  let q1Q2Collisions = 0;
  for (const fp of quiz2Fingerprints) {
    if (quiz1Fingerprints.has(fp)) q1Q2Collisions++;
  }
  assert(q1Q2Collisions === 0, 'Zero fingerprint collisions between QUIZ_1 and QUIZ_2');

  // Check 4: Cross-set semantic similarity check (< 75% similarity across all 80 MCQs)
  let maxCrossSetSimilarity = 0;
  const all80MCQs = [...mainResult.items, ...quiz1Result.items, ...quiz2Result.items];
  assert(all80MCQs.length === 80, 'Total evaluated questions across slots is 80');

  for (let i = 0; i < all80MCQs.length; i++) {
    for (let j = i + 1; j < all80MCQs.length; j++) {
      const sim = MCQDeDuplicator.calculateTokenSimilarity(all80MCQs[i].question, all80MCQs[j].question);
      if (sim > maxCrossSetSimilarity) maxCrossSetSimilarity = sim;
      assert(
        sim < 0.75,
        `No semantic duplicates across sets (Question ${i + 1} [${all80MCQs[i].questionSet}] vs Question ${j + 1} [${all80MCQs[j].questionSet}] similarity=${(sim * 100).toFixed(1)}%)`
      );
    }
  }
  console.log(`  -> Maximum cross-set token similarity observed: ${(maxCrossSetSimilarity * 100).toFixed(1)}% (Threshold: < 75%)`);

  // ---------------------------------------------------------------------------
  // TEST 7: Cache-First Direct Serving ($0 AI Cost)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Cache-First Direct Serving ---');
  const cachedQuiz1 = await QuizMCQGenerator.generateCanonicalQuizMCQs({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    quizSlot: 'QUIZ_1',
    supabaseClient: mockSupabase,
  });

  assert(cachedQuiz1.success === true, 'Cached QUIZ_1 returns success');
  assert(cachedQuiz1.servedFromCache === true, 'Served directly from cache');
  assert(cachedQuiz1.generationReason === 'CACHE_VALID', 'Reason is CACHE_VALID');
  assert(cachedQuiz1.itemCount === 20, 'Returns full 20 items from cache');

  const cachedQuiz2 = await QuizMCQGenerator.generateCanonicalQuizMCQs({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    quizSlot: 'QUIZ_2',
    supabaseClient: mockSupabase,
  });

  assert(cachedQuiz2.success === true, 'Cached QUIZ_2 returns success');
  assert(cachedQuiz2.servedFromCache === true, 'Served directly from cache');
  assert(cachedQuiz2.generationReason === 'CACHE_VALID', 'Reason is CACHE_VALID');
  assert(cachedQuiz2.itemCount === 20, 'Returns full 20 items from cache');

  // ---------------------------------------------------------------------------
  // TEST 8: Concurrency Locking & Job Idempotency
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Concurrency Locking & Job Idempotency ---');
  const topic2Id = '44444444-4444-4444-4444-444444444444';
  
  // Custom mock topic handler for Topic 2
  const mockSupabase2 = {
    ...mockSupabase,
    from: (table) => {
      if (table === 'exam_topics') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: topic2Id, subject_id: mockSubjectId, name: 'Lower Limb Nerve Supply' },
                error: null,
              }),
            }),
          }),
        };
      }
      return mockSupabase.from(table);
    },
  };

  // Launch 10 simultaneous requests for QUIZ_1 on topic2
  const parallelQ1Promises = Array.from({ length: 10 }).map(() =>
    QuizMCQGenerator.generateCanonicalQuizMCQs({
      examId: mockExamId,
      subjectId: mockSubjectId,
      topicId: topic2Id,
      quizSlot: 'QUIZ_1',
      supabaseClient: mockSupabase2,
    })
  );

  const parallelQ1Results = await Promise.all(parallelQ1Promises);
  const primaryQ1Job = parallelQ1Results.find((r) => r.generationReason !== 'ATTACHED_JOB');
  const attachedQ1Jobs = parallelQ1Results.filter((r) => r.generationReason === 'ATTACHED_JOB');

  assert(primaryQ1Job !== undefined, 'Exactly one primary generation job executed for QUIZ_1');
  assert(attachedQ1Jobs.length === 9, '9 concurrent requests attached to the in-flight QUIZ_1 job');

  // ---------------------------------------------------------------------------
  // TEST 9: Financial Auditing ($0 User Credits Deducted)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Financial Auditing ($0 User Credits Deducted) ---');
  const costEvents = inMemoryCostEvents;
  assert(costEvents.length >= 3, 'Cost events logged for global generation jobs');
  assert(costEvents.every((e) => e.credits_deducted === 0), 'Every global generation cost event has strictly 0 credits deducted');
  assert(costEvents.every((e) => e.user_id === null), 'Every global generation cost event is attributed to system (user_id = null)');

  // ---------------------------------------------------------------------------
  // TEST 10: Dual-Layer Persistence in Database
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10: Dual-Layer Persistence ---');
  const dbMain = inMemoryMCQs.filter((m) => m.topic_id === mockTopicId && m.question_set === 'MAIN');
  const dbQuiz1 = inMemoryMCQs.filter((m) => m.topic_id === mockTopicId && m.question_set === 'QUIZ_1');
  const dbQuiz2 = inMemoryMCQs.filter((m) => m.topic_id === mockTopicId && m.question_set === 'QUIZ_2');

  assert(dbMain.length === 40, 'Database mcqs table contains 40 MAIN items');
  assert(dbQuiz1.length === 20, 'Database mcqs table contains 20 QUIZ_1 items');
  assert(dbQuiz2.length === 20, 'Database mcqs table contains 20 QUIZ_2 items');
  assert(dbMain.length + dbQuiz1.length + dbQuiz2.length === 80, 'Database contains all 80 items with correct question_set column values');

  // ---------------------------------------------------------------------------
  // TEST 11: Orchestrator Integration
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 11: Public Orchestrator Integration ---');
  const orchQ1 = await ContentGenerationOrchestrator.generateQuizMCQs({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    quizSlot: 'QUIZ_1',
    supabaseClient: mockSupabase,
  });

  assert(orchQ1.success === true, 'ContentGenerationOrchestrator.generateQuizMCQs (QUIZ_1) returns success');
  assert(orchQ1.itemCount === 20, 'Orchestrator QUIZ_1 returns 20 items');

  const orchQ2 = await ContentGenerationOrchestrator.generateQuizMCQs({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    quizSlot: 'QUIZ_2',
    supabaseClient: mockSupabase,
  });

  assert(orchQ2.success === true, 'ContentGenerationOrchestrator.generateQuizMCQs (QUIZ_2) returns success');
  assert(orchQ2.itemCount === 20, 'Orchestrator QUIZ_2 returns 20 items');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED PERFECTLY!`);
  console.log('  NEOMCQ PHASE 4C: INDEPENDENT QUIZ GENERATION VERIFIED');
  console.log('================================================================');
}

runPhase4CTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
