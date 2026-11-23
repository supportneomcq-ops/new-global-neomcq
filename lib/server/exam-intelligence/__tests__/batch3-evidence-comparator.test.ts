import {
  areEntitiesContextuallyIdentical,
  compareCurricula,
  detectAndValidateExamRules,
  evaluateEvidenceAndStatus,
  findMatchingTopicInList,
} from '../curriculum-comparator'
import { AIExamIntelligenceOutputSchema } from '../types'

function createCompleteComparisonReport() {
  const expectedSpec = AIExamIntelligenceOutputSchema.parse({
    exam: { name: 'FMGE' },
    subjects: [{ name: 'Anatomy', topics: [{ name: 'Upper Limb' }] }],
  })
  const persistedSubjects = [
    { name: 'Anatomy', exam_topics: [{ name: 'Upper Limb' }] },
  ]

  return compareCurricula('exam-fmge', 'FMGE', expectedSpec, persistedSubjects)
}

describe('NeoMCQ Batch 3: Evidence-Aware Curriculum Comparator & Contextual Identity Test Suite', () => {
  describe('Contextual Entity Identity (areEntitiesContextuallyIdentical)', () => {
    test('Identical names and canonical synonyms match', () => {
      expect(areEntitiesContextuallyIdentical('Cardiology', 'Cardiology', { entityType: 'SUBJECT' })).toBe(true)
      expect(areEntitiesContextuallyIdentical('Human Anatomy', 'Anatomy', { entityType: 'SUBJECT' })).toBe(true)
    })

    test('Prevents false-positive merge of different Steps / Parts / Papers', () => {
      expect(areEntitiesContextuallyIdentical('USMLE Step 1', 'USMLE Step 2', { entityType: 'EXAM' })).toBe(false)
      expect(areEntitiesContextuallyIdentical('MRCP Part 1', 'MRCP Part 2', { entityType: 'EXAM' })).toBe(false)
      expect(
        areEntitiesContextuallyIdentical(
          'General Studies Paper 1',
          'General Studies Paper 2',
          { entityType: 'SUBJECT' }
        )
      ).toBe(false)
      expect(areEntitiesContextuallyIdentical('Physics Class 11', 'Physics Class 12', { entityType: 'SUBJECT' })).toBe(false)
      expect(areEntitiesContextuallyIdentical('Section A', 'Section B', { entityType: 'SUBJECT' })).toBe(false)
    })

    test('Prevents false-positive merge of antagonistic domain qualifiers', () => {
      expect(areEntitiesContextuallyIdentical('General Pathology', 'Systemic Pathology', { entityType: 'SUBJECT' })).toBe(false)
      expect(areEntitiesContextuallyIdentical('Organic Chemistry', 'Inorganic Chemistry', { entityType: 'SUBJECT' })).toBe(false)
      expect(areEntitiesContextuallyIdentical('Macroeconomics', 'Microeconomics', { entityType: 'SUBJECT' })).toBe(false)
      expect(areEntitiesContextuallyIdentical('Pediatric Surgery', 'General Surgery', { entityType: 'SUBJECT' })).toBe(false)
    })

    test('Matches topics only within the supplied parent curriculum list', () => {
      const cardiologyTopics = [{ id: 'topic-cardio', name: 'Hypertension' }]
      const pediatricsTopics = [{ id: 'topic-peds', name: 'Pediatric Hypertension' }]

      expect(findMatchingTopicInList('Hypertension', cardiologyTopics, 'Cardiology')).toBe(cardiologyTopics[0])
      expect(findMatchingTopicInList('Hypertension', pediatricsTopics, 'Pediatrics')).toBeNull()
    })
  })

  describe('Curriculum Comparator (compareCurricula)', () => {
    test('Calculates 100% coverage for a complete hierarchy match', () => {
      const expectedSpec = AIExamIntelligenceOutputSchema.parse({
        exam: { name: 'FMGE' },
        subjects: [
          {
            name: 'Anatomy',
            topics: [{ name: 'Upper Limb' }, { name: 'Lower Limb' }],
          },
          {
            name: 'Physiology',
            topics: [{ name: 'Nerve-Muscle' }, { name: 'Cardiovascular' }],
          },
        ],
      })

      const existingHierarchy = [
        {
          name: 'Anatomy',
          exam_topics: [{ name: 'Upper Limb' }, { name: 'Lower Limb' }],
        },
        {
          name: 'Physiology',
          exam_topics: [{ name: 'Nerve-Muscle' }, { name: 'Cardiovascular' }],
        },
      ]

      const report = compareCurricula('exam-fmge', 'FMGE', expectedSpec, existingHierarchy)
      expect(report.coveragePercentage).toBe(100)
      expect(report.hasGaps).toBe(false)
      expect(report.missingHierarchy.subjects).toHaveLength(0)
      expect(report.missingHierarchy.topics).toHaveLength(0)
    })

    test('Detects missing subjects and topics accurately', () => {
      const expectedSpec = AIExamIntelligenceOutputSchema.parse({
        exam: { name: 'FMGE' },
        subjects: [
          {
            name: 'Anatomy',
            topics: [{ name: 'Upper Limb' }, { name: 'Neuroanatomy' }],
          },
          {
            name: 'Pharmacology',
            topics: [{ name: 'General Pharmacology' }, { name: 'Autonomic Pharmacology' }],
          },
        ],
      })

      const existingHierarchy = [
        {
          name: 'Anatomy',
          exam_topics: [{ name: 'Upper Limb' }],
        },
      ]

      const report = compareCurricula('exam-fmge', 'FMGE', expectedSpec, existingHierarchy)
      expect(report.coveragePercentage).toBeLessThan(100)
      expect(report.hasGaps).toBe(true)
      expect(report.missingHierarchy.subjects.some((subject) => subject.name === 'Pharmacology')).toBe(true)
      expect(report.missingHierarchy.topics.some((item) => item.topic.name === 'Neuroanatomy')).toBe(true)
    })
  })

  describe('Evidence and Verification Status (evaluateEvidenceAndStatus)', () => {
    test('Official syllabus is verified only with verified authority, source URL, and current version evidence', () => {
      const status = evaluateEvidenceAndStatus({
        authorityRow: {
          name: 'National Board of Examinations',
          verification_status: 'verified',
          official_website: 'https://natboard.edu.in',
        },
        evidenceRows: [
          {
            source_type: 'official_syllabus',
            publisher_authority: 'NBE',
            verification_status: 'verified',
            source_url: 'https://natboard.edu.in/syllabus/fmge',
          },
        ],
        versionRows: [
          {
            is_current: true,
            verification_status: 'verified',
            version_year: 2026,
            source_url: 'https://natboard.edu.in/syllabus/fmge',
            verified_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        comparisonReport: createCompleteComparisonReport(),
        subjectCount: 19,
        topicCount: 100,
        subtopicCount: 300,
      })

      expect(status.verificationStatus).toBe('verified')
      expect(status.curriculumStatus).toBe('ready')
      expect(status.rulesStatus).toBe('ready')
      expect(status.coveragePercentage).toBe(100)
    })

    test('AI-inferred curriculum remains AI_inferred without verified official evidence', () => {
      const status = evaluateEvidenceAndStatus({
        authorityRow: null,
        evidenceRows: [
          {
            source_type: 'ai_synthesis',
            verification_status: 'partially_verified',
          },
        ],
        versionRows: [],
        comparisonReport: createCompleteComparisonReport(),
        subjectCount: 10,
        topicCount: 50,
        subtopicCount: 150,
      })

      expect(status.verificationStatus).toBe('AI_inferred')
      expect(status.verificationStatus).not.toBe('verified')
      expect(status.curriculumStatus).toBe('ready')
    })
  })

  describe('Exam Rules Validation (detectAndValidateExamRules)', () => {
    test('Uses only verified official evidence when validating exam rules', () => {
      const examRow = {
        question_count: 300,
        time_limit_mins: 210,
        marking_scheme: { positive_mark: 1, negative_mark: 0, has_negative_marking: false },
        question_types: ['single_choice_mcq'],
      }

      const evidenceRows = [
        {
          source_type: 'official_bulletin',
          verification_status: 'verified',
          source_url: 'https://natboard.edu.in/bulletin/fmge',
          extracted_data: {
            question_count: 300,
            duration_minutes: 210,
          },
        },
      ]

      const rules = detectAndValidateExamRules(examRow, [], evidenceRows, null)
      expect(rules.question_count).toBe(300)
      expect(rules.duration_minutes).toBe(210)
      expect(rules.rulesStatus).toBe('ready')
    })
  })
})
