import { createAdminClient } from './admin'

export async function bootstrapAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL || 'support@neomcq.com'
  const password = process.env.INITIAL_ADMIN_PASSWORD || 'NeoMcqAdmin2026!'

  if (!email || !password) {
    console.log('Admin credentials not fully provided in environment variables.')
    return { success: false, message: 'Missing env credentials' }
  }

  try {
    const adminClient = createAdminClient() as any

    // 1. Get the 'admin' role from the roles table (created by SQL seed)
    const { data: adminRole, error: roleError } = await adminClient
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single()

    if (roleError || !adminRole) {
      console.error('Admin role not found in database. Seed the database first.', roleError)
      return { success: false, message: 'Admin role not found' }
    }

    // 2. Check if a profile with the email exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      const profile = existingProfile as any;
      const role = adminRole as any;
      // Check if they already have the admin role assigned
      const { data: existingUserRole } = await adminClient
        .from('user_roles')
        .select('*')
        .eq('user_id', profile.id)
        .eq('role_id', role.id)
        .maybeSingle()

      if (!existingUserRole) {
        // Assign the role if missing
        await adminClient.from('user_roles').insert({
          user_id: profile.id,
          role_id: role.id,
        })
        console.log(`Assigned admin role to existing user: ${email}`)
      }

      return { success: true, message: 'Admin already exists', userId: profile.id }
    }

    // 3. Admin does not exist, create via Auth Admin API
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: 'System',
        last_name: 'Administrator',
      },
    })

    if (authError) {
      // If user already registered in auth but profile was missing, handle gracefully
      if (authError.message.includes('already registered')) {
        console.log('User already exists in Auth. Linking role...')
        // Try searching by email in auth or using standard process
      } else {
        console.error('Error creating admin auth user:', authError)
        return { success: false, error: authError.message }
      }
    }

    const userId = authUser?.user?.id

    if (userId) {
      // 4. Double check or insert profile to be safe
      const { error: profileError } = await adminClient.from('profiles').upsert({
        id: userId,
        auth_user_id: userId,
        email: email,
        first_name: 'System',
        last_name: 'Administrator',
        timezone: 'UTC',
      })

      if (profileError) {
        console.error('Error upserting profile:', profileError)
      }

      // 5. Link user to the 'admin' role
      const { error: userRoleError } = await adminClient.from('user_roles').insert({
        user_id: userId,
        role_id: (adminRole as any).id,
      })

      if (userRoleError) {
        console.error('Error assigning user role:', userRoleError)
      }

      console.log(`Successfully bootstrapped secure initial admin: ${email}`)
      return { success: true, message: 'Admin bootstrapped successfully', userId }
    }

    return { success: false, message: 'Failed to retrieve auth user ID' }
  } catch (error: any) {
    console.error('Exception during admin bootstrap:', error)
    return { success: false, error: error?.message || String(error) }
  }
}
