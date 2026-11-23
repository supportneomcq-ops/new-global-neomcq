import { buildExamMetadataAudit } from '../metadata-audit'

function createCompleteAuditInput(): any {
  const officialWebsite = 'https://natboard.edu.in'
  const papers = [
    {
      paper_number: 1,
      title: 'Screening Test',
      question_count: 300,
      duration_minutes: 300,
      total_marks: 300,
    },
  ]
  const subjects = [
    {
      name: 'Anatomy',
      topics: [{ name: 'Gross Anatomy', subtopics: [{ name: 'Upper Limb' }] }],
    },
  ]

  return {
    exam: {
      id: 'exam-fmge',
      name: 'FMGE',
      exam_type: 'Screening Test',
      level: 'National',
      current_version: '2026',
      version_year: 2026,
      question_count: 300,
      time_limit_mins: 300,
      total_marks: 300,
      marking_scheme: { correct: 1, incorrect: 0, unattempted: 0, negative_marking: false },
      negative_marking: false,
      passing_criteria: 'Minimum 150 marks out of 300',
      eligibility: 'Indian citizen',
      attempt_rules: 'No attempt limit',
      application_information: 'Apply online',
      selection_process: 'Pass or fail screening test',
      question_types: ['single_best_answer_mcq'],
      papers,
      languages: ['English'],
      syllabus_info: { subjects: [{ name: 'Anatomy' }] },
      metadata: {},
    },
    country: { id: 'country-india', name: 'India' },
    category: { id: 'category-medical', name: 'Medical' },
    authority: {
      id: 'authority-natboard',
      name: 'National Board of Examinations in Medical Sciences',
      official_website: officialWebsite,
      official_source_domains: [],
      verification_status: 'verified',
      last_verified_at: new Date().toISOString(),
    },
    versions: [
      {
        id: 'exam-version-2026',
        is_current: true,
        version_year: 2026,
        version_label: '2026',
        source_url: 'https://natboard.edu.in/fmge/bulletin.pdf',
        pattern_summary: {
          question_count: 300,
          duration_minutes: 300,
          total_marks: 300,
        },
      },
    ],
    evidence: [
      {
        id: 'bulletin-2026',
        source_type: 'official_bulletin',
        source_url: 'https://natboard.edu.in/fmge/bulletin.pdf',
        source_version_date: '2026-05-01',
        verification_status: 'verified',
        extracted_data: {
          exam_name: 'FMGE',
          country: 'India',
          authority: 'National Board of Examinations in Medical Sciences',
          category: 'Medical',
          exam_type: 'Screening Test',
          level: 'National',
          version: '2026',
          version_year: 2026,
          question_count: 300,
          duration_minutes: 300,
          total_marks: 300,
          marking_scheme: { correct: 1, incorrect: 0, unattempted: 0, negative_marking: false },
          negative_marking: false,
          passing_criteria: 'Minimum 150 marks out of 300',
          eligibility: 'Indian citizen',
          attempt_rules: 'No attempt limit',
          application_information: 'Apply online',
          selection_process: 'Pass or fail screening test',
          question_types: ['single_best_answer_mcq'],
          papers,
          languages: ['English'],
        },
      },
      {
        id: 'syllabus-2024',
        source_type: 'official_syllabus',
        source_url: 'https://natboard.edu.in/fmge/syllabus.pdf',
        source_version_date: '2024-09-12',
        verification_status: 'verified',
        extracted_data: { subjects },
      },
    ],
  }
}

describe('Stage 2 official exam metadata value verification', () => {
  test('marks fields ready for review only when stored values match official evidence', () => {
    const audit = buildExamMetadataAudit(createCompleteAuditInput())
    console.log('AUDIT_DIAGNOSTICS', JSON.stringify({
      missing: audit.missing_fields,
      conflicts: audit.conflicting_fields,
      fieldResults: audit.field_results,
    }))

    expect(audit.status).toBe('ready_for_review')
    expect(audit.missing_fields).toEqual([])
    expect(audit.conflicting_fields).toEqual([])
    expect(audit.field_results.question_count.status).toBe('verified')
    expect(audit.field_results.marking_scheme.status).toBe('verified')
    expect(audit.field_results.official_syllabus.status).toBe('verified')
  })

  test('detects a negative-marking mismatch even when the source contains the field', () => {
    const input = createCompleteAuditInput()
    input.exam.negative_marking = true

    const audit = buildExamMetadataAudit(input)

    expect(audit.status).toBe('needs_review')
    expect(audit.field_results.negative_marking.status).toBe('conflict')
    expect(audit.conflicting_fields.some((item: any) => item.field === 'negative_marking')).toBe(true)
  })

  test('detects non-numeric eligibility and attempt-rule mismatches', () => {
    const input = createCompleteAuditInput()
    input.exam.eligibility = 'Any candidate may apply'
    input.exam.attempt_rules = 'Maximum three attempts'

    const audit = buildExamMetadataAudit(input)

    expect(audit.field_results.eligibility.status).toBe('conflict')
    expect(audit.field_results.attempt_rules.status).toBe('conflict')
    expect(audit.conflicting_fields.map((item: any) => item.field)).toEqual(
      expect.arrayContaining(['eligibility', 'attempt_rules'])
    )
  })

  test('does not verify a field when official evidence omits its value', () => {
    const input = createCompleteAuditInput()
    delete input.evidence[0].extracted_data.eligibility

    const audit = buildExamMetadataAudit(input)

    expect(audit.status).toBe('needs_review')
    expect(audit.field_results.eligibility.status).toBe('needs_review')
    expect(audit.missing_fields).toContain('eligibility')
  })

  test('normalizes equivalent negative-marking wording without losing the boolean meaning', () => {
    const input = createCompleteAuditInput()
    input.exam.negative_marking = 'No negative marking'
    input.evidence[0].extracted_data.negative_marking = false

    const audit = buildExamMetadataAudit(input)

    expect(audit.field_results.negative_marking.status).toBe('verified')
  })
})
