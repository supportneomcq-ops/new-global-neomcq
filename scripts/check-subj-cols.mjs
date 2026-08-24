import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkSubjectCols() {
  const { data, error } = await supabase.from('subjects').select('*').limit(1);
  console.log('Subject cols:', Object.keys(data?.[0] || {}));
}

checkSubjectCols().catch(console.error);
