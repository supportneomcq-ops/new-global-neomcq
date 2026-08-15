import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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
      studyHours,
      studyTime,
      studyGoals,
    } = validation.data

    // Check 5-Day Lockout Rule
    if (examDate) {
      const parsedExamDate = new Date(examDate)
      const now = new Date()
      // Normalize to midnight
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

    // Retrieve current authenticated user or authId
    const { data: { user } } = await supabase.auth.getUser()
    const targetUserId = user?.id || authId

    if (targetUserId) {
      // 1. Resolve country_id and language_id from database
      let resolvedCountryId: string | null = null
      let resolvedLanguageId: string | null = null
      let resolvedTimezone = 'UTC'

      if (country) {
        const { data: countryData } = await (supabase as any)
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
        const { data: langData } = await (supabase as any)
          .from('languages')
          .select('id')
          .ilike('name', language.trim())
          .limit(1)

        if (langData && langData.length > 0) {
          resolvedLanguageId = langData[0].id
        }
      }

      // Update Profile (Profile creation is handled by trigger on_auth_user_created or manual signup)
      await (supabase as any)
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName || '',
          phone: phone || null,
          country_id: resolvedCountryId,
          language_id: resolvedLanguageId,
          timezone: resolvedTimezone,
        })
        .eq('id', targetUserId)

      // 2. Find or insert exam (check slug or exact name, or direct inputExamId)
      let finalExamId: string | null = null

      if (inputExamId) {
        const { data: matchedExam } = await (supabase as any)
          .from('exams')
          .select('id')
          .eq('id', inputExamId)
          .limit(1)
        if (matchedExam && matchedExam.length > 0) {
          finalExamId = matchedExam[0].id
        }
      }

      if (!finalExamId) {
        const examSlug = examName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
        const { data: existingExams } = await (supabase as any)
          .from('exams')
          .select('id, name, slug')
          .or(`slug.eq.${examSlug},name.ilike.${examName.trim()}`)
          .limit(1)

        if (existingExams && existingExams.length > 0) {
          finalExamId = existingExams[0].id
        } else {
          // Check exam_aliases before inserting a new custom exam
          const { data: aliasExams } = await (supabase as any)
            .from('exam_aliases')
            .select('exam_id')
            .ilike('alias', examName.trim())
            .limit(1)

          if (aliasExams && aliasExams.length > 0) {
            finalExamId = aliasExams[0].exam_id
          } else {
            const { data: newExam } = await (supabase as any)
              .from('exams')
              .insert({
                name: examName.trim(),
                slug: examSlug,
                difficulty: 'Adaptive',
                status: 'active',
                created_by_ai: true,
              })
              .select('id')
              .single()

            if (newExam) finalExamId = newExam.id
          }
        }
      }

      // 3. User Exam Link
      if (finalExamId) {
        // First delete any previous user_exams if resetting, or upsert
        await (supabase as any)
          .from('user_exams')
          .upsert(
            {
              user_id: targetUserId,
              exam_id: finalExamId,
              target_date: examDate || null,
              target_score: 85.0,
              status: 'in_progress',
            },
            { onConflict: 'user_id,exam_id' }
          )
      }

      // 4. Update Study Preferences
      await (supabase as any).from('study_preferences').upsert({
        user_id: targetUserId,
        daily_hours: studyHours || 2.0,
        preferred_time: (studyTime?.toLowerCase() as any) || 'morning',
        learning_mode: 'balanced',
        reminders_enabled: true,
        language_id: resolvedLanguageId,
        timezone: resolvedTimezone,
      })

      // 5. Enqueue Async AI Study Plan Generation Job
      const { data: aiJob } = await (supabase as any).from('ai_generation_jobs').insert({
        user_id: targetUserId,
        job_type: 'study_plan',
        status: 'pending',
        input_params: {
          examName,
          examId: finalExamId,
          examDate,
          studyHours,
          studyTime,
          studyGoals,
        },
      }).select('id').single()

      // Async trigger process job worker in background
      if (aiJob?.id) {
        fetch(`${req.nextUrl.origin}/api/ai/process-job`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: aiJob.id }),
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding preferences saved and AI study plan job enqueued',
      userId: targetUserId,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Onboarding failed' }, { status: 500 })
  }
}
