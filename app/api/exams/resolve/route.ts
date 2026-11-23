import { NextRequest, NextResponse } from 'next/server'
import { resolveOrInitializeExamIntelligence } from '@/lib/server/exam-intelligence'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { examQuery, country, category, level, userId: requestedUserId } = body || {}

    if (!examQuery || typeof examQuery !== 'string' || !examQuery.trim() || examQuery.trim().length > 160) {
      return NextResponse.json(
        { success: false, error: 'Enter an exam name between 1 and 160 characters.' },
        { status: 400 }
      )
    }

    // Never trust a user ID supplied by an unauthenticated client.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (requestedUserId && (!user || requestedUserId !== user.id)) {
      return NextResponse.json(
        { success: false, error: 'The requested user does not match the signed-in account.' },
        { status: 403 }
      )
    }

    // Before signup, only resolve the canonical exam name. Do not run paid AI curriculum
    // generation for anonymous visitors; the full curriculum is prepared once onboarding
    // has created the account and credit wallet.
    if (!user) {
      const admin = getSupabaseAdmin()
      const { data: exams, error: examsError } = await admin
        .from('exams')
        .select(`
          id,
          name,
          short_name,
          slug,
          level,
          verification_status,
          metadata,
          current_version,
          version_year,
          difficulty,
          question_count,
          time_limit_mins,
          marking_scheme,
          countries(name, flag_emoji),
          exam_categories(name, slug),
          exam_subjects(
            id,
            name,
            exam_topics(
              id,
              name,
              exam_subtopics(id, name)
            )
          )
        `)
        .neq('status', 'archived')
        .limit(500)

      if (examsError) {
        console.error('[Exam Resolution] Canonical exam lookup failed:', examsError.message)
        return NextResponse.json({
          success: false,
          error: 'We could not verify this exam name right now. Please retry in a moment.',
        }, { status: 503 })
      }

      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      const query = normalize(examQuery.trim())
      const normalizedCountry = typeof country === 'string' ? normalize(country) : ''
      const exactMatches = (exams || []).filter((exam: any) =>
        normalize(exam.name || '') === query ||
        normalize(exam.short_name || '') === query ||
        normalize(exam.slug || '') === query
      )
      let matchedExam: any = exactMatches.find((exam: any) =>
        normalizedCountry && normalize(exam.countries?.name || '') === normalizedCountry
      ) || exactMatches[0]

      if (!matchedExam) {
        const { data: aliases, error: aliasesError } = await admin
          .from('exam_aliases')
          .select('exam_id, alias')
          .limit(5000)
        if (aliasesError) {
          console.error('[Exam Resolution] Canonical alias lookup failed:', aliasesError.message)
          return NextResponse.json({
            success: false,
            error: 'We could not verify this exam name right now. Please retry in a moment.',
          }, { status: 503 })
        }
        const matchedAlias = (aliases || []).find((alias: any) => normalize(alias.alias || '') === query)
        if (matchedAlias) matchedExam = (exams || []).find((exam: any) => exam.id === matchedAlias.exam_id)
      }

      if (matchedExam) {
        const metadata = matchedExam.metadata || {}
        const { data: currentExamVersion, error: currentVersionError } = await admin
          .from('exam_versions')
          .select('id, version_year, source_url, verified_at, verification_status')
          .eq('exam_id', matchedExam.id)
          .eq('is_current', true)
          .eq('verification_status', 'verified')
          .maybeSingle()
        if (currentVersionError) {
          console.warn('[Exam Resolution] Current exam version lookup failed:', currentVersionError.message)
        }
        const hasApprovedCurrentVersion = Boolean(
          !currentVersionError &&
          currentExamVersion?.verified_at &&
          currentExamVersion?.source_url &&
          currentExamVersion?.version_year
        )
        const examVerified =
          String(matchedExam.verification_status || '').toLowerCase() === 'verified' &&
          metadata.exam_metadata_audit_status === 'verified' &&
          hasApprovedCurrentVersion
        const curriculumReady =
          examVerified &&
          metadata.curriculum_validation_version === 4 &&
          metadata.curriculum_validation_passed === true
        const subjects = curriculumReady ? (matchedExam.exam_subjects || []) : []
        const subjectCount = subjects.length
        let topicCount = 0
        let subtopicCount = 0
        subjects.forEach((s: any) => {
          const topics = s.exam_topics || []
          topicCount += topics.length
          topics.forEach((t: any) => {
            if (t.exam_subtopics) subtopicCount += t.exam_subtopics.length
          })
        })

        return NextResponse.json({
          success: true,
          status: 'EXISTING_EXAM',
          exam: {
            id: matchedExam.id,
            name: matchedExam.name,
            shortName: matchedExam.short_name || matchedExam.name,
            country: examVerified ? (matchedExam.countries?.name || 'Unspecified') : 'Pending verification',
            flag: matchedExam.countries?.flag_emoji || '🌐',
            category: examVerified ? (matchedExam.exam_categories?.name || 'Unspecified') : 'Pending verification',
            level: examVerified ? (matchedExam.level || null) : null,
            difficulty: matchedExam.difficulty || 'Unspecified',
            question_count: examVerified && Number(matchedExam.question_count || 0) > 0 ? matchedExam.question_count : null,
            time_limit_mins: examVerified && Number(matchedExam.time_limit_mins || 0) > 0 ? matchedExam.time_limit_mins : null,
            current_version: examVerified ? (matchedExam.current_version || null) : null,
            version_year: examVerified ? (currentExamVersion.version_year || matchedExam.version_year || null) : null,
            marking_scheme: examVerified ? matchedExam.marking_scheme || null : null,
            verificationStatus: examVerified ? 'verified' : 'needs_review',
            examMetadataAuditStatus: metadata.exam_metadata_audit_status || 'needs_review',
            subjectCount,
            topicCount,
            subtopicCount,
            exam_subjects: subjects,
          },
          curriculumStatus: curriculumReady
            ? 'verified_during_signup'
            : examVerified
              ? 'curriculum_pending'
              : 'verification_pending',
        })
      }

      return NextResponse.json({
        success: true,
        status: 'NEW_EXAM',
        exam: {
          id: null,
          name: examQuery.trim(),
          shortName: examQuery.trim(),
          country: typeof country === 'string' && country.trim() ? country.trim() : 'Unspecified',
          flag: '🌐',
          category: typeof category === 'string' && category.trim() ? category.trim() : 'Unspecified',
          level: typeof level === 'string' && level.trim() ? level.trim().slice(0, 80) : null,
        },
        curriculumStatus: 'verification_pending',
      })
    }

    const result = await resolveOrInitializeExamIntelligence({
      examQuery: examQuery.trim(),
      country: typeof country === 'string' ? country.slice(0, 100) : undefined,
      category: typeof category === 'string' ? category.slice(0, 100) : undefined,
      level: typeof level === 'string' ? level.slice(0, 80) : undefined,
      deferCurriculumPreparation: true,
      userId: user.id,
    })

    const rawError = typeof (result as any)?.error === 'string' ? (result as any).error : ''
    const exposesInternals = /relation|column|schema|table|database|supabase|postgrest|sql|constraint|permission denied|does not exist|duplicate key|foreign key|PGRST\\d+/i.test(rawError)

    if (result?.success === false && exposesInternals) {
      console.error('[Exam Resolution] Internal curriculum failure:', rawError)
      return NextResponse.json({
        success: false,
        error: 'We could not prepare this exam curriculum right now. Please retry in a moment.',
      }, { status: 422 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[Exam Resolution API] Unexpected failure:', error)
    return NextResponse.json(
      { success: false, error: 'We could not prepare this exam curriculum right now. Please retry in a moment.' },
      { status: 500 }
    )
  }
}
