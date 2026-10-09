import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'
import { resolveOrInitializeExamIntelligence } from '@/lib/server/exam-intelligence'

const onboardingSchema = z.object({
  authId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  examName: z.string().min(1),
  examId: z.string().nullable().optional(),
  examDate: z.string().optional(),
  daysLeft: z.number().optional(),
  learningStyle: z.string().optional(),
  studyHours: z.number().optional(),
  studyTime: z.string().optional(),
  studyGoals: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = onboardingSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }

    const {
      authId,
      firstName,
      lastName,
      email,
      phone,
      country,
      language,
      examName,
      examId: inputExamId,
      examDate,
      learningStyle,
      studyHours,
      studyTime,
      studyGoals,
    } = validation.data

    // Check 5-Day Lockout Rule
    if (examDate) {
      const parsedExamDate = new Date(examDate)
      const now = new Date()
      parsedExamDate.setHours(0, 0, 0, 0)
      now.setHours(0, 0, 0, 0)
      const diffTime = parsedExamDate.getTime() - now.getTime()
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const learningPhaseDays = totalDays - 5
      if (learningPhaseDays <= 0) {
        return NextResponse.json(
          { error: 'The 5-Day Lockout Rule requires your exam date to be at least 6 days in the future to allow for a learning curriculum and revision buffer.' },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient()
    const admin = getSupabaseAdmin()

    // Prefer the verified session. For sign-ups that require email confirmation, accept only
    // the freshly-created, unconfirmed auth user whose email matches this onboarding request.
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()
    if (sessionError) {
      console.warn('[Onboarding] Could not resolve authenticated session:', sessionError.message)
    }

    let targetUserId: string | null = user?.id || null
    if (user && user.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'The signed-in account does not match this onboarding email.' }, { status: 403 })
    }

    if (!user && authId) {
      const { data: authLookup, error: authLookupError } = await admin.auth.admin.getUserById(authId)
      const pendingUser = authLookup?.user
      const createdAt = pendingUser?.created_at ? new Date(pendingUser.created_at).getTime() : 0
      const isRecentSignup = createdAt > 0 && Date.now() - createdAt <= 15 * 60 * 1000
      const emailMatches = pendingUser?.email?.toLowerCase() === email.toLowerCase()

      if (authLookupError || !pendingUser || !emailMatches || pendingUser.email_confirmed_at || !isRecentSignup) {
        return NextResponse.json(
          { error: 'Please verify your email or sign in again before finishing onboarding.' },
          { status: 401 }
        )
      }
      targetUserId = pendingUser.id
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Authentication required to save onboarding preferences.' }, { status: 401 })
    }

    let finalExamId: string | null = inputExamId || null

    if (targetUserId) {
      // 1. Resolve country_id and language_id from database
      let resolvedCountryId: string | null = null
      let resolvedLanguageId: string | null = null
      let resolvedTimezone = 'UTC'

      if (country) {
        const { data: countryData } = await (admin as any)
          .from('countries')
          .select('id, default_timezone')
          .ilike('name', country.trim())
          .limit(1)

        if (countryData && countryData.length > 0) {
          resolvedCountryId = countryData[0].id
          if (countryData[0].default_timezone) {
            resolvedTimezone = countryData[0].default_timezone
          }
        }
      }

      if (language) {
        const { data: langData } = await (admin as any)
          .from('languages')
          .select('id')
          .ilike('name', language.trim())
          .limit(1)

        if (langData && langData.length > 0) {
          resolvedLanguageId = langData[0].id
        }
      }

      // 2. Resolve or Initialize Exam Intelligence & Curriculum
      try {
        const resolved = await resolveOrInitializeExamIntelligence({
          examQuery: examName,
          country,
          userId: targetUserId,
        })
        if (resolved.success && resolved.exam?.id) {
          finalExamId = resolved.exam.id
        }
      } catch (examErr) {
        console.error('[Onboarding] Error resolving exam intelligence:', examErr)
      }

      // Update Profile
      await (admin as any)
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName || '',
          phone: phone || null,
          country_id: resolvedCountryId,
          language_id: resolvedLanguageId,
          timezone: resolvedTimezone,
          current_exam_id: finalExamId,
          exam_locked: true,
          exam_selected_at: new Date().toISOString(),
          exam_switch_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId)

      // Ensure clean ISO date string YYYY-MM-DD for target_date
      let cleanTargetDate: string | null = null
      if (examDate) {
        try {
          cleanTargetDate = new Date(examDate).toISOString().split('T')[0]
        } catch (_) {
          cleanTargetDate = examDate
        }
      }

      // 3. User Exam Link
      if (finalExamId) {
        await (admin as any)
          .from('user_exams')
          .upsert(
            {
              user_id: targetUserId,
              exam_id: finalExamId,
              target_date: cleanTargetDate,
              target_score: 85.0,
              status: 'in_progress',
              is_primary: true,
              last_accessed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,exam_id' }
          )
      }

      // Map learningStyle selection
      const mappedLearningMode = (learningStyle === 'Rapid Learning' || learningStyle === 'rapid') ? 'rapid' : 'balanced'

      // 4. Update Study Preferences
      await (admin as any).from('study_preferences').upsert({
        user_id: targetUserId,
        daily_hours: studyHours || 2.0,
        preferred_time: (studyTime?.toLowerCase() as any) || 'morning',
        learning_mode: mappedLearningMode,
        reminders_enabled: true,
        language_id: resolvedLanguageId,
        timezone: resolvedTimezone,
      }, { onConflict: 'user_id' })

      // 5. Enqueue Async AI Study Plan Generation Job
      const { data: aiJob } = await (admin as any).from('ai_jobs').insert({
        user_id: targetUserId,
        exam_id: finalExamId || null,
        task: 'study_plan_generation',
        status: 'queued',
        provider: 'Google Gemini AI',
        model: 'gemini-2.5-flash',
        priority: 5,
        input_payload: {
          job_type: 'study_plan',
          asset_type: 'study_plan',
          examName,
          examId: finalExamId,
          examDate,
          studyHours,
          studyTime,
          studyGoals,
        },
      }).select('id').single()

      if (aiJob?.id) {
        fetch(`${req.nextUrl.origin}/api/ai/process-job`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-secret': process.env.INTERNAL_API_SECRET || '',
          },
          body: JSON.stringify({ jobId: aiJob.id }),
        }).catch((err) => console.warn('[Onboarding] Background study-plan job could not be started:', err))
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding preferences saved and AI study plan job enqueued',
      userId: targetUserId,
      examId: finalExamId,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Onboarding failed' }, { status: 500 })
  }
}
