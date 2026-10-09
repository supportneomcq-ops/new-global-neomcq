'use server'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { loginSchema, signupSchema, resetPasswordSchema, studyPreferencesSchema } from '@/lib/validations/auth'
import { revalidatePath } from 'next/cache'

export async function loginAction(formData: { email: string; password: string }) {
  const result = loginSchema.safeParse(formData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  let { data: authData, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  })

  if (error) {
    const errMsg = error.message || '';
    const status = (error as any).status;
    const code = (error as any).code;

    console.warn('[AUTH_DIAGNOSTIC]', {
      type: 'SUPABASE_AUTH_ERROR',
      message: errMsg,
      status,
      code,
    });

    if (errMsg.toLowerCase().includes('invalid login credentials') || errMsg.toLowerCase().includes('invalid credentials')) {
      return { error: 'Invalid login credentials. Please verify your email and password.', code: 'INVALID_CREDENTIALS' };
    }
    if (errMsg.toLowerCase().includes('email not confirmed') || errMsg.toLowerCase().includes('confirm your email')) {
      return { error: 'Your email address is not confirmed. Please check your inbox.', code: 'EMAIL_NOT_CONFIRMED' };
    }
    if (status === 429 || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('too many requests')) {
      return { error: 'Too many login attempts. Please try again later.', code: 'RATE_LIMITED' };
    }
    if (errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network') || errMsg.toLowerCase().includes('connection') || errMsg.toLowerCase().includes('api_key')) {
      return { error: 'Could not connect to the authentication server. Please check your network and try again.', code: 'SUPABASE_CONNECTION_ERROR' };
    }
    
    return { error: errMsg || 'Authentication failed. Please verify your credentials.', code: 'AUTH_FAILED' };
  }

  let redirectUrl = '/dashboard'

  if (authData?.user) {
    const adminClient = getSupabaseAdmin()
    
    const { data: userRoles } = await adminClient
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', authData.user.id)

    let roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || []


    if (roleNames.includes('admin') || roleNames.includes('super_admin') || roleNames.includes('content_admin')) {
      redirectUrl = '/admin'
    } else if (roleNames.includes('support')) {
      redirectUrl = '/support'
    }
  }

  revalidatePath('/', 'layout')
  return { success: true, redirectUrl }
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
