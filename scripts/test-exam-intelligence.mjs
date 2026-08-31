import { createAdminClient as getSupabaseAdmin } from '../lib/supabase/admin.ts'
import { resolveExam, resolveSubject, resolveTopic, resolveCurriculumRequest } from '../lib/server/exam-intelligence/index.ts'

console.log('--- STARTING EXAM INTELLIGENCE FOUNDATION (PHASE 3A) TEST SUITE ---')

const testCases = [
  { id: 1, name: 'Existing exam -> exact match', fn: () => resolveExam({ examInput: 'FMGE' }) },
  { id: 2, name: 'Existing exam -> normalized match', fn: () => resolveExam({ examInput: '  fmge  ' }) },
  { id: 3, name: 'Existing subject -> match', fn: () => resolveSubject({ examInput: 'FMGE', subjectInput: 'Anatomy' }) },
  { id: 4, name: 'Existing topic -> match', fn: () => resolveTopic({ examInput: 'FMGE', subjectInput: 'Anatomy', topicInput: 'Upper Limb' }) },
  { id: 5, name: 'Valid new subject', fn: () => resolveSubject({ examInput: 'FMGE', subjectInput: 'Molecular Nanomedicine & Bioengineering' }) },
  { id: 6, name: 'Valid new topic', fn: () => resolveTopic({ examInput: 'FMGE', subjectInput: 'Anatomy', topicInput: 'Flexor Digitorum Profundus Insertion Anomalies' }) },
  { id: 7, name: 'Duplicate subject request', fn: () => resolveSubject({ examInput: 'FMGE', subjectInput: 'Human Anatomy' }) },
  { id: 8, name: 'Duplicate topic request', fn: () => resolveTopic({ examInput: 'FMGE', subjectInput: 'Anatomy', topicInput: 'Upper Limb Anatomy' }) },
  { id: 9, name: 'Semantically similar topic', fn: () => resolveTopic({ examInput: 'FMGE', subjectInput: 'Anatomy', topicInput: 'Nerve supply of upper extremity' }) },
  { id: 10, name: 'Unrelated subject', fn: () => resolveSubject({ examInput: 'FMGE', subjectInput: 'Income Tax & Corporate Auditing' }) },
  { id: 11, name: 'Unrelated topic', fn: () => resolveTopic({ examInput: 'FMGE', subjectInput: 'Anatomy', topicInput: 'Income Tax Return Filing' }) },
  { id: 12, name: 'Invalid exam/subject combination', fn: () => resolveSubject({ examInput: 'Grocery Shopping List 99999', subjectInput: 'Anatomy' }) },
]

async function runAllTests() {
  let passedCount = 0
  let failedCount = 0

  for (const tc of testCases) {
    console.log(`\n----------------------------------------`)
    console.log(`RUNNING SCENARIO ${tc.id}: ${tc.name}`)
    try {
      const result = await tc.fn()
      console.log(`RESULT:`, JSON.stringify(result, null, 2))

      let pass = false
      if (tc.id === 1 || tc.id === 2) {
        pass = result.entity_type === 'EXAM' && ['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH'].includes(result.decision)
      } else if (tc.id === 3 || tc.id === 4) {
        pass = (result.entity_type === 'SUBJECT' || result.entity_type === 'TOPIC') && ['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH', 'SEMANTIC_MATCH'].includes(result.decision)
      } else if (tc.id === 5 || tc.id === 6) {
        pass = ['VALID_NEW', 'SEMANTIC_MATCH'].includes(result.decision)
      } else if (tc.id === 7 || tc.id === 8 || tc.id === 9) {
        pass = ['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH', 'SEMANTIC_MATCH'].includes(result.decision)
      } else if (tc.id === 10 || tc.id === 11 || tc.id === 12) {
        pass = result.decision === 'INVALID'
      }

      if (pass) {
        console.log(`✅ SCENARIO ${tc.id} PASSED`)
        passedCount++
      } else {
        console.log(`❌ SCENARIO ${tc.id} UNEXPECTED RESULT`)
        failedCount++
      }
    } catch (err) {
      console.error(`❌ SCENARIO ${tc.id} EXCEPTION:`, err)
      failedCount++
    }
  }

  console.log(`\n========================================`)
  console.log(`FINAL RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`)
  console.log(`========================================`)
}

runAllTests().catch(console.error)
