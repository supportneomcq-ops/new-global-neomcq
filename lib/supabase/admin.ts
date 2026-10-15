import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types'

/**
 * Server-only privileged Supabase client.
 * Never fall back to a publishable/anon key: privileged calls must fail clearly
 * if a server-side secret is not configured.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Security violation: the Supabase admin client is server-only.')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured.')
  }
  if (!secretKey) {
    throw new Error('Configure SUPABASE_SECRET_KEY for privileged server-side database operations.')
  }

  return createClient<Database>(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const getSupabaseAdmin = createAdminClient
