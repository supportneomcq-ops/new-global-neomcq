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
      examDate,
      studyHours,
      studyTime,
      studyGoals,
    } = validation.data

    const supabase = await createClient()

    // Retrieve current authenticated user or authId
    const { data: { user } } = await supabase.auth.getUser()
    const targetUserId = user?.id || authId

    if (targetUserId) {
      // 1. Update Profile (Profile creation is handled by trigger on_auth_user_created)
      await (supabase as any)
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName || '',
          phone: phone || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        })
        .eq('id', targetUserId)

      // 2. Find or insert exam (check slug or exact name)
      const examSlug = examName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
      let examId: string | null = null

      const { data: existingExams } = await (supabase as any)
        .from('exams')
        .select('id, name, slug')
        .or(`slug.eq.${examSlug},name.ilike.${examName.trim()}`)
        .limit(1)

      if (existingExams && existingExams.length > 0) {
        examId = existingExams[0].id
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

        if (newExam) examId = newExam.id
      }

      // 3. User Exam Link
      if (examId) {
        // First delete any previous user_exams if resetting, or upsert
        await (supabase as any)
          .from('user_exams')
          .upsert(
            {
              user_id: targetUserId,
              exam_id: examId,
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
      })

      // 5. Enqueue Async AI Study Plan Generation Job
      const { data: aiJob } = await (supabase as any).from('ai_generation_jobs').insert({
        user_id: targetUserId,
        job_type: 'study_plan',
        status: 'pending',
        input_params: {
          examName,
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
