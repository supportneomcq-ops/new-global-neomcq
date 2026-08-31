import { NextRequest, NextResponse } from 'next/server'
import { resolveCurriculumRequest } from '@/lib/server/exam-intelligence'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { exam, subject, topic } = body || {}

    if (!exam || typeof exam !== 'string' || !exam.trim()) {
      return NextResponse.json(
        { error: 'Invalid request: "exam" string parameter is required.' },
        { status: 400 }
      )
    }

    const result = await resolveCurriculumRequest({
      exam: exam.trim(),
      subject: subject && typeof subject === 'string' ? subject.trim() : undefined,
      topic: topic && typeof topic === 'string' ? topic.trim() : undefined,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('API /api/exam-intelligence/resolve error:', err)
    return NextResponse.json(
      { error: err.message || 'Server error during exam intelligence resolution.' },
      { status: 500 }
    )
  }
}
