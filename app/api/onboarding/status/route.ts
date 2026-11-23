import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('current_exam_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json(
      { success: false, error: 'Preparation status is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  if (!profile?.current_exam_id) {
    return NextResponse.json({ success: true, preparationStatus: null }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('user_exams')
    .select('id')
    .eq('user_id', user.id)
    .eq('exam_id', profile.current_exam_id)
    .maybeSingle()

  if (enrollmentError || !enrollment) {
    return NextResponse.json({ success: true, preparationStatus: null }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const admin = getSupabaseAdmin() as any
  const [{ data: exam, error: examError }, { data: currentVersion, error: versionError }] = await Promise.all([
    admin
      .from('exams')
      .select('id, name, verification_status, metadata')
      .eq('id', profile.current_exam_id)
      .maybeSingle(),
    admin
      .from('exam_versions')
      .select('id, version_year, source_url, verified_at, verification_status')
      .eq('exam_id', profile.current_exam_id)
      .eq('is_current', true)
      .eq('verification_status', 'verified')
      .maybeSingle(),
  ])

  if (examError || !exam) {
    return NextResponse.json(
      { success: false, error: 'Preparation status is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  if (versionError) {
    console.warn('[Onboarding Status] Current exam version check failed:', versionError.message)
  }

  const metadata = exam.metadata || {}
  const hasApprovedCurrentVersion = Boolean(
    !versionError &&
    currentVersion?.verified_at &&
    currentVersion?.source_url &&
    currentVersion?.version_year
  )
  const verificationPending = !(
    exam.verification_status === 'verified' &&
    metadata.exam_metadata_audit_status === 'verified' &&
    hasApprovedCurrentVersion
  )
  const curriculumReady = Boolean(
    !verificationPending &&
    metadata.curriculum_validation_version === 4 &&
    metadata.curriculum_validation_passed === true
  )

  let job: any = null
  if (!curriculumReady) {
    const { data: jobs, error: jobsError } = await admin
      .from('ai_jobs')
      .select('status, progress_stage, step_percentage, error, user_id, input_payload, created_at')
      .eq('task', 'curriculum_rebuild')
      .eq('exam_id', profile.current_exam_id)
      .filter('input_payload->>userId', 'eq', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (jobsError) {
      console.warn('[Onboarding Status] Job lookup failed:', jobsError.message)
    } else {
      const candidate = jobs?.[0]
      if (candidate && (!candidate.user_id || candidate.user_id === user.id)) {
        job = candidate
      }
    }
  }

  return NextResponse.json({
    success: true,
    preparationStatus: {
      examName: exam.name || 'Selected exam',
      verificationPending,
      curriculumReady,
      jobStatus: job?.status || null,
      progressStage: job?.progress_stage || null,
      stepPercentage: Math.min(100, Math.max(0, Number(job?.step_percentage || 0))),
      hasJobError: Boolean(job?.error) && job?.status === 'failed',
    },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
