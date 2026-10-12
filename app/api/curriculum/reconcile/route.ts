import { getSupabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { reconcileCurriculum } from '@/lib/knowledge/reconciliation-service'

/**
 * POST /api/curriculum/reconcile
 * Master curriculum resolution & reconciliation endpoint.
 * Accepts either a raw 'examInput' name (Flow A) or an existing 'examId' (Flow B).
 * Resolves exams, verifies relevance, detects curriculum gaps, runs targeted AI gap
 * filling, and returns the complete hierarchical syllabus structure.
 */
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
    const { examInput, examId, country, category } = body

    if (!examId && (!examInput || !examInput.trim())) {
      return NextResponse.json(
        { success: false, error: 'Either examId or examInput must be provided.' },
        { status: 400 }
      )
    }

    console.log('[API-Curriculum-Reconcile] Received request:', {
      examId: examId || null,
      examInput: examInput || null,
      country: country || null,
      category: category || null,
    })

    const result = await reconcileCurriculum(
      examId || null,
      examInput || '',
      country || undefined,
      category || undefined
    )

    if (result.status === 'INVALID') {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      exam: result.exam || null,
      message: result.message,
    })
  } catch (err: any) {
    console.error('[API-Curriculum-Reconcile] Error processing curriculum reconciliation:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'An internal error occurred during curriculum reconciliation.' },
      { status: 500 }
    )
  }
}
