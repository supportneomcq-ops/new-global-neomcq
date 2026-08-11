import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4enBxcnFmbGZoYXdndG56eHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzEzMzEsImV4cCI6MjEwMTI0NzMzMX0.HzAcsogz1ND64kXQ1dCDkDWLotB1Vo0lcgj4K3p4p5o';

let supabaseBrowserClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    if (!supabaseBrowserClient) {
      supabaseBrowserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY) as unknown as SupabaseClient;
    }
    return supabaseBrowserClient;
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('Security Violation: getSupabaseAdmin() cannot be called from the browser environment.');
  }
  if (!supabaseAdminClient) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      // Fallback to anon key on server if service role key is not configured
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      });
    }
    supabaseAdminClient = createClient(SUPABASE_URL, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseAdminClient;
}

