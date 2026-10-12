import { getSupabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { resolveCurriculumRequest } from '@/lib/server/exam-intelligence'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 })
    }
    const adminClient = getSupabaseAdmin()
    const { data: authData, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 })
    }
    const { data: isAdmin, error: adminError } = await adminClient.rpc('is_admin', { p_user_id: authData.user.id })
    if (adminError || isAdmin !== true) {
      return NextResponse.json({ success: false, error: 'Admin access required for curriculum maintenance.' }, { status: 403 })
    }
    const body = await req.json()
    const { exam, subject, topic, subtopic } = body || {}

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
      subtopic: subtopic && typeof subtopic === 'string' ? subtopic.trim() : undefined,
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
