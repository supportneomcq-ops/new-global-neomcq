/**
 * Automated Verification Script for Phase 4A: Global Content Generation Engine Foundation
 * Runs all 12 test scenarios and verifies engine guarantees.
 */

import {
  CANONICAL_MCQ_SLOT_SPEC,
  TOTAL_CANONICAL_MCQ_COUNT,
} from '../lib/server/content-engine/types.ts';

import {
  buildCanonicalPackageKey,
} from '../lib/server/content-engine/canonical-identity.ts';

import {
  GenerationJobManager,
} from '../lib/server/content-engine/job-manager.ts';

import {
  ContentCacheManager,
} from '../lib/server/content-engine/content-cache-manager.ts';

import {
  ContentCostAuditor,
} from '../lib/server/content-engine/cost-auditor.ts';

import {
  ContentGenerationOrchestrator,
} from '../lib/server/content-engine/orchestrator.ts';

const mockExamId = '11111111-1111-4111-a111-111111111111';
const mockSubjectId = '22222222-2222-4222-a222-222222222222';
const mockTopicId = '33333333-3333-4333-a333-333333333333';
const mockTopicId2 = '44444444-4444-4444-a444-444444444444';

let inMemoryJobs = [];
let inMemoryVersions = [];
let inMemoryCostEvents = [];

const mockSupabase = {
  from: (table) => {
    if (table === 'exam_subjects') {
      return {
        select: () => ({
          eq: (col, val) => ({
            maybeSingle: async () => ({
              data: { id: mockSubjectId, exam_id: mockExamId, name: 'Anatomy' },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'exam_topics') {
      return {
        select: () => ({
          eq: (col, val) => ({
            maybeSingle: async () => ({
              data: { id: val, subject_id: mockSubjectId, name: 'Brachial Plexus' },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'exams') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: mockExamId, name: 'FMGE' },
              error: null,
            }),
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
                  const match = inMemoryJobs
                    .filter((j) => j.topic_id === val)
                    .pop();
                  return { data: match || null, error: null };
                },
              }),
            }),
          }),
        }),
        insert: (row) => ({
          select: () => ({
            single: async () => {
              // Simulate PostgreSQL unique constraint on active idempotency_key
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
          eq: (col, val) => ({
            eq: (col2, val2) => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => {
                    const match = inMemoryVersions
                      .filter((v) => v.asset_id === val && v.asset_type === val2)
                      .pop();
                    return { data: match || null, error: null };
                  },
                }),
              }),
              maybeSingle: async () => {
                const match = inMemoryVersions.find((v) => v.asset_id === val && v.version === val2);
                return { data: match || null, error: null };
              },
            }),
          }),
        }),
        insert: async (row) => {
          inMemoryVersions.push({ id: `cv-${inMemoryVersions.length + 1}`, ...row });
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
    return {};
  },
};

function resetDb() {
  inMemoryJobs = [];
  inMemoryVersions = [];
  inMemoryCostEvents = [];
}

async function runTests() {
  console.log('\n======================================================');
  console.log('NEOMCQ — PHASE 4A: CONTENT ENGINE FOUNDATION TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} — ${details}`);
      failed++;
    }
  }

  // 1. First request creates one job
  resetDb();
  const res1 = await GenerationJobManager.createOrAttachJob(
    { examId: mockExamId, subjectId: mockSubjectId, topicId: mockTopicId, version: 1 },
    mockSupabase
  );
  assert(res1.isNew === true && res1.job.status === 'QUEUED' && inMemoryJobs.length === 1, '1. First request creates one job');

  // 2. Same request returns existing job
  const res2 = await GenerationJobManager.createOrAttachJob(
    { examId: mockExamId, subjectId: mockSubjectId, topicId: mockTopicId, version: 1 },
    mockSupabase
  );
  assert(res2.isNew === false && res2.job.id === res1.job.id && inMemoryJobs.length === 1, '2. Same request returns existing job');

  // 3. 10 simultaneous requests create only one job
  resetDb();
  const tenRequests = await Promise.all(
    Array.from({ length: 10 }).map(() =>
      GenerationJobManager.createOrAttachJob(
        { examId: mockExamId, subjectId: mockSubjectId, topicId: mockTopicId, version: 1 },
        mockSupabase
      )
    )
  );
  const newCount = tenRequests.filter((r) => r.isNew).length;
  const attachedCount = tenRequests.filter((r) => !r.isNew).length;
  assert(newCount === 1 && attachedCount === 9 && inMemoryJobs.length === 1, '3. 10 simultaneous requests create only one job');

  // 4. Existing valid cache prevents AI call
  resetDb();
  const mockPkg = {
    packageVersion: 1,
    canonicalKey: buildCanonicalPackageKey(mockExamId, mockSubjectId, mockTopicId, 1),
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    mainMcqsSlot: { targetCount: 40, actualCount: 40 },
    quiz1Slot: { targetCount: 20, actualCount: 20 },
    quiz2Slot: { targetCount: 20, actualCount: 20 },
    notesSlot: { present: true, content: 'Clinical notes' },
    flashcardsSlot: { count: 10 },
    aiTutorSlot: { present: true },
    mediaReferencesSlot: { count: 3 },
    validationMetadata: {
      structuralValid: true,
      scopeValid: true,
      deduplicationValid: true,
      answersValid: true,
      score: 98.0,
      status: 'passed',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await ContentCacheManager.savePackageVersion(mockExamId, mockSubjectId, mockTopicId, 1, mockPkg, 'Initial', mockSupabase);
  const cacheOrchestration = await ContentGenerationOrchestrator.resolveOrchestratedContent({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    supabaseClient: mockSupabase,
  });
  assert(cacheOrchestration.servedFromCache === true && cacheOrchestration.reason === 'CACHE_VALID' && inMemoryJobs.length === 0, '4. Existing valid cache prevents AI call');

  // 5. Existing active job prevents duplicate job
  resetDb();
  const job5 = await GenerationJobManager.createOrAttachJob(
    { examId: mockExamId, subjectId: mockSubjectId, topicId: mockTopicId, version: 1 },
    mockSupabase
  );
  await GenerationJobManager.markRunning(job5.job.id, 'gemini', 'gemini-3.7-flash', mockSupabase);
  const activeCheck = await ContentGenerationOrchestrator.resolveOrchestratedContent({
    examId: mockExamId,
    subjectId: mockSubjectId,
    topicId: mockTopicId,
    supabaseClient: mockSupabase,
  });
  assert(activeCheck.servedFromCache === false && activeCheck.reason === 'ATTACHED_IN_FLIGHT_JOB' && activeCheck.activeJobId === job5.job.id, '5. Existing active job prevents duplicate job');

  // 6. Failed job can be retried
  resetDb();
  const job6 = await GenerationJobManager.createOrAttachJob(
    { examId: mockExamId, subjectId: mockSubjectId, topicId: mockTopicId, version: 1 },
    mockSupabase
  );
  await GenerationJobManager.markFailed(job6.job.id, 'Timeout', mockSupabase);
  const retryJob = await GenerationJobManager.createOrAttachJob(
    { examId: mockExamId, subjectId: mockSubjectId, topicId: mockTopicId, version: 1 },
    mockSupabase
  );
  assert(retryJob.isNew === true && retryJob.job.id !== job6.job.id && retryJob.job.status === 'QUEUED', '6. Failed job can be retried');

  // 7. Different topic creates different job
  resetDb();
  const jobTopicA = await GenerationJobManager.createOrAttachJob(
    { examId: mockExamId, subjectId: mockSubjectId, topicId: mockTopicId, version: 1 },
    mockSupabase
  );
  const jobTopicB = await GenerationJobManager.createOrAttachJob(
    { examId: mockExamId, subjectId: mockSubjectId, topicId: mockTopicId2, version: 1 },
    mockSupabase
  );
  assert(jobTopicA.job.id !== jobTopicB.job.id && inMemoryJobs.length === 2, '7. Different topic creates different job');

  // 8. Different package version creates different job
  resetDb();
  const jobV1 = await GenerationJobManager.createOrAttachJob(
    { examId: mockExamId, subjectId: mockSubjectId, topicId: mockTopicId, version: 1 },
    mockSupabase
  );
  await GenerationJobManager.markCompleted(jobV1.job.id, { done: true }, mockSupabase);
  const jobV2 = await GenerationJobManager.createOrAttachJob(
    { examId: mockExamId, subjectId: mockSubjectId, topicId: mockTopicId, version: 2 },
    mockSupabase
  );
  assert(jobV2.isNew === true && jobV2.job.id !== jobV1.job.id && jobV2.job.idempotencyKey.includes(':v2'), '8. Different package version creates different job');

  // 9. Main/Quiz content identifiers remain independent
  const slotSpecValid =
    CANONICAL_MCQ_SLOT_SPEC.MAIN.targetCount === 40 &&
    CANONICAL_MCQ_SLOT_SPEC.QUIZ_1.targetCount === 20 &&
    CANONICAL_MCQ_SLOT_SPEC.QUIZ_2.targetCount === 20 &&
    CANONICAL_MCQ_SLOT_SPEC.MAIN.independentSet === true &&
    CANONICAL_MCQ_SLOT_SPEC.QUIZ_1.independentSet === true &&
    CANONICAL_MCQ_SLOT_SPEC.QUIZ_2.independentSet === true &&
    TOTAL_CANONICAL_MCQ_COUNT === 80;
  assert(slotSpecValid, '9. Main (40) / Quiz 1 (20) / Quiz 2 (20) slots remain independent (Total: 80)');

  // 10. User AI credits are not deducted by global generation
  resetDb();
  const costEvent = await ContentCostAuditor.recordGlobalGenerationCost(
    {
      jobId: 'audit-job-1',
      taskType: 'canonical_content_generation',
      provider: 'gemini',
      model: 'gemini-3.7-flash',
      inputTokens: 10000,
      cachedTokens: 2000,
      outputTokens: 3000,
      actualCostUsd: 0.0012,
      userId: null,
    },
    mockSupabase
  );
  assert(costEvent.creditsDeducted === 0 && costEvent.isGlobalGeneration === true && costEvent.userId === null, '10. User AI credits are not deducted by global generation');

  // 11. Cost event is associated with generation job
  const costCalculated = await ContentCostAuditor.calculateProviderCost('gemini', 'gemini-3.7-flash', 15000, 3000, 4000, mockSupabase);
  const costAuditRec = await ContentCostAuditor.recordGlobalGenerationCost(
    {
      jobId: 'job-audited-999',
      taskType: 'full_pack_generation',
      provider: 'gemini',
      model: 'gemini-3.7-flash',
      inputTokens: 15000,
      cachedTokens: 3000,
      outputTokens: 4000,
      actualCostUsd: costCalculated,
      userId: null,
    },
    mockSupabase
  );
  assert(costAuditRec.jobId === 'job-audited-999' && costAuditRec.actualCostUsd > 0 && inMemoryCostEvents.length === 2, '11. Cost event is associated with generation job');

  // 12. Provider failure is handled safely
  resetDb();
  const failJob = await GenerationJobManager.createOrAttachJob(
    { examId: mockExamId, subjectId: mockSubjectId, topicId: mockTopicId, version: 1 },
    mockSupabase
  );
  const failMarked = await GenerationJobManager.markFailed(failJob.job.id, '503 Provider Unavailable', mockSupabase);
  const dbFail = inMemoryJobs.find((j) => j.id === failJob.job.id);
  assert(failMarked === true && dbFail.status === 'failed' && dbFail.error.includes('503'), '12. Provider failure is handled safely');

  console.log(`\n======================================================`);
  console.log(`TEST RESULTS: ${passed}/12 Passed | ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution exception:', err);
  process.exit(1);
});
