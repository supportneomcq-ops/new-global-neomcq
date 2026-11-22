import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminApiSession } from '@/lib/admin-auth'
import { collectExamRulesProcess } from '@/lib/server/exam-intelligence/engine'
import { normalizeOfficialSyllabusSubjects } from '@/lib/server/exam-intelligence/metadata-audit'

const OFFICIAL_TYPES = new Set([
  'official_bulletin',
  'official_notification',
  'official_syllabus',
  'official_exam_pattern',
  'official_guideline',
  'official_handbook',
])

function isHttps(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

function hostMatches(source: string, authority: string, officialSourceDomains: unknown = []) {
  try {
    const sourceHost = new URL(source).hostname.toLowerCase().replace(/^www\\./, '')
    const authorityHost = new URL(authority).hostname.toLowerCase().replace(/^www\\./, '')
    const trustedHosts = Array.isArray(officialSourceDomains)
      ? officialSourceDomains.map((value) => {
          const raw = String(value || '').trim().toLowerCase().replace(/^www\\./, '')
          if (!raw) return null
          try {
            return raw.includes('://') ? new URL(raw).hostname.toLowerCase().replace(/^www\\./, '') : raw
          } catch {
            return null
          }
        }).filter(Boolean) as string[]
      : []
    return [authorityHost, ...trustedHosts].some((host) => sourceHost === host || sourceHost.endsWith(`.${host}`))
  } catch {
    return false
  }
}
function parseObject(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {}
  }
  return {}
}

async function requireExamVerifier() {
  const auth = await verifyAdminApiSession()
  if (!auth.authorized) return { auth, response: auth.response! }
  const roles = auth.roleNames || []
  if (!roles.includes('admin') && !roles.includes('super_admin')) {
    return {
      auth,
      response: NextResponse.json({ success: false, error: 'Exam verification requires an administrator role.' }, { status: 403 }),
    }
  }
  return { auth, response: null }
}

async function loadExamBundle(admin: any, examId: string) {
  const [{ data: exam }, { data: versions }, { data: evidence }, { data: audits }] = await Promise.all([
    admin.from('exams').select('*').eq('id', examId).maybeSingle(),
    admin.from('exam_versions').select('*').eq('exam_id', examId).order('version_year', { ascending: false }),
    admin.from('exam_evidence').select('*').eq('exam_id', examId).order('retrieved_at', { ascending: false }),
    admin.from('exam_verification_audits').select('*').eq('exam_id', examId).eq('is_current', true).order('checked_at', { ascending: false }).limit(1),
  ])
  if (!exam) return null

  const [{ data: country }, { data: category }, { data: authority }] = await Promise.all([
    exam.country_id ? admin.from('countries').select('*').eq('id', exam.country_id).maybeSingle() : Promise.resolve({ data: null }),
    exam.category_id ? admin.from('exam_categories').select('*').eq('id', exam.category_id).maybeSingle() : Promise.resolve({ data: null }),
    exam.authority_id ? admin.from('exam_authorities').select('*').eq('id', exam.authority_id).maybeSingle() : Promise.resolve({ data: null }),
  ])

  return {
    exam,
    country,
    category,
    authority,
    versions: versions || [],
    currentVersion: (versions || []).find((row: any) => row.is_current) || null,
    evidence: evidence || [],
    audit: (audits || [])[0] || null,
  }
}

async function runAudit(admin: any, bundle: any) {
  await collectExamRulesProcess(
    bundle.exam.id,
    bundle.exam.name,
    bundle.country?.name,
    bundle.category?.name,
    admin
  )
  return loadExamBundle(admin, bundle.exam.id)
}

export async function GET() {
  try {
    const { response } = await requireExamVerifier()
    if (response) return response

    const admin = getSupabaseAdmin() as any
    const { data: allExams, error } = await admin
      .from('exams')
      .select('*')
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(300)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    const reviewStatuses = new Set(['pending_review', 'needs_review', 'pending', 'unverified', 'outdated'])
    const curriculumNeedsReview = new Set(['missing_structured_official_syllabus', 'incomplete_structured_official_syllabus'])
    const exams = (allExams || []).filter((exam: any) =>
      reviewStatuses.has(String(exam.verification_status || '').toLowerCase()) ||
      curriculumNeedsReview.has(String(exam.metadata?.curriculum_source_status || '')) ||
      exam.metadata?.curriculum_status === 'needs_enrichment'
    )

    const bundles = await Promise.all(exams.map((exam: any) => loadExamBundle(admin, exam.id)))
    return NextResponse.json({
      success: true,
      exams: bundles.filter(Boolean),
      counts: {
        total: exams.length,
        readyForReview: bundles.filter((bundle: any) => bundle?.audit?.status === 'ready_for_review').length,
        needsReview: bundles.filter((bundle: any) => bundle?.audit?.status !== 'ready_for_review').length,
      },
    })
  } catch (err: any) {
    console.error('[Admin Exam Verification] GET failed:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unable to load exam verification queue.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { auth, response } = await requireExamVerifier()
    if (response) return response

    const reviewerId = auth.user?.id
    if (!reviewerId) return NextResponse.json({ success: false, error: 'Administrator identity is unavailable.' }, { status: 401 })

    const body = await req.json()
    const { action, examId, evidenceId, source_type, source_url, source_reference, source_version_date, extracted_data, review_notes } = body
    if (!examId) return NextResponse.json({ success: false, error: 'examId is required.' }, { status: 400 })

    const admin = getSupabaseAdmin() as any
    const bundle = await loadExamBundle(admin, examId)
    if (!bundle) return NextResponse.json({ success: false, error: 'Exam not found.' }, { status: 404 })

    if (action === 'add_source') {
      if (!OFFICIAL_TYPES.has(String(source_type || '')) || !isHttps(source_url) || !source_version_date) {
        return NextResponse.json({ success: false, error: 'Choose an official source type and provide a valid HTTPS URL.' }, { status: 400 })
      }
      const authorityUrl = bundle.authority?.official_website
      if (bundle.authority?.verification_status !== 'verified' || !authorityUrl || !hostMatches(source_url, authorityUrl, bundle.authority?.official_source_domains)) {
        return NextResponse.json({ success: false, error: 'Source URL must belong to the verified authority domain.' }, { status: 400 })
      }

      const { data: source, error } = await admin.from('exam_evidence').insert({
        exam_id: examId,
        source_type,
        source_url,
        source_reference: source_reference || null,
        publisher_authority: bundle.authority?.name || bundle.exam.authority || null,
        source_version_date: source_version_date || null,
        verification_status: 'pending',
        extracted_data: parseObject(extracted_data),
      }).select('*').single()

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      const updatedBundle = await runAudit(admin, bundle)
      return NextResponse.json({ success: true, source, bundle: updatedBundle, message: 'Official source saved as pending review.' })
    }

    if (action === 'verify_authority') {
      if (!bundle.authority?.id || !isHttps(bundle.authority.official_website)) {
        return NextResponse.json({ success: false, error: 'Authority record and HTTPS official website are required.' }, { status: 400 })
      }
      const { error } = await admin.from('exam_authorities').update({
        verification_status: 'verified',
        last_verified_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
        updated_at: new Date().toISOString(),
      }).eq('id', bundle.authority.id)
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      const updatedBundle = await runAudit(admin, bundle)
      return NextResponse.json({ success: true, bundle: updatedBundle, message: 'Exam authority verified and audit refreshed.' })
    }

    if (action === 'verify_source') {
      if (!evidenceId) return NextResponse.json({ success: false, error: 'evidenceId is required.' }, { status: 400 })
      const source = bundle.evidence.find((row: any) => row.id === evidenceId)
      if (!source) return NextResponse.json({ success: false, error: 'Evidence source not found for this exam.' }, { status: 404 })
      if (!OFFICIAL_TYPES.has(String(source.source_type || '')) || !isHttps(source.source_url)) {
        return NextResponse.json({ success: false, error: 'Only HTTPS official source records can be verified.' }, { status: 400 })
      }
      if (bundle.authority?.verification_status !== 'verified' || !bundle.authority?.official_website || !hostMatches(source.source_url, bundle.authority.official_website, bundle.authority.official_source_domains)) {
        return NextResponse.json({ success: false, error: 'Evidence domain does not match the exam authority official website.' }, { status: 400 })
      }
      if (!source.source_version_date) {
        return NextResponse.json({ success: false, error: 'Add the document/source version date before verifying this evidence.' }, { status: 400 })
      }
      if (['official_syllabus', 'official_guideline', 'official_handbook'].includes(String(source.source_type || '')) && !normalizeOfficialSyllabusSubjects(source.extracted_data)) {
        return NextResponse.json({ success: false, error: 'A syllabus source must contain structured subjects, topics and subtopics before it can be verified.' }, { status: 400 })
      }
      const { error } = await admin.from('exam_evidence').update({
        verification_status: 'verified',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
      }).eq('id', evidenceId)
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      const updatedBundle = await runAudit(admin, bundle)
      return NextResponse.json({ success: true, bundle: updatedBundle, message: 'Official source verified and audit refreshed.' })
    }

    if (action === 'declare_field_exception') {
      const { field, field_status, reason, sourceId } = body
      const allowedFields = new Set([
        'question_count','duration_minutes','total_marks','marking_scheme','negative_marking',
        'passing_criteria','eligibility','attempt_rules','application_information','selection_process',
        'question_types','exam_structure','languages','official_subject_scope',
      ])
      if (!allowedFields.has(String(field || ''))) {
        return NextResponse.json({ success: false, error: 'This field cannot be declared not published or not applicable.' }, { status: 400 })
      }
      if (!['not_published', 'not_applicable'].includes(String(field_status || '')) || !String(reason || '').trim() || !sourceId) {
        return NextResponse.json({ success: false, error: 'Choose a valid declaration, provide a reason, and cite a verified official source.' }, { status: 400 })
      }
      const source = bundle.evidence.find((row: any) => row.id === sourceId)
      if (!source || source.verification_status !== 'verified' || !OFFICIAL_TYPES.has(String(source.source_type || ''))) {
        return NextResponse.json({ success: false, error: 'Declaration source must be verified official evidence for this exam.' }, { status: 400 })
      }
      const sourceType = String(source.source_type || '')
      const syllabusField = field === 'official_subject_scope'
      const validSourceForField = syllabusField
        ? ['official_syllabus', 'official_guideline', 'official_handbook'].includes(sourceType)
        : ['official_bulletin', 'official_notification', 'official_exam_pattern', 'official_guideline', 'official_handbook'].includes(sourceType)
      if (!validSourceForField) {
        return NextResponse.json({ success: false, error: 'Selected official source type is not suitable for this field.' }, { status: 400 })
      }

      const existingMetadata = bundle.exam.metadata || {}
      const fieldStatuses = existingMetadata.exam_rule_field_status || {}
      const nextMetadata = {
        ...existingMetadata,
        exam_rule_field_status: {
          ...fieldStatuses,
          [field]: {
            status: field_status,
            reason: String(reason).trim(),
            source_id: sourceId,
            declared_by: reviewerId,
            declared_at: new Date().toISOString(),
          },
        },
        exam_metadata_audit_status: 'needs_review',
      }
      const { error: updateError } = await admin.from('exams').update({
        metadata: nextMetadata,
        verification_status: 'needs_review',
        last_verified_at: null,
        next_verification_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', examId)
      if (updateError) return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })

      await admin.from('exam_versions').update({
        verification_status: 'needs_review',
        verified_at: null,
      }).eq('exam_id', examId).eq('is_current', true)

      const updatedBundle = await runAudit(admin, bundle)
      return NextResponse.json({ success: true, bundle: updatedBundle, message: 'Evidence-backed field declaration saved and audit refreshed.' })
    }

    if (action === 'run_audit') {
      const updatedBundle = await runAudit(admin, bundle)
      return NextResponse.json({ success: true, bundle: updatedBundle, message: 'Field-level exam metadata audit completed.' })
    }

    if (action === 'approve_exam') {
      if (!bundle.audit?.id) return NextResponse.json({ success: false, error: 'Run the exam metadata audit before approval.' }, { status: 400 })
      const { data, error } = await admin.rpc('approve_exam_verification_audit', {
        p_exam_id: examId,
        p_audit_id: bundle.audit.id,
        p_reviewer_id: reviewerId,
        p_review_notes: review_notes || null,
      })
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 409 })
      const updatedBundle = await loadExamBundle(admin, examId)
      return NextResponse.json({ success: true, result: data?.[0] || data, bundle: updatedBundle, message: 'Exam approved. Curriculum rebuild has been queued.' })
    }

    if (action === 'reject_exam') {
      if (!bundle.audit?.id) return NextResponse.json({ success: false, error: 'No current exam audit to reject.' }, { status: 400 })
      const now = new Date().toISOString()
      const { error: auditError } = await admin.from('exam_verification_audits').update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: now,
        review_notes: review_notes || null,
        updated_at: now,
      }).eq('id', bundle.audit.id)
      if (auditError) return NextResponse.json({ success: false, error: auditError.message }, { status: 500 })

      await admin.from('exam_versions').update({ verification_status: 'needs_review', verified_at: null }).eq('exam_id', examId).eq('is_current', true)
      const { error: examError } = await admin.from('exams').update({
        verification_status: 'needs_review',
        last_verified_at: null,
        next_verification_at: null,
        metadata: {
          ...(bundle.exam.metadata || {}),
          exam_metadata_audit_status: 'rejected',
          curriculum_status: 'blocked_verification',
          curriculum_validation_passed: false,
          rules_status: 'needs_review',
        },
        updated_at: now,
      }).eq('id', examId)
      if (examError) return NextResponse.json({ success: false, error: examError.message }, { status: 500 })

      const updatedBundle = await loadExamBundle(admin, examId)
      return NextResponse.json({ success: true, bundle: updatedBundle, message: 'Exam verification rejected; curriculum remains blocked.' })
    }

    return NextResponse.json({ success: false, error: 'Unsupported exam verification action.' }, { status: 400 })
  } catch (err: any) {
    console.error('[Admin Exam Verification] POST failed:', err)
    return NextResponse.json({ success: false, error: err.message || 'Exam verification action failed.' }, { status: 500 })
  }
}
