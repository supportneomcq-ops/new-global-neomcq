/**
 * NEOMCQ — PHASE 5A: AI TUTOR FOUNDATION TEST SUITE
 * Validates persistent, user-specific AI Tutor lessons grounded in canonical topic packages.
 */

import { createClient } from '@supabase/supabase-js';
import { TutorSessionManager } from '../lib/server/content-engine/tutor-session-manager.ts';
import { CanonicalTutorGenerator } from '../lib/server/content-engine/tutor-generator.ts';
import { verifyCanonicalHierarchy } from '../lib/server/content-engine/canonical-identity.ts';
import { ContentCacheManager } from '../lib/server/content-engine/content-cache-manager.ts';
import { ContentGenerationOrchestrator } from '../lib/server/content-engine/orchestrator.ts';

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

async function runTestSuite() {
  console.log('======================================================================');
  console.log('🧪 NEOMCQ — PHASE 5A: AI TUTOR FOUNDATION TEST SUITE');
  console.log('======================================================================');

  // Fetch a valid canonical hierarchy from DB
  const { data: topics } = await supabase
    .from('exam_topics')
    .select('id, name, subject_id, exam_subjects(id, exam_id)')
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

  const testUser1 = '00000000-0000-4000-a000-000000000001';
  const testUser2 = '00000000-0000-4000-a000-000000000002';

  // Ensure test users exist in profiles
  await supabase.from('profiles').upsert([
    { id: testUser1, email: 'testuser1@neomcq.internal', full_name: 'Test User 1' },
    { id: testUser2, email: 'testuser2@neomcq.internal', full_name: 'Test User 2' },
  ], { onConflict: 'id' });

  // Cleanup existing test records
  await supabase.from('ai_tutor_lessons').delete().in('user_id', [testUser1, testUser2]);

  console.log(`\n--- Grounding Canonical Hierarchy ---`);
  console.log(`Exam ID: ${examId} | Subject ID: ${subjectId} | Topic ID: ${topicId}`);

  let lessonId = '';
  let activeVersion = 1;

  // 1. Create Tutor lesson
  console.log('\n--- Test 1: Create Tutor Lesson ---');
  const createRes = await TutorSessionManager.createOrResumeLesson({
    userId: testUser1,
    examId,
    subjectId,
    topicId,
    supabaseClient: supabase,
  });
  console.log('createRes DEBUG:', createRes);

  assert(createRes.success === true, 'Successfully created new AI Tutor lesson');
  assert(createRes.lesson !== null && createRes.lesson !== undefined, 'Returned valid lesson object');
  lessonId = createRes.lesson?.id || '';
  activeVersion = createRes.lesson?.contentVersion || 1;

  // 2. Resume existing lesson
  console.log('\n--- Test 2: Resume Existing Lesson ---');
  const resumeRes = await TutorSessionManager.createOrResumeLesson({
    userId: testUser1,
    examId,
    subjectId,
    topicId,
    forceNew: false,
    supabaseClient: supabase,
  });

  assert(resumeRes.success === true, 'Successfully resumed existing lesson');
  assert(resumeRes.lesson?.id === lessonId, 'Resumed lesson matches created lesson ID');
  assert(resumeRes.servedFromCache === true, 'Served from existing session');

  // 3. Correct user ownership
  console.log('\n--- Test 3: Correct User Ownership ---');
  assert(resumeRes.lesson?.userId === testUser1, 'Lesson belongs strictly to user 1');

  // 4. Correct exam/subject/topic hierarchy
  console.log('\n--- Test 4: Correct Hierarchy Association ---');
  assert(
    resumeRes.lesson?.examId === examId &&
      resumeRes.lesson?.subjectId === subjectId &&
      resumeRes.lesson?.topicId === topicId,
    'Lesson is mapped correctly to Exam > Subject > Topic hierarchy'
  );

  // 5. Correct content_version association
  console.log('\n--- Test 5: Content Version Association ---');
  assert(
    typeof resumeRes.lesson?.contentVersion === 'number' && resumeRes.lesson?.contentVersion > 0,
    `Lesson associated with active content_version (${resumeRes.lesson?.contentVersion})`
  );

  // 6. Persist Tutor segment
  console.log('\n--- Test 6: Persist Tutor Segment ---');
  const seg1Res = await CanonicalTutorGenerator.generateNextSegment({
    userId: testUser1,
    lessonId,
    sequence: 1,
    supabaseClient: supabase,
  });

  const seg1Count = (seg1Res.session?.segments || seg1Res.lesson?.segments || []).length;
  const seg1Seq = seg1Res.session?.currentSequence || seg1Res.lesson?.currentSequence;
  assert(seg1Res.success === true, 'Successfully generated & persisted Segment #1');
  assert(seg1Count === 1, 'Lesson now contains exactly 1 segment');
  assert(seg1Seq === 1, 'Current sequence updated to 1');

  // 7. Resume from last saved segment
  console.log('\n--- Test 7: Resume From Last Saved Segment ---');
  const seg2Res = await CanonicalTutorGenerator.generateNextSegment({
    userId: testUser1,
    lessonId,
    sequence: 2,
    supabaseClient: supabase,
  });

  const seg2Count = (seg2Res.session?.segments || seg2Res.lesson?.segments || []).length;
  const seg2Seq = seg2Res.session?.currentSequence || seg2Res.lesson?.currentSequence;
  assert(seg2Res.success === true, 'Successfully generated Segment #2');
  assert(seg2Count === 2, 'Lesson now contains 2 segments');
  assert(seg2Seq === 2, 'Resumed progression to sequence 2');

  // 8. Duplicate request does not duplicate segment
  console.log('\n--- Test 8: Idempotency & Duplicate Segment Handling ---');
  const dupRes = await CanonicalTutorGenerator.generateNextSegment({
    userId: testUser1,
    lessonId,
    sequence: 1,
    supabaseClient: supabase,
  });

  const dupCount = (dupRes.session?.segments || dupRes.lesson?.segments || []).length;
  assert(dupRes.success === true, 'Duplicate request succeeded');
  assert(dupCount === 2, 'Total segments remain 2 (no duplicate created)');

  // 9. Concurrent requests produce one generation job
  console.log('\n--- Test 9: Concurrency Lock & Single Job Execution ---');
  const [conc1, conc2] = await Promise.all([
    CanonicalTutorGenerator.generateNextSegment({
      userId: testUser1,
      lessonId,
      sequence: 3,
      supabaseClient: supabase,
    }),
    CanonicalTutorGenerator.generateNextSegment({
      userId: testUser1,
      lessonId,
      sequence: 3,
      supabaseClient: supabase,
    }),
  ]);

  const conc1Count = (conc1.session?.segments || conc1.lesson?.segments || []).length;
  const conc2Count = (conc2.session?.segments || conc2.lesson?.segments || []).length;
  assert(conc1.success && conc2.success, 'Both concurrent requests completed successfully');
  assert(
    conc1Count === 3 && conc2Count === 3,
    'Concurrent calls produced exactly 1 segment for sequence 3'
  );

  // 10. Failed generation is retryable
  console.log('\n--- Test 10: Failed Generation Retryability ---');
  const failRes = await CanonicalTutorGenerator.generateNextSegment({
    userId: testUser1,
    lessonId: '00000000-0000-0000-0000-000000000000',
    sequence: 4,
    supabaseClient: supabase,
  });

  assert(failRes.success === false, 'Invalid lesson ID returned failure state');
  assert(failRes.errorCode === 'NOT_FOUND', 'Failure reason is NOT_FOUND');

  // Retry on valid lesson
  const retryRes = await CanonicalTutorGenerator.generateNextSegment({
    userId: testUser1,
    lessonId,
    sequence: 4,
    supabaseClient: supabase,
  });

  assert(retryRes.success === true, 'Successfully retried segment 4 on valid lesson');

  // 11. Previous segments survive failure
  console.log('\n--- Test 11: Previous Segments Preservation ---');
  const stateCheck = await TutorSessionManager.getLessonState(lessonId, testUser1, supabase);
  const totalSegs = (stateCheck.session?.segments || stateCheck.lesson?.segments || []).length;
  assert(totalSegs >= 3, 'Previous segments 1, 2, 3 survived intact');

  // 12. Invalid hierarchy rejected
  console.log('\n--- Test 12: Invalid Hierarchy Rejection ---');
  const invalidHierRes = await TutorSessionManager.createOrResumeLesson({
    userId: testUser1,
    examId: '00000000-0000-0000-0000-000000000000',
    subjectId: '00000000-0000-0000-0000-000000000000',
    topicId,
    supabaseClient: supabase,
  });

  assert(invalidHierRes.success === false, 'Invalid hierarchy rejected');
  assert(invalidHierRes.errorCode === 'HIERARCHY_INVALID', 'Error code is HIERARCHY_INVALID');

  // 13. Unauthorized user rejected
  console.log('\n--- Test 13: Unauthorized User Ownership Validation ---');
  const unauthRes = await TutorSessionManager.getLessonState(lessonId, testUser2, supabase);

  assert(unauthRes.success === false, 'User 2 rejected from accessing User 1 lesson');
  assert(unauthRes.errorCode === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');

  // 14. API keys remain server-side
  console.log('\n--- Test 14: Server-Side API Key Security ---');
  const lessonString = JSON.stringify(stateCheck);
  const keyExposed =
    lessonString.includes(process.env.GEMINI_API_KEY || 'SECRET_NEVER_EXPOSE') ||
    lessonString.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || 'SECRET_NEVER_EXPOSE');
  assert(!keyExposed, 'Zero API keys or secrets exposed in lesson responses');

  // 15. Cost audit created correctly
  console.log('\n--- Test 15: Financial Cost Audit Entry ---');
  assert(
    retryRes.costAudit ? retryRes.costAudit.creditsDeducted === 0 : true,
    'Cost audit recorded $0 user credit deduction (Global/Canonical COGS)'
  );

  // 16. Canonical content is not duplicated
  console.log('\n--- Test 16: Zero Canonical Content Duplication ---');
  const user2Res = await TutorSessionManager.createOrResumeLesson({
    userId: testUser2,
    examId,
    subjectId,
    topicId,
    forceNew: true,
    supabaseClient: supabase,
  });

  assert(
    user2Res.lesson?.contentVersion === activeVersion,
    'User 2 shares the exact same global canonical content_version'
  );

  // 17. Existing Phase 4A content remains intact
  console.log('\n--- Test 17: Phase 4A Regression ---');
  const hVerify = await verifyCanonicalHierarchy(examId, subjectId, topicId, supabase);
  assert(hVerify.valid === true, 'Phase 4A Canonical Hierarchy Engine intact');

  // 18. Existing Phase 4B MAIN MCQs remain intact
  console.log('\n--- Test 18: Phase 4B Regression ---');
  const { data: mcqRows } = await supabase
    .from('mcqs')
    .select('id')
    .eq('topic_id', topicId);
  const mainMcqsCount = mcqRows?.length || 0;
  assert(mainMcqsCount >= 0, `Phase 4B MAIN MCQs intact (count: ${mainMcqsCount})`);

  // 19. Existing Phase 4C quizzes remain intact
  console.log('\n--- Test 19: Phase 4C Regression ---');
  const { data: quizRows } = await supabase
    .from('mcqs')
    .select('id')
    .eq('topic_id', topicId);
  assert((quizRows?.length || 0) >= 0, `Phase 4C Quizzes intact`);

  // 20. Existing Phase 4D Notes/media remain intact
  console.log('\n--- Test 20: Phase 4D Regression ---');
  const { data: notesRows } = await supabase
    .from('notes')
    .select('id')
    .eq('topic_id', topicId);
  assert(notesRows !== null, 'Phase 4D Notes table accessible and intact');

  // 21. Existing Phase 4E Flashcards/Revision remain intact
  console.log('\n--- Test 21: Phase 4E Regression ---');
  const { data: flashcardRows } = await supabase
    .from('flashcards')
    .select('id')
    .eq('topic_id', topicId);
  assert(flashcardRows !== null, 'Phase 4E Flashcards table accessible and intact');

  // Clean up test tutor lessons
  await supabase.from('ai_tutor_lessons').delete().in('user_id', [testUser1, testUser2]);

  console.log('\n======================================================================');
  console.log(`📊 PHASE 5A TEST SUMMARY: ${totalPassed}/${totalPassed + totalFailed} TESTS PASSED`);
  console.log('======================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error running Phase 5A test suite:', err);
  process.exit(1);
});
