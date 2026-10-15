import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { resolveOrInitializeExamIntelligence } from '@/lib/server/exam-intelligence'
import { ensureCurrentStudyPlan } from '@/lib/study-plans/ensure-current-plan'

export const maxDuration = 60

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Please sign in to continue curriculum validation.' }, { status: 401 })
    }

    const metadata = user.user_metadata || {}
    const examName = typeof metadata.neo_exam_name === 'string' ? metadata.neo_exam_name.trim() : ''
    if (!examName) {
      return NextResponse.json({ success: false, error: 'We could not find the selected exam. Please contact support.' }, { status: 422 })
    }

    const admin = getSupabaseAdmin()
    const resolved = await resolveOrInitializeExamIntelligence({
      examQuery: examName,
      country: typeof metadata.neo_exam_country === 'string' ? metadata.neo_exam_country : undefined,
      category: typeof metadata.neo_exam_category === 'string' ? metadata.neo_exam_category : undefined,
      level: typeof metadata.neo_exam_level === 'string' ? metadata.neo_exam_level : undefined,
      userId: user.id,
    })

    if (!resolved?.success || !resolved.exam?.id) {
      return NextResponse.json({ success: false, error: 'Curriculum validation could not finish. Please try again shortly.' }, { status: 422 })
    }

    const examId = resolved.exam.id
    const { data: exam, error: examError } = await (admin as any)
      .from('exams')
      .select('id, name, metadata')
      .eq('id', examId)
      .maybeSingle()

    if (examError || !exam) {
      return NextResponse.json({ success: false, error: 'We could not verify the saved curriculum yet.' }, { status: 503 })
    }

    const examMetadata = exam.metadata || {}
    if (examMetadata.curriculum_validation_version !== 2 || examMetadata.curriculum_validation_passed !== true) {
      return NextResponse.json({ success: false, error: 'The syllabus still needs validation. Please retry shortly.' }, { status: 422 })
    }

    const { error: profileError } = await (admin as any)
      .from('profiles')
      .update({
        current_exam_id: examId,
        exam_locked: true,
        exam_selected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      return NextResponse.json({ success: false, error: 'The curriculum is ready, but we could not attach it to your account yet.' }, { status: 500 })
    }

    const { error: userExamError } = await (admin as any)
      .from('user_exams')
      .upsert({
        user_id: user.id,
        exam_id: examId,
        target_date: typeof metadata.neo_exam_date === 'string' ? metadata.neo_exam_date : null,
        target_score: 85,
        status: 'in_progress',
      }, { onConflict: 'user_id,exam_id' })

    if (userExamError) {
      return NextResponse.json({ success: false, error: 'The curriculum is ready, but we could not link it to your account yet.' }, { status: 500 })
    }

    const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...metadata,
        neo_curriculum_status: 'ready',
        neo_exam_id: examId,
        neo_exam_name: exam.name,
        neo_curriculum_ready_at: new Date().toISOString(),
      },
    })

    if (metadataError) {
      return NextResponse.json({ success: false, error: 'The curriculum is ready, but account status could not be refreshed yet.' }, { status: 500 })
    }

    try {
      const plan = await ensureCurrentStudyPlan(admin, user.id, examId)
      if (!plan.plan) console.warn('[Curriculum Retry] Curriculum ready; study plan will need retry:', plan.message)
    } catch (planError) {
      console.warn('[Curriculum Retry] Curriculum ready; study plan setup failed:', planError)
    }

    return NextResponse.json({ success: true, curriculumStatus: 'ready', examId })
  } catch (error) {
    console.error('[Curriculum Retry] Validation attempt failed:', error)
    return NextResponse.json({ success: false, error: 'Curriculum validation could not finish. Please try again shortly.' }, { status: 500 })
  }
}
