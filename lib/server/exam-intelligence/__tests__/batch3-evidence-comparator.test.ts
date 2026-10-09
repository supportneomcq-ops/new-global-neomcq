import {
  areEntitiesContextuallyIdentical,
  compareCurricula,
  detectAndValidateExamRules,
  evaluateEvidenceAndStatus,
} from '../curriculum-comparator'


describe('NeoMCQ Batch 3: Evidence-Aware Curriculum Comparator & Contextual Identity Test Suite', () => {
  describe('Contextual Entity Identity (areEntitiesContextuallyIdentical)', () => {
    test('Identical names match', () => {
      expect(areEntitiesContextuallyIdentical('Cardiology', 'Cardiology', 'SUBJECT')).toBe(true)
      expect(areEntitiesContextuallyIdentical('Human Anatomy', 'Anatomy', 'SUBJECT')).toBe(true)
      expect(areEntitiesContextuallyIdentical('Obstetrics and Gynecology', 'Obstetrics & Gynaecology', 'SUBJECT')).toBe(true)
    })

    test('Prevents false-positive merge of different Steps / Parts / Papers', () => {
      expect(areEntitiesContextuallyIdentical('USMLE Step 1', 'USMLE Step 2', 'EXAM')).toBe(false)
      expect(areEntitiesContextuallyIdentical('MRCP Part 1', 'MRCP Part 2', 'EXAM')).toBe(false)
      expect(areEntitiesContextuallyIdentical('General Studies Paper 1', 'General Studies Paper 2', 'SUBJECT')).toBe(false)
      expect(areEntitiesContextuallyIdentical('Physics Class 11', 'Physics Class 12', 'SUBJECT')).toBe(false)
      expect(areEntitiesContextuallyIdentical('Section A', 'Section B', 'SUBJECT')).toBe(false)
    })

    test('Prevents false-positive merge of antagonistic domain qualifiers', () => {
      expect(areEntitiesContextuallyIdentical('General Pathology', 'Systemic Pathology', 'SUBJECT')).toBe(false)
      expect(areEntitiesContextuallyIdentical('Organic Chemistry', 'Inorganic Chemistry', 'SUBJECT')).toBe(false)
      expect(areEntitiesContextuallyIdentical('Macroeconomics', 'Microeconomics', 'SUBJECT')).toBe(false)
      expect(areEntitiesContextuallyIdentical('Pediatric Surgery', 'General Surgery', 'SUBJECT')).toBe(false)
    })

    test('Distinguishes parent context when comparing topics', () => {
      expect(
        areEntitiesContextuallyIdentical(
          'Hypertension',
          'Hypertension',
          'TOPIC',
          'Cardiology',
          'Cardiovascular System'
        )
      ).toBe(true)

      expect(
        areEntitiesContextuallyIdentical(
          'Hypertension',
          'Hypertension',
          'TOPIC',
          'Cardiology',
          'Pediatrics'
        )
      ).toBe(false)
    })
  })

  describe('Curriculum Comparator (compareCurricula)', () => {
    test('Calculates 100% coverage for complete match', () => {
      const expectedSpec = {
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
      }

      const existingHierarchy = [
        {
          name: 'Anatomy',
          exam_topics: [{ name: 'Upper Limb' }, { name: 'Lower Limb' }],
        },
        {
          name: 'Physiology',
          exam_topics: [{ name: 'Nerve-Muscle' }, { name: 'Cardiovascular System' }],
        },
      ]

      const report = compareCurricula(expectedSpec, existingHierarchy)
      expect(report.coveragePercentage).toBe(100)
      expect(report.isComplete).toBe(true)
      expect(report.missingSubjects.length).toBe(0)
      expect(report.missingTopics.length).toBe(0)
    })

    test('Detects missing subjects and topics accurately', () => {
      const expectedSpec = {
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
      }

      const existingHierarchy = [
        {
          name: 'Anatomy',
          exam_topics: [{ name: 'Upper Limb' }], // missing Neuroanatomy
        },
        // missing Pharmacology completely
      ]

      const report = compareCurricula(expectedSpec, existingHierarchy)
      expect(report.coveragePercentage).toBeLessThan(100)
      expect(report.isComplete).toBe(false)
      expect(report.missingSubjects).toContain('Pharmacology')
      expect(report.missingTopics.some((t) => t.topic === 'Neuroanatomy')).toBe(true)
    })
  })

  describe('Evidence and Verification Status (evaluateEvidenceAndStatus)', () => {
    test('Official syllabus with full coverage is marked verified', () => {
      const status = evaluateEvidenceAndStatus({
        authorityRow: { name: 'National Board of Examinations' },
        evidenceRows: [
          {
            source_type: 'official_syllabus',
            publisher_authority: 'NBE',
            verification_status: 'valid',
          },
        ],
        versionRows: [{ is_current: true, version_year: 2025 }],
        comparisonReport: {
          totalExpectedSubjects: 19,
          matchedSubjects: 19,
          totalExpectedTopics: 100,
          matchedTopics: 100,
          coveragePercentage: 100,
          missingSubjects: [],
          missingTopics: [],
          extraSubjects: [],
          isComplete: true,
        },
        subjectCount: 19,
        topicCount: 100,
        subtopicCount: 300,
      })

      expect(status.verificationStatus).toBe('verified')
      expect(status.curriculumStatus).toBe('ready')
      expect(status.coveragePercentage).toBe(100)
    })

    test('AI Inferred with high structure is marked partially_verified or unverified, never verified without official source', () => {
      const status = evaluateEvidenceAndStatus({
        authorityRow: null,
        evidenceRows: [
          {
            source_type: 'ai_synthesis',
            verification_status: 'partially_verified',
          },
        ],
        versionRows: [],
        comparisonReport: {
          totalExpectedSubjects: 10,
          matchedSubjects: 10,
          totalExpectedTopics: 50,
          matchedTopics: 50,
          coveragePercentage: 100,
          missingSubjects: [],
          missingTopics: [],
          extraSubjects: [],
          isComplete: true,
        },
        subjectCount: 10,
        topicCount: 50,
        subtopicCount: 150,
      })

      expect(status.verificationStatus).toBe('partially_verified')
      expect(status.curriculumStatus).toBe('ready')
    })
  })

  describe('Exam Rules Validation (detectAndValidateExamRules)', () => {
    test('Preserves official rules from evidence over fallback', () => {
      const examRow = {
        question_count: 300,
        time_limit_mins: 210,
        marking_scheme: { positive_mark: 1, negative_mark: 0, has_negative_marking: false },
        question_types: ['single_choice_mcq'],
      }

      const evidenceRows = [
        {
          source_type: 'official_bulletin',
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
