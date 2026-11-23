import { createHash } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase'
import { normalizeInput } from '@/lib/knowledge/normalizer'
import {
  findMatchingSubjectInList,
  findMatchingTopicInList,
  findMatchingSubtopicInList,
} from '@/lib/server/exam-intelligence/curriculum-comparator'
import { normalizeOfficialSyllabusSubjects } from '@/lib/server/exam-intelligence/metadata-audit'
import { buildCurriculumDiff, validateStructuredSyllabus, type CurriculumSpec } from './curriculum-diff'

const OFFICIAL_SYLLABUS_TYPES = new Set(['official_syllabus', 'official_guideline', 'official_handbook'])

function normalizedName(value: unknown): string {
  return normalizeInput(String(value || '')).canonical.toLowerCase().trim()
}

function active(items: any[]): any[] {
  return (items || []).filter((item) => item.is_active !== false && item.active !== false)
}

function httpsHost(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.hostname.toLowerCase().replace(/^www\./, '') : null
  } catch {
    return null
  }
}

function hostMatchesAuthority(sourceUrl: string, authorityUrl: string, allowlist: unknown): boolean {
  const sourceHost = httpsHost(sourceUrl)
  const authorityHost = httpsHost(authorityUrl)
  if (!sourceHost || !authorityHost) return false
  const hosts = [authorityHost, ...(Array.isArray(allowlist) ? allowlist : [])]
    .map((item) => {
      const raw = String(item || '').trim().toLowerCase().replace(/^www\./, '')
      if (!raw) return null
      try { return raw.includes('://') ? new URL(raw).hostname.toLowerCase().replace(/^www\./, '') : raw }
      catch { return null }
    }).filter(Boolean) as string[]
  return hosts.some((host) => sourceHost === host || sourceHost.endsWith('.' + host))
}

function yearFrom(value: unknown): number | null {
  const match = String(value || '').match(/\b(20\d{2})\b/)
  return match ? Number(match[1]) : null
}

/** Official syllabus documents may remain authoritative across multiple exam sessions. */
export function isOfficialSyllabusVersionCompatible(sourceVersionDate: unknown, examVersionYear: unknown): boolean {
  const sourceYear = yearFrom(sourceVersionDate)
  const targetYear = Number(examVersionYear)
  return sourceYear !== null
    && Number.isInteger(targetYear)
    && targetYear > 0
    && sourceYear >= targetYear - 5
    && sourceYear <= targetYear + 1
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

async function loadVerifiedSyllabus(examId: string) {
  const admin = getSupabaseAdmin() as any
  const { data: exam, error: examError } = await admin.from('exams')
    .select('id,name,authority_id,version_year,verification_status,metadata')
    .eq('id', examId).maybeSingle()
  if (examError || !exam) throw new Error('Canonical exam was not found.')

  const [{ data: examVersion }, { data: authority }, { data: evidenceRows }] = await Promise.all([
    admin.from('exam_versions').select('*').eq('exam_id', examId).eq('is_current', true).maybeSingle(),
    exam.authority_id ? admin.from('exam_authorities').select('*').eq('id', exam.authority_id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from('exam_evidence').select('*').eq('exam_id', examId).eq('verification_status', 'verified'),
  ])

  if (String(exam.verification_status || '').toLowerCase() !== 'verified'
    || String(exam.metadata?.exam_metadata_audit_status || '').toLowerCase() !== 'verified') {
    throw new Error('Exam metadata has not passed the Stage 2 official verification approval gate.')
  }
  if (!examVersion || String(examVersion.verification_status || '').toLowerCase() !== 'verified') {
    throw new Error('A verified current exam version is required before curriculum reconciliation.')
  }
  if (!authority || String(authority.verification_status || '').toLowerCase() !== 'verified'
    || !authority.last_verified_at
    || Date.now() - new Date(authority.last_verified_at).getTime() > 366 * 86400000
    || !httpsHost(authority.official_website)) {
    throw new Error('The exam authority must have a recently verified HTTPS official website.')
  }

  const year = Number(examVersion.version_year || 0)
  if (!year || Number(exam.version_year || 0) !== year) {
    throw new Error('The canonical exam and verified current exam version must have the same explicit version year.')
  }
  if (!examVersion.verified_at || !examVersion.source_url
    || !hostMatchesAuthority(examVersion.source_url, authority.official_website, authority.official_source_domains)) {
    throw new Error('The current exam version must retain its verified official authority source and verification timestamp.')
  }

  const validEvidence = (evidenceRows || []).filter((row: any) =>
    OFFICIAL_SYLLABUS_TYPES.has(String(row.source_type || '').toLowerCase())
    && typeof row.source_url === 'string'
    && hostMatchesAuthority(row.source_url, authority.official_website, authority.official_source_domains)
    && isOfficialSyllabusVersionCompatible(row.source_version_date, year)
  )

  const candidates = validEvidence.map((row: any) => ({
    row,
    spec: normalizeOfficialSyllabusSubjects(row.extracted_data) as CurriculumSpec | null,
  })).filter((candidate: any) => candidate.spec?.length && validateStructuredSyllabus(candidate.spec).valid)

  if (!candidates.length) {
    throw new Error('No complete structured, current-year, verified official syllabus evidence is available for this exam.')
  }

  candidates.sort((a: any, b: any) => String(b.row.source_version_date).localeCompare(String(a.row.source_version_date)))
  const selected = candidates[0]
  const selectedDate = String(selected.row.source_version_date)
  const sameDate = candidates.filter((candidate: any) => String(candidate.row.source_version_date) === selectedDate)
  const hashes = new Set(sameDate.map((candidate: any) => sha256(candidate.spec)))
  if (hashes.size > 1) {
    throw new Error('Conflicting verified official syllabus sources share the latest version date; manual source resolution is required.')
  }

  return { admin, exam, examVersion, authority, evidence: selected.row, spec: selected.spec as CurriculumSpec }
}

async function loadPersistedHierarchy(admin: any, examId: string) {
  const { data, error } = await admin.from('exam_subjects')
    .select('id,name,slug,description,weight_percentage,display_order,is_active,exam_topics(id,name,slug,description,display_order,is_active,exam_subtopics(id,name,slug,description,display_order,is_active))')
    .eq('exam_id', examId)
  if (error) throw new Error('Could not load existing curriculum hierarchy: ' + error.message)
  return data || []
}

export async function createCurriculumVersionFromEvidence(examId: string, requestedBy: string | null, jobId: string) {
  const { admin, exam, examVersion, evidence, spec } = await loadVerifiedSyllabus(examId)
  const persisted = await loadPersistedHierarchy(admin, examId)
  const report = buildCurriculumDiff(spec, persisted)
  const sourceHash = sha256({
    examVersionId: examVersion.id,
    sourceEvidenceId: evidence.id,
    sourceUrl: evidence.source_url,
    sourceVersionDate: evidence.source_version_date,
    spec,
  })

  let { data: version } = await admin.from('exam_curriculum_versions').select('*')
    .eq('exam_id', examId).eq('source_hash', sourceHash).maybeSingle()

  if (!version) {
    const { data: versions } = await admin.from('exam_curriculum_versions')
      .select('version_number').eq('exam_id', examId).order('version_number', { ascending: false }).limit(1)
    const versionNumber = Number(versions?.[0]?.version_number || 0) + 1
    const { data: inserted, error } = await admin.from('exam_curriculum_versions').insert({
      exam_id: examId,
      exam_version_id: examVersion.id,
      source_evidence_id: evidence.id,
      version_number: versionNumber,
      source_hash: sourceHash,
      source_url: evidence.source_url,
      source_version_date: evidence.source_version_date,
      status: 'pending_review',
      is_current: false,
      snapshot: { subjects: spec },
      reconciliation_report: report,
      coverage_percentage: report.coveragePercentage,
      subject_count: report.expected.subjects,
      topic_count: report.expected.topics,
      subtopic_count: report.expected.subtopics,
      created_by: requestedBy,
    }).select('*').single()
    if (error || !inserted) {
      const { data: raced } = await admin.from('exam_curriculum_versions').select('*')
        .eq('exam_id', examId).eq('source_hash', sourceHash).maybeSingle()
      if (!raced) throw new Error('Could not persist curriculum version: ' + (error?.message || 'insert returned no row'))
      version = raced
    } else {
      version = inserted
    }
  } else if (!version.is_current) {
    const { data: updated, error } = await admin.from('exam_curriculum_versions').update({
      reconciliation_report: report,
      coverage_percentage: report.coveragePercentage,
      updated_at: new Date().toISOString(),
    }).eq('id', version.id).select('*').single()
    if (error) throw new Error('Could not refresh curriculum reconciliation report: ' + error.message)
    version = updated
  }

  const runPayload = {
    examId,
    curriculumVersionId: version.id,
    sourceEvidenceId: evidence.id,
    report,
  }
  const { error: runError } = await admin.from('exam_curriculum_reconciliation_runs').upsert({
    exam_id: examId,
    curriculum_version_id: version.id,
    ai_job_id: jobId,
    status: 'completed',
    report: runPayload,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    requested_by: requestedBy,
  }, { onConflict: 'ai_job_id' })
  if (runError) throw new Error('Could not save reconciliation run: ' + runError.message)

  await admin.from('ai_jobs').update({
    curriculum_version_id: version.id,
    output_payload: runPayload,
    progress_stage: 'Curriculum comparison complete; awaiting admin review',
    step_percentage: 100,
  }).eq('id', jobId)

  return { version, report, examName: exam.name }
}

async function insertOrGet(admin: any, table: string, parentColumn: string, parentId: string, row: Record<string, any>) {
  const normalized = normalizedName(row.name)
  const { data, error } = await admin.from(table).insert({
    ...row,
    [parentColumn]: parentId,
    normalized_name: normalized,
  }).select('id,name,slug,is_active').single()
  if (data) return data
  const { data: existing } = await admin.from(table).select('id,name,slug,is_active')
    .eq(parentColumn, parentId).eq('normalized_name', normalized).maybeSingle()
  if (existing) return existing
  throw new Error('Could not safely persist missing curriculum node: ' + (error?.message || 'unknown insert error'))
}

/** Applies only missing nodes after a fresh source check and explicit admin approval. */
export async function approveCurriculumVersion(versionId: string, reviewerId: string, reviewNotes?: string) {
  const admin = getSupabaseAdmin() as any
  const { data: version, error: versionError } = await admin.from('exam_curriculum_versions')
    .select('*').eq('id', versionId).maybeSingle()
  if (versionError || !version) throw new Error('Curriculum version was not found.')
  if (version.status === 'current' && version.is_current) return { version, alreadyCurrent: true }

  const { admin: verifiedAdmin, exam, examVersion, evidence, spec } = await loadVerifiedSyllabus(version.exam_id)
  if (examVersion.id !== version.exam_version_id || evidence.id !== version.source_evidence_id) {
    throw new Error('The verified exam or syllabus source changed after this preview. Queue a fresh reconciliation.')
  }
  const freshHash = sha256({
    examVersionId: examVersion.id,
    sourceEvidenceId: evidence.id,
    sourceUrl: evidence.source_url,
    sourceVersionDate: evidence.source_version_date,
    spec,
  })
  if (freshHash !== version.source_hash) throw new Error('The official syllabus evidence changed after this preview. Queue a fresh reconciliation.')

  const report = version.reconciliation_report || {}
  if (Number(report.blockingIssueCount || 0) > 0 || report.canApplyMissing !== true) {
    throw new Error('Curriculum contains duplicates, renamed candidates or uncertain matches. Resolve these manually before applying additions.')
  }

  const now = new Date().toISOString()
  const subjects = await loadPersistedHierarchy(verifiedAdmin, exam.id)
  let insertedSubjects = 0
  let insertedTopics = 0
  let insertedSubtopics = 0

  for (let sIndex = 0; sIndex < spec.length; sIndex++) {
    const expectedSubject = spec[sIndex]
    let subject = findMatchingSubjectInList(expectedSubject.name, subjects)
    if (!subject) {
      subject = await insertOrGet(verifiedAdmin, 'exam_subjects', 'exam_id', exam.id, {
        name: expectedSubject.name,
        slug: normalizeInput(expectedSubject.name).slug.toLowerCase(),
        description: expectedSubject.description || null,
        weight_percentage: expectedSubject.weightage || null,
        display_order: sIndex + 1,
        required: true,
        active: true,
        is_active: true,
        verification_status: 'verified',
        source_url: evidence.source_url,
        last_verified_at: now,
        verified_at: now,
      })
      insertedSubjects++
      subject.exam_topics = []
      subjects.push(subject)
    }

    const currentTopics = active(subject.exam_topics || [])
    for (let tIndex = 0; tIndex < expectedSubject.topics.length; tIndex++) {
      const expectedTopic = expectedSubject.topics[tIndex]
      let topic = findMatchingTopicInList(expectedTopic.name, currentTopics, expectedSubject.name)
      if (!topic) {
        topic = await insertOrGet(verifiedAdmin, 'exam_topics', 'subject_id', subject.id, {
          name: expectedTopic.name,
          slug: normalizeInput(expectedTopic.name).slug.toLowerCase(),
          description: expectedTopic.description || null,
          display_order: tIndex + 1,
          active: true,
          is_active: true,
          verification_status: 'verified',
          source_url: evidence.source_url,
          last_verified_at: now,
          verified_at: now,
        })
        insertedTopics++
        topic.exam_subtopics = []
        currentTopics.push(topic)
      }

      const currentSubtopics = active(topic.exam_subtopics || [])
      for (let stIndex = 0; stIndex < expectedTopic.subtopics.length; stIndex++) {
        const expectedSubtopic = expectedTopic.subtopics[stIndex]
        const existing = findMatchingSubtopicInList(expectedSubtopic.name, currentSubtopics, expectedTopic.name)
        if (existing) continue
        await insertOrGet(verifiedAdmin, 'exam_subtopics', 'topic_id', topic.id, {
          name: expectedSubtopic.name,
          slug: normalizeInput(expectedSubtopic.name).slug.toLowerCase(),
          description: expectedSubtopic.description || null,
          display_order: stIndex + 1,
          is_active: true,
          verification_status: 'verified',
          source_url: evidence.source_url,
          verified_at: now,
        })
        insertedSubtopics++
      }
    }
  }

  const updatedHierarchy = await loadPersistedHierarchy(verifiedAdmin, exam.id)
  const updatedReport = buildCurriculumDiff(spec, updatedHierarchy)
  if (updatedReport.expected.total !== updatedReport.matched.total || updatedReport.blockingIssueCount > 0) {
    throw new Error('Post-apply validation failed. Existing history was preserved; review the latest reconciliation report before retrying.')
  }

  const { error: retireError } = await verifiedAdmin.from('exam_curriculum_versions')
    .update({ status: 'superseded', is_current: false, updated_at: now })
    .eq('exam_id', exam.id).eq('is_current', true)
  if (retireError) throw new Error('Could not supersede prior curriculum version: ' + retireError.message)

  const { data: currentVersion, error: currentError } = await verifiedAdmin.from('exam_curriculum_versions')
    .update({
      status: 'current',
      is_current: true,
      reviewed_by: reviewerId,
      reviewed_at: now,
      review_notes: reviewNotes || null,
      reconciliation_report: updatedReport,
      coverage_percentage: updatedReport.coveragePercentage,
      updated_at: now,
    }).eq('id', versionId).select('*').single()
  if (currentError || !currentVersion) throw new Error('Curriculum nodes were reconciled, but version activation failed: ' + (currentError?.message || 'no row returned'))

  await verifiedAdmin.from('exam_curriculum_reconciliation_runs')
    .update({ status: 'completed', report: updatedReport, completed_at: now, updated_at: now })
    .eq('curriculum_version_id', versionId)
  return {
    version: currentVersion,
    report: updatedReport,
    inserted: { subjects: insertedSubjects, topics: insertedTopics, subtopics: insertedSubtopics },
  }
}
