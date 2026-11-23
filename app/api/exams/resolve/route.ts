import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { examQuery, examId: requestedExamId, country, userId: requestedUserId } = body || {}

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

    // This endpoint is read-only for every caller. Canonical creation, user linking,
    // verification audit, and durable job handoff happen after verified signup in /api/onboarding.
    {
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
      const candidatePayload = (items: any[]) => items.map((exam: any) => ({
        id: exam.id,
        name: exam.name,
        shortName: exam.short_name || exam.name,
        country: exam.countries?.name || 'Unspecified',
        category: exam.exam_categories?.name || 'Unspecified',
      }))
      const ambiguousResponse = (items: any[]) => NextResponse.json({
        success: false,
        status: 'AMBIGUOUS',
        error: 'Multiple examinations match this name. Select the exact examination from the search results, including its country or authority.',
        candidates: candidatePayload(items),
      }, { status: 409 })

      let matchedExam: any = null
      if (typeof requestedExamId === 'string' && requestedExamId.trim()) {
        matchedExam = (exams || []).find((exam: any) => exam.id === requestedExamId.trim()) || null
        if (!matchedExam) {
          const { data: selectedExam, error: selectedExamError } = await admin
            .from('exams')
            .select(`
              id, name, short_name, slug, level, verification_status, metadata,
              current_version, version_year, difficulty, question_count, time_limit_mins,
              marking_scheme, countries(name, flag_emoji), exam_categories(name, slug),
              exam_subjects(id, name, exam_topics(id, name, exam_subtopics(id, name)))
            `)
            .eq('id', requestedExamId.trim())
            .neq('status', 'archived')
            .maybeSingle()
          if (selectedExamError || !selectedExam) {
            return NextResponse.json({ success: false, error: 'The selected examination is no longer available. Please choose it again.' }, { status: 404 })
          }
          matchedExam = selectedExam
        }

        const allowedLabels = [matchedExam.name, matchedExam.short_name || '', matchedExam.slug || '']
          .filter(Boolean)
          .map((value: string) => normalize(value))
        if (!allowedLabels.includes(query)) {
          const { data: aliasMatch, error: aliasError } = await admin
            .from('exam_aliases')
            .select('exam_id')
            .eq('exam_id', matchedExam.id)
            .ilike('alias', examQuery.trim())
            .maybeSingle()
          if (aliasError || !aliasMatch) {
            return NextResponse.json({ success: false, error: 'The selected exam does not match the entered exam name. Please select it again.' }, { status: 400 })
          }
        }
      } else {
        const exactMatches = (exams || []).filter((exam: any) =>
          normalize(exam.name || '') === query ||
          normalize(exam.short_name || '') === query ||
          normalize(exam.slug || '') === query
        )
        const countryMatches = normalizedCountry
          ? exactMatches.filter((exam: any) => normalize(exam.countries?.name || '') === normalizedCountry)
          : exactMatches

        if (countryMatches.length === 1) {
          matchedExam = countryMatches[0]
        } else if (countryMatches.length > 1) {
          return ambiguousResponse(countryMatches)
        } else if (exactMatches.length > 0) {
          if (normalizedCountry) {
            return NextResponse.json({
              success: false,
              status: 'JURISDICTION_MISMATCH',
              error: 'This exam name exists, but not in the selected jurisdiction. Check the country or clear it if you are unsure.',
            }, { status: 409 })
          }
          return ambiguousResponse(exactMatches)
        }

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
          const matchedAliases = (aliases || []).filter((alias: any) => normalize(alias.alias || '') === query)
          const aliasExamIds = [...new Set(matchedAliases.map((alias: any) => alias.exam_id))]
          let aliasExamMatches = (exams || []).filter((exam: any) => aliasExamIds.includes(exam.id))
          if (normalizedCountry) {
            const countryFilteredAliases = aliasExamMatches.filter((exam: any) =>
              normalize(exam.countries?.name || '') === normalizedCountry
            )
            if (countryFilteredAliases.length > 0) {
              aliasExamMatches = countryFilteredAliases
            } else if (aliasExamMatches.length > 0) {
              return NextResponse.json({
                success: false,
                status: 'JURISDICTION_MISMATCH',
                error: 'This exam alias matches a different jurisdiction. Check the country or clear it if you are unsure.',
              }, { status: 409 })
            }
          }
          if (aliasExamMatches.length === 1) {
            matchedExam = aliasExamMatches[0]
          } else if (aliasExamMatches.length > 1) {
            return ambiguousResponse(aliasExamMatches)
          }
        }
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
            difficulty: examVerified ? (matchedExam.difficulty || 'Unspecified') : 'Pending verification',
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


  } catch (error: any) {
    console.error('[Exam Resolution API] Unexpected failure:', error)
    return NextResponse.json(
      { success: false, error: 'We could not prepare this exam curriculum right now. Please retry in a moment.' },
      { status: 500 }
    )
  }
}
