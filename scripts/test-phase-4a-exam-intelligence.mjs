/**
 * NEOMCQ — AUTOMATED TEST SUITE FOR PHASE 4A: EXAM INTELLIGENCE & CANONICAL HIERARCHY
 */

import {
  resolveExam,
  resolveSubject,
  resolveTopic,
  resolveCurriculumRequest,
} from '../lib/server/exam-intelligence/index.ts';

console.log('===============================================================');
console.log('  NEOMCQ — PHASE 4A: EXAM INTELLIGENCE VERIFICATION SUITE');
console.log('===============================================================');

const mockExamId = '58f5bdea-8637-4631-9723-e7f74a0c4543';
const mockSubjectId = 'b23e0d75-feb3-4c93-8f92-eb8e466be643';
const mockTopicId = 'c34e0d75-feb3-4c93-8f92-eb8e466be644';

const testCases = [
  {
    id: 1,
    name: 'Existing exam -> exact match',
    fn: async () => {
      const res = await resolveExam({ examInput: 'FMGE' });
      return res.entity_type === 'EXAM' && ['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH'].includes(res.decision) && res.canonical_id !== null;
    }
  },
  {
    id: 2,
    name: 'Existing exam -> normalized match',
    fn: async () => {
      const res = await resolveExam({ examInput: '  fmge  ' });
      return res.entity_type === 'EXAM' && ['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH'].includes(res.decision) && res.canonical_id !== null;
    }
  },
  {
    id: 3,
    name: 'Existing subject -> match',
    fn: async () => {
      const res = await resolveSubject({ examInput: 'FMGE', subjectInput: 'Anatomy' });
      return res.entity_type === 'SUBJECT' && ['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH', 'SEMANTIC_MATCH'].includes(res.decision) && res.canonical_id !== null;
    }
  },
  {
    id: 4,
    name: 'Existing topic -> match',
    fn: async () => {
      const res = await resolveTopic({ examInput: 'FMGE', subjectInput: 'Anatomy', topicInput: 'Upper & Lower Limb Anatomy' });
      return res.entity_type === 'TOPIC' && ['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH', 'SEMANTIC_MATCH'].includes(res.decision) && res.canonical_id !== null;
    }
  },
  {
    id: 5,
    name: 'Resolve whole curriculum request hierarchy',
    fn: async () => {
      const res = await resolveCurriculumRequest({ exam: 'FMGE', subject: 'Anatomy', topic: 'Upper & Lower Limb Anatomy' });
      return ['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH', 'SEMANTIC_MATCH'].includes(res.decision) && res.exam_id !== null && res.subject_id !== null && res.topic_id !== null;
    }
  },
  {
    id: 6,
    name: 'Hierarchy rejection for non-existent / gibberish exam',
    fn: async () => {
      const res = await resolveExam({ examInput: 'Grocery Shopping List 99999' });
      return res.entity_type === 'EXAM' && (res.decision === 'INVALID' || res.decision === 'NEEDS_REVIEW') && res.canonical_id === null;
    }
  }
];

async function run() {
  let passed = 0;
  for (const tc of testCases) {
    try {
      const ok = await tc.fn();
      if (ok) {
        console.log(`  [PASS] Test ${tc.id}: ${tc.name}`);
        passed++;
      } else {
        console.error(`  [FAIL] Test ${tc.id}: ${tc.name}`);
      }
    } catch (e) {
      console.error(`  [ERROR] Test ${tc.id}: ${tc.name}`, e);
    }
  }
  console.log('===============================================================');
  console.log(`  PHASE 4A TEST RESULTS: ${passed}/${testCases.length} PASSED`);
  console.log('===============================================================');
  if (passed !== testCases.length) {
    process.exit(1);
  }
}

run();
