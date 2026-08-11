import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4enBxcnFmbGZoYXdndG56eHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzEzMzEsImV4cCI6MjEwMTI0NzMzMX0.HzAcsogz1ND64kXQ1dCDkDWLotB1Vo0lcgj4K3p4p5o'

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}
