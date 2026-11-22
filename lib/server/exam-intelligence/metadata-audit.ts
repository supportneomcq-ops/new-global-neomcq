export type ExamMetadataAuditStatus = 'needs_review' | 'ready_for_review';

type AnyRecord = Record<string, any>;

const OFFICIAL_SOURCE_TYPES = new Set([
  'official_bulletin',
  'official_notification',
  'official_syllabus',
  'official_exam_pattern',
  'official_guideline',
  'official_handbook',
]);

function objectValue(value: any): AnyRecord {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as AnyRecord;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function arrayValue(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function hasValue(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}

function httpsHost(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function hostMatchesAuthority(sourceUrl: unknown, authorityUrl: unknown): boolean {
  const sourceHost = httpsHost(sourceUrl);
  const authorityHost = httpsHost(authorityUrl);
  if (!sourceHost || !authorityHost) return false;
  return sourceHost === authorityHost || sourceHost.endsWith(`.${authorityHost}`);
}

function sourceYear(value: unknown): number | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (!Number.isNaN(date.getTime())) return date.getUTCFullYear();
  const match = String(value).match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function evidencePayload(evidence: AnyRecord): AnyRecord {
  const root = objectValue(evidence.extracted_data);
  return {
    ...root,
    ...objectValue(root.exam_pattern),
    ...objectValue(root.exam_rules),
    ...objectValue(root.pattern),
    ...objectValue(root.exam_details),
  };
}

function evidenceFor(evidence: AnyRecord[], keys: string[]): AnyRecord[] {
  return evidence.filter((item) => {
    const payload = evidencePayload(item);
    return keys.some((key) =>
      (Object.prototype.hasOwnProperty.call(payload, key) && payload[key] !== null) ||
      (Object.prototype.hasOwnProperty.call(item, key) && item[key] !== null)
    );
  });
}

function numericEvidenceValues(evidence: AnyRecord[], keys: string[]): number[] {
  const values: number[] = [];
  for (const item of evidenceFor(evidence, keys)) {
    const payload = evidencePayload(item);
    for (const key of keys) {
      if (payload[key] === undefined || payload[key] === null) continue;
      const number = Number(payload[key]);
      if (Number.isFinite(number) && number > 0 && !values.includes(number)) values.push(number);
    }
  }
  return values;
}

function sumArrayValues(value: any, keys: string[]): number | null {
  const rows = arrayValue(value);
  if (!rows.length) return null;
  let sum = 0;
  let found = false;
  for (const rowValue of rows) {
    const row = objectValue(rowValue);
    const raw = keys.map((key) => row[key]).find((candidate) => candidate !== undefined && candidate !== null);
    const number = Number(raw);
    if (Number.isFinite(number) && number > 0) {
      sum += number;
      found = true;
    }
  }
  return found ? sum : null;
}

function fieldResult(
  value: any,
  status: string,
  reason: string,
  evidence: AnyRecord[] = []
) {
  return {
    value: value === undefined ? null : value,
    status,
    reason,
    source_ids: evidence.map((item) => item.id).filter(Boolean),
    source_urls: evidence.map((item) => item.source_url).filter(Boolean),
  };
}

export function buildExamMetadataAudit(input: {
  exam: AnyRecord;
  country?: AnyRecord | null;
  category?: AnyRecord | null;
  authority?: AnyRecord | null;
  versions?: AnyRecord[];
  evidence?: AnyRecord[];
}) {
  const { exam, country, category, authority } = input;
  const versions = input.versions || [];
  const allEvidence = input.evidence || [];
  const currentVersion = versions
    .filter((version) => version.is_current === true)
    .sort((a, b) => Number(b.version_year || 0) - Number(a.version_year || 0))[0] || null;

  const authorityUrl = authority?.official_website || authority?.source_url || null;
  const authorityVerified = String(authority?.verification_status || '').toLowerCase() === 'verified'
    && Boolean(httpsHost(authorityUrl))
    && Boolean(authority?.last_verified_at)
    && (Date.now() - new Date(authority.last_verified_at).getTime()) <= 366 * 24 * 60 * 60 * 1000;

  const officialCandidates = allEvidence.filter((item) => {
    const type = String(item.source_type || '').toLowerCase();
    return OFFICIAL_SOURCE_TYPES.has(type)
      && typeof item.source_url === 'string'
      && Boolean(httpsHost(item.source_url))
      && hostMatchesAuthority(item.source_url, authorityUrl);
  });

  const verifiedOfficialEvidence = officialCandidates.filter((item) =>
    String(item.verification_status || '').toLowerCase() === 'verified'
  );

  const versionYear = Number(currentVersion?.version_year || exam.version_year || 0) || null;
  const freshEvidence = verifiedOfficialEvidence.filter((item) => {
    const year = sourceYear(item.source_version_date);
    const type = String(item.source_type || '').toLowerCase();
    const allowedAge = ['official_syllabus', 'official_guideline', 'official_handbook'].includes(type) ? 5 : 1;
    return year !== null && versionYear !== null && year >= versionYear - allowedAge && year <= versionYear + 1;
  });

  const currentBulletins = freshEvidence.filter((item) =>
    ['official_bulletin', 'official_notification', 'official_exam_pattern', 'official_guideline', 'official_handbook'].includes(String(item.source_type || '').toLowerCase())
  );
  const currentSyllabi = freshEvidence.filter((item) =>
    ['official_syllabus', 'official_guideline'].includes(String(item.source_type || '').toLowerCase())
  );

  const metadata = objectValue(exam.metadata);
  const declaredFieldStatus = objectValue(metadata.exam_rule_field_status);
  const fields: AnyRecord = {};
  const missingFields: string[] = [];
  const conflicts: AnyRecord[] = [];

  const addField = (
    name: string,
    value: any,
    keys: string[],
    options: { allowNotPublished?: boolean; allowNotApplicable?: boolean; evidencePool?: AnyRecord[] } = {}
  ) => {
    const pool = options.evidencePool || freshEvidence;
    const supporting = evidenceFor(pool, keys);
    const declaration = objectValue(declaredFieldStatus[name]);
    const declaredStatus = String(declaration.status || '').toLowerCase();
    const declaredReason = String(declaration.reason || '').trim();
    const declarationEvidenceId = declaration.source_id;
    const declarationEvidence = declarationEvidenceId
      ? pool.filter((item) => item.id === declarationEvidenceId)
      : [];

    if (options.allowNotPublished && declaredStatus === 'not_published' && declaredReason && declarationEvidence.length) {
      fields[name] = fieldResult(value, 'not_published', declaredReason, declarationEvidence);
      return;
    }
    if (options.allowNotApplicable && declaredStatus === 'not_applicable' && declaredReason && declarationEvidence.length) {
      fields[name] = fieldResult(value, 'not_applicable', declaredReason, declarationEvidence);
      return;
    }

    if (!hasValue(value)) {
      fields[name] = fieldResult(value, 'missing', 'Required value is absent.', supporting);
      missingFields.push(name);
      return;
    }

    if (!supporting.length) {
      fields[name] = fieldResult(value, 'needs_review', 'Value exists but no current, verified official source supports it.', []);
      missingFields.push(name);
      return;
    }

    fields[name] = fieldResult(value, 'verified', 'Supported by current, verified official evidence.', supporting);
  };

  addField('canonical_exam_name', exam.name, ['canonical_exam_name', 'exam_name', 'official_name'], { evidencePool: verifiedOfficialEvidence });
  addField('country', country?.name || null, ['country', 'jurisdiction', 'country_name'], { evidencePool: verifiedOfficialEvidence });
  addField('authority', authority?.name || exam.authority || null, ['authority', 'exam_authority', 'publisher_authority'], { evidencePool: verifiedOfficialEvidence });
  addField('category', category?.name || null, ['category', 'exam_category'], { evidencePool: verifiedOfficialEvidence });
  addField('exam_type', exam.exam_type || null, ['exam_type', 'test_type']);
  addField('level', exam.level || null, ['level', 'credential_level', 'exam_level']);
  addField('current_version', exam.current_version || currentVersion?.version_label || null, ['version', 'version_label', 'version_year']);
  addField('version_year', versionYear, ['version_year', 'exam_year']);

  addField('official_bulletin_or_notification', currentBulletins[0]?.source_url || null, ['exam_pattern', 'question_count', 'duration_minutes', 'time_limit_mins', 'marking_scheme', 'passing_criteria'], { evidencePool: currentBulletins });
  addField('official_syllabus', currentSyllabi[0]?.source_url || null, ['subjects', 'syllabus', 'curriculum', 'topics'], { evidencePool: currentSyllabi });

  const countKeys = ['question_count', 'total_questions', 'number_of_questions', 'questions'];
  const durationKeys = ['duration_minutes', 'time_limit_mins', 'total_duration_minutes', 'duration'];
  const totalMarkKeys = ['total_marks', 'maximum_marks', 'max_marks', 'maximum_score'];
  const questionTypeKeys = ['question_types', 'question_format', 'question_formats', 'item_types'];
  const markingKeys = ['marking_scheme', 'scoring', 'positive_mark', 'marks_per_question', 'correct_mark'];
  const negativeKeys = ['negative_marking', 'has_negative_marking', 'negative_mark'];
  const passingKeys = ['passing_criteria', 'pass_mark', 'passing_score', 'cutoff'];
  const eligibilityKeys = ['eligibility', 'eligibility_criteria', 'eligibility_requirements'];
  const attemptKeys = ['attempt_rules', 'attempt_limit', 'maximum_attempts', 'attempts'];
  const applicationKeys = ['application_information', 'application_process', 'registration', 'registration_process'];
  const selectionKeys = ['selection_process', 'selection_criteria', 'result_process'];
  const structureKeys = ['stages', 'papers', 'sections', 'exam_structure'];
  const languageKeys = ['languages', 'language_of_exam', 'test_language'];
  const syllabusKeys = ['subjects', 'syllabus_subjects', 'curriculum'];

  addField('question_count', exam.question_count, countKeys, { allowNotPublished: true, evidencePool: currentBulletins });
  addField('duration_minutes', exam.time_limit_mins, durationKeys, { allowNotPublished: true, evidencePool: currentBulletins });
  addField('total_marks', exam.total_marks, totalMarkKeys, { allowNotPublished: true, allowNotApplicable: true, evidencePool: currentBulletins });
  addField('marking_scheme', exam.marking_scheme, markingKeys, { allowNotApplicable: true, evidencePool: currentBulletins });
  addField('negative_marking', exam.negative_marking ?? objectValue(exam.marking_scheme).has_negative_marking, negativeKeys, { allowNotApplicable: true, evidencePool: currentBulletins });
  addField('passing_criteria', exam.passing_criteria, passingKeys, { allowNotPublished: true, allowNotApplicable: true, evidencePool: currentBulletins });
  addField('eligibility', exam.eligibility, eligibilityKeys, { allowNotPublished: true, allowNotApplicable: true, evidencePool: currentBulletins });
  addField('attempt_rules', exam.attempt_rules, attemptKeys, { allowNotPublished: true, allowNotApplicable: true, evidencePool: currentBulletins });
  addField('application_information', exam.application_information, applicationKeys, { allowNotPublished: true, evidencePool: currentBulletins });
  addField('selection_process', exam.selection_process, selectionKeys, { allowNotPublished: true, evidencePool: currentBulletins });
  addField('question_types', exam.question_types, questionTypeKeys, { allowNotPublished: true, evidencePool: currentBulletins });
  addField('exam_structure', exam.papers || exam.stages || exam.sections, structureKeys, { allowNotPublished: true, evidencePool: currentBulletins });
  addField('languages', exam.languages, languageKeys, { allowNotPublished: true, evidencePool: currentBulletins });
  addField('official_subject_scope', objectValue(exam.syllabus_info).subjects || objectValue(exam.metadata).official_subjects || null, syllabusKeys, { evidencePool: currentSyllabi });

  const currentVersionSourceMatches = currentVersion
    && currentVersion.source_url
    && hostMatchesAuthority(currentVersion.source_url, authorityUrl)
    && currentVersion.is_current === true
    && versionYear !== null
    && Number(currentVersion.version_year) === versionYear;

  if (!country?.id) missingFields.push('country_id');
  if (!authority?.id || !authorityVerified) missingFields.push('verified_authority_record');
  if (!category?.id) missingFields.push('category_id');
  if (!currentVersionSourceMatches) missingFields.push('current_verified_exam_version');
  if (!currentBulletins.length) missingFields.push('current_official_bulletin_or_notification');
  if (!currentSyllabi.length) missingFields.push('current_official_syllabus');

  const examLevel = String(exam.level || '').toUpperCase();
  if (/(^|\s|\/|&)(N1|N2)(\s|\/|&|$)/.test(examLevel) && /N1.*N2|N2.*N1/.test(examLevel)) {
    conflicts.push({
      field: 'level',
      stored_value: exam.level,
      reason: 'Multiple independently scored exam levels are combined in one exam record; create separate canonical records.',
    });
  }

  if (currentVersion && exam.version_year && currentVersion.version_year
      && Number(exam.version_year) !== Number(currentVersion.version_year)) {
    conflicts.push({
      field: 'version_year',
      exam_value: exam.version_year,
      version_record_value: currentVersion.version_year,
      reason: 'Exam row and current exam-version record refer to different version years.',
    });
  }

  if (currentVersion?.version_label && exam.current_version
      && String(currentVersion.version_label).trim().toLowerCase() !== String(exam.current_version).trim().toLowerCase()) {
    conflicts.push({
      field: 'current_version',
      exam_value: exam.current_version,
      version_record_value: currentVersion.version_label,
      reason: 'Exam row and current exam-version record use different version labels.',
    });
  }

  const versionPattern = objectValue(currentVersion?.pattern_summary);
  const versionQuestionCount = Number(versionPattern.question_count || versionPattern.total_questions || 0);
  const versionDuration = Number(versionPattern.duration_minutes || versionPattern.time_limit_mins || 0);
  const versionTotalMarks = Number(versionPattern.total_marks || versionPattern.maximum_marks || 0);
  if (versionQuestionCount > 0 && Number(exam.question_count || 0) > 0 && versionQuestionCount !== Number(exam.question_count)) {
    conflicts.push({
      field: 'question_count',
      exam_value: Number(exam.question_count),
      version_record_value: versionQuestionCount,
      reason: 'Exam row and current exam-version record disagree on question count.',
    });
  }
  if (versionDuration > 0 && Number(exam.time_limit_mins || 0) > 0 && versionDuration !== Number(exam.time_limit_mins)) {
    conflicts.push({
      field: 'duration_minutes',
      exam_value: Number(exam.time_limit_mins),
      version_record_value: versionDuration,
      reason: 'Exam row and current exam-version record disagree on duration.',
    });
  }
  if (versionTotalMarks > 0 && Number(exam.total_marks || 0) > 0 && versionTotalMarks !== Number(exam.total_marks)) {
    conflicts.push({
      field: 'total_marks',
      exam_value: Number(exam.total_marks),
      version_record_value: versionTotalMarks,
      reason: 'Exam row and current exam-version record disagree on total marks.',
    });
  }

  const paperQuestionSum = sumArrayValues(exam.papers, ['question_count', 'total_questions', 'questions']);
  const stageQuestionSum = sumArrayValues(exam.stages, ['question_count', 'total_questions', 'questions']);
  const structureQuestionSum = paperQuestionSum ?? stageQuestionSum;
  const storedQuestionCount = Number(exam.question_count || 0);
  if (structureQuestionSum && storedQuestionCount > 0 && structureQuestionSum !== storedQuestionCount) {
    conflicts.push({
      field: 'question_count',
      stored_value: storedQuestionCount,
      structure_total: structureQuestionSum,
      reason: 'Top-level question count does not equal the sum of the stored papers or stages.',
    });
  }

  const paperDurationSum = sumArrayValues(exam.papers, ['duration_minutes', 'time_limit_mins', 'duration_mins']);
  const stageDurationSum = sumArrayValues(exam.stages, ['duration_minutes', 'time_limit_mins', 'duration_mins']);
  const structureDurationSum = paperDurationSum ?? stageDurationSum;
  const storedDuration = Number(exam.time_limit_mins || 0);
  if (structureDurationSum && storedDuration > 0 && structureDurationSum !== storedDuration) {
    conflicts.push({
      field: 'duration_minutes',
      stored_value: storedDuration,
      structure_total: structureDurationSum,
      reason: 'Top-level duration does not equal the sum of the stored papers or stages.',
    });
  }

  const paperMarksSum = sumArrayValues(exam.papers, ['total_marks', 'maximum_marks', 'marks']);
  const stageMarksSum = sumArrayValues(exam.stages, ['total_marks', 'maximum_marks', 'marks']);
  const structureMarksSum = paperMarksSum ?? stageMarksSum;
  const storedTotalMarks = Number(exam.total_marks || 0);
  if (structureMarksSum && storedTotalMarks > 0 && structureMarksSum !== storedTotalMarks) {
    conflicts.push({
      field: 'total_marks',
      stored_value: storedTotalMarks,
      structure_total: structureMarksSum,
      reason: 'Top-level total marks do not equal the sum of the stored papers or stages.',
    });
  }

  const evidenceQuestionCounts = numericEvidenceValues(currentBulletins, countKeys);
  if (storedQuestionCount > 0 && evidenceQuestionCounts.some((value) => value !== storedQuestionCount)) {
    conflicts.push({
      field: 'question_count',
      stored_value: storedQuestionCount,
      official_values: evidenceQuestionCounts,
      reason: 'Stored question count conflicts with verified current official evidence.',
    });
  }

  const evidenceDurations = numericEvidenceValues(currentBulletins, durationKeys);
  if (storedDuration > 0 && evidenceDurations.some((value) => value !== storedDuration)) {
    conflicts.push({
      field: 'duration_minutes',
      stored_value: storedDuration,
      official_values: evidenceDurations,
      reason: 'Stored duration conflicts with verified current official evidence.',
    });
  }

  const evidenceTotalMarks = numericEvidenceValues(currentBulletins, totalMarkKeys);
  if (storedTotalMarks > 0 && evidenceTotalMarks.some((value) => value !== storedTotalMarks)) {
    conflicts.push({
      field: 'total_marks',
      stored_value: storedTotalMarks,
      official_values: evidenceTotalMarks,
      reason: 'Stored total marks conflict with verified current official evidence.',
    });
  }

  const sourceIds = Array.from(new Set(verifiedOfficialEvidence.map((item) => item.id).filter(Boolean)));
  const sourceUrls = Array.from(new Set(officialCandidates.map((item) => item.source_url).filter(Boolean)));
  const missing = Array.from(new Set(missingFields));
  const status: ExamMetadataAuditStatus = missing.length === 0 && conflicts.length === 0
    ? 'ready_for_review'
    : 'needs_review';

  return {
    audit_version: 1,
    status,
    field_results: fields,
    missing_fields: missing,
    conflicting_fields: conflicts,
    source_ids: sourceIds,
    source_urls: sourceUrls,
    authority_domain: httpsHost(authorityUrl),
    current_exam_version_id: currentVersion?.id || null,
    current_version_year: versionYear,
    official_evidence_count: verifiedOfficialEvidence.length,
    candidate_official_evidence_count: officialCandidates.length,
    checked_at: new Date().toISOString(),
  };
}
