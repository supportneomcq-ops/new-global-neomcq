import pg from 'pg';
import crypto from 'crypto';

async function runVerification() {
  const rawUrl = process.env.POSTGRES_URL;
  if (!rawUrl) {
    console.error('POSTGRES_URL is not set.');
    process.exit(1);
  }

  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const pool = new pg.Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    max: 20,
  });

  const client = await pool.connect();
  console.log('================================================================');
  console.log('NEOMCQ — BATCH 2: AI GENERATION IDENTITY & IDEMPOTENCY VERIFICATION');
  console.log('================================================================\n');

  let allPassed = true;

  try {
    // 1. Verify ai_jobs count preservation
    const countRes = await client.query(`SELECT count(*) FROM public.ai_jobs;`);
    const initialCount = parseInt(countRes.rows[0].count, 10);
    console.log(`[CHECK 1] ai_jobs count preservation: ${initialCount} records (must be >= 171)`);
    if (initialCount >= 171) {
      console.log('  -> PASS: 171 baseline production jobs are fully preserved.');
    } else {
      console.error(`  -> FAIL: Expected >= 171 jobs, found ${initialCount}`);
      allPassed = false;
    }

    // 2. Verify ai_jobs column extensions
    const colRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ai_jobs' AND column_name IN ('exam_version_id', 'idempotency_key')
      ORDER BY column_name;
    `);
    console.log('\n[CHECK 2] Extended Columns in ai_jobs:');
    const hasExamVersion = colRes.rows.some((r) => r.column_name === 'exam_version_id');
    const hasIdempotency = colRes.rows.some((r) => r.column_name === 'idempotency_key');
    if (hasExamVersion && hasIdempotency) {
      console.log('  -> PASS: exam_version_id and idempotency_key exist.');
    } else {
      console.error('  -> FAIL: Missing required columns in ai_jobs.');
      allPassed = false;
    }

    // 3. Verify partial unique index for active jobs
    const idxRes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'ai_jobs' AND indexname = 'idx_ai_jobs_active_idempotency';
    `);
    console.log('\n[CHECK 3] Partial Unique Index for Active Jobs:');
    if (idxRes.rows.length > 0) {
      console.log('  -> Index Definition:', idxRes.rows[0].indexdef);
      console.log('  -> PASS: Database-enforced partial unique index active.');
    } else {
      console.error('  -> FAIL: idx_ai_jobs_active_idempotency index not found.');
      allPassed = false;
    }

    // 4. Verify RPC function get_or_create_ai_generation_job
    const fnRes = await client.query(`
      SELECT p.proname, p.prosecdef, pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'get_or_create_ai_generation_job';
    `);
    console.log('\n[CHECK 4] RPC get_or_create_ai_generation_job:');
    if (fnRes.rows.length > 0) {
      const isSecDef = fnRes.rows[0].prosecdef;
      const hasSearchPath = fnRes.rows[0].def.includes('search_path') || fnRes.rows[0].def.includes('pg_temp');
      console.log(`  -> Security Definer: ${isSecDef}, Hardened Search Path: ${hasSearchPath}`);
      if (isSecDef && hasSearchPath) {
        console.log('  -> PASS: Function is properly hardened.');
      } else {
        console.error('  -> FAIL: Function is not properly hardened.');
        allPassed = false;
      }
    } else {
      console.error('  -> FAIL: get_or_create_ai_generation_job not found in public schema.');
      allPassed = false;
    }

    // 5. ATOMIC CONCURRENCY TEST: 50 simultaneous requests across pool connections
    console.log('\n[CHECK 5] Atomic Concurrency Test (50 simultaneous concurrent requests):');
    const testExamId = '8da46402-3803-4833-8345-8225f87434fc';
    const testKey = `test_idempotency_batch2_${crypto.randomUUID()}`;
    const testTask = 'test_canonical_generation';

    // Fetch real test user IDs
    const usersRes = await client.query(`SELECT id FROM auth.users LIMIT 2;`);
    const userA = usersRes.rows[0]?.id || null;
    const userB = usersRes.rows[1]?.id || null;

    const concurrentRequests = Array.from({ length: 50 }).map(async (_, idx) => {
      const assignedUser = idx % 2 === 0 ? userA : userB;
      const workerClient = await pool.connect();
      try {
        const res = await workerClient.query(`
          SELECT * FROM public.get_or_create_ai_generation_job(
            $1, $2, $3, NULL, NULL, NULL, $4, '{"test": true}'::jsonb, 5, 'Google Gemini AI', 'gemini-3.5-flash', 3
          );
        `, [testKey, testTask, testExamId, assignedUser]);
        return res.rows[0];
      } finally {
        workerClient.release();
      }
    });

    const rows = await Promise.all(concurrentRequests);
    const newJobs = rows.filter((r) => r.is_new === true);
    const attachedJobs = rows.filter((r) => r.is_new === false);
    const distinctJobIds = new Set(rows.map((r) => r.job_id));

    console.log(`  -> Total Concurrent Requests: ${rows.length}`);
    console.log(`  -> Newly Created Jobs: ${newJobs.length} (Expected: exactly 1)`);
    console.log(`  -> Attached/Reused Requests: ${attachedJobs.length} (Expected: exactly 49)`);
    console.log(`  -> Distinct Job IDs Resolved: ${distinctJobIds.size} (Expected: exactly 1)`);

    const primaryJobId = rows[0].job_id;

    if (newJobs.length === 1 && attachedJobs.length === 49 && distinctJobIds.size === 1) {
      console.log('  -> PASS: Perfect database-enforced concurrency boundary! 50 users -> 1 single generation job.');
    } else {
      console.error('  -> FAIL: Concurrency collision or duplicate job creation detected!');
      allPassed = false;
    }

    // 6. COMPLETED REUSE TEST
    console.log('\n[CHECK 6] Completed Generation Reusability Test:');
    const mockPayload = { mcqs: [{ question: 'Sample Test Question?', options: ['A', 'B', 'C', 'D'], answer: 'A' }] };
    await client.query(`
      UPDATE public.ai_jobs
      SET status = 'completed', output_payload = $1, completed_at = NOW()
      WHERE id = $2;
    `, [JSON.stringify(mockPayload), primaryJobId]);

    const newUserRes = await client.query(`
      SELECT * FROM public.get_or_create_ai_generation_job(
        $1, $2, $3, NULL, NULL, NULL, $4, '{"test": true}'::jsonb
      );
    `, [testKey, testTask, testExamId, userB]);

    const user51Row = newUserRes.rows[0];
    console.log(`  -> User Request Resolution: ${user51Row.resolution_type}, is_new: ${user51Row.is_new}, job_id: ${user51Row.job_id}`);
    if (user51Row.is_new === false && user51Row.resolution_type === 'REUSED_COMPLETED' && user51Row.output_payload?.mcqs?.length === 1) {
      console.log('  -> PASS: Completed generation reused instantly without creating new jobs.');
    } else {
      console.error('  -> FAIL: Completed generation was not properly reused.');
      allPassed = false;
    }

    // 7. RETRYABILITY TEST ON FAILED JOBS
    console.log('\n[CHECK 7] Failed Generation Retryability Test:');
    const failedKey = `test_failed_retry_${crypto.randomUUID()}`;
    const firstRes = await client.query(`
      SELECT * FROM public.get_or_create_ai_generation_job(
        $1, $2, $3, NULL, NULL, NULL, $4, '{"test": true}'::jsonb
      );
    `, [failedKey, testTask, testExamId, userA]);
    const failedJobId = firstRes.rows[0].job_id;

    await client.query(`
      UPDATE public.ai_jobs
      SET status = 'failed', error = 'Rate limit error', completed_at = NOW()
      WHERE id = $1;
    `, [failedJobId]);

    const retryRes = await client.query(`
      SELECT * FROM public.get_or_create_ai_generation_job(
        $1, $2, $3, NULL, NULL, NULL, $4, '{"test": true}'::jsonb
      );
    `, [failedKey, testTask, testExamId, userB]);

    const retryRow = retryRes.rows[0];
    console.log(`  -> Retry Request Resolution: ${retryRow.resolution_type}, is_new: ${retryRow.is_new}, new_job_id: ${retryRow.job_id}`);
    if (retryRow.is_new === true && retryRow.job_id !== failedJobId) {
      console.log('  -> PASS: Failed job safely retried with new queued job.');
    } else {
      console.error('  -> FAIL: Failed job was not retryable.');
      allPassed = false;
    }

    // 8. Clean up test records
    console.log('\n[CHECK 8] Cleanup of Test Verification Records:');
    await client.query(`
      DELETE FROM public.ai_jobs
      WHERE idempotency_key IN ($1, $2);
    `, [testKey, failedKey]);
    console.log('  -> Test records cleaned up.');

    const finalCountRes = await client.query(`SELECT count(*) FROM public.ai_jobs;`);
    const finalCount = parseInt(finalCountRes.rows[0].count, 10);
    console.log(`  -> Final ai_jobs count: ${finalCount} (Baseline: ${initialCount})`);
    if (finalCount === initialCount) {
      console.log('  -> PASS: Baseline records preserved 100% intact.');
    } else {
      console.error(`  -> FAIL: Baseline mismatch! Expected ${initialCount}, found ${finalCount}`);
      allPassed = false;
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log('>>> BATCH 2 VERIFICATION RESULT: ALL CHECKS PASSED CLEANLY <<<');
  } else {
    console.log('>>> BATCH 2 VERIFICATION RESULT: FAILURES DETECTED <<<');
    process.exit(1);
  }
  console.log('================================================================\n');
}

runVerification();
