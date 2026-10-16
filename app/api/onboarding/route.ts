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
      examId,
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

    // The exam was already resolved on Step 2/3. Verify a supplied ID against the
    // database and reuse its persisted curriculum when complete. This prevents the
    // signup request from running the same expensive AI reconciliation a second time.
    // The ID is never trusted without a server-side lookup.
    let finalExamId: string | null = null
    let studyPlanReady = false
    let curriculumPending = false

    if (targetUserId) {
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
          if (countryData[0].default_timezone) resolvedTimezone = countryData[0].default_timezone
        }
      }

      if (language) {
        const canonicalLanguageName = language.trim().replace(/\\s*\\([^)]*\\)\\s*/g, '').trim()
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

      // Fast path: verify the Step 2/3 canonical exam ID and reuse its curriculum.
      // Compare the submitted label to canonical name/short name/slug to prevent an
      // unrelated client-supplied ID from being attached to the account.
      let curriculumReady = false
      if (validation.data.examId) {
        const { data: selectedExam, error: selectedExamError } = await (admin as any)
          .from('exams')
          .select('id, name, short_name, slug, status, metadata')
          .eq('id', validation.data.examId)
          .maybeSingle()

        if (selectedExamError) {
          console.error('[Onboarding] Selected exam lookup failed:', selectedExamError.message)
          return NextResponse.json(
            { success: false, error: 'We could not verify your selected exam. Please try again.' },
            { status: 503 }
          )
        }

        if (selectedExam && selectedExam.status !== 'archived') {
          const normalizeLabel = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
          const submittedLabel = normalizeLabel(examName)
          const allowedLabels = [selectedExam.name, selectedExam.short_name || '', selectedExam.slug || '']
            .filter(Boolean)
            .map((value: string) => normalizeLabel(value))

          if (!allowedLabels.includes(submittedLabel)) {
            return NextResponse.json(
              { success: false, error: 'Your selected exam details changed. Please return to exam selection and confirm the exam again.' },
              { status: 409 }
            )
          }

          finalExamId = selectedExam.id
          // Only trust a curriculum that passed the current hierarchy quality gate.
          // A single topic or a generic placeholder is not proof of a complete syllabus.
          const examMetadata = selectedExam.metadata || {}
          curriculumReady =
            examMetadata.curriculum_validation_version === 2 &&
            examMetadata.curriculum_validation_passed === true
        }
      }

      // Curriculum work is intentionally asynchronous. Signup persists the learner's
      // account and preferences first; the background task will reconcile this exam.
      curriculumPending = !curriculumReady

      // The versioned validation marker is the authoritative curriculum gate.
      // Do not make account creation depend on extra curriculum queries; the
      // background worker performs the full persisted-hierarchy verification.

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

      // Link the exam immediately only when its canonical ID is already known.
      // New exams are linked by the background curriculum task after resolution.
      if (finalExamId) {
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
            { success: false, error: 'We could not save your exam preferences. Please retry onboarding.' },
            { status: 500 }
          )
        }
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

      // A study plan is downstream of the curriculum. Do not block signup on it
      // while the curriculum is being validated in the background.
      if (!curriculumPending && finalExamId) {
        const planResult = await ensureCurrentStudyPlan(admin, targetUserId, finalExamId)
        studyPlanReady = Boolean(planResult.plan)
        if (!planResult.plan) {
          console.warn('[Onboarding] Study plan will need a later retry:', planResult.message)
        }
      }

      if (curriculumPending) {
        // Store durable status on the auth user so the dashboard can display the
        // validation screen after redirect or a later sign-in.
        const { data: authRecord } = await admin.auth.admin.getUserById(targetUserId)
        const pendingMetadata = {
          ...(authRecord?.user?.user_metadata || user?.user_metadata || {}),
          neo_curriculum_status: 'pending',
          neo_exam_name: examName,
          neo_exam_country: examCountry || country || null,
          neo_exam_category: examCategory || null,
          neo_exam_level: examLevel || null,
          neo_exam_date: cleanTargetDate,
          neo_curriculum_requested_at: new Date().toISOString(),
        }
        const { error: pendingMetadataError } = await admin.auth.admin.updateUserById(targetUserId, {
          user_metadata: pendingMetadata,
        })
        if (pendingMetadataError) {
          console.warn('[Onboarding] Could not persist pending curriculum status:', pendingMetadataError.message)
        }

        // Persist the curriculum request before returning. The scheduled worker owns
        // generation and retries; signup no longer depends on request-bound after().
        const curriculumKey = finalExamId
          ? `curriculum-rebuild-v1:${finalExamId}`
          : `curriculum-onboarding-v1:${examName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
        const { error: queueError } = await (admin as any).from('ai_jobs').upsert({
          task: 'curriculum_rebuild',
          exam_id: finalExamId,
          priority: /fmge|neet pg|neet ug|usmle/i.test(examName) ? 10 : 5,
          status: 'queued',
          max_attempts: 3,
          idempotency_key: curriculumKey,
          input_payload: {
            examId: finalExamId,
            examName,
            country: examCountry || country || null,
            category: examCategory || null,
            level: examLevel || null,
            userId: targetUserId,
            examDate: cleanTargetDate,
            source: 'signup_onboarding',
          },
          progress_stage: 'Queued for curriculum generation',
          step_percentage: 0,
        }, { onConflict: 'idempotency_key', ignoreDuplicates: true })
        if (queueError) {
          console.error('[Onboarding] Could not queue durable curriculum job:', queueError.message)
          return NextResponse.json({
            success: false,
            error: 'Your account was saved, but curriculum setup could not be queued. Please retry setup.',
          }, { status: 503 })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: curriculumPending
        ? 'Account saved. Your exam curriculum is being validated in the background.'
        : 'Onboarding preferences saved',
      userId: targetUserId,
      examId: finalExamId,
      studyPlanReady,
      curriculumStatus: curriculumPending ? 'pending' : 'ready',
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
