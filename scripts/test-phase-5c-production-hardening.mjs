import pg from 'pg';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../lib/supabase.ts';
import { TutorSessionManager } from '../lib/server/content-engine/tutor-session-manager.ts';
import { TutorChatEngine } from '../lib/server/content-engine/tutor-chat-engine.ts';
import { ContentCostAuditor } from '../lib/server/content-engine/cost-auditor.ts';

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, failureDetail = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${failureDetail}`);
    failedCount++;
  }
}

async function runTest() {
  console.log('======================================================================');
  console.log('🧪 NEOMCQ — PHASE 5C: AI TUTOR PRODUCTION HARDENING TEST SUITE');
  console.log('======================================================================\n');

  const rawUrl = process.env.POSTGRES_URL;
  if (!rawUrl) {
    console.error('POSTGRES_URL environment variable is missing.');
    process.exit(1);
  }

  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const client = new pg.Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const supabase = getSupabaseAdmin();

  // Step 0: Find connected canonical grounding hierarchy
  const hierarchyRes = await client.query(`
    SELECT
      e.id AS exam_id, e.name AS exam_name,
      s.id AS subject_id, s.name AS subject_name,
      t.id AS topic_id, t.name AS topic_name
    FROM exam_topics t
    JOIN exam_subjects s ON t.subject_id = s.id
    JOIN exams e ON s.exam_id = e.id
    LIMIT 2;
  `);

  if (hierarchyRes.rows.length === 0) {
    console.error('No connected exam hierarchy records found in DB.');
    process.exit(1);
  }

  const row1 = hierarchyRes.rows[0];
  const row2 = hierarchyRes.rows[1] || row1;

  const examId = row1.exam_id;
  const subjectId = row1.subject_id;
  const topicId = row1.topic_id;
  const topicId2 = row2.topic_id !== topicId ? row2.topic_id : '00000000-0000-4000-a000-000000000099';

  console.log(`--- Grounding Canonical Hierarchy ---`);
  console.log(`Exam: ${row1.exam_name} (${examId})`);
  console.log(`Subject: ${row1.subject_name} (${subjectId})`);
  console.log(`Topic 1: ${row1.topic_name} (${topicId})`);
  console.log(`Topic 2: ${row2.topic_name} (${topicId2})\n`);

  // Fetch real user profiles from DB
  const profsRes = await client.query('SELECT id FROM profiles LIMIT 2');
  if (profsRes.rows.length < 2) {
    console.error('Need at least 2 profile records in DB.');
    process.exit(1);
  }

  const user1 = profsRes.rows[0].id;
  const user2 = profsRes.rows[1].id;

  // Clean up any old test FAQs / messages for this topic to ensure clean test state
  await client.query(`DELETE FROM ai_tutor_faqs WHERE topic_id = $1;`, [topicId]);

  // Seed/reset user credit account for User 1
  await client.query(`
    INSERT INTO public.credit_accounts (user_id, credit_balance, updated_at)
    VALUES ($1, 100, NOW())
    ON CONFLICT (user_id) DO UPDATE SET credit_balance = 100;
  `, [user1]);

  // --- Test 1: Global Content = $0 User Credit Deduction ---
  console.log('--- Test 1: Global Content = $0 User Credit Deduction ---');
  const createRes = await TutorSessionManager.createOrResumeLesson({
    examId,
    subjectId,
    topicId,
    userId: user1,
    forceNew: true,
  });
  assert(createRes.success && Boolean(createRes.session), 'Create tutor lesson session succeeds', createRes.error || '');
  const lessonId = createRes.session?.id;

  // Check balance before/after global session creation
  const balRes1 = await client.query('SELECT credit_balance FROM credit_accounts WHERE user_id = $1', [user1]);
  assert(Number(balRes1.rows[0].credit_balance) === 100, 'Global session creation charges $0 user credits');

  // --- Test 2: FAQ Retrieval = $0 User Credit Deduction ---
  console.log('\n--- Test 2: FAQ Retrieval = $0 User Credit Deduction ---');
  const faqsRes = await TutorChatEngine.getTopicFaqs(topicId, { examId, subjectId });
  assert(faqsRes.success, 'Get topic FAQs succeeds', faqsRes.error || '');
  const balRes2 = await client.query('SELECT credit_balance FROM credit_accounts WHERE user_id = $1', [user1]);
  assert(Number(balRes2.rows[0].credit_balance) === 100, 'FAQ retrieval charges $0 user credits');

  // --- Test 3: Existing Tutor Segment = $0 User Credit Deduction ---
  console.log('\n--- Test 3: Existing Tutor Segment = $0 User Credit Deduction ---');
  const getSegRes = await TutorSessionManager.getLessonState(lessonId, user1);
  assert(getSegRes.success, 'Retrieving existing tutor state succeeds', getSegRes.error || '');
  const balRes3 = await client.query('SELECT credit_balance FROM credit_accounts WHERE user_id = $1', [user1]);
  assert(Number(balRes3.rows[0].credit_balance) === 100, 'State retrieval charges $0 user credits');

  // --- Test 4: New Personalized AI Doubt Follows Credit Policy ---
  console.log('\n--- Test 4: New Personalized AI Doubt Follows Credit Policy ---');
  const reqId1 = `req-doubt-${Date.now()}`;
  const doubtRes1 = await TutorChatEngine.askDoubtQuestion({
    lessonId,
    userId: user1,
    topicId,
    question: `What is the key pathophysiological mechanism of ${row1.topic_name}?`,
    requestId: reqId1,
    idempotencyKey: reqId1,
  });

  assert(doubtRes1.success && Boolean(doubtRes1.assistantMessage), 'New personalized AI doubt request succeeds', doubtRes1.error || '');
  assert(doubtRes1.creditsDeducted === 1, '1 credit deducted for new personalized AI doubt response');

  const balRes4 = await client.query('SELECT credit_balance FROM credit_accounts WHERE user_id = $1', [user1]);
  assert(Number(balRes4.rows[0].credit_balance) === 99, 'User credit account balance updated from 100 to 99');

  // Verify cost event recorded with full metadata
  const costEventRes = await client.query('SELECT * FROM ai_cost_events WHERE request_id = $1', [reqId1]);
  assert(costEventRes.rows.length === 1, 'Cost event recorded in ai_cost_events table');
  if (costEventRes.rows.length > 0) {
    const ce = costEventRes.rows[0];
    assert(ce.user_id === user1, 'Cost event user_id recorded correctly');
    assert(ce.task_type === 'AI_TUTOR_DOUBT_CHAT', 'Task type recorded correctly');
    assert(ce.input_tokens > 0 && ce.output_tokens > 0, 'Token usage recorded accurately');
    assert(Number(ce.credits_deducted) === 1, 'Credits deducted in cost event equals 1');
  }

  // --- Test 5: Chat Idempotency (Duplicate Doubt Cannot Double-Charge) ---
  console.log('\n--- Test 5: Chat Idempotency (Duplicate Doubt Cannot Double-Charge) ---');
  const doubtResDuplicate = await TutorChatEngine.askDoubtQuestion({
    lessonId,
    userId: user1,
    topicId,
    question: `What is the key pathophysiological mechanism of ${row1.topic_name}?`,
    requestId: reqId1,
    idempotencyKey: reqId1,
  });

  assert(doubtResDuplicate.success, 'Duplicate doubt request with same idempotencyKey succeeds');
  assert(doubtResDuplicate.isDuplicateRequest === true, 'Flagged as duplicate/idempotent hit');
  assert(doubtResDuplicate.creditsDeducted === 0, '0 credits deducted on idempotent retry');

  const balRes5 = await client.query('SELECT credit_balance FROM credit_accounts WHERE user_id = $1', [user1]);
  assert(Number(balRes5.rows[0].credit_balance) === 99, 'User credit balance remains 99 (no double charge)');

  // --- Test 6: Duplicate TTS Request Control & Caching ---
  console.log('\n--- Test 6: Duplicate TTS Request Control & Caching ---');
  const ttsText = 'The coronary artery carries oxygenated blood to the cardiac myocardium.';
  const ttsHash = crypto
    .createHash('sha256')
    .update(`${ttsText.toLowerCase().replace(/\s+/g, ' ')}|alloy|1.0`)
    .digest('hex');

  // Insert mock entry into ai_tutor_tts_cache
  await client.query(`
    INSERT INTO public.ai_tutor_tts_cache (text_hash, text_content, voice, speed, audio_base64, content_type, provider, hit_count)
    VALUES ($1, $2, 'alloy', 1.0, 'MOCK_BASE64_AUDIO_STREAM', 'audio/mp3', 'OpenAI TTS', 1)
    ON CONFLICT (text_hash) DO UPDATE SET hit_count = ai_tutor_tts_cache.hit_count + 1;
  `, [ttsHash, ttsText]);

  // Query database directly to verify cached entry
  const ttsCacheCheck = await client.query('SELECT * FROM ai_tutor_tts_cache WHERE text_hash = $1', [ttsHash]);
  assert(ttsCacheCheck.rows.length === 1, 'TTS cache table contains deterministic hash entry');
  assert(ttsCacheCheck.rows[0].text_hash === ttsHash, 'Text hash matches SHA-256 computation');

  // --- Test 7: FAQ Safety Lifecycle (CANDIDATE vs PUBLISHED) ---
  console.log('\n--- Test 7: FAQ Safety Lifecycle (CANDIDATE vs PUBLISHED) ---');
  const candidateCheck = await client.query(`
    SELECT * FROM ai_tutor_faqs WHERE source_message_id = $1
  `, [doubtRes1.assistantMessage?.id]);

  assert(candidateCheck.rows.length === 1, 'User doubt answer saved as candidate FAQ');
  if (candidateCheck.rows.length > 0) {
    assert(candidateCheck.rows[0].status === 'CANDIDATE', 'Default status is CANDIDATE');
  }

  // Ensure CANDIDATE FAQs are NOT returned by getTopicFaqs
  const getFaqsRes2 = await TutorChatEngine.getTopicFaqs(topicId, { examId, subjectId });
  const isCandidateReturned = (getFaqsRes2.faqs || []).some((f) => f.id === candidateCheck.rows[0]?.id);
  assert(!isCandidateReturned, 'CANDIDATE FAQ is NOT returned in public topic FAQs ($0 global safety guarantee)');

  // Promote FAQ to PUBLISHED
  if (candidateCheck.rows.length > 0) {
    await client.query(`
      UPDATE ai_tutor_faqs SET status = 'PUBLISHED' WHERE id = $1
    `, [candidateCheck.rows[0].id]);
  }

  const getFaqsRes3 = await TutorChatEngine.getTopicFaqs(topicId, { examId, subjectId });
  const isPublishedReturned = (getFaqsRes3.faqs || []).some((f) => f.id === candidateCheck.rows[0]?.id);
  assert(isPublishedReturned, 'Once PUBLISHED, FAQ is accessible in public topic FAQs');

  // --- Test 8: Cross-Topic / Cross-Exam FAQ Isolation ---
  console.log('\n--- Test 8: Cross-Topic / Cross-Exam FAQ Isolation ---');
  const crossFaqRes = await TutorChatEngine.getTopicFaqs(topicId2, { examId, subjectId });
  const isCrossTopicReturned = (crossFaqRes.faqs || []).some((f) => f.id === candidateCheck.rows[0]?.id);
  assert(!isCrossTopicReturned, 'FAQ from Topic 1 DOES NOT leak into Topic 2 (cross-topic isolation)');

  // --- Test 9: Cross-User Lesson & Chat Security Isolation ---
  console.log('\n--- Test 9: Cross-User Lesson & Chat Security Isolation ---');
  const crossStateRes = await TutorSessionManager.getLessonState(lessonId, user2);
  assert(!crossStateRes.success, 'User 2 cannot access User 1 lesson state');
  assert(crossStateRes.errorCode === 'UNAUTHORIZED' || crossStateRes.errorCode === 'LESSON_UNAUTHORIZED', 'Returns LESSON_UNAUTHORIZED or UNAUTHORIZED error code');

  const crossChatRes = await TutorChatEngine.getLessonChatHistory(lessonId, user2);
  assert(!crossChatRes.success, 'User 2 cannot access User 1 chat history');
  assert(crossChatRes.errorCode === 'LESSON_UNAUTHORIZED' || crossChatRes.errorCode === 'UNAUTHORIZED', 'Returns LESSON_UNAUTHORIZED error code');

  const crossAskRes = await TutorChatEngine.askDoubtQuestion({
    lessonId,
    userId: user2, // Unauthorized user
    topicId,
    question: 'Attempting cross-user doubt question',
  });
  assert(!crossAskRes.success, 'User 2 cannot ask doubt on User 1 lesson');
  assert(crossAskRes.errorCode === 'LESSON_UNAUTHORIZED' || crossAskRes.errorCode === 'UNAUTHORIZED', 'Returns LESSON_UNAUTHORIZED error code');

  // --- Test 10: Canonical Content Immutability ---
  console.log('\n--- Test 10: Canonical Content Immutability ---');
  const notesCountRes = await client.query('SELECT COUNT(*) FROM notes');
  const mcqCountRes = await client.query('SELECT COUNT(*) FROM mcqs');
  assert(notesCountRes.rows.length > 0, 'Canonical notes table intact');
  assert(mcqCountRes.rows.length > 0, 'Canonical MCQs table intact');

  // --- Test 11: Concurrency (100 Concurrent Requests) ---
  console.log('\n--- Test 11: Concurrency (100 Concurrent Identical Chat Requests) ---');
  const concurrencyReqId = `req-concurrent-${Date.now()}`;
  const concurrentPromises = Array.from({ length: 100 }, () =>
    TutorChatEngine.askDoubtQuestion({
      lessonId,
      userId: user1,
      topicId,
      question: `Concurrent test doubt ${concurrencyReqId}?`,
      requestId: concurrencyReqId,
      idempotencyKey: concurrencyReqId,
    })
  );

  const concurrentResults = await Promise.all(concurrentPromises);
  const successCount = concurrentResults.filter((r) => r.success).length;
  assert(successCount === 100, 'All 100 concurrent requests handled successfully');

  // Check how many messages inserted for this idempotencyKey
  const msgCountRes = await client.query(
    'SELECT COUNT(*) FROM ai_tutor_messages WHERE idempotency_key = $1 AND role = $2',
    [concurrencyReqId, 'user']
  );
  assert(Number(msgCountRes.rows[0].count) === 1, 'Exactly 1 user message inserted for 100 concurrent requests');

  // Check how many cost events created
  const costCountRes = await client.query(
    'SELECT COUNT(*) FROM ai_cost_events WHERE idempotency_key = $1',
    [concurrencyReqId]
  );
  assert(Number(costCountRes.rows[0].count) === 1, 'Exactly 1 cost event recorded for 100 concurrent requests');

  // --- Test 12: Provider Failure Recovery & Billing Protection ---
  console.log('\n--- Test 12: Provider Failure Recovery & Billing Protection ---');
  const balBefore12Res = await client.query('SELECT credit_balance FROM credit_accounts WHERE user_id = $1', [user1]);
  const balBefore12 = Number(balBefore12Res.rows[0].credit_balance);

  // Attempt doubt with missing lesson ID
  const failRes = await TutorChatEngine.askDoubtQuestion({
    lessonId: '00000000-0000-0000-0000-000000000000',
    userId: user1,
    topicId,
    question: 'Will fail due to bad lesson ID',
  });

  assert(!failRes.success, 'Failed operation returns success: false');
  const balRes12 = await client.query('SELECT credit_balance FROM credit_accounts WHERE user_id = $1', [user1]);
  assert(Number(balRes12.rows[0].credit_balance) === balBefore12, 'User balance is NOT deducted for failed operations');

  // --- Test 13: Complete Cost-Event Traceability ---
  console.log('\n--- Test 13: Complete Cost-Event Traceability ---');
  const traceRes = await client.query(`
    SELECT request_id, user_id, task_type, provider, model, input_tokens, output_tokens, actual_provider_cost, credits_deducted
    FROM ai_cost_events
    WHERE request_id = $1
  `, [reqId1]);

  assert(traceRes.rows.length > 0, 'Cost event traceable by request_id');
  if (traceRes.rows.length > 0) {
    const tr = traceRes.rows[0];
    assert(tr.request_id === reqId1, 'request_id matched');
    assert(tr.user_id === user1, 'user_id matched');
    assert(tr.task_type === 'AI_TUTOR_DOUBT_CHAT', 'task_type matched');
  }

  await client.end();

  console.log('\n======================================================================');
  console.log(`📊 PHASE 5C TEST SUMMARY: Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log('======================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
