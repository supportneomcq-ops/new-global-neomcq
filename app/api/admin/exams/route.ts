import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    const { data: exams, error } = await (supabase as any)
      .from('exams')
      .select(`
        id,
        name,
        slug,
        description,
        difficulty,
        question_count,
        time_limit_mins,
        is_featured,
        created_by_ai,
        status,
        approval_status,
        aliases,
        ai_confidence_score,
        official_website,
        ai_version,
        prompt_version,
        version,
        created_at,
        updated_at,
        countries(name, iso2, flag_emoji),
        exam_categories(name, slug),
        exam_subjects(
          id,
          name,
          weight_percentage,
          topic_count,
          version,
          ai_confidence,
          exam_topics(id, name, level, target_weight)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get statistics
    const totalExams = exams?.length || 0
    const aiGeneratedCount = exams?.filter((e: any) => e.created_by_ai)?.length || 0
    const pendingReviewCount = exams?.filter((e: any) => e.approval_status === 'pending_review')?.length || 0
    const autoApprovedCount = exams?.filter((e: any) => e.approval_status === 'auto_approved')?.length || 0

    return NextResponse.json({
      success: true,
      stats: {
        totalExams,
        aiGeneratedCount,
        pendingReviewCount,
        autoApprovedCount,
      },
      exams: exams || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { examId, approval_status, is_featured, status, difficulty } = body

    if (!examId) {
      return NextResponse.json({ error: 'Missing examId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const updateData: any = { updated_at: new Date().toISOString() }

    if (approval_status) updateData.approval_status = approval_status
    if (typeof is_featured === 'boolean') updateData.is_featured = is_featured
    if (status) updateData.status = status
    if (difficulty) updateData.difficulty = difficulty

    const { data: updated, error } = await (supabase as any)
      .from('exams')
      .update(updateData)
      .eq('id', examId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, exam: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
