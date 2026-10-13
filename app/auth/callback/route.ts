import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const requestedNext = requestUrl.searchParams.get('next') ?? '/dashboard'
  // Only allow redirects whose parsed origin remains this application.
  let next = '/dashboard'
  try {
    const target = new URL(requestedNext, requestUrl.origin)
    if (target.origin === requestUrl.origin) {
      next = `${target.pathname}${target.search}${target.hash}`
    }
  } catch {
    // Keep the safe dashboard fallback for malformed redirect targets.
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.redirect(new URL('/?error=auth_callback_failed', requestUrl.origin))
      }

      // Email links can be clicked while the signup tab is still preparing the exam.
      // Only enter the dashboard after all required onboarding records are present.
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_exam_id')
        .eq('id', user.id)
        .maybeSingle()

      let onboardingComplete = false
      if (profile?.current_exam_id) {
        const [userExamResult, preferencesResult, planResult] = await Promise.all([
          supabase
            .from('user_exams')
            .select('target_date')
            .eq('user_id', user.id)
            .eq('exam_id', profile.current_exam_id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from('study_preferences')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('study_plans')
            .select('id')
            .eq('user_id', user.id)
            .eq('exam_id', profile.current_exam_id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle(),
        ])

        onboardingComplete = Boolean(
          userExamResult.data?.target_date &&
          preferencesResult.data?.user_id &&
          planResult.data?.id
        )
      }

      if (!onboardingComplete) {
        return NextResponse.redirect(new URL('/onboarding?resume=1', requestUrl.origin))
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // Return the user to an error page or homepage with instructions
  return NextResponse.redirect(new URL('/?error=auth_callback_failed', requestUrl.origin))
}
