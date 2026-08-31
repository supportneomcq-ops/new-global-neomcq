import {
  resolveExam,
  resolveSubject,
  resolveTopic,
  resolveCurriculumRequest,
  ExamIntelligenceResult,
} from '../index'

/**
 * NeoMCQ Exam Intelligence Foundation (Phase 3A) Test Suite
 * Covers 12 core resolution & relevance validation scenarios.
 */
describe('Exam Intelligence Foundation - Phase 3A Test Suite', () => {
  // Scenario 1: Existing exam -> exact match
  test('1. Existing exam -> exact match', async () => {
    const res = await resolveExam({ examInput: 'FMGE' })
    expect(res.entity_type).toBe('EXAM')
    expect(['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH']).toContain(res.decision)
    expect(res.canonical_id).not.toBeNull()
    expect(res.exam_id).not.toBeNull()
    expect(res.confidence).toBeGreaterThanOrEqual(0.9)
  })

  // Scenario 2: Existing exam -> normalized match
  test('2. Existing exam -> normalized match', async () => {
    const res = await resolveExam({ examInput: '  fmge  ' })
    expect(res.entity_type).toBe('EXAM')
    expect(['EXACT_MATCH', 'NORMALIZED_MATCH']).toContain(res.decision)
    expect(res.canonical_id).not.toBeNull()
  })

  // Scenario 3: Existing subject -> match
  test('3. Existing subject -> match', async () => {
    const res = await resolveSubject({ examInput: 'FMGE', subjectInput: 'Anatomy' })
    expect(res.entity_type).toBe('SUBJECT')
    expect(['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH', 'SEMANTIC_MATCH']).toContain(res.decision)
    expect(res.canonical_id).not.toBeNull()
    expect(res.subject_id).not.toBeNull()
  })

  // Scenario 4: Existing topic -> match
  test('4. Existing topic -> match', async () => {
    const res = await resolveTopic({ examInput: 'FMGE', subjectInput: 'Anatomy', topicInput: 'Upper Limb' })
    expect(res.entity_type).toBe('TOPIC')
    expect(['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH', 'SEMANTIC_MATCH']).toContain(res.decision)
    expect(res.canonical_id).not.toBeNull()
    expect(res.topic_id).not.toBeNull()
  })

  // Scenario 5: Valid new subject
  test('5. Valid new subject', async () => {
    const res = await resolveSubject({ examInput: 'FMGE', subjectInput: 'Molecular Nanomedicine & Bioengineering' })
    expect(res.entity_type).toBe('SUBJECT')
    expect(['VALID_NEW', 'SEMANTIC_MATCH']).toContain(res.decision)
    if (res.decision === 'VALID_NEW') {
      expect(res.canonical_id).toBeNull()
    }
  })

  // Scenario 6: Valid new topic
  test('6. Valid new topic', async () => {
    const res = await resolveTopic({ examInput: 'FMGE', subjectInput: 'Anatomy', topicInput: 'Flexor Digitorum Profundus Insertion Anomalies' })
    expect(res.entity_type).toBe('TOPIC')
    expect(['VALID_NEW', 'SEMANTIC_MATCH']).toContain(res.decision)
    if (res.decision === 'VALID_NEW') {
      expect(res.canonical_id).toBeNull()
    }
  })

  // Scenario 7: Duplicate subject request
  test('7. Duplicate subject request', async () => {
    const res = await resolveSubject({ examInput: 'FMGE', subjectInput: 'Human Anatomy' })
    expect(res.entity_type).toBe('SUBJECT')
    expect(['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH', 'SEMANTIC_MATCH']).toContain(res.decision)
    expect(res.canonical_id).not.toBeNull()
  })

  // Scenario 8: Duplicate topic request
  test('8. Duplicate topic request', async () => {
    const res = await resolveTopic({ examInput: 'FMGE', subjectInput: 'Anatomy', topicInput: 'Upper Limb Anatomy' })
    expect(res.entity_type).toBe('TOPIC')
    expect(['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH', 'SEMANTIC_MATCH']).toContain(res.decision)
    expect(res.canonical_id).not.toBeNull()
  })

  // Scenario 9: Semantically similar topic
  test('9. Semantically similar topic', async () => {
    const res = await resolveTopic({ examInput: 'FMGE', subjectInput: 'Anatomy', topicInput: 'Nerve supply of upper extremity' })
    expect(res.entity_type).toBe('TOPIC')
    expect(['SEMANTIC_MATCH', 'ALIAS_MATCH', 'EXACT_MATCH', 'NORMALIZED_MATCH']).toContain(res.decision)
  })

  // Scenario 10: Unrelated subject
  test('10. Unrelated subject', async () => {
    const res = await resolveSubject({ examInput: 'FMGE', subjectInput: 'Income Tax & Corporate Auditing' })
    expect(res.entity_type).toBe('SUBJECT')
    expect(res.decision).toBe('INVALID')
    expect(res.canonical_id).toBeNull()
    expect(res.reason.toLowerCase()).toMatch(/(not relevant|invalid|unrelated|tax)/i)
  })

  // Scenario 11: Unrelated topic
  test('11. Unrelated topic', async () => {
    const res = await resolveTopic({ examInput: 'FMGE', subjectInput: 'Anatomy', topicInput: 'Income Tax Return Filing' })
    expect(res.entity_type).toBe('TOPIC')
    expect(res.decision).toBe('INVALID')
    expect(res.canonical_id).toBeNull()
    expect(res.reason.toLowerCase()).toMatch(/(not relevant|invalid|unrelated|tax)/i)
  })

  // Scenario 12: Invalid exam/subject combination
  test('12. Invalid exam/subject combination', async () => {
    const res = await resolveSubject({ examInput: 'Grocery Shopping List 99999', subjectInput: 'Anatomy' })
    expect(res.entity_type).toBe('SUBJECT')
    expect(res.decision).toBe('INVALID')
    expect(res.canonical_id).toBeNull()
    expect(res.reason.toLowerCase()).toMatch(/(invalid|not an examination)/i)
  })
})
