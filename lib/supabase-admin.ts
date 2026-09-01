import { getSupabaseAdmin } from './supabase';

export const supabaseAdmin = new Proxy({} as any, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    return (client as any)[prop];
  },
});

export { getSupabaseAdmin };
