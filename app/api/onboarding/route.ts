import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { z } from 'zod/v3'
import { resolveOrInitializeExamIntelligence, collectExamRulesProcess } from '@/lib/server/exam-intelligence'
import { ensureCurrentStudyPlan } from '@/lib/study-plans/ensure-current-plan'
import { buildProfileInitialization } from '@/lib/server/onboarding/profile-initialization'

export const maxDuration = 60;

const onboardingSchema = z.object({
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
  examAuthority: z.string().trim().max(180).nullable().optional(),
  examOfficialWebsite: z.string().url().max(2048).nullable().optional(),
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
      examAuthority,
      examOfficialWebsite,
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

    // All onboarding writes require a real Supabase session. A client-supplied Auth UUID
    // is not proof of account ownership, even when its email and creation time appear to match.
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Please verify your email or sign in before finishing onboarding.' },
        { status: 401 }
      )
    }
    if (!user.email || user.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'The signed-in account does not match this onboarding email.' }, { status: 403 })
    }
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Please verify your email before finishing onboarding.' },
        { status: 403 }
      )
    }
    const targetUserId = user.id

    // The exam was already resolved on Step 2/3. Verify a supplied ID against the
    // database and reuse its persisted curriculum when complete. This prevents the
    // signup request from running the same expensive AI reconciliation a second time.
    // The ID is never trusted without a server-side lookup.
    let finalExamId: string | null = null
    let studyPlanReady = false
    let curriculumPending = false
    let examVerificationPending = true

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

      // Resolve new or unlisted exams through the existing canonical engine only after
      // the learner has an authenticated session. That engine creates a provisional
      // record with unknown official rules and starts the existing evidence-review flow.
      let curriculumReady = false
      let requestedExamId = validation.data.examId || null
      let resolvedByServer = false
      let rulesAuditedByEngine = false

      if (!requestedExamId) {
        // If an earlier attempt persisted the profile before a later write failed,
        // recognize the same exam and resume instead of creating another provisional row.
        const { data: existingEnrollmentProfile, error: enrollmentProfileError } = await (admin as any)
          .from('profiles')
          .select('current_exam_id')
          .eq('id', targetUserId)
          .maybeSingle()
        if (enrollmentProfileError) {
          return NextResponse.json(
            { success: false, error: 'We could not load your existing exam selection. Please retry.' },
            { status: 503 }
          )
        }

        if (existingEnrollmentProfile?.current_exam_id) {
          const { data: currentExam, error: currentExamError } = await (admin as any)
            .from('exams')
            .select('id, name, short_name, slug')
            .eq('id', existingEnrollmentProfile.current_exam_id)
            .maybeSingle()
          if (currentExamError || !currentExam) {
            return NextResponse.json(
              { success: false, error: 'Your existing exam selection could not be recovered. Please contact support.' },
              { status: 409 }
            )
          }

          const normalizeLabel = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
          const submittedLabel = normalizeLabel(examName)
          const currentLabels = [currentExam.name, currentExam.short_name || '', currentExam.slug || '']
            .filter(Boolean)
            .map((value: string) => normalizeLabel(value))
          let matchesExistingExam = currentLabels.includes(submittedLabel)

          if (!matchesExistingExam) {
            const { data: aliasMatch, error: aliasError } = await (admin as any)
              .from('exam_aliases')
              .select('exam_id')
              .eq('exam_id', currentExam.id)
              .ilike('alias', examName.trim())
              .maybeSingle()
            if (aliasError) {
              return NextResponse.json(
                { success: false, error: 'We could not verify your existing exam alias. Please retry.' },
                { status: 503 }
              )
            }
            matchesExistingExam = Boolean(aliasMatch)
          }

          if (!matchesExistingExam) {
            return NextResponse.json(
              { success: false, error: 'Your account already has a selected examination. Use the exam-change workflow to switch examinations.' },
              { status: 409 }
            )
          }

          requestedExamId = currentExam.id
          resolvedByServer = true
        }
      }

      if (!requestedExamId) {
        try {
          const resolution = await resolveOrInitializeExamIntelligence({
            examQuery: examName.trim(),
            country: (examCountry || country || '').trim() || undefined,
            category: examCategory?.trim() || undefined,
            level: examLevel?.trim() || undefined,
            authorityName: examAuthority?.trim() || undefined,
            officialWebsite: examOfficialWebsite?.trim() || undefined,
            deferCurriculumPreparation: true,
            userId: targetUserId,
          })
          if (!resolution?.success || !resolution.exam?.id) {
            return NextResponse.json(
              { success: false, error: 'We could not create or resolve this exam request. Please review the exam details and retry.' },
              { status: 422 }
            )
          }
          requestedExamId = resolution.exam.id
          resolvedByServer = true
          rulesAuditedByEngine = true
        } catch (resolutionError: any) {
          console.error('[Onboarding] Canonical exam resolution failed:', resolutionError?.message || resolutionError)
          return NextResponse.json(
            { success: false, error: 'We could not resolve this examination right now. Please retry.' },
            { status: 422 }
          )
        }
      }

      const { data: selectedExam, error: selectedExamError } = await (admin as any)
        .from('exams')
        .select('id, name, short_name, slug, status, verification_status, metadata')
        .eq('id', requestedExamId)
        .maybeSingle()

      if (selectedExamError) {
        console.error('[Onboarding] Selected exam lookup failed:', selectedExamError.message)
        return NextResponse.json(
          { success: false, error: 'We could not verify your selected exam. Please try again.' },
          { status: 503 }
        )
      }
      if (!selectedExam || selectedExam.status === 'archived') {
        return NextResponse.json(
          { success: false, error: 'The selected exam is no longer available. Please search and select it again.' },
          { status: 404 }
        )
      }

      // A supplied ID must match the canonical name, short name, or slug. When the
      // server itself resolved a free-text request, the engine's canonical result is trusted.
      if (!resolvedByServer) {
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
      }

      finalExamId = selectedExam.id
      const examMetadata = selectedExam.metadata || {}
      const examVerified =
        String(selectedExam.verification_status || 'pending_review').toLowerCase() === 'verified' &&
        examMetadata.exam_metadata_audit_status === 'verified'

      // The pre-signup exam search is intentionally read-only. If it supplied an
      // existing but unverified exam ID, run the existing field-level rules audit
      // now; never promote the exam automatically from this onboarding request.
      if (!examVerified && !rulesAuditedByEngine) {
        try {
          await collectExamRulesProcess(
            selectedExam.id,
            selectedExam.name,
            examCountry || country,
            examCategory,
            admin
          )
        } catch (rulesAuditError: any) {
          console.error('[Onboarding] Existing exam rules audit failed:', rulesAuditError?.message || rulesAuditError)
          return NextResponse.json(
            { success: false, error: 'We could not complete the examination verification checks right now. Please retry.' },
            { status: 503 }
          )
        }
      }

      examVerificationPending = !examVerified
      curriculumReady =
        examVerified &&
        examMetadata.curriculum_validation_version === 4 &&
        examMetadata.curriculum_validation_passed === true

      // Curriculum work is intentionally asynchronous. Signup persists the learner's
      // account and preferences first; the background task will reconcile this exam.
      curriculumPending = !curriculumReady

      // The versioned validation marker is the authoritative curriculum gate.
      // Do not make account creation depend on extra curriculum queries; the
      // background worker performs the full persisted-hierarchy verification.

      // Read the existing row first. Onboarding retries must not reset a learner's
      // profile, preferences, exam lock, or exam-switch counter.
      const { data: existingProfile, error: existingProfileError } = await (admin as any)
        .from('profiles')
        .select('id, first_name, last_name, phone, country_id, language_id, timezone, current_exam_id, exam_locked, exam_selected_at, exam_switch_count')
        .eq('id', targetUserId)
        .maybeSingle()

      if (existingProfileError) {
        console.error('[Onboarding] Existing profile lookup failed:', existingProfileError.message)
        return NextResponse.json(
          { success: false, error: 'We could not load your existing profile. Please retry.' },
          { status: 503 }
        )
      }

      // Initial onboarding is not an exam-switch mechanism. Existing learners must use
      // the established exam-switch workflow rather than bypassing its lock/payment rules.
      if (existingProfile?.current_exam_id && finalExamId && existingProfile.current_exam_id !== finalExamId) {
        return NextResponse.json(
          { success: false, error: 'Your account already has a selected examination. Use the exam-change workflow to switch examinations.' },
          { status: 409 }
        )
      }

      const profilePayload = buildProfileInitialization(existingProfile, {
        userId: targetUserId,
        email: user.email,
        firstName,
        lastName,
        phone,
        countryId: resolvedCountryId,
        languageId: resolvedLanguageId,
        timezone: resolvedTimezone,
        examId: finalExamId,
        curriculumReady,
      })
      const { data: updatedProfile, error: profileError } = await (admin as any)
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select('id')
        .single()

      if (profileError || !updatedProfile) {
        console.error('[Onboarding] Profile update failed or no profile row matched:', profileError)
        return NextResponse.json(
          { success: false, error: 'We could not save your profile. Please retry onboarding.' },
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

      // Link idempotently without overwriting an existing learner's target score,
      // enrollment status, or target date. The canonical resolver may already have
      // created this relationship for a newly requested provisional exam.
      if (finalExamId) {
        const { data: existingUserExam, error: userExamLookupError } = await (admin as any)
          .from('user_exams')
          .select('id, target_date')
          .eq('user_id', targetUserId)
          .eq('exam_id', finalExamId)
          .maybeSingle()

        if (userExamLookupError) {
          console.error('[Onboarding] User exam relationship lookup failed:', userExamLookupError.message)
          return NextResponse.json(
            { success: false, error: 'We could not confirm your exam selection. Please retry.' },
            { status: 503 }
          )
        }

        if (!existingUserExam) {
          const { error: userExamInsertError } = await (admin as any)
            .from('user_exams')
            .insert({
              user_id: targetUserId,
              exam_id: finalExamId,
              target_date: cleanTargetDate,
              status: 'in_progress',
            })

          if (userExamInsertError && userExamInsertError.code !== '23505') {
            console.error('[Onboarding] User exam link failed:', userExamInsertError.message)
            return NextResponse.json(
              { success: false, error: 'We could not save your exam preferences. Please retry onboarding.' },
              { status: 500 }
            )
          }

          if (userExamInsertError?.code === '23505') {
            const { data: confirmedLink, error: confirmLinkError } = await (admin as any)
              .from('user_exams')
              .select('id')
              .eq('user_id', targetUserId)
              .eq('exam_id', finalExamId)
              .maybeSingle()
            if (confirmLinkError || !confirmedLink) {
              return NextResponse.json(
                { success: false, error: 'We could not confirm your exam selection. Please retry.' },
                { status: 503 }
              )
            }
          }
        } else if (!existingUserExam.target_date && cleanTargetDate) {
          const { error: targetDateError } = await (admin as any)
            .from('user_exams')
            .update({ target_date: cleanTargetDate })
            .eq('id', existingUserExam.id)
            .eq('user_id', targetUserId)
          if (targetDateError) {
            console.error('[Onboarding] Target date update failed:', targetDateError.message)
            return NextResponse.json(
              { success: false, error: 'We could not save your exam date. Please retry.' },
              { status: 500 }
            )
          }
        }
      }

      // Map learningStyle selection
      const normalizedLearningStyle = (learningStyle || '').toLowerCase()
      const mappedLearningMode = normalizedLearningStyle === 'rapid learning' || normalizedLearningStyle === 'rapid'
        ? 'rapid'
        : normalizedLearningStyle === 'regular study' || normalizedLearningStyle === 'regular' || normalizedLearningStyle === 'mastery'
          ? 'mastery'
          : 'balanced'

      // 4. Initialize study preferences only when no row exists. Re-entering onboarding
      // must not silently replace preferences that the learner has already customized.
      const { data: existingPreferences, error: preferencesLookupError } = await (admin as any)
        .from('study_preferences')
        .select('user_id')
        .eq('user_id', targetUserId)
        .maybeSingle()

      if (preferencesLookupError) {
        console.error('[Onboarding] Study preferences lookup failed:', preferencesLookupError.message)
        return NextResponse.json(
          { success: false, error: 'We could not load your study preferences. Please retry.' },
          { status: 503 }
        )
      }

      if (!existingPreferences) {
        const { error: preferencesError } = await (admin as any).from('study_preferences').insert({
          user_id: targetUserId,
          daily_hours: studyHours || 2.0,
          preferred_time: (studyTime?.toLowerCase() as any) || 'morning',
          study_goals: Array.isArray(studyGoals) ? studyGoals.filter((goal) => typeof goal === 'string').slice(0, 10) : [],
          learning_mode: mappedLearningMode,
          reminders_enabled: true,
          language_id: resolvedLanguageId,
          timezone: resolvedTimezone,
        })

        if (preferencesError && preferencesError.code !== '23505') {
          console.error('[Onboarding] Study preferences save failed:', preferencesError.message)
          return NextResponse.json(
            { success: false, error: 'We could not save your study preferences. Please retry onboarding.' },
            { status: 500 }
          )
        }
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
          neo_exam_verification_status: examVerificationPending ? 'pending' : 'verified',
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
        const normalizeQueuePart = (value?: string | null) =>
          String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const examIdentityKey = [
          examName,
          examCountry || country || 'global',
          examCategory || 'uncategorized',
          examLevel || 'unspecified-level',
        ].map(normalizeQueuePart).join(':')
        // Each learner needs their own attachment job. The canonical exam specification
        // is cached on the exam record, so subsequent jobs reuse it without paying for
        // another full AI curriculum generation.
        const curriculumKey = finalExamId
          ? `curriculum-onboarding-v1:${finalExamId}:${targetUserId}`
          : `curriculum-onboarding-v1:new:${examIdentityKey}:${targetUserId}`
        const { data: insertedJob, error: queueError } = await (admin as any).from('ai_jobs').upsert({
          task: 'curriculum_rebuild',
          exam_id: finalExamId,
          priority: 5,
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
          .select('id, status, attempts, max_attempts')
          .maybeSingle()

        if (queueError) {
          console.error('[Onboarding] Could not queue durable curriculum job:', queueError.message)
          return NextResponse.json({
            success: false,
            error: 'Your account was saved, but curriculum setup could not be queued. Please retry setup.',
          }, { status: 503 })
        }

        // An idempotent upsert may return no row when the same job already exists.
        // Read that durable job so retries can resume instead of silently doing nothing.
        const { data: existingJob, error: jobLookupError } = insertedJob
          ? { data: insertedJob, error: null }
          : await (admin as any).from('ai_jobs')
              .select('id, status, attempts, max_attempts')
              .eq('idempotency_key', curriculumKey)
              .maybeSingle()

        if (jobLookupError || !existingJob) {
          console.error('[Onboarding] Queued curriculum job could not be read:', jobLookupError?.message)
          return NextResponse.json({
            success: false,
            error: 'Your account was saved, but curriculum setup could not be confirmed. Please retry setup.',
          }, { status: 503 })
        }

        let jobToKick = existingJob
        if (
          jobToKick.status === 'failed' &&
          Number(jobToKick.attempts || 0) >= Number(jobToKick.max_attempts || 3)
        ) {
          const { data: resetJob, error: resetError } = await (admin as any).from('ai_jobs')
            .update({
              status: 'queued',
              attempts: 0,
              max_attempts: 3,
              error: null,
              started_at: null,
              completed_at: null,
              progress_stage: 'Queued for a fresh curriculum retry',
              step_percentage: 0,
            })
            .eq('id', jobToKick.id)
            .eq('status', 'failed')
            .select('id, status, attempts, max_attempts')
            .maybeSingle()

          if (resetError || !resetJob) {
            console.error('[Onboarding] Failed curriculum job could not be requeued:', resetError?.message)
            return NextResponse.json({
              success: false,
              error: 'Your account was saved, but curriculum retry could not be queued. Please retry setup.',
            }, { status: 503 })
          }
          jobToKick = resetJob
        }

        // Do not run curriculum generation inside the signup request lifecycle.
        // Supabase pg_cron claims durable curriculum jobs independently every minute.
        // Keeping the worker out of after() prevents long AI work from extending the
        // onboarding request and causing Vercel function timeouts.
        if (jobToKick.status === 'queued' || jobToKick.status === 'failed') {
          console.info('[Onboarding] Curriculum job persisted for the scheduled worker:', jobToKick.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: curriculumPending
        ? (examVerificationPending
            ? 'Account saved. Your exam is waiting for official verification; curriculum generation will begin after approval.'
            : 'Account saved. Your verified exam curriculum is being validated in the background.')
        : 'Onboarding preferences saved',
      userId: targetUserId,
      examId: finalExamId,
      studyPlanReady,
      curriculumStatus: curriculumPending ? (examVerificationPending ? 'verification_pending' : 'pending') : 'ready',
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
