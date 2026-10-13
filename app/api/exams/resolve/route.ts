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
        .select('id, name, short_name, slug, level, countries(name, flag_emoji), exam_categories(name, slug)')
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
        return NextResponse.json({
          success: true,
          status: 'EXISTING_EXAM',
          exam: {
            id: matchedExam.id,
            name: matchedExam.name,
            shortName: matchedExam.short_name || matchedExam.name,
            country: matchedExam.countries?.name || 'Global',
            flag: matchedExam.countries?.flag_emoji || '🌐',
            category: matchedExam.exam_categories?.name || 'Professional Licensing',
            level: matchedExam.level || null,
          },
          curriculumStatus: 'verified_during_signup',
        })
      }

      return NextResponse.json({
        success: true,
        status: 'NEW_EXAM',
        exam: {
          id: null,
          name: examQuery.trim(),
          shortName: examQuery.trim(),
          country: typeof country === 'string' && country.trim() ? country.trim() : 'Global',
          flag: '🌐',
          category: typeof category === 'string' && category.trim() ? category.trim() : 'Professional Licensing',
          level: typeof level === 'string' && level.trim() ? level.trim().slice(0, 80) : null,
        },
        curriculumStatus: 'prepared_during_signup',
      })
    }

    const result = await resolveOrInitializeExamIntelligence({
      examQuery: examQuery.trim(),
      country: typeof country === 'string' ? country.slice(0, 100) : undefined,
      category: typeof category === 'string' ? category.slice(0, 100) : undefined,
      level: typeof level === 'string' ? level.slice(0, 80) : undefined,
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
