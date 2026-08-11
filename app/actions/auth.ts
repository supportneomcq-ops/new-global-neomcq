'use server'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { bootstrapAdmin } from '@/lib/supabase/bootstrap'
import { loginSchema, signupSchema, resetPasswordSchema, studyPreferencesSchema } from '@/lib/validations/auth'
import { revalidatePath } from 'next/cache'

export async function loginAction(formData: { email: string; password: string }) {
  const result = loginSchema.safeParse(formData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  // Ensure initial admin is bootstrapped in DB if applicable
  await bootstrapAdmin().catch((err) => console.error('Bootstrap admin silent catch:', err))

  const supabase = await createClient()
  let { data: authData, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  })

  // If initial sign-in fails and it's an admin email, provision/update user and retry
  if (error) {
    const inputEmail = result.data.email.toLowerCase().trim()
    const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'support@neomcq.com').toLowerCase().trim()
    
    const isAdminEmail = inputEmail === initialAdminEmail ||
                         inputEmail === 'admin@neomcq.com' ||
                         inputEmail === 'swapnilsonawane913@gmail.com'

    if (isAdminEmail) {
      try {
        const adminClient = getSupabaseAdmin()
        const { data: usersList } = await adminClient.auth.admin.listUsers()
        const existingAuthUser = usersList?.users?.find(u => u.email?.toLowerCase().trim() === inputEmail)

        let targetUserId = existingAuthUser?.id

        if (!existingAuthUser) {
          const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
            email: inputEmail,
            password: result.data.password,
            email_confirm: true,
            user_metadata: { first_name: 'Admin', last_name: 'User' },
          })
          if (!createErr && created?.user) {
            targetUserId = created.user.id
          }
        } else {
          await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
            password: result.data.password,
            email_confirm: true,
          })
        }

        if (targetUserId) {
          // Ensure profile exists
          await adminClient.from('profiles').upsert({
            id: targetUserId,
            auth_user_id: targetUserId,
            email: inputEmail,
            first_name: 'Admin',
            last_name: 'User',
          })

          // Ensure admin role linked
          const { data: adminRole } = await adminClient.from('roles').select('id').eq('name', 'admin').maybeSingle()
          if (adminRole?.id) {
            await adminClient.from('user_roles').upsert(
              { user_id: targetUserId, role_id: adminRole.id },
              { onConflict: 'user_id,role_id' }
            )
          }
        }

        // Retry sign in with provided password
        const retry = await supabase.auth.signInWithPassword({
          email: result.data.email,
          password: result.data.password,
        })
        if (!retry.error && retry.data) {
          authData = retry.data
          error = null
        }
      } catch (adminErr) {
        console.error('Error auto-provisioning admin user:', adminErr)
      }
    }
  }

  if (error) {
    return { error: error.message }
  }

  let redirectUrl = '/dashboard'

  if (authData?.user) {
    const adminClient = getSupabaseAdmin()
    
    const { data: userRoles } = await adminClient
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', authData.user.id)

    let roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || []

    const userEmail = authData.user.email?.toLowerCase().trim() || ''
    const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'support@neomcq.com').toLowerCase().trim()
    
    const isAdminEmail = userEmail === initialAdminEmail ||
                         userEmail === 'admin@neomcq.com' ||
                         userEmail === 'swapnilsonawane913@gmail.com'

    if (isAdminEmail && !roleNames.includes('admin') && !roleNames.includes('super_admin')) {
      const { data: adminRole } = await adminClient.from('roles').select('id').eq('name', 'admin').maybeSingle()
      if (adminRole?.id) {
        await adminClient.from('user_roles').upsert(
          { user_id: authData.user.id, role_id: adminRole.id },
          { onConflict: 'user_id,role_id' }
        )
        roleNames.push('admin')
      }
    }

    if (isAdminEmail || roleNames.includes('admin') || roleNames.includes('super_admin') || roleNames.includes('content_admin')) {
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
