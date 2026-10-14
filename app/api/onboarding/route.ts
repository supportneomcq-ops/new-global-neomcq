import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'
import { resolveOrInitializeExamIntelligence } from '@/lib/server/exam-intelligence'
import { ensureCurrentStudyPlan } from '@/lib/study-plans/ensure-current-plan'

export const maxDuration = 60;

const onboardingSchema = z.object({
  authId: z.string().uuid().nullable().optional(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  examName: z.string().min(1),
  examId: z.string().nullable().optional(),
  examCountry: z.string().max(100).optional(),
  examCategory: z.string().max(100).optional(),
  examLevel: z.string().max(80).optional(),
  examDate: z.string()
    .min(1, 'Exam date is required')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid exam date'),
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
      examCountry,
      examCategory,
      examLevel,
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
      // Let users retry setup after a slow curriculum generation, but only for an
      // unconfirmed account created within the last 24 hours and with an exact email match.
      const isRecentSignup = createdAt > 0 && Date.now() - createdAt <= 24 * 60 * 60 * 1000
      const emailMatches = pendingUser?.email?.toLowerCase() === email.toLowerCase()
      const emailStillUnconfirmed = !pendingUser?.email_confirmed_at

      if (authLookupError || !pendingUser || !emailMatches || !isRecentSignup || !emailStillUnconfirmed) {
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

    // Never trust a client-supplied exam ID as the canonical curriculum source.
    // Resolve the submitted exam name server-side and stop if resolution fails.
    let finalExamId: string | null = null
    let studyPlanReady = false

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
        // UI labels such as "English (US/UK)" are display labels, not canonical DB names.
        // Normalize the label before resolving the foreign key so language preferences persist.
        const canonicalLanguageName = language.trim().replace(/\s*\([^)]*\)\s*/g, '').trim()
        const { data: langData, error: languageLookupError } = await (admin as any)
          .from('languages')
          .select('id')
          .ilike('name', canonicalLanguageName)
          .limit(1)

        if (languageLookupError) {
          console.warn('[Onboarding] Language lookup failed:', languageLookupError.message)
        } else if (langData && langData.length > 0) {
          resolvedLanguageId = langData[0].id
        }
      }

      // 2. Resolve or Initialize Exam Intelligence & Curriculum.
      // A successful HTTP response must never leave the user with an unresolved exam,
      // a preset slug (such as "fmge"), or a client-supplied ID that was not verified.
      try {
        const resolved = await resolveOrInitializeExamIntelligence({
          examQuery: examName,
          country: examCountry || country,
          category: examCategory,
          level: examLevel,
          userId: targetUserId,
        })
        if (!resolved?.success || !resolved.exam?.id) {
          console.error('[Onboarding] Exam resolution returned no canonical exam:', {
            examName,
            success: resolved?.success,
            hasExam: Boolean(resolved?.exam?.id),
          })
          return NextResponse.json(
            { success: false, error: 'We could not verify this exam and its curriculum. Please return to exam selection and try again.' },
            { status: 422 }
          )
        }
        finalExamId = resolved.exam.id

        // Do not finalize signup with an empty or topic-less curriculum. The selected
        // exam must have persisted, exam-specific subjects and at least one topic.
        const { data: curriculumSubjects, error: subjectsError } = await (admin as any)
          .from('exam_subjects')
          .select('id')
          .eq('exam_id', finalExamId)
          .limit(200)

        if (subjectsError) {
          console.error('[Onboarding] Curriculum subject verification failed:', subjectsError.message)
          return NextResponse.json(
            { success: false, error: 'We could not verify the saved exam curriculum. Please retry in a moment.' },
            { status: 503 }
          )
        }

        const subjectIds = (curriculumSubjects || []).map((subject: { id: string }) => subject.id)
        if (subjectIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'The selected exam curriculum is not ready yet. Please retry exam setup in a moment.' },
            { status: 422 }
          )
        }

        const { data: curriculumTopics, error: topicsError } = await (admin as any)
          .from('exam_topics')
          .select('id')
          .in('subject_id', subjectIds)
          .limit(1)

        if (topicsError) {
          console.error('[Onboarding] Curriculum topic verification failed:', topicsError.message)
          return NextResponse.json(
            { success: false, error: 'We could not verify the saved exam topics. Please retry in a moment.' },
            { status: 503 }
          )
        }
        if (!curriculumTopics || curriculumTopics.length === 0) {
          return NextResponse.json(
            { success: false, error: 'The selected exam has no saved topics yet. Please retry exam setup in a moment.' },
            { status: 422 }
          )
        }
      } catch (examErr) {
        console.error('[Onboarding] Error resolving exam intelligence:', examErr)
        return NextResponse.json(
          { success: false, error: 'We could not verify this exam and its curriculum. Your study profile has not been saved. Please try again.' },
          { status: 422 }
        )
      }

      // Update Profile and fail visibly if persistence fails.
      const { data: updatedProfile, error: profileError } = await (admin as any)
        .from('profiles')
        .upsert({
          id: targetUserId,
          auth_user_id: targetUserId,
          email: email.toLowerCase(),
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
        }, { onConflict: 'id' })
        .select('id')
        .single()

      if (profileError || !updatedProfile) {
        console.error('[Onboarding] Profile update failed or no profile row matched:', profileError)
        return NextResponse.json(
          { success: false, error: 'Your exam was verified, but we could not save your profile. Please retry onboarding.' },
          { status: 500 }
        )
      }

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
      const { error: userExamError } = await (admin as any)
        .from('user_exams')
        .upsert(
          {
            user_id: targetUserId,
            exam_id: finalExamId,
            target_date: cleanTargetDate,
            target_score: 85.0,
            status: 'in_progress',
          },
          { onConflict: 'user_id,exam_id' }
        )

      if (userExamError) {
        console.error('[Onboarding] User exam link failed:', userExamError)
        return NextResponse.json(
          { success: false, error: 'Your exam was verified, but we could not link it to your account. Please retry onboarding.' },
          { status: 500 }
        )
      }

      // Map learningStyle selection
      const normalizedLearningStyle = (learningStyle || '').toLowerCase()
      const mappedLearningMode = normalizedLearningStyle === 'rapid learning' || normalizedLearningStyle === 'rapid'
        ? 'rapid'
        : normalizedLearningStyle === 'regular study' || normalizedLearningStyle === 'regular' || normalizedLearningStyle === 'mastery'
          ? 'mastery'
          : 'balanced'

      // 4. Update Study Preferences
      const { error: preferencesError } = await (admin as any).from('study_preferences').upsert({
        user_id: targetUserId,
        daily_hours: studyHours || 2.0,
        preferred_time: (studyTime?.toLowerCase() as any) || 'morning',
        study_goals: Array.isArray(studyGoals) ? studyGoals.filter((goal) => typeof goal === 'string').slice(0, 10) : [],
        learning_mode: mappedLearningMode,
        reminders_enabled: true,
        language_id: resolvedLanguageId,
        timezone: resolvedTimezone,
      }, { onConflict: 'user_id' })

      if (preferencesError) {
        console.error('[Onboarding] Study preferences save failed:', preferencesError)
        return NextResponse.json(
          { success: false, error: 'Your exam was verified, but we could not save your study preferences. Please retry onboarding.' },
          { status: 500 }
        )
      }

      // 5. Persist the personalized plan from the verified exam curriculum before
      // completing onboarding. This avoids an unawaited AI job that could leave the
      // account looking ready while no plan exists.
      const planResult = await ensureCurrentStudyPlan(admin, targetUserId, finalExamId)
      if (!planResult.plan) {
        console.error('[Onboarding] Personalized study plan is not ready:', planResult.message)
        return NextResponse.json(
          { success: false, error: 'Your personalized study plan is not ready yet. Please retry onboarding.' },
          { status: 422 }
        )
      }
      studyPlanReady = true
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding preferences saved',
      userId: targetUserId,
      examId: finalExamId,
      studyPlanReady,
    })
  } catch (err: any) {
    // Keep database table names, SQL details, and provider internals out of the signup UI.
    console.error('[Onboarding] Unexpected setup failure:', err)
    return NextResponse.json({
      success: false,
      error: 'We could not finish setting up your account. Please retry. If the issue continues, contact support.',
    }, { status: 500 })
  }
}
