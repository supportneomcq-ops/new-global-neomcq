import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminApiSession } from '@/lib/admin-auth'
import { matchExamSmart } from '@/lib/knowledge/matcher'
import { normalizeInput } from '@/lib/knowledge/normalizer'
import { collectExamRulesProcess } from '@/lib/server/exam-intelligence/engine'

const isHttpsUrl = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return false
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

const hostMatches = (source: string, authority: string) => {
  try {
    const sourceHost = new URL(source).hostname.toLowerCase().replace(/^www\./, '')
    const authorityHost = new URL(authority).hostname.toLowerCase().replace(/^www\./, '')
    return sourceHost === authorityHost || sourceHost.endsWith(`.${authorityHost}`)
  } catch {
    return false
  }
}

const parseArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed } catch {}
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

const parseJsonObject = (value: unknown): any => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) { try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null } catch {} }
  return null
}

const parseNumber = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

const pendingMetadata = (existing: any = {}) => ({
  ...(existing || {}),
  exam_metadata_audit_status: 'needs_review',
  curriculum_status: 'blocked_verification',
  curriculum_validation_passed: false,
  rules_status: 'needs_review',
})

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const supabase = getSupabaseAdmin() as any
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = supabase
      .from('exams')
      .select(`
        id, name, slug, short_name, description, difficulty,
        question_count, time_limit_mins, total_marks, negative_marking,
        marking_scheme, question_types, stages, papers, languages,
        eligibility, attempt_rules, application_information, selection_process,
        is_featured, created_by_ai, status, verification_status,
        authority_id, authority, exam_type, level, current_version, version_year,
        is_current, last_verified_at, next_verification_at,
        official_url, official_notification_url, official_syllabus_url,
        official_reference_website, source_url, metadata, syllabus_info,
        created_at, updated_at,
        countries(id, name, iso2, flag_emoji),
        exam_categories(id, name, slug),
        exam_subjects(id, name, weight_percentage, exam_topics(id, name, importance))
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') query = query.eq('status', status)
    if (search) query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)

    const { data: exams, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const ids = (exams || []).map((exam: any) => exam.id)
    const [{ data: userExams }, { data: audits }, { data: versions }, { data: evidence }] = await Promise.all([
      supabase.from('user_exams').select('exam_id'),
      ids.length ? supabase.from('exam_verification_audits').select('*').in('exam_id', ids).eq('is_current', true) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from('exam_versions').select('*').in('exam_id', ids).order('version_year', { ascending: false }) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from('exam_evidence').select('*').in('exam_id', ids).order('retrieved_at', { ascending: false }) : Promise.resolve({ data: [] }),
    ])

    const userCountMap: Record<string, number> = {}
    ;(userExams || []).forEach((row: any) => { userCountMap[row.exam_id] = (userCountMap[row.exam_id] || 0) + 1 })

    const auditMap: Record<string, any> = {}
    ;(audits || []).forEach((row: any) => { auditMap[row.exam_id] = row })

    const versionMap: Record<string, any[]> = {}
    ;(versions || []).forEach((row: any) => { (versionMap[row.exam_id] ||= []).push(row) })

    const evidenceMap: Record<string, any[]> = {}
    ;(evidence || []).forEach((row: any) => { (evidenceMap[row.exam_id] ||= []).push(row) })

    const enrichedExams = (exams || []).map((exam: any) => {
      const subjects = exam.exam_subjects || []
      const audit = auditMap[exam.id] || null
      return {
        ...exam,
        subject_count: subjects.length,
        topic_count: subjects.reduce((total: number, subject: any) => total + (subject.exam_topics?.length || 0), 0),
        user_count: userCountMap[exam.id] || 0,
        verification_audit: audit,
        exam_versions: versionMap[exam.id] || [],
        exam_evidence: evidenceMap[exam.id] || [],
      }
    })

    const totalExams = enrichedExams.length
    const activeExams = enrichedExams.filter((exam: any) => ['active', 'published'].includes(exam.status)).length
    const archivedExams = enrichedExams.filter((exam: any) => ['archived', 'inactive'].includes(exam.status)).length
    const pendingReviewCount = enrichedExams.filter((exam: any) =>
      ['pending', 'pending_review', 'needs_review', 'unverified', 'outdated'].includes(String(exam.verification_status || ''))
    ).length

    return NextResponse.json({
      success: true,
      stats: { totalExams, activeExams, archivedExams, pendingReviewCount },
      exams: enrichedExams,
    })
  } catch (err: any) {
    console.error('Server error in GET /api/admin/exams:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const body = await req.json()
    const {
      name, description, category_id, category, country_id, country,
      difficulty, question_count, time_limit_mins, official_website,
      official_notification_url, official_syllabus_url, authority, authority_id,
      exam_type, level, current_version, version_year, aliases,
      total_marks, negative_marking, passing_criteria, eligibility,
      attempt_rules, application_information, selection_process,
      marking_scheme, question_types, stages, papers, languages,
    } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Canonical exam name is required.' }, { status: 400 })
    }
    if (!country_id && !country) return NextResponse.json({ error: 'Country is required.' }, { status: 400 })
    if (!category_id && !category) return NextResponse.json({ error: 'Exam category is required.' }, { status: 400 })
    if (!authority_id && !authority) return NextResponse.json({ error: 'Exam authority is required.' }, { status: 400 })
    if (!exam_type || !level || !current_version || !version_year) {
      return NextResponse.json({ error: 'Exam type, level, current version and version year are required.' }, { status: 400 })
    }
    if (!isHttpsUrl(official_website)) return NextResponse.json({ error: 'Official authority website must be a valid HTTPS URL.' }, { status: 400 })
    if (!isHttpsUrl(official_notification_url) && !isHttpsUrl(official_syllabus_url)) {
      return NextResponse.json({ error: 'Provide at least one official notification/bulletin or syllabus HTTPS URL.' }, { status: 400 })
    }
    if (official_notification_url && !hostMatches(official_notification_url, official_website)) {
      return NextResponse.json({ error: 'Notification URL must belong to the official authority domain.' }, { status: 400 })
    }
    if (official_syllabus_url && !hostMatches(official_syllabus_url, official_website)) {
      return NextResponse.json({ error: 'Syllabus URL must belong to the official authority domain.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin() as any
    const match = await matchExamSmart(supabase, name)
    if (match.matched && match.confidence >= 85) {
      return NextResponse.json({
        error: `Duplicate exam detected: "${match.canonicalName}" (${match.confidence}% confidence). Creation blocked.`,
        duplicate: match.entity,
        matchType: match.matchType,
      }, { status: 409 })
    }

    let countryRow: any = null
    if (country_id) {
      const result = await supabase.from('countries').select('id,name').eq('id', country_id).maybeSingle()
      countryRow = result.data
    } else {
      const result = await supabase.from('countries').select('id,name').ilike('name', String(country)).maybeSingle()
      countryRow = result.data
    }
    if (!countryRow) return NextResponse.json({ error: 'Selected country was not found in the country catalog.' }, { status: 400 })

    let categoryRow: any = null
    if (category_id) {
      const result = await supabase.from('exam_categories').select('id,name').eq('id', category_id).maybeSingle()
      categoryRow = result.data
    } else {
      const result = await supabase.from('exam_categories').select('id,name').ilike('name', String(category)).maybeSingle()
      categoryRow = result.data
    }
    if (!categoryRow) return NextResponse.json({ error: 'Selected category was not found in the category catalog.' }, { status: 400 })

    let authorityRow: any = null
    if (authority_id) {
      const result = await supabase.from('exam_authorities').select('*').eq('id', authority_id).maybeSingle()
      authorityRow = result.data
    } else {
      const result = await supabase.from('exam_authorities').select('*').ilike('name', String(authority)).maybeSingle()
      authorityRow = result.data
    }
    if (authorityRow && authorityRow.official_website && !hostMatches(official_website, authorityRow.official_website)) {
      return NextResponse.json({ error: 'The authority name already exists with a different official domain. Review the authority record first.' }, { status: 409 })
    }
    if (authorityRow && !authorityRow.official_website) {
      const { data: updatedAuthority, error: authorityUpdateError } = await supabase.from('exam_authorities')
        .update({ official_website, source_url: official_website, country_id: countryRow.id, verification_status: 'pending_review', last_verified_at: null })
        .eq('id', authorityRow.id)
        .select('*')
        .single()
      if (authorityUpdateError) return NextResponse.json({ error: authorityUpdateError.message }, { status: 500 })
      authorityRow = updatedAuthority
    }
    if (!authorityRow) {
      const authorityName = String(authority).trim()
      const authoritySlug = normalizeInput(authorityName).slug || authorityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const authorityCode = String(authority_code || authorityName.split(/\\s+/).map((part: string) => part[0] || '').join('').toUpperCase().slice(0, 12) || authoritySlug.toUpperCase().slice(0, 12))
      const createdAuthority = await supabase.from('exam_authorities').insert({
        name: authorityName,
        code: authorityCode,
        slug: authoritySlug,
        country_id: countryRow.id,
        official_website,
        source_url: official_website,
        verification_status: 'pending_review',
        last_verified_at: null,
      }).select('*').single()
      if (createdAuthority.error) return NextResponse.json({ error: createdAuthority.error.message }, { status: 500 })
      authorityRow = createdAuthority.data
    }

    const norm = normalizeInput(name)
    const slug = norm.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { data: existingSlug } = await supabase.from('exams').select('id,name').eq('slug', slug).maybeSingle()
    if (existingSlug) return NextResponse.json({ error: `Exam slug already exists: ${existingSlug.name}`, duplicate: existingSlug }, { status: 409 })

    const versionYear = parseInt(String(version_year), 10)
    if (!Number.isInteger(versionYear) || versionYear < 1900 || versionYear > new Date().getFullYear() + 2) {
      return NextResponse.json({ error: 'Version year is invalid.' }, { status: 400 })
    }

    const versionLabel = String(current_version).trim()
    const officialSourceUrl = official_notification_url || official_syllabus_url
    const parsedAliases = Array.isArray(aliases)
      ? aliases.map((value: string) => value.trim()).filter(Boolean)
      : typeof aliases === 'string'
        ? aliases.split(',').map((value: string) => value.trim()).filter(Boolean)
        : []

    const examMetadata = pendingMetadata({
      created_by_admin: true,
      proposed_authority: authorityRow.name,
      exam_metadata_audit_status: 'needs_review',
      provisional_exam_rules: { status: 'admin_entered_pending_official_source_review' },
    })

    const { data: newExam, error: createError } = await supabase.from('exams').insert({
      name: name.trim(),
      slug,
      description: description || `Exam profile pending official verification: ${name.trim()}`,
      category_id: categoryRow.id,
      country_id: countryRow.id,
      authority_id: authorityRow.id,
      authority: authorityRow.name,
      exam_type: String(exam_type).trim(),
      level: String(level).trim(),
      difficulty: difficulty || 'Adaptive',
      question_count: parseNumber(question_count),
      time_limit_mins: parseNumber(time_limit_mins),
      total_marks: parseNumber(total_marks) || null,
      negative_marking: negative_marking || null,
      passing_criteria: passing_criteria || null,
      eligibility: eligibility || null,
      attempt_rules: attempt_rules || null,
      application_information: application_information || null,
      selection_process: selection_process || null,
      marking_scheme: parseJsonObject(marking_scheme),
      question_types: parseArray(question_types),
      stages: parseArray(stages),
      papers: parseArray(papers),
      languages: parseArray(languages),
      official_url: official_website,
      official_notification_url: isHttpsUrl(official_notification_url) ? official_notification_url : null,
      official_syllabus_url: isHttpsUrl(official_syllabus_url) ? official_syllabus_url : null,
      source_url: officialSourceUrl,
      current_version: versionLabel,
      version_year: versionYear,
      is_current: true,
      last_verified_at: null,
      next_verification_at: null,
      is_featured: !!is_featured,
      status: 'active',
      verification_status: 'pending_review',
      created_by_ai: false,
      metadata: examMetadata,
      syllabus_info: { source: 'official_source_pending_review', verification_status: 'pending_review' },
    }).select('*').single()

    if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

    const { error: versionError } = await supabase.from('exam_versions').insert({
      exam_id: newExam.id,
      version_year: versionYear,
      version_label: versionLabel,
      source_url: officialSourceUrl,
      pattern_summary: 'Awaiting field-level official exam-pattern verification.',
      verification_status: 'needs_review',
      verified_at: null,
      is_current: true,
      question_count: parseNumber(question_count) || null,
      time_limit_mins: parseNumber(time_limit_mins) || null,
      total_marks: parseNumber(total_marks) || null,
      metadata: { created_by_admin: true, verification_pending: true },
    })
    if (versionError) return NextResponse.json({ error: `Exam saved, but current version record failed: ${versionError.message}` }, { status: 500 })

    const sourceRows = []
    if (official_notification_url) sourceRows.push({
      exam_id: newExam.id,
      source_type: 'official_notification',
      source_url: official_notification_url,
      source_reference: `Official notification for ${versionLabel}`,
      publisher_authority: authorityRow.name,
      verification_status: 'pending',
      extracted_data: {},
    })
    if (official_syllabus_url) sourceRows.push({
      exam_id: newExam.id,
      source_type: 'official_syllabus',
      source_url: official_syllabus_url,
      source_reference: `Official syllabus for ${versionLabel}`,
      publisher_authority: authorityRow.name,
      verification_status: 'pending',
      extracted_data: {},
    })
    if (sourceRows.length) {
      const { error: evidenceError } = await supabase.from('exam_evidence').insert(sourceRows)
      if (evidenceError) console.error('[Admin Exams] Official source evidence insert failed:', evidenceError)
    }

    if (parsedAliases.length) {
      await supabase.from('exam_aliases').upsert(
        parsedAliases.map((alias: string) => ({ exam_id: newExam.id, alias: alias.toLowerCase() })),
        { onConflict: 'exam_id,alias' }
      )
    }

    await collectExamRulesProcess(newExam.id, newExam.name, countryRow.name, categoryRow.name, supabase)

    return NextResponse.json({
      success: true,
      exam: newExam,
      message: 'Exam saved as pending review. Curriculum generation remains blocked until official evidence and all required rules are approved.',
    })
  } catch (err: any) {
    console.error('POST /api/admin/exams failed:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const body = await req.json()
    const { examId, verification_status, aliases, ...fields } = body
    if (!examId) return NextResponse.json({ error: 'Missing examId' }, { status: 400 })
    if (verification_status !== undefined) {
      return NextResponse.json({ error: 'Direct verification status changes are disabled. Use the Exam Verification workflow.' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin() as any
    const { data: current, error: currentError } = await supabase.from('exams')
      .select('*')
      .eq('id', examId)
      .maybeSingle()
    if (currentError || !current) return NextResponse.json({ error: 'Exam record not found.' }, { status: 404 })

    // Resolve human-readable identity fields to canonical catalog records.
    if (fields.country) {
      const { data: countryRow } = await supabase.from('countries').select('id,name').ilike('name', String(fields.country)).maybeSingle()
      if (!countryRow) return NextResponse.json({ error: 'Country not found in the country catalog.' }, { status: 400 })
      fields.country_id = countryRow.id
      delete fields.country
    }
    if (fields.category) {
      const { data: categoryRow } = await supabase.from('exam_categories').select('id,name').ilike('name', String(fields.category)).maybeSingle()
      if (!categoryRow) return NextResponse.json({ error: 'Category not found in the category catalog.' }, { status: 400 })
      fields.category_id = categoryRow.id
      delete fields.category
    }
    if (fields.authority) {
      const { data: authorityRow } = await supabase.from('exam_authorities').select('*').ilike('name', String(fields.authority)).maybeSingle()
      if (!authorityRow) {
        const authorityName = String(fields.authority).trim()
        const authoritySlug = authorityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const authorityCode = authorityName.split(/\\s+/).map((part: string) => part[0] || '').join('').toUpperCase().slice(0, 12) || authoritySlug.toUpperCase().slice(0, 12)
        const { data: createdAuthority, error: authorityCreateError } = await supabase.from('exam_authorities').insert({
          name: authorityName,
          code: authorityCode,
          slug: authoritySlug,
          country_id: fields.country_id || current.country_id,
          official_website: fields.official_website || fields.official_url || null,
          source_url: fields.official_website || fields.official_url || null,
          verification_status: 'pending_review',
          last_verified_at: null,
        }).select('*').single()
        if (authorityCreateError) return NextResponse.json({ error: authorityCreateError.message }, { status: 500 })
        fields.authority_id = createdAuthority.id
      } else {
        fields.authority_id = authorityRow.id
      }
      fields.authority = String(fields.authority).trim()
    }
    if (fields.official_website !== undefined) {
      fields.official_url = fields.official_website
      delete fields.official_website
      if (fields.authority_id || current.authority_id) {
        await supabase.from('exam_authorities').update({
          official_website: fields.official_url,
          source_url: fields.official_url,
          verification_status: 'pending_review',
          last_verified_at: null,
          reviewed_by: null,
          reviewed_at: null,
          review_notes: null,
        }).eq('id', fields.authority_id || current.authority_id)
      }
    }

    if (typeof fields.question_types === 'string') fields.question_types = parseArray(fields.question_types)
    if (typeof fields.languages === 'string') fields.languages = parseArray(fields.languages)
    if (typeof fields.stages === 'string') fields.stages = parseArray(fields.stages)
    if (typeof fields.papers === 'string') fields.papers = parseArray(fields.papers)
    if (typeof fields.marking_scheme === 'string') fields.marking_scheme = parseJsonObject(fields.marking_scheme)

    const verificationFields = [
      'name','category_id','country_id','authority_id','authority','exam_type','level',
      'question_count','time_limit_mins','total_marks','negative_marking','passing_criteria',
      'eligibility','attempt_rules','application_information','selection_process',
      'marking_scheme','question_types','stages','papers','languages','current_version',
      'version_year','is_current','official_url','official_notification_url','official_syllabus_url',
      'official_reference_website','source_url','official_website',
    ]
    const requiresReaudit = verificationFields.some((field) => Object.prototype.hasOwnProperty.call(fields, field))
    const updateData: any = { updated_at: new Date().toISOString() }

    const allowedFields = [
      'name','description','category_id','country_id','authority_id','authority','category','country','exam_type','level',
      'difficulty','question_count','time_limit_mins','total_marks','negative_marking','passing_criteria',
      'eligibility','attempt_rules','application_information','selection_process','marking_scheme',
      'question_types','stages','papers','languages','current_version','version_year','is_current',
      'official_url','official_notification_url','official_syllabus_url','official_reference_website','source_url',
      'is_featured','status',
    ]
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(fields, field)) updateData[field] = fields[field]
    }

    if (requiresReaudit) {
      updateData.verification_status = 'needs_review'
      updateData.last_verified_at = null
      updateData.next_verification_at = null
      updateData.metadata = pendingMetadata(current.metadata)
      await supabase.from('exam_versions').update({
        verification_status: 'needs_review',
        verified_at: null,
      }).eq('exam_id', examId).eq('is_current', true)
      await supabase.from('exam_verification_audits').update({
        is_current: false,
        updated_at: new Date().toISOString(),
      }).eq('exam_id', examId).eq('is_current', true)
    }

    const { data: updated, error } = await supabase.from('exams')
      .update(updateData)
      .eq('id', examId)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (requiresReaudit) {
      const versionYear = Number(updated.version_year || 0)
      const versionLabel = updated.current_version || (versionYear ? String(versionYear) : null)
      const versionSourceUrl = updated.source_url || updated.official_notification_url || updated.official_syllabus_url
      if (versionYear > 0 && versionLabel && isHttpsUrl(versionSourceUrl)) {
        const { data: currentVersion } = await supabase.from('exam_versions')
          .select('id')
          .eq('exam_id', examId)
          .eq('is_current', true)
          .maybeSingle()

        const versionPayload = {
          version_year: versionYear,
          version_label: versionLabel,
          source_url: versionSourceUrl,
          pattern_summary: 'Awaiting field-level official exam-pattern verification.',
          verification_status: 'needs_review',
          verified_at: null,
          is_current: true,
          question_count: parseNumber(updated.question_count) || null,
          time_limit_mins: parseNumber(updated.time_limit_mins) || null,
          total_marks: parseNumber(updated.total_marks) || null,
          negative_marking: updated.negative_marking || null,
          passing_criteria: updated.passing_criteria || null,
          eligibility: updated.eligibility || null,
          attempt_rules: updated.attempt_rules || null,
          application_information: updated.application_information || null,
          selection_process: updated.selection_process || null,
          marking_scheme: updated.marking_scheme || null,
          question_types: updated.question_types || [],
          stages: updated.stages || [],
          papers: updated.papers || [],
          languages: updated.languages || [],
          metadata: { admin_updated: true, verification_pending: true },
          updated_at: new Date().toISOString(),
        }
        if (currentVersion?.id) {
          await supabase.from('exam_versions').update(versionPayload).eq('id', currentVersion.id)
        } else {
          await supabase.from('exam_versions').insert({ ...versionPayload, exam_id: examId })
        }
      }

      await collectExamRulesProcess(examId, updated.name, undefined, undefined, supabase)
    }

    if (aliases !== undefined) {
      const parsedAliases = Array.isArray(aliases)
        ? aliases.map((value: string) => value.trim()).filter(Boolean)
        : typeof aliases === 'string'
          ? aliases.split(',').map((value: string) => value.trim()).filter(Boolean)
          : []
      if (parsedAliases.length) {
        await supabase.from('exam_aliases').upsert(
          parsedAliases.map((alias: string) => ({ exam_id: examId, alias: alias.toLowerCase() })),
          { onConflict: 'exam_id,alias' }
        )
      }
    }

    return NextResponse.json({ success: true, exam: updated })
  } catch (err: any) {
    console.error('PATCH /api/admin/exams failed:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(req.url)
    const examId = searchParams.get('id')
    if (!examId) return NextResponse.json({ error: 'Exam ID required' }, { status: 400 })

    const supabase = getSupabaseAdmin() as any
    const { error } = await supabase.from('exams')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', examId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message: 'Exam archived successfully' })
  } catch (err: any) {
    console.error('DELETE /api/admin/exams failed:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
