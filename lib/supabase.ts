import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

let supabaseBrowserClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase public configuration is missing for this deployment. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY; deployments must not silently connect to production.');
  }
  return { url, anonKey };
}

export function getSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getPublicSupabaseConfig();
  if (typeof window !== 'undefined') {
    if (!supabaseBrowserClient) {
      supabaseBrowserClient = createBrowserClient(url, anonKey) as unknown as SupabaseClient;
    }
    return supabaseBrowserClient;
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('Security Violation: getSupabaseAdmin() cannot be called from the browser environment.');
  }
  if (!supabaseAdminClient) {
    const { url } = getPublicSupabaseConfig();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured. Refusing to run privileged database operations with the anonymous key.');
    }
    supabaseAdminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseAdminClient;
}
