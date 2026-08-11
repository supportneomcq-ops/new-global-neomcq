import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    // Return standard client or fallback to avoid crashing module load
    console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will be restricted.')
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4enBxcnFmbGZoYXdndG56eHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzEzMzEsImV4cCI6MjEwMTI0NzMzMX0.HzAcsogz1ND64kXQ1dCDkDWLotB1Vo0lcgj4K3p4p5o'
    return createClient<Database>(supabaseUrl, anonKey)
  }

  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
