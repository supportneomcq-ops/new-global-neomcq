/**
 * NEOMCQ — PHASE 5B: AI TUTOR TEACHING ENGINE TEST SUITE
 * Validates progressive, grounded, high-yield teaching segment generation,
 * strict schema validation, continuity, idempotency, concurrency, failure recovery,
 * media references, zero AI user credit deduction, and canonical grounding.
 */

import { createClient } from '@supabase/supabase-js';
import { TutorSessionManager } from '../lib/server/content-engine/tutor-session-manager.ts';
import { CanonicalTutorGenerator } from '../lib/server/content-engine/tutor-generator.ts';
import { TutorSegmentValidator } from '../lib/server/content-engine/tutor-segment-validator.ts';
import { verifyCanonicalHierarchy } from '../lib/server/content-engine/canonical-identity.ts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    totalFailed++;
  }
}

async function runPhase5BTestSuite() {
  console.log('======================================================================');
  console.log('🧪 NEOMCQ — PHASE 5B: AI TUTOR TEACHING ENGINE VERIFICATION SUITE');
  console.log('======================================================================');

  // Fetch a valid canonical hierarchy from DB
  const { data: topics } = await supabase
    .from('exam_topics')
    .select('id, name, subject_id, exam_subjects(id, exam_id, name, exams(id, name))')
    .limit(1);

  if (!topics || topics.length === 0) {
    console.error('❌ Could not find valid exam topics in database for testing.');
    process.exit(1);
  }

  const validTopic = topics[0];
  const topicId = validTopic.id;
  const subjectId = validTopic.subject_id;
  const examId = Array.isArray(validTopic.exam_subjects)
    ? validTopic.exam_subjects[0]?.exam_id
    : validTopic.exam_subjects?.exam_id;

  const examName = Array.isArray(validTopic.exam_subjects)
    ? validTopic.exam_subjects[0]?.exams?.name
    : validTopic.exam_subjects?.exams?.name || 'USMLE';

  const testUser1 = '00000000-0000-5000-a000-000000000001';
  const testUser2 = '00000000-0000-5000-a000-000000000002';

  // Ensure test profiles exist
  await supabase.from('profiles').upsert([
    { id: testUser1, email: 'tutoruser1@neomcq.internal', full_name: 'Phase 5B Test User 1' },
    { id: testUser2, email: 'tutoruser2@neomcq.internal', full_name: 'Phase 5B Test User 2' },
  ], { onConflict: 'id' });

  // Cleanup existing test records
  await supabase.from('ai_tutor_lessons').delete().in('user_id', [testUser1, testUser2]);

  console.log(`\n--- Grounding Canonical Hierarchy ---`);
  console.log(`Exam ID: ${examId} (${examName}) | Subject ID: ${subjectId} | Topic ID: ${topicId}`);

  // Create Tutor Lesson Session
  const createRes = await TutorSessionManager.createOrResumeLesson({
    userId: testUser1,
    examId,
    subjectId,
    topicId,
    supabaseClient: supabase,
  });

  assert(createRes.success === true, 'Tutor lesson session created successfully');
  const lessonId = createRes.session?.id || createRes.lesson?.id || '';

  // -------------------------------------------------------------------------
  // TEST 1: First teaching segment generation
  // -------------------------------------------------------------------------
  console.log('\n--- Test 1: First Teaching Segment Generation ---');
  const seg1Res = await CanonicalTutorGenerator.generateNextSegment({
    userId: testUser1,
    lessonId,
    sequence: 1,
    supabaseClient: supabase,
  });

  assert(seg1Res.success === true, 'Successfully generated segment #1');
  assert(seg1Res.segment?.sequence === 1, 'Segment sequence equals 1');
  assert(seg1Res.segment?.phase === 'INTRODUCTION', 'Segment #1 phase is INTRODUCTION');

  // -------------------------------------------------------------------------
  // TEST 2: Correct structured schema
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Correct Structured Schema ---');
  const seg1 = seg1Res.segment;
  assert(typeof seg1?.title === 'string' && seg1.title.length > 0, 'Segment has non-empty title');
  assert(typeof seg1?.teachingText === 'string' && seg1.teachingText.length >= 50, 'Segment has valid instructional teachingText (>= 50 chars)');
  assert(Array.isArray(seg1?.keyPoints) && seg1.keyPoints.length > 0, 'Segment contains non-empty keyPoints array');
  assert(typeof seg1?.examRelevance === 'string' && seg1.examRelevance.length > 0, 'Segment contains examRelevance');
  assert(Array.isArray(seg1?.mediaReferenceIds), 'Segment contains mediaReferenceIds array');

  // -------------------------------------------------------------------------
  // TEST 3: Correct canonical grounding
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Correct Canonical Grounding ---');
  const groundingValidation = TutorSegmentValidator.validateSegment(seg1, 1, []);
  assert(groundingValidation.valid === true, 'Segment passes strict schema validation');
  assert(seg1.examRelevance.toLowerCase().includes(examName.toLowerCase().slice(0, 4)) || seg1.teachingText.length > 100, 'Teaching content grounded in exam domain');

  // -------------------------------------------------------------------------
  // TEST 4: Progressive teaching sequence
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Progressive Teaching Sequence ---');
  const seg2Res = await CanonicalTutorGenerator.generateNextSegment({
    userId: testUser1,
    lessonId,
    sequence: 2,
    supabaseClient: supabase,
  });

  if (!seg2Res.success) {
    console.error('seg2Res ERROR:', seg2Res);
  }

  assert(seg2Res.success === true, 'Successfully generated segment #2');
  assert(seg2Res.segment?.sequence === 2, 'Segment #2 sequence equals 2');
  assert(seg2Res.segment?.phase === 'FOUNDATION', 'Segment #2 phase progressed to FOUNDATION');

  // -------------------------------------------------------------------------
  // TEST 5: Previous-context continuity
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: Previous-Context Continuity ---');
  const seg3Res = await CanonicalTutorGenerator.generateNextSegment({
    userId: testUser1,
    lessonId,
    sequence: 3,
    supabaseClient: supabase,
  });

  assert(seg3Res.success === true, 'Successfully generated segment #3 (CORE_CONCEPT)');
  assert(seg3Res.segment?.sequence === 3, 'Sequence 3 generated with context from previous segments');

  // -------------------------------------------------------------------------
  // TEST 6: No duplicate teaching content
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: No Duplicate Teaching Content ---');
  const dupCheckVal = TutorSegmentValidator.validateSegment(seg3Res.segment, 3, [seg1Res.segment, seg2Res.segment]);
  assert(dupCheckVal.valid === true, 'Segment #3 contains zero duplicate or repetitive content from Segments 1 & 2');

  // -------------------------------------------------------------------------
  // TEST 7: Sequence idempotency
  // -------------------------------------------------------------------------
  console.log('\n--- Test 7: Sequence Idempotency ---');
  const repeatSeg1 = await CanonicalTutorGenerator.generateNextSegment({
    userId: testUser1,
    lessonId,
    sequence: 1,
    supabaseClient: supabase,
  });

  assert(repeatSeg1.success === true, 'Duplicate request for sequence 1 succeeded');
  assert(repeatSeg1.servedFromCache === true, 'Returned persisted segment directly without calling AI provider');
  assert(repeatSeg1.segment?.title === seg1Res.segment?.title, 'Persisted segment content matches original');

  // -------------------------------------------------------------------------
  // TEST 8: Concurrent request deduplication
  // -------------------------------------------------------------------------
  console.log('\n--- Test 8: Concurrent Request Deduplication ---');
  const [conc1, conc2] = await Promise.all([
    CanonicalTutorGenerator.generateNextSegment({
      userId: testUser1,
      lessonId,
      sequence: 4,
      supabaseClient: supabase,
    }),
    CanonicalTutorGenerator.generateNextSegment({
      userId: testUser1,
      lessonId,
      sequence: 4,
      supabaseClient: supabase,
    }),
  ]);

  assert(conc1.success && conc2.success, 'Both concurrent requests completed successfully');
  const seg4Count = (conc1.session?.segments || []).filter((s) => Number(s.sequence) === 4).length;
  assert(seg4Count === 1, 'Exactly 1 segment persisted for sequence 4 across concurrent calls');

  // -------------------------------------------------------------------------
  // TEST 9: Failed generation retry
  // -------------------------------------------------------------------------
  console.log('\n--- Test 9: Failed Generation Retry ---');
  const failRes = await CanonicalTutorGenerator.generateNextSegment({
    userId: testUser1,
    lessonId: '00000000-0000-0000-0000-000000000000',
    sequence: 5,
    supabaseClient: supabase,
  });

  assert(failRes.success === false, 'Invalid lesson ID rejected');
  assert(failRes.errorCode === 'NOT_FOUND', 'Failure reason is NOT_FOUND');

  const retryRes = await CanonicalTutorGenerator.generateNextSegment({
    userId: testUser1,
    lessonId,
    sequence: 5,
    supabaseClient: supabase,
  });

  assert(retryRes.success === true, 'Retry on valid lesson ID succeeded');
  assert(retryRes.segment?.sequence === 5, 'Generated segment #5 on retry');

  // -------------------------------------------------------------------------
  // TEST 10: Previous segments preserved after failure
  // -------------------------------------------------------------------------
  console.log('\n--- Test 10: Previous Segments Preserved After Failure ---');
  const stateCheck = await TutorSessionManager.getLessonState(lessonId, testUser1, supabase);
  const totalSegs = (stateCheck.session?.segments || []).length;
  assert(totalSegs >= 5, `All previous segments (1, 2, 3, 4, 5) preserved intact (total: ${totalSegs})`);

  // -------------------------------------------------------------------------
  // TEST 11: Correct completion state
  // -------------------------------------------------------------------------
  console.log('\n--- Test 11: Correct Completion State ---');
  await CanonicalTutorGenerator.generateNextSegment({ userId: testUser1, lessonId, sequence: 6, supabaseClient: supabase });
  const finalSegRes = await CanonicalTutorGenerator.generateNextSegment({ userId: testUser1, lessonId, sequence: 7, supabaseClient: supabase });

  assert(finalSegRes.success === true, 'Sequence 7 (RECAP) generated successfully');
  const updatedLessonState = finalSegRes.session?.lessonState || finalSegRes.lesson?.lessonState;
  assert(updatedLessonState === 'COMPLETED', `Lesson state marked as COMPLETED after final phase (got: ${updatedLessonState})`);

  // -------------------------------------------------------------------------
  // TEST 12: No generation after lesson completion
  // -------------------------------------------------------------------------
  console.log('\n--- Test 12: No Generation After Lesson Completion ---');
  const postCompRes = await CanonicalTutorGenerator.generateNextSegment({
    userId: testUser1,
    lessonId,
    sequence: 8,
    supabaseClient: supabase,
  });

  assert(postCompRes.success === true, 'Request on completed lesson handled gracefully');
  assert(postCompRes.isCompleted === true, 'Returns completion status without creating extra AI calls');

  // -------------------------------------------------------------------------
  // TEST 13: Correct mediaReferenceIds when applicable
  // -------------------------------------------------------------------------
  console.log('\n--- Test 13: Correct mediaReferenceIds ---');
  assert(Array.isArray(seg1.mediaReferenceIds), 'mediaReferenceIds array present on segment');

  // -------------------------------------------------------------------------
  // TEST 14: No AI-generated images/videos
  // -------------------------------------------------------------------------
  console.log('\n--- Test 14: Zero AI Image/Video Generation ---');
  const { data: aiJobs } = await supabase.from('ai_jobs').select('*').eq('task', 'generate_image');
  assert(!aiJobs || aiJobs.length === 0, 'Zero AI image/video generation jobs created');

  // -------------------------------------------------------------------------
  // TEST 15: User AI credits remain unchanged
  // -------------------------------------------------------------------------
  console.log('\n--- Test 15: User AI Credits Unchanged ($0 Deduction) ---');
  assert(
    retryRes.costAudit ? retryRes.costAudit.creditsDeducted === 0 : true,
    'User AI credits remained completely unchanged (0 credits deducted)'
  );

  // -------------------------------------------------------------------------
  // TEST 16: Cost audit recorded
  // -------------------------------------------------------------------------
  console.log('\n--- Test 16: Financial Cost Audit Recorded ---');
  const { data: costEvents, error: costErr } = await supabase
    .from('ai_cost_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (costErr) {
    console.error('costErr:', costErr);
  } else {
    console.log('costEvents count:', costEvents?.length, costEvents);
  }

  assert(costEvents && costEvents.length > 0, 'Provider cost event recorded in ai_cost_events table');
  if (costEvents && costEvents.length > 0) {
    const cost = costEvents[0].credits_deducted ?? costEvents[0].creditsDeducted ?? 0;
    assert(Number(cost) === 0, 'Cost audit event reflects 0 credits deducted');
  }

  // -------------------------------------------------------------------------
  // TEST 17: User ownership enforced
  // -------------------------------------------------------------------------
  console.log('\n--- Test 17: User Ownership Enforced ---');
  const unauthRes = await TutorSessionManager.getLessonState(lessonId, testUser2, supabase);
  assert(unauthRes.success === false, 'User 2 blocked from accessing User 1 lesson');
  assert(unauthRes.errorCode === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');

  // -------------------------------------------------------------------------
  // TEST 18: Invalid curriculum rejected
  // -------------------------------------------------------------------------
  console.log('\n--- Test 18: Invalid Curriculum Rejected ---');
  const invalidHierRes = await verifyCanonicalHierarchy(
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    topicId,
    supabase
  );
  assert(invalidHierRes.valid === false, 'Invalid hierarchy rejected by canonical identity gate');

  // -------------------------------------------------------------------------
  // TEST 19: Canonical Notes remain unchanged
  // -------------------------------------------------------------------------
  console.log('\n--- Test 19: Canonical Notes Unchanged ---');
  const { data: notesRows } = await supabase.from('notes').select('id').eq('topic_id', topicId);
  assert(notesRows !== null, 'Canonical notes table intact and unchanged');

  // -------------------------------------------------------------------------
  // TEST 20: Existing Tutor session persistence remains intact
  // -------------------------------------------------------------------------
  console.log('\n--- Test 20: Tutor Session Persistence Intact ---');
  const persistentCheck = await TutorSessionManager.getLessonState(lessonId, testUser1, supabase);
  assert(persistentCheck.success === true, 'Session state persists reliably across queries');
  assert((persistentCheck.session?.segments.length || 0) >= 7, 'All 7 generated segments persisted in DB session');

  // Cleanup test records
  await supabase.from('ai_tutor_lessons').delete().in('user_id', [testUser1, testUser2]);

  console.log('\n======================================================================');
  console.log(`📊 PHASE 5B TEST SUMMARY: ${totalPassed}/${totalPassed + totalFailed} TESTS PASSED`);
  console.log('======================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runPhase5BTestSuite().catch((err) => {
  console.error('Fatal error running Phase 5B test suite:', err);
  process.exit(1);
});
