import { NextRequest, NextResponse } from 'next/server'
import { resolveOrInitializeExamIntelligence } from '@/lib/server/exam-intelligence'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { examQuery, country, category, userId: requestedUserId } = body || {}

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

    const result = await resolveOrInitializeExamIntelligence({
      examQuery: examQuery.trim(),
      country: typeof country === 'string' ? country.slice(0, 100) : undefined,
      category: typeof category === 'string' ? category.slice(0, 100) : undefined,
      userId: user?.id || undefined,
    })

    const rawError = typeof result?.error === 'string' ? result.error : ''
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
