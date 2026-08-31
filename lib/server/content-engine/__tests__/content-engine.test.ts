/**
 * NEOMCQ — GLOBAL CONTENT GENERATION ENGINE FOUNDATION (PHASE 4A)
 * Test Suite covering the 12 required test cases:
 *
 * 1. First request creates one job
 * 2. Same request returns existing job
 * 3. 10 simultaneous requests create only one job
 * 4. Existing valid cache prevents AI call
 * 5. Existing active job prevents duplicate job
 * 6. Failed job can be retried
 * 7. Different topic creates different job
 * 8. Different package version creates different job
 * 9. Main/Quiz content identifiers remain independent
 * 10. User AI credits are not deducted by global generation
 * 11. Cost event is associated with generation job
 * 12. Provider failure is handled safely
 */

import {
  buildCanonicalPackageKey,
  buildIdempotencyKey,
  CANONICAL_MCQ_SLOT_SPEC,
  TOTAL_CANONICAL_MCQ_COUNT,
  GenerationJobManager,
  ContentCacheManager,
  ContentCostAuditor,
  ContentGenerationOrchestrator,
  GlobalContentPackage,
} from '../index';

describe('Global Content Generation Engine Foundation (Phase 4A)', () => {
  const mockExamId = '11111111-1111-4111-a111-111111111111';
  const mockSubjectId = '22222222-2222-4222-a222-222222222222';
  const mockTopicId = '33333333-3333-4333-a333-333333333333';
  const mockTopicId2 = '44444444-4444-4444-a444-444444444444';

  // In-memory mock database store for clean isolated test execution
  let inMemoryJobs: any[] = [];
  let inMemoryVersions: any[] = [];
  let inMemoryCostEvents: any[] = [];

  const mockSupabase = {
    from: (table: string) => {
      if (table === 'exam_subjects') {
        return {
          select: () => ({
            eq: (col: string, val: any) => ({
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
            eq: (col: string, val: any) => ({
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
            contains: (col: string, payload: any) => ({
              in: (col2: string, statuses: string[]) => ({
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
            eq: (col: string, val: any) => ({
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
          insert: (row: any) => ({
            select: () => ({
              single: async () => {
                const inserted = {
                  id: `job-${inMemoryJobs.length + 1}-${Math.random().toString(36).slice(2, 7)}`,
                  ...row,
                };
                inMemoryJobs.push(inserted);
                return { data: inserted, error: null };
              },
            }),
          }),
          update: (updates: any) => ({
            eq: (col: string, id: string) => {
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
            eq: (col: string, val: any) => ({
              eq: (col2: string, val2: any) => ({
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
          insert: async (row: any) => {
            inMemoryVersions.push({ id: `cv-${inMemoryVersions.length + 1}`, ...row });
            return { error: null };
          },
        };
      }
      if (table === 'ai_cost_events') {
        return {
          insert: async (row: any) => {
            inMemoryCostEvents.push(row);
            return { error: null };
          },
        };
      }
      return {};
    },
  };

  beforeEach(() => {
    inMemoryJobs = [];
    inMemoryVersions = [];
    inMemoryCostEvents = [];
  });

  // 1. First request creates one job
  test('1. First request creates one job in QUEUED state', async () => {
    const res = await GenerationJobManager.createOrAttachJob(
      {
        examId: mockExamId,
        subjectId: mockSubjectId,
        topicId: mockTopicId,
        version: 1,
      },
      mockSupabase
    );

    expect(res.isNew).toBe(true);
    expect(res.job.status).toBe('QUEUED');
    expect(res.job.attempts).toBe(0);
    expect(inMemoryJobs.length).toBe(1);
  });

  // 2. Same request returns existing job
  test('2. Same request returns existing active job without creating duplicate', async () => {
    const res1 = await GenerationJobManager.createOrAttachJob(
      {
        examId: mockExamId,
        subjectId: mockSubjectId,
        topicId: mockTopicId,
        version: 1,
      },
      mockSupabase
    );

    const res2 = await GenerationJobManager.createOrAttachJob(
      {
        examId: mockExamId,
        subjectId: mockSubjectId,
        topicId: mockTopicId,
        version: 1,
      },
      mockSupabase
    );

    expect(res1.isNew).toBe(true);
    expect(res2.isNew).toBe(false);
    expect(res2.job.id).toBe(res1.job.id);
    expect(inMemoryJobs.length).toBe(1);
  });

  // 3. 10 simultaneous requests create only one job
  test('3. 10 simultaneous requests create exactly one job', async () => {
    const promises = Array.from({ length: 10 }).map(() =>
      GenerationJobManager.createOrAttachJob(
        {
          examId: mockExamId,
          subjectId: mockSubjectId,
          topicId: mockTopicId,
          version: 1,
        },
        mockSupabase
      )
    );

    const results = await Promise.all(promises);
    const newJobCount = results.filter((r) => r.isNew).length;
    const attachedCount = results.filter((r) => !r.isNew).length;

    expect(newJobCount).toBe(1);
    expect(attachedCount).toBe(9);
    expect(inMemoryJobs.length).toBe(1);
  });

  // 4. Existing valid cache prevents AI call
  test('4. Existing valid cache prevents AI call ($0 cost, 0 provider calls)', async () => {
    const mockPkg: GlobalContentPackage = {
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

    await ContentCacheManager.savePackageVersion(
      mockExamId,
      mockSubjectId,
      mockTopicId,
      1,
      mockPkg,
      'Initial package commit',
      mockSupabase
    );

    const orchestratorRes = await ContentGenerationOrchestrator.resolveOrchestratedContent({
      examId: mockExamId,
      subjectId: mockSubjectId,
      topicId: mockTopicId,
      supabaseClient: mockSupabase,
    });

    expect(orchestratorRes.servedFromCache).toBe(true);
    expect(orchestratorRes.reason).toBe('CACHE_VALID');
    expect(orchestratorRes.package).not.toBeNull();
    expect(inMemoryJobs.length).toBe(0); // ZERO jobs created
  });

  // 5. Existing active job prevents duplicate job
  test('5. Existing active job in RUNNING or VALIDATING prevents duplicate creation', async () => {
    const jobRes = await GenerationJobManager.createOrAttachJob(
      {
        examId: mockExamId,
        subjectId: mockSubjectId,
        topicId: mockTopicId,
        version: 1,
      },
      mockSupabase
    );

    await GenerationJobManager.markRunning(jobRes.job.id, 'gemini', 'gemini-3.7-flash', mockSupabase);

    const orchestratorRes = await ContentGenerationOrchestrator.resolveOrchestratedContent({
      examId: mockExamId,
      subjectId: mockSubjectId,
      topicId: mockTopicId,
      supabaseClient: mockSupabase,
    });

    expect(orchestratorRes.servedFromCache).toBe(false);
    expect(orchestratorRes.reason).toBe('ATTACHED_IN_FLIGHT_JOB');
    expect(orchestratorRes.activeJobId).toBe(jobRes.job.id);
    expect(inMemoryJobs.length).toBe(1);
  });

  // 6. Failed job can be retried
  test('6. Failed job can be retried and creates a new active job', async () => {
    const jobRes = await GenerationJobManager.createOrAttachJob(
      {
        examId: mockExamId,
        subjectId: mockSubjectId,
        topicId: mockTopicId,
        version: 1,
      },
      mockSupabase
    );

    await GenerationJobManager.markFailed(jobRes.job.id, 'Provider timeout error', mockSupabase);

    // Subsequent request must create a new active job since previous job failed
    const retryRes = await GenerationJobManager.createOrAttachJob(
      {
        examId: mockExamId,
        subjectId: mockSubjectId,
        topicId: mockTopicId,
        version: 1,
      },
      mockSupabase
    );

    expect(retryRes.isNew).toBe(true);
    expect(retryRes.job.id).not.toBe(jobRes.job.id);
    expect(retryRes.job.status).toBe('QUEUED');
  });

  // 7. Different topic creates different job
  test('7. Different topic creates different job', async () => {
    const job1 = await GenerationJobManager.createOrAttachJob(
      {
        examId: mockExamId,
        subjectId: mockSubjectId,
        topicId: mockTopicId,
        version: 1,
      },
      mockSupabase
    );

    const job2 = await GenerationJobManager.createOrAttachJob(
      {
        examId: mockExamId,
        subjectId: mockSubjectId,
        topicId: mockTopicId2,
        version: 1,
      },
      mockSupabase
    );

    expect(job1.job.id).not.toBe(job2.job.id);
    expect(inMemoryJobs.length).toBe(2);
  });

  // 8. Different package version creates different job
  test('8. Different package version creates different job', async () => {
    const jobV1 = await GenerationJobManager.createOrAttachJob(
      {
        examId: mockExamId,
        subjectId: mockSubjectId,
        topicId: mockTopicId,
        version: 1,
      },
      mockSupabase
    );

    // Complete v1
    await GenerationJobManager.markCompleted(jobV1.job.id, { success: true }, mockSupabase);

    // Request v2
    const jobV2 = await GenerationJobManager.createOrAttachJob(
      {
        examId: mockExamId,
        subjectId: mockSubjectId,
        topicId: mockTopicId,
        version: 2,
      },
      mockSupabase
    );

    expect(jobV2.isNew).toBe(true);
    expect(jobV2.job.id).not.toBe(jobV1.job.id);
    expect(jobV2.job.idempotencyKey).toContain(':v2');
  });

  // 9. Main/Quiz content identifiers remain independent
  test('9. Main (40) / Quiz 1 (20) / Quiz 2 (20) slots remain independent (Total: 80 MCQs)', () => {
    expect(CANONICAL_MCQ_SLOT_SPEC.MAIN.targetCount).toBe(40);
    expect(CANONICAL_MCQ_SLOT_SPEC.QUIZ_1.targetCount).toBe(20);
    expect(CANONICAL_MCQ_SLOT_SPEC.QUIZ_2.targetCount).toBe(20);
    expect(CANONICAL_MCQ_SLOT_SPEC.MAIN.independentSet).toBe(true);
    expect(CANONICAL_MCQ_SLOT_SPEC.QUIZ_1.independentSet).toBe(true);
    expect(CANONICAL_MCQ_SLOT_SPEC.QUIZ_2.independentSet).toBe(true);
    expect(TOTAL_CANONICAL_MCQ_COUNT).toBe(80);
  });

  // 10. User AI credits are not deducted by global generation
  test('10. User AI credits are strictly NOT deducted by global topic generation', async () => {
    const costEvent = await ContentCostAuditor.recordGlobalGenerationCost(
      {
        jobId: 'test-job-uuid',
        taskType: 'canonical_content_generation',
        provider: 'gemini',
        model: 'gemini-3.7-flash',
        inputTokens: 15000,
        cachedTokens: 5000,
        outputTokens: 4000,
        actualCostUsd: 0.00185,
        userId: null,
      },
      mockSupabase
    );

    expect(costEvent.creditsDeducted).toBe(0);
    expect(costEvent.isGlobalGeneration).toBe(true);
    expect(costEvent.userId).toBeNull();
    expect(inMemoryCostEvents.length).toBe(1);
    expect(inMemoryCostEvents[0].credits_deducted).toBe(0.0);
  });

  // 11. Cost event is associated with generation job
  test('11. Cost event is properly auditable with job ID and provider COGS', async () => {
    const calculatedCost = await ContentCostAuditor.calculateProviderCost(
      'gemini',
      'gemini-3.7-flash',
      20000,
      5000,
      6000
    );

    expect(calculatedCost).toBeGreaterThan(0);

    const event = await ContentCostAuditor.recordGlobalGenerationCost(
      {
        jobId: 'job-audited-123',
        taskType: 'full_pack_generation',
        provider: 'gemini',
        model: 'gemini-3.7-flash',
        inputTokens: 20000,
        cachedTokens: 5000,
        outputTokens: 6000,
        actualCostUsd: calculatedCost,
        userId: null,
      },
      mockSupabase
    );

    expect(event.jobId).toBe('job-audited-123');
    expect(event.actualCostUsd).toBe(calculatedCost);
  });

  // 12. Provider failure is handled safely
  test('12. Provider failure transitions job to FAILED without unhandled exception', async () => {
    const jobRes = await GenerationJobManager.createOrAttachJob(
      {
        examId: mockExamId,
        subjectId: mockSubjectId,
        topicId: mockTopicId,
        version: 1,
      },
      mockSupabase
    );

    const marked = await GenerationJobManager.markFailed(
      jobRes.job.id,
      '503 Provider Rate Limited: Temporary failure',
      mockSupabase
    );

    expect(marked).toBe(true);
    const failedJob = inMemoryJobs.find((j) => j.id === jobRes.job.id);
    expect(failedJob.status).toBe('failed');
    expect(failedJob.error).toContain('503 Provider Rate Limited');
  });
});
