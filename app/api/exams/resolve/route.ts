import { NextRequest, NextResponse } from 'next/server'
import { resolveOrInitializeExamIntelligence } from '@/lib/server/exam-intelligence'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { examQuery, country, category, userId } = body || {}

    if (!examQuery || typeof examQuery !== 'string' || !examQuery.trim()) {
      return NextResponse.json(
        { success: false, error: 'Exam search term or name is required' },
        { status: 400 }
      )
    }

    const result = await resolveOrInitializeExamIntelligence({
      examQuery: examQuery.trim(),
      country,
      category,
      userId,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Exam Resolution API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resolve exam curriculum' },
      { status: 400 }
    )
  }
}
