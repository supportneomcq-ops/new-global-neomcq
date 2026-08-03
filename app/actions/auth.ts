'use server'

import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema, resetPasswordSchema, studyPreferencesSchema } from '@/lib/validations/auth'
import { revalidatePath } from 'next/cache'

export async function loginAction(formData: { email: string; password: string }) {
  const result = loginSchema.safeParse(formData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signupAction(formData: { email: string; password: string; firstName: string; lastName: string }) {
  const result = signupSchema.safeParse(formData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        first_name: result.data.firstName,
        last_name: result.data.lastName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, message: 'Account created successfully! Please check your email for verification.' }
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function resetPasswordAction(formData: { email: string }) {
  const result = resetPasswordSchema.safeParse(formData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(result.data.email)

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Password reset email sent successfully.' }
}

export async function updateStudyPreferencesAction(data: {
  dailyHours: number
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'night'
  learningMode: 'rapid' | 'balanced' | 'mastery'
  remindersEnabled: boolean
}) {
  const result = studyPreferencesSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Authentication required' }
  }

  const { error } = await (supabase as any)
    .from('study_preferences')
    .upsert({
      user_id: user.id,
      daily_hours: result.data.dailyHours,
      preferred_time: result.data.preferredTime,
      learning_mode: result.data.learningMode,
      reminders_enabled: result.data.remindersEnabled,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
